import os
import csv
import io
import shutil
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel
from models import Bild, Kuenstler, Kauf
from database import get_session
from services.import_service import import_csv as _import_csv

router = APIRouter(prefix="/admin/archiv", tags=["Archiv"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
ARCHIV_DIR = os.getenv("ARCHIV_DIR", "./archiv")


def _prafix_zu_raw(prafix: str) -> str:
    """'25.' → '25'  |  '25.400.' → '25400'"""
    return prafix.replace(".", "")


def _jahr_aus_prafix(prafix: str) -> str:
    """'25.' oder '25.400.' → '2025'"""
    digits = prafix.replace(".", "")[:2]
    return f"20{digits}"


def _ordner_name(kuenstler: Kuenstler | None, galerist: Kuenstler | None) -> str:
    if galerist:
        return re.sub(r"[^\w\-]", "_", f"{galerist.db_name}_{galerist.db_vorname}".strip("_"))
    if kuenstler:
        return re.sub(r"[^\w\-]", "_", f"{kuenstler.db_name}_{kuenstler.db_vorname}".strip("_"))
    return "_unbekannt"


def _bilder_fuer_prafix(prafix: str, session: Session) -> list[Bild]:
    raw = _prafix_zu_raw(prafix)
    alle = session.exec(select(Bild).order_by(Bild.bild_nr)).all()
    return [b for b in alle if b.bild_nr.startswith(raw)]


@router.get("/vorschau")
def vorschau(prafix: str, session: Session = Depends(get_session)):
    if not prafix or not re.match(r"^\d{2}(\.\d{3})?\.?$", prafix):
        raise HTTPException(400, "Präfix muss '25.' oder '25.400.' sein")
    bilder = _bilder_fuer_prafix(prafix, session)
    gruppen: dict[str, int] = {}
    for b in bilder:
        kuenstler = session.get(Kuenstler, b.kuenstler_id)
        galerist = session.get(Kuenstler, b.galerist_id) if b.galerist_id else None
        name = _ordner_name(kuenstler, galerist)
        gruppen[name] = gruppen.get(name, 0) + 1
    return {
        "prafix": prafix,
        "jahr": _jahr_aus_prafix(prafix),
        "anzahl": len(bilder),
        "gruppen": [{"name": k, "anzahl": v} for k, v in sorted(gruppen.items())],
    }


@router.get("/liste")
def archiv_liste():
    if not os.path.exists(ARCHIV_DIR):
        return []
    result = []
    for jahr in sorted(os.listdir(ARCHIV_DIR)):
        jahr_pfad = os.path.join(ARCHIV_DIR, jahr)
        if not os.path.isdir(jahr_pfad):
            continue
        csvs = sorted(f for f in os.listdir(jahr_pfad) if f.endswith(".csv"))
        for csv_datei in csvs:
            # Zeilenanzahl zählen
            with open(os.path.join(jahr_pfad, csv_datei), encoding="utf-8-sig") as f:
                anzahl = sum(1 for _ in f) - 1  # minus Header
            result.append({
                "jahr": jahr,
                "datei": csv_datei,
                "pfad": f"{jahr}/{csv_datei}",
                "anzahl": max(anzahl, 0),
            })
    return result


class ReimportRequest(BaseModel):
    pfad: str  # relativ zu ARCHIV_DIR, z. B. "2025/archiv_25.csv"


@router.post("/reimport")
def archiv_reimport(req: ReimportRequest, session: Session = Depends(get_session)):
    csv_pfad = os.path.join(ARCHIV_DIR, req.pfad)
    if not os.path.exists(csv_pfad):
        raise HTTPException(404, "Archiv-Datei nicht gefunden")

    jahr_dir = os.path.dirname(csv_pfad)

    # 1. Daten in DB importieren (bestehende Import-Logik)
    with open(csv_pfad, "rb") as f:
        data = f.read()
    import_result = _import_csv(data, session)

    # 2. Bilddateien zurück nach uploads/ verschieben und URLs in DB setzen
    with open(csv_pfad, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))

    dateien_zurueck = 0
    datei_fehler = []
    os.makedirs(os.path.join(UPLOAD_DIR, "web"), exist_ok=True)
    os.makedirs(os.path.join(UPLOAD_DIR, "original"), exist_ok=True)

    for row in rows:
        bild_nr = row.get("bild_nr", "").strip()
        bild_dateiname = row.get("bild_dateiname", "").strip()
        if not bild_nr or not bild_dateiname:
            continue

        # Datei in Unterverzeichnissen des Archivjahrs suchen
        gefunden = False
        for entry in os.scandir(jahr_dir):
            if not entry.is_dir():
                continue
            src_web = os.path.join(entry.path, bild_dateiname)
            if not os.path.exists(src_web):
                continue

            ziel_web = os.path.join(UPLOAD_DIR, "web", bild_dateiname)
            shutil.move(src_web, ziel_web)
            dateien_zurueck += 1

            orig_name = os.path.splitext(bild_dateiname)[0] + "_orig"
            src_orig = os.path.join(entry.path, orig_name)
            ziel_orig = os.path.join(UPLOAD_DIR, "original", orig_name)
            hat_orig = False
            if os.path.exists(src_orig):
                shutil.move(src_orig, ziel_orig)
                dateien_zurueck += 1
                hat_orig = True

            # URLs im DB-Eintrag setzen
            bild = session.exec(select(Bild).where(Bild.bild_nr == bild_nr)).first()
            if bild:
                bild.bild_url_web = f"/uploads/web/{bild_dateiname}"
                if hat_orig:
                    bild.bild_url_original = f"/uploads/original/{orig_name}"
                session.add(bild)

            gefunden = True
            break

        if not gefunden:
            datei_fehler.append(f"{bild_nr}: '{bild_dateiname}' nicht im Archiv gefunden")

    session.commit()
    return {
        "importiert": import_result["importiert"],
        "import_fehler": import_result["fehler"],
        "dateien_zurueck": dateien_zurueck,
        "datei_fehler": datei_fehler,
    }


class ArchivRequest(BaseModel):
    prafix: str


@router.post("/erstellen")
def archiv_erstellen(req: ArchivRequest, session: Session = Depends(get_session)):
    prafix = req.prafix
    if not prafix or not re.match(r"^\d{2}(\.\d{3})?\.?$", prafix):
        raise HTTPException(400, "Präfix muss '25.' oder '25.400.' sein")

    bilder = _bilder_fuer_prafix(prafix, session)
    if not bilder:
        raise HTTPException(404, "Keine Bilder für dieses Präfix gefunden")

    jahr = _jahr_aus_prafix(prafix)
    archiv_basis = os.path.join(ARCHIV_DIR, jahr)
    os.makedirs(archiv_basis, exist_ok=True)

    # CSV aufbauen (Import-Spalten + Käuferdaten für verkaufte Bilder)
    csv_buf = io.StringIO()
    writer = csv.writer(csv_buf)
    writer.writerow([
        "bild_nr", "kuenstler_name", "kuenstler_vorname",
        "bildtitel", "bildtechnik", "genre",
        "hoehe_rahmen_cm", "breite_rahmen_cm",
        "hoehe_cm", "breite_cm", "tiefe_cm", "gewicht_kg",
        "anmerkung_bild",
        "einlieferungspreis", "verkaufspreis",
        "abrechnungsempf", "bild_dateiname",
        "galerist_name", "galerist_vorname",
        # Käufer-Spalten (nur bei verkauften Bildern befüllt)
        "kaeufer_titel", "kaeufer_vorname", "kaeufer_name",
        "kaeufer_strasse", "kaeufer_plz", "kaeufer_ort", "kaeufer_email",
        "zahlungsart", "bezahlt", "kauf_datum",
    ])

    verschoben = 0
    fehler = []

    for b in bilder:
        kuenstler = session.get(Kuenstler, b.kuenstler_id)
        galerist = session.get(Kuenstler, b.galerist_id) if b.galerist_id else None
        kuenstler_name = f"{kuenstler.db_vorname} {kuenstler.db_name}".strip() if kuenstler else ""
        ordner = _ordner_name(kuenstler, galerist)
        ziel_dir = os.path.join(archiv_basis, ordner)
        os.makedirs(ziel_dir, exist_ok=True)

        # Bilddateien verschieben
        bild_dateiname = ""
        for src_rel in [b.bild_url_web, b.bild_url_original]:
            if not src_rel:
                continue
            src_path = os.path.join(os.path.dirname(UPLOAD_DIR), src_rel.lstrip("/"))
            if os.path.exists(src_path):
                dateiname = os.path.basename(src_path)
                ziel_path = os.path.join(ziel_dir, dateiname)
                try:
                    shutil.move(src_path, ziel_path)
                    if src_rel == b.bild_url_web:
                        bild_dateiname = dateiname
                    verschoben += 1
                except Exception as e:
                    fehler.append(f"{b.bild_nr}: {e}")

        # Käufe für dieses Bild suchen und Snapshots setzen
        kaeufe = session.exec(select(Kauf).where(Kauf.bild_id == b.id)).all()
        kauf_csv = ["", "", "", "", "", "", "", "", "", ""]  # leere Käufer-Spalten
        for kauf in kaeufe:
            # Snapshot-Felder in Kauf befüllen
            kauf.snap_bild_nr = b.bild_nr
            kauf.snap_bildtitel = b.bildtitel
            kauf.snap_kuenstler = kuenstler_name
            kauf.snap_bildtechnik = b.bildtechnik
            kauf.snap_verkaufspreis = b.verkaufspreis
            kauf.snap_hoehe_rahmen_cm = b.hoehe_rahmen_cm
            kauf.snap_breite_rahmen_cm = b.breite_rahmen_cm
            kauf.snap_genre = b.genre.value
            session.add(kauf)
            # Käuferdaten für CSV (letzter/einziger Kauf)
            kauf_csv = [
                kauf.kaeufer_titel or "", kauf.kaeufer_vorname, kauf.kaeufer_name,
                kauf.kaeufer_strasse, kauf.kaeufer_plz, kauf.kaeufer_ort, kauf.kaeufer_email,
                kauf.zahlungsart.value, "Ja" if kauf.bezahlt else "Nein",
                kauf.erstellt_am.strftime("%d.%m.%Y") if kauf.erstellt_am else "",
            ]

        # CSV-Zeile
        writer.writerow([
            b.bild_nr,
            kuenstler.db_name if kuenstler else "",
            kuenstler.db_vorname if kuenstler else "",
            b.bildtitel, b.bildtechnik, b.genre.value,
            b.hoehe_rahmen_cm, b.breite_rahmen_cm,
            b.hoehe_cm or "", b.breite_cm or "",
            b.tiefe_cm or "", b.gewicht_kg or "",
            b.anmerkung_bild or "",
            b.einlieferungspreis or "", b.verkaufspreis or "",
            b.abrechnungsempf.value, bild_dateiname,
            galerist.db_name if galerist else "",
            galerist.db_vorname if galerist else "",
        ] + kauf_csv)

        # Bild aus DB löschen
        session.delete(b)

    # CSV speichern
    raw = _prafix_zu_raw(prafix)
    csv_pfad = os.path.join(archiv_basis, f"archiv_{raw}.csv")
    with open(csv_pfad, "w", encoding="utf-8-sig", newline="") as f:
        f.write(csv_buf.getvalue())

    session.commit()

    return {
        "archiviert": len(bilder),
        "dateien_verschoben": verschoben,
        "zielverzeichnis": archiv_basis,
        "csv": csv_pfad,
        "fehler": fehler,
    }

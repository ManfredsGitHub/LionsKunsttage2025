import pandas as pd
from sqlmodel import Session, select
from models import Bild, Kuenstler, Genre, Abrechnungsempfaenger
from services.price_service import berechne_verkaufspreis
from datetime import datetime
import io


PFLICHT_SPALTEN = {
    "bild_nr", "kuenstler_name", "kuenstler_vorname",
    "bildtitel", "bildtechnik", "genre",
    "hoehe_rahmen_cm", "breite_rahmen_cm",
}


def import_csv(data: bytes, session: Session) -> dict:
    df = pd.read_csv(io.BytesIO(data), dtype=str)
    return _process(df, session)


def import_excel(data: bytes, session: Session) -> dict:
    df = pd.read_excel(io.BytesIO(data), dtype=str)
    return _process(df, session)


def _normalisiere_bild_nr(bild_nr: str) -> str:
    """Normalisiert bild_nr auf das Format JJKKKNN (7 Stellen).
    - 7-stellig mit Jahrspräfix (20–29): unverändert  → '2610501' bleibt '2610501'
    - 5-stellig (KKKNN ohne Jahr):       Jahr voranstellen → '10501' wird '2610501'
    - Andere Längen:                      unverändert (Legacy / manuell)
    """
    year_prefix = f"{datetime.now().year % 100:02d}"
    if len(bild_nr) == 7 and bild_nr[:2].isdigit() and 20 <= int(bild_nr[:2]) <= 29:
        return bild_nr
    if len(bild_nr) == 5 and bild_nr.isdigit():
        return year_prefix + bild_nr
    return bild_nr


def _process(df: pd.DataFrame, session: Session) -> dict:
    fehlend = PFLICHT_SPALTEN - set(df.columns)
    if fehlend:
        raise ValueError(f"Fehlende Pflichtspalten: {fehlend}")

    importiert, fehler = 0, []

    for i, row in df.iterrows():
        try:
            bild_nr = _normalisiere_bild_nr(row["bild_nr"].strip())

            # Künstler suchen oder anlegen
            ident = f"{row['kuenstler_name'].strip()}_{row['kuenstler_vorname'].strip()}".lower()
            kuenstler = session.exec(
                select(Kuenstler).where(Kuenstler.db_ident == ident)
            ).first()
            if not kuenstler:
                kuenstler = Kuenstler(
                    db_ident=ident,
                    db_name=row["kuenstler_name"].strip(),
                    db_vorname=row["kuenstler_vorname"].strip(),
                )
                session.add(kuenstler)
                session.flush()

            einlieferungspreis = _float(row.get("einlieferungspreis"))
            verkaufspreis = _float(row.get("verkaufspreis"))
            if not verkaufspreis and einlieferungspreis:
                verkaufspreis = berechne_verkaufspreis(einlieferungspreis)

            genre_val = row["genre"].strip()
            genre = next(
                (g for g in Genre if g.value.lower() == genre_val.lower()),
                Genre.sonstiges,
            )

            abrech_raw = (row.get("abrechnungsempf") or "").strip().lower()
            abrech = Abrechnungsempfaenger.galerist if "galerist" in abrech_raw else Abrechnungsempfaenger.kuenstler

            # Galerist per Name nachschlagen (Spalten: galerist_name + galerist_vorname)
            galerist_id = None
            galerist_name_raw = (row.get("galerist_name") or "").strip()
            if abrech == Abrechnungsempfaenger.galerist and galerist_name_raw:
                galerist_vorname_raw = (row.get("galerist_vorname") or "").strip()
                g_ident = f"{galerist_name_raw}_{galerist_vorname_raw}".lower()
                galerist = session.exec(
                    select(Kuenstler).where(Kuenstler.db_ident == g_ident)
                ).first()
                if galerist:
                    galerist_id = galerist.id

            bild = Bild(
                bild_nr=bild_nr,
                kuenstler_id=kuenstler.id,
                bildtitel=row["bildtitel"].strip(),
                bildtechnik=row["bildtechnik"].strip(),
                genre=genre,
                anzahl=int(_float(row.get("anzahl")) or 1),
                hoehe_rahmen_cm=float(row["hoehe_rahmen_cm"]),
                breite_rahmen_cm=float(row["breite_rahmen_cm"]),
                einlieferungspreis=einlieferungspreis,
                verkaufspreis_vorschlag=berechne_verkaufspreis(einlieferungspreis) if einlieferungspreis else None,
                verkaufspreis=verkaufspreis,
                abrechnungsempf=abrech,
                galerist_id=galerist_id,
                foto_nr=row.get("bild_dateiname", "").strip() or None,
            )
            session.add(bild)
            importiert += 1
        except Exception as e:
            fehler.append({"zeile": i + 2, "fehler": str(e)})

    session.commit()
    return {"importiert": importiert, "fehler": fehler}


def _float(val) -> float | None:
    try:
        return float(str(val).replace(",", "."))
    except (TypeError, ValueError):
        return None


def _str(val) -> str | None:
    """Gibt None zurück wenn der Wert leer oder NaN ist."""
    if val is None:
        return None
    s = str(val).strip()
    return s if s and s.lower() not in ("nan", "none", "") else None


def import_kuenstler_csv(data: bytes, session: Session) -> dict:
    df = pd.read_csv(io.BytesIO(data), dtype=str)
    return _process_kuenstler(df, session)


def import_kuenstler_excel(data: bytes, session: Session) -> dict:
    df = pd.read_excel(io.BytesIO(data), dtype=str)
    return _process_kuenstler(df, session)


def _process_kuenstler(df: pd.DataFrame, session: Session) -> dict:
    """Importiert Künstler-Stammdaten (Leben, Kommentar, Kontakt etc.).

    Pflichtspalten: db_Name, db_Vorname
    Optional: db_Leben, db_Kommentar, db_email, db_Telefon,
              db_Instagram, db_Facebook, db_Webseite
    """
    if "db_Name" not in df.columns or "db_Vorname" not in df.columns:
        raise ValueError("Fehlende Pflichtspalten: db_Name, db_Vorname")

    aktualisiert, neu, fehler = 0, 0, []

    for i, row in df.iterrows():
        try:
            name = _str(row.get("db_Name"))
            vorname = _str(row.get("db_Vorname"))
            if not name or not vorname:
                fehler.append({"zeile": i + 2, "fehler": "db_Name oder db_Vorname fehlt"})
                continue

            ident = f"{name}_{vorname}".lower()
            kuenstler = session.exec(
                select(Kuenstler).where(Kuenstler.db_ident == ident)
            ).first()

            if kuenstler:
                # Nur befüllen wenn das Feld bislang leer ist (kein Überschreiben manueller Einträge)
                changed = False
                for src_col, attr in [
                    ("db_Leben", "db_leben"),
                    ("db_Kommentar", "db_kommentar"),
                    ("db_email", "db_email"),
                    ("db_Telefon", "db_telefon"),
                    ("db_Instagram", "db_instagram"),
                    ("db_Facebook", "db_facebook"),
                    ("db_Pinterest", "db_pinterest"),
                    ("db_Webseite", "db_webseite"),
                ]:
                    val = _str(row.get(src_col))
                    if val and not getattr(kuenstler, attr):
                        setattr(kuenstler, attr, val)
                        changed = True
                if changed:
                    session.add(kuenstler)
                aktualisiert += 1
            else:
                kuenstler = Kuenstler(
                    db_ident=ident,
                    db_name=name,
                    db_vorname=vorname,
                    db_leben=_str(row.get("db_Leben")),
                    db_kommentar=_str(row.get("db_Kommentar")),
                    db_email=_str(row.get("db_email")),
                    db_telefon=_str(row.get("db_Telefon")),
                    db_instagram=_str(row.get("db_Instagram")),
                    db_facebook=_str(row.get("db_Facebook")),
                    db_pinterest=_str(row.get("db_Pinterest")),
                    db_webseite=_str(row.get("db_Webseite")),
                )
                session.add(kuenstler)
                neu += 1
        except Exception as e:
            fehler.append({"zeile": i + 2, "fehler": str(e)})

    session.commit()
    return {"aktualisiert": aktualisiert, "neu": neu, "fehler": fehler}

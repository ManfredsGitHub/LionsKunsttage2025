"""
DATEV EXTF Export — Buchungsstapel + Debitoren/Kreditoren-Stammdaten

Encoding: Latin-1 (DATEV-Standard)
Dezimaltrennzeichen: Komma
Feldtrennzeichen: Semikolon
Datumformat Belegdatum: TTMM (kein Jahr)
Kontenrahmen: 04 (DATEV-Vereinskontenrahmen SKR49)

Kontenplan Lions Club Villa Ludwigshöhe:
  1460  Geldtransit       (Bar, Kreditkarte, PayPal)
  1800  Bank              (Überweisung)
  2120  Ausschüttung Erlös
  4120  Steuerfreie Umsätze § 19 UStG  (Erlöskonto)
  5200  Wareneingang
  6300  Sonst. betr. Ausgaben
  6400  Versicherungen
  6600  Werbekosten
  6800  Porto
  6850  Sonstiger Betriebsbedarf
  6855  Nebenkosten des Geldverkehrs
  10001+  Debitoren (Käufer, je E-Mail-Adresse)
  70001+  Kreditoren (Künstler / Galerien)
"""

import io
import zipfile
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from database import get_session
from models import Bild, Kauf, Kuenstler, Zahlungsart

router = APIRouter(prefix="/admin/export", tags=["Export"])

# ── Kontenplan ────────────────────────────────────────────────────────────────
# Bar/Kreditkarte/PayPal laufen alle über Geldtransit, Überweisung direkt auf Bank
KONTO_ZAHLUNGSART = {
    Zahlungsart.bar: "1460",
    Zahlungsart.ueberweisung: "1800",
    Zahlungsart.kreditkarte: "1460",
    Zahlungsart.paypal: "1460",
}
KONTO_ERLOESE = "4120"   # Steuerfreie Umsätze § 19 UStG
DEBITOR_BASIS = 10000    # Käufer: 10001, 10002, …
KREDITOR_BASIS = 70000   # Künstler: 70001, 70002, …


# ── Hilfsfunktionen ───────────────────────────────────────────────────────────

def _ts() -> str:
    return datetime.now().strftime("%Y%m%d%H%M%S") + "000"


def _betrag(v: float) -> str:
    return f"{v:.2f}".replace(".", ",")


def _datum(dt: datetime) -> str:
    """DATEV Belegdatum: TTMM"""
    return dt.strftime("%d%m")


def _safe(s: str, max_len: int = 0) -> str:
    """Latin-1-sichere Kurzversion eines Strings."""
    s = s.replace(";", " ").replace('"', "'")
    if max_len:
        s = s[:max_len]
    return s


def _buchungsstapel_header(berater: int, mandant: int, wj_beginn: str) -> str:
    return (
        f'"EXTF";700;21;"Buchungsstapel";7;{_ts()};;'
        f'"RE";"";"";"";{berater};{mandant};{wj_beginn};04;"EUR";"";"";"";""'
    )


BUCHUNGSSTAPEL_SPALTEN = (
    "Umsatz (ohne Soll/Haben-Kz);Soll/Haben-Kennzeichen;WKZ Umsatz;Kurs;"
    "Basis-Umsatz;WKZ Basis-Umsatz;Konto;Gegenkonto (ohne BU-Schlüssel);"
    "BU-Schlüssel;Belegdatum;Belegfeld 1;Belegfeld 2;Skonto;Buchungstext;"
    "Postensperre;Adressnummer;Geschäftspartnerbank;Sachverhalt;Zinssperre;"
    "Beleglink;Beleginfo - Art 1;Beleginfo - Inhalt 1"
)


def _stammdaten_header(berater: int, mandant: int, wj_beginn: str) -> str:
    return (
        f'"EXTF";700;16;"Debitoren/Kreditoren";5;{_ts()};;'
        f'"RE";"";"";"";{berater};{mandant};{wj_beginn};04;"EUR";"";"";"";""'
    )


STAMMDATEN_SPALTEN = (
    "Konto;Name (Adressattyp Unternehmen);Unternehmensgegenstand;"
    "Name (Adressattyp natürl. Person);Vorname (Adressattyp natürl. Person);"
    "Name (Adressattyp keine Angabe);Adressattyp;Kurzbezeichnung;"
    "EU-Land;EU-UStIdNr.;Anrede;Titel/Akad. Grad;Adelstitel;Namensvorsatz;"
    "Adressart;Straße;Postfach;Postleitzahl;Ort;Land;Versandzusatz;"
    "Adresszusatz;Abweichende Anrede;Abw. Zustellbezeichnung 1;"
    "Abw. Zustellbezeichnung 2;Kennz. Korrespondenzadresse;"
    "Adresse Gültig von;Adresse Gültig bis;Telefon;Bemerkung;E-Mail"
)


def _stammdaten_zeile(konto: int, nachname: str, vorname: str,
                       strasse: str, plz: str, ort: str,
                       telefon: str = "", email: str = "") -> str:
    felder = [
        str(konto),           # Konto
        "",                   # Name Unternehmen
        "",                   # Unternehmensgegenstand
        _safe(nachname, 50),  # Name natürl. Person
        _safe(vorname, 30),   # Vorname natürl. Person
        "",                   # Name keine Angabe
        "2",                  # Adressattyp: 2 = natürliche Person
        _safe(f"{nachname} {vorname}", 15),  # Kurzbezeichnung
        "",                   # EU-Land
        "",                   # EU-UStIdNr
        "",                   # Anrede
        "",                   # Titel
        "",                   # Adelstitel
        "",                   # Namensvorsatz
        "STR",                # Adressart
        _safe(strasse, 40),
        "",                   # Postfach
        _safe(plz, 10),
        _safe(ort, 30),
        "DE",                 # Land
        "", "", "", "", "",   # Versandzusatz … Abw. Zustellbez. 2
        "",                   # Kennz. Korrespondenzadresse
        "", "",               # Gültig von / bis
        _safe(telefon, 20),
        "",                   # Bemerkung
        _safe(email, 60),
    ]
    return ";".join(felder)


# ── Export-Endpoint ───────────────────────────────────────────────────────────

@router.get("/datev", summary="DATEV EXTF Export als ZIP")
def export_datev(
    berater: int = Query(default=12345, description="DATEV Beraternummer (vom Steuerberater)"),
    mandant: int = Query(default=1, description="DATEV Mandantennummer"),
    wj_beginn: str = Query(default="20260101", description="Wirtschaftsjahr-Beginn YYYYMMDD"),
    nur_bezahlt: bool = Query(default=True, description="Nur bezahlte Käufe exportieren"),
    session: Session = Depends(get_session),
):
    kaeufe_alle = session.exec(select(Kauf).order_by(Kauf.erstellt_am)).all()
    kaeufe = [k for k in kaeufe_alle if k.bezahlt] if nur_bezahlt else kaeufe_alle

    bilder = {b.id: b for b in session.exec(select(Bild)).all()}
    kuenstler_alle = session.exec(select(Kuenstler).order_by(Kuenstler.db_name)).all()

    # Debitor-Nummern: je einmaliger E-Mail-Adresse eine Kontonummer
    debitor_map: dict[str, int] = {}
    debitor_nr = DEBITOR_BASIS + 1
    for k in kaeufe_alle:
        email = k.kaeufer_email.lower().strip()
        if email not in debitor_map:
            debitor_map[email] = debitor_nr
            debitor_nr += 1

    # Kreditor-Nummern: je Künstler eine Kontonummer
    kreditor_map: dict[int, int] = {
        k.id: KREDITOR_BASIS + i + 1
        for i, k in enumerate(kuenstler_alle)
    }

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:

        # ── 1. Buchungsstapel ─────────────────────────────────────────────────
        buf = io.StringIO()
        buf.write(_buchungsstapel_header(berater, mandant, wj_beginn) + "\r\n")
        buf.write(BUCHUNGSSTAPEL_SPALTEN + "\r\n")

        for kauf in kaeufe:
            bild = bilder.get(kauf.bild_id)
            preis = (bild.verkaufspreis if bild else None) or kauf.snap_verkaufspreis or 0.0
            bild_nr = (bild.bild_nr if bild else None) or kauf.snap_bild_nr or str(kauf.id)
            titel = (bild.bildtitel if bild else None) or kauf.snap_bildtitel or ""

            datum = kauf.bezahlt_am or kauf.erstellt_am
            konto = KONTO_ZAHLUNGSART.get(kauf.zahlungsart, "1200")
            beleg = _safe(f"KV-{bild_nr}", 12)
            text = _safe(f"Kunstverkauf {bild_nr} {titel}", 60)

            zeile = (
                f"{_betrag(preis)};S;EUR;;;;"
                f"{konto};{KONTO_ERLOESE};;"
                f"{_datum(datum)};{beleg};;;"
                f"{text};;;;;;;"
                f'"";"" '
            )
            buf.write(zeile + "\r\n")

        zf.writestr(
            "EXTF_Buchungsstapel_2026.csv",
            buf.getvalue().encode("latin-1", errors="replace"),
        )

        # ── 2. Debitoren-Stamm (Käufer) ──────────────────────────────────────
        buf = io.StringIO()
        buf.write(_stammdaten_header(berater, mandant, wj_beginn) + "\r\n")
        buf.write(STAMMDATEN_SPALTEN + "\r\n")

        seen: set[str] = set()
        for kauf in kaeufe_alle:
            email = kauf.kaeufer_email.lower().strip()
            if email in seen:
                continue
            seen.add(email)
            buf.write(
                _stammdaten_zeile(
                    konto=debitor_map[email],
                    nachname=kauf.kaeufer_name,
                    vorname=kauf.kaeufer_vorname,
                    strasse=kauf.kaeufer_strasse,
                    plz=kauf.kaeufer_plz,
                    ort=kauf.kaeufer_ort,
                    email=kauf.kaeufer_email,
                )
                + "\r\n"
            )

        zf.writestr(
            "EXTF_Debitoren_2026.csv",
            buf.getvalue().encode("latin-1", errors="replace"),
        )

        # ── 3. Kreditoren-Stamm (Künstler / Galerie) ─────────────────────────
        buf = io.StringIO()
        buf.write(_stammdaten_header(berater, mandant, wj_beginn) + "\r\n")
        buf.write(STAMMDATEN_SPALTEN + "\r\n")

        for k in kuenstler_alle:
            buf.write(
                _stammdaten_zeile(
                    konto=kreditor_map[k.id],
                    nachname=k.db_name,
                    vorname=k.db_vorname,
                    strasse=k.db_adresse or "",
                    plz=k.db_plz or "",
                    ort=k.db_ort or "",
                    telefon=k.db_telefon or "",
                    email=k.db_email or "",
                )
                + "\r\n"
            )

        zf.writestr(
            "EXTF_Kreditoren_2026.csv",
            buf.getvalue().encode("latin-1", errors="replace"),
        )

        # ── 4. Artikelliste (Bilder) — kein DATEV-Format, Info für Steuerberater
        buf = io.StringIO()
        buf.write(
            "Bild-Nr;Titel;Technik;Genre;Verkaufspreis;Einlieferungspreis;"
            "Kuenstler;Abrechnungsempfaenger\r\n"
        )
        kuenstler_idx = {k.id: k for k in kuenstler_alle}
        for bild in sorted(bilder.values(), key=lambda b: b.bild_nr):
            if not bild.verkaufspreis:
                continue
            k = kuenstler_idx.get(bild.kuenstler_id)
            kuenstler_name = f"{k.db_vorname} {k.db_name}".strip() if k else ""
            buf.write(
                f"{bild.bild_nr};{_safe(bild.bildtitel)};{bild.bildtechnik};"
                f"{bild.genre};{_betrag(bild.verkaufspreis)};"
                f"{_betrag(bild.einlieferungspreis) if bild.einlieferungspreis else ''};"
                f"{_safe(kuenstler_name)};{bild.abrechnungsempf}\r\n"
            )

        zf.writestr(
            "Artikel_Bilder_2026.csv",
            buf.getvalue().encode("latin-1", errors="replace"),
        )

    zip_buf.seek(0)
    dateiname = f"DATEV_Kunsttage_{datetime.now().strftime('%Y%m%d')}.zip"
    return StreamingResponse(
        zip_buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={dateiname}"},
    )

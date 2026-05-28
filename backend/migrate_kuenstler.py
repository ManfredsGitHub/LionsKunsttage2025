#!/usr/bin/env python3
"""
migrate_kuenstler.py – Import des Künstler-Verzeichnisses aus dem Tabellenblatt
'Verzeichnis Künstler' der Lions-Kunsttage-Excel.

Bereits vorhandene Künstler werden nur ergänzt (keine Überschreibung).
Neue Einträge werden als Galerie-Künstler angelegt.

Aufruf:
    cd backend && source .venv/bin/activate
    python migrate_kuenstler.py            # Import durchführen
    python migrate_kuenstler.py --dry-run  # Nur analysieren
"""
import os, sys, argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from sqlmodel import Session, select, create_engine

from models import Kuenstler, Kuenstlertyp

EXCEL_FILE   = Path(__file__).parent.parent / "2025 Kunsttage" / "2025 Lions Kunsttage 17.10.25.xlsm"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kunsttage.db")
SHEET        = "Verzeichnis Künstler"


def _str(val, default="") -> str:
    s = str(val).strip()
    return default if s in ("", "nan", "None", "NaN") else s


def normalize_ident(raw: str) -> str:
    """Vergleichsschlüssel: lowercase, keine Unterstriche/Leerzeichen."""
    return raw.lower().replace("_", "").replace(" ", "")


def migrate(dry_run: bool = False):
    prefix = "[DRY RUN] " if dry_run else ""
    print(f"{prefix}Lese Tabellenblatt '{SHEET}' …")

    df = pd.read_excel(EXCEL_FILE, sheet_name=SHEET, dtype=str)
    data = df.dropna(subset=["db_Name"])
    print(f"Zeilen mit Name: {len(data)}")

    engine = create_engine(DATABASE_URL)

    stats = {"aktualisiert": 0, "neu": 0, "fehler": []}

    with Session(engine) as session:
        # Alle vorhandenen Künstler indexieren
        alle = session.exec(select(Kuenstler)).all()
        db_index: dict[str, Kuenstler] = {
            normalize_ident(k.db_ident): k for k in alle
        }
        print(f"Vorhandene Künstler in DB: {len(db_index)}")

        for _, row in data.iterrows():
            try:
                name    = _str(row.get("db_Name"), "Unbekannt")
                vorname = _str(row.get("db_Vorname"))
                ident_raw = _str(row.get("db_Ident")) or f"{name}{vorname}"
                norm_key  = normalize_ident(ident_raw)

                # Felder aus Excel
                excel = {
                    "db_leben":       _str(row.get("db_Leben")) or None,
                    "db_kommentar":   _str(row.get("db_Kommentar")) or None,
                    "db_email":       _str(row.get("db_email")) or None,
                    "db_telefon":     _str(row.get("db_Telefon")) or None,
                    "db_instagram":   _str(row.get("db_Instagram")) or None,
                    "db_facebook":    _str(row.get("db_Facebook")) or None,
                    "db_webseite":    _str(row.get("db_Webseite")) or None,
                }

                if norm_key in db_index:
                    # Vorhandenen Künstler ergänzen
                    k = db_index[norm_key]
                    changed = False
                    for field, val in excel.items():
                        if val and not getattr(k, field):
                            setattr(k, field, val)
                            changed = True
                    if changed:
                        if not dry_run:
                            session.add(k)
                        stats["aktualisiert"] += 1
                else:
                    # Neuen Künstler anlegen
                    # db_ident normalisiert mit Unterstrich
                    new_ident = f"{name}_{vorname}".lower().replace(" ", "_") if vorname else name.lower().replace(" ", "_")
                    k = Kuenstler(
                        db_ident=new_ident,
                        db_name=name,
                        db_vorname=vorname,
                        kuenstlertyp=Kuenstlertyp.galerie,
                        **{f: v for f, v in excel.items() if v},
                    )
                    if not dry_run:
                        session.add(k)
                    db_index[norm_key] = k  # Duplikate in derselben Datei vermeiden
                    stats["neu"] += 1

            except Exception as e:
                stats["fehler"].append(f"{_str(row.get('db_Name'))}: {e}")

        if not dry_run:
            session.commit()
            print("Datenbank gespeichert.")

    print(f"\n{'=== DRY RUN ===' if dry_run else '=== Fertig ==='}")
    print(f"Ergänzt  (bereits vorhanden): {stats['aktualisiert']}")
    print(f"Neu angelegt:                 {stats['neu']}")
    if stats["fehler"]:
        print(f"\nFehler ({len(stats['fehler'])}):")
        for e in stats["fehler"]:
            print(f"  ✗ {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    migrate(dry_run=args.dry_run)

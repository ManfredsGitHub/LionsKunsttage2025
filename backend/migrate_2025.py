#!/usr/bin/env python3
"""
migrate_2025.py – Einmaliger Import der Lions Kunsttage 2025 Daten.

Liest die Excel-Datei, legt Künstler und Bilder an, verknüpft Fotos
aus allen Bildordnern des 2025-Verzeichnisses.

Aufruf (im backend-Verzeichnis):
    source .venv/bin/activate
    python migrate_2025.py            # Import durchführen
    python migrate_2025.py --dry-run  # Nur analysieren, nichts schreiben
"""
import os
import sys
import argparse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from sqlmodel import Session, select, create_engine

from models import Kuenstler, Bild, Kuenstlertyp, Genre, Abrechnungsempfaenger
from services.price_service import berechne_verkaufspreis
from services.image_service import compress_image, save_image

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------
BASE_DIR   = Path(__file__).parent.parent / "2025 Kunsttage"
EXCEL_FILE = BASE_DIR / "2025 Lions Kunsttage 17.10.25.xlsm"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kunsttage.db")
UPLOAD_DIR   = os.getenv("UPLOAD_DIR", "./uploads")

EXCLUDE_DIRS = {"Pressemappe", "ZZ_Ablage", "AA_Display Bank", "AA_Vitas"}
IMG_EXTS     = {".jpg", ".jpeg", ".png"}

GENRE_COLS = {
    "Landschaft":  Genre.landschaft,
    "Portrait":    Genre.portrait,
    " abstrakt":   Genre.abstrakt,
    "Pfalz":       Genre.pfalz,
    "Akt":         Genre.akt,
    "Stilleben":   Genre.stilleben,
}


# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

def _float(val) -> float | None:
    try:
        v = str(val).replace(",", ".").strip()
        if v in ("", "nan", "None", "NaN"):
            return None
        return float(v)
    except (TypeError, ValueError):
        return None


def _str(val, default="") -> str:
    s = str(val).strip()
    return default if s in ("", "nan", "None", "NaN") else s


def is_valid_row(row) -> bool:
    bild_nr = _str(row.get("Bild-Nr.", ""))
    if not bild_nr.isdigit():
        return False
    if not _str(row.get("Name des Bildes", "")):
        return False
    return True


def genre_from_row(row) -> Genre:
    for col, g in GENRE_COLS.items():
        if col in row.index and pd.notna(row[col]):
            return g
    return Genre.sonstiges


# ---------------------------------------------------------------------------
# Bildindex aufbauen
# ---------------------------------------------------------------------------

def build_bild_nr_index(base_dir: Path) -> dict[str, str]:
    """Sucht alle Bilder mit rein numerischem Dateinamen → {bild_nr: pfad}."""
    index: dict[str, str] = {}
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            if f.startswith("."):
                continue
            if Path(f).suffix.lower() not in IMG_EXTS:
                continue
            stem = Path(f).stem
            if stem.isdigit():
                index[stem] = str(Path(root) / f)
    return index


def build_artist_dir_index(base_dir: Path) -> dict[str, list[str]]:
    """Baut pro Künstler-Unterverzeichnis eine sortierte Bildliste (nicht-numerisch)."""
    result: dict[str, list[str]] = {}
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        rel = Path(root).relative_to(base_dir)
        # AA__Bilder 2025 bereits über numerischen Index abgedeckt
        if "AA__Bilder 2025" in str(rel):
            continue
        imgs = sorted([
            str(Path(root) / f) for f in files
            if not f.startswith(".")
            and Path(f).suffix.lower() in IMG_EXTS
            and not Path(f).stem.isdigit()
        ])
        if imgs:
            dirname = Path(root).name
            key = dirname.lower()
            if key.startswith("bilder "):
                key = key[7:]
            result[key] = imgs
    return result


def find_artist_dir_key(nachname: str, artist_dir_index: dict) -> str | None:
    name_lower = nachname.lower()
    if name_lower in artist_dir_index:
        return name_lower
    for key in artist_dir_index:
        if name_lower in key or key in name_lower:
            return key
    return None


# ---------------------------------------------------------------------------
# Hauptfunktion
# ---------------------------------------------------------------------------

def migrate(dry_run: bool = False):
    prefix = "[DRY RUN] " if dry_run else ""
    print(f"{prefix}Starte Migration — {EXCEL_FILE.name}")

    df = pd.read_excel(EXCEL_FILE, dtype=str, header=1)
    data = df[df.apply(is_valid_row, axis=1)].copy()
    print(f"Gültige Zeilen in Excel: {len(data)}")

    bild_nr_idx = build_bild_nr_index(BASE_DIR)
    print(f"Bilder mit numerischem Dateinamen: {len(bild_nr_idx)}")

    artist_dir_idx = build_artist_dir_index(BASE_DIR)
    print(f"Künstler-Verzeichnisse:  {len(artist_dir_idx)}  "
          f"({', '.join(sorted(artist_dir_idx)[:8])}…)")

    # Bild-Position pro Künstler vorberechnen (für sequentielle Zuordnung)
    abrech_col = "Abrechnung über"
    artist_positions: dict[str, int] = {}
    for abrech_val, group in data.groupby(abrech_col):
        for i, bild_nr in enumerate(sorted(group["Bild-Nr."].tolist())):
            artist_positions[bild_nr] = i

    engine = create_engine(DATABASE_URL)

    stats = {
        "kuenstler_neu": 0,
        "bilder_neu": 0,
        "bilder_skip": 0,
        "fotos": 0,
        "kein_foto": [],
        "fehler": [],
    }

    with Session(engine) as session:
        for _, row in data.iterrows():
            bild_nr = _str(row["Bild-Nr."])
            try:
                # Bereits vorhanden?
                if session.exec(select(Bild).where(Bild.bild_nr == bild_nr)).first():
                    stats["bilder_skip"] += 1
                    continue

                # --- Künstler ---
                nachname = _str(row.get("Name des Künstlers", ""), "Unbekannt")
                vorname  = _str(row.get("Vorname", ""))
                ident    = f"{nachname}_{vorname}".lower().replace(" ", "_")
                abrech_ueber = _str(row.get("Abrechnung über", ""))

                is_fundus = abrech_ueber == "Fundus"
                ktyp  = Kuenstlertyp.eigenbestand if is_fundus else Kuenstlertyp.galerie
                abrech = Abrechnungsempfaenger.lions if is_fundus else Abrechnungsempfaenger.kuenstler

                kommentar = _str(row.get("Anmerkung zum Künstler", "")) or None

                kuenstler = session.exec(
                    select(Kuenstler).where(Kuenstler.db_ident == ident)
                ).first()
                if not kuenstler:
                    kuenstler = Kuenstler(
                        db_ident=ident,
                        db_name=nachname,
                        db_vorname=vorname,
                        db_kommentar=kommentar,
                        kuenstlertyp=ktyp,
                    )
                    if not dry_run:
                        session.add(kuenstler)
                        session.flush()
                    stats["kuenstler_neu"] += 1

                # --- Bild ---
                ep = _float(row.get("Preis Einlieferung \n(incl. MWSt)"))
                vp = _float(row.get("Preis \nVerkauf"))
                if not vp and ep:
                    vp = berechne_verkaufspreis(ep)

                foto_nr    = _str(row.get("Nr. des Fotos", "")) or None
                anmerkung  = _str(row.get("Anmerkung zum Bild", "")) or None
                hoehe_r    = _float(row.get("Höhe Rahmen in cm")) or 0.0
                breite_r   = _float(row.get("Breite Rahmen in cm")) or 0.0
                bildtechnik = _str(row.get("Bildtechnik", "")) or "Unbekannt"

                bild = Bild(
                    bild_nr=bild_nr,
                    foto_nr=foto_nr,
                    kuenstler_id=kuenstler.id if kuenstler.id else 0,
                    bildtitel=_str(row.get("Name des Bildes", "")) or "Ohne Titel",
                    anmerkung_bild=anmerkung,
                    bildtechnik=bildtechnik,
                    genre=genre_from_row(row),
                    anzahl=int(_float(row.get("Anzahl")) or 1),
                    hoehe_rahmen_cm=hoehe_r,
                    breite_rahmen_cm=breite_r,
                    hoehe_cm=_float(row.get("Höhe in cm")),
                    breite_cm=_float(row.get("Breite in cm")),
                    tiefe_cm=_float(row.get("Tiefe in cm")),
                    gewicht_kg=_float(row.get("Gewicht in kg")),
                    einlieferungspreis=ep,
                    verkaufspreis_vorschlag=berechne_verkaufspreis(ep) if ep else None,
                    verkaufspreis=vp,
                    abrechnungsempf=abrech,
                    freigegeben=False,
                )
                if not dry_run:
                    session.add(bild)
                    session.flush()
                stats["bilder_neu"] += 1

                # --- Foto suchen ---
                img_path = None

                # Strategie 1: Dateiname = Bild-Nr.
                if bild_nr in bild_nr_idx:
                    img_path = bild_nr_idx[bild_nr]
                # Strategie 2: Dateiname = Foto-Nr.
                elif foto_nr and foto_nr in bild_nr_idx:
                    img_path = bild_nr_idx[foto_nr]
                # Strategie 3: Künstler-Verzeichnis, sequentiell
                else:
                    key = find_artist_dir_key(nachname, artist_dir_idx)
                    if key:
                        imgs = artist_dir_idx[key]
                        pos  = artist_positions.get(bild_nr, 0)
                        if pos < len(imgs):
                            img_path = imgs[pos]

                if img_path:
                    if not dry_run:
                        try:
                            raw = Path(img_path).read_bytes()
                            web_b, orig_b = compress_image(raw, Path(img_path).name)
                            url_web, url_orig = save_image(web_b, orig_b, bild_nr, UPLOAD_DIR)
                            bild.bild_url_web = url_web
                            bild.bild_url_original = url_orig
                            session.add(bild)
                        except Exception as e:
                            stats["fehler"].append(f"{bild_nr} (Foto): {e}")
                    stats["fotos"] += 1
                else:
                    stats["kein_foto"].append(
                        f"{bild_nr}  {nachname}, {vorname}  "
                        f"»{_str(row.get('Name des Bildes',''))[:40]}«"
                    )

            except Exception as e:
                stats["fehler"].append(f"{bild_nr}: {e}")
                import traceback
                traceback.print_exc()

        if not dry_run:
            session.commit()
            print("\nDatenbank gespeichert.")

    # --- Ergebnis ---
    print(f"\n{'=== DRY RUN – keine Änderungen ===' if dry_run else '=== Migration abgeschlossen ==='}")
    print(f"Neue Künstler :  {stats['kuenstler_neu']}")
    print(f"Neue Bilder   :  {stats['bilder_neu']}")
    print(f"Übersprungen  :  {stats['bilder_skip']}  (bereits vorhanden)")
    print(f"Fotos verlinkt:  {stats['fotos']}")
    print(f"Kein Foto     :  {len(stats['kein_foto'])}")
    if stats["kein_foto"]:
        for x in stats["kein_foto"]:
            print(f"  – {x}")
    if stats["fehler"]:
        print(f"\nFehler ({len(stats['fehler'])}):")
        for e in stats["fehler"]:
            print(f"  ✗ {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Import Lions Kunsttage 2025 → Datenbank")
    parser.add_argument("--dry-run", action="store_true",
                        help="Nur analysieren, nichts in die DB schreiben")
    args = parser.parse_args()
    migrate(dry_run=args.dry_run)

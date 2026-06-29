"""
Prüft die Datenbank auf ungültige Enum-Werte, NOT-NULL-Verletzungen und
defekte Fremdschlüssel. Vor jedem manuellen DB-Update ausführen:

    cd backend && source .venv/bin/activate && python check_db.py
"""

import sqlite3
import sys
from pathlib import Path

DB_PATH = Path(__file__).parent / "kunsttage.db"


# ---------------------------------------------------------------------------
# Gültige Enum-Werte — jeweils Namen UND Werte, damit beide Konventionen
# (alte Importe speichern Namen, SQLModel-Default speichert Werte) passen.
# ---------------------------------------------------------------------------

ENUM_RULES: dict[str, dict[str, set[str]]] = {
    "kuenstler": {
        "kuenstlertyp":   {"galerie", "vor_ort", "eigenbestand", "galerist"},
        "abrechnungsempf": {"kuenstler", "galerist", "lions",
                            "Künstler", "Galerist", "Lions"},
    },
    "bild": {
        "genre": {
            "abstrakt", "akt", "landschaft", "menschen", "pfalz",
            "portrait", "staedte", "stilleben", "sonstiges",
            "Abstrakt", "Akt", "Landschaft", "Menschen", "Pfalz",
            "Portrait", "Städte", "Stilleben", "Sonstiges",
        },
        "verfuegbarkeit": {
            "verfuegbar", "nicht_verfuegbar", "nachfragen", "reserviert", "verkauft",
            "Verfügbar", "Nicht verfügbar", "Verfügbarkeit nachfragen",
            "Reserviert", "Verkauft",
        },
        "abrechnungsempf": {"kuenstler", "galerist", "lions",
                            "Künstler", "Galerist", "Lions"},
    },
    "kauf": {
        "zahlungsart": {"bar", "kreditkarte", "paypal", "ueberweisung",
                        "Bar", "Kreditkarte", "PayPal", "Überweisung"},
    },
    "kaufanfrage": {
        "status": {"offen", "kontaktiert", "abgeschlossen", "storniert",
                   "Offen", "Kontaktiert", "Abgeschlossen", "Storniert"},
    },
}

# NOT-NULL-Felder die die Anwendung voraussetzt
# db_vorname absichtlich nicht dabei: Galerie- und Eigenbestand-Künstler haben oft nur Firmennamen
NOT_NULL_RULES: dict[str, list[str]] = {
    "kuenstler": ["db_ident", "db_name", "kuenstlertyp", "abrechnungsempf"],
    "bild":      ["bild_nr", "kuenstler_id", "bildtitel", "bildtechnik", "genre",
                  "hoehe_rahmen_cm", "breite_rahmen_cm"],
    "kauf":      ["bild_id", "kaeufer_vorname", "kaeufer_name", "zahlungsart"],
}

# Fremdschlüssel: (Tabelle, Spalte, Zieltabelle, Zielspalte)
FK_RULES: list[tuple[str, str, str, str]] = [
    ("bild",                     "kuenstler_id",   "kuenstler", "id"),
    ("kauf",                     "bild_id",        "bild",      "id"),
    ("reservierung",             "bild_id",        "bild",      "id"),
    ("kaufanfrage",              "bild_id",        "bild",      "id"),
    ("kuenstler",                "galerist_id",    "kuenstler", "id"),
    ("merkliste_eintrag",        "bild_id",        "bild",      "id"),
    ("merkliste_eintrag",        "besucher_id",    "besucher",  "id"),
    ("platz",                    "kuenstler_id",   "kuenstler", "id"),
    ("kuenstlernachrichtgelesen","kuenstler_id",   "kuenstler", "id"),
    ("kuenstlernachrichtgelesen","nachricht_id",   "kuenstlernachricht", "id"),
]


def _existing_tables(cur: sqlite3.Cursor) -> set[str]:
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {r[0] for r in cur.fetchall()}


def check_enums(cur: sqlite3.Cursor, tables: set[str]) -> list[str]:
    errors: list[str] = []
    for table, cols in ENUM_RULES.items():
        if table not in tables:
            continue
        for col, valid in cols.items():
            cur.execute(f"SELECT id, {col} FROM {table} WHERE {col} IS NOT NULL")  # noqa: S608
            for row_id, val in cur.fetchall():
                if val not in valid:
                    errors.append(
                        f"  [{table}.{col}] id={row_id}: unbekannter Wert {val!r}"
                        f"  (erlaubt: {sorted(valid)})"
                    )
    return errors


def check_not_null(cur: sqlite3.Cursor, tables: set[str]) -> list[str]:
    errors: list[str] = []
    for table, cols in NOT_NULL_RULES.items():
        if table not in tables:
            continue
        for col in cols:
            cur.execute(
                f"SELECT id FROM {table} WHERE {col} IS NULL OR TRIM(CAST({col} AS TEXT))=''"  # noqa: S608
            )
            rows = cur.fetchall()
            if rows:
                ids = [str(r[0]) for r in rows]
                errors.append(
                    f"  [{table}.{col}] NULL/leer bei id={', '.join(ids)}"
                )
    return errors


def check_foreign_keys(cur: sqlite3.Cursor, tables: set[str]) -> list[str]:
    errors: list[str] = []
    for src_table, src_col, dst_table, dst_col in FK_RULES:
        if src_table not in tables or dst_table not in tables:
            continue
        cur.execute(
            f"""
            SELECT s.id, s.{src_col}
            FROM {src_table} s
            LEFT JOIN {dst_table} d ON s.{src_col} = d.{dst_col}
            WHERE s.{src_col} IS NOT NULL AND d.{dst_col} IS NULL
            """  # noqa: S608
        )
        rows = cur.fetchall()
        if rows:
            for row_id, bad_ref in rows:
                errors.append(
                    f"  [{src_table}.{src_col}] id={row_id}: "
                    f"referenziert {dst_table}.{dst_col}={bad_ref} (existiert nicht)"
                )
    return errors


def check_business_rules(cur: sqlite3.Cursor, tables: set[str]) -> list[str]:
    warnings: list[str] = []

    if "kuenstler" in tables:
        cur.execute(
            "SELECT id, kuenstler_nr FROM kuenstler "
            "WHERE kuenstler_nr IS NOT NULL AND LENGTH(kuenstler_nr) > 3"
        )
        for row_id, nr in cur.fetchall():
            warnings.append(
                f"  [kuenstler.kuenstler_nr] id={row_id}: {nr!r} länger als 3 Zeichen"
            )

    if "bild" in tables:
        # VOR... ist ein gültiger Sondernummernkreis (Vorbehalts-/Eigenbestandsbilder)
        cur.execute(
            "SELECT id, bild_nr FROM bild "
            "WHERE LENGTH(bild_nr) != 7 AND bild_nr NOT LIKE 'VOR%'"
        )
        for row_id, nr in cur.fetchall():
            warnings.append(
                f"  [bild.bild_nr] id={row_id}: {nr!r} — erwartet 7 Zeichen (JJKKKNN)"
            )

        cur.execute(
            "SELECT id, bild_nr, einlieferungspreis, verkaufspreis FROM bild "
            "WHERE einlieferungspreis IS NOT NULL AND verkaufspreis IS NOT NULL "
            "AND verkaufspreis < einlieferungspreis"
        )
        for row_id, nr, ep, vp in cur.fetchall():
            warnings.append(
                f"  [bild] id={row_id} ({nr}): "
                f"Verkaufspreis {vp} < Einlieferungspreis {ep}"
            )

    return warnings


def main() -> int:
    if not DB_PATH.exists():
        print(f"FEHLER: Datenbank nicht gefunden: {DB_PATH}")
        return 1

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    tables = _existing_tables(cur)

    enum_errors   = check_enums(cur, tables)
    null_errors   = check_not_null(cur, tables)
    fk_errors     = check_foreign_keys(cur, tables)
    biz_warnings  = check_business_rules(cur, tables)
    conn.close()

    all_errors = enum_errors + null_errors + fk_errors
    print(f"\nDatenbank: {DB_PATH.name}")
    print("=" * 60)

    if enum_errors:
        print(f"\n[FEHLER] Ungültige Enum-Werte ({len(enum_errors)}):")
        for e in enum_errors:
            print(e)

    if null_errors:
        print(f"\n[FEHLER] NOT-NULL-Verletzungen ({len(null_errors)}):")
        for e in null_errors:
            print(e)

    if fk_errors:
        print(f"\n[FEHLER] Defekte Fremdschlüssel ({len(fk_errors)}):")
        for e in fk_errors:
            print(e)

    if biz_warnings:
        print(f"\n[WARNUNG] Geschäftsregel-Hinweise ({len(biz_warnings)}):")
        for w in biz_warnings:
            print(w)

    print()
    if all_errors:
        print(f"ERGEBNIS: FEHLER — {len(all_errors)} Problem(e) gefunden.")
        return 1

    if biz_warnings:
        print(f"ERGEBNIS: WARNUNG — keine Fehler, aber {len(biz_warnings)} Hinweis(e).")
        return 0

    print("ERGEBNIS: OK — alle Prüfungen bestanden.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

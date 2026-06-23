from sqlmodel import SQLModel, create_engine, Session, select
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kunsttage.db")

_PLAETZE_2025 = [
    # Raum 43
    (1,  "Raum 43",   1, "2,0 m"),
    (2,  "Raum 43",   2, "2,4 m"),
    (3,  "Raum 43",   2, "2,3 m"),
    (4,  "Raum 43",   1, "1,7 m"),
    (5,  "Raum 43",   2, "1,2 m"),
    (6,  "Raum 43",   2, "1,2 m"),
    (7,  "Raum 43",   2, "2,4 m"),
    (8,  "Raum 43",   2, "1,9 m"),
    # Raum 44
    (9,  "Raum 44",   2, "1,7 m + 0,8 m"),
    (10, "Raum 44",   3, "3,0 m + 2,0 m"),
    (11, "Raum 44",   1, "0,4 m + 1,7 m"),
    (12, "Raum 44",   4, "2,0 m"),
    # Raum 45
    (13, "Raum 45",   2, "1,7 m + 0,8 m"),
    (14, "Raum 45",   3, "2,0 m"),
    (15, "Raum 45",   1, "0,4 m + 1,7 m"),
    (16, "Raum 45",   3, "3,0 m + 2,6 m"),
    # Raum 46
    (17, "Raum 46",   2, "1,7 m + 0,8 m"),
    (18, "Raum 46",   3, "3,0 m + Hälfte 3,5 m"),
    (19, "Raum 46",   1, "0,8 m + 1,7 m"),
    (20, "Raum 46",   3, "3,0 m + Hälfte 3,5 m"),
    # Raum 47
    (21, "Raum 47",   1, "1,7 m + 0,4 m"),
    (22, "Raum 47",   3, "3,0 m + Hälfte 3,5 m"),
    (23, "Raum 47",   2, "1,2 m + 1,7 m"),
    (24, "Raum 47",   3, "3,0 m + Hälfte 3,5 m"),
    # Raum 48
    (25, "Raum 48",   4, "1,7 m + 0,4 m"),
    (26, "Raum 48",   4, "1,5 m"),
    # Raum 49
    (27, "Raum 49",   1, "2,0 m"),
    (28, "Raum 49",   2, "2,2 m"),
    (29, "Raum 49",   2, "2,3 m"),
    (30, "Raum 49",   2, "2,0 m"),
    (31, "Raum 49",   2, "2,0 m"),
    (32, "Raum 49",   4, "5,5 m"),
    # Flur 2
    (33, "Flur 2",    4, "5,0 m + 3,2 m + 3,5 m + 3,5 m"),
    (34, "Flur 2",    4, "5,0 m + 3,2 m + 3,5 m + 3,5 m"),
    # Hauptflur
    (35, "Hauptflur", 4, "—"),
    # Raum 42
    (36, "Raum 42",   1, "—"),
    (37, "Raum 42",   2, "—"),
    (38, "Raum 42",   2, "—"),
    (39, "Raum 42",   1, "—"),
]


def _seed_plaetze(session: Session) -> None:
    from models import Platz
    for pos_nr, raum, kat, haenge in _PLAETZE_2025:
        session.add(Platz(position_nr=pos_nr, raum=raum, platz_kategorie=kat, haenge_meter=haenge))


_RAUMZUTEILUNG_2025 = [
    ("43",    "gemeinsam"),
    ("44",    "Lions Club Annweiler"),
    ("45",    "Lions Club Bad Bergzabern"),
    ("46",    "Lions Club Edenkoben"),
    ("47",    "Lions Club Germersheim"),
    ("48",    "gemeinsam"),
    ("49",    "gemeinsam"),
    ("42",    None),
    ("Flur",  "gemeinsam"),
    ("Flur2", "gemeinsam"),
]


def _seed_raumzuteilung(session: Session) -> None:
    from models import Raumzuteilung
    for raum_nr, belegt_durch in _RAUMZUTEILUNG_2025:
        session.add(Raumzuteilung(raum_nr=raum_nr, belegt_durch=belegt_durch))

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db():
    SQLModel.metadata.create_all(engine)
    # Spalten-Migrationen für bestehende DBs
    with engine.connect() as con:
        cols = [r[1] for r in con.exec_driver_sql("PRAGMA table_info(kuenstler)")]
        if "kuenstler_nr" not in cols:
            con.exec_driver_sql("ALTER TABLE kuenstler ADD COLUMN kuenstler_nr TEXT")
            con.commit()
        if "ist_galerist" not in cols:
            con.exec_driver_sql("ALTER TABLE kuenstler ADD COLUMN ist_galerist INTEGER DEFAULT 0")
            con.commit()
        kauf_cols = [r[1] for r in con.exec_driver_sql("PRAGMA table_info(kauf)")]
        for col, typ in [
            ("snap_bild_nr", "TEXT"), ("snap_bildtitel", "TEXT"),
            ("snap_kuenstler", "TEXT"), ("snap_bildtechnik", "TEXT"),
            ("snap_verkaufspreis", "REAL"), ("snap_hoehe_rahmen_cm", "REAL"),
            ("snap_breite_rahmen_cm", "REAL"), ("snap_genre", "TEXT"),
        ]:
            if col not in kauf_cols:
                con.exec_driver_sql(f"ALTER TABLE kauf ADD COLUMN {col} {typ}")
        besucher_cols = [r[1] for r in con.exec_driver_sql("PRAGMA table_info(besucher)")]
        if "email_abgemeldet" not in besucher_cols:
            con.exec_driver_sql("ALTER TABLE besucher ADD COLUMN email_abgemeldet INTEGER DEFAULT 0")
        # Einstellung-Tabelle wird durch SQLModel.metadata.create_all angelegt
        con.commit()

    from models import Platz, Raumzuteilung
    with Session(engine) as s:
        if s.exec(select(Platz)).first() is None:
            _seed_plaetze(s)
            s.commit()
        if s.exec(select(Raumzuteilung)).first() is None:
            _seed_raumzuteilung(s)
            s.commit()


def get_session():
    with Session(engine) as session:
        yield session

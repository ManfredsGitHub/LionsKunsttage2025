from sqlmodel import SQLModel, create_engine, Session
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kunsttage.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def create_db():
    SQLModel.metadata.create_all(engine)
    # Spalten-Migrationen für bestehende DBs
    with engine.connect() as con:
        cols = [r[1] for r in con.exec_driver_sql("PRAGMA table_info(kuenstler)")]
        if "kuenstler_nr" not in cols:
            con.exec_driver_sql("ALTER TABLE kuenstler ADD COLUMN kuenstler_nr TEXT")
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
        con.commit()


def get_session():
    with Session(engine) as session:
        yield session

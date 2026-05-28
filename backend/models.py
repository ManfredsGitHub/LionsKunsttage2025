from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from enum import Enum


class Genre(str, Enum):
    abstrakt = "Abstrakt"
    akt = "Akt"
    landschaft = "Landschaft"
    menschen = "Menschen"
    pfalz = "Pfalz"
    portrait = "Portrait"
    staedte = "Städte"
    stilleben = "Stilleben"
    sonstiges = "Sonstiges"


class Verfuegbarkeit(str, Enum):
    verfuegbar = "Verfügbar"
    reserviert = "Reserviert"
    verkauft = "Verkauft"


class Abrechnungsempfaenger(str, Enum):
    kuenstler = "Künstler"
    galerist = "Galerist"
    lions = "Lions"


class Kuenstlertyp(str, Enum):
    vor_ort = "VorOrt"
    galerie = "Galerie"
    eigenbestand = "Eigenbestand"


class Zahlungsart(str, Enum):
    paypal = "PayPal"
    kreditkarte = "Kreditkarte"
    ueberweisung = "Überweisung"


# --- Künstler ---

class KuenstlerBase(SQLModel):
    db_ident: str = Field(unique=True, index=True)
    db_name: str
    db_vorname: str
    db_leben: Optional[str] = None
    db_kommentar: Optional[str] = None
    db_ausstellungen: Optional[str] = None
    kuenstlertyp: Kuenstlertyp = Kuenstlertyp.vor_ort


class Kuenstler(KuenstlerBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    db_email: Optional[str] = None
    db_telefon: Optional[str] = None
    db_instagram: Optional[str] = None
    db_facebook: Optional[str] = None
    db_webseite: Optional[str] = None
    db_adresse: Optional[str] = None
    portrait_foto: Optional[str] = None
    dsgvo_einwilligung: bool = False
    dsgvo_zeitstempel: Optional[datetime] = None
    login_token: Optional[str] = None
    login_token_expiry: Optional[datetime] = None
    aktiv: bool = True
    bilder: List["Bild"] = Relationship(back_populates="kuenstler")


class KuenstlerCreate(KuenstlerBase):
    db_email: Optional[str] = None
    db_telefon: Optional[str] = None
    db_adresse: Optional[str] = None


class KuenstlerPublic(KuenstlerBase):
    id: int
    db_instagram: Optional[str] = None
    db_webseite: Optional[str] = None
    portrait_foto: Optional[str] = None


# --- Bild ---

class BildBase(SQLModel):
    bild_nr: str = Field(unique=True, index=True)
    foto_nr: Optional[str] = None
    kuenstler_id: int = Field(foreign_key="kuenstler.id")
    bildtitel: str
    anmerkung_bild: Optional[str] = None
    bildtechnik: str
    genre: Genre
    anzahl: int = 1
    hoehe_rahmen_cm: float
    breite_rahmen_cm: float
    hoehe_cm: Optional[float] = None
    breite_cm: Optional[float] = None
    tiefe_cm: Optional[float] = None
    gewicht_kg: Optional[float] = None
    abrechnungsempf: Abrechnungsempfaenger = Abrechnungsempfaenger.kuenstler
    galerist_id: Optional[int] = None


class Bild(BildBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    einlieferungspreis: Optional[float] = None
    verkaufspreis_vorschlag: Optional[float] = None
    verkaufspreis: Optional[float] = None
    bild_url_web: Optional[str] = None
    bild_url_original: Optional[str] = None
    verfuegbarkeit: Verfuegbarkeit = Verfuegbarkeit.verfuegbar
    freigegeben: bool = False
    erstellt_am: datetime = Field(default_factory=datetime.utcnow)
    kuenstler: Optional[Kuenstler] = Relationship(back_populates="bilder")


class BildCreate(BildBase):
    einlieferungspreis: Optional[float] = None
    verkaufspreis: Optional[float] = None


class BildPublic(BildBase):
    id: int
    einlieferungspreis: Optional[float] = None
    verkaufspreis_vorschlag: Optional[float] = None
    verkaufspreis: Optional[float] = None
    bild_url_web: Optional[str] = None
    verfuegbarkeit: Verfuegbarkeit
    freigegeben: bool = False
    kuenstler: Optional[KuenstlerPublic] = None


# --- Reservierung ---

class Reservierung(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bild_id: int = Field(foreign_key="bild.id")
    vorname: str
    name: str
    email: str
    telefon: Optional[str] = None
    erstellt_am: datetime = Field(default_factory=datetime.utcnow)
    storniert: bool = False


class ReservierungCreate(SQLModel):
    bild_id: int
    vorname: str
    name: str
    email: str
    telefon: Optional[str] = None


# --- Kauf (Vor-Ort-Kasse) ---

class Kauf(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bild_id: int = Field(foreign_key="bild.id")
    reservierung_id: Optional[int] = Field(default=None, foreign_key="reservierung.id")
    kaeufer_titel: Optional[str] = None
    kaeufer_vorname: str
    kaeufer_name: str
    kaeufer_strasse: str
    kaeufer_plz: str
    kaeufer_ort: str
    kaeufer_email: str
    zahlungsart: Zahlungsart
    bezahlt: bool = False
    bezahlt_am: Optional[datetime] = None
    erstellt_am: datetime = Field(default_factory=datetime.utcnow)


class KaufCreate(SQLModel):
    bild_id: int
    reservierung_id: Optional[int] = None
    kaeufer_titel: Optional[str] = None
    kaeufer_vorname: str
    kaeufer_name: str
    kaeufer_strasse: str
    kaeufer_plz: str
    kaeufer_ort: str
    kaeufer_email: str
    zahlungsart: Zahlungsart

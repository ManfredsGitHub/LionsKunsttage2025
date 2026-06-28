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
    lions = "Lions"  # Altdaten — nicht mehr in UI anzeigen


class Kuenstlertyp(str, Enum):
    galerie = "galerie"
    vor_ort = "vor_ort"
    eigenbestand = "eigenbestand"
    galerist = "galerist"



class Zahlungsart(str, Enum):
    bar = "Bar"
    kreditkarte = "Kreditkarte"
    paypal = "PayPal"
    ueberweisung = "Überweisung"


class KaufanfrageStatus(str, Enum):
    offen = "Offen"
    kontaktiert = "Kontaktiert"
    abgeschlossen = "Abgeschlossen"
    storniert = "Storniert"


# --- Künstler ---

class KuenstlerBase(SQLModel):
    db_ident: str = Field(unique=True, index=True)
    db_name: str
    db_vorname: str
    kuenstlertyp: Kuenstlertyp = Field(default=Kuenstlertyp.vor_ort)
    kuenstler_nr: Optional[str] = Field(default=None, max_length=3, description="3-stellige externe Künstlernummer (KKK)")
    db_beruf: Optional[str] = None
    db_leben: Optional[str] = None
    db_lebenstext: Optional[str] = None
    db_kommentar: Optional[str] = None
    db_inspiration: Optional[str] = None
    db_ausstellungen: Optional[str] = None


class Kuenstler(KuenstlerBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    db_email: Optional[str] = None
    db_telefon: Optional[str] = None
    db_instagram: Optional[str] = None
    db_facebook: Optional[str] = None
    db_pinterest: Optional[str] = None
    db_webseite: Optional[str] = None
    db_adresse: Optional[str] = None
    db_plz: Optional[str] = None
    db_ort: Optional[str] = None
    portrait_foto: Optional[str] = None
    dsgvo_einwilligung: bool = False
    dsgvo_zeitstempel: Optional[datetime] = None
    login_token: Optional[str] = None
    login_token_expiry: Optional[datetime] = None
    aktiv: bool = True
    vor_ort_anwesend: bool = False
    zur_ausstellung_ansprechen: bool = False
    abrechnungsempf: Abrechnungsempfaenger = Field(default=Abrechnungsempfaenger.kuenstler)
    galerist_id: Optional[int] = Field(default=None, foreign_key="kuenstler.id")
    bilder: List["Bild"] = Relationship(back_populates="kuenstler")


class KuenstlerCreate(KuenstlerBase):
    db_email: Optional[str] = None
    db_telefon: Optional[str] = None
    db_adresse: Optional[str] = None


class KuenstlerPublic(KuenstlerBase):
    id: int
    kuenstler_nr: Optional[str] = None
    db_email: Optional[str] = None
    db_adresse: Optional[str] = None
    db_plz: Optional[str] = None
    db_ort: Optional[str] = None
    db_instagram: Optional[str] = None
    db_facebook: Optional[str] = None
    db_pinterest: Optional[str] = None
    db_webseite: Optional[str] = None
    portrait_foto: Optional[str] = None
    aktiv: bool = True
    vor_ort_anwesend: bool = False
    zur_ausstellung_ansprechen: bool = False
    abrechnungsempf: Abrechnungsempfaenger = Abrechnungsempfaenger.kuenstler
    galerist_id: Optional[int] = None


class KuenstlerSelf(SQLModel):
    """Was ein Künstler über sich selbst sehen darf — keine Orgadaten."""
    id: int
    db_name: str
    db_vorname: str
    kuenstler_nr: Optional[str] = None
    db_beruf: Optional[str] = None
    db_leben: Optional[str] = None
    db_lebenstext: Optional[str] = None
    db_kommentar: Optional[str] = None
    db_inspiration: Optional[str] = None
    db_ausstellungen: Optional[str] = None
    db_email: Optional[str] = None
    db_telefon: Optional[str] = None
    db_instagram: Optional[str] = None
    db_facebook: Optional[str] = None
    db_pinterest: Optional[str] = None
    db_webseite: Optional[str] = None
    db_adresse: Optional[str] = None
    db_plz: Optional[str] = None
    db_ort: Optional[str] = None
    portrait_foto: Optional[str] = None
    dsgvo_einwilligung: bool = False
    aktiv: bool = True


class KuenstlerBewerbungCreate(SQLModel):
    """Öffentliches Formular: Künstler bewirbt sich selbst."""
    db_name: str
    db_vorname: str
    db_email: str
    db_telefon: Optional[str] = None
    db_beruf: Optional[str] = None
    db_adresse: Optional[str] = None
    db_plz: Optional[str] = None
    db_ort: Optional[str] = None
    db_webseite: Optional[str] = None
    db_instagram: Optional[str] = None
    db_pinterest: Optional[str] = None
    bewerbungstext: Optional[str] = None


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
    in_ausstellung: bool = True
    erstellt_am: datetime = Field(default_factory=datetime.utcnow)
    kuenstler: Optional[Kuenstler] = Relationship(back_populates="bilder")


class BildCreate(BildBase):
    bild_nr: Optional[str] = None  # wird auto-generiert wenn leer
    einlieferungspreis: Optional[float] = None
    verkaufspreis: Optional[float] = None
    in_ausstellung: bool = True


class BildPublic(BildBase):
    id: int
    einlieferungspreis: Optional[float] = None
    verkaufspreis_vorschlag: Optional[float] = None
    verkaufspreis: Optional[float] = None
    bild_url_web: Optional[str] = None
    verfuegbarkeit: Verfuegbarkeit
    freigegeben: bool = False
    in_ausstellung: bool = True
    kuenstler: Optional[KuenstlerPublic] = None
    galerist: Optional[KuenstlerPublic] = None


# --- BildFoto (max. 3 Fotos pro Bild) ---

class BildFoto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bild_id: int = Field(foreign_key="bild.id", index=True)
    url: str
    reihenfolge: int = 1


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
    # Snapshot-Felder — werden beim Archivieren befüllt
    snap_bild_nr: Optional[str] = None
    snap_bildtitel: Optional[str] = None
    snap_kuenstler: Optional[str] = None
    snap_bildtechnik: Optional[str] = None
    snap_verkaufspreis: Optional[float] = None
    snap_hoehe_rahmen_cm: Optional[float] = None
    snap_breite_rahmen_cm: Optional[float] = None
    snap_genre: Optional[str] = None


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


# --- Kaufanfrage (Online-Kaufabsicht, Abwicklung über externes System) ---

class Kaufanfrage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    bild_id: int = Field(foreign_key="bild.id")
    anrede: Optional[str] = None
    vorname: str
    name: str
    email: str
    telefon: Optional[str] = None
    strasse: str
    plz: str
    ort: str
    land: str = "Deutschland"
    anmerkung: Optional[str] = None
    status: KaufanfrageStatus = KaufanfrageStatus.offen
    erstellt_am: datetime = Field(default_factory=datetime.utcnow)


class KaufanfrageCreate(SQLModel):
    bild_id: int
    anrede: Optional[str] = None
    vorname: str
    name: str
    email: str
    telefon: Optional[str] = None
    strasse: str
    plz: str
    ort: str
    land: str = "Deutschland"
    anmerkung: Optional[str] = None


# --- Merkliste ---

class Besucher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: Optional[str] = Field(default=None, index=True)
    telefon: Optional[str] = None
    token: str = Field(unique=True, index=True)
    erstellt_am: datetime = Field(default_factory=datetime.utcnow)
    email_abgemeldet: bool = Field(default=False)
    eintraege: List["MerklisteEintrag"] = Relationship(back_populates="besucher")


class MerklisteEintrag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    besucher_id: int = Field(foreign_key="besucher.id")
    bild_id: int = Field(foreign_key="bild.id")
    hinzugefuegt_am: datetime = Field(default_factory=datetime.utcnow)
    besucher: Optional["Besucher"] = Relationship(back_populates="eintraege")


# --- Künstler-Nachrichten ---

class KuenstlerNachricht(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    betreff: str
    text: str
    erstellt_am: datetime = Field(default_factory=datetime.utcnow)
    gelesen_eintraege: List["KuenstlerNachrichtGelesen"] = Relationship(back_populates="nachricht")


class KuenstlerNachrichtGelesen(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nachricht_id: int = Field(foreign_key="kuenstlernachricht.id")
    kuenstler_id: int = Field(foreign_key="kuenstler.id")
    gelesen_am: datetime = Field(default_factory=datetime.utcnow)
    nachricht: Optional["KuenstlerNachricht"] = Relationship(back_populates="gelesen_eintraege")


# --- Nutzer (rollenbasierte Accounts) ---

class Nutzer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    rolle: str  # "admin" | "orga" | "kasse" | "kuenstler"
    kuenstler_id: Optional[int] = Field(default=None, foreign_key="kuenstler.id")
    aktiv: bool = True
    erstellt_am: datetime = Field(default_factory=datetime.utcnow)
    letzter_login: Optional[datetime] = None


class AuthToken(SQLModel, table=True):
    """Einmalige Tokens für Passwort-Reset und Account-Einrichtung."""
    id: Optional[int] = Field(default=None, primary_key=True)
    nutzer_id: int = Field(foreign_key="nutzer.id", index=True)
    token_hash: str = Field(index=True)  # SHA-256 des Klartext-Tokens
    zweck: str                            # "reset" | "setup"
    expires_at: datetime
    used: bool = False
    erstellt_am: datetime = Field(default_factory=datetime.utcnow)


class NutzerPublic(SQLModel):
    id: int
    email: str
    rolle: str
    kuenstler_id: Optional[int] = None
    aktiv: bool
    erstellt_am: datetime
    letzter_login: Optional[datetime] = None


# --- Seiteneinstellungen (Key-Value) ---

class Einstellung(SQLModel, table=True):
    schluessel: str = Field(primary_key=True)
    wert: str = Field(default="")


# --- Platzplan ---

class Platz(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    position_nr: int = Field(index=True, unique=True)
    raum: str
    platz_kategorie: int
    haenge_meter: str
    kuenstler_id: Optional[int] = Field(default=None, foreign_key="kuenstler.id")


class PlatzPublic(SQLModel):
    id: int
    position_nr: int
    raum: str
    platz_kategorie: int
    haenge_meter: str
    kuenstler_id: Optional[int] = None
    kuenstler: Optional[KuenstlerPublic] = None


# --- Raumplan ---

class Raumzuteilung(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    raum_nr: str = Field(unique=True, index=True)  # "43", "44", ..., "Flur", "Flur2"
    belegt_durch: Optional[str] = None             # z.B. "Lions Club Annweiler"

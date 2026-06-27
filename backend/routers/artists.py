import logging
import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
from models import Kuenstler, KuenstlerCreate, KuenstlerPublic, Bild, BildPublic, Genre, Abrechnungsempfaenger, KuenstlerNachricht, KuenstlerNachrichtGelesen
from database import get_session
from services import email_service
from services.image_service import compress_image, save_image
from services.price_service import berechne_verkaufspreis

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kuenstler", tags=["Künstler"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


@router.get("/", response_model=list[KuenstlerPublic])
def list_kuenstler(session: Session = Depends(get_session)):
    # Nur Künstler mit mindestens einem freigegebenen Bild mit Foto
    mit_bild = select(Bild.kuenstler_id).where(
        Bild.freigegeben == True,
        Bild.bild_url_web != None,
    ).distinct()
    return session.exec(
        select(Kuenstler).where(
            Kuenstler.aktiv == True,
            Kuenstler.id.in_(mit_bild),
        )
    ).all()


@router.get("/{kuenstler_id}", response_model=KuenstlerPublic)
def get_kuenstler(kuenstler_id: int, session: Session = Depends(get_session)):
    k = session.get(Kuenstler, kuenstler_id)
    if not k:
        raise HTTPException(404)
    return k


@router.post("/einladen")
def einladen(kuenstler_id: int, session: Session = Depends(get_session)):
    """Admin: E-Mail-Login-Link an Künstler senden."""
    k = session.get(Kuenstler, kuenstler_id)
    if not k or not k.db_email:
        raise HTTPException(404, "Künstler oder E-Mail nicht gefunden")

    token = secrets.token_urlsafe(32)
    k.login_token = token
    k.login_token_expiry = datetime.utcnow() + timedelta(hours=48)
    session.add(k)
    session.commit()

    try:
        email_service.send_kuenstler_login(k.db_email, k.db_vorname, token)
    except Exception as exc:
        logger.warning("E-Mail-Versand fehlgeschlagen: %s", exc)
    return {"status": "eingeladen"}


@router.post("/login-link-anfordern")
def login_link_anfordern(data: dict, session: Session = Depends(get_session)):
    """Künstler fordert neuen Login-Link per E-Mail an."""
    email = (data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(400, "E-Mail erforderlich")
    k = session.exec(select(Kuenstler).where(Kuenstler.db_email == email, Kuenstler.aktiv == True)).first()
    if not k:
        # Keine Fehlermeldung um E-Mail-Enumeration zu vermeiden
        return {"status": "gesendet"}
    token = secrets.token_urlsafe(32)
    k.login_token = token
    k.login_token_expiry = datetime.utcnow() + timedelta(hours=48)
    session.add(k)
    session.commit()
    try:
        email_service.send_kuenstler_login(k.db_email, k.db_vorname or k.db_name, token)
    except Exception as exc:
        logger.warning("E-Mail-Versand fehlgeschlagen: %s", exc)
    return {"status": "gesendet"}


@router.get("/login/verify")
def verify_token(token: str, session: Session = Depends(get_session)):
    k = session.exec(
        select(Kuenstler).where(Kuenstler.login_token == token)
    ).first()
    if not k or not k.login_token_expiry or k.login_token_expiry < datetime.utcnow():
        raise HTTPException(401, "Token ungültig oder abgelaufen")
    return {"kuenstler_id": k.id, "name": f"{k.db_vorname} {k.db_name}"}


@router.patch("/{kuenstler_id}/profil")
def profil_aktualisieren(
    kuenstler_id: int,
    daten: dict,
    session: Session = Depends(get_session),
):
    k = session.get(Kuenstler, kuenstler_id)
    if not k:
        raise HTTPException(404)
    erlaubt = {"db_beruf", "db_leben", "db_kommentar", "db_ausstellungen", "db_adresse", "db_email", "db_instagram", "db_facebook", "db_pinterest", "db_webseite"}
    for key, val in daten.items():
        if key in erlaubt:
            setattr(k, key, val)
    session.add(k)
    session.commit()
    return {"status": "aktualisiert"}


@router.patch("/{kuenstler_id}/dsgvo")
def dsgvo_einwilligung(kuenstler_id: int, session: Session = Depends(get_session)):
    k = session.get(Kuenstler, kuenstler_id)
    if not k:
        raise HTTPException(404)
    k.dsgvo_einwilligung = True
    k.dsgvo_zeitstempel = datetime.utcnow()
    session.add(k)
    session.commit()
    return {"status": "einwilligung_erteilt", "zeitstempel": k.dsgvo_zeitstempel}


class BildEinreichungData(BaseModel):
    bildtitel: str
    bildtechnik: str
    genre: Genre
    breite_rahmen_cm: float = 0
    hoehe_rahmen_cm: float = 0
    einlieferungspreis: Optional[float] = None
    anmerkung_bild: Optional[str] = None
    abrechnungsempf: Optional[Abrechnungsempfaenger] = None
    galerist_id: Optional[int] = None


def _generiere_bild_nr(kuenstler: Kuenstler, session: Session) -> str:
    if not kuenstler.kuenstler_nr:
        raise HTTPException(400, "Keine Künstlernummer hinterlegt — bitte Admin kontaktieren")
    year = datetime.now().year % 100
    prefix = f"{year:02d}{kuenstler.kuenstler_nr:>03s}"
    count = session.exec(select(func.count(Bild.id)).where(Bild.bild_nr.like(f"{prefix}%"))).one()
    nn = count + 1
    bild_nr = f"{prefix}{nn:02d}"
    while session.exec(select(Bild).where(Bild.bild_nr == bild_nr)).first():
        nn += 1
        bild_nr = f"{prefix}{nn:02d}"
    return bild_nr


@router.get("/{kuenstler_id}/bilder", response_model=list[BildPublic])
def kuenstler_bilder(kuenstler_id: int, session: Session = Depends(get_session)):
    bilder = session.exec(
        select(Bild).where(Bild.kuenstler_id == kuenstler_id).order_by(Bild.bild_nr)
    ).all()
    return [BildPublic.model_validate(b) for b in bilder]


@router.post("/{kuenstler_id}/bilder", response_model=BildPublic)
def bild_einreichen(kuenstler_id: int, data: BildEinreichungData, session: Session = Depends(get_session)):
    k = session.get(Kuenstler, kuenstler_id)
    if not k:
        raise HTTPException(404, "Künstler nicht gefunden")
    bild_nr = _generiere_bild_nr(k, session)
    b = Bild(
        bild_nr=bild_nr,
        kuenstler_id=kuenstler_id,
        bildtitel=data.bildtitel,
        bildtechnik=data.bildtechnik,
        genre=data.genre,
        breite_rahmen_cm=data.breite_rahmen_cm,
        hoehe_rahmen_cm=data.hoehe_rahmen_cm,
        einlieferungspreis=data.einlieferungspreis,
        verkaufspreis_vorschlag=berechne_verkaufspreis(data.einlieferungspreis) if data.einlieferungspreis else None,
        anmerkung_bild=data.anmerkung_bild,
        abrechnungsempf=data.abrechnungsempf,
        galerist_id=data.galerist_id,
        freigegeben=False,
        in_ausstellung=data.in_ausstellung,
    )
    session.add(b)
    session.commit()
    session.refresh(b)
    return BildPublic.model_validate(b)


@router.post("/{kuenstler_id}/bilder/{bild_id}/foto")
async def bild_foto_hochladen(
    kuenstler_id: int, bild_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    b = session.get(Bild, bild_id)
    if not b or b.kuenstler_id != kuenstler_id:
        raise HTTPException(404)
    data = await file.read()
    web_bytes, orig_bytes = compress_image(data, file.filename)
    web_url, orig_url = save_image(web_bytes, orig_bytes, b.bild_nr, UPLOAD_DIR)
    b.bild_url_web = web_url
    b.bild_url_original = orig_url
    session.add(b)
    session.commit()
    return {"bild_url_web": web_url}


@router.delete("/{kuenstler_id}/bilder/{bild_id}")
def bild_zurueckziehen(kuenstler_id: int, bild_id: int, session: Session = Depends(get_session)):
    b = session.get(Bild, bild_id)
    if not b or b.kuenstler_id != kuenstler_id:
        raise HTTPException(404)
    if b.freigegeben:
        raise HTTPException(400, "Freigegebene Bilder können nicht zurückgezogen werden")
    session.delete(b)
    session.commit()
    return {"status": "gelöscht"}


@router.get("/{kuenstler_id}/nachrichten")
def kuenstler_nachrichten(kuenstler_id: int, session: Session = Depends(get_session)):
    session.get(Kuenstler, kuenstler_id) or (_ for _ in ()).throw(HTTPException(404))
    nachrichten = session.exec(
        select(KuenstlerNachricht).order_by(KuenstlerNachricht.erstellt_am.desc())
    ).all()
    gelesen_ids = set(session.exec(
        select(KuenstlerNachrichtGelesen.nachricht_id)
        .where(KuenstlerNachrichtGelesen.kuenstler_id == kuenstler_id)
    ).all())
    return [
        {"id": n.id, "betreff": n.betreff, "text": n.text,
         "erstellt_am": n.erstellt_am, "gelesen": n.id in gelesen_ids}
        for n in nachrichten
    ]


@router.post("/{kuenstler_id}/nachrichten/{nachricht_id}/gelesen")
def nachricht_gelesen(kuenstler_id: int, nachricht_id: int, session: Session = Depends(get_session)):
    exists = session.exec(
        select(KuenstlerNachrichtGelesen).where(
            KuenstlerNachrichtGelesen.kuenstler_id == kuenstler_id,
            KuenstlerNachrichtGelesen.nachricht_id == nachricht_id,
        )
    ).first()
    if not exists:
        session.add(KuenstlerNachrichtGelesen(kuenstler_id=kuenstler_id, nachricht_id=nachricht_id))
        session.commit()
    return {"status": "ok"}


@router.post("/{kuenstler_id}/portrait")
async def portrait_hochladen(
    kuenstler_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    k = session.get(Kuenstler, kuenstler_id)
    if not k:
        raise HTTPException(404)
    data = await file.read()
    web_bytes, orig_bytes = compress_image(data, file.filename)
    web_url, _ = save_image(web_bytes, orig_bytes, f"portrait_{kuenstler_id}", UPLOAD_DIR)
    k.portrait_foto = web_url
    session.add(k)
    session.commit()
    return {"portrait_foto": web_url}

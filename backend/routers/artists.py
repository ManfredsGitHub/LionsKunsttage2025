import logging
import os
import secrets
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from models import Kuenstler, KuenstlerCreate, KuenstlerPublic
from database import get_session
from services import email_service
from services.image_service import compress_image, save_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kuenstler", tags=["Künstler"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


@router.get("/", response_model=list[KuenstlerPublic])
def list_kuenstler(session: Session = Depends(get_session)):
    return session.exec(select(Kuenstler).where(Kuenstler.aktiv == True)).all()


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
    erlaubt = {"db_beruf", "db_leben", "db_kommentar", "db_ausstellungen", "db_adresse", "db_email", "db_instagram", "db_facebook", "db_webseite"}
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

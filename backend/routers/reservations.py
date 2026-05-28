import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from models import Bild, Reservierung, ReservierungCreate, Verfuegbarkeit
from database import get_session
from services import email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reservierungen", tags=["Reservierungen"])


@router.post("/")
def reservieren(data: ReservierungCreate, session: Session = Depends(get_session)):
    bild = session.get(Bild, data.bild_id)
    if not bild:
        raise HTTPException(404, "Bild nicht gefunden")
    if bild.verfuegbarkeit != Verfuegbarkeit.verfuegbar:
        raise HTTPException(409, "Bild ist nicht mehr verfügbar")

    reservierung = Reservierung.model_validate(data)
    session.add(reservierung)

    bild.verfuegbarkeit = Verfuegbarkeit.reserviert
    session.add(bild)
    session.commit()
    session.refresh(reservierung)

    name = f"{data.vorname} {data.name}"
    try:
        email_service.send_reservierung_besucher(data.email, name, bild.bildtitel, bild.bild_nr)
    except Exception as exc:
        logger.warning("Besucher-Mail fehlgeschlagen: %s", exc)
    try:
        email_service.send_reservierung_admin(bild.bild_nr, bild.bildtitel, name, data.email, data.telefon or "")
    except Exception as exc:
        logger.warning("Admin-Mail fehlgeschlagen: %s", exc)

    return {"id": reservierung.id, "status": "reserviert"}


@router.delete("/{reservierung_id}")
def stornieren(reservierung_id: int, session: Session = Depends(get_session)):
    r = session.get(Reservierung, reservierung_id)
    if not r:
        raise HTTPException(404)
    r.storniert = True
    bild = session.get(Bild, r.bild_id)
    if bild and bild.verfuegbarkeit == Verfuegbarkeit.reserviert:
        bild.verfuegbarkeit = Verfuegbarkeit.verfuegbar
        session.add(bild)
    session.add(r)
    session.commit()
    return {"status": "storniert"}

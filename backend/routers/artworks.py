from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlmodel import Session, select, func
from typing import Optional
from datetime import datetime
from models import Bild, BildCreate, BildPublic, Verfuegbarkeit, Genre
from database import get_session
from services.image_service import compress_image, save_image
from services.price_service import berechne_verkaufspreis
import os

router = APIRouter(prefix="/bilder", tags=["Bilder"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


@router.get("/", response_model=list[BildPublic])
def list_bilder(
    genre: Optional[Genre] = None,
    technik: Optional[str] = None,
    kuenstler_id: Optional[int] = None,
    nur_verfuegbar: bool = True,
    session: Session = Depends(get_session),
):
    q = select(Bild).where(Bild.freigegeben == True, Bild.bild_url_web != None)
    if nur_verfuegbar:
        q = q.where(Bild.verfuegbarkeit == Verfuegbarkeit.verfuegbar)
    if genre:
        q = q.where(Bild.genre == genre)
    if technik:
        q = q.where(Bild.bildtechnik.ilike(f"%{technik}%"))
    if kuenstler_id:
        q = q.where(Bild.kuenstler_id == kuenstler_id)
    return session.exec(q).all()


@router.get("/{bild_id}", response_model=BildPublic)
def get_bild(bild_id: int, session: Session = Depends(get_session)):
    bild = session.get(Bild, bild_id)
    if not bild or not bild.freigegeben:
        raise HTTPException(404, "Bild nicht gefunden")
    return bild


def _generiere_bild_nr(kuenstler_id: int, session: Session) -> str:
    from models import Kuenstler
    from fastapi import HTTPException
    kuenstler = session.get(Kuenstler, kuenstler_id)
    if not kuenstler or not kuenstler.kuenstler_nr:
        raise HTTPException(400, f"Künstler {kuenstler_id} hat keine Künstlernummer (KKK) hinterlegt")
    year = datetime.now().year % 100
    prefix = f"{year:02d}{kuenstler.kuenstler_nr:>03s}"  # z.B. "26105"
    count = session.exec(
        select(func.count(Bild.id)).where(Bild.bild_nr.like(f"{prefix}%"))
    ).one()
    nn = count + 1
    bild_nr = f"{prefix}{nn:02d}"
    while session.exec(select(Bild).where(Bild.bild_nr == bild_nr)).first():
        nn += 1
        bild_nr = f"{prefix}{nn:02d}"
    return bild_nr


@router.post("/", response_model=BildPublic)
def create_bild(bild: BildCreate, session: Session = Depends(get_session)):
    if not bild.bild_nr:
        bild.bild_nr = _generiere_bild_nr(bild.kuenstler_id, session)
    db_bild = Bild.model_validate(bild)
    if bild.einlieferungspreis and not bild.verkaufspreis:
        db_bild.verkaufspreis_vorschlag = berechne_verkaufspreis(bild.einlieferungspreis)
    session.add(db_bild)
    session.commit()
    session.refresh(db_bild)
    return db_bild


@router.post("/{bild_id}/bild-upload")
async def upload_bild(
    bild_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    bild = session.get(Bild, bild_id)
    if not bild:
        raise HTTPException(404, "Bild nicht gefunden")

    data = await file.read()
    web_bytes, orig_bytes = compress_image(data, file.filename)
    web_url, orig_url = save_image(web_bytes, orig_bytes, bild.bild_nr, UPLOAD_DIR)

    bild.bild_url_web = web_url
    bild.bild_url_original = orig_url
    session.add(bild)
    session.commit()
    return {"bild_url_web": web_url}

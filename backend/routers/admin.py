from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlmodel import Session, select
from pydantic import BaseModel
from models import Bild, BildPublic, Kuenstler, Reservierung, Kauf
from database import get_session
from services.import_service import import_csv, import_excel
import csv, io

router = APIRouter(prefix="/admin", tags=["Admin"])


# --- Bilder freischalten ---

@router.patch("/bilder/{bild_id}/freigeben")
def freigeben(bild_id: int, session: Session = Depends(get_session)):
    bild = session.get(Bild, bild_id)
    if not bild:
        raise HTTPException(404)
    bild.freigegeben = True
    session.add(bild)
    session.commit()
    return {"status": "freigegeben"}


class MassenfreigabeIn(BaseModel):
    ids: list[int]


@router.patch("/bilder/massenfreigabe")
def massenfreigabe(body: MassenfreigabeIn, session: Session = Depends(get_session)):
    bilder = session.exec(select(Bild).where(Bild.id.in_(body.ids))).all()
    for b in bilder:
        b.freigegeben = True
        session.add(b)
    session.commit()
    return {"freigegeben": len(bilder)}


@router.patch("/bilder/{bild_id}/preis")
def preis_setzen(bild_id: int, verkaufspreis: float, session: Session = Depends(get_session)):
    bild = session.get(Bild, bild_id)
    if not bild:
        raise HTTPException(404)
    bild.verkaufspreis = verkaufspreis
    session.add(bild)
    session.commit()
    return {"verkaufspreis": verkaufspreis}


# --- CSV/Excel-Import ---

@router.post("/import/csv")
async def import_csv_endpoint(file: UploadFile = File(...), session: Session = Depends(get_session)):
    data = await file.read()
    return import_csv(data, session)


@router.post("/import/excel")
async def import_excel_endpoint(file: UploadFile = File(...), session: Session = Depends(get_session)):
    data = await file.read()
    return import_excel(data, session)


# --- Druckliste ---

@router.get("/druckliste")
def druckliste(session: Session = Depends(get_session)):
    bilder = session.exec(select(Bild).order_by(Bild.bild_nr)).all()
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "Bild-Nr", "Titel", "Künstler", "Technik", "Genre",
        "Breite (cm)", "Höhe (cm)", "Preis (€)", "Status",
    ])
    for b in bilder:
        k = session.get(Kuenstler, b.kuenstler_id)
        kuenstler_name = f"{k.db_vorname} {k.db_name}" if k else "—"
        writer.writerow([
            b.bild_nr, b.bildtitel, kuenstler_name, b.bildtechnik, b.genre.value,
            b.breite_rahmen_cm, b.hoehe_rahmen_cm, b.verkaufspreis or "—", b.verfuegbarkeit.value,
        ])
    from fastapi.responses import StreamingResponse
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=druckliste.csv"},
    )


# --- Übersichten ---

@router.get("/bilder/alle", response_model=list[BildPublic])
def alle_bilder(session: Session = Depends(get_session)):
    return session.exec(select(Bild).order_by(Bild.bild_nr)).all()


@router.get("/reservierungen")
def alle_reservierungen(session: Session = Depends(get_session)):
    return session.exec(select(Reservierung).where(Reservierung.storniert == False)).all()


@router.get("/kaeufe")
def alle_kaeufe(session: Session = Depends(get_session)):
    return session.exec(select(Kauf)).all()

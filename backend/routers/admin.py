import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
import secrets
from datetime import datetime, timedelta
from models import Bild, BildPublic, Kuenstler, KuenstlerCreate, KuenstlerPublic, Reservierung, Kauf, Besucher, MerklisteEintrag, Genre, Verfuegbarkeit
from database import get_session
from services.import_service import import_csv, import_excel
from services.image_service import compress_image, save_image
from services.price_service import berechne_verkaufspreis
import csv, io

router = APIRouter(prefix="/admin", tags=["Admin"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")


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


# --- Foto-Upload ---

@router.post("/bilder/{bild_id}/foto")
async def foto_hochladen(
    bild_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    bild = session.get(Bild, bild_id)
    if not bild:
        raise HTTPException(404)
    data = await file.read()
    web_bytes, orig_bytes = compress_image(data, file.filename)
    web_url, _ = save_image(web_bytes, orig_bytes, bild.bild_nr, UPLOAD_DIR)
    bild.bild_url_web = web_url
    session.add(bild)
    session.commit()
    return {"bild_url_web": web_url}


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

@router.get("/kuenstler/alle", response_model=list[KuenstlerPublic])
def alle_kuenstler(session: Session = Depends(get_session)):
    return session.exec(
        select(Kuenstler).where(Kuenstler.aktiv == True).order_by(Kuenstler.db_name)
    ).all()


@router.patch("/bilder/{bild_id}/ausstellung")
def ausstellung_toggle(bild_id: int, in_ausstellung: bool, session: Session = Depends(get_session)):
    bild = session.get(Bild, bild_id)
    if not bild:
        raise HTTPException(404)
    bild.in_ausstellung = in_ausstellung
    session.add(bild)
    session.commit()
    return {"in_ausstellung": in_ausstellung}


class BildNeuData(BaseModel):
    kuenstler_id: int
    bildtitel: str
    bildtechnik: str
    genre: Genre
    breite_rahmen_cm: float = 0
    hoehe_rahmen_cm: float = 0
    einlieferungspreis: Optional[float] = None
    in_ausstellung: bool = True


@router.post("/bilder/neu", response_model=BildPublic)
def bild_neu(data: BildNeuData, session: Session = Depends(get_session)):
    # Bild-Nr auto-generieren: VOR{YY}{lfd}
    year = datetime.now().year % 100
    count = session.exec(select(func.count(Bild.id))).one()
    bild_nr = f"VOR{year:02d}{count+1:04d}"
    while session.exec(select(Bild).where(Bild.bild_nr == bild_nr)).first():
        count += 1
        bild_nr = f"VOR{year:02d}{count:04d}"
    b = Bild(
        bild_nr=bild_nr,
        kuenstler_id=data.kuenstler_id,
        bildtitel=data.bildtitel,
        bildtechnik=data.bildtechnik,
        genre=data.genre,
        breite_rahmen_cm=data.breite_rahmen_cm,
        hoehe_rahmen_cm=data.hoehe_rahmen_cm,
        einlieferungspreis=data.einlieferungspreis,
        verkaufspreis_vorschlag=berechne_verkaufspreis(data.einlieferungspreis) if data.einlieferungspreis else None,
        in_ausstellung=data.in_ausstellung,
    )
    session.add(b)
    session.commit()
    session.refresh(b)
    _ = b.kuenstler
    return BildPublic.model_validate(b)


@router.get("/bilder/alle", response_model=list[BildPublic])
def alle_bilder(session: Session = Depends(get_session)):
    return session.exec(select(Bild).order_by(Bild.bild_nr)).all()


@router.post("/kuenstler")
def kuenstler_anlegen(daten: KuenstlerCreate, session: Session = Depends(get_session)):
    db_ident = f"voort_{daten.db_name.lower().replace(' ', '_')}_{daten.db_vorname.lower().replace(' ', '_')}"
    # Eindeutigkeit sicherstellen
    basis = db_ident
    zähler = 1
    while session.exec(select(Kuenstler).where(Kuenstler.db_ident == db_ident)).first():
        db_ident = f"{basis}_{zähler}"
        zähler += 1
    k = Kuenstler(
        db_ident=db_ident,
        db_name=daten.db_name,
        db_vorname=daten.db_vorname,
        db_email=daten.db_email,
        db_telefon=daten.db_telefon,
        db_adresse=daten.db_adresse,
        kuenstlertyp="VorOrt",
        aktiv=True,
    )
    session.add(k)
    session.commit()
    session.refresh(k)
    return {"id": k.id, "db_ident": k.db_ident}


@router.post("/kuenstler/{kuenstler_id}/einladen")
def kuenstler_einladen(kuenstler_id: int, session: Session = Depends(get_session)):
    k = session.get(Kuenstler, kuenstler_id)
    if not k:
        raise HTTPException(404)
    token = secrets.token_urlsafe(32)
    k.login_token = token
    k.login_token_expiry = datetime.utcnow() + timedelta(hours=48)
    session.add(k)
    session.commit()
    return {"token": token, "portal_url": f"/kuenstler/login?token={token}"}


@router.get("/reservierungen")
def alle_reservierungen(session: Session = Depends(get_session)):
    return session.exec(select(Reservierung).where(Reservierung.storniert == False)).all()


@router.get("/kaeufe")
def alle_kaeufe(session: Session = Depends(get_session)):
    return session.exec(select(Kauf)).all()


@router.get("/merklisten")
def alle_merklisten(session: Session = Depends(get_session)):
    besucher_liste = session.exec(
        select(Besucher).order_by(Besucher.erstellt_am.desc())
    ).all()
    result = []
    for b in besucher_liste:
        eintraege = session.exec(
            select(MerklisteEintrag)
            .where(MerklisteEintrag.besucher_id == b.id)
            .order_by(MerklisteEintrag.hinzugefuegt_am)
        ).all()
        bild_ids = [e.bild_id for e in eintraege]
        bilder = []
        for bid in bild_ids:
            bild = session.get(Bild, bid)
            if bild:
                _ = bild.kuenstler
                bilder.append(BildPublic.model_validate(bild))
        result.append({
            "id": b.id,
            "email": b.email,
            "telefon": b.telefon,
            "erstellt_am": b.erstellt_am,
            "anzahl": len(bilder),
            "bilder": bilder,
        })
    return result

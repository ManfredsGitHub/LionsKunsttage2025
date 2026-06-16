import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from datetime import datetime
from models import Bild, Kauf, KaufCreate, Verfuegbarkeit, Kuenstler
from database import get_session
from services import email_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kaeufe", tags=["Kasse"])


@router.get("/kaeufer")
def kaeufer_liste(session: Session = Depends(get_session)):
    kaeufe = session.exec(select(Kauf).order_by(Kauf.erstellt_am.desc())).all()
    # Gruppieren nach E-Mail
    gruppen: dict[str, dict] = {}
    for k in kaeufe:
        bild = session.get(Bild, k.bild_id)
        kuenstler = session.get(Kuenstler, bild.kuenstler_id) if bild and bild.kuenstler_id else None
        email = k.kaeufer_email.lower().strip()
        if email not in gruppen:
            gruppen[email] = {
                "email": k.kaeufer_email,
                "titel": k.kaeufer_titel,
                "vorname": k.kaeufer_vorname,
                "name": k.kaeufer_name,
                "strasse": k.kaeufer_strasse,
                "plz": k.kaeufer_plz,
                "ort": k.kaeufer_ort,
                "kaeufe": [],
                "gesamt": 0.0,
            }
        preis = (bild.verkaufspreis if bild else None) or k.snap_verkaufspreis or 0
        gruppen[email]["kaeufe"].append({
            "kauf_id": k.id,
            "datum": k.erstellt_am,
            "bild_nr": (bild.bild_nr if bild else None) or k.snap_bild_nr,
            "bildtitel": (bild.bildtitel if bild else None) or k.snap_bildtitel,
            "kuenstler": (f"{kuenstler.db_vorname} {kuenstler.db_name}".strip() if kuenstler else None) or k.snap_kuenstler,
            "verkaufspreis": preis,
            "bezahlt": k.bezahlt,
            "zahlungsart": k.zahlungsart,
        })
        gruppen[email]["gesamt"] += preis
    return sorted(gruppen.values(), key=lambda x: x["name"].lower())


@router.get("/")
def alle_kaeufe(session: Session = Depends(get_session)):
    kaeufe = session.exec(select(Kauf).order_by(Kauf.erstellt_am.desc())).all()
    result = []
    for k in kaeufe:
        bild = session.get(Bild, k.bild_id)
        kuenstler = session.get(Kuenstler, bild.kuenstler_id) if bild and bild.kuenstler_id else None
        result.append({
            "id": k.id,
            "erstellt_am": k.erstellt_am,
            "bezahlt": k.bezahlt,
            "bezahlt_am": k.bezahlt_am,
            "zahlungsart": k.zahlungsart,
            "kaeufer_titel": k.kaeufer_titel,
            "kaeufer_vorname": k.kaeufer_vorname,
            "kaeufer_name": k.kaeufer_name,
            "kaeufer_email": k.kaeufer_email,
            "kaeufer_strasse": k.kaeufer_strasse,
            "kaeufer_plz": k.kaeufer_plz,
            "kaeufer_ort": k.kaeufer_ort,
            "bild_id": k.bild_id,
            "bild_nr": (bild.bild_nr if bild else None) or k.snap_bild_nr,
            "bildtitel": (bild.bildtitel if bild else None) or k.snap_bildtitel,
            "verkaufspreis": (bild.verkaufspreis if bild else None) or k.snap_verkaufspreis,
            "kuenstler": (f"{kuenstler.db_vorname} {kuenstler.db_name}".strip() if kuenstler else None) or k.snap_kuenstler,
        })
    return result


@router.post("/")
def kauf_erfassen(data: KaufCreate, session: Session = Depends(get_session)):
    bild = session.get(Bild, data.bild_id)
    if not bild:
        raise HTTPException(404, "Bild nicht gefunden")
    if bild.verfuegbarkeit == Verfuegbarkeit.verkauft:
        raise HTTPException(409, "Bild bereits verkauft")

    kauf = Kauf.model_validate(data)
    session.add(kauf)

    bild.verfuegbarkeit = Verfuegbarkeit.verkauft
    session.add(bild)
    session.commit()
    session.refresh(kauf)

    name = f"{data.kaeufer_vorname} {data.kaeufer_name}"
    try:
        email_service.send_kaufbestaetigung(
            data.kaeufer_email, name, bild.bildtitel,
            bild.verkaufspreis or 0, data.zahlungsart.value,
        )
    except Exception as exc:
        logger.warning("E-Mail-Versand fehlgeschlagen: %s", exc)

    return {"id": kauf.id, "status": "verkauft"}


@router.get("/{kauf_id}")
def kauf_detail(kauf_id: int, session: Session = Depends(get_session)):
    kauf = session.get(Kauf, kauf_id)
    if not kauf:
        raise HTTPException(404)
    bild = session.get(Bild, kauf.bild_id)
    kuenstler = session.get(Kuenstler, bild.kuenstler_id) if bild and bild.kuenstler_id else None
    return {
        "id": kauf.id,
        "erstellt_am": kauf.erstellt_am,
        "bezahlt": kauf.bezahlt,
        "bezahlt_am": kauf.bezahlt_am,
        "zahlungsart": kauf.zahlungsart,
        "kaeufer_titel": kauf.kaeufer_titel,
        "kaeufer_vorname": kauf.kaeufer_vorname,
        "kaeufer_name": kauf.kaeufer_name,
        "kaeufer_email": kauf.kaeufer_email,
        "kaeufer_strasse": kauf.kaeufer_strasse,
        "kaeufer_plz": kauf.kaeufer_plz,
        "kaeufer_ort": kauf.kaeufer_ort,
        "bild_id": kauf.bild_id,
        "bild_nr": (bild.bild_nr if bild else None) or kauf.snap_bild_nr,
        "bildtitel": (bild.bildtitel if bild else None) or kauf.snap_bildtitel,
        "bildtechnik": (bild.bildtechnik if bild else None) or kauf.snap_bildtechnik,
        "genre": (bild.genre if bild else None) or kauf.snap_genre,
        "breite_rahmen_cm": (bild.breite_rahmen_cm if bild else None) or kauf.snap_breite_rahmen_cm,
        "hoehe_rahmen_cm": (bild.hoehe_rahmen_cm if bild else None) or kauf.snap_hoehe_rahmen_cm,
        "breite_cm": bild.breite_cm if bild else None,
        "hoehe_cm": bild.hoehe_cm if bild else None,
        "verkaufspreis": (bild.verkaufspreis if bild else None) or kauf.snap_verkaufspreis,
        "kuenstler": (f"{kuenstler.db_vorname} {kuenstler.db_name}".strip() if kuenstler else None) or kauf.snap_kuenstler,
        "kuenstler_beruf": kuenstler.db_beruf if kuenstler else None,
    }


@router.patch("/{kauf_id}/bezahlt")
def als_bezahlt_markieren(kauf_id: int, session: Session = Depends(get_session)):
    kauf = session.get(Kauf, kauf_id)
    if not kauf:
        raise HTTPException(404)
    kauf.bezahlt = True
    kauf.bezahlt_am = datetime.utcnow()
    session.add(kauf)
    session.commit()
    return {"status": "bezahlt"}

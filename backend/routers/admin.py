import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlmodel import Session, select, func
from pydantic import BaseModel
from typing import Optional
import secrets
from datetime import datetime, timedelta
from models import Bild, BildPublic, BildFoto, Kuenstler, KuenstlerCreate, KuenstlerPublic, Reservierung, Kauf, Besucher, MerklisteEintrag, Genre, Verfuegbarkeit, Abrechnungsempfaenger, KuenstlerNachricht, KuenstlerNachrichtGelesen, Platz, PlatzPublic, Raumzuteilung
from database import get_session
from services.import_service import import_csv, import_excel
from services.auth_service import check_passwort, set_passwort
from services.email_service import send_merkliste
from services.image_service import compress_image, save_image
from services.price_service import berechne_verkaufspreis
from services.vita_pdf_service import generate_vita_pdf
from fastapi.responses import Response
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
    freigegeben: bool = True


@router.patch("/bilder/massenfreigabe")
def massenfreigabe(body: MassenfreigabeIn, session: Session = Depends(get_session)):
    bilder = session.exec(select(Bild).where(Bild.id.in_(body.ids))).all()
    for b in bilder:
        b.freigegeben = body.freigegeben
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


# --- Bild löschen ---

@router.delete("/bilder/{bild_id}")
def bild_loeschen(bild_id: int, session: Session = Depends(get_session)):
    bild = session.get(Bild, bild_id)
    if not bild:
        raise HTTPException(404)
    session.delete(bild)
    session.commit()
    return {"status": "gelöscht"}


# --- Bild bearbeiten ---

class BildUpdate(BaseModel):
    bildtitel: Optional[str] = None
    bildtechnik: Optional[str] = None
    genre: Optional[Genre] = None
    breite_rahmen_cm: Optional[float] = None
    hoehe_rahmen_cm: Optional[float] = None
    breite_cm: Optional[float] = None
    hoehe_cm: Optional[float] = None
    tiefe_cm: Optional[float] = None
    gewicht_kg: Optional[float] = None
    einlieferungspreis: Optional[float] = None
    verkaufspreis: Optional[float] = None
    anmerkung_bild: Optional[str] = None
    foto_nr: Optional[str] = None
    in_ausstellung: Optional[bool] = None
    freigegeben: Optional[bool] = None
    abrechnungsempf: Optional[Abrechnungsempfaenger] = None
    galerist_id: Optional[int] = None


@router.patch("/bilder/{bild_id}", response_model=BildPublic)
def bild_aktualisieren(bild_id: int, update: BildUpdate, session: Session = Depends(get_session)):
    bild = session.get(Bild, bild_id)
    if not bild:
        raise HTTPException(404)
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(bild, field, value)
    if update.einlieferungspreis is not None:
        bild.verkaufspreis_vorschlag = berechne_verkaufspreis(update.einlieferungspreis)
    session.add(bild)
    session.commit()
    session.refresh(bild)
    return bild


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


# --- Zusatz-Fotos (max. 3 gesamt) ---

@router.get("/bilder/{bild_id}/fotos")
def get_zusatz_fotos(bild_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(BildFoto).where(BildFoto.bild_id == bild_id).order_by(BildFoto.reihenfolge)
    ).all()


@router.post("/bilder/{bild_id}/fotos")
async def zusatz_foto_hochladen(
    bild_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
):
    bild = session.get(Bild, bild_id)
    if not bild:
        raise HTTPException(404)
    anzahl = session.exec(
        select(func.count(BildFoto.id)).where(BildFoto.bild_id == bild_id)
    ).one()
    belegt = anzahl + (1 if bild.bild_url_web else 0)
    if belegt >= 3:
        raise HTTPException(400, "Maximal 3 Fotos pro Bild erlaubt")

    data = await file.read()
    web_bytes, _ = compress_image(data, file.filename)
    reihenfolge = anzahl + 1
    filename = f"{bild.bild_nr}_{reihenfolge + 1}"
    web_path = os.path.join(UPLOAD_DIR, "web", f"{filename}.jpg")
    os.makedirs(os.path.dirname(web_path), exist_ok=True)
    with open(web_path, "wb") as f:
        f.write(web_bytes)
    url = f"/uploads/web/{filename}.jpg"
    foto = BildFoto(bild_id=bild_id, url=url, reihenfolge=reihenfolge)
    session.add(foto)
    session.commit()
    session.refresh(foto)
    return foto


@router.delete("/bilder/{bild_id}/fotos/{foto_id}")
def zusatz_foto_loeschen(bild_id: int, foto_id: int, session: Session = Depends(get_session)):
    foto = session.get(BildFoto, foto_id)
    if not foto or foto.bild_id != bild_id:
        raise HTTPException(404)
    path = "." + foto.url
    if os.path.exists(path):
        os.remove(path)
    session.delete(foto)
    session.commit()
    return {"status": "gelöscht"}


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
def alle_kuenstler(mit_inaktiven: bool = False, session: Session = Depends(get_session)):
    q = select(Kuenstler).order_by(Kuenstler.db_name)
    if not mit_inaktiven:
        q = q.where(Kuenstler.aktiv == True)
    return session.exec(q).all()


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
    abrechnungsempf: Optional[Abrechnungsempfaenger] = None
    galerist_id: Optional[int] = None


@router.post("/bilder/neu", response_model=BildPublic)
def bild_neu(data: BildNeuData, session: Session = Depends(get_session)):
    kuenstler = session.get(Kuenstler, data.kuenstler_id)
    if not kuenstler:
        raise HTTPException(404, "Künstler nicht gefunden")
    year = datetime.now().year % 100
    if kuenstler.kuenstler_nr:
        prefix = f"{year:02d}{kuenstler.kuenstler_nr:>03s}"
        count = session.exec(select(func.count(Bild.id)).where(Bild.bild_nr.like(f"{prefix}%"))).one()
        nn = count + 1
        bild_nr = f"{prefix}{nn:02d}"
        while session.exec(select(Bild).where(Bild.bild_nr == bild_nr)).first():
            nn += 1
            bild_nr = f"{prefix}{nn:02d}"
    else:
        # Fallback wenn noch keine Künstlernummer vergeben: JJVORXXXX
        count = session.exec(select(func.count(Bild.id))).one()
        bild_nr = f"{year:02d}VOR{count+1:04d}"
        while session.exec(select(Bild).where(Bild.bild_nr == bild_nr)).first():
            count += 1
            bild_nr = f"{year:02d}VOR{count:04d}"
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
    bilder = session.exec(select(Bild).order_by(Bild.bild_nr)).all()
    result = []
    for b in bilder:
        data = BildPublic.model_validate(b)
        if b.galerist_id:
            data.galerist = session.get(Kuenstler, b.galerist_id)
        result.append(data)
    return result


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
        aktiv=True,
    )
    session.add(k)
    session.commit()
    session.refresh(k)
    return {"id": k.id, "db_ident": k.db_ident}


@router.get("/kuenstler/{kuenstler_id}", response_model=KuenstlerPublic)
def kuenstler_detail(kuenstler_id: int, session: Session = Depends(get_session)):
    k = session.get(Kuenstler, kuenstler_id)
    if not k:
        raise HTTPException(404)
    return k


@router.patch("/kuenstler/{kuenstler_id}", response_model=KuenstlerPublic)
def kuenstler_aktualisieren(kuenstler_id: int, daten: dict = Body(...), session: Session = Depends(get_session)):
    k = session.get(Kuenstler, kuenstler_id)
    if not k:
        raise HTTPException(404)
    felder = ["db_name","db_vorname","db_email","db_telefon","db_adresse","db_plz","db_ort",
              "db_beruf","db_leben","db_lebenstext","db_kommentar","db_inspiration","db_ausstellungen",
              "db_instagram","db_facebook","db_webseite","aktiv","vor_ort_anwesend","kuenstler_nr",
              "abrechnungsempf","galerist_id","ist_galerist","kuenstlertyp"]
    for f in felder:
        if f in daten:
            setattr(k, f, daten[f])
    session.add(k)
    session.commit()
    session.refresh(k)
    return k


@router.delete("/kuenstler/{kuenstler_id}")
def kuenstler_loeschen(kuenstler_id: int, session: Session = Depends(get_session)):
    k = session.get(Kuenstler, kuenstler_id)
    if not k:
        raise HTTPException(404)
    bilder = session.exec(select(Bild).where(Bild.kuenstler_id == kuenstler_id)).all()
    if bilder:
        raise HTTPException(400, detail=f"Künstler hat {len(bilder)} Bild(er) — bitte zuerst alle Bilder löschen.")
    session.delete(k)
    session.commit()
    return {"status": "gelöscht"}


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


@router.get("/kuenstler/{kuenstler_id}/vita-pdf")
def vita_pdf(kuenstler_id: int, session: Session = Depends(get_session)):
    k = session.get(Kuenstler, kuenstler_id)
    if not k:
        raise HTTPException(404)
    bilder = session.exec(
        select(Bild).where(Bild.kuenstler_id == kuenstler_id, Bild.in_ausstellung == True)
        .order_by(Bild.bild_nr)
    ).all()
    pdf = generate_vita_pdf(k, bilder, UPLOAD_DIR)
    name = f"vita_{k.db_name}_{k.db_vorname or ''}".replace(" ", "_")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{name}.pdf"'},
    )


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


@router.post("/merklisten/{besucher_id}/zusenden")
def merkliste_an_besucher_senden(besucher_id: int, session: Session = Depends(get_session)):
    besucher = session.get(Besucher, besucher_id)
    if not besucher:
        raise HTTPException(404, "Besucher nicht gefunden")
    if not besucher.email:
        raise HTTPException(400, "Keine E-Mail-Adresse hinterlegt")
    eintraege = session.exec(
        select(MerklisteEintrag)
        .where(MerklisteEintrag.besucher_id == besucher_id)
        .order_by(MerklisteEintrag.hinzugefuegt_am)
    ).all()
    if not eintraege:
        raise HTTPException(400, "Merkliste ist leer")
    bilder = []
    for e in eintraege:
        bild = session.get(Bild, e.bild_id)
        if bild:
            _ = bild.kuenstler
            bilder.append(bild)
    send_merkliste(besucher.email, bilder)
    return {"status": "gesendet", "email": besucher.email}


class NachfassData(BaseModel):
    betreff: str
    text: str


@router.post("/merklisten/nachfassen")
def merklisten_nachfassen(data: NachfassData, session: Session = Depends(get_session)):
    alle_besucher = session.exec(
        select(Besucher).where(Besucher.email != None, Besucher.email_abgemeldet == False)
    ).all()
    empfaenger = []
    for b in alle_besucher:
        hat_eintraege = session.exec(
            select(MerklisteEintrag).where(MerklisteEintrag.besucher_id == b.id)
        ).first()
        if hat_eintraege:
            empfaenger.append((b.email, b.token))
    if not empfaenger:
        raise HTTPException(400, "Keine Empfänger mit Merkliste gefunden")
    from services.email_service import send_nachfass
    send_nachfass(data.betreff, data.text, empfaenger)
    return {"status": "gesendet", "anzahl": len(empfaenger)}


# --- Besucher-Newsletter ---

@router.post("/newsletter/besucher")
def besucher_newsletter(data: NachfassData, session: Session = Depends(get_session)):
    alle = session.exec(
        select(Besucher).where(Besucher.email != None, Besucher.email_abgemeldet == False)
    ).all()
    empfaenger = [(b.email, b.token) for b in alle if b.email]
    if not empfaenger:
        raise HTTPException(400, "Keine Besucher mit E-Mail gefunden")
    from services.email_service import send_nachfass
    send_nachfass(data.betreff, data.text, empfaenger)
    return {"status": "gesendet", "anzahl": len(empfaenger)}


# --- Künstler-Nachrichten ---

class NachrichtData(BaseModel):
    betreff: str
    text: str


@router.post("/nachrichten")
def nachricht_senden(data: NachrichtData, session: Session = Depends(get_session)):
    nachricht = KuenstlerNachricht(betreff=data.betreff, text=data.text)
    session.add(nachricht)
    session.commit()
    session.refresh(nachricht)
    kuenstler_liste = session.exec(
        select(Kuenstler).where(
            Kuenstler.vor_ort_anwesend == True,
            Kuenstler.aktiv == True,
            Kuenstler.db_email != None,
        )
    ).all()
    empfaenger = [(k.db_email, None) for k in kuenstler_liste if k.db_email]
    if empfaenger:
        from services.email_service import send_nachfass
        send_nachfass(data.betreff, data.text, empfaenger)
    return {"id": nachricht.id, "anzahl": len(empfaenger)}


@router.get("/nachrichten")
def alle_nachrichten(session: Session = Depends(get_session)):
    nachrichten = session.exec(
        select(KuenstlerNachricht).order_by(KuenstlerNachricht.erstellt_am.desc())
    ).all()
    gesamt_empfaenger = session.exec(
        select(func.count(Kuenstler.id)).where(
            Kuenstler.vor_ort_anwesend == True,
            Kuenstler.aktiv == True,
            Kuenstler.db_email != None,
        )
    ).one()
    result = []
    for n in nachrichten:
        gelesen = session.exec(
            select(func.count(KuenstlerNachrichtGelesen.id))
            .where(KuenstlerNachrichtGelesen.nachricht_id == n.id)
        ).one()
        result.append({
            "id": n.id,
            "betreff": n.betreff,
            "text": n.text,
            "erstellt_am": n.erstellt_am,
            "gelesen": gelesen,
            "gesamt": gesamt_empfaenger,
        })
    return result


@router.get("/nachrichten/{nachricht_id}/ungelesen")
def nachricht_ungelesen(nachricht_id: int, session: Session = Depends(get_session)):
    nachricht = session.get(KuenstlerNachricht, nachricht_id)
    if not nachricht:
        raise HTTPException(404, "Nachricht nicht gefunden")
    gelesen_ids = session.exec(
        select(KuenstlerNachrichtGelesen.kuenstler_id)
        .where(KuenstlerNachrichtGelesen.nachricht_id == nachricht_id)
    ).all()
    kuenstler_liste = session.exec(
        select(Kuenstler).where(
            Kuenstler.vor_ort_anwesend == True,
            Kuenstler.aktiv == True,
            Kuenstler.db_email != None,
            Kuenstler.id.not_in(gelesen_ids) if gelesen_ids else True,
        )
    ).all()
    return [{"id": k.id, "name": f"{k.db_vorname} {k.db_name}", "email": k.db_email} for k in kuenstler_liste]


# --- KI-Beschreibung ---

@router.post("/bilder/{bild_id}/ai-beschreibung")
async def ai_beschreibung_generieren(bild_id: int, session: Session = Depends(get_session)):
    import anthropic
    import base64
    import mimetypes

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(503, "ANTHROPIC_API_KEY nicht konfiguriert")

    bild = session.get(Bild, bild_id)
    if not bild:
        raise HTTPException(404, "Bild nicht gefunden")

    kuenstler = session.get(Kuenstler, bild.kuenstler_id) if bild.kuenstler_id else None
    kuenstler_name = f"{kuenstler.db_vorname} {kuenstler.db_name}".strip() if kuenstler else "Unbekannt"

    abmasse = (
        f"{bild.breite_rahmen_cm} × {bild.hoehe_rahmen_cm} cm"
        if bild.breite_rahmen_cm and bild.hoehe_rahmen_cm else "nicht angegeben"
    )
    kuenstler_aussage = kuenstler.db_kommentar if kuenstler else None

    prompt = f"""Du bist ein erfahrener Kunstkritiker und Marketing-Texter für eine Benefiz-Kunstausstellung.

Schreibe eine kurze, einladende Beschreibung (2–3 Sätze) für folgendes Kunstwerk, die auf der Ausstellungswebsite veröffentlicht wird. Der Text soll neugierig machen und zum Kauf animieren.

Kunstwerk:
- Titel: {bild.bildtitel}
- Künstler: {kuenstler_name}
- Technik: {bild.bildtechnik}
- Genre: {bild.genre}
- Maße: {abmasse}
{f"- Aussage des Künstlers: {kuenstler_aussage}" if kuenstler_aussage else ""}

Gib nur den fertigen Beschreibungstext aus, ohne Überschrift, Einleitung oder Erklärungen. Sprache: Deutsch."""

    content: list = []

    # Alle verfügbaren Fotos hinzufügen (Hauptfoto + Zusatzfotos, max. 3)
    foto_urls = []
    if bild.bild_url_web:
        foto_urls.append(bild.bild_url_web)
    zusatz = session.exec(select(BildFoto).where(BildFoto.bild_id == bild_id).order_by(BildFoto.reihenfolge)).all()
    for z in zusatz:
        foto_urls.append(z.url)

    for foto_url in foto_urls[:3]:
        img_path = "." + foto_url
        if os.path.exists(img_path):
            with open(img_path, "rb") as f:
                img_data = base64.standard_b64encode(f.read()).decode("utf-8")
            mime = mimetypes.guess_type(img_path)[0] or "image/jpeg"
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": mime, "data": img_data},
            })

    content.append({"type": "text", "text": prompt})

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=400,
        messages=[{"role": "user", "content": content}],
    )

    return {"beschreibung": response.content[0].text.strip()}


# ── Passwort ändern ───────────────────────────────────────────────────────────

class PasswortAendernData(BaseModel):
    rolle: str
    altes_passwort: str
    neues_passwort: str


@router.patch("/passwort")
def passwort_aendern(data: PasswortAendernData):
    if data.rolle not in ("admin", "orga"):
        raise HTTPException(status_code=400, detail="Unbekannte Rolle")
    if not check_passwort(data.rolle, data.altes_passwort):
        raise HTTPException(status_code=401, detail="Altes Passwort falsch")
    if len(data.neues_passwort) < 8:
        raise HTTPException(status_code=400, detail="Passwort zu kurz (mind. 8 Zeichen)")
    set_passwort(data.rolle, data.neues_passwort)
    return {"ok": True}


# --- Platzplan ---

@router.get("/plaetze", response_model=list[PlatzPublic])
def alle_plaetze(session: Session = Depends(get_session)):
    plaetze = session.exec(select(Platz).order_by(Platz.position_nr)).all()
    result = []
    for p in plaetze:
        item = PlatzPublic.model_validate(p)
        if p.kuenstler_id:
            k = session.get(Kuenstler, p.kuenstler_id)
            if k:
                item.kuenstler = KuenstlerPublic.model_validate(k)
        result.append(item)
    return result


class PlatzZuweisungIn(BaseModel):
    kuenstler_id: Optional[int] = None


@router.patch("/plaetze/{platz_id}", response_model=PlatzPublic)
def platz_zuweisen(
    platz_id: int,
    body: PlatzZuweisungIn,
    session: Session = Depends(get_session),
):
    platz = session.get(Platz, platz_id)
    if not platz:
        raise HTTPException(status_code=404, detail="Platz nicht gefunden")
    if body.kuenstler_id is not None:
        k = session.get(Kuenstler, body.kuenstler_id)
        if not k:
            raise HTTPException(status_code=404, detail="Künstler nicht gefunden")
    platz.kuenstler_id = body.kuenstler_id
    session.add(platz)
    session.commit()
    session.refresh(platz)
    item = PlatzPublic.model_validate(platz)
    if platz.kuenstler_id:
        k = session.get(Kuenstler, platz.kuenstler_id)
        if k:
            item.kuenstler = KuenstlerPublic.model_validate(k)
    return item


# --- Raumplan ---

class RaumzuteilungIn(BaseModel):
    belegt_durch: Optional[str] = None


@router.get("/raumplan", response_model=list[Raumzuteilung])
def get_raumplan(session: Session = Depends(get_session)):
    return session.exec(select(Raumzuteilung).order_by(Raumzuteilung.id)).all()


@router.patch("/raumplan/{raum_nr}", response_model=Raumzuteilung)
def raum_zuweisen(raum_nr: str, body: RaumzuteilungIn, session: Session = Depends(get_session)):
    raum = session.exec(select(Raumzuteilung).where(Raumzuteilung.raum_nr == raum_nr)).first()
    if not raum:
        raise HTTPException(status_code=404, detail="Raum nicht gefunden")
    raum.belegt_durch = body.belegt_durch or None
    session.add(raum)
    session.commit()
    session.refresh(raum)
    return raum

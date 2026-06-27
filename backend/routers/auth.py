from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import Nutzer, AuthToken
from services.auth_service import (
    verify_password, hash_password, validate_password_strength,
    create_token, verify_token, generate_raw_token, hash_token, TOKEN_STUNDEN,
)
from services.email_service import send_passwort_reset, send_konto_einrichten

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    passwort: str


@router.post("/login")
def login(req: LoginRequest, session: Session = Depends(get_session)):
    nutzer = session.exec(
        select(Nutzer).where(Nutzer.email == req.email.lower().strip())
    ).first()
    if not nutzer or not verify_password(req.passwort, nutzer.password_hash):
        raise HTTPException(status_code=401, detail="E-Mail oder Passwort falsch")
    if not nutzer.aktiv:
        raise HTTPException(status_code=403, detail="Konto deaktiviert")

    nutzer.letzter_login = datetime.utcnow()
    session.add(nutzer)
    session.commit()

    stunden = TOKEN_STUNDEN.get(nutzer.rolle, 12)
    token = create_token(nutzer.id, nutzer.email, nutzer.rolle, stunden)
    return {
        "token": token,
        "rolle": nutzer.rolle,
        "email": nutzer.email,
        "nutzer_id": nutzer.id,
        "kuenstler_id": nutzer.kuenstler_id,
        "stunden": stunden,
    }


# ── Passwort-Reset (Self-Service) ─────────────────────────────────────────────

class ResetRequestBody(BaseModel):
    email: str


@router.post("/reset-request")
def reset_request(body: ResetRequestBody, session: Session = Depends(get_session)):
    nutzer = session.exec(
        select(Nutzer).where(Nutzer.email == body.email.lower().strip())
    ).first()
    # Immer 200 zurückgeben (kein E-Mail-Enumeration-Leak)
    if not nutzer or not nutzer.aktiv:
        return {"ok": True}

    raw = generate_raw_token()
    token_entry = AuthToken(
        nutzer_id=nutzer.id,
        token_hash=hash_token(raw),
        zweck="reset",
        expires_at=datetime.utcnow() + timedelta(hours=2),
    )
    session.add(token_entry)
    session.commit()

    try:
        send_passwort_reset(nutzer.email, raw)
    except Exception:
        pass  # Nicht nach außen leaken, ob E-Mail funktioniert

    return {"ok": True}


class ResetConfirmBody(BaseModel):
    token: str
    neues_passwort: str


@router.post("/reset-confirm")
def reset_confirm(body: ResetConfirmBody, session: Session = Depends(get_session)):
    token_hash = hash_token(body.token)
    entry = session.exec(
        select(AuthToken).where(
            AuthToken.token_hash == token_hash,
            AuthToken.zweck == "reset",
            AuthToken.used == False,
        )
    ).first()
    if not entry or entry.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Token ungültig oder abgelaufen")

    errors = validate_password_strength(body.neues_passwort)
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    nutzer = session.get(Nutzer, entry.nutzer_id)
    if not nutzer or not nutzer.aktiv:
        raise HTTPException(status_code=400, detail="Konto nicht gefunden")

    nutzer.password_hash = hash_password(body.neues_passwort)
    entry.used = True
    session.add(nutzer)
    session.add(entry)
    session.commit()
    return {"ok": True}


# ── Konto-Einrichtung (nach Einladung) ───────────────────────────────────────

@router.get("/setup/verify")
def setup_verify(token: str, session: Session = Depends(get_session)):
    token_hash = hash_token(token)
    entry = session.exec(
        select(AuthToken).where(
            AuthToken.token_hash == token_hash,
            AuthToken.zweck == "setup",
            AuthToken.used == False,
        )
    ).first()
    if not entry or entry.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Einladungslink ungültig oder abgelaufen")

    nutzer = session.get(Nutzer, entry.nutzer_id)
    if not nutzer:
        raise HTTPException(status_code=400, detail="Konto nicht gefunden")

    return {"email": nutzer.email, "rolle": nutzer.rolle}


class SetupConfirmBody(BaseModel):
    token: str
    neues_passwort: str


class PasswortAendernBody(BaseModel):
    altes_passwort: str
    neues_passwort: str


@router.post("/change-password")
def change_password(body: PasswortAendernBody, request: Request, session: Session = Depends(get_session)):
    auth = request.headers.get("Authorization", "")
    token_str = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""
    payload = verify_token(token_str)
    if not payload:
        raise HTTPException(status_code=401, detail="Nicht angemeldet")

    nutzer = session.get(Nutzer, int(payload["sub"]))
    if not nutzer or not nutzer.aktiv:
        raise HTTPException(status_code=401, detail="Konto nicht gefunden")

    if not verify_password(body.altes_passwort, nutzer.password_hash):
        raise HTTPException(status_code=401, detail="Aktuelles Passwort falsch")

    errors = validate_password_strength(body.neues_passwort)
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    nutzer.password_hash = hash_password(body.neues_passwort)
    session.add(nutzer)
    session.commit()
    return {"ok": True}


@router.post("/setup-confirm")
def setup_confirm(body: SetupConfirmBody, session: Session = Depends(get_session)):
    token_hash = hash_token(body.token)
    entry = session.exec(
        select(AuthToken).where(
            AuthToken.token_hash == token_hash,
            AuthToken.zweck == "setup",
            AuthToken.used == False,
        )
    ).first()
    if not entry or entry.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Einladungslink ungültig oder abgelaufen")

    errors = validate_password_strength(body.neues_passwort)
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    nutzer = session.get(Nutzer, entry.nutzer_id)
    if not nutzer:
        raise HTTPException(status_code=400, detail="Konto nicht gefunden")

    nutzer.password_hash = hash_password(body.neues_passwort)
    nutzer.aktiv = True
    entry.used = True
    session.add(nutzer)
    session.add(entry)
    session.commit()

    stunden = TOKEN_STUNDEN.get(nutzer.rolle, 12)
    jwt_token = create_token(nutzer.id, nutzer.email, nutzer.rolle, stunden)
    return {
        "token": jwt_token,
        "rolle": nutzer.rolle,
        "email": nutzer.email,
        "nutzer_id": nutzer.id,
        "kuenstler_id": nutzer.kuenstler_id,
        "stunden": stunden,
    }

import os
import hashlib
import secrets
import bcrypt as _bcrypt
from jose import jwt, JWTError
from datetime import datetime, timedelta

SECRET = os.getenv("JWT_SECRET", "dev-secret-bitte-aendern")
ALGORITHM = "HS256"

# Gebräuchliche Trivial-Passwörter ablehnen
_BLOCKLIST = {
    "password", "passwort", "12345678", "123456789", "1234567890",
    "qwertzui", "qwerty123", "kunsttage", "lions2026", "lions2025",
    "admin123", "orga2026", "kasse123",
}


# ── Hashing ──────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


# ── Passwort-Stärke ──────────────────────────────────────────────────────────

def validate_password_strength(pw: str) -> list[str]:
    """Gibt eine Liste von Fehlermeldungen zurück (leer = OK)."""
    errors: list[str] = []
    if len(pw) < 10:
        errors.append("Mindestens 10 Zeichen erforderlich")
    if not any(c.isupper() for c in pw):
        errors.append("Mindestens ein Großbuchstabe erforderlich")
    if not any(c.isdigit() for c in pw):
        errors.append("Mindestens eine Ziffer erforderlich")
    if not any(c in "!@#$%^&*()_+-=[]{}|;':\",./<>?" for c in pw):
        errors.append("Mindestens ein Sonderzeichen erforderlich")
    if pw.lower() in _BLOCKLIST:
        errors.append("Dieses Passwort ist zu einfach")
    return errors


# ── JWT ──────────────────────────────────────────────────────────────────────

def create_token(nutzer_id: int, email: str, rolle: str, stunden: int = 12) -> str:
    payload = {
        "sub": str(nutzer_id),
        "email": email,
        "rolle": rolle,
        "exp": datetime.utcnow() + timedelta(hours=stunden),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None


# ── Setup- / Reset-Tokens ────────────────────────────────────────────────────

def generate_raw_token() -> str:
    """Erzeugt einen kryptografisch sicheren URL-Token (64 Zeichen)."""
    return secrets.token_urlsafe(48)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


# ── Stunden-Konfiguration je Rolle ───────────────────────────────────────────

TOKEN_STUNDEN: dict[str, int] = {
    "admin": 24,
    "orga": 12,
    "kasse": 12,
    "kuenstler": 48,
}

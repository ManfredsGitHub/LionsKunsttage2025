import os
from jose import jwt, JWTError
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import set_key

SECRET = os.getenv("JWT_SECRET", "dev-secret-bitte-aendern")
ALGORITHM = "HS256"

_ADMIN_PW = os.getenv("ADMIN_PASSWORT", "")
_ORGA_PW = os.getenv("ORGA_PASSWORT", "")

_ENV_PATH = Path(__file__).parent.parent / ".env"


def create_token(rolle: str, stunden: int = 12) -> str:
    payload = {
        "rolle": rolle,
        "exp": datetime.utcnow() + timedelta(hours=stunden),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)


def verify_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return None


def check_passwort(rolle: str, passwort: str) -> bool:
    if rolle == "admin":
        return bool(_ADMIN_PW) and passwort == _ADMIN_PW
    if rolle == "orga":
        return bool(_ORGA_PW) and passwort == _ORGA_PW
    return False


def set_passwort(rolle: str, neues_passwort: str) -> None:
    global _ADMIN_PW, _ORGA_PW
    if rolle == "admin":
        _ADMIN_PW = neues_passwort
        env_key = "ADMIN_PASSWORT"
    elif rolle == "orga":
        _ORGA_PW = neues_passwort
        env_key = "ORGA_PASSWORT"
    else:
        return
    os.environ[env_key] = neues_passwort
    if _ENV_PATH.exists():
        set_key(str(_ENV_PATH), env_key, neues_passwort)

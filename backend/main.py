from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os
import re

load_dotenv()

from database import create_db
from routers import artworks, reservations, sales, artists, admin, merkliste, archive, export, auth as auth_router, einstellungen, kaufanfragen
from routers import admin_bilder, admin_kuenstler, admin_kommunikation, admin_nutzer
from services.auth_service import verify_token


@asynccontextmanager
async def lifespan(app: FastAPI):
    secret = os.getenv("JWT_SECRET", "dev-secret-bitte-aendern")
    if secret == "dev-secret-bitte-aendern":
        import sys
        env = os.getenv("ENVIRONMENT", "development")
        if env == "production":
            sys.exit("FATAL: JWT_SECRET muss in .env gesetzt werden!")
        else:
            print("WARNUNG: JWT_SECRET auf Default-Wert — nur für lokale Entwicklung akzeptabel!")
    create_db()
    yield


app = FastAPI(title="Kunsttage auf der Ludwigshöhe API", version="1.0.0", lifespan=lifespan)

app.include_router(artworks.router)
app.include_router(reservations.router)
app.include_router(sales.router)
app.include_router(artists.router)
app.include_router(admin.router)
app.include_router(merkliste.router)
app.include_router(archive.router)
app.include_router(export.router)
app.include_router(auth_router.router)
app.include_router(einstellungen.router)
app.include_router(kaufanfragen.router)
app.include_router(admin_bilder.router)
app.include_router(admin_kuenstler.router)
app.include_router(admin_kommunikation.router)
app.include_router(admin_nutzer.router)

# ── Auth-Middleware ───────────────────────────────────────────────────────────
# Pfade, die ohne JWT erreichbar sind
_OPEN_PREFIXES = ("/bilder", "/uploads", "/reservierungen",
                  "/merkliste", "/docs", "/openapi.json", "/redoc",
                  "/einstellungen")

# Auth-Endpoints, die ohne Token aufrufbar sind (Login, Reset, Setup)
_OPEN_EXACT = {
    "/auth/login",
    "/auth/reset-request",
    "/auth/reset-confirm",
    "/auth/setup-confirm",
}
_OPEN_EXACT_PREFIX = "/auth/setup"  # GET /auth/setup/verify

# Öffentliche Künstler-Endpunkte (kein Token nötig)
_KUENSTLER_OPEN = {
    "/kuenstler/login-link-anfordern",
    "/kuenstler/bewerben",
    "/kuenstler/login/verify",
}


def _is_open(path: str, method: str = "GET") -> bool:
    if path == "/":
        return True
    if path in _OPEN_EXACT or path in _KUENSTLER_OPEN:
        return True
    if path.startswith(_OPEN_EXACT_PREFIX):
        return True
    # Öffentliche Künstler-Liste und Einzelprofil (nur GET, ohne Unterpfad)
    if method == "GET" and re.match(r"^/kuenstler/?\d*/?$", path):
        return True
    return any(
        path == p or path.startswith(p + "/") or path.startswith(p + "?")
        for p in _OPEN_PREFIXES
    )


def _orga_erlaubt(method: str, path: str) -> bool:
    """Orga: Kasse + Bildverwaltung (lesen + schreiben) + Künstler (lesen + schreiben)."""
    if path.startswith("/kaeufe"):
        return True
    if path.startswith("/admin/bilder"):
        return True
    if path.startswith("/admin/kuenstler"):
        return True
    if path.startswith("/admin/plaetze"):
        return True
    return False


def _kasse_erlaubt(method: str, path: str) -> bool:
    """Kasse: nur Kasse-Endpoints."""
    return path.startswith("/kaeufe")


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    method = request.method

    # POST /kaufanfragen/ ist öffentlich (Besucher reichen Kaufanfrage ein)
    if method == "POST" and path == "/kaufanfragen/":
        return await call_next(request)

    if method == "OPTIONS" or _is_open(path, method):
        return await call_next(request)

    # Künstler-Portal: X-Kuenstler-Token im Header → Endpunkt validiert selbst
    if path.startswith("/kuenstler/") and request.headers.get("X-Kuenstler-Token"):
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    token_str = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""

    # Fallback: Token als Query-Parameter für Browser-Downloads (Safari)
    if not token_str:
        token_str = request.query_params.get("token", "")

    if not token_str:
        return JSONResponse({"detail": "Nicht angemeldet"}, status_code=401)

    payload = verify_token(token_str)
    if not payload:
        return JSONResponse({"detail": "Token ungültig oder abgelaufen"}, status_code=401)

    rolle = payload.get("rolle", "")

    if rolle == "admin":
        return await call_next(request)

    # Alle eingeloggten Nutzer dürfen ihr eigenes Passwort ändern
    if path == "/auth/change-password":
        return await call_next(request)

    if rolle == "orga" and _orga_erlaubt(method, path):
        return await call_next(request)

    if rolle == "kasse" and _kasse_erlaubt(method, path):
        return await call_next(request)

    return JSONResponse({"detail": "Kein Zugriff"}, status_code=403)


# CORS muss nach der Auth-Middleware registriert werden, damit es auch
# 401/403-Antworten mit Access-Control-Allow-Origin versieht (Starlette:
# zuletzt registriert = außerste Schicht).
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")



@app.get("/")
def root():
    return {"status": "Kunsttage auf der Ludwigshöhe API läuft"}

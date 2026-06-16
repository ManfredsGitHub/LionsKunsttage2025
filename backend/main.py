from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

load_dotenv()

from database import create_db
from routers import artworks, reservations, sales, artists, admin, merkliste, archive, export, auth as auth_router, einstellungen
from services.auth_service import verify_token

app = FastAPI(title="Kunsttage auf der Ludwigshöhe API", version="1.0.0")

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

# ── Auth-Middleware ───────────────────────────────────────────────────────────
# Pfade, die ohne JWT erreichbar sind
_OPEN = ("/bilder", "/uploads", "/reservierungen", "/kuenstler",
         "/merkliste", "/auth", "/docs", "/openapi.json", "/redoc", "/",
         "/einstellungen")


def _is_open(path: str) -> bool:
    return any(
        path == p or path.startswith(p + "/") or path.startswith(p + "?")
        for p in _OPEN
    )


def _orga_erlaubt(method: str, path: str) -> bool:
    """Orga darf: alle /kaeufe-Endpoints + GET /admin/bilder* (für Aufsteller)."""
    if path.startswith("/kaeufe"):
        return True
    if path.startswith("/admin/bilder") and method == "GET":
        return True
    return False


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    method = request.method

    if method == "OPTIONS" or _is_open(path):
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    token_str = auth.removeprefix("Bearer ").strip() if auth.startswith("Bearer ") else ""

    if not token_str:
        return JSONResponse({"detail": "Nicht angemeldet"}, status_code=401)

    payload = verify_token(token_str)
    if not payload:
        return JSONResponse({"detail": "Token ungültig oder abgelaufen"}, status_code=401)

    rolle = payload.get("rolle", "")

    if rolle == "admin":
        return await call_next(request)

    if rolle == "orga" and _orga_erlaubt(method, path):
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


@app.on_event("startup")
def on_startup():
    create_db()


@app.get("/")
def root():
    return {"status": "Kunsttage auf der Ludwigshöhe API läuft"}

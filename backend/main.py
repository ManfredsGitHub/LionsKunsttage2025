from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os

load_dotenv()

from database import create_db
from routers import artworks, reservations, sales, artists, admin, merkliste

app = FastAPI(title="Kunsttage auf der Ludwigshöhe API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(artworks.router)
app.include_router(reservations.router)
app.include_router(sales.router)
app.include_router(artists.router)
app.include_router(admin.router)
app.include_router(merkliste.router)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
def on_startup():
    create_db()


@app.get("/")
def root():
    return {"status": "Kunsttage auf der Ludwigshöhe API läuft"}

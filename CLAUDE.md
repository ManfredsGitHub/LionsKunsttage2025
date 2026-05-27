# Lions Kunsttage 2026

Jahreliche Benefizveranstaltung der Lions Villa Ludwigshöhe — digitales Kunstkatalog- und Verwaltungssystem.

## Stack
- **Backend**: FastAPI + SQLModel + SQLite (`/backend`)
- **Frontend**: Next.js (`/frontend`)
- **Python**: 3.11+

## Server starten

**Backend** (Terminal 1):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # SMTP-Zugangsdaten eintragen
uvicorn main:app --reload
```
API: http://localhost:8000 · Docs: http://localhost:8000/docs

**Frontend** (Terminal 2):
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:3000

**Testdaten anlegen** (einmalig, nach Backend-Start):
```bash
cd backend && source .venv/bin/activate
python seed.py
```
Legt 3 Künstler und 10 freigegebene Bilder an (idempotent).

## Ports & URLs
| Dienst | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API-Docs (Swagger) | http://localhost:8000/docs |
| Admin-Dashboard | http://localhost:3000/admin |
| Bilder-Uploads | http://localhost:8000/uploads/ |

## Kernlogik
- Preisformel: `AUFRUNDEN(Einlieferungspreis × 1,80 ; 10)` → `services/price_service.py`
- Bildkomprimierung: max. 1500px / 500KB → `services/image_service.py`
- CSV/Excel-Import für Galerie-Künstler (~900) → `services/import_service.py`
- E-Mail-Link-Login für Künstler (48h Token) → `routers/artists.py`

## Rollen
| Rolle | Zugang |
|-------|--------|
| Admin | Alle Endpoints unter `/admin/` |
| Künstler | Login per Token-Link, nur eigene Daten |
| Besucher | Nur freigegebene Bilder, Reservierung |
| Käufer (vor Ort) | Kasse via `/kaeufe/` |

## Datenmodell
Siehe `backend/models.py` — Kernentitäten: `Kuenstler`, `Bild`, `Reservierung`, `Kauf`

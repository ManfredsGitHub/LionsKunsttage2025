# Kunsttage auf der Ludwigshöhe 2026

Jährliche Benefizveranstaltung des Lions Club Villa Ludwigshöhe — digitales Kunstkatalog- und Verwaltungssystem.

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

---

## Fertige Features (Stand 2026-06)

- **Bildverwaltung** mit Status-Filter (Verfügbar / Reserviert / Verkauft) · `admin/bilder`
- **CSV-Import** inkl. optionaler Felder: hoehe_cm, breite_cm, tiefe_cm, gewicht_kg, anmerkung_bild · `admin/import`
- **Vor-Ort-Kasse** mit Käufererfassung · `admin/kasse`
- **Kaufübersicht** mit Bezahlt-Toggle und Quittungsdruck · `admin/kaufuebersicht`
- **Käuferverwaltung** gruppiert nach E-Mail, aufklappbare Kaufhistorie · `admin/kaeufer`
- **Archivierung**: Nummernkreis → CSV + Bilder verschieben, aus DB löschen · `admin/archiv`
- **Rück-Import**: Archiv-CSV + Bilder zurück in die DB laden
- **Bildaufsteller** (druckfertige Schilder) · `admin/bilder/aufsteller`
- **Merkliste** für Besucher
- **Künstler-Portal** (Login per Token-Link)
- **Kommunikation / Newsletter**

## Wichtige Konventionen

### Bild-Nr. Format
- **Intern (DB)**: 7-stellig ohne Punkte, z. B. `2540001`
- **Anzeige**: `JJ.KKK.NN`, z. B. `25.400.01`
- Umwandlung: `formatBildNr()` aus `frontend/lib/utils.ts`
- Suche funktioniert mit beiden Formaten (raw in DB, formatiert in Anzeige)

### Snapshot-Felder im Kauf-Modell
Beim Archivieren werden Bilddaten in `snap_*`-Felder des Kauf-Eintrags kopiert,
damit Quittungen und Kaufübersicht auch nach der Archivierung vollständig bleiben:
```
snap_bild_nr, snap_bildtitel, snap_kuenstler, snap_bildtechnik,
snap_verkaufspreis, snap_hoehe_rahmen_cm, snap_breite_rahmen_cm, snap_genre
```
Zugriffsmuster: `(bild.bild_nr if bild else None) or kauf.snap_bild_nr`

### Archiv-Struktur
```
backend/archiv/{Jahr}/{Galerist- oder Künstlername}/
    *.jpg                  # Bilddateien
    archiv_{bild_nr}.csv   # Metadaten (importkompatibel + Käufer-Spalten)
```
Archiv-Unterverzeichnis: Galerist-Name wenn `abrechnungsempf=Galerist`, sonst Künstler-Name.

### SQLite-Migrationen
Neue Spalten werden in `database.py` per `PRAGMA table_info` + `ALTER TABLE ADD COLUMN` ergänzt (kein Alembic).

### Keyboard Shortcuts (global, nur wenn kein Input fokussiert)
- `Alt+A` → `/admin`
- `Alt+B` → `/admin/bilder`
- `Alt+K` → `/admin/kasse`
- `Alt+U` → `/admin/kaufuebersicht`
- **Immer Alt+Key, nie Ctrl+Key** — Ctrl+A/B sind Browser-Standardkürzel (Alles auswählen / Fett)
- Implementiert in `frontend/components/KeyboardShortcuts.tsx`, eingebunden in `app/layout.tsx`

---

## Coding-Regeln (aus Review-Findings — bitte immer beachten)

### Backend

**FastAPI lifespan** — nie `@app.on_event("startup")`, immer:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup-Logik
    yield
    # shutdown-Logik (optional)
app = FastAPI(lifespan=lifespan)
```

**Auth-Middleware: Default CLOSED** — neue Router-Prefixes sind geschützt.
Nur explizit in `_OPEN_PREFIXES` (main.py) eintragen wenn öffentlich nötig.
Bei Künstler-Endpoints immer `Depends(_kuenstler_auth)` — nie nur Path-Parameter vertrauen (IDOR-Schutz).

**Passwort-Validierung** — `validate_password_strength()` muss alle 5 Kriterien prüfen:
Länge ≥10, Großbuchstabe, **Kleinbuchstabe**, Ziffer, Sonderzeichen.

**Router-Größe** — ab ~300 Zeilen thematischen Sub-Router anlegen.
Aktuelle Aufteilung: `admin.py`, `admin_bilder.py`, `admin_kuenstler.py`, `admin_kommunikation.py`, `admin_nutzer.py`.

### Frontend

**Enum-Werte als Konstanten** — nie Magic Strings inline schreiben:
```typescript
// ✓ Richtig
import { VERFUEGBARKEIT } from "@/lib/types";
b.verfuegbarkeit === VERFUEGBARKEIT.VERFUEGBAR

// ✗ Falsch
b.verfuegbarkeit === "Verfügbar"
```

**JWT-Speicherung** — nie in `document.cookie` direkt. Stattdessen:
- `sessionStorage` für API-Calls (automatisch beim Tab-Schließen geleert)
- httpOnly-Cookie via `/api/auth/set-cookie` (serverseitig, nicht per JS lesbar)
- `setToken()` und `logout()` sind `async` — immer `await` verwenden

**Navigation zentral** — alle Admin-Kacheln und Breadcrumbs in `frontend/lib/adminNav.ts`, nicht doppelt in `layout.tsx` und `page.tsx`.

**Datei-Größe** — Komponenten/Seiten ab ~400 Zeilen aufteilen. Modals und komplexe Unter-Komponenten in `_components/`-Unterverzeichnis.

### Secrets & Git

**Niemals committen**: `.env`, `.env.*`, `*.env`, `*.rtf` (sind in `.gitignore`).
Wenn doch passiert: sofort rotieren (console.anthropic.com etc.), nicht nur löschen.

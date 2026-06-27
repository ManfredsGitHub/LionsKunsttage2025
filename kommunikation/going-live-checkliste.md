# Going-Live-Checkliste · Kunsttage auf der Ludwigshöhe 2026

Reihenfolge: von unten nach oben — Infrastruktur zuerst, Inhalte zuletzt.

---

## 1. Hosting-Entscheidung

- [ ] **Server / Plattform festlegen**
  - Option A: VPS (Hetzner, Netcup, …) — empfohlen, volle Kontrolle
  - Option B: Managed-Hosting mit Python- und Node.js-Unterstützung
  - Option C: Lokal im LAN (Raspberry Pi / Mini-PC) mit Portweiterleitung — nur für interne Nutzung ohne externe Kaufanfragen
- [ ] **Subdomain klären** — z. B. `katalog.lions-kunsttage.de` oder eigene Domain
- [ ] **DNS-Eintrag setzen** (A-Record auf Server-IP) — Vorlaufzeit beachten (bis 24h)
- [ ] **SSL-Zertifikat einrichten** (Let's Encrypt via Certbot, kostenlos)

---

## 2. Server-Grundkonfiguration

- [ ] Python 3.11+ installiert
- [ ] Node.js 18+ installiert
- [ ] `nginx` als Reverse Proxy installiert und konfiguriert
  ```nginx
  # Backend → Port 8000 intern
  location /api/ { proxy_pass http://127.0.0.1:8000/; }
  # Frontend → Port 3000 intern
  location / { proxy_pass http://127.0.0.1:3000; }
  ```
- [ ] Firewall: nur Ports 80, 443, 22 (SSH) öffentlich
- [ ] Prozess-Manager einrichten (`systemd` oder `pm2`)
  - Backend als systemd-Service: `uvicorn main:app --host 127.0.0.1 --port 8000`
  - Frontend als systemd-Service: `npm run start` (nach `npm run build`)

---

## 3. Verzeichnisse & Berechtigungen

- [ ] Uploads-Verzeichnis auf **persistentem Pfad** anlegen (kein temp-Verzeichnis)
  ```bash
  mkdir -p /var/kunsttage/uploads
  chown www-data:www-data /var/kunsttage/uploads
  ```
- [ ] Datenbankdatei auf persistentem Pfad ablegen
  ```
  /var/kunsttage/kunsttage.db
  ```
- [ ] Backup-Strategie für DB + Uploads (täglicher Cronjob empfohlen)

---

## 4. Backend `.env` — Produktion

Datei: `backend/.env` (liegt **nicht** im Git — ✓ korrekt)

| Variable | Lokal (aktuell) | Produktion (eintragen) |
|---|---|---|
| `JWT_SECRET` | gesetzt ✓ | unverändert übernehmen |
| `ADMIN_PASSWORT` | `Lions&Admin_26` | **neues Passwort setzen** |
| `ORGA_PASSWORT` | `Lions&Orga_26` | **neues Passwort setzen** |
| `DATABASE_URL` | `sqlite:///./kunsttage.db` | `sqlite:////var/kunsttage/kunsttage.db` (absoluter Pfad) |
| `UPLOAD_DIR` | `./uploads` | `/var/kunsttage/uploads` (absoluter Pfad) |
| `BASE_URL` | `http://localhost:3000` | `https://katalog.lions-kunsttage.de` |
| `CORS_ORIGINS` | `http://localhost:3000,…` | `https://katalog.lions-kunsttage.de` |
| `SMTP_HOST` | `sandbox.smtp.mailtrap.io` | **echter Mailserver** |
| `SMTP_PORT` | `587` | je nach Provider |
| `SMTP_USER` | Mailtrap-User | **echter SMTP-User** |
| `SMTP_PASS` | Mailtrap-Pass | **echtes SMTP-Passwort** |
| `ADMIN_EMAIL` | `elmanfred@icloud.com` | `adresse1@…,adresse2@…` (2 Empfänger, kommasepariert) |
| `ANTHROPIC_API_KEY` | gesetzt ✓ | unverändert übernehmen |

---

## 5. Frontend `.env.local` — Produktion

Datei: `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=https://katalog.lions-kunsttage.de/api
NEXT_PUBLIC_SITE_URL=https://katalog.lions-kunsttage.de
```

- [ ] Werte auf echte Domain angepasst
- [ ] `npm run build` läuft fehlerfrei durch

---

## 6. Datenbank & Seed

- [ ] Produktion startet mit **leerer DB** (kein `seed.py` auf Produktion ausführen)
- [ ] `python -c "from database import create_db; create_db()"` einmalig ausführen (legt Tabellen + Raumplan/Plätze an)
- [ ] Erster Login im Admin-Dashboard erfolgreich

---

## 7. E-Mail-Versand testen

- [ ] Reservierung testen → Bestätigungs-Mail kommt beim Besucher an
- [ ] Reservierung testen → Admin-Mail kommt bei **beiden** ADMIN_EMAIL-Adressen an
- [ ] Kaufanfrage testen → Besucher- und Admin-Mail kommen an
- [ ] Künstler-Login-Link anfordern → Token-Mail kommt an
- [ ] Merkliste zusenden → Mail kommt an

---

## 8. Funktionstest (Golden Path)

- [ ] Galerie öffnet sich unter der echten URL
- [ ] Bild reservieren (als Besucher) → Status wechselt auf Reserviert
- [ ] Kaufanfrage für Online-Katalog-Werk stellen
- [ ] Admin-Login (`/admin`) funktioniert
- [ ] Admin: Bildverwaltung, Freigabe, Preisbestätigung
- [ ] Admin: Vor-Ort-Kasse — Kauf erfassen
- [ ] Admin: Kaufanfragen-Übersicht → Status setzen
- [ ] Künstler-Portal: Login-Link anfordern → Link öffnet Portal
- [ ] Bildaufsteller drucken
- [ ] CSV-Export / DATEV-Export

---

## 9. Inhalte & Rechtliches

- [ ] **Impressum** aktuell (`/admin/impressum`) — Verantwortlicher, Adresse, Kontakt
- [ ] **Datenschutzerklärung** aktuell (`/admin/datenschutz`) — DSGVO-konforme Fassung
- [ ] Künstlerliste vollständig importiert
- [ ] Bilder freigegeben und Preise bestätigt
- [ ] `in_ausstellung`-Flag für Online-Katalog-Werke korrekt gesetzt

---

## 10. Passwörter & Secrets

- [ ] `ADMIN_PASSWORT` auf produktionstaugliches Passwort geändert
- [ ] `ORGA_PASSWORT` auf produktionstaugliches Passwort geändert
- [ ] Alle Passwort-Änderungen sicher dokumentiert (Passwort-Manager)
- [ ] `JWT_SECRET` bleibt unverändert (bereits stark, 64 Hex-Zeichen)

---

## 11. Monitoring & Backup

- [ ] Cronjob für tägliches DB-Backup eingerichtet
  ```bash
  0 3 * * * cp /var/kunsttage/kunsttage.db /var/backups/kunsttage-$(date +\%Y\%m\%d).db
  ```
- [ ] Cronjob für Uploads-Backup
- [ ] Prozess-Neustart bei Absturz konfiguriert (systemd `Restart=always`)
- [ ] Log-Rotation für uvicorn-Logs

---

## Reihenfolge kompakt

```
1. Domain + DNS + SSL
2. Server + nginx + Prozessmanager
3. Verzeichnisse + Berechtigungen
4. .env Produktion befüllen
5. npm run build + DB init
6. E-Mail-Test
7. Funktionstest
8. Inhalte + Rechtliches
9. Passwörter finalisieren
10. Backup aktivieren
```

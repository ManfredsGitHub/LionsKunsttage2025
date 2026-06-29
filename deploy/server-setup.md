# IONOS VPS Einrichtung — Kunsttage auf der Ludwigshöhe
# Copy/Paste Checkliste

---

## Warum SSH-Passwort deaktivieren?

Bei IONOS (und jedem anderen Server) gilt: Solange SSH-Passwort-Login aktiv ist,
versuchen Bot-Netze rund um die Uhr automatisch, sich einzuloggen — das sind
tausende Versuche pro Tag (erkennbar in /var/log/auth.log). Ein Passwort, egal
wie stark, kann durch Brute-Force irgendwann geknackt werden.

Ein SSH-Schlüssel funktioniert anders: Dein Mac hat einen privaten Schlüssel
(nur bei dir lokal), der Server kennt nur den öffentlichen. Ohne den privaten
Schlüssel kommt niemand rein — Passwort egal, Brute-Force unmöglich.

Ablauf:
1. Du erzeugst ein Schlüsselpaar auf deinem Mac (einmalig)
2. Du kopierst den öffentlichen Teil auf den Server
3. Du testest, dass der Schlüssel-Login funktioniert
4. Erst dann deaktivierst du den Passwort-Login

WARNUNG: Wenn du Schritt 4 machst bevor Schritt 2+3 klappen → du sperrst dich
selbst aus. Deshalb die Reihenfolge einhalten.

---

## Voraussetzung

IONOS hat dir per E-Mail die Server-IP und ein Root-Passwort geschickt.
Alle Befehle mit DEINE-SERVER-IP → durch deine echte IP ersetzen (z.B. 85.214.12.34)

---

## Phase 1 — Erster Login (von deinem Mac)

    ssh root@DEINE-SERVER-IP

Das Root-Passwort aus der IONOS-E-Mail eingeben.

---

## Phase 2 — System aktualisieren

    apt update && apt upgrade -y

---

## Phase 3 — Admin-Benutzer anlegen (nicht als root arbeiten)

    adduser kunsttage

Passwort vergeben und merken. Alle anderen Felder leer lassen (Enter drücken).

    usermod -aG sudo kunsttage

---

## Phase 4 — SSH-Schlüssel einrichten

### 4a. Auf deinem Mac (neues Terminal-Fenster öffnen, Server noch NICHT verlassen)

    ssh-keygen -t ed25519 -C "kunsttage-ionos"

Wenn gefragt: Dateiname leer lassen (Enter drücken) oder eigenen Namen vergeben.
Passphrase: optional, aber empfohlen.

    cat ~/.ssh/id_ed25519.pub

Diese Zeile komplett kopieren — sie beginnt mit: ssh-ed25519 AAAA...

### 4b. Zurück im Server-Terminal (als root eingeloggt)

    mkdir -p /home/kunsttage/.ssh
    nano /home/kunsttage/.ssh/authorized_keys

Den kopierten Schlüssel einfügen → Ctrl+O → Enter → Ctrl+X

    chmod 700 /home/kunsttage/.ssh
    chmod 600 /home/kunsttage/.ssh/authorized_keys
    chown -R kunsttage:kunsttage /home/kunsttage/.ssh

### 4c. Schlüssel-Login testen (neues Terminal auf dem Mac)

    ssh kunsttage@DEINE-SERVER-IP

Wenn das ohne Passwort (oder nur mit deiner Passphrase) klappt → weiter zu Phase 5.
Wenn nicht → Phase 5 überspringen und Fehler zuerst beheben.

---

## Phase 5 — Passwort-Login deaktivieren (erst nach erfolgreichem Test!)

    sudo nano /etc/ssh/sshd_config

Diese Zeilen suchen und so setzen (# am Anfang entfernen falls vorhanden):

    PasswordAuthentication no
    PubkeyAuthentication yes
    PermitRootLogin no

    sudo systemctl restart ssh

---

## Phase 6 — Firewall einrichten

    sudo apt install ufw -y
    sudo ufw allow OpenSSH
    sudo ufw allow 80
    sudo ufw allow 443
    sudo ufw enable

y bestätigen.

    sudo ufw status

Sollte zeigen: 22, 80, 443 offen.

---

## Phase 7 — Abhängigkeiten installieren

    sudo apt install -y python3.11 python3.11-venv python3-pip nginx certbot python3-certbot-nginx git

Node.js installieren:

    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs

Versionen prüfen:

    python3.11 --version && node --version

---

## Phase 8 — App-Verzeichnis anlegen

    sudo mkdir -p /var/kunsttage/uploads
    sudo chown -R kunsttage:kunsttage /var/kunsttage

---

## Phase 9 — Projekt deployen

    cd /var/kunsttage
    git clone https://github.com/ManfredsGitHub/LionsKunsttage2025.git app
    cd app

### Backend einrichten

    cd /var/kunsttage/app/backend
    python3.11 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    cp .env.example .env
    nano .env

Alle Werte eintragen:

    JWT_SECRET=<64-stelliger-zufallsstring>
    ADMIN_PASSWORT=<sicheres-admin-passwort>
    ORGA_PASSWORT=<passwort-fuer-orga-team>

    DATABASE_URL=sqlite:////var/kunsttage/kunsttage.db
    UPLOAD_DIR=/var/kunsttage/uploads
    BASE_URL=https://kunsttage-ludwigshoehe.de
    CORS_ORIGINS=https://kunsttage-ludwigshoehe.de

    SMTP_HOST=<smtp-host>
    SMTP_PORT=587
    SMTP_USER=<smtp-user@deine-domain.de>
    SMTP_PASS=<smtp-passwort>
    ADMIN_EMAIL=<admin-email@deine-domain.de>

    ANTHROPIC_API_KEY=<api-key>

JWT_SECRET erzeugen (auf dem Server ausführen):

    python3 -c "import secrets; print(secrets.token_hex(32))"

### Frontend einrichten

    cd /var/kunsttage/app/frontend
    npm install
    nano .env.local

Inhalt:

    NEXT_PUBLIC_API_URL=https://kunsttage-ludwigshoehe.de/api

    npm run build

---

## Phase 10 — Systemd-Services anlegen

### Backend-Service

    sudo nano /etc/systemd/system/kunsttage-backend.service

Inhalt einfügen:

    [Unit]
    Description=Kunsttage FastAPI Backend
    After=network.target

    [Service]
    User=kunsttage
    WorkingDirectory=/var/kunsttage/app/backend
    ExecStart=/var/kunsttage/app/backend/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
    Restart=always
    RestartSec=5
    EnvironmentFile=/var/kunsttage/app/backend/.env

    [Install]
    WantedBy=multi-user.target

### Frontend-Service

    sudo nano /etc/systemd/system/kunsttage-frontend.service

Inhalt einfügen:

    [Unit]
    Description=Kunsttage Next.js Frontend
    After=network.target

    [Service]
    User=kunsttage
    WorkingDirectory=/var/kunsttage/app/frontend
    ExecStart=/usr/bin/node node_modules/.bin/next start --port 3000
    Restart=always
    RestartSec=5

    [Install]
    WantedBy=multi-user.target

### Beide Services starten

    sudo systemctl daemon-reload
    sudo systemctl enable kunsttage-backend kunsttage-frontend
    sudo systemctl start kunsttage-backend kunsttage-frontend
    sudo systemctl status kunsttage-backend kunsttage-frontend

---

## Phase 11 — nginx konfigurieren

    sudo cp /var/kunsttage/app/deploy/nginx-kunsttage-limits.conf /etc/nginx/conf.d/
    sudo cp /var/kunsttage/app/deploy/nginx-kunsttage.conf /etc/nginx/sites-available/kunsttage
    sudo ln -s /etc/nginx/sites-available/kunsttage /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl reload nginx

---

## Phase 12 — SSL-Zertifikat (Let's Encrypt)

    sudo certbot --nginx -d kunsttage-ludwigshoehe.de -d www.kunsttage-ludwigshoehe.de

E-Mail angeben, Bedingungen mit A akzeptieren, Weiterleitungsabfrage mit 2 bestätigen.

    sudo nginx -t && sudo systemctl reload nginx

---

## Phase 13 — Abschlusskontrolle

    sudo systemctl status kunsttage-backend
    sudo systemctl status kunsttage-frontend
    curl -s http://127.0.0.1:8000/ | python3 -m json.tool
    curl -I https://kunsttage-ludwigshoehe.de

Danach: Im Browser https://kunsttage-ludwigshoehe.de/admin/login öffnen
und mit ADMIN_PASSWORT aus der .env einloggen.

---

## Nützliche Befehle im laufenden Betrieb

Logs anzeigen:
    sudo journalctl -u kunsttage-backend -f
    sudo journalctl -u kunsttage-frontend -f
    sudo tail -f /var/log/nginx/kunsttage-error.log

Service neu starten (z.B. nach Update):
    sudo systemctl restart kunsttage-backend
    sudo systemctl restart kunsttage-frontend

App updaten (neuer Code auf GitHub):
    cd /var/kunsttage/app
    git pull
    cd frontend && npm install && npm run build
    cd ../backend && source .venv/bin/activate && pip install -r requirements.txt
    sudo systemctl restart kunsttage-backend kunsttage-frontend

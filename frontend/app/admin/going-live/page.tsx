"use client";
import Link from "next/link";
import { ChecklisteEditor } from "@/app/admin/_components/ChecklisteEditor";
import type { CheckSection } from "@/app/admin/_components/ChecklisteEditor";

const INITIAL_SECTIONS: CheckSection[] = [
  {
    id: "ionos-bestellen",
    title: "1 · IONOS — Server & Domain bestellen",
    items: [
      {
        id: "ionos-vps",
        label: "VPS bei IONOS buchen",
        note: "Empfehlung: VPS Linux M (2 vCores, 4 GB RAM, 80 GB SSD, ~6 €/Monat) — für bis zu ~500 gleichzeitige Besucher ausreichend. Ubuntu 22.04 LTS wählen.",
      },
      {
        id: "ionos-ssh-key",
        label: "SSH-Public-Key im IONOS-Kundencenter hinterlegen (vor Serverstart!)",
        note: "Kundencenter → Server & Cloud → SSH-Keys → Key hinzufügen. Damit ist Root-Passwort-Login von Anfang an unnötig.",
      },
      {
        id: "ionos-domain",
        label: "Domain registrieren oder übertragen",
        note: "Empfehlung: kunsttage-ludwigshoehe.de (~1 €/Monat bei IONOS). Direkt im IONOS-Kundencenter buchen → kein separater DNS-Provider nötig.",
      },
      {
        id: "ionos-ip",
        label: "Server-IPv4 notieren — wird für DNS-Eintrag benötigt",
        note: "IONOS-Kundencenter → Server → Netzwerk → Öffentliche IP. Auch IPv6-Adresse notieren (für AAAA-Record).",
      },
      {
        id: "ionos-smtp",
        label: "SMTP-Zugangsdaten besorgen",
        note: "Option A: IONOS Business-Mail-Paket (~1 €/Monat) — SMTP: smtp.ionos.de, Port 587 STARTTLS. Option B: Transaktionsdienst wie Brevo (kostenlos bis 300 Mails/Tag). Kein Mailtrap mehr in Produktion!",
      },
    ],
  },
  {
    id: "server-zugang",
    title: "2 · Erster Login & Grundsicherung",
    items: [
      {
        id: "ssh-login",
        label: "Ersten SSH-Login als root testen: ssh root@<SERVER-IP>",
        note: "Sollte ohne Passwort funktionieren, wenn SSH-Key korrekt hinterlegt wurde.",
      },
      {
        id: "system-update",
        label: "System-Updates durchführen: apt update && apt upgrade -y && apt autoremove -y",
        note: "Unbedingt als erstes! Bekannte Sicherheitslücken im Basis-System schließen.",
      },
      {
        id: "deploy-user",
        label: "Nicht-root-Deployer anlegen: adduser deploy && usermod -aG sudo deploy",
        note: "Danach: mkdir -p /home/deploy/.ssh && cp ~/.ssh/authorized_keys /home/deploy/.ssh/ && chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys",
      },
      {
        id: "ssh-hardening",
        label: "SSH absichern: Port wechseln, Root-Login & Passwort-Auth deaktivieren",
        note: "In /etc/ssh/sshd_config setzen: Port 2222 (oder eigene Wahl), PermitRootLogin no, PasswordAuthentication no, PubkeyAuthentication yes. Dann: systemctl restart sshd. ACHTUNG: Neues Terminal offen lassen zum Testen, bevor altes geschlossen wird!",
      },
      {
        id: "ufw-firewall",
        label: "UFW-Firewall konfigurieren: nur HTTP, HTTPS und SSH-Port freigeben",
        note: "ufw default deny incoming && ufw default allow outgoing && ufw allow 2222/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable. Status prüfen: ufw status verbose",
      },
      {
        id: "fail2ban",
        label: "fail2ban installieren: apt install fail2ban -y, dann aktivieren",
        note: "Schützt automatisch gegen Brute-Force-Angriffe auf SSH und nginx. Konfiguration: cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local → sshd maxretry auf 5 setzen, bantime auf 3600. Dann: systemctl enable --now fail2ban",
      },
      {
        id: "unattended-upgrades",
        label: "Automatische Sicherheitsupdates aktivieren",
        note: "apt install unattended-upgrades -y && dpkg-reconfigure -plow unattended-upgrades → 'Yes' wählen. Aktualisiert nur Sicherheits-Patches automatisch — keine Major-Updates.",
      },
    ],
  },
  {
    id: "software-install",
    title: "3 · Software installieren",
    items: [
      {
        id: "install-python",
        label: "Python 3.11+ installieren: apt install python3.11 python3.11-venv python3-pip -y",
      },
      {
        id: "install-node",
        label: "Node.js 20 LTS installieren (via NodeSource): curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install nodejs -y",
      },
      {
        id: "install-nginx",
        label: "nginx installieren: apt install nginx -y && systemctl enable nginx",
      },
      {
        id: "install-certbot",
        label: "Certbot installieren: apt install certbot python3-certbot-nginx -y",
        note: "Für automatische SSL-Zertifikate via Let's Encrypt. Kostenlos, automatische Erneuerung alle 90 Tage.",
      },
      {
        id: "install-misc",
        label: "Hilfstools installieren: apt install git curl wget htop ufw -y",
      },
    ],
  },
  {
    id: "dns",
    title: "4 · DNS konfigurieren (IONOS-Kundencenter)",
    items: [
      {
        id: "dns-a-record",
        label: "A-Record setzen: @ → <SERVER-IPv4> (TTL: 3600)",
        note: "IONOS-Kundencenter → Domain & SSL → Domain auswählen → DNS → A-Record hinzufügen. '@' steht für die Root-Domain (z. B. kunsttage-ludwigshoehe.de).",
      },
      {
        id: "dns-www",
        label: "CNAME für www setzen: www → @ (oder zweiter A-Record)",
      },
      {
        id: "dns-aaaa",
        label: "AAAA-Record setzen (IPv6, optional aber empfohlen): @ → <SERVER-IPv6>",
      },
      {
        id: "dns-propagation",
        label: "DNS-Propagation abwarten (bis zu 24 Stunden) und prüfen",
        note: "Prüfen mit: dig kunsttage-ludwigshoehe.de oder online über whatsmydns.net. Solange noch nicht propagiert: nginx-Konfiguration und Zertifikat vorbereiten.",
      },
    ],
  },
  {
    id: "nginx-config",
    title: "5 · nginx konfigurieren & absichern",
    items: [
      {
        id: "nginx-vhost",
        label: "nginx-Vhost anlegen: /etc/nginx/sites-available/kunsttage",
        note: "Reverse Proxy: Frontend (Next.js) auf localhost:3000, Backend (FastAPI) auf localhost:8000/api. Beide hinter nginx — kein direkter Zugriff von außen auf Ports 3000/8000.",
      },
      {
        id: "nginx-ssl",
        label: "SSL-Zertifikat via Certbot einrichten: certbot --nginx -d kunsttage-ludwigshoehe.de -d www.kunsttage-ludwigshoehe.de",
        note: "Automatisch: nginx-Konfiguration wird angepasst, HTTP → HTTPS-Redirect wird gesetzt, Zertifikat erneuert sich automatisch via systemd-Timer.",
      },
      {
        id: "nginx-headers",
        label: "Security-Header in nginx-Config setzen",
        note: "In den server{}-Block: add_header X-Frame-Options 'SAMEORIGIN'; add_header X-Content-Type-Options 'nosniff'; add_header Referrer-Policy 'strict-origin-when-cross-origin'; add_header Permissions-Policy 'camera=(), microphone=(), geolocation=()'; add_header Strict-Transport-Security 'max-age=31536000; includeSubDomains' always;",
      },
      {
        id: "nginx-version",
        label: "nginx-Version verbergen: server_tokens off; in /etc/nginx/nginx.conf (http-Block)",
      },
      {
        id: "nginx-rate-limit",
        label: "Rate Limiting konfigurieren (Schutz gegen API-Missbrauch)",
        note: "In /etc/nginx/nginx.conf (http-Block): limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s; — in API-Location: limit_req zone=api burst=20 nodelay;",
      },
      {
        id: "nginx-test",
        label: "nginx-Konfiguration testen: nginx -t && systemctl reload nginx",
      },
      {
        id: "tls-version",
        label: "TLS-Versionen prüfen: nur TLS 1.2 und 1.3 erlaubt",
        note: "Certbot setzt dies automatisch. Prüfen mit: ssllabs.com/ssltest/ → sollte Grade A oder A+ ergeben.",
      },
    ],
  },
  {
    id: "env",
    title: "6 · Umgebungsvariablen (Produktion)",
    items: [
      {
        id: "env-urls",
        label: "BASE_URL und CORS_ORIGINS in backend/.env auf echte Domain setzen",
        note: "CORS_ORIGINS darf nur die eigene Domain enthalten — kein '*'! Beispiel: CORS_ORIGINS=https://kunsttage-ludwigshoehe.de,https://www.kunsttage-ludwigshoehe.de",
      },
      {
        id: "env-db",
        label: "DATABASE_URL auf absoluten Pfad setzen: sqlite:////var/kunsttage/kunsttage.db",
      },
      {
        id: "env-uploads",
        label: "UPLOAD_DIR auf absoluten Pfad setzen: /var/kunsttage/uploads",
      },
      {
        id: "env-smtp",
        label: "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in backend/.env eintragen",
        note: "IONOS SMTP: Host smtp.ionos.de, Port 587, STARTTLS. Zugangsdaten: IONOS-E-Mail-Adresse + zugehöriges Passwort.",
      },
      {
        id: "env-admin-email",
        label: "ADMIN_EMAIL=elmanfred@icloud.com,fh@hammann-hassloch.de in backend/.env",
      },
      {
        id: "env-frontend",
        label: "NEXT_PUBLIC_API_URL und NEXT_PUBLIC_SITE_URL in frontend/.env.local auf https://kunsttage-ludwigshoehe.de setzen",
      },
      {
        id: "env-permissions",
        label: ".env-Datei absichern: chmod 600 backend/.env — nur deploy-User darf lesen",
        note: "Kritisch! .env-Dateien müssen aus Git-Repository ausgeschlossen sein (.gitignore prüfen) und dürfen nicht öffentlich lesbar sein.",
      },
    ],
  },
  {
    id: "passwords",
    title: "7 · Passwörter & Secrets",
    items: [
      {
        id: "pw-admin",
        label: "ADMIN_PASSWORT in backend/.env auf starkes Passwort setzen (mind. 16 Zeichen)",
      },
      {
        id: "pw-orga",
        label: "ORGA_PASSWORT in backend/.env auf starkes Passwort setzen",
      },
      {
        id: "pw-dokumentiert",
        label: "Passwörter sicher im Passwort-Manager hinterlegen (z. B. 1Password, Bitwarden)",
        note: "JWT_SECRET bleibt unverändert — bereits stark (64 Hex-Zeichen). Niemals Passwörter per E-Mail oder Chat übermitteln.",
      },
      {
        id: "pw-server-user",
        label: "Sicheres Passwort für deploy-Benutzer setzen (auch wenn nur SSH-Key genutzt wird)",
        note: "Für sudo-Operationen benötigt: passwd deploy. Im Passwort-Manager speichern.",
      },
    ],
  },
  {
    id: "deployment",
    title: "8 · Deployment",
    items: [
      {
        id: "deploy-dirs",
        label: "Verzeichnisse anlegen: mkdir -p /var/kunsttage/uploads /var/backups/kunsttage",
        note: "Berechtigungen: chown -R deploy:deploy /var/kunsttage /var/backups/kunsttage",
      },
      {
        id: "deploy-clone",
        label: "Code auf Server deployen (git clone oder rsync)",
        note: "Option A (empfohlen): rsync -avz --exclude node_modules --exclude .next --exclude __pycache__ ./ deploy@<IP>:/home/deploy/kunsttage/. Option B: git clone auf dem Server (dann .env-Dateien separat hochladen — niemals .env im Repo!)",
      },
      {
        id: "deploy-venv",
        label: "Python-Virtualenv anlegen und Backend-Abhängigkeiten installieren",
        note: "cd /home/deploy/kunsttage/backend && python3.11 -m venv venv && source venv/bin/activate && pip install -r requirements.txt",
      },
      {
        id: "deploy-db-init",
        label: "Datenbank initialisieren (einmalig): python -c \"from database import create_db; create_db()\"",
        note: "NICHT seed.py ausführen! Nur create_db() für das Schema.",
      },
      {
        id: "deploy-build",
        label: "Frontend bauen: npm ci && npm run build (muss fehlerfrei durchlaufen)",
        note: "npm ci statt npm install — verwendet exakt die package-lock.json-Versionen.",
      },
      {
        id: "deploy-systemd-backend",
        label: "systemd-Service für FastAPI-Backend anlegen und starten",
        note: "/etc/systemd/system/kunsttage-backend.service: ExecStart=/home/deploy/kunsttage/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2. Dann: systemctl enable --now kunsttage-backend",
      },
      {
        id: "deploy-systemd-frontend",
        label: "systemd-Service für Next.js-Frontend anlegen und starten",
        note: "/etc/systemd/system/kunsttage-frontend.service: ExecStart=/usr/bin/node /home/deploy/kunsttage/frontend/.next/standalone/server.js, PORT=3000. Dann: systemctl enable --now kunsttage-frontend",
      },
      {
        id: "deploy-ports-intern",
        label: "Prüfen: Ports 3000 und 8000 nur intern erreichbar (nicht von außen)",
        note: "ss -tlnp | grep -E '3000|8000' — sollte nur 127.0.0.1:3000 und 127.0.0.1:8000 zeigen, nicht 0.0.0.0.",
      },
    ],
  },
  {
    id: "email-test",
    title: "9 · E-Mail-Versand testen",
    items: [
      {
        id: "mail-reservierung-besucher",
        label: "Reservierung: Bestätigungs-Mail kommt beim Besucher an",
      },
      {
        id: "mail-reservierung-admin",
        label: "Reservierung: Admin-Mail kommt bei beiden ADMIN_EMAIL-Adressen an",
      },
      {
        id: "mail-kaufanfrage",
        label: "Kaufanfrage: Besucher- und Admin-Mail kommen an",
      },
      {
        id: "mail-kuenstler-login",
        label: "Künstler-Login-Link: Token-Mail kommt an",
      },
      {
        id: "mail-merkliste",
        label: "Merkliste zusenden: Mail kommt an",
      },
      {
        id: "mail-spam",
        label: "Mails landen NICHT im Spam-Ordner",
        note: "Falls doch: SPF- und DKIM-Einträge für die Domain prüfen (IONOS setzt diese bei eigener Domain meist automatisch). MX-Toolbox nutzen: mxtoolbox.com/SuperTool",
      },
    ],
  },
  {
    id: "security-check",
    title: "10 · Sicherheits-Check vor Liveschaltung",
    items: [
      {
        id: "ssl-grade",
        label: "SSL-Test bestehen: ssllabs.com/ssltest/ → mindestens Grade A",
        note: "Bei Certbot-Standard-Konfiguration und nginx sollte automatisch A oder A+ erreicht werden.",
      },
      {
        id: "headers-check",
        label: "Security-Header prüfen: securityheaders.com → mindestens Grade B",
        note: "CSP fehlt bewusst, wenn zu komplex — alle anderen Header (HSTS, X-Frame, X-Content-Type etc.) müssen gesetzt sein.",
      },
      {
        id: "ports-check",
        label: "Port-Scan durchführen: nmap -sV <SERVER-IP> — nur Ports 80, 443, 2222 dürfen offen sein",
        note: "Alle anderen Ports müssen geschlossen oder gefiltert sein. nmap auf dem eigenen Rechner ausführen.",
      },
      {
        id: "env-exposed",
        label: ".env-Datei NICHT über HTTP erreichbar: https://domain.de/.env → muss 403 oder 404 zurückgeben",
      },
      {
        id: "api-cors",
        label: "CORS prüfen: API darf keine Anfragen von fremden Domains akzeptieren",
        note: "Test mit: curl -H 'Origin: https://evil.com' https://kunsttage-ludwigshoehe.de/api/bilder — kein Access-Control-Allow-Origin-Header darf zurückkommen.",
      },
      {
        id: "fail2ban-active",
        label: "fail2ban aktiv: fail2ban-client status sshd → mindestens 1 aktiviertes Jail",
      },
      {
        id: "https-redirect",
        label: "HTTP → HTTPS-Redirect funktioniert: http://kunsttage-ludwigshoehe.de → 301 auf https://",
      },
    ],
  },
  {
    id: "funktionstest",
    title: "11 · Funktionstest (Golden Path)",
    items: [
      {
        id: "ft-galerie",
        label: "Galerie öffnet sich unter der echten URL (https://)",
      },
      {
        id: "ft-reservierung",
        label: "Bild reservieren (als Besucher) → Status wechselt auf Reserviert",
      },
      {
        id: "ft-kaufanfrage",
        label: "Kaufanfrage für Online-Katalog-Werk stellen",
      },
      {
        id: "ft-admin-login",
        label: "Admin-Login (/admin) funktioniert mit neuem Produktions-Passwort",
      },
      {
        id: "ft-bildverwaltung",
        label: "Admin: Bildverwaltung, Freigabe, Preisbestätigung",
      },
      {
        id: "ft-kasse",
        label: "Admin: Vor-Ort-Kasse — Kauf erfassen",
      },
      {
        id: "ft-kaufanfragen",
        label: "Admin: Kaufanfragen-Übersicht → Status setzen",
      },
      {
        id: "ft-kuenstler-portal",
        label: "Künstler-Portal: Login-Link anfordern → Link öffnet Portal",
      },
      {
        id: "ft-aufsteller",
        label: "Bildaufsteller drucken",
      },
      {
        id: "ft-export",
        label: "CSV-Export / DATEV-Export",
      },
    ],
  },
  {
    id: "inhalte",
    title: "12 · Inhalte & Rechtliches",
    items: [
      {
        id: "content-impressum",
        label: "Impressum aktuell und vollständig (/admin/impressum)",
        note: "Pflicht: Name, Adresse, E-Mail, ggf. Vereinsregisternummer des Lions-Clubs.",
      },
      {
        id: "content-datenschutz",
        label: "Datenschutzerklärung aktuell (/admin/datenschutz)",
        note: "Hosting-Anbieter (IONOS, Standort Deutschland) muss erwähnt sein. Keine externen Fonts/Analytics ohne Einwilligung.",
      },
      {
        id: "content-kuenstler",
        label: "Künstlerliste vollständig importiert",
      },
      {
        id: "content-bilder",
        label: "Bilder freigegeben und Preise bestätigt",
      },
      {
        id: "content-online",
        label: "in_ausstellung-Flag für Online-Katalog-Werke korrekt gesetzt",
      },
    ],
  },
  {
    id: "backup",
    title: "13 · Backup & Monitoring",
    items: [
      {
        id: "backup-db",
        label: "Cronjob für tägliches DB-Backup einrichten",
        note: "crontab -e (als deploy): 0 2 * * * cp /var/kunsttage/kunsttage.db /var/backups/kunsttage/kunsttage-$(date +\\%Y\\%m\\%d).db. Backups älter als 30 Tage löschen: 0 3 * * * find /var/backups/kunsttage/ -name '*.db' -mtime +30 -delete",
      },
      {
        id: "backup-uploads",
        label: "Cronjob für wöchentliches Uploads-Backup einrichten",
        note: "0 3 * * 0 tar -czf /var/backups/kunsttage/uploads-$(date +\\%Y\\%m\\%d).tar.gz /var/kunsttage/uploads",
      },
      {
        id: "backup-ionos-snapshot",
        label: "IONOS-Snapshot aktivieren (Kundencenter → Server → Snapshots)",
        note: "Wöchentlicher Snapshot des gesamten Servers als zusätzliche Sicherheit. Bei IONOS VPS meist inklusive oder günstig zubuchbar.",
      },
      {
        id: "backup-test",
        label: "Backup-Wiederherstellung einmal testen",
        note: "Datenbank-Backup manuell einspielen und prüfen, ob die Anwendung korrekt startet. Nicht erst im Notfall herausfinden, ob Backups funktionieren.",
      },
      {
        id: "monitoring-restart",
        label: "Prozess-Neustart bei Absturz sichergestellt (systemd: Restart=always in beiden Services)",
      },
      {
        id: "monitoring-logs",
        label: "Log-Rotation prüfen: journalctl --disk-usage — sollte unter 500 MB bleiben",
        note: "Konfiguration in /etc/systemd/journald.conf: SystemMaxUse=200M setzen falls nötig.",
      },
      {
        id: "monitoring-fail2ban",
        label: "fail2ban-Status regelmäßig prüfen: fail2ban-client status sshd",
        note: "Bei vielen gebannten IPs: Anzeichen für laufende Angriffe. SSH-Port ggf. weiter obskurieren.",
      },
    ],
  },
];

const LINKS_FOOTER = (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3">
    <a
      href="/praesentation-orga-2026.html"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-lions-blue text-white text-sm px-4 py-2 rounded-md hover:bg-blue-900 transition-colors"
    >
      📊 Präsentation öffnen
    </a>
    <Link
      href="/admin/einstellungen"
      className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
    >
      ⚙️ Passwörter ändern
    </Link>
    <Link
      href="/admin/impressum"
      className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
    >
      📄 Impressum
    </Link>
    <Link
      href="/admin/datenschutz"
      className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
    >
      🔒 Datenschutz
    </Link>
    <a
      href="https://my.ionos.de"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-sm px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
    >
      🖥️ IONOS Kundencenter
    </a>
  </div>
);

export default function GoingLivePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ChecklisteEditor
        storageKey="going-live-v3"
        initialSections={INITIAL_SECTIONS}
        title="Going Live"
        subtitle="Deployment auf IONOS VPS — Fortschritt wird lokal gespeichert"
        highlightFirstSection
        extraFooter={LINKS_FOOTER}
      />
    </div>
  );
}

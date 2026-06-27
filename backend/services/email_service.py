import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
_ADMIN_EMAIL_RAW = os.getenv("ADMIN_EMAIL", "")
ADMIN_EMAILS: list[str] = [e.strip() for e in _ADMIN_EMAIL_RAW.split(",") if e.strip()]
ADMIN_EMAIL = ADMIN_EMAILS[0] if ADMIN_EMAILS else ""
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")


def _send(to: str | list[str], subject: str, html: str):
    recipients = [to] if isinstance(to, str) else to
    if not recipients:
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(SMTP_USER, recipients, msg.as_string())


def send_reservierung_besucher(email: str, name: str, bildtitel: str, bild_nr: str):
    _send(
        email,
        f"Reservierungsbestätigung – {bildtitel}",
        f"""
        <p>Hallo {name},</p>
        <p>Ihre Reservierung für <strong>{bildtitel}</strong> (Nr. {bild_nr}) wurde erfolgreich registriert.</p>
        <p>Bitte holen Sie das Werk während der Veranstaltung ab oder sprechen Sie uns wegen Transport an.</p>
        <p>Mit freundlichen Grüßen<br>Kunsttage auf der Ludwigshöhe</p>
        """,
    )


def send_reservierung_admin(bild_nr: str, bildtitel: str, name: str, email: str, telefon: str):
    if not ADMIN_EMAILS:
        return
    _send(
        ADMIN_EMAILS,
        f"Neue Reservierung: {bildtitel}",
        f"""
        <p><strong>Neue Reservierung eingegangen</strong></p>
        <ul>
            <li>Bild: {bildtitel} ({bild_nr})</li>
            <li>Käufer: {name}</li>
            <li>E-Mail: {email}</li>
            <li>Telefon: {telefon or '—'}</li>
        </ul>
        """,
    )


def send_kaufbestaetigung(email: str, name: str, bildtitel: str, preis: float, zahlungsart: str):
    _send(
        email,
        f"Kaufbestätigung – {bildtitel}",
        f"""
        <p>Hallo {name},</p>
        <p>vielen Dank für Ihren Kauf!</p>
        <p><strong>{bildtitel}</strong> – {preis:.2f} € ({zahlungsart})</p>
        <p>Mit freundlichen Grüßen<br>Kunsttage auf der Ludwigshöhe</p>
        """,
    )


def send_kaufanfrage_besucher(email: str, name: str, bildtitel: str):
    _send(
        email,
        f"Ihre Kaufanfrage – {bildtitel}",
        f"""
        <p>Hallo {name},</p>
        <p>vielen Dank für Ihre Kaufanfrage für <strong>„{bildtitel}"</strong>.</p>
        <p>Wir melden uns zeitnah bei Ihnen, um Versand, Verpackung und Kosten individuell abzustimmen.</p>
        <p>Mit freundlichen Grüßen<br>Kunsttage auf der Ludwigshöhe<br>Lions Clubs aus der Pfalz</p>
        """,
    )


def send_kaufanfrage_admin(
    anfrage_id: int,
    bild_nr: str,
    bildtitel: str,
    kuenstler: str,
    verkaufspreis,
    anrede,
    vorname: str,
    name: str,
    email: str,
    telefon,
    strasse: str,
    plz: str,
    ort: str,
    land: str,
    anmerkung,
):
    if not ADMIN_EMAILS:
        return
    preis_str = f"{verkaufspreis:.2f} €" if verkaufspreis else "—"
    anrede_str = anrede or ""
    telefon_str = telefon or "—"
    anmerkung_str = anmerkung or "—"
    _send(
        ADMIN_EMAILS,
        f"Neue Kaufanfrage #{anfrage_id} – {bildtitel}",
        f"""
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1e3a5f;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0">
            <h2 style="margin:0;font-size:18px">Neue Kaufanfrage #{anfrage_id}</h2>
            <p style="margin:4px 0 0;opacity:.8;font-size:14px">Kunsttage auf der Ludwigshöhe 2026</p>
          </div>
          <div style="background:#f9fafb;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb">

            <h3 style="color:#1e3a5f;margin:0 0 12px;font-size:15px">WERK</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px">
              <tr><td style="padding:4px 0;color:#6b7280;width:140px">Bild-Nr.</td><td><strong>{bild_nr}</strong></td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Titel</td><td><strong>„{bildtitel}"</strong></td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Künstler</td><td>{kuenstler}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Verkaufspreis</td><td><strong>{preis_str}</strong></td></tr>
            </table>

            <h3 style="color:#1e3a5f;margin:0 0 12px;font-size:15px">KÄUFER — für xt:Commerce</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px">
              <tr><td style="padding:4px 0;color:#6b7280;width:140px">Anrede</td><td>{anrede_str}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Vorname</td><td>{vorname}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Nachname</td><td>{name}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">E-Mail</td><td><a href="mailto:{email}">{email}</a></td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Telefon</td><td>{telefon_str}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Straße</td><td>{strasse}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">PLZ / Ort</td><td>{plz} {ort}</td></tr>
              <tr><td style="padding:4px 0;color:#6b7280">Land</td><td>{land}</td></tr>
            </table>

            <h3 style="color:#1e3a5f;margin:0 0 12px;font-size:15px">ANMERKUNG DES KÄUFERS</h3>
            <p style="font-size:14px;background:#fff;border:1px solid #e5e7eb;padding:12px;border-radius:6px;margin:0 0 24px">{anmerkung_str}</p>

            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:14px;font-size:13px">
              <strong>Nächste Schritte:</strong><br>
              1. Käufer kontaktieren und Versandkosten abstimmen<br>
              2. Bestellung in <a href="https://shop22.lions-kunsttage.de">shop22.lions-kunsttage.de</a> anlegen<br>
              3. Status in der <a href="{BASE_URL}/admin/kaufanfragen">Kaufanfragen-Übersicht</a> auf „Kontaktiert" setzen
            </div>
          </div>
        </div>
        """,
    )


def _abmelde_footer(token: str) -> str:
    link = f"{BASE_URL}/merkliste/abmelden?token={token}"
    return f"""
    <p style="color:#9ca3af;font-size:11px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px">
      Kunsttage auf der Ludwigshöhe · Lions Club Villa Ludwigshöhe<br>
      <a href="{link}" style="color:#9ca3af">Von E-Mails abmelden</a>
    </p>"""


def send_merkliste(email: str, bilder: list, token: str = "") -> None:
    zeilen = ""
    for b in bilder:
        kuenstler = ""
        if b.kuenstler:
            kuenstler = f"{b.kuenstler.db_vorname} {b.kuenstler.db_name}".strip()
        masse = f"{b.breite_rahmen_cm} × {b.hoehe_rahmen_cm} cm" if b.breite_rahmen_cm else ""
        preis = f"<strong>{b.verkaufspreis:.0f} €</strong>" if b.verkaufspreis else "Preis auf Anfrage"
        verfuegbar = b.verfuegbarkeit.value if hasattr(b.verfuegbarkeit, "value") else str(b.verfuegbarkeit)
        farbe = "#16a34a" if verfuegbar == "Verfügbar" else "#ca8a04" if verfuegbar == "Reserviert" else "#dc2626"
        zeilen += f"""
        <tr style="border-bottom:1px solid #e5e7eb">
          <td style="padding:12px 8px;vertical-align:top;width:60px">
            {'<img src="' + BASE_URL + b.bild_url_web + '" style="width:56px;height:56px;object-fit:cover;border-radius:4px">' if b.bild_url_web else '<div style="width:56px;height:56px;background:#f3f4f6;border-radius:4px"></div>'}
          </td>
          <td style="padding:12px 8px;vertical-align:top">
            <strong style="font-size:14px">{b.bildtitel}</strong><br>
            <span style="color:#6b7280;font-size:13px">{kuenstler}</span><br>
            <span style="color:#9ca3af;font-size:12px;font-family:monospace">Nr. {b.bild_nr}</span>
            &nbsp;·&nbsp;
            <span style="color:#9ca3af;font-size:12px">{b.bildtechnik}{" · " + masse if masse else ""}</span>
            {"<br><span style='color:#6b7280;font-size:12px;font-style:italic'>" + b.anmerkung_bild + "</span>" if b.anmerkung_bild else ""}
          </td>
          <td style="padding:12px 8px;vertical-align:top;text-align:right;white-space:nowrap">
            {preis}<br>
            <span style="font-size:11px;color:{farbe}">{verfuegbar}</span>
          </td>
        </tr>"""
    _send(
        email,
        "Ihre Merkliste – Kunsttage auf der Ludwigshöhe 2026",
        f"""
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:8px">
            Meine Merkliste · Kunsttage auf der Ludwigshöhe 2026
          </h2>
          <p style="color:#6b7280;font-size:13px">
            Schloss Villa Ludwigshöhe · Edenkoben<br>
            Bitte bringen Sie diese Liste zur Ausstellung mit. Die Preise sind unverbindlich.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            {zeilen}
          </table>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">
            {len(bilder)} {"Werk" if len(bilder) == 1 else "Werke"} gespeichert
          </p>
          {_abmelde_footer(token) if token else ""}
        </div>
        """,
    )


def send_nachfass(betreff: str, text: str, empfaenger: list[tuple[str, str | None]]):
    """Sendet individuelle E-Mails mit personalisierten Abmelde-Links.
    empfaenger: Liste von (email, token_oder_None) Tupeln.
    """
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        for email, token in empfaenger:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = betreff
            msg["From"] = SMTP_USER
            msg["To"] = email
            html = f"""
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <p style="white-space:pre-line">{text}</p>
              {_abmelde_footer(token) if token else '<p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px">Kunsttage auf der Ludwigshöhe · Lions Club Villa Ludwigshöhe</p>'}
            </div>
            """
            msg.attach(MIMEText(html, "html"))
            s.sendmail(SMTP_USER, email, msg.as_string())


_ROLLEN_DE = {
    "admin": "Administrator",
    "orga": "Orga-Team",
    "kasse": "Kasse",
    "kuenstler": "Künstler-Portal",
}


def send_konto_einrichten(email: str, rolle: str, token: str):
    link = f"{BASE_URL}/konto-einrichten?token={token}"
    rolle_de = _ROLLEN_DE.get(rolle, rolle)
    _send(
        email,
        "Ihr Konto wurde eingerichtet – Kunsttage auf der Ludwigshöhe 2026",
        f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
          <div style="background:#003087;padding:20px 24px;border-radius:6px 6px 0 0">
            <h1 style="color:#C8A951;margin:0;font-size:20px">Kunsttage auf der Ludwigshöhe 2026</h1>
          </div>
          <div style="background:#f9fafb;padding:24px;border-radius:0 0 6px 6px;border:1px solid #e5e7eb">
            <p>Für diese E-Mail-Adresse wurde ein Konto mit der Rolle <strong>{rolle_de}</strong> eingerichtet.</p>
            <p>Bitte klicken Sie auf den folgenden Button, um Ihr persönliches Passwort festzulegen.
               Der Link ist <strong>48 Stunden</strong> gültig.</p>
            <p style="text-align:center;margin:28px 0">
              <a href="{link}"
                 style="background:#003087;color:#ffffff;padding:12px 28px;border-radius:4px;
                        text-decoration:none;font-weight:bold;display:inline-block">
                Passwort festlegen
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px">
              Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
              <a href="{link}" style="color:#003087;word-break:break-all">{link}</a>
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#9ca3af;font-size:12px;margin:0">
              Kunsttage auf der Ludwigshöhe · Lions Club Villa Ludwigshöhe
            </p>
          </div>
        </div>
        """,
    )


def send_passwort_reset(email: str, token: str):
    link = f"{BASE_URL}/passwort-reset/bestaetigen?token={token}"
    _send(
        email,
        "Passwort zurücksetzen – Kunsttage auf der Ludwigshöhe 2026",
        f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
          <div style="background:#003087;padding:20px 24px;border-radius:6px 6px 0 0">
            <h1 style="color:#C8A951;margin:0;font-size:20px">Kunsttage auf der Ludwigshöhe 2026</h1>
          </div>
          <div style="background:#f9fafb;padding:24px;border-radius:0 0 6px 6px;border:1px solid #e5e7eb">
            <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
            <p>Klicken Sie auf den folgenden Button, um ein neues Passwort festzulegen.
               Der Link ist <strong>2 Stunden</strong> gültig und kann nur einmal verwendet werden.</p>
            <p style="text-align:center;margin:28px 0">
              <a href="{link}"
                 style="background:#003087;color:#ffffff;padding:12px 28px;border-radius:4px;
                        text-decoration:none;font-weight:bold;display:inline-block">
                Passwort zurücksetzen
              </a>
            </p>
            <p style="color:#6b7280;font-size:13px">
              Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br>
              <a href="{link}" style="color:#003087;word-break:break-all">{link}</a>
            </p>
            <p style="color:#6b7280;font-size:13px">
              Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.
              Ihr Passwort bleibt unverändert.
            </p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
            <p style="color:#9ca3af;font-size:12px;margin:0">
              Kunsttage auf der Ludwigshöhe · Lions Club Villa Ludwigshöhe
            </p>
          </div>
        </div>
        """,
    )


def send_kuenstler_login(email: str, name: str, token: str):
    link = f"{BASE_URL}/kuenstler/login?token={token}"
    zeilen = "".join(
        f"""<tr>
          <td style="border:1px solid #d1d5db;padding:8px 6px;">&nbsp;</td>
          <td style="border:1px solid #d1d5db;padding:8px 6px;">&nbsp;</td>
          <td style="border:1px solid #d1d5db;padding:8px 6px;">&nbsp;</td>
          <td style="border:1px solid #d1d5db;padding:8px 6px;white-space:nowrap;">&nbsp;&nbsp;&nbsp;&nbsp; × &nbsp;&nbsp;&nbsp;&nbsp;</td>
          <td style="border:1px solid #d1d5db;padding:8px 6px;">&nbsp;</td>
          <td style="border:1px solid #d1d5db;padding:8px 6px;">&nbsp;</td>
        </tr>"""
        for _ in range(8)
    )
    _send(
        email,
        "Ihr Zugang zum Künstler-Portal – Kunsttage auf der Ludwigshöhe 2026",
        f"""
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2937">

          <div style="background:#003087;padding:20px 24px;border-radius:6px 6px 0 0">
            <p style="color:#C8A951;margin:0;font-size:13px;letter-spacing:1px">LIONS CLUB VILLA LUDWIGSHÖHE</p>
            <h1 style="color:#ffffff;margin:6px 0 0;font-size:20px">Kunsttage auf der Ludwigshöhe 2026</h1>
          </div>

          <div style="background:#f9fafb;padding:20px 24px;border:1px solid #e5e7eb;border-top:none">
            <p>Hallo {name},</p>
            <p>Sie sind eingeladen, Ihre Werke für die <strong>14. Kunsttage auf der Ludwigshöhe</strong>
            am <strong>17. & 18. Oktober 2026</strong> einzureichen.</p>

            <p>Bitte bereiten Sie die Daten Ihrer Werke vor — die Liste unten hilft dabei.
            Sobald Sie alles zusammengetragen haben, klicken Sie den Link und erfassen die Daten direkt im Portal.</p>

            <div style="background:#003087;border-radius:6px;padding:16px 20px;margin:20px 0;text-align:center">
              <p style="color:#C8A951;margin:0 0 8px;font-size:12px;letter-spacing:1px">IHR PERSÖNLICHER ZUGANG</p>
              <a href="{link}"
                 style="color:#ffffff;font-size:15px;word-break:break-all">{link}</a>
              <p style="color:#93c5fd;margin:10px 0 0;font-size:12px">⏱ Der Link ist 48 Stunden gültig</p>
            </div>
          </div>

          <!-- Vorbereitungstabelle -->
          <div style="padding:20px 24px;border:1px solid #e5e7eb;border-top:none">
            <h2 style="color:#003087;font-size:16px;margin:0 0 4px">Vorbereitungs-Checkliste</h2>
            <p style="color:#6b7280;font-size:13px;margin:0 0 16px">
              Bitte füllen Sie diese Tabelle aus, bevor Sie sich einloggen.
              Pflichtfelder sind mit <strong>*</strong> markiert.
            </p>

            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="background:#003087;color:#ffffff">
                  <th style="border:1px solid #1e40af;padding:8px 6px;text-align:left;min-width:120px">Bildtitel *</th>
                  <th style="border:1px solid #1e40af;padding:8px 6px;text-align:left;min-width:120px">Technik *</th>
                  <th style="border:1px solid #1e40af;padding:8px 6px;text-align:left;min-width:90px">Genre *</th>
                  <th style="border:1px solid #1e40af;padding:8px 6px;text-align:left;white-space:nowrap">Maße mit Rahmen<br><span style="font-weight:normal;font-size:11px">Höhe × Breite (cm) *</span></th>
                  <th style="border:1px solid #1e40af;padding:8px 6px;text-align:left;min-width:80px">Einlieferungs-<br>preis (€) *</th>
                  <th style="border:1px solid #1e40af;padding:8px 6px;text-align:left;min-width:100px">Anmerkung</th>
                </tr>
              </thead>
              <tbody>
                {zeilen}
              </tbody>
            </table>

            <!-- Genre-Referenz -->
            <div style="margin-top:16px;padding:12px 14px;background:#f3f4f6;border-radius:6px;font-size:12px">
              <strong style="color:#003087">Genre-Auswahl:</strong>
              <span style="color:#374151">
                Abstrakt · Akt · Landschaft · Menschen · Pfalz · Portrait · Städte · Stilleben · Sonstiges
              </span>
            </div>

            <!-- Hinweis Fotos -->
            <div style="margin-top:12px;padding:12px 14px;background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;font-size:12px;color:#92400e">
              <strong>Fotos der Werke:</strong>
              Halten Sie auch gute Fotos Ihrer Werke bereit — diese laden Sie direkt im Portal hoch.
              Bitte möglichst hell und ohne Schatten fotografieren.
            </div>

            <!-- Preishinweis -->
            <div style="margin-top:12px;padding:12px 14px;background:#f0fdf4;border:1px solid #86efac;border-radius:6px;font-size:12px;color:#14532d">
              <strong>Zum Einlieferungspreis:</strong>
              Geben Sie den Betrag an, den Sie für Ihr Werk erhalten möchten.
              Der Ausstellungspreis wird automatisch berechnet.
            </div>
          </div>

          <div style="padding:16px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 6px 6px;background:#f9fafb">
            <p style="margin:0;font-size:13px">Bei Fragen wenden Sie sich gerne an uns.</p>
            <p style="margin:8px 0 0;font-size:13px">Mit freundlichen Grüßen<br>
            <strong>Orgateam Kunsttage auf der Ludwigshöhe</strong></p>
            <p style="margin:16px 0 0;font-size:11px;color:#9ca3af">
              17. & 18. Oktober 2026 · Schloss Villa Ludwigshöhe · Edenkoben · Eintritt frei
            </p>
          </div>

        </div>
        """,
    )

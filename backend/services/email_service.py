import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
BASE_URL = os.getenv("BASE_URL", "http://localhost:3000")


def _send(to: str, subject: str, html: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_USER
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(SMTP_USER, to, msg.as_string())


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
    if not ADMIN_EMAIL:
        return
    _send(
        ADMIN_EMAIL,
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


def send_merkliste(email: str, bilder: list) -> None:
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
        </div>
        """,
    )


def send_nachfass(betreff: str, text: str, bcc_empfaenger: list[str]):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = betreff
    msg["From"] = SMTP_USER
    msg["To"] = ADMIN_EMAIL
    msg["Bcc"] = ", ".join(bcc_empfaenger)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <p style="white-space:pre-line">{text}</p>
      <p style="color:#9ca3af;font-size:12px;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px">
        Kunsttage auf der Ludwigshöhe · Lions Club Villa Ludwigshöhe
      </p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))
    alle = [ADMIN_EMAIL] + bcc_empfaenger
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(SMTP_USER, alle, msg.as_string())


def send_kuenstler_login(email: str, name: str, token: str):
    link = f"{BASE_URL}/kuenstler/login?token={token}"
    _send(
        email,
        "Ihr Zugang zum Künstler-Portal",
        f"""
        <p>Hallo {name},</p>
        <p>hier ist Ihr persönlicher Login-Link für das Künstler-Portal:</p>
        <p><a href="{link}">{link}</a></p>
        <p>Der Link ist 48 Stunden gültig.</p>
        <p>Mit freundlichen Grüßen<br>Kunsttage auf der Ludwigshöhe</p>
        """,
    )

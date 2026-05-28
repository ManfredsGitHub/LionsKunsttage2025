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

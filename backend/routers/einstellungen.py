from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import Session, select
from models import Einstellung
from database import get_session

router = APIRouter(tags=["Einstellungen"])

DATENSCHUTZ_DEFAULT = """Datenschutzerklärung

Stand: Juni 2026

1. Verantwortlicher

Lions Club Villa Ludwigshöhe e.V.
c/o [Ansprechpartner Name]
[Straße und Hausnummer]
76829 Landau in der Pfalz
E-Mail: [email@example.de]


2. Welche Daten wir verarbeiten und warum

a) Besucher (Merkliste)
Wenn Sie eine Merkliste anlegen, speichern wir Ihre E-Mail-Adresse oder Telefonnummer sowie Ihre Favoritenliste. Diese Daten werden ausschließlich verwendet, um Ihnen Ihre Merkliste zuzusenden und Sie bei Bedarf über die Verfügbarkeit der gemerkten Werke zu informieren.
Rechtsgrundlage: Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)
Speicherdauer: Bis zu 12 Monate nach Veranstaltungsende oder bis zum Widerruf der Einwilligung.
Sie können sich jederzeit über den Abmelde-Link in unseren E-Mails oder per Kontaktaufnahme abmelden.

b) Käufer und Reservierungen
Beim Kauf oder der Reservierung eines Werkes erheben wir Ihren Namen, Ihre Anschrift und E-Mail-Adresse sowie die Zahlungsart. Diese Daten werden zur Abwicklung des Kaufvertrags und zur Ausstellung einer Quittung benötigt.
Rechtsgrundlage: Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)
Speicherdauer: 10 Jahre (handels- und steuerrechtliche Aufbewahrungspflicht).

c) Künstler
Von teilnehmenden Künstlerinnen und Künstlern verarbeiten wir Namen, Kontaktdaten, Vita, Portrait-Foto sowie Abbildungen der eingereichten Werke. Diese werden für den Kunstkatalog, die Ausstellungswebseite und Druckmaterialien der Veranstaltung verwendet.
Rechtsgrundlage: Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)
Die Einwilligung kann jederzeit widerrufen werden. Bei Widerruf werden die Daten aus dem öffentlichen Bereich entfernt.


3. Cookies

Diese Website verwendet einen technisch notwendigen Cookie (»kt_auth«) zur Verwaltung von Anmeldungen für Veranstalter und Künstler. Dieser Cookie enthält keinerlei Tracking-Informationen und ist für den Betrieb der Seite erforderlich. Eine Einwilligung ist hierfür nicht erforderlich (§ 25 Abs. 2 TTDSG).


4. Weitergabe an Dritte

Ihre Daten werden nicht an Dritte verkauft oder zu Werbezwecken weitergegeben. Eine Weitergabe erfolgt ausschließlich, wenn dies zur Vertragserfüllung erforderlich ist (z.B. E-Mail-Versand über unseren SMTP-Dienstleister).


5. Ihre Rechte

Sie haben das Recht auf:
• Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)
• Berichtigung unrichtiger Daten (Art. 16 DSGVO)
• Löschung Ihrer Daten (Art. 17 DSGVO)
• Einschränkung der Verarbeitung (Art. 18 DSGVO)
• Datenübertragbarkeit (Art. 20 DSGVO)
• Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)
• Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)

Zur Ausübung Ihrer Rechte wenden Sie sich an: [email@example.de]


6. Beschwerderecht

Sie haben das Recht, sich bei der zuständigen Datenschutz-Aufsichtsbehörde zu beschweren:

Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz
Hintere Bleiche 34
55116 Mainz
https://www.datenschutz.rlp.de


7. Haftung für Inhalte

Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.


8. Haftung für Links

Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.


9. Urheberrecht

Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen."""

IMPRESSUM_DEFAULT = """Impressum

Verantwortlich für den Inhalt:
Lions Club Villa Ludwigshöhe
c/o [Ansprechpartner Name]
[Straße und Hausnummer]
76829 Landau in der Pfalz

Kontakt:
E-Mail: [email@example.de]
Telefon: [+49 ...]

Veranstaltung:
Kunsttage auf der Ludwigshöhe 2026
Schloss Villa Ludwigshöhe
Villastraße 65
67480 Edenkoben

Verein:
Lions Club Villa Ludwigshöhe e.V.
Registergericht: Amtsgericht Landau
Registernummer: [VR ...]

Alle Erlöse aus dem Kunstverkauf fließen in voller Höhe in gemeinnützige Projekte der Lions Clubs der Südpfalz.

Haftungshinweis:
Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich."""


class EinstellungUpdate(BaseModel):
    text: str


def _lesen(schluessel: str, default: str, session: Session) -> dict:
    eintrag = session.get(Einstellung, schluessel)
    return {"text": eintrag.wert if eintrag else default}


def _speichern(schluessel: str, text: str, session: Session) -> dict:
    eintrag = session.get(Einstellung, schluessel)
    if eintrag:
        eintrag.wert = text
    else:
        eintrag = Einstellung(schluessel=schluessel, wert=text)
    session.add(eintrag)
    session.commit()
    return {"status": "gespeichert"}


@router.get("/einstellungen/impressum")
def impressum_lesen(session: Session = Depends(get_session)):
    return _lesen("impressum", IMPRESSUM_DEFAULT, session)


@router.put("/admin/einstellungen/impressum")
def impressum_speichern(data: EinstellungUpdate, session: Session = Depends(get_session)):
    return _speichern("impressum", data.text, session)


@router.get("/einstellungen/datenschutz")
def datenschutz_lesen(session: Session = Depends(get_session)):
    return _lesen("datenschutz", DATENSCHUTZ_DEFAULT, session)


@router.put("/admin/einstellungen/datenschutz")
def datenschutz_speichern(data: EinstellungUpdate, session: Session = Depends(get_session)):
    return _speichern("datenschutz", data.text, session)

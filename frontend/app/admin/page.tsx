import Link from "next/link";

const kacheln = [
  { href: "/admin/bilder", titel: "Bildverwaltung", beschreibung: "Bilder freigeben, Preise bestätigen", icon: "🖼️" },
  { href: "/admin/bilder/aufsteller", titel: "Bildaufsteller", beschreibung: "Druckfertige Aufsteller für alle Bilder", icon: "🏷️" },
  { href: "/admin/import", titel: "CSV / Excel Import", beschreibung: "Galerie-Bilder importieren", icon: "📥" },
  { href: "/admin/kasse", titel: "Vor-Ort-Kasse", beschreibung: "Käufe erfassen & Zahlungen verwalten", icon: "🧾" },
  { href: "/admin/kaufuebersicht", titel: "Kaufübersicht", beschreibung: "Alle Verkäufe & Zahlungsstatus", icon: "📋" },
  { href: "/admin/kaeufer", titel: "Käufer", beschreibung: "Käuferverwaltung & Kaufhistorie", icon: "👤" },
  { href: "/admin/archiv", titel: "Archivierung", beschreibung: "Nummernkreis exportieren & archivieren", icon: "🗄️" },
  { href: "/admin/merklisten", titel: "Besucher-Merklisten", beschreibung: "Favoriten & Interesse der Besucher", icon: "♡" },
  { href: "/admin/nachrichten", titel: "Kommunikation", beschreibung: "Newsletter & Infos an Künstler", icon: "✉" },
  { href: "/admin/kuenstler", titel: "Künstler anlegen", beschreibung: "Künstler registrieren & einladen", icon: "🎨" },
  { href: "/admin/plaetze", titel: "Platzplan", beschreibung: "Künstler den Positionen zuweisen", icon: "🗺️" },
  { href: "/admin/raumplan", titel: "Raumplan", beschreibung: "Lions-Clubs den Räumen zuweisen", icon: "🏛️" },
  { href: "/admin/export", titel: "DATEV-Export", beschreibung: "Buchungsstapel, Debitoren, Kreditoren", icon: "📊" },
  { href: "/admin/impressum", titel: "Impressum", beschreibung: "Impressum bearbeiten", icon: "📄" },
  { href: "/admin/datenschutz", titel: "Datenschutz", beschreibung: "Datenschutzerklärung bearbeiten", icon: "🔒" },
  { href: "/admin/einstellungen", titel: "Einstellungen", beschreibung: "Passwörter ändern", icon: "⚙️" },
];

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-lions-blue mb-2">Admin-Dashboard</h1>
      <p className="text-gray-500 mb-8">Kunsttage auf der Ludwigshöhe 2026 · Verwaltung</p>
      <div className="grid sm:grid-cols-3 gap-4">
        {kacheln.map((k) => (
          <Link key={k.href} href={k.href}>
            <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6">
              <div className="text-3xl mb-3">{k.icon}</div>
              <h2 className="font-semibold text-gray-900">{k.titel}</h2>
              <p className="text-sm text-gray-500 mt-1">{k.beschreibung}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/admin/druckliste`}
          className="inline-block bg-lions-gold text-white px-5 py-2 rounded-md font-medium hover:bg-yellow-600 transition-colors"
        >
          Druckliste als CSV herunterladen
        </a>
      </div>

      <div className="mt-10 bg-white rounded-lg shadow p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Tastaturkürzel</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          {[
            { key: "Ctrl+A", ziel: "Admin-Dashboard" },
            { key: "Ctrl+B", ziel: "Bildverwaltung" },
            { key: "Ctrl+K", ziel: "Vor-Ort-Kasse" },
            { key: "Ctrl+U", ziel: "Kaufübersicht" },
          ].map(({ key, ziel }) => (
            <div key={key} className="flex items-center gap-2">
              <kbd className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 font-mono text-xs text-gray-700 whitespace-nowrap">{key}</kbd>
              <span className="text-gray-600">{ziel}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

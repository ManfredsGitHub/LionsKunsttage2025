import Link from "next/link";

interface Kachel {
  href: string;
  titel: string;
  beschreibung: string;
  icon: string;
}

function KachelLink({ href, titel, beschreibung, icon }: Kachel) {
  return (
    <Link href={href}>
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 h-full">
        <div className="text-3xl mb-3">{icon}</div>
        <h2 className="font-semibold text-gray-900">{titel}</h2>
        <p className="text-sm text-gray-500 mt-1">{beschreibung}</p>
      </div>
    </Link>
  );
}

function Reihe({ kacheln }: { kacheln: Kachel[] }) {
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {kacheln.map((k) => (
        <KachelLink key={k.href} {...k} />
      ))}
    </div>
  );
}

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-lions-blue mb-2">Admin-Dashboard</h1>
      <p className="text-gray-500 mb-8">Kunsttage auf der Ludwigshöhe 2026 · Verwaltung</p>

      <div className="space-y-4">
        <Reihe kacheln={[
          { href: "/admin/kuenstler", titel: "Künstler anlegen & pflegen", beschreibung: "Künstler registrieren & einladen", icon: "🎨" },
          { href: "/admin/bilder", titel: "Bildverwaltung", beschreibung: "Bilder freigeben, Preise bestätigen", icon: "🖼️" },
        ]} />

        <Reihe kacheln={[
          { href: "/admin/merklisten", titel: "Besucher-Merklisten", beschreibung: "Favoriten & Interesse der Besucher", icon: "♡" },
          { href: "/admin/kaufanfragen", titel: "Kaufanfragen", beschreibung: "Online-Kaufabsichten & Versandabwicklung", icon: "🛒" },
        ]} />

        <Reihe kacheln={[
          { href: "/admin/kasse", titel: "Vor-Ort-Kasse", beschreibung: "Käufe erfassen & Zahlungen verwalten", icon: "🧾" },
          { href: "/admin/kaeufer", titel: "Käufer", beschreibung: "Käuferverwaltung & Kaufhistorie", icon: "👤" },
          { href: "/admin/kaufuebersicht", titel: "Kaufübersicht", beschreibung: "Alle Verkäufe & Zahlungsstatus", icon: "📋" },
        ]} />

        <Reihe kacheln={[
          { href: "/admin/going-live", titel: "Going Live", beschreibung: "Checkliste Liveschaltung", icon: "🚀" },
          { href: "/admin/org-abwicklung", titel: "Organisation und Abwicklung", beschreibung: "Veranstaltungsplanung & Checklisten", icon: "📋" },
          { href: "/admin/nachrichten", titel: "Kommunikation", beschreibung: "Newsletter & Infos an Künstler", icon: "✉️" },
        ]} />

        <Reihe kacheln={[
          { href: "/admin/organisation", titel: "Organisation", beschreibung: "Platzplan, Raumplan & Bildaufsteller", icon: "🗂️" },
          { href: "/admin/einstellungen", titel: "Einstellungen", beschreibung: "Passwörter ändern", icon: "⚙️" },
          { href: "/admin/sonstiges", titel: "Sonstiges", beschreibung: "DATEV, Import, Archiv, Impressum & Datenschutz", icon: "📁" },
        ]} />


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

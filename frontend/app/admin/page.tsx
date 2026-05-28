import Link from "next/link";

const kacheln = [
  { href: "/admin/bilder", titel: "Bildverwaltung", beschreibung: "Bilder freigeben, Preise bestätigen", icon: "🖼️" },
  { href: "/admin/import", titel: "CSV / Excel Import", beschreibung: "Galerie-Bilder importieren", icon: "📥" },
  { href: "/admin/kasse", titel: "Vor-Ort-Kasse", beschreibung: "Käufe erfassen & Zahlungen verwalten", icon: "🧾" },
  { href: "/admin/merklisten", titel: "Besucher-Merklisten", beschreibung: "Favoriten & Interesse der Besucher", icon: "♡" },
  { href: "/admin/kuenstler", titel: "Künstler anlegen", beschreibung: "VorOrt-Künstler registrieren & einladen", icon: "🎨" },
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
    </div>
  );
}

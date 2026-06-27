import Link from "next/link";

const kacheln = [
  { href: "/admin/raumplan", titel: "Raumplan", beschreibung: "Lions-Clubs den Räumen zuweisen", icon: "🏛️" },
  { href: "/admin/plaetze", titel: "Platzplan", beschreibung: "Künstler den Positionen zuweisen", icon: "🗺️" },
  { href: "/admin/bilder/aufsteller", titel: "Bildaufsteller", beschreibung: "Druckfertige Aufsteller für alle Bilder", icon: "🏷️" },
];

export default function OrganisationPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-lions-blue mb-2">Organisation</h1>
      <p className="text-gray-500 mb-8">Platzplan, Raumplan & Bildaufsteller</p>

      <div className="grid sm:grid-cols-3 gap-4">
        {kacheln.map((k) => (
          <Link key={k.href} href={k.href}>
            <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 h-full">
              <div className="text-3xl mb-3">{k.icon}</div>
              <h2 className="font-semibold text-gray-900">{k.titel}</h2>
              <p className="text-sm text-gray-500 mt-1">{k.beschreibung}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

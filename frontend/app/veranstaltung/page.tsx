import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Veranstaltung – Kunsttage auf der Ludwigshöhe 2026",
  description:
    "Kunsttage auf der Ludwigshöhe 2026 – Schloss Villa Ludwigshöhe, Edenkoben – 17. und 18. Oktober 2026. Kunst für einen guten Zweck.",
};

const TAGE = [
  { datum: "Samstag, 17. Oktober 2026", zeit: "12:00 – 18:00 Uhr" },
  { datum: "Sonntag, 18. Oktober 2026", zeit: "10:00 – 17:00 Uhr" },
];

export default function VeranstaltungPage() {
  return (
    <div className="space-y-12">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-96 md:h-[560px]">
        <Image
          src="/villa.jpg"
          alt="Säulengang der Schloss Villa Ludwigshöhe"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8 space-y-2">
          <p className="text-lions-gold font-semibold uppercase tracking-widest text-sm">
            14. Kunsttage auf der Ludwigshöhe
          </p>
          <h1 className="text-4xl font-bold text-white">
            Kunst für einen guten Zweck
          </h1>
          <p className="text-gray-200 text-lg">
            Schloss Villa Ludwigshöhe · Edenkoben · Oktober 2026
          </p>
        </div>
      </div>

      {/* Termine + Info */}
      <div className="grid md:grid-cols-2 gap-8">

        {/* Termine */}
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <h2 className="text-xl font-bold text-lions-blue border-b border-lions-gold pb-3">
            Öffnungszeiten
          </h2>
          <div className="space-y-4">
            {TAGE.map((t) => (
              <div key={t.datum} className="flex items-start gap-4">
                <div className="mt-1 w-3 h-3 rounded-full bg-lions-gold flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800">{t.datum}</p>
                  <p className="text-gray-500">{t.zeit}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100 space-y-2 text-sm text-gray-600">
            <div className="flex gap-2">
              <span className="font-medium text-lions-blue w-24">Eintritt</span>
              <span>frei</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-lions-blue w-24">Veranstalter</span>
              <span>Lions Clubs Annweiler, Bad Bergzabern, Edenkoben, Germersheim, Haßloch</span>
            </div>
            <div className="flex gap-2">
              <span className="font-medium text-lions-blue w-24">Erlöse</span>
              <span>100 % für gemeinnützige Projekte in der Südpfalz</span>
            </div>
          </div>
        </div>

        {/* Adresse + Anfahrt */}
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <h2 className="text-xl font-bold text-lions-blue border-b border-lions-gold pb-3">
            Veranstaltungsort
          </h2>
          <div className="space-y-1">
            <p className="font-semibold text-gray-800 text-lg">Schloss Villa Ludwigshöhe</p>
            <p className="text-gray-600">Villastr.</p>
            <p className="text-gray-600">67480 Edenkoben</p>
          </div>

          <div className="space-y-3 text-sm">
            <h3 className="font-semibold text-lions-blue">Anfahrt mit dem Auto</h3>
            <p className="text-gray-600">
              A65 Abfahrt Edenkoben, dann Richtung Rhodt. Die Villa liegt am Haardtrand
              oberhalb von Edenkoben, ca. 3 km vom Ortszentrum entfernt.
              Parkplätze sind vor Ort vorhanden.
            </p>

            <h3 className="font-semibold text-lions-blue pt-2">Anfahrt mit Bus & Bahn</h3>
            <p className="text-gray-600">
              S-Bahn S1 bis Bahnhof Edenkoben, dann Bus Linie 506 Richtung
              Rhodt/Schloss Villa Ludwigshöhe (Haltestelle Schloss Villa Ludwigshöhe).
            </p>
          </div>

          <a
            href="https://www.google.com/maps/dir/?api=1&destination=Schloss+Villa+Ludwigsh%C3%B6he%2C+Villastr.%2C+67480+Edenkoben"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 px-5 py-2 bg-lions-blue text-white text-sm rounded-lg hover:bg-opacity-90 transition-colors"
          >
            Route berechnen →
          </a>
        </div>
      </div>

      {/* Karte */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 pt-6 pb-4">
          <h2 className="text-xl font-bold text-lions-blue">Lage</h2>
          <p className="text-gray-500 text-sm mt-1">Schloss Villa Ludwigshöhe, 67480 Edenkoben</p>
        </div>
        <iframe
          title="Lage der Schloss Villa Ludwigshöhe"
          src="https://www.openstreetmap.org/export/embed.html?bbox=8.0600%2C49.2700%2C8.1050%2C49.2950&layer=mapnik&marker=49.2803%2C8.0831"
          width="100%"
          height="420"
          className="border-0"
          loading="lazy"
        />
        <div className="px-8 py-3 text-xs text-gray-400">
          Karte: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a>-Mitwirkende
        </div>
      </div>

      {/* Über die Veranstaltung */}
      <div className="bg-lions-blue text-white rounded-2xl p-8 space-y-4">
        <h2 className="text-xl font-bold">Über die Kunsttage auf der Ludwigshöhe</h2>
        <p className="text-blue-100 leading-relaxed">
          Die Kunsttage auf der Ludwigshöhe sind eine jährliche Benefizausstellung der Lions Clubs der Südpfalz.
          Seit über einem Jahrzehnt präsentieren regionale Künstlerinnen und Künstler ihre Werke
          in einem der schönsten historischen Gebäude der Pfalz — der Schloss Villa Ludwigshöhe,
          einstiger Sommerresidenz König Ludwigs I. von Bayern.
        </p>
        <p className="text-blue-100 leading-relaxed">
          Der gesamte Erlös aus dem Kunstverkauf fließt in gemeinnützige Projekte der Region.
          Bisher konnten so über <span className="text-lions-gold font-semibold">100.000 Euro</span> für
          soziale Zwecke gesammelt werden.
        </p>
      </div>

    </div>
  );
}

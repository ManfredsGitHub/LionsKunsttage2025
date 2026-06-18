import type { Metadata } from "next";
import Link from "next/link";
import { Kuenstler } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  title: "Künstlerinnen & Künstler",
  description:
    "Alle teilnehmenden Künstlerinnen und Künstler der Kunsttage auf der Ludwigshöhe 2026 – mit Vita, ausgestellten Werken und Preisen.",
  alternates: { canonical: `${SITE}/kuenstler` },
};

export default async function KuenstlerListePage() {
  let kuenstler: Kuenstler[] = [];
  try {
    const res = await fetch(`${API}/kuenstler`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data: Kuenstler[] = await res.json();
      kuenstler = data.sort((a, b) => a.db_name.localeCompare(b.db_name, "de"));
    }
  } catch {}

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-lions-blue">Künstlerinnen & Künstler</h1>
        <Link
          href="/kuenstler/portal"
          className="text-sm text-lions-blue border border-lions-blue rounded-md px-4 py-2 hover:bg-lions-blue hover:text-white transition-colors"
        >
          Künstler-Login
        </Link>
      </div>

      {kuenstler.length === 0 ? (
        <p className="text-gray-400">Keine Künstlerinnen oder Künstler gefunden.</p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {kuenstler.map((k) => (
            <Link key={k.id} href={`/kuenstler/${k.id}`}>
              <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-5 flex gap-4 items-start">
                {k.portrait_foto ? (
                  <img
                    src={`${API}${k.portrait_foto}`}
                    alt={`Portrait ${k.db_vorname ?? ""} ${k.db_name}`.trim()}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-lions-blue/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lions-blue font-bold text-xl">
                      {k.db_vorname?.[0] ?? ""}{k.db_name[0]}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">{k.db_vorname} {k.db_name}</p>
                  {k.db_leben && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{k.db_leben}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

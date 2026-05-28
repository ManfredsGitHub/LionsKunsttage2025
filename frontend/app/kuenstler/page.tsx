"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getKuenstler } from "@/lib/api";
import { Kuenstler } from "@/lib/types";

export default function KuenstlerListePage() {
  const [kuenstler, setKuenstler] = useState<Kuenstler[]>([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    getKuenstler()
      .then((data) => {
        const sichtbar = data
          .filter((k) => k.kuenstlertyp !== "Eigenbestand")
          .sort((a, b) => a.db_name.localeCompare(b.db_name, "de"));
        setKuenstler(sichtbar);
      })
      .finally(() => setLaden(false));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-lions-blue mb-6">Künstlerinnen & Künstler</h1>
      {laden ? (
        <p className="text-gray-400 animate-pulse">Laden…</p>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {kuenstler.map((k) => (
            <Link key={k.id} href={`/kuenstler/${k.id}`}>
              <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-5 flex gap-4 items-start">
                {k.portrait_foto ? (
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL}${k.portrait_foto}`}
                    alt={k.db_name}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-lions-blue/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lions-blue font-bold text-xl">
                      {k.db_vorname[0]}{k.db_name[0]}
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

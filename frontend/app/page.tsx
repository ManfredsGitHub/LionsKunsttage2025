"use client";
import { useEffect, useState, useMemo } from "react";
import { getBilder } from "@/lib/api";
import { Bild } from "@/lib/types";
import BildCard from "@/components/BildCard";
import FilterBar from "@/components/FilterBar";

export default function GaleriePage() {
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [alleBilder, setAlleBilder] = useState<Bild[]>([]);
  const [genre, setGenre] = useState("");
  const [technik, setTechnik] = useState("");
  const [kuenstlerId, setKuenstlerId] = useState("");
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState("");

  // Einmalig alle Bilder laden für die Künstler-Dropdown-Optionen
  useEffect(() => {
    getBilder().then(setAlleBilder).catch(() => {});
  }, []);

  const kuenstlerOptionen = useMemo(() => {
    const map = new Map<number, string>();
    for (const b of alleBilder) {
      if (b.kuenstler && !map.has(b.kuenstler_id)) {
        const k = b.kuenstler;
        map.set(b.kuenstler_id, `${k.db_name}${k.db_vorname ? `, ${k.db_vorname}` : ""}`);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [alleBilder]);

  useEffect(() => {
    setLaden(true);
    getBilder({
      genre: genre || undefined,
      technik: technik || undefined,
      kuenstler_id: kuenstlerId ? Number(kuenstlerId) : undefined,
    })
      .then(setBilder)
      .catch(() => setFehler("Verbindung zum Server fehlgeschlagen."))
      .finally(() => setLaden(false));
  }, [genre, technik, kuenstlerId]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-lions-blue">Galerie 2026</h1>
        <p className="text-gray-500 mt-1">Schloss Villa Ludwigshöhe · Edenkoben</p>
      </div>

      <FilterBar
        genre={genre} technik={technik} onGenre={setGenre} onTechnik={setTechnik}
        kuenstlerId={kuenstlerId} onKuenstler={setKuenstlerId}
        kuenstlerOptionen={kuenstlerOptionen}
      />

      {fehler && <p className="text-red-600 py-4">{fehler}</p>}

      {laden ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow animate-pulse">
              <div className="aspect-[4/3] bg-gray-200 rounded-t-lg" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : bilder.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">Keine Bilder gefunden.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {bilder.map((b) => <BildCard key={b.id} bild={b} />)}
        </div>
      )}
    </div>
  );
}

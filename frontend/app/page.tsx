"use client";
import { useEffect, useState } from "react";
import { getBilder } from "@/lib/api";
import { Bild } from "@/lib/types";
import BildCard from "@/components/BildCard";
import FilterBar from "@/components/FilterBar";

export default function GaleriePage() {
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [genre, setGenre] = useState("");
  const [technik, setTechnik] = useState("");
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    setLaden(true);
    getBilder({ genre: genre || undefined, technik: technik || undefined })
      .then(setBilder)
      .catch(() => setFehler("Verbindung zum Server fehlgeschlagen."))
      .finally(() => setLaden(false));
  }, [genre, technik]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-lions-blue">Galerie 2026</h1>
        <p className="text-gray-500 mt-1">Schloss Villa Ludwigshöhe · Edenkoben</p>
      </div>

      <FilterBar genre={genre} technik={technik} onGenre={setGenre} onTechnik={setTechnik} />

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

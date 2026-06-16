"use client";
import { useEffect, useState, useMemo } from "react";
import { getBilder } from "@/lib/api";
import { Bild } from "@/lib/types";
import BildCard from "@/components/BildCard";
import FilterBar from "@/components/FilterBar";

const STORAGE_KEY = "galerie_state";

export default function GaleriePage() {
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [alleBilder, setAlleBilder] = useState<Bild[]>([]);
  const [genre, setGenre] = useState("");
  const [technik, setTechnik] = useState("");
  const [kuenstlerId, setKuenstlerId] = useState("");
  const [sortierung, setSortierung] = useState("");
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState("");
  const [restored, setRestored] = useState(false);

  // Filter-State und Scroll-Position aus sessionStorage wiederherstellen
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { genre: g, technik: t, kuenstlerId: k, sortierung: s, scrollY } = JSON.parse(saved);
        if (g) setGenre(g);
        if (t) setTechnik(t);
        if (k) setKuenstlerId(k);
        if (s) setSortierung(s);
        sessionStorage.removeItem(STORAGE_KEY);
        if (scrollY) setTimeout(() => window.scrollTo({ top: scrollY }), 100);
      }
    } catch {}
    setRestored(true);
  }, []);

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
    if (!restored) return;
    setLaden(true);
    getBilder({
      genre: genre || undefined,
      technik: technik || undefined,
      kuenstler_id: kuenstlerId ? Number(kuenstlerId) : undefined,
    })
      .then(data => {
        if (sortierung === "zufall")
          data.sort(() => Math.random() - 0.5);
        else if (sortierung === "preis_asc")
          data.sort((a, b) => (a.verkaufspreis ?? Infinity) - (b.verkaufspreis ?? Infinity));
        else if (sortierung === "preis_desc")
          data.sort((a, b) => (b.verkaufspreis ?? -1) - (a.verkaufspreis ?? -1));
        setBilder(data);
      })
      .catch(() => setFehler("Verbindung zum Server fehlgeschlagen."))
      .finally(() => setLaden(false));
  }, [genre, technik, kuenstlerId, sortierung, restored]);

  function handleBildClick() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        genre, technik, kuenstlerId, sortierung, scrollY: window.scrollY,
      }));
    } catch {}
  }

  return (
    <div>
      {/* ── Hero ── */}
      <div className="mb-10 text-center">
        <h1 aria-label="Kunsttage" className="kunsttage justify-center">
          <span>K</span>
          <span>u</span>
          <span>n</span>
          <span>s</span>
          <span>t</span>
          <span>t</span>
          <span>a</span>
          <span>g</span>
          <span>e</span>
        </h1>
        <p
          className="text-gray-500 mt-2 text-xs tracking-[0.2em] uppercase"
          style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
        >
          auf der Ludwigshöhe · 2026 · Schloss Villa Ludwigshöhe · Edenkoben
        </p>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-lions-blue">Galerie</h2>
      </div>

      <FilterBar
        genre={genre} technik={technik} onGenre={setGenre} onTechnik={setTechnik}
        kuenstlerId={kuenstlerId} onKuenstler={setKuenstlerId}
        kuenstlerOptionen={kuenstlerOptionen}
        sortierung={sortierung} onSortierung={setSortierung}
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
          {bilder.map((b) => (
            <div key={b.id} onClick={handleBildClick}>
              <BildCard bild={b} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

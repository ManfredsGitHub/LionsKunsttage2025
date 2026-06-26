"use client";
import { useEffect, useState, useMemo } from "react";
import { getBilder } from "@/lib/api";
import { Bild, Kuenstler } from "@/lib/types";
import BildCard from "@/components/BildCard";
import FilterBar from "@/components/FilterBar";

const STORAGE_KEY = "galerie_state";
const SPOTLIGHT_INTERVAL = 10;

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
        if (sortierung === "" || sortierung === "zufall")
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

  function scrollToGalerie() {
    document.getElementById("galerie")?.scrollIntoView({ behavior: "smooth" });
  }

  // Unique non-Galerist artists in order of first appearance
  const spotlightKuenstler = useMemo(() => {
    const seen = new Set<number>();
    const counts = new Map<number, number>();
    const ersteBilder = new Map<number, Bild>();

    for (const b of bilder) {
      if (!b.kuenstler || b.kuenstler.kuenstlertyp === "galerist") continue;
      counts.set(b.kuenstler_id, (counts.get(b.kuenstler_id) ?? 0) + 1);
      if (!ersteBilder.has(b.kuenstler_id)) ersteBilder.set(b.kuenstler_id, b);
    }

    const result: { kuenstler: Kuenstler; count: number; ersteBild: Bild }[] = [];
    for (const b of bilder) {
      if (!b.kuenstler || b.kuenstler.kuenstlertyp === "galerist") continue;
      if (seen.has(b.kuenstler_id)) continue;
      seen.add(b.kuenstler_id);
      result.push({
        kuenstler: b.kuenstler,
        count: counts.get(b.kuenstler_id)!,
        ersteBild: ersteBilder.get(b.kuenstler_id)!,
      });
    }
    return result;
  }, [bilder]);

  const bildChunks = useMemo(() => {
    const chunks: Bild[][] = [];
    for (let i = 0; i < bilder.length; i += SPOTLIGHT_INTERVAL) {
      chunks.push(bilder.slice(i, i + SPOTLIGHT_INTERVAL));
    }
    return chunks;
  }, [bilder]);

  return (
    <div>
      {/* ── Hero ── */}
      <div className="relative rounded-2xl overflow-hidden mb-8 h-56 sm:h-72 md:h-80">
        <img
          src="/villa.jpg"
          alt="Säulengang der Schloss Villa Ludwigshöhe"
          className="w-full h-full object-cover object-center"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
        <p className="absolute bottom-1.5 right-2 text-white/50 text-[10px] leading-none select-none pointer-events-none">
          © GDKE, E. Fischer
        </p>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 sm:pb-8 px-4 text-center">
          <p className="text-lions-gold font-semibold uppercase tracking-widest text-xs sm:text-sm mb-1">
            14. Kunsttage auf der Ludwigshöhe
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Kunst für einen guten Zweck
          </h1>
          <p className="text-gray-300 text-sm mt-1.5">
            17. &amp; 18. Oktober 2026 · Schloss Villa Ludwigshöhe ·{" "}
            <span className="text-white font-medium">Eintritt frei</span>
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={scrollToGalerie}
              className="bg-lions-gold text-lions-blue font-semibold text-sm px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              Bilder entdecken →
            </button>
            <a
              href="/veranstaltung"
              className="text-white text-sm px-4 py-2 rounded-lg border border-white/40 hover:bg-white/10 transition-colors"
            >
              Zur Veranstaltung ↗
            </a>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        {[
          { zahl: "14", label: "Jahre Kunsttage" },
          { zahl: ">100.000 €", label: "für gute Zwecke" },
          { zahl: "4", label: "Lions-Clubs aus der Pfalz" },
        ].map(({ zahl, label }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-lions-blue">{zahl}</p>
            <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      <div id="galerie" className="mb-6">
        <h2 className="text-xl font-semibold text-lions-blue">Galerie</h2>
      </div>

      <FilterBar
        genre={genre} technik={technik} onGenre={setGenre} onTechnik={setTechnik}
        kuenstlerId={kuenstlerId} onKuenstler={setKuenstlerId}
        kuenstlerOptionen={kuenstlerOptionen}
        sortierung={sortierung} onSortierung={setSortierung}
      />

      <div className="mt-4 mb-1 flex items-center gap-2 text-xs text-lions-blue/70 bg-lions-blue/5 rounded-md px-3 py-2">
        <span aria-hidden="true" className="text-sm">♡</span>
        <span>Bilder vormerken — bei der Veranstaltung gezielt danach suchen</span>
      </div>

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
        <>
          {bildChunks.map((chunk, chunkIdx) => {
            const sp = spotlightKuenstler.length > 0
              ? spotlightKuenstler[chunkIdx % spotlightKuenstler.length]
              : null;
            const imgSrc = sp?.ersteBild.bild_url_web
              ? `${process.env.NEXT_PUBLIC_API_URL}${sp.ersteBild.bild_url_web}`
              : "/placeholder.jpg";

            return (
              <div key={chunkIdx}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  {chunk.map((b) => (
                    <div key={b.id} onClick={handleBildClick}>
                      <BildCard bild={b} />
                    </div>
                  ))}
                </div>

                {chunkIdx < bildChunks.length - 1 && sp && (
                  <div className="mt-6 rounded-2xl overflow-hidden bg-lions-blue flex items-stretch">
                    <div className="flex-1 p-6 sm:p-8 flex flex-col justify-center">
                      <p className="text-xs font-semibold uppercase tracking-widest text-lions-gold mb-2">
                        Künstler der Ausstellung
                      </p>
                      <p className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                        {sp.kuenstler.db_vorname} {sp.kuenstler.db_name}
                      </p>
                      <p className="text-white/60 text-sm mt-1.5">
                        {sp.count} {sp.count === 1 ? "Werk" : "Werke"} in dieser Ausstellung
                      </p>
                      <button
                        onClick={() => {
                          setKuenstlerId(String(sp.kuenstler.id));
                          document.getElementById("galerie")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="mt-4 self-start inline-flex items-center gap-1.5 bg-lions-gold text-lions-blue font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Alle Werke ansehen →
                      </button>
                    </div>
                    <div className="hidden sm:block w-44 md:w-64 flex-shrink-0">
                      <img
                        src={imgSrc}
                        alt={sp.ersteBild.bildtitel}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg"; }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

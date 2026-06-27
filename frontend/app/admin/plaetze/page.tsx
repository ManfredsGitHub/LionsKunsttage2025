"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getAllePlaetze, platzZuweisen, getAlleKuenstler, getRaumplan } from "@/lib/api";
import type { Platz, Kuenstler, Raumzuteilung } from "@/lib/types";

const RAUM_REIHENFOLGE = [
  "Raum 43",
  "Raum 44",
  "Raum 45",
  "Raum 46",
  "Raum 47",
  "Raum 48",
  "Raum 49",
  "Raum 42",
  "Flur 2",
  "Hauptflur",
];

// Zuordnung Platz-Raumname → raum_nr im Raumplan
const RAUM_NR_MAP: Record<string, string> = {
  "Raum 42":   "42",
  "Raum 43":   "43",
  "Raum 44":   "44",
  "Raum 45":   "45",
  "Raum 46":   "46",
  "Raum 47":   "47",
  "Raum 48":   "48",
  "Raum 49":   "49",
  "Flur 2":    "Flur2",
  "Hauptflur": "Flur",
};

function raumLabel(raum: string, raumplan: Raumzuteilung[]): string {
  const nr = RAUM_NR_MAP[raum];
  if (!nr) return raum;
  const club = raumplan.find(r => r.raum_nr === nr)?.belegt_durch;
  return club ? `${raum} – ${club}` : raum;
}

const KAT_COLORS: Record<number, string> = {
  1: "bg-blue-50 border-blue-300 hover:border-blue-500",
  2: "bg-green-50 border-green-300 hover:border-green-500",
  3: "bg-amber-50 border-amber-300 hover:border-amber-500",
  4: "bg-gray-50 border-gray-200 hover:border-gray-400",
};

const KAT_BADGE: Record<number, string> = {
  1: "bg-blue-100 text-blue-700",
  2: "bg-green-100 text-green-700",
  3: "bg-amber-100 text-amber-700",
  4: "bg-gray-100 text-gray-600",
};

type ZuweisungsDropdownProps = {
  platz: Platz;
  kuenstler: Kuenstler[];
  onZuweisen: (kuenstlerId: number | null) => void;
  onClose: () => void;
};

function ZuweisungsDropdown({ platz, kuenstler, onZuweisen, onClose }: ZuweisungsDropdownProps) {
  const [suche, setSuche] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const gefiltert = kuenstler
    .filter(k => k.aktiv !== false)
    .filter(k => {
      if (!suche) return true;
      const q = suche.toLowerCase();
      const name = `${k.db_vorname} ${k.db_name}`.toLowerCase();
      return name.includes(q) || (k.kuenstler_nr ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aNr = a.kuenstler_nr ?? "";
      const bNr = b.kuenstler_nr ?? "";
      if (aNr && !bNr) return -1;
      if (!aNr && bNr) return 1;
      if (aNr && bNr) return aNr.localeCompare(bNr, "de", { numeric: true });
      return a.db_name.localeCompare(b.db_name, "de");
    });

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-2 border-b border-gray-100">
        <input
          autoFocus
          type="text"
          placeholder="Künstler suchen…"
          value={suche}
          onChange={e => setSuche(e.target.value)}
          className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-lions-blue"
        />
      </div>
      <div className="max-h-52 overflow-y-auto">
        {gefiltert.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">Keine Treffer</p>
        ) : (
          gefiltert.map(k => (
            <button
              key={k.id}
              onClick={() => onZuweisen(k.id)}
              className={`w-full text-left text-sm px-3 py-2 hover:bg-lions-blue/5 transition-colors ${
                platz.kuenstler_id === k.id ? "bg-lions-blue/10 font-medium text-lions-blue" : "text-gray-700"
              }`}
            >
              {k.kuenstler_nr && (
                <span className="font-mono text-xs text-gray-400 mr-2">{k.kuenstler_nr}</span>
              )}
              {k.db_name}, {k.db_vorname}
            </button>
          ))
        )}
      </div>
      {platz.kuenstler_id && (
        <div className="border-t border-gray-100 p-2">
          <button
            onClick={() => onZuweisen(null)}
            className="w-full text-xs text-red-500 hover:text-red-700 py-1 text-center"
          >
            Zuweisung aufheben
          </button>
        </div>
      )}
    </div>
  );
}

type PlatzKarteProps = {
  platz: Platz;
  kuenstler: Kuenstler[];
  isSelected: boolean;
  isSaving: boolean;
  onSelect: () => void;
  onZuweisen: (kuenstlerId: number | null) => void;
};

function PlatzKarte({ platz, kuenstler, isSelected, isSaving, onSelect, onZuweisen }: PlatzKarteProps) {
  const name = platz.kuenstler
    ? `${platz.kuenstler.db_name}, ${platz.kuenstler.db_vorname}`
    : null;

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        disabled={isSaving}
        className={`w-full text-left border-2 rounded-lg p-2 transition-all cursor-pointer ${KAT_COLORS[platz.platz_kategorie]} ${
          isSelected ? "ring-2 ring-lions-blue ring-offset-1" : ""
        } ${isSaving ? "opacity-50" : ""}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${KAT_BADGE[platz.platz_kategorie]}`}>
            {platz.position_nr}
          </span>
          <span className="text-xs text-gray-400">{platz.haenge_meter}</span>
        </div>
        {name ? (
          <p className="text-xs font-medium text-gray-700 leading-tight truncate">{name}</p>
        ) : (
          <p className="text-xs text-gray-300 italic">frei</p>
        )}
      </button>
      {isSelected && (
        <ZuweisungsDropdown
          platz={platz}
          kuenstler={kuenstler}
          onZuweisen={onZuweisen}
          onClose={onSelect}
        />
      )}
    </div>
  );
}

export default function AdminPlaetzePage() {
  const [plaetze, setPlaetze] = useState<Platz[]>([]);
  const [kuenstler, setKuenstler] = useState<Kuenstler[]>([]);
  const [raumplan, setRaumplan] = useState<Raumzuteilung[]>([]);
  const [laden, setLaden] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAllePlaetze(), getAlleKuenstler(true), getRaumplan()])
      .then(([ps, ks, rp]) => { setPlaetze(ps); setKuenstler(ks); setRaumplan(rp); })
      .catch(e => setFehler(e.message))
      .finally(() => setLaden(false));
  }, []);

  const handleZuweisen = useCallback(async (platz: Platz, kuenstlerId: number | null) => {
    setSelectedId(null);
    setSaving(platz.id);
    const prev = plaetze;
    setPlaetze(ps => ps.map(p => {
      if (p.id !== platz.id) return p;
      const k = kuenstlerId ? kuenstler.find(k => k.id === kuenstlerId) : undefined;
      return { ...p, kuenstler_id: kuenstlerId, kuenstler: k };
    }));
    try {
      const updated = await platzZuweisen(platz.id, kuenstlerId);
      setPlaetze(ps => ps.map(p => p.id === updated.id ? updated : p));
    } catch (e: unknown) {
      setPlaetze(prev);
      setFehler(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(null);
    }
  }, [plaetze, kuenstler]);

  if (laden) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  const plaetzeByRaum = RAUM_REIHENFOLGE.reduce<Record<string, Platz[]>>((acc, raum) => {
    acc[raum] = plaetze.filter(p => p.raum === raum).sort((a, b) => a.position_nr - b.position_nr);
    return acc;
  }, {});

  const belegt = plaetze.filter(p => p.kuenstler_id).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-lions-blue">Platzplan</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {belegt} von {plaetze.length} Plätzen belegt
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {([1, 2, 3, 4] as const).map(k => (
            <span key={k} className={`text-xs px-2 py-1 rounded border ${KAT_COLORS[k]}`}>
              Kat. {k}
            </span>
          ))}
        </div>
      </div>

      {fehler && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex justify-between">
          <span>{fehler}</span>
          <button onClick={() => setFehler(null)} className="text-red-400 hover:text-red-600 ml-3">×</button>
        </div>
      )}

      {RAUM_REIHENFOLGE.map(raum => {
        const raumPlaetze = plaetzeByRaum[raum] ?? [];
        if (raumPlaetze.length === 0) return null;
        const belegtInRaum = raumPlaetze.filter(p => p.kuenstler_id).length;
        return (
          <div key={raum} className="bg-white rounded-lg shadow-sm border">
            <div className="bg-lions-blue/5 border-b border-lions-blue/10 px-4 py-2 flex justify-between items-center">
              <h2 className="font-semibold text-gray-800 text-sm">{raumLabel(raum, raumplan)}</h2>
              <span className="text-xs text-gray-400">
                {belegtInRaum}/{raumPlaetze.length} belegt
              </span>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {raumPlaetze.map(platz => (
                <PlatzKarte
                  key={platz.id}
                  platz={platz}
                  kuenstler={kuenstler}
                  isSelected={selectedId === platz.id}
                  isSaving={saving === platz.id}
                  onSelect={() => setSelectedId(selectedId === platz.id ? null : platz.id)}
                  onZuweisen={(kid) => handleZuweisen(platz, kid)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

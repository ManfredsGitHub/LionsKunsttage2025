"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { getRaumplan, raumZuweisen } from "@/lib/api";
import type { Raumzuteilung } from "@/lib/types";

// Feste Layout-Definition — spiegelt den Grundriss wider
// Jede Zelle: { nr, label, colspan?, rowspan?, type }
type ZellenTyp = "raum" | "korridor" | "treppe" | "leer";

interface Zelle {
  nr?: string;       // Schlüssel für Raumzuteilung
  label: string;
  typ: ZellenTyp;
  colspan?: number;
  rowspan?: number;
}

// Raumfarben nach Belegung (feste Lions-Club-Farben)
const CLUB_FARBEN: Record<string, string> = {
  "Lions Club Annweiler":       "bg-blue-100 border-blue-400 text-blue-900",
  "Lions Club Bad Bergzabern":  "bg-emerald-100 border-emerald-400 text-emerald-900",
  "Lions Club Edenkoben":       "bg-purple-100 border-purple-400 text-purple-900",
  "Lions Club Germersheim":     "bg-orange-100 border-orange-400 text-orange-900",
  "gemeinsam":                  "bg-lions-blue/10 border-lions-blue/40 text-lions-blue",
  "Arno Mohr":                  "bg-amber-50 border-amber-300 text-amber-800",
  "BUJA / Volker Kratz":        "bg-pink-50 border-pink-300 text-pink-800",
};

const DEFAULT_FARBE = "bg-gray-50 border-gray-200 text-gray-500";
const FREI_FARBE    = "bg-white border-dashed border-gray-300 text-gray-300";

type EditDropdownProps = {
  raum: Raumzuteilung;
  onSave: (wert: string | null) => void;
  onClose: () => void;
};

function EditDropdown({ raum, onSave, onClose }: EditDropdownProps) {
  const [wert, setWert] = useState(raum.belegt_durch ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const vorschlaege = [
    "Lions Club Annweiler",
    "Lions Club Bad Bergzabern",
    "Lions Club Edenkoben",
    "Lions Club Germersheim",
    "gemeinsam",
    "Arno Mohr",
    "BUJA / Volker Kratz",
  ];

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Raum {raum.raum_nr}
      </div>
      <div className="p-2 space-y-1">
        {vorschlaege.map(v => (
          <button
            key={v}
            onClick={() => { setWert(v); onSave(v); }}
            className={`w-full text-left text-sm px-3 py-1.5 rounded transition-colors ${
              wert === v
                ? "bg-lions-blue/10 text-lions-blue font-medium"
                : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            {v}
          </button>
        ))}
        <div className="border-t border-gray-100 pt-1">
          <input
            type="text"
            value={wert}
            onChange={e => setWert(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onSave(wert || null); }}
            placeholder="Eigene Bezeichnung…"
            className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-lions-blue"
          />
        </div>
      </div>
      <div className="p-2 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => onSave(wert || null)}
          className="flex-1 bg-lions-blue text-white text-sm py-1 rounded hover:bg-blue-900 transition-colors"
        >
          Speichern
        </button>
        {raum.belegt_durch && (
          <button
            onClick={() => onSave(null)}
            className="text-sm text-red-500 hover:text-red-700 px-2"
          >
            Leer
          </button>
        )}
      </div>
    </div>
  );
}

type RaumKarteProps = {
  zelle: Zelle;
  zuteilung?: Raumzuteilung;
  isSaving: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onSave: (wert: string | null) => void;
};

function RaumKarte({ zelle, zuteilung, isSaving, isSelected, onSelect, onSave }: RaumKarteProps) {
  if (zelle.typ === "korridor") {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded text-xs text-gray-400 font-medium tracking-widest uppercase" style={{ writingMode: "horizontal-tb" }}>
        {zelle.label}
      </div>
    );
  }
  if (zelle.typ === "treppe") {
    return (
      <div className="flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-200 text-xs text-gray-300">
        {zelle.label}
      </div>
    );
  }
  if (zelle.typ === "leer") {
    return <div />;
  }

  const belegung = zuteilung?.belegt_durch;
  const farbe = belegung
    ? (CLUB_FARBEN[belegung] ?? DEFAULT_FARBE)
    : FREI_FARBE;

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        disabled={isSaving}
        className={`w-full h-full min-h-[80px] border-2 rounded-lg p-2 flex flex-col justify-between transition-all cursor-pointer ${farbe} ${
          isSelected ? "ring-2 ring-lions-blue ring-offset-1" : ""
        } ${isSaving ? "opacity-50" : ""}`}
      >
        <span className="text-xs font-bold opacity-60">{zelle.label}</span>
        {belegung ? (
          <span className="text-xs font-semibold leading-tight text-left">{belegung}</span>
        ) : (
          <span className="text-xs italic opacity-40">frei</span>
        )}
      </button>
      {isSelected && zuteilung && (
        <EditDropdown
          raum={zuteilung}
          onSave={(v) => { onSave(v); }}
          onClose={onSelect}
        />
      )}
    </div>
  );
}

export default function AdminRaumplanPage() {
  const [zuteilungen, setZuteilungen] = useState<Raumzuteilung[]>([]);
  const [laden, setLaden] = useState(true);
  const [selectedNr, setSelectedNr] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    getRaumplan()
      .then(setZuteilungen)
      .catch(e => setFehler(e.message))
      .finally(() => setLaden(false));
  }, []);

  const handleSave = useCallback(async (raumNr: string, belegtDurch: string | null) => {
    setSelectedNr(null);
    setSaving(raumNr);
    const prev = zuteilungen;
    setZuteilungen(zs => zs.map(z => z.raum_nr === raumNr ? { ...z, belegt_durch: belegtDurch } : z));
    try {
      const updated = await raumZuweisen(raumNr, belegtDurch);
      setZuteilungen(zs => zs.map(z => z.raum_nr === updated.raum_nr ? updated : z));
    } catch (e: unknown) {
      setZuteilungen(prev);
      setFehler(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(null);
    }
  }, [zuteilungen]);

  const byNr = Object.fromEntries(zuteilungen.map(z => [z.raum_nr, z]));

  // Grundriss-Layout: 3 Zeilen
  // Zeile 1: Räume 43–49 (7 Räume nebeneinander)
  // Zeile 2: Raum 42 | Korridor | (Platz für 50 existiert nicht)
  // Zeile 3: Flur (Arno Mohr, gesamt breit)
  // Zeile 4: Flur 2 (BUJA/Kratz, gesamt breit)

  if (laden) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  const raumZellen: Zelle[] = [
    { nr: "43", label: "Raum 43", typ: "raum" },
    { nr: "44", label: "Raum 44", typ: "raum" },
    { nr: "45", label: "Raum 45", typ: "raum" },
    { nr: "46", label: "Raum 46", typ: "raum" },
    { nr: "47", label: "Raum 47", typ: "raum" },
    { nr: "48", label: "Raum 48", typ: "raum" },
    { nr: "49", label: "Raum 49", typ: "raum" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-lions-blue">Raumplan</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Welcher Lions-Club belegt welchen Raum — Grundriss Obergeschoss
        </p>
      </div>

      {fehler && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex justify-between">
          <span>{fehler}</span>
          <button onClick={() => setFehler(null)} className="ml-3 text-red-400 hover:text-red-600">×</button>
        </div>
      )}

      {/* Legende */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(CLUB_FARBEN).map(([name, farbe]) => (
          <span key={name} className={`text-xs border px-2 py-0.5 rounded-full ${farbe}`}>
            {name}
          </span>
        ))}
      </div>

      {/* Grundriss */}
      <div className="bg-white rounded-xl shadow border overflow-hidden p-4">
        {/* Oberreihe: Räume 43–49 */}
        <div className="mb-1">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 font-medium">Ausstellungsräume</p>
          <div className="grid grid-cols-7 gap-2">
            {raumZellen.map(z => (
              <RaumKarte
                key={z.nr}
                zelle={z}
                zuteilung={byNr[z.nr!]}
                isSaving={saving === z.nr}
                isSelected={selectedNr === z.nr}
                onSelect={() => setSelectedNr(selectedNr === z.nr ? null : z.nr!)}
                onSave={v => handleSave(z.nr!, v)}
              />
            ))}
          </div>
        </div>

        {/* Trennlinie als stilisierter Korridor */}
        <div className="my-3 flex items-center gap-2">
          <div className="flex-1 h-6 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-xs text-gray-400 tracking-widest uppercase">Korridor</span>
          </div>
        </div>

        {/* Zweite Reihe: Raum 42 + leere Fläche */}
        <div className="mb-3">
          <div className="grid grid-cols-7 gap-2">
            <RaumKarte
              zelle={{ nr: "42", label: "Raum 42", typ: "raum" }}
              zuteilung={byNr["42"]}
              isSaving={saving === "42"}
              isSelected={selectedNr === "42"}
              onSelect={() => setSelectedNr(selectedNr === "42" ? null : "42")}
              onSave={v => handleSave("42", v)}
            />
            <div className="col-span-3 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                <span className="text-xs text-gray-300 text-center leading-tight">Treppen-<br/>haus</span>
              </div>
            </div>
            <div className="col-span-3" />
          </div>
        </div>

        {/* Flure */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Flure</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { nr: "Flur",  label: "Hauptflur" },
              { nr: "Flur2", label: "Flur 2" },
            ].map(({ nr, label }) => (
              <RaumKarte
                key={nr}
                zelle={{ nr, label, typ: "raum" }}
                zuteilung={byNr[nr]}
                isSaving={saving === nr}
                isSelected={selectedNr === nr}
                onSelect={() => setSelectedNr(selectedNr === nr ? null : nr)}
                onSave={v => handleSave(nr, v)}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Klick auf einen Raum → Belegung zuweisen oder ändern
      </p>
    </div>
  );
}

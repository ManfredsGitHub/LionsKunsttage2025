"use client";
import { useEffect, useState, useMemo } from "react";
import { getAlleBilder, massenFreigeben, bilderFreigeben, preisSetzen } from "@/lib/api";
import { Bild } from "@/lib/types";

type Filter = "alle" | "offen" | "mit_foto" | "ohne_foto";

export default function AdminBilderPage() {
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [preise, setPreise] = useState<Record<number, string>>({});
  const [auswahl, setAuswahl] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<Filter>("offen");
  const [laden, setLaden] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAlleBilder().then(setBilder).finally(() => setLaden(false));
  }, []);

  const sichtbar = useMemo(() => {
    switch (filter) {
      case "offen":     return bilder.filter(b => !b.freigegeben);
      case "mit_foto":  return bilder.filter(b => !!b.bild_url_web);
      case "ohne_foto": return bilder.filter(b => !b.bild_url_web);
      default:          return bilder;
    }
  }, [bilder, filter]);

  const alleAusgewaehlt = sichtbar.length > 0 && sichtbar.every(b => auswahl.has(b.id));

  function toggleAlle() {
    setAuswahl(alleAusgewaehlt ? new Set() : new Set(sichtbar.map(b => b.id)));
  }

  function toggleBild(id: number) {
    const next = new Set(auswahl);
    next.has(id) ? next.delete(id) : next.add(id);
    setAuswahl(next);
  }

  async function handleMassenfreigabe() {
    if (!auswahl.size || saving) return;
    setSaving(true);
    try {
      await massenFreigeben(Array.from(auswahl));
      const freigegebeneIds = new Set(auswahl);
      setBilder(prev => prev.map(b => freigegebeneIds.has(b.id) ? { ...b, freigegeben: true } : b));
      setAuswahl(new Set());
    } finally {
      setSaving(false);
    }
  }

  async function handleFreigeben(id: number) {
    await bilderFreigeben(id);
    setBilder(prev => prev.map(b => b.id === id ? { ...b, freigegeben: true } : b));
  }

  async function handlePreis(id: number) {
    const preis = parseFloat(preise[id] ?? "");
    if (!preis) return;
    await preisSetzen(id, preis);
    setBilder(prev => prev.map(b => b.id === id ? { ...b, verkaufspreis: preis } : b));
  }

  if (laden) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  const freigegebenCount = bilder.filter(b => b.freigegeben).length;
  const mitFotoCount = bilder.filter(b => !!b.bild_url_web).length;

  const filterTabs: { key: Filter; label: string; count: number }[] = [
    { key: "alle",      label: "Alle",              count: bilder.length },
    { key: "offen",     label: "Nicht freigegeben", count: bilder.filter(b => !b.freigegeben).length },
    { key: "mit_foto",  label: "Mit Foto",          count: mitFotoCount },
    { key: "ohne_foto", label: "Ohne Foto",         count: bilder.filter(b => !b.bild_url_web).length },
  ];

  return (
    <div className="space-y-4">
      {/* Kopfzeile */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-lions-blue">Bildverwaltung</h1>
        <p className="text-sm text-gray-500">
          {freigegebenCount}/{bilder.length} freigegeben · {mitFotoCount} mit Foto
        </p>
      </div>

      {/* Filter-Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map(t => (
          <button key={t.key}
            onClick={() => { setFilter(t.key); setAuswahl(new Set()); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === t.key
                ? "bg-lions-blue text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:border-lions-blue"
            }`}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Aktionsleiste */}
      <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 shadow-sm border">
        <div className="flex items-center gap-3">
          <input type="checkbox"
            checked={alleAusgewaehlt}
            onChange={toggleAlle}
            className="rounded cursor-pointer"
          />
          <span className="text-sm text-gray-600">
            {auswahl.size > 0 ? `${auswahl.size} ausgewählt` : `${sichtbar.length} Einträge`}
          </span>
          {auswahl.size > 0 && (
            <button onClick={() => setAuswahl(new Set())}
              className="text-xs text-gray-400 hover:text-gray-600 underline">
              Auswahl aufheben
            </button>
          )}
        </div>
        <button
          onClick={handleMassenfreigabe}
          disabled={auswahl.size === 0 || saving}
          className="px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md
            hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {saving ? "Wird freigegeben…" : `${auswahl.size > 0 ? auswahl.size : "—"} freigeben`}
        </button>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-3 w-8"></th>
              <th className="px-3 py-3 text-left whitespace-nowrap">Nr.</th>
              <th className="px-3 py-3 text-left">Titel · Künstler</th>
              <th className="px-3 py-3 text-center">Foto</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Status</th>
              <th className="px-3 py-3 text-right whitespace-nowrap">Einlief.</th>
              <th className="px-3 py-3 text-right whitespace-nowrap">Vorschlag</th>
              <th className="px-3 py-3 text-right whitespace-nowrap">Verkaufspreis</th>
              <th className="px-3 py-3 text-center">Freigabe</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sichtbar.map(b => (
              <tr key={b.id}
                onClick={() => toggleBild(b.id)}
                className={`cursor-pointer transition-colors ${
                  auswahl.has(b.id)
                    ? "bg-blue-50 hover:bg-blue-100"
                    : b.freigegeben
                    ? "hover:bg-gray-50"
                    : "bg-yellow-50 hover:bg-yellow-100"
                }`}>
                <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                  <input type="checkbox"
                    checked={auswahl.has(b.id)}
                    onChange={() => toggleBild(b.id)}
                    className="rounded cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-gray-400 whitespace-nowrap">
                  {b.bild_nr}
                </td>
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <div className="font-medium leading-tight">{b.bildtitel}</div>
                  {b.kuenstler && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {b.kuenstler.db_vorname} {b.kuenstler.db_name}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center">
                  {b.bild_url_web
                    ? <span className="text-green-600 text-base">✓</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    b.verfuegbarkeit === "Verfügbar"  ? "bg-green-100 text-green-700" :
                    b.verfuegbarkeit === "Reserviert" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>{b.verfuegbarkeit}</span>
                </td>
                <td className="px-3 py-2.5 text-right text-gray-500 whitespace-nowrap">
                  {b.einlieferungspreis ? `${b.einlieferungspreis} €` : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-gray-500 whitespace-nowrap">
                  {b.verkaufspreis_vorschlag ? `${b.verkaufspreis_vorschlag} €` : "—"}
                </td>
                <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <input
                      type="number"
                      value={preise[b.id] ?? b.verkaufspreis ?? ""}
                      onChange={e => setPreise({ ...preise, [b.id]: e.target.value })}
                      className="w-20 border rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-lions-blue"
                    />
                    <button onClick={() => handlePreis(b.id)}
                      className="text-xs text-lions-blue underline whitespace-nowrap">
                      setzen
                    </button>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                  {b.freigegeben ? (
                    <span className="text-green-600 text-base">✓</span>
                  ) : (
                    <button onClick={() => handleFreigeben(b.id)}
                      className="text-xs bg-lions-blue text-white px-2 py-1 rounded hover:bg-blue-900 transition-colors whitespace-nowrap">
                      Freigeben
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sichtbar.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">
            Keine Einträge für diesen Filter.
          </p>
        )}
      </div>
    </div>
  );
}

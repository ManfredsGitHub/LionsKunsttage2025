"use client";
import { useEffect, useState, useMemo } from "react";
import { getAlleBilder, massenFreigeben, bilderFreigeben, preisSetzen, ausstellungToggle, bildAktualisieren } from "@/lib/api";
import { Bild, VERFUEGBARKEIT } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";
import { NeuModal } from "./_components/NeuModal";
import { BildBearbeitenModal } from "./_components/BildBearbeitenModal";

type Filter = "alle" | "offen" | "mit_foto" | "ohne_foto" | "online" | "verfuegbar" | "nicht_verfuegbar" | "nachfragen" | "reserviert" | "verkauft";
type SortKey = "kuenstler" | "titel" | "bild_nr" | "genre" | "einlieferungspreis" | "verkaufspreis";
type SortDir = "asc" | "desc";

export default function AdminBilderPage() {
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [preise, setPreise] = useState<Record<number, string>>({});
  const [auswahl, setAuswahl] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<Filter>("offen");
  const [sortKey, setSortKey] = useState<SortKey>("kuenstler");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [kuenstlerFilter, setKuenstlerFilter] = useState<number | null>(null);
  const [kuenstlerImGaleristFilter, setKuenstlerImGaleristFilter] = useState<number | null>(null);
  const [laden, setLaden] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNeu, setShowNeu] = useState(false);
  const [editBild, setEditBild] = useState<Bild | null>(null);

  useEffect(() => {
    getAlleBilder().then(setBilder).finally(() => setLaden(false));
  }, []);

  const gefiltertOhneKuenstler = useMemo(() => {
    switch (filter) {
      case "offen":      return bilder.filter(b => !b.freigegeben);
      case "mit_foto":   return bilder.filter(b => !!b.bild_url_web);
      case "ohne_foto":  return bilder.filter(b => !b.bild_url_web);
      case "online":     return bilder.filter(b => b.in_ausstellung === false);
      case "verfuegbar":       return bilder.filter(b => b.verfuegbarkeit === VERFUEGBARKEIT.VERFUEGBAR);
      case "nicht_verfuegbar": return bilder.filter(b => b.verfuegbarkeit === VERFUEGBARKEIT.NICHT);
      case "nachfragen":       return bilder.filter(b => b.verfuegbarkeit === VERFUEGBARKEIT.NACHFRAGEN);
      case "reserviert":       return bilder.filter(b => b.verfuegbarkeit === VERFUEGBARKEIT.RESERVIERT);
      case "verkauft":         return bilder.filter(b => b.verfuegbarkeit === VERFUEGBARKEIT.VERKAUFT);
      default:          return bilder;
    }
  }, [bilder, filter]);

  const kuenstlerListe = useMemo(() => {
    const seen = new Map<number, { label: string; isGalerist: boolean }>();
    for (const b of gefiltertOhneKuenstler) {
      if (b.kuenstler && !seen.has(b.kuenstler_id)) {
        seen.set(b.kuenstler_id, { label: `${b.kuenstler.db_name}, ${b.kuenstler.db_vorname}`, isGalerist: false });
      }
      if (b.galerist && b.galerist_id && !seen.has(-b.galerist_id)) {
        seen.set(-b.galerist_id, { label: `${b.galerist.db_name}, ${b.galerist.db_vorname} (Galerist)`, isGalerist: true });
      }
    }
    return [...seen.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label));
  }, [gefiltertOhneKuenstler]);

  const sichtbar = useMemo(() => {
    const gefiltert = gefiltertOhneKuenstler.filter(b => {
      if (kuenstlerFilter === null) return true;
      if (kuenstlerFilter < 0) return b.galerist_id === -kuenstlerFilter;
      return b.kuenstler_id === kuenstlerFilter;
    }).filter(b => kuenstlerImGaleristFilter === null || b.kuenstler_id === kuenstlerImGaleristFilter);
    return [...gefiltert].sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      switch (sortKey) {
        case "kuenstler":
          va = `${a.kuenstler?.db_name ?? ""} ${a.kuenstler?.db_vorname ?? ""}`.toLowerCase();
          vb = `${b.kuenstler?.db_name ?? ""} ${b.kuenstler?.db_vorname ?? ""}`.toLowerCase();
          break;
        case "titel":
          va = a.bildtitel.toLowerCase(); vb = b.bildtitel.toLowerCase(); break;
        case "bild_nr":
          va = a.bild_nr; vb = b.bild_nr; break;
        case "genre":
          va = a.genre; vb = b.genre; break;
        case "einlieferungspreis":
          va = a.einlieferungspreis ?? 0; vb = b.einlieferungspreis ?? 0; break;
        case "verkaufspreis":
          va = a.verkaufspreis ?? 0; vb = b.verkaufspreis ?? 0; break;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [gefiltertOhneKuenstler, sortKey, sortDir, kuenstlerFilter, kuenstlerImGaleristFilter]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-lions-blue ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const alleAusgewaehlt = sichtbar.length > 0 && sichtbar.every(b => auswahl.has(b.id));

  function toggleAlle() {
    setAuswahl(alleAusgewaehlt ? new Set() : new Set(sichtbar.map(b => b.id)));
  }

  function toggleBild(id: number) {
    const next = new Set(auswahl);
    next.has(id) ? next.delete(id) : next.add(id);
    setAuswahl(next);
  }

  const alleAuswahlFreigegeben = auswahl.size > 0 &&
    [...auswahl].every(id => bilder.find(b => b.id === id)?.freigegeben);

  async function handleMassenfreigabe() {
    if (!auswahl.size || saving) return;
    setSaving(true);
    const neuerWert = !alleAuswahlFreigegeben;
    try {
      await massenFreigeben(Array.from(auswahl), neuerWert);
      const ids = new Set(auswahl);
      setBilder(prev => prev.map(b => ids.has(b.id) ? { ...b, freigegeben: neuerWert } : b));
      setAuswahl(new Set());
    } finally {
      setSaving(false);
    }
  }

  async function handleFreigeben(id: number) {
    await bilderFreigeben(id);
    setBilder(prev => prev.map(b => b.id === id ? { ...b, freigegeben: true } : b));
  }

  async function handleFreigabeToggle(id: number, aktuell: boolean) {
    await bildAktualisieren(id, { freigegeben: !aktuell });
    setBilder(prev => prev.map(b => b.id === id ? { ...b, freigegeben: !aktuell } : b));
  }


  async function handlePreis(id: number) {
    const preis = parseFloat(preise[id] ?? "");
    if (!preis) return;
    await preisSetzen(id, preis);
    setBilder(prev => prev.map(b => b.id === id ? { ...b, verkaufspreis: preis } : b));
  }

  async function handleAusstellungToggle(id: number, inAusstellung: boolean) {
    await ausstellungToggle(id, inAusstellung);
    setBilder(prev => prev.map(b => b.id === id ? { ...b, in_ausstellung: inAusstellung } : b));
  }

  function handleEditSaved(updated: Bild) {
    setBilder(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
    setEditBild(null);
  }

  function handleDeleted(id: number) {
    setBilder(prev => prev.filter(b => b.id !== id));
    setEditBild(null);
  }

  if (laden) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  const freigegebenCount = bilder.filter(b => b.freigegeben).length;
  const mitFotoCount = bilder.filter(b => !!b.bild_url_web).length;

  function handleCreated(b: Bild) {
    setBilder(prev => [b, ...prev]);
    setShowNeu(false);
    setFilter("offen");
  }

  const filterTabs: { key: Filter; label: string; count: number; color?: string }[] = [
    { key: "alle",       label: "Alle",              count: bilder.length },
    { key: "offen",      label: "Nicht freigegeben", count: bilder.filter(b => !b.freigegeben).length },
    { key: "mit_foto",   label: "Mit Foto",          count: mitFotoCount },
    { key: "ohne_foto",  label: "Ohne Foto",         count: bilder.filter(b => !b.bild_url_web).length },
    { key: "online",     label: "Nur Online",        count: bilder.filter(b => b.in_ausstellung === false).length },
    { key: "verfuegbar",       label: "Verfügbar",       count: bilder.filter(b => b.verfuegbarkeit === VERFUEGBARKEIT.VERFUEGBAR).length,  color: "green" },
    { key: "nicht_verfuegbar", label: "Nicht verfügbar", count: bilder.filter(b => b.verfuegbarkeit === VERFUEGBARKEIT.NICHT).length,        color: "gray" },
    { key: "nachfragen",       label: "Nachfragen",      count: bilder.filter(b => b.verfuegbarkeit === VERFUEGBARKEIT.NACHFRAGEN).length,   color: "blue" },
    { key: "reserviert",       label: "Reserviert",      count: bilder.filter(b => b.verfuegbarkeit === VERFUEGBARKEIT.RESERVIERT).length,   color: "yellow" },
    { key: "verkauft",         label: "Verkauft",        count: bilder.filter(b => b.verfuegbarkeit === VERFUEGBARKEIT.VERKAUFT).length,     color: "red" },
  ];

  return (
    <div className="space-y-4">
      {showNeu && <NeuModal onClose={() => setShowNeu(false)} onCreated={handleCreated} />}
      {editBild && <BildBearbeitenModal bild={editBild} onClose={() => setEditBild(null)} onSaved={handleEditSaved} onDeleted={handleDeleted} />}
      {/* Kopfzeile */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-lions-blue">Bildverwaltung</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">
            {freigegebenCount}/{bilder.length} freigegeben · {mitFotoCount} mit Foto
          </p>
          <button onClick={() => setShowNeu(true)}
            className="px-4 py-1.5 bg-lions-blue text-white text-sm font-medium rounded-md hover:bg-blue-900 transition-colors">
            + Neues Bild
          </button>
        </div>
      </div>

      {/* Filter-Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map(t => {
          const aktiv = filter === t.key;
          const aktivClass =
            t.color === "green"  ? "bg-green-600 text-white" :
            t.color === "yellow" ? "bg-yellow-500 text-white" :
            t.color === "red"    ? "bg-red-600 text-white" :
            "bg-lions-blue text-white";
          const inaktivClass =
            t.color === "green"  ? "bg-white text-green-700 border border-green-200 hover:border-green-500" :
            t.color === "yellow" ? "bg-white text-yellow-700 border border-yellow-200 hover:border-yellow-500" :
            t.color === "red"    ? "bg-white text-red-700 border border-red-200 hover:border-red-500" :
            "bg-white text-gray-600 border border-gray-200 hover:border-lions-blue";
          return (
            <button key={t.key}
              onClick={() => { setFilter(t.key); setAuswahl(new Set()); setKuenstlerFilter(null); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${aktiv ? aktivClass : inaktivClass}`}>
              {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      {/* Aktionsleiste */}
      <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 shadow-sm border gap-4">
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
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Künstler:</label>
          <select
            value={kuenstlerFilter ?? ""}
            onChange={e => { setKuenstlerFilter(e.target.value ? Number(e.target.value) : null); setKuenstlerImGaleristFilter(null); }}
            className="border rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-lions-blue min-w-[200px]"
          >
            <option value="">— Alle Künstler —</option>
            {kuenstlerListe.map(([id, { label }]) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
          {kuenstlerFilter !== null && (
            <button onClick={() => { setKuenstlerFilter(null); setKuenstlerImGaleristFilter(null); }}
              className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          )}
        </div>
        {kuenstlerFilter !== null && kuenstlerFilter < 0 && (() => {
          const galeristBilder = gefiltertOhneKuenstler.filter(b => b.galerist_id === -kuenstlerFilter);
          const künstlerImGalerist = [...new Map(galeristBilder.filter(b => b.kuenstler).map(b => [b.kuenstler_id, `${b.kuenstler!.db_name}, ${b.kuenstler!.db_vorname}`])).entries()].sort((a,b) => a[1].localeCompare(b[1]));
          return (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 whitespace-nowrap">Künstler im Galerist:</label>
              <select
                value={kuenstlerImGaleristFilter ?? ""}
                onChange={e => setKuenstlerImGaleristFilter(e.target.value ? Number(e.target.value) : null)}
                className="border rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-lions-blue min-w-[180px]"
              >
                <option value="">— Alle —</option>
                {künstlerImGalerist.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              {kuenstlerImGaleristFilter !== null && (
                <button onClick={() => setKuenstlerImGaleristFilter(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
              )}
            </div>
          );
        })()}
        <button
          onClick={handleMassenfreigabe}
          disabled={auswahl.size === 0 || saving}
          className={`px-4 py-1.5 text-white text-sm font-medium rounded-md transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
            ${alleAuswahlFreigegeben ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"}`}>
          {saving
            ? "Wird gespeichert…"
            : auswahl.size === 0
            ? "— freigeben"
            : alleAuswahlFreigegeben
            ? `${auswahl.size} Freigabe zurückziehen`
            : `${auswahl.size} freigeben`}
        </button>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-2 py-2 w-8"></th>
              <th className="px-2 py-2 text-left whitespace-nowrap cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort("bild_nr")}>
                Nr.<SortIcon col="bild_nr" />
              </th>
              <th className="px-2 py-2 text-left cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort("kuenstler")}>
                Künstler<SortIcon col="kuenstler" />
              </th>
              <th className="px-2 py-2 text-center">Foto</th>
              <th className="px-2 py-2 text-left cursor-pointer select-none hover:text-gray-700" style={{minWidth:"200px"}} onClick={() => handleSort("titel")}>
                Titel<SortIcon col="titel" />
              </th>
              <th className="px-2 py-2 text-left cursor-pointer select-none hover:text-gray-700" style={{width:"120px",maxWidth:"120px"}} onClick={() => handleSort("genre")}>
                Technik · Genre<SortIcon col="genre" />
              </th>
              <th className="px-2 py-2 text-right whitespace-nowrap">
                <div>Maße (cm)</div>
                <div className="font-normal normal-case text-gray-400">B × H × (T)</div>
              </th>
              <th className="px-2 py-2 text-center whitespace-nowrap">Status · Ausst.</th>
              <th className="px-2 py-2 text-right cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort("einlieferungspreis")}>
                <div>Einlief.<SortIcon col="einlieferungspreis" /></div>
                <div>Vorschlag</div>
              </th>
              <th className="px-2 py-2 text-right whitespace-nowrap cursor-pointer select-none hover:text-gray-700" onClick={() => handleSort("verkaufspreis")}>
                <div>Verkauf<SortIcon col="verkaufspreis" /></div>
                <div className="font-normal normal-case text-gray-400">Euro</div>
              </th>
              <th className="px-2 py-2 text-center">Freigabe</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sichtbar.map(b => (
              <tr key={b.id}
                onClick={() => setEditBild(b)}
                className={`cursor-pointer transition-colors ${
                  auswahl.has(b.id)
                    ? "bg-blue-50 hover:bg-blue-100"
                    : b.freigegeben
                    ? "hover:bg-gray-100"
                    : "bg-yellow-50 hover:bg-yellow-100"
                }`}>
                <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                  <input type="checkbox"
                    checked={auswahl.has(b.id)}
                    onChange={() => toggleBild(b.id)}
                    className="rounded cursor-pointer"
                  />
                </td>
                <td className="px-2 py-1.5 font-mono text-xs text-gray-400 whitespace-nowrap">
                  {formatBildNr(b.bild_nr)}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {b.kuenstler && (
                    <div className="text-sm font-medium text-gray-700">
                      {b.kuenstler.db_name},
                    </div>
                  )}
                  {b.kuenstler && (
                    <div className="text-xs text-gray-500">
                      {b.kuenstler.db_vorname}
                    </div>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {b.bild_url_web ? (
                    <img
                      src={`http://localhost:8000${b.bild_url_web}`}
                      alt={b.bildtitel}
                      className="w-9 h-9 object-cover rounded mx-auto"
                    />
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-2 py-1.5" style={{minWidth:"200px"}}>
                  <div className="font-medium leading-tight">{b.bildtitel}</div>
                  {b.anmerkung_bild && (
                    <div className="text-xs text-amber-600 mt-0.5 leading-snug line-clamp-2">{b.anmerkung_bild}</div>
                  )}
                </td>
                <td className="px-2 py-1.5" style={{width:"120px",maxWidth:"120px"}}>
                  <div className="text-xs text-gray-600 truncate">{b.bildtechnik || "—"}</div>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 mt-0.5 inline-block">
                    {b.genre}
                  </span>
                  {b.abrechnungsempf && b.abrechnungsempf !== "Künstler" && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${
                      b.abrechnungsempf === "Galerist" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {b.abrechnungsempf}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5 text-right text-xs text-gray-600 whitespace-nowrap">
                  <div>
                    {b.breite_rahmen_cm && b.hoehe_rahmen_cm
                      ? `${b.breite_rahmen_cm} × ${b.hoehe_rahmen_cm}`
                      : "—"}
                  </div>
                  {(b.breite_cm || b.hoehe_cm || b.tiefe_cm) && (
                    <div className="text-gray-400">
                      {[b.breite_cm, b.hoehe_cm, b.tiefe_cm]
                        .filter(v => v != null)
                        .join(" × ")}
                    </div>
                  )}
                </td>
                <td className="px-2 py-1.5 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    b.verfuegbarkeit === VERFUEGBARKEIT.VERFUEGBAR ? "bg-green-100 text-green-700" :
                    b.verfuegbarkeit === VERFUEGBARKEIT.NICHT       ? "bg-gray-100 text-gray-600" :
                    b.verfuegbarkeit === VERFUEGBARKEIT.NACHFRAGEN  ? "bg-blue-100 text-blue-700" :
                    b.verfuegbarkeit === VERFUEGBARKEIT.RESERVIERT  ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>{b.verfuegbarkeit === VERFUEGBARKEIT.NACHFRAGEN ? "Nachfragen" : b.verfuegbarkeit}</span>
                  <div className="mt-1">
                    <button
                      onClick={() => handleAusstellungToggle(b.id, !(b.in_ausstellung !== false))}
                      title={b.in_ausstellung !== false ? "In Ausstellung — klicken für Online-only" : "Nur Online — klicken für Ausstellung"}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                        b.in_ausstellung !== false
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}>
                      {b.in_ausstellung !== false ? "Ausst." : "Online"}
                    </button>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-right text-gray-500 whitespace-nowrap">
                  <div>{b.einlieferungspreis ? `${b.einlieferungspreis} €` : "—"}</div>
                  <div className="text-gray-400">{b.verkaufspreis_vorschlag ? `${b.verkaufspreis_vorschlag} €` : "—"}</div>
                </td>
                <td className="px-2 py-1.5 text-right" onClick={e => e.stopPropagation()}>
                  <input
                    type="number"
                    value={preise[b.id] ?? b.verkaufspreis ?? ""}
                    onChange={e => setPreise({ ...preise, [b.id]: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && handlePreis(b.id)}
                    className="w-16 border rounded px-1.5 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-lions-blue"
                    placeholder="€"
                    title="Enter zum Speichern"
                  />
                </td>
                <td className="px-2 py-1.5 text-center" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => { e.stopPropagation(); handleFreigabeToggle(b.id, !!b.freigegeben); }}
                    title={b.freigegeben ? "Freigabe zurückziehen" : "Freigeben"}
                    className={`text-xs px-2 py-1 rounded transition-colors whitespace-nowrap ${
                      b.freigegeben
                        ? "text-green-700 bg-green-100 hover:bg-red-100 hover:text-red-700"
                        : "bg-lions-blue text-white hover:bg-blue-900"
                    }`}>
                    {b.freigegeben ? "✓ Freigegeben" : "Freigeben"}
                  </button>
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

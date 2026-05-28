"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { getAlleBilder, massenFreigeben, bilderFreigeben, preisSetzen, fotoHochladen, getAlleKuenstler, bildNeuAnlegen, ausstellungToggle } from "@/lib/api";
import { Bild, Kuenstler } from "@/lib/types";

const GENRES = ["Abstrakt","Akt","Landschaft","Menschen","Pfalz","Portrait","Städte","Stilleben","Sonstiges"];
type Filter = "alle" | "offen" | "mit_foto" | "ohne_foto" | "online";

function NeuModal({ onClose, onCreated }: { onClose: () => void; onCreated: (b: Bild) => void }) {
  const [kuenstler, setKuenstler] = useState<Kuenstler[]>([]);
  const [form, setForm] = useState({
    kuenstler_id: "", bildtitel: "", bildtechnik: "", genre: "Abstrakt",
    breite_rahmen_cm: "", hoehe_rahmen_cm: "", einlieferungspreis: "",
    in_ausstellung: true,
  });
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState("");

  useEffect(() => { getAlleKuenstler().then(setKuenstler); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLaden(true); setFehler("");
    try {
      const bild = await bildNeuAnlegen({
        kuenstler_id: Number(form.kuenstler_id),
        bildtitel: form.bildtitel,
        bildtechnik: form.bildtechnik,
        genre: form.genre,
        breite_rahmen_cm: Number(form.breite_rahmen_cm) || 0,
        hoehe_rahmen_cm: Number(form.hoehe_rahmen_cm) || 0,
        einlieferungspreis: form.einlieferungspreis ? Number(form.einlieferungspreis) : undefined,
        in_ausstellung: form.in_ausstellung,
      });
      onCreated(bild);
    } catch (err: any) { setFehler(err.message); }
    finally { setLaden(false); }
  }

  const inp = "w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Neues Bild anlegen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Künstler *</label>
            <select required value={form.kuenstler_id} onChange={e => setForm({...form, kuenstler_id: e.target.value})} className={inp}>
              <option value="">— bitte wählen —</option>
              {kuenstler.map(k => (
                <option key={k.id} value={k.id}>{k.db_vorname} {k.db_name} ({k.kuenstlertyp})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bildtitel *</label>
            <input required value={form.bildtitel} onChange={e => setForm({...form, bildtitel: e.target.value})} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Technik *</label>
              <input required value={form.bildtechnik} onChange={e => setForm({...form, bildtechnik: e.target.value})} placeholder="z.B. Acryl auf Leinwand" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Genre *</label>
              <select required value={form.genre} onChange={e => setForm({...form, genre: e.target.value})} className={inp}>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Breite (cm)</label>
              <input type="number" value={form.breite_rahmen_cm} onChange={e => setForm({...form, breite_rahmen_cm: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Höhe (cm)</label>
              <input type="number" value={form.hoehe_rahmen_cm} onChange={e => setForm({...form, hoehe_rahmen_cm: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Einlief.-Preis (€)</label>
              <input type="number" value={form.einlieferungspreis} onChange={e => setForm({...form, einlieferungspreis: e.target.value})} className={inp} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.in_ausstellung}
              onChange={e => setForm({...form, in_ausstellung: e.target.checked})}
              className="rounded" />
            In der Ausstellung (nicht nur online)
          </label>
          {fehler && <p className="text-red-600 text-sm">{fehler}</p>}
          <button type="submit" disabled={laden}
            className="w-full bg-lions-blue text-white py-2.5 rounded-md font-medium hover:bg-blue-900 transition-colors disabled:opacity-50 mt-2">
            {laden ? "Wird angelegt…" : "Bild anlegen"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminBilderPage() {
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [preise, setPreise] = useState<Record<number, string>>({});
  const [auswahl, setAuswahl] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<Filter>("offen");
  const [laden, setLaden] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [showNeu, setShowNeu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAlleBilder().then(setBilder).finally(() => setLaden(false));
  }, []);

  const sichtbar = useMemo(() => {
    switch (filter) {
      case "offen":     return bilder.filter(b => !b.freigegeben);
      case "mit_foto":  return bilder.filter(b => !!b.bild_url_web);
      case "ohne_foto": return bilder.filter(b => !b.bild_url_web);
      case "online":    return bilder.filter(b => b.in_ausstellung === false);
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

  function handleFotoKlick(id: number) {
    setUploadingId(id);
    fileInputRef.current!.value = "";
    fileInputRef.current!.click();
  }

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadingId) return;
    try {
      const { bild_url_web } = await fotoHochladen(uploadingId, file);
      setBilder(prev => prev.map(b => b.id === uploadingId ? { ...b, bild_url_web } : b));
    } catch (err: any) {
      alert(`Fehler: ${err.message}`);
    } finally {
      setUploadingId(null);
    }
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

  if (laden) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  const freigegebenCount = bilder.filter(b => b.freigegeben).length;
  const mitFotoCount = bilder.filter(b => !!b.bild_url_web).length;

  function handleCreated(b: Bild) {
    setBilder(prev => [b, ...prev]);
    setShowNeu(false);
    setFilter("offen");
  }

  const filterTabs: { key: Filter; label: string; count: number }[] = [
    { key: "alle",      label: "Alle",              count: bilder.length },
    { key: "offen",     label: "Nicht freigegeben", count: bilder.filter(b => !b.freigegeben).length },
    { key: "mit_foto",  label: "Mit Foto",          count: mitFotoCount },
    { key: "ohne_foto", label: "Ohne Foto",         count: bilder.filter(b => !b.bild_url_web).length },
    { key: "online",    label: "Nur Online",        count: bilder.filter(b => b.in_ausstellung === false).length },
  ];

  return (
    <div className="space-y-4">
      {showNeu && <NeuModal onClose={() => setShowNeu(false)} onCreated={handleCreated} />}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
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
              <th className="px-3 py-3 text-center whitespace-nowrap">Ausst.</th>
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
                <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                  {b.bild_url_web ? (
                    <span className="text-green-600 text-base" title={b.bild_url_web}>✓</span>
                  ) : uploadingId === b.id ? (
                    <span className="text-xs text-gray-400 animate-pulse">lädt…</span>
                  ) : (
                    <button
                      onClick={() => handleFotoKlick(b.id)}
                      className="text-xs text-lions-blue underline hover:text-blue-900 whitespace-nowrap">
                      + Foto
                    </button>
                  )}
                </td>
                <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    b.verfuegbarkeit === "Verfügbar"  ? "bg-green-100 text-green-700" :
                    b.verfuegbarkeit === "Reserviert" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>{b.verfuegbarkeit}</span>
                </td>
                <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleAusstellungToggle(b.id, !(b.in_ausstellung !== false))}
                    title={b.in_ausstellung !== false ? "In Ausstellung — klicken für Online-only" : "Nur Online — klicken für Ausstellung"}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                      b.in_ausstellung !== false
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}>
                    {b.in_ausstellung !== false ? "Ja" : "Online"}
                  </button>
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

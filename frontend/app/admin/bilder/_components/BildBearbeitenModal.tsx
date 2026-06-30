"use client";
import { useEffect, useState, useRef } from "react";
import { getAlleKuenstler, fotoHochladen, bildAktualisieren, bildLoeschen, aiBeschreibungGenerieren, getZusatzFotos, zusatzFotoHochladen, zusatzFotoLoeschen } from "@/lib/api";
import { Bild, Kuenstler, BildFoto, Verfuegbarkeit, VERFUEGBARKEIT } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";

const GENRES = ["Abstrakt","Akt","Landschaft","Menschen","Pfalz","Portrait","Städte","Stilleben","Sonstiges"];

export function BildBearbeitenModal({ bild, onClose, onSaved, onDeleted }: { bild: Bild; onClose: () => void; onSaved: (b: Bild) => void; onDeleted: (id: number) => void }) {
  const [form, setForm] = useState({
    bildtitel: bild.bildtitel,
    bildtechnik: bild.bildtechnik,
    genre: bild.genre,
    breite_rahmen_cm: String(bild.breite_rahmen_cm ?? ""),
    hoehe_rahmen_cm: String(bild.hoehe_rahmen_cm ?? ""),
    breite_cm: String(bild.breite_cm ?? ""),
    hoehe_cm: String(bild.hoehe_cm ?? ""),
    tiefe_cm: String(bild.tiefe_cm ?? ""),
    gewicht_kg: String(bild.gewicht_kg ?? ""),
    einlieferungspreis: String(bild.einlieferungspreis ?? ""),
    verkaufspreis: String(bild.verkaufspreis ?? ""),
    anmerkung_bild: bild.anmerkung_bild ?? "",
    foto_nr: (bild as any).foto_nr ?? "",
    in_ausstellung: bild.in_ausstellung !== false,
    freigegeben: bild.freigegeben ?? false,
    abrechnungsempf: bild.abrechnungsempf ?? "Künstler",
    galerist_id: String(bild.galerist_id ?? ""),
    verfuegbarkeit: bild.verfuegbarkeit ?? VERFUEGBARKEIT.VERFUEGBAR,
  });
  const [kuenstler, setKuenstler] = useState<Kuenstler[]>([]);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState("");

  useEffect(() => { getAlleKuenstler().then(setKuenstler).catch(() => {}); }, []);

  const [loeschenBestaetigt, setLoeschenBestaetigt] = useState(false);
  const [fotoUrl, setFotoUrl] = useState(bild.bild_url_web ?? "");
  const [fotoLaedt, setFotoLaedt] = useState(false);
  const [aiLaedt, setAiLaedt] = useState(false);
  const [kiHook, setKiHook] = useState(bild.ki_hook ?? "");
  const [zusatzFotos, setZusatzFotos] = useState<BildFoto[]>([]);
  const [zusatzLaedt, setZusatzLaedt] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const zusatzInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxUrl(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    getZusatzFotos(bild.id).then(setZusatzFotos).catch(() => {});
  }, [bild.id]);
  const inp = "w-full border rounded-md px-3 py-1.5 text-sm bg-gray-100 focus:outline-none focus:ring-1 focus:ring-lions-blue";

  async function handleFotoWechsel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoLaedt(true);
    try {
      const { bild_url_web } = await fotoHochladen(bild.id, file);
      setFotoUrl(bild_url_web);
    } catch (err: any) {
      setFehler(err.message);
    } finally {
      setFotoLaedt(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLaden(true); setFehler("");
    try {
      const updated = await bildAktualisieren(bild.id, {
        bildtitel: form.bildtitel,
        bildtechnik: form.bildtechnik,
        genre: form.genre,
        breite_rahmen_cm: Number(form.breite_rahmen_cm) || 0,
        hoehe_rahmen_cm: Number(form.hoehe_rahmen_cm) || 0,
        ...(form.breite_cm ? { breite_cm: Number(form.breite_cm) } : {}),
        ...(form.hoehe_cm ? { hoehe_cm: Number(form.hoehe_cm) } : {}),
        ...(form.tiefe_cm ? { tiefe_cm: Number(form.tiefe_cm) } : {}),
        ...(form.gewicht_kg ? { gewicht_kg: Number(form.gewicht_kg) } : {}),
        ...(form.einlieferungspreis ? { einlieferungspreis: Number(form.einlieferungspreis) } : {}),
        ...(form.verkaufspreis ? { verkaufspreis: Number(form.verkaufspreis) } : {}),
        anmerkung_bild: form.anmerkung_bild || undefined,
        foto_nr: form.foto_nr || undefined,
        in_ausstellung: form.in_ausstellung,
        freigegeben: form.freigegeben,
        abrechnungsempf: form.abrechnungsempf,
        galerist_id: form.abrechnungsempf === "Galerist" && form.galerist_id ? Number(form.galerist_id) : null,
        verfuegbarkeit: form.verfuegbarkeit,
      });
      onSaved(updated);
    } catch (err: any) { setFehler(err.message); }
    finally { setLaden(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Bild bearbeiten</h2>
            <p className="text-xs text-gray-400 font-mono">{formatBildNr(bild.bild_nr)}</p>
            {bild.kuenstler && (
              <p className="text-sm font-medium text-gray-700 mt-0.5">
                {bild.kuenstler.db_name}, {bild.kuenstler.db_vorname}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {loeschenBestaetigt ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">Wirklich löschen?</span>
                <button type="button" onClick={async () => { await bildLoeschen(bild.id); onDeleted(bild.id); }}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">Ja</button>
                <button type="button" onClick={() => setLoeschenBestaetigt(false)}
                  className="px-2 py-1 text-xs text-gray-600 border rounded hover:bg-gray-100">Nein</button>
              </div>
            ) : (
              <button type="button" onClick={() => setLoeschenBestaetigt(true)}
                className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-2 py-1 rounded transition-colors">
                Bild löschen
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>
        </div>

        {/* Fotos — max. 3 gesamt */}
        <div className="mb-4">
          <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoWechsel} />
          <input ref={zusatzInputRef} type="file" accept="image/*" className="hidden" onChange={async e => {
            const file = e.target.files?.[0];
            if (!file) return;
            setZusatzLaedt(true);
            try {
              const foto = await zusatzFotoHochladen(bild.id, file);
              setZusatzFotos(prev => [...prev, foto]);
            } catch (err: any) { setFehler(err.message); }
            finally { setZusatzLaedt(false); e.target.value = ""; }
          }} />

          {/* Lightbox */}
          {lightboxUrl && (
            <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
              onClick={() => setLightboxUrl(null)}>
              <img src={`http://localhost:8000${lightboxUrl}`} alt=""
                className="max-w-[90vw] max-h-[90vh] object-contain rounded shadow-2xl" />
              <button onClick={() => setLightboxUrl(null)}
                className="absolute top-4 right-4 text-white text-3xl leading-none hover:text-gray-300">×</button>
            </div>
          )}

          <div className="flex gap-2 flex-wrap items-start">
            {/* Hauptfoto */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                {fotoUrl ? (
                  <img src={`http://localhost:8000${fotoUrl}`} alt={bild.bildtitel}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setLightboxUrl(fotoUrl)} />
                ) : (
                  <span className="text-xs text-gray-400 text-center px-2">Kein Foto</span>
                )}
                {fotoLaedt && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><span className="text-xs animate-pulse">Lädt…</span></div>}
                <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 rounded">1</span>
              </div>
              <button type="button" onClick={() => fotoInputRef.current?.click()}
                className="text-xs text-lions-blue hover:underline">
                {fotoUrl ? "Ersetzen" : "+ Hochladen"}
              </button>
            </div>

            {/* Zusatzfotos */}
            {zusatzFotos.map((f, i) => (
              <div key={f.id} className="flex flex-col items-center gap-1">
                <div className="relative w-28 h-28 rounded-lg overflow-hidden border border-gray-200">
                  <img src={`http://localhost:8000${f.url}`} alt=""
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setLightboxUrl(f.url)} />
                  <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1 rounded">{i + 2}</span>
                </div>
                <button type="button"
                  onClick={async () => {
                    await zusatzFotoLoeschen(bild.id, f.id).catch(() => {});
                    setZusatzFotos(prev => prev.filter(x => x.id !== f.id));
                  }}
                  className="text-xs text-red-500 hover:underline">
                  Löschen
                </button>
              </div>
            ))}

            {/* + Slot */}
            {fotoUrl && zusatzFotos.length < 2 && (
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => zusatzInputRef.current?.click()}
                  className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 hover:border-lions-blue hover:text-lions-blue transition-colors text-xs">
                  {zusatzLaedt ? "Lädt…" : `+ Foto ${zusatzFotos.length + 2}`}
                </button>
                <span className="text-xs text-transparent select-none">—</span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Maximal 3 Fotos · Klick auf Foto zum Vergrößern</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Titel *</label>
              <input required value={form.bildtitel} onChange={e => setForm({...form, bildtitel: e.target.value})} className={inp} />
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-600">Anmerkung</label>
                <button
                  type="button"
                  disabled={aiLaedt}
                  onClick={async () => {
                    setAiLaedt(true);
                    try {
                      const { hook, beschreibung } = await aiBeschreibungGenerieren(bild.id);
                      setKiHook(hook);
                      setForm(f => ({ ...f, anmerkung_bild: beschreibung }));
                    } catch (err: unknown) {
                      setFehler("KI-Fehler: " + (err instanceof Error ? err.message : String(err)));
                    } finally {
                      setAiLaedt(false);
                    }
                  }}
                  className="text-xs px-2.5 py-1 rounded-md bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {aiLaedt ? (
                    <><span className="animate-spin inline-block">✦</span> Generiere…</>
                  ) : (
                    <>✦ KI & Hook</>
                  )}
                </button>
              </div>
              {kiHook && (
                <div className="mb-1.5 px-2.5 py-1.5 rounded-md bg-violet-50 border border-violet-200 text-xs text-violet-800 flex items-center gap-1.5">
                  <span className="font-semibold">Hook:</span> „{kiHook}"
                </div>
              )}
              <textarea rows={3} value={form.anmerkung_bild} onChange={e => setForm({...form, anmerkung_bild: e.target.value})} className={inp} placeholder="Beschreibung für die Webseite…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Technik *</label>
              <input required value={form.bildtechnik} onChange={e => setForm({...form, bildtechnik: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Genre *</label>
              <select required value={form.genre} onChange={e => setForm({...form, genre: e.target.value as any})} className={inp}>
                {GENRES.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Breite m.Rahmen (cm)</label>
              <input type="number" value={form.breite_rahmen_cm} onChange={e => setForm({...form, breite_rahmen_cm: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Höhe m.Rahmen (cm)</label>
              <input type="number" value={form.hoehe_rahmen_cm} onChange={e => setForm({...form, hoehe_rahmen_cm: e.target.value})} className={inp} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Breite o.Rahmen (cm)</label>
              <input type="number" value={form.breite_cm} onChange={e => setForm({...form, breite_cm: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Höhe o.Rahmen (cm)</label>
              <input type="number" value={form.hoehe_cm} onChange={e => setForm({...form, hoehe_cm: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tiefe (cm)</label>
              <input type="number" value={form.tiefe_cm} onChange={e => setForm({...form, tiefe_cm: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gewicht (kg)</label>
              <input type="number" step="0.1" value={form.gewicht_kg} onChange={e => setForm({...form, gewicht_kg: e.target.value})} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Einlief.-Preis (€)</label>
              <input type="number" value={form.einlieferungspreis} onChange={e => setForm({...form, einlieferungspreis: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Verkaufspreis (€)</label>
              <input type="number" value={form.verkaufspreis} onChange={e => setForm({...form, verkaufspreis: e.target.value})} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Foto-Nr.</label>
              <input value={form.foto_nr} onChange={e => setForm({...form, foto_nr: e.target.value})} className={inp} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Abrechnung über</label>
              <select value={form.abrechnungsempf} onChange={e => setForm({...form, abrechnungsempf: e.target.value as any, galerist_id: ""})} className={inp}>
                <option value="Künstler">Künstler</option>
                <option value="Galerist">Galerist / Sammler</option>
              </select>
              {form.abrechnungsempf === "Galerist" && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Galerist / Sammler auswählen</label>
                  <select required value={form.galerist_id} onChange={e => setForm({...form, galerist_id: e.target.value})} className={inp}>
                    <option value="">— bitte wählen —</option>
                    {kuenstler.filter(k => k.kuenstlertyp === "galerist").sort((a, b) => a.db_name.localeCompare(b.db_name)).map(k => (
                      <option key={k.id} value={k.id}>{k.db_name}, {k.db_vorname}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-4 pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.in_ausstellung} onChange={e => setForm({...form, in_ausstellung: e.target.checked})} className="rounded" />
                In der Ausstellung
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.freigegeben} onChange={e => setForm({...form, freigegeben: e.target.checked})} className="rounded" />
                Freigegeben
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Verfügbarkeit</label>
            {(form.verfuegbarkeit === VERFUEGBARKEIT.RESERVIERT || form.verfuegbarkeit === VERFUEGBARKEIT.VERKAUFT) ? (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  form.verfuegbarkeit === VERFUEGBARKEIT.RESERVIERT ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                }`}>{form.verfuegbarkeit}</span>
                <span className="text-xs text-gray-400">— wird automatisch durch Reservierung / Verkauf gesetzt</span>
              </div>
            ) : (
              <select value={form.verfuegbarkeit} onChange={e => setForm({...form, verfuegbarkeit: e.target.value as Verfuegbarkeit})} className={inp}>
                <option value={VERFUEGBARKEIT.VERFUEGBAR}>Verfügbar</option>
                <option value={VERFUEGBARKEIT.NICHT}>Nicht verfügbar (kein Verkauf, nur Anschauung)</option>
                <option value={VERFUEGBARKEIT.NACHFRAGEN}>Verfügbarkeit nachfragen (Online-Anfrage klären)</option>
              </select>
            )}
          </div>

          {fehler && <p className="text-red-600 text-sm">{fehler}</p>}

          <div className="flex items-center justify-end gap-3 pt-3 border-t sticky bottom-0 bg-white pb-1">
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-100">Abbrechen</button>
              <button type="submit" disabled={laden} className="px-4 py-2 text-sm bg-lions-blue text-white rounded-md hover:bg-blue-900 disabled:opacity-50">
                {laden ? "Wird gespeichert…" : "Speichern"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

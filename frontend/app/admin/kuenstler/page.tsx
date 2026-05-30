"use client";
import { useEffect, useState, useMemo } from "react";
import { getAlleKuenstler, kuenstlerAktualisieren, kuenstlerEinladen, kuenstlerLoeschen } from "@/lib/api";
import { Kuenstler } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL;

// --- Edit Modal ---
function EditModal({ k, onClose, onSaved, onDeleted }: { k: Kuenstler; onClose: () => void; onSaved: (k: Kuenstler) => void; onDeleted: (id: number) => void }) {
  const [form, setForm] = useState({
    db_vorname: k.db_vorname ?? "",
    db_name: k.db_name,
    db_beruf: k.db_beruf ?? "",
    db_leben: (k as any).db_leben ?? "",
    db_lebenstext: k.db_lebenstext ?? "",
    db_kommentar: k.db_kommentar ?? "",
    db_inspiration: k.db_inspiration ?? "",
    db_ausstellungen: (k as any).db_ausstellungen ?? "",
    db_email: k.db_email ?? "",
    db_telefon: (k as any).db_telefon ?? "",
    db_adresse: k.db_adresse ?? "",
    db_plz: k.db_plz ?? "",
    db_ort: k.db_ort ?? "",
    db_webseite: k.db_webseite ?? "",
    db_instagram: k.db_instagram ?? "",
    db_facebook: k.db_facebook ?? "",
    aktiv: k.aktiv !== false,
    vor_ort_anwesend: k.vor_ort_anwesend ?? false,
  });
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState("");
  const [portalLink, setPortalLink] = useState("");
  const [portalLaden, setPortalLaden] = useState(false);
  const [loeschenLaden, setLoeschenLaden] = useState(false);
  const [loeschenBestaetigung, setLoeschenBestaetigung] = useState(false);
  const inp = "w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-lions-blue";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLaden(true); setFehler("");
    try {
      const updated = await kuenstlerAktualisieren(k.id, {
        db_vorname: form.db_vorname || undefined,
        db_name: form.db_name,
        db_beruf: form.db_beruf || undefined,
        db_leben: form.db_leben || undefined,
        db_lebenstext: form.db_lebenstext || undefined,
        db_kommentar: form.db_kommentar || undefined,
        db_inspiration: form.db_inspiration || undefined,
        db_ausstellungen: form.db_ausstellungen || undefined,
        db_email: form.db_email || undefined,
        db_adresse: form.db_adresse || undefined,
        db_plz: form.db_plz || undefined,
        db_ort: form.db_ort || undefined,
        db_webseite: form.db_webseite || undefined,
        db_instagram: form.db_instagram || undefined,
        db_facebook: form.db_facebook || undefined,
        aktiv: form.aktiv,
        vor_ort_anwesend: form.vor_ort_anwesend,
        ...(form.db_telefon ? { db_telefon: form.db_telefon } : {}),
      } as any);
      if (portraitFile) {
        const fd = new FormData();
        fd.append("file", portraitFile);
        await fetch(`${API}/kuenstler/${k.id}/portrait`, { method: "POST", body: fd });
      }
      onSaved(updated);
    } catch (err: any) { setFehler(err.message); }
    finally { setLaden(false); }
  }

  async function handleEinladen() {
    setPortalLaden(true);
    try {
      const { portal_url } = await kuenstlerEinladen(k.id);
      setPortalLink(`${window.location.origin}${portal_url}`);
    } catch (err: any) { setFehler(err.message); }
    finally { setPortalLaden(false); }
  }

  const sep = "border-t pt-4 mt-2";
  const label = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Künstler bearbeiten</h2>
            <p className="text-xs text-gray-400 mt-0.5">ID {k.id}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={submit} className="space-y-3">

          {/* Portrait */}
          <div className="flex items-center gap-4 pb-3 border-b">
            {k.portrait_foto
              ? <img src={`${API}${k.portrait_foto}`} alt="Portrait" className="w-14 h-14 rounded-full object-cover shadow" />
              : <div className="w-14 h-14 rounded-full bg-lions-blue/10 flex items-center justify-center text-lions-blue font-bold text-lg">
                  {(k.db_vorname?.[0] ?? "") + k.db_name[0]}
                </div>
            }
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Portrait-Foto</p>
              <input type="file" accept="image/*" onChange={e => setPortraitFile(e.target.files?.[0] ?? null)} className="text-xs text-gray-500" />
            </div>
          </div>

          {/* Name & Leben */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Nachname *</label>
              <input required value={form.db_name} onChange={e => setForm({...form, db_name: e.target.value})} className={inp} />
            </div>
            <div>
              <label className={label}>Vorname</label>
              <input value={form.db_vorname} onChange={e => setForm({...form, db_vorname: e.target.value})} className={inp} />
            </div>
            <div className="col-span-2">
              <label className={label}>Lebensdaten <span className="text-gray-400 font-normal">(z.B. *1981 oder 1902 – 1967)</span></label>
              <input value={form.db_leben} onChange={e => setForm({...form, db_leben: e.target.value})} placeholder="*1981" className={inp} />
            </div>
            <div className="col-span-2">
              <label className={label}>Bezeichnet sich als</label>
              <input value={form.db_beruf} onChange={e => setForm({...form, db_beruf: e.target.value})} placeholder="z.B. Malerin, Bildhauer, Fotografin…" className={inp} />
            </div>
          </div>

          {/* Vita */}
          <div className={sep}>
            <div className="space-y-3">
              <div>
                <label className={label}>Kurzbiografie <span className="text-gray-400 font-normal">(für Bildbeschriftung)</span></label>
                <textarea rows={3} value={form.db_kommentar} onChange={e => setForm({...form, db_kommentar: e.target.value})}
                  placeholder="Kurzer Text, der auf die Bildbeschriftung passt…" className={inp} />
              </div>
              <div>
                <label className={label}>Inspiration / Künstlerische Aussage</label>
                <textarea rows={3} value={form.db_inspiration} onChange={e => setForm({...form, db_inspiration: e.target.value})} className={inp} />
              </div>
              <div>
                <label className={label}>Leben / Ausbildung / Werdegang</label>
                <textarea rows={4} value={form.db_lebenstext} onChange={e => setForm({...form, db_lebenstext: e.target.value})}
                  placeholder="Biografie, Ausbildung, Werdegang als Fließtext…" className={inp} />
              </div>
              <div>
                <label className={label}>Ausstellungen & Auszeichnungen</label>
                <textarea rows={3} value={form.db_ausstellungen} onChange={e => setForm({...form, db_ausstellungen: e.target.value})}
                  placeholder={"2023 Kunsttage auf der Ludwigshöhe\n2022 Galerie Musterstadt"} className={inp} />
              </div>
            </div>
          </div>

          {/* Kontakt */}
          <div className={sep}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>E-Mail</label>
                <input type="email" value={form.db_email} onChange={e => setForm({...form, db_email: e.target.value})} className={inp} />
              </div>
              <div>
                <label className={label}>Telefon</label>
                <input value={form.db_telefon} onChange={e => setForm({...form, db_telefon: e.target.value})} className={inp} />
              </div>
              <div className="col-span-2">
                <label className={label}>Straße</label>
                <input value={form.db_adresse} onChange={e => setForm({...form, db_adresse: e.target.value})} className={inp} />
              </div>
              <div>
                <label className={label}>PLZ</label>
                <input value={form.db_plz} onChange={e => setForm({...form, db_plz: e.target.value})} className={inp} />
              </div>
              <div>
                <label className={label}>Ort</label>
                <input value={form.db_ort} onChange={e => setForm({...form, db_ort: e.target.value})} className={inp} />
              </div>
              <div>
                <label className={label}>Webseite</label>
                <input value={form.db_webseite} onChange={e => setForm({...form, db_webseite: e.target.value})} className={inp} />
              </div>
              <div>
                <label className={label}>Instagram</label>
                <input value={form.db_instagram} onChange={e => setForm({...form, db_instagram: e.target.value})} className={inp} />
              </div>
              <div>
                <label className={label}>Facebook</label>
                <input value={form.db_facebook} onChange={e => setForm({...form, db_facebook: e.target.value})} className={inp} />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className={`${sep} flex items-center gap-6`}>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.aktiv} onChange={e => setForm({...form, aktiv: e.target.checked})} className="rounded" />
              Aktiv
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.vor_ort_anwesend} onChange={e => setForm({...form, vor_ort_anwesend: e.target.checked})} className="rounded" />
              Anwesend
            </label>
          </div>

          {/* Vita drucken */}
          {k.vor_ort_anwesend && (
            <div className="border-t pt-3 flex gap-4">
              <a href={`/admin/kuenstler/${k.id}/drucken`} target="_blank"
                className="text-sm text-lions-blue underline hover:text-blue-900">
                Vita drucken (A4)
              </a>
            </div>
          )}

          {/* Portal-Link */}
          <div className="border-t pt-3">
            <button type="button" onClick={handleEinladen} disabled={portalLaden}
              className="text-sm text-lions-blue underline hover:text-blue-900 disabled:opacity-50">
              {portalLaden ? "Wird generiert…" : "Portal-Link generieren (48h)"}
            </button>
            {portalLink && (
              <div className="mt-2 flex gap-2">
                <input readOnly value={portalLink}
                  className="flex-1 border rounded px-2 py-1 text-xs font-mono text-gray-600 bg-gray-50 focus:outline-none" />
                <button type="button" onClick={() => navigator.clipboard.writeText(portalLink)}
                  className="px-3 py-1 text-xs bg-lions-blue text-white rounded hover:bg-blue-900">
                  Kopieren
                </button>
              </div>
            )}
          </div>

          {fehler && <p className="text-red-600 text-sm">{fehler}</p>}
          <div className="flex justify-between items-center pt-2 border-t">
            <div>
              {!loeschenBestaetigung
                ? <button type="button" onClick={() => setLoeschenBestaetigung(true)}
                    className="text-sm text-red-500 hover:text-red-700 underline">
                    Künstler löschen
                  </button>
                : <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600 font-medium">Wirklich löschen?</span>
                    <button type="button" disabled={loeschenLaden} onClick={async () => {
                      setLoeschenLaden(true); setFehler("");
                      try {
                        await kuenstlerLoeschen(k.id);
                        onDeleted(k.id);
                      } catch (err: any) { setFehler(err.message); setLoeschenBestaetigung(false); }
                      finally { setLoeschenLaden(false); }
                    }} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                      {loeschenLaden ? "…" : "Ja, löschen"}
                    </button>
                    <button type="button" onClick={() => setLoeschenBestaetigung(false)}
                      className="px-3 py-1 text-xs border rounded hover:bg-gray-50">
                      Abbrechen
                    </button>
                  </div>
              }
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-50">Abbrechen</button>
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

// --- Neu-Modal ---
function NeuModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ db_vorname: "", db_name: "", db_email: "", db_telefon: "" });
  const [laden, setLaden] = useState(false);
  const [ergebnis, setErgebnis] = useState<{ portalLink: string } | null>(null);
  const [fehler, setFehler] = useState("");
  const inp = "w-full border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-lions-blue";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLaden(true); setFehler("");
    try {
      const res = await fetch(`${API}/admin/kuenstler`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, db_ident: "" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      const einRes = await fetch(`${API}/admin/kuenstler/${id}/einladen`, { method: "POST" });
      if (!einRes.ok) throw new Error(await einRes.text());
      const { portal_url } = await einRes.json();
      setErgebnis({ portalLink: `${window.location.origin}${portal_url}` });
      onCreated();
    } catch (err: any) { setFehler(err.message); }
    finally { setLaden(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-800">Künstler anlegen</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {!ergebnis ? (
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vorname *</label>
                <input required value={form.db_vorname} onChange={e => setForm({...form, db_vorname: e.target.value})} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nachname *</label>
                <input required value={form.db_name} onChange={e => setForm({...form, db_name: e.target.value})} className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-Mail</label>
              <input type="email" value={form.db_email} onChange={e => setForm({...form, db_email: e.target.value})} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
              <input value={form.db_telefon} onChange={e => setForm({...form, db_telefon: e.target.value})} className={inp} />
            </div>
            {fehler && <p className="text-red-600 text-sm">{fehler}</p>}
            <button type="submit" disabled={laden}
              className="w-full bg-lions-blue text-white py-2 rounded-md text-sm font-medium hover:bg-blue-900 disabled:opacity-50">
              {laden ? "Wird angelegt…" : "Anlegen & Portal-Link generieren"}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-green-700 font-medium">Künstler angelegt ✓</p>
            <p className="text-xs text-gray-500">Portal-Link (48h gültig):</p>
            <div className="flex gap-2">
              <input readOnly value={ergebnis.portalLink}
                className="flex-1 border rounded px-2 py-1.5 text-xs font-mono text-gray-600 bg-gray-50 focus:outline-none" />
              <button onClick={() => navigator.clipboard.writeText(ergebnis.portalLink)}
                className="px-3 py-1.5 text-xs bg-lions-blue text-white rounded hover:bg-blue-900">
                Kopieren
              </button>
            </div>
            <button onClick={onClose} className="w-full py-2 text-sm border rounded-md hover:bg-gray-50">Schließen</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Hauptseite ---
export default function AdminKuenstlerPage() {
  const [kuenstler, setKuenstler] = useState<Kuenstler[]>([]);
  const [laden, setLaden] = useState(true);
  const [suche, setSuche] = useState("");
  const [editK, setEditK] = useState<Kuenstler | null>(null);
  const [showNeu, setShowNeu] = useState(false);
  const [nurMitEmail, setNurMitEmail] = useState(false);
  const [nurAnwesend, setNurAnwesend] = useState(false);
  const [mitInaktiven, setMitInaktiven] = useState(false);

  useEffect(() => {
    setLaden(true);
    getAlleKuenstler(mitInaktiven).then(setKuenstler).finally(() => setLaden(false));
  }, [mitInaktiven]);

  const sichtbar = useMemo(() => {
    return kuenstler
      .filter(k => !nurMitEmail || !!k.db_email)
      .filter(k => !nurAnwesend || !!k.vor_ort_anwesend)
      .filter(k => {
        if (!suche) return true;
        const s = suche.toLowerCase();
        return `${k.db_name} ${k.db_vorname}`.toLowerCase().includes(s)
          || (k.db_email ?? "").toLowerCase().includes(s);
      })
      .sort((a, b) => `${a.db_name}${a.db_vorname}`.localeCompare(`${b.db_name}${b.db_vorname}`));
  }, [kuenstler, suche, nurMitEmail, nurAnwesend]);

  function handleSaved(updated: Kuenstler) {
    setKuenstler(prev => prev.map(k => k.id === updated.id ? { ...k, ...updated } : k));
    setEditK(null);
  }

  function handleDeleted(id: number) {
    setKuenstler(prev => prev.filter(k => k.id !== id));
    setEditK(null);
  }

  async function toggleFeld(k: Kuenstler, feld: "vor_ort_anwesend" | "aktiv", e: React.MouseEvent) {
    e.stopPropagation();
    const neuerWert = !k[feld];
    setKuenstler(prev => prev.map(x => x.id === k.id ? { ...x, [feld]: neuerWert } : x));
    try {
      await kuenstlerAktualisieren(k.id, { [feld]: neuerWert } as any);
    } catch {
      setKuenstler(prev => prev.map(x => x.id === k.id ? { ...x, [feld]: k[feld] } : x));
    }
  }

  if (laden) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  return (
    <div className="space-y-4">
      {editK && <EditModal k={editK} onClose={() => setEditK(null)} onSaved={handleSaved} onDeleted={handleDeleted} />}
      {showNeu && <NeuModal onClose={() => setShowNeu(false)} onCreated={() => {
        setShowNeu(false);
        getAlleKuenstler().then(setKuenstler);
      }} />}

      {/* Kopfzeile */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-lions-blue">Künstler</h1>
        <button onClick={() => setShowNeu(true)}
          className="px-4 py-1.5 bg-lions-blue text-white text-sm font-medium rounded-md hover:bg-blue-900 transition-colors">
          + Künstler anlegen
        </button>
      </div>

      {/* Filter & Suche */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={suche}
          onChange={e => setSuche(e.target.value)}
          placeholder="Name oder E-Mail suchen…"
          className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-lions-blue w-64"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={nurMitEmail}
            onChange={e => setNurMitEmail(e.target.checked)}
            className="rounded accent-lions-blue"
          />
          Nur mit E-Mail
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={nurAnwesend}
            onChange={e => setNurAnwesend(e.target.checked)}
            className="rounded accent-lions-blue"
          />
          Nur Anwesende
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mitInaktiven}
            onChange={e => setMitInaktiven(e.target.checked)}
            className="rounded accent-lions-blue"
          />
          Auch Inaktive
        </label>
        <span className="text-sm text-gray-400">{sichtbar.length} von {kuenstler.length}</span>
      </div>

      {/* Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap">Name</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">E-Mail</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Telefon</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Beruf</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Webseite</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Anwesend</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Aktiv</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sichtbar.map(k => (
              <tr key={k.id} onClick={() => setEditK(k)}
                className={`cursor-pointer transition-colors ${k.aktiv === false ? "opacity-50 bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50"}`}>
                <td className="px-3 py-2 font-medium whitespace-nowrap">
                  {k.db_name}{k.db_vorname ? `, ${k.db_vorname}` : ""}
                  {(k as any).db_leben && <span className="ml-1.5 text-xs font-normal text-gray-400">{(k as any).db_leben}</span>}
                </td>
                <td className="px-3 py-2 text-gray-500 text-xs">{k.db_email ?? "—"}</td>
                <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{(k as any).db_telefon ?? "—"}</td>
                <td className="px-3 py-2 text-gray-500 text-xs">{k.db_beruf ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {k.db_webseite
                    ? <a href={k.db_webseite} target="_blank" onClick={e => e.stopPropagation()}
                        className="text-lions-blue hover:underline truncate max-w-32 inline-block">{k.db_webseite}</a>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2 text-center" onClick={e => toggleFeld(k, "vor_ort_anwesend", e)}>
                  <span className={`text-base cursor-pointer select-none ${k.vor_ort_anwesend ? "text-green-600 hover:text-red-400" : "text-gray-300 hover:text-green-500"}`}>
                    {k.vor_ort_anwesend ? "✓" : "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-center" onClick={e => toggleFeld(k, "aktiv", e)}>
                  <span className={`text-base cursor-pointer select-none ${k.aktiv !== false ? "text-green-600 hover:text-red-400" : "text-gray-300 hover:text-green-500"}`}>
                    {k.aktiv !== false ? "✓" : "✗"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sichtbar.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">Keine Einträge.</p>
        )}
      </div>
    </div>
  );
}

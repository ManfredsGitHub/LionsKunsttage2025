"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { getAlleKuenstler, getAlleBilder, kuenstlerAktualisieren, kuenstlerEinladen, kuenstlerLoeschen } from "@/lib/api";
import { authHeaders } from "@/lib/auth";
import { Kuenstler, Bild } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL;

// --- Edit Modal ---
type EditTab = "stamm" | "vita" | "kontakt" | "orga";

function EditModal({ k, onClose, onSaved, onDeleted }: { k: Kuenstler; onClose: () => void; onSaved: (k: Kuenstler) => void; onDeleted: (id: number) => void }) {
  const [tab, setTab] = useState<EditTab>("stamm");
  const [form, setForm] = useState({
    db_vorname: k.db_vorname ?? "",
    db_name: k.db_name,
    kuenstler_nr: k.kuenstler_nr ?? "",
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
    db_pinterest: (k as any).db_pinterest ?? "",
    aktiv: k.aktiv !== false,
    vor_ort_anwesend: k.vor_ort_anwesend ?? false,
    zur_ausstellung_ansprechen: k.zur_ausstellung_ansprechen ?? false,
    abrechnungsempf: (k as any).abrechnungsempf ?? "Künstler",
    galerist_id: String((k as any).galerist_id ?? ""),
    kuenstlertyp: (k as any).kuenstlertyp ?? "vor_ort",
  });
  const [alleKuenstler, setAlleKuenstler] = useState<Kuenstler[]>([]);
  useEffect(() => { getAlleKuenstler().then(setAlleKuenstler).catch(() => {}); }, []);
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [portraitPreview, setPortraitPreview] = useState<string | null>(null);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState("");
  const [portalLink, setPortalLink] = useState("");
  const [portalLaden, setPortalLaden] = useState(false);
  const [loeschenLaden, setLoeschenLaden] = useState(false);
  const [loeschenBestaetigung, setLoeschenBestaetigung] = useState(false);

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lions-blue/30 focus:border-lions-blue bg-white";
  const lbl = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";
  const hint = "text-xs text-gray-400 mt-1";

  function handlePortraitChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setPortraitFile(file);
    if (file) setPortraitPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLaden(true); setFehler("");
    try {
      const updated = await kuenstlerAktualisieren(k.id, {
        db_vorname: form.db_vorname || undefined,
        db_name: form.db_name,
        kuenstler_nr: form.kuenstler_nr || undefined,
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
        db_pinterest: form.db_pinterest || undefined,
        aktiv: form.aktiv,
        vor_ort_anwesend: form.vor_ort_anwesend,
        zur_ausstellung_ansprechen: form.zur_ausstellung_ansprechen,
        abrechnungsempf: form.abrechnungsempf,
        galerist_id: form.abrechnungsempf === "Galerist" && form.galerist_id ? Number(form.galerist_id) : null,
        kuenstlertyp: form.kuenstlertyp,
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

  const TABS: { id: EditTab; label: string }[] = [
    { id: "stamm",   label: "Stammdaten" },
    { id: "vita",    label: "Vita & Profil" },
    { id: "kontakt", label: "Kontakt & Web" },
    { id: "orga",    label: "Organisation" },
  ];

  const avatarSrc = portraitPreview ?? (k.portrait_foto ? `${API}${k.portrait_foto}` : null);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b">
          <div className="relative">
            {avatarSrc
              ? <img src={avatarSrc} alt="Portrait" className="w-11 h-11 rounded-full object-cover shadow" />
              : <div className="w-11 h-11 rounded-full bg-lions-blue/10 flex items-center justify-center text-lions-blue font-bold text-base">
                  {(k.db_vorname?.[0] ?? "") + k.db_name[0]}
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-800 truncate">
              {form.db_vorname ? `${form.db_vorname} ${form.db_name}` : form.db_name}
            </h2>
            <p className="text-xs text-gray-400">{form.db_beruf || "Künstler·in"}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-2">×</button>
        </div>

        {/* ── Tab-Nav ── */}
        <div className="flex border-b px-6 gap-1">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id
                  ? "border-lions-blue text-lions-blue"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab-Inhalte (scrollbar) ── */}
        <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ─── Tab: Stammdaten ─── */}
            {tab === "stamm" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Vorname</label>
                    <input value={form.db_vorname} onChange={e => setForm({...form, db_vorname: e.target.value})} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Nachname *</label>
                    <input required value={form.db_name} onChange={e => setForm({...form, db_name: e.target.value})} className={inp} />
                  </div>
                </div>

                <div>
                  <label className={lbl}>Lebensdaten</label>
                  <input value={form.db_leben} onChange={e => setForm({...form, db_leben: e.target.value})}
                    placeholder="z.B. *1981 oder 1902–1967" className={inp} />
                  <p className={hint}>Erscheint im Katalog neben dem Namen</p>
                </div>

                <div>
                  <label className={lbl}>Künstlernummer <span className="font-mono normal-case">(KKK)</span></label>
                  <div className="flex items-center gap-3">
                    <input
                      value={form.kuenstler_nr}
                      onChange={e => setForm({...form, kuenstler_nr: e.target.value.replace(/\D/g, "").slice(0, 3)})}
                      placeholder="z.B. 105"
                      maxLength={3}
                      className={`w-24 border rounded-lg px-3 py-2 text-sm font-mono text-center focus:outline-none focus:ring-2 ${
                        form.kuenstler_nr.length === 3 ? "border-green-400 focus:ring-green-400/30 bg-green-50" :
                        form.kuenstler_nr.length > 0   ? "border-yellow-400 focus:ring-yellow-400/30" :
                                                          "border-red-300 focus:ring-red-300/30"
                      }`}
                    />
                    {form.kuenstler_nr.length === 3
                      ? <span className="text-xs text-green-600">→ Bildnr. {formatBildNr(`26${form.kuenstler_nr}01`)}, {formatBildNr(`26${form.kuenstler_nr}02`)} …</span>
                      : <span className="text-xs text-red-500">3 Stellen erforderlich für Bildnummern</span>
                    }
                  </div>
                </div>

                <div>
                  <label className={lbl}>Kurzbiografie</label>
                  <textarea rows={2} value={form.db_kommentar} onChange={e => setForm({...form, db_kommentar: e.target.value})}
                    placeholder="Kurzer Begleittext für Bildbeschriftungen und Katalog…" className={inp} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>E-Mail</label>
                    <input type="email" value={form.db_email} onChange={e => setForm({...form, db_email: e.target.value})} className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Telefon</label>
                    <input value={form.db_telefon} onChange={e => setForm({...form, db_telefon: e.target.value})} className={inp} />
                  </div>
                </div>
              </>
            )}

            {/* ─── Tab: Vita & Profil ─── */}
            {tab === "vita" && (
              <>
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="relative group cursor-pointer">
                    {avatarSrc
                      ? <img src={avatarSrc} alt="Portrait" className="w-16 h-16 rounded-full object-cover shadow" />
                      : <div className="w-16 h-16 rounded-full bg-lions-blue/10 flex items-center justify-center text-lions-blue font-bold text-xl">
                          {(k.db_vorname?.[0] ?? "") + k.db_name[0]}
                        </div>
                    }
                    <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs">ändern</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handlePortraitChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Portrait-Foto</p>
                    <p className="text-xs text-gray-400 mt-0.5">Quadratisch, min. 300 × 300 px</p>
                    {portraitFile && <p className="text-xs text-green-600 mt-0.5">✓ {portraitFile.name}</p>}
                  </div>
                </div>

                <div>
                  <label className={lbl}>Berufsbezeichnung</label>
                  <input value={form.db_beruf} onChange={e => setForm({...form, db_beruf: e.target.value})}
                    placeholder="z.B. Malerin, Bildhauer, Fotografin…" className={inp} />
                  <p className={hint}>Erscheint unter dem Namen auf der Vita</p>
                </div>

                <div>
                  <label className={lbl}>Künstlerische Aussage / Inspiration</label>
                  <textarea rows={4} value={form.db_inspiration} onChange={e => setForm({...form, db_inspiration: e.target.value})}
                    placeholder="Was bewegt diese Künstlerin / diesen Künstler? Was möchte sie / er ausdrücken?"
                    className={inp} />
                </div>

                <div>
                  <label className={lbl}>Leben & Ausbildung</label>
                  {(form.db_leben || form.db_kommentar) && (
                    <div className="mb-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-400 uppercase tracking-wide text-[10px]">Archiv-Notiz</span>
                      {form.db_leben && <span className="ml-2 font-medium text-gray-600">{form.db_leben}</span>}
                      {form.db_kommentar && <p className="mt-1 whitespace-pre-line">{form.db_kommentar}</p>}
                    </div>
                  )}
                  <textarea rows={4} value={form.db_lebenstext} onChange={e => setForm({...form, db_lebenstext: e.target.value})}
                    placeholder={"Geburtsort, Ausbildung, Werdegang…"} className={inp} />
                </div>

                <div>
                  <label className={lbl}>Ausstellungen & Auszeichnungen</label>
                  <textarea rows={4} value={form.db_ausstellungen} onChange={e => setForm({...form, db_ausstellungen: e.target.value})}
                    placeholder={"2023 Kunsttage auf der Ludwigshöhe\n2022 Galerie Musterstadt"} className={inp} />
                  <p className={hint}>Eine Zeile pro Eintrag — wird als Aufzählung dargestellt</p>
                </div>

                {k.vor_ort_anwesend && (
                  <a href={`/admin/kuenstler/${k.id}/drucken`} target="_blank"
                    className="inline-flex items-center gap-1.5 text-sm text-lions-blue hover:text-blue-900">
                    ⎙ Vita als A4 drucken
                  </a>
                )}
              </>
            )}

            {/* ─── Tab: Kontakt & Web ─── */}
            {tab === "kontakt" && (
              <>
                <div>
                  <label className={lbl}>Straße</label>
                  <input value={form.db_adresse} onChange={e => setForm({...form, db_adresse: e.target.value})} className={inp} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={lbl}>PLZ</label>
                    <input value={form.db_plz} onChange={e => setForm({...form, db_plz: e.target.value})} className={inp} />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Ort</label>
                    <input value={form.db_ort} onChange={e => setForm({...form, db_ort: e.target.value})} className={inp} />
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <label className={lbl}>Webseite</label>
                  <input value={form.db_webseite} onChange={e => setForm({...form, db_webseite: e.target.value})}
                    placeholder="https://www.beispiel.de" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Instagram</label>
                  <input value={form.db_instagram} onChange={e => setForm({...form, db_instagram: e.target.value})}
                    placeholder="https://instagram.com/…" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Facebook</label>
                  <input value={form.db_facebook} onChange={e => setForm({...form, db_facebook: e.target.value})}
                    placeholder="https://facebook.com/…" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Pinterest</label>
                  <input value={form.db_pinterest} onChange={e => setForm({...form, db_pinterest: e.target.value})}
                    placeholder="https://pinterest.de/…" className={inp} />
                </div>
              </>
            )}

            {/* ─── Tab: Organisation ─── */}
            {tab === "orga" && (
              <>
                <div className="flex flex-wrap items-center gap-6 p-4 bg-gray-50 rounded-xl">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.aktiv} onChange={e => setForm({...form, aktiv: e.target.checked})}
                      className="w-4 h-4 rounded accent-lions-blue" />
                    <span className="text-sm font-medium text-gray-700">Aktiv</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.vor_ort_anwesend} onChange={e => setForm({...form, vor_ort_anwesend: e.target.checked})}
                      className="w-4 h-4 rounded accent-lions-blue" />
                    <span className={`text-sm font-medium ${form.vor_ort_anwesend ? "text-lions-blue" : "text-gray-700"}`}>
                      Vor Ort anwesend
                    </span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.zur_ausstellung_ansprechen} onChange={e => setForm({...form, zur_ausstellung_ansprechen: e.target.checked})}
                      className="w-4 h-4 rounded accent-lions-blue" />
                    <span className={`text-sm font-medium ${form.zur_ausstellung_ansprechen ? "text-lions-blue" : "text-gray-700"}`}>
                      Zur Ausstellung ansprechen
                    </span>
                  </label>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <label className={lbl}>Typ</label>
                  <select value={form.kuenstlertyp} onChange={e => setForm({...form, kuenstlertyp: e.target.value})} className={inp}>
                    <option value="vor_ort">Künstler·in vor Ort</option>
                    <option value="galerie">Künstler·in über Galerie</option>
                    <option value="galerist">Galerist·in / Händler·in</option>
                    <option value="eigenbestand">Eigenbestand</option>
                  </select>
                </div>

                <div>
                  <label className={lbl}>Abrechnung über</label>
                  <select value={form.abrechnungsempf} onChange={e => setForm({...form, abrechnungsempf: e.target.value, galerist_id: ""})} className={inp}>
                    <option value="Künstler">Direkt an Künstler·in</option>
                    <option value="Galerist">Über Galerist / Sammler</option>
                  </select>
                </div>
                {form.abrechnungsempf === "Galerist" && (
                  <div>
                    <label className={lbl}>Galerist / Sammler</label>
                    <select value={form.galerist_id} onChange={e => setForm({...form, galerist_id: e.target.value})} className={inp}>
                      <option value="">— bitte wählen —</option>
                      {alleKuenstler.filter(a => a.id !== k.id && a.kuenstlertyp === "galerist").sort((a, b) => a.db_name.localeCompare(b.db_name)).map(a => (
                        <option key={a.id} value={a.id}>{a.db_name}, {a.db_vorname}</option>
                      ))}
                    </select>
                  </div>
                )}

                <hr className="border-gray-100" />

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Künstler-Portal</p>
                  <button type="button" onClick={handleEinladen} disabled={portalLaden}
                    className="px-4 py-2 text-sm border border-lions-blue text-lions-blue rounded-lg hover:bg-lions-blue hover:text-white transition-colors disabled:opacity-50">
                    {portalLaden ? "Wird generiert…" : "Login-Link generieren (48 h)"}
                  </button>
                  <p className="text-xs text-gray-400 mt-1.5">Link per E-Mail oder WhatsApp weitergeben. Gültig 48 Stunden.</p>
                  {portalLink && (
                    <div className="mt-3 flex gap-2">
                      <input readOnly value={portalLink}
                        className="flex-1 border rounded-lg px-3 py-1.5 text-xs font-mono text-gray-600 bg-gray-50 focus:outline-none" />
                      <button type="button" onClick={() => navigator.clipboard.writeText(portalLink)}
                        className="px-3 py-1.5 text-xs bg-lions-blue text-white rounded-lg hover:bg-blue-900">
                        Kopieren
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-between items-center gap-3">
            <div>
              {!loeschenBestaetigung
                ? <button type="button" onClick={() => setLoeschenBestaetigung(true)}
                    className="text-sm text-red-400 hover:text-red-600">
                    Löschen
                  </button>
                : <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600 font-medium">Wirklich löschen?</span>
                    <button type="button" disabled={loeschenLaden} onClick={async () => {
                      setLoeschenLaden(true); setFehler("");
                      try { await kuenstlerLoeschen(k.id); onDeleted(k.id); }
                      catch (err: any) { setFehler(err.message); setLoeschenBestaetigung(false); }
                      finally { setLoeschenLaden(false); }
                    }} className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                      {loeschenLaden ? "…" : "Ja, löschen"}
                    </button>
                    <button type="button" onClick={() => setLoeschenBestaetigung(false)}
                      className="px-3 py-1 text-xs border rounded-lg hover:bg-white">
                      Abbrechen
                    </button>
                  </div>
              }
              {fehler && <p className="text-red-600 text-xs mt-1">{fehler}</p>}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-white">Abbrechen</button>
              <button type="submit" disabled={laden} className="px-5 py-2 text-sm bg-lions-blue text-white rounded-lg hover:bg-blue-900 disabled:opacity-50 font-medium">
                {laden ? "Speichern…" : "Speichern"}
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
  const inp = "w-full border rounded-md px-3 py-1.5 text-sm bg-gray-100 focus:outline-none focus:ring-1 focus:ring-lions-blue";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLaden(true); setFehler("");
    try {
      const res = await fetch(`${API}/admin/kuenstler`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...form, db_ident: "" }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      const einRes = await fetch(`${API}/admin/kuenstler/${id}/einladen`, { method: "POST", headers: authHeaders() });
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
  const [nurAnsprechen, setNurAnsprechen] = useState(false);
  const [nurMitBildern, setNurMitBildern] = useState(false);
  const [mitInaktiven, setMitInaktiven] = useState(false);
  const [editNrId, setEditNrId] = useState<number | null>(null);
  const [editNrWert, setEditNrWert] = useState("");
  const [sortNr, setSortNr] = useState<"name" | "nr">("name");
  const [bilderByKuenstler, setBilderByKuenstler] = useState<Record<number, Bild[]>>({});
  const [popover, setPopover] = useState<{ id: number; x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState<{ bilder: Bild[]; index: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLaden(true);
    Promise.all([
      getAlleKuenstler(mitInaktiven),
      getAlleBilder(),
    ]).then(([ks, bilder]) => {
      setKuenstler(ks);
      const grouped: Record<number, Bild[]> = {};
      for (const b of bilder) {
        if (!grouped[b.kuenstler_id]) grouped[b.kuenstler_id] = [];
        grouped[b.kuenstler_id].push(b);
      }
      setBilderByKuenstler(grouped);
    }).finally(() => setLaden(false));
  }, [mitInaktiven]);

  const sichtbar = useMemo(() => {
    return kuenstler
      .filter(k => !nurMitEmail || !!k.db_email)
      .filter(k => !nurAnwesend || !!k.vor_ort_anwesend)
      .filter(k => !nurAnsprechen || !!k.zur_ausstellung_ansprechen)
      .filter(k => !nurMitBildern || (bilderByKuenstler[k.id]?.length ?? 0) > 0)
      .filter(k => {
        if (!suche) return true;
        const s = suche.toLowerCase();
        return `${k.db_name} ${k.db_vorname}`.toLowerCase().includes(s)
          || (k.db_email ?? "").toLowerCase().includes(s);
      })
      .sort((a, b) => {
        if (sortNr === "nr") {
          const na = a.kuenstler_nr ?? "￿";
          const nb = b.kuenstler_nr ?? "￿";
          return na.localeCompare(nb) || `${a.db_name}${a.db_vorname}`.localeCompare(`${b.db_name}${b.db_vorname}`);
        }
        return `${a.db_name}${a.db_vorname}`.localeCompare(`${b.db_name}${b.db_vorname}`);
      });
  }, [kuenstler, suche, nurMitEmail, nurAnwesend, nurAnsprechen, nurMitBildern, bilderByKuenstler, sortNr]);

  function handleSaved(updated: Kuenstler) {
    setKuenstler(prev => prev.map(k => k.id === updated.id ? { ...k, ...updated } : k));
    setEditK(null);
  }

  function handleDeleted(id: number) {
    setKuenstler(prev => prev.filter(k => k.id !== id));
    setEditK(null);
  }

  async function saveNr(k: Kuenstler) {
    const nr = editNrWert.trim();
    if (nr === (k.kuenstler_nr ?? "")) { setEditNrId(null); return; }
    setKuenstler(prev => prev.map(x => x.id === k.id ? { ...x, kuenstler_nr: nr || undefined } : x));
    setEditNrId(null);
    try {
      await kuenstlerAktualisieren(k.id, { kuenstler_nr: nr || undefined } as any);
    } catch {
      setKuenstler(prev => prev.map(x => x.id === k.id ? { ...x, kuenstler_nr: k.kuenstler_nr } : x));
    }
  }

  async function toggleFeld(k: Kuenstler, feld: "vor_ort_anwesend" | "aktiv" | "zur_ausstellung_ansprechen", e: React.MouseEvent) {
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

      {/* Lightbox */}
      {lightbox && (() => {
        const b = lightbox.bilder[lightbox.index];
        const total = lightbox.bilder.length;
        const go = (delta: number) =>
          setLightbox({ ...lightbox, index: (lightbox.index + delta + total) % total });
        return (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
            onKeyDown={e => {
              if (e.key === "ArrowLeft")  { e.stopPropagation(); go(-1); }
              if (e.key === "ArrowRight") { e.stopPropagation(); go(+1); }
              if (e.key === "Escape")     setLightbox(null);
            }}
            tabIndex={-1}
            ref={el => el?.focus()}
          >
            {/* Prev */}
            {total > 1 && (
              <button
                onClick={e => { e.stopPropagation(); go(-1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white text-xl flex items-center justify-center transition-colors"
              >‹</button>
            )}

            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden"
                 onClick={e => e.stopPropagation()}>
              {/* Zähler */}
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <span className="text-xs text-gray-400 font-mono">{lightbox.index + 1} / {total}</span>
                <button onClick={() => setLightbox(null)}
                        className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              {b.bild_url_web
                ? <img src={`${API}${b.bild_url_web}`} alt={b.bildtitel}
                       className="w-full max-h-[65vh] object-contain bg-gray-50" />
                : <div className="h-64 flex items-center justify-center text-gray-300 text-5xl bg-gray-50">🖼</div>
              }
              <div className="p-4">
                <p className="font-semibold text-gray-800">{b.bildtitel}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{formatBildNr(b.bild_nr)} · {b.bildtechnik} · {b.genre}</p>
                {b.verkaufspreis && (
                  <p className="text-sm text-lions-blue font-medium mt-1">€ {b.verkaufspreis.toLocaleString("de-DE")}</p>
                )}
              </div>
            </div>

            {/* Next */}
            {total > 1 && (
              <button
                onClick={e => { e.stopPropagation(); go(+1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 text-white text-xl flex items-center justify-center transition-colors"
              >›</button>
            )}
          </div>
        );
      })()}
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
            checked={nurAnsprechen}
            onChange={e => setNurAnsprechen(e.target.checked)}
            className="rounded accent-lions-blue"
          />
          Zur Ausstellung ansprechen
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={nurMitBildern}
            onChange={e => setNurMitBildern(e.target.checked)}
            className="rounded accent-lions-blue"
          />
          Nur mit Bildern
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
        <a
          href="/admin/kuenstler/druckliste"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"
          title="Künstlerliste drucken (alle mit E-Mail, inkl. inaktive)"
        >
          🖨 Druckliste
        </a>
        {nurAnsprechen && (() => {
          const emails = sichtbar.filter(k => !!k.db_email).map(k => k.db_email!);
          if (emails.length === 0) return null;
          return (
            <button
              onClick={() => navigator.clipboard.writeText(emails.join(", "))}
              className="ml-2 px-3 py-1.5 text-xs bg-lions-blue text-white rounded-lg hover:bg-blue-900 transition-colors flex items-center gap-1.5"
              title={`${emails.length} E-Mail-Adressen in die Zwischenablage`}
            >
              ✉ BCC kopieren ({emails.length})
            </button>
          );
        })()}
      </div>

      {/* Bilder-Popover */}
      {popover && (() => {
        const bilder = bilderByKuenstler[popover.id] ?? [];
        return (
          <div
            ref={popoverRef}
            style={{ position: "absolute", top: popover.y, left: Math.min(popover.x, window.innerWidth - 340), zIndex: 100 }}
            className="w-80 bg-white rounded-xl shadow-2xl border border-gray-100 p-3"
            onMouseEnter={() => { if (hideTimer.current) clearTimeout(hideTimer.current); }}
            onMouseLeave={() => { hideTimer.current = setTimeout(() => setPopover(null), 150); }}
          >
            <p className="text-xs font-semibold text-gray-500 mb-2">{bilder.length} Bild{bilder.length !== 1 ? "er" : ""}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {bilder.slice(0, 12).map((b, i) => (
                <button
                  key={b.id}
                  className="aspect-square rounded overflow-hidden bg-gray-100 relative group cursor-pointer"
                  onClick={() => { setPopover(null); setLightbox({ bilder, index: i }); }}
                  title={b.bildtitel}
                >
                  {b.bild_url_web
                    ? <img src={`${API}${b.bild_url_web}`} alt={b.bildtitel}
                        className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300 text-lg">🖼</div>
                  }
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
                    <span className="text-white text-[9px] leading-tight font-mono">{formatBildNr(b.bild_nr)}</span>
                  </div>
                </button>
              ))}
            </div>
            {bilder.length > 12 && (
              <p className="text-xs text-gray-400 mt-2 text-center">+{bilder.length - 12} weitere</p>
            )}
          </div>
        );
      })()}

      {/* Tabelle */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left whitespace-nowrap cursor-pointer select-none hover:text-gray-700"
                  onClick={() => setSortNr(s => s === "nr" ? "name" : "nr")}>
                Nr. {sortNr === "nr" ? "▲" : <span className="text-gray-300">⇅</span>}
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap cursor-pointer select-none hover:text-gray-700"
                  onClick={() => setSortNr(s => s === "name" ? "nr" : "name")}>
                Name {sortNr === "name" ? "▲" : ""}
              </th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Bilder</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">E-Mail</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Telefon</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Beruf</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Webseite</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Anwesend</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Ansprechen</th>
              <th className="px-3 py-2 text-center whitespace-nowrap">Aktiv</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sichtbar.map(k => (
              <tr key={k.id} onClick={() => setEditK(k)}
                className={`cursor-pointer transition-colors ${k.aktiv === false ? "opacity-50 bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50"}`}>
                <td className="px-2 py-1 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                  {editNrId === k.id ? (
                    <input
                      autoFocus
                      value={editNrWert}
                      onChange={e => setEditNrWert(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      onBlur={() => saveNr(k)}
                      onKeyDown={e => { if (e.key === "Enter") saveNr(k); if (e.key === "Escape") setEditNrId(null); }}
                      className="w-12 border rounded px-1.5 py-0.5 text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-lions-blue"
                    />
                  ) : (
                    <button
                      onClick={() => { setEditNrId(k.id); setEditNrWert(k.kuenstler_nr ?? ""); }}
                      className={`w-12 rounded px-1.5 py-0.5 text-xs font-mono text-center border transition-colors ${
                        k.kuenstler_nr
                          ? "font-semibold text-gray-700 border-gray-200 hover:border-lions-blue hover:text-lions-blue"
                          : "text-red-400 border-red-200 hover:border-red-400"
                      }`}
                      title="Klicken zum Bearbeiten"
                    >
                      {k.kuenstler_nr ?? "!"}
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 font-medium whitespace-nowrap">
                  {k.db_name}{k.db_vorname ? `, ${k.db_vorname}` : ""}
                  {(k as any).db_leben && <span className="ml-1.5 text-xs font-normal text-gray-400">{(k as any).db_leben}</span>}
                </td>
                <td className="px-3 py-2 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                  {(() => {
                    const bilder = bilderByKuenstler[k.id] ?? [];
                    if (bilder.length === 0) return <span className="text-gray-300 text-xs">—</span>;
                    return (
                      <button
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-lions-blue/10 text-lions-blue hover:bg-lions-blue/20 transition-colors"
                        onMouseEnter={e => {
                          if (hideTimer.current) clearTimeout(hideTimer.current);
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setPopover({ id: k.id, x: rect.left, y: rect.bottom + window.scrollY + 6 });
                        }}
                        onMouseLeave={() => {
                          hideTimer.current = setTimeout(() => setPopover(null), 200);
                        }}
                      >
                        {bilder.length} Bild{bilder.length !== 1 ? "er" : ""}
                      </button>
                    );
                  })()}
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
                <td className="px-3 py-2 text-center" onClick={e => toggleFeld(k, "zur_ausstellung_ansprechen", e)}>
                  <span className={`text-base cursor-pointer select-none ${k.zur_ausstellung_ansprechen ? "text-lions-blue hover:text-red-400" : "text-gray-300 hover:text-lions-blue"}`}>
                    {k.zur_ausstellung_ansprechen ? "✓" : "—"}
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

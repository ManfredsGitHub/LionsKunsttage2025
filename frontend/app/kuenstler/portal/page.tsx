"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getKuenstlerById, getKuenstler, updateProfil, dsgvoEinwilligung, getKuenstlerBilder, kuenstlerBildEinreichen, kuenstlerBildLoeschen, kuenstlerBildFotoHochladen, getKuenstlerNachrichten, nachrichtAlsGelesen } from "@/lib/api";
import { Kuenstler, Bild, Genre } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL;

type FormData = {
  db_beruf: string;
  db_kommentar: string;
  db_ausstellungen: string;
  db_leben: string;
  db_adresse: string;
  db_plz: string;
  db_ort: string;
  db_email: string;
  db_telefon: string;
  db_instagram: string;
  db_facebook: string;
  db_pinterest: string;
  db_webseite: string;
};

// ---------------------------------------------------------------------------
// A4-Vorschau-Komponente
// ---------------------------------------------------------------------------
function VitaVorschau({ kuenstler, form }: { kuenstler: Kuenstler; form: FormData }) {
  const ausstellungszeilen = form.db_ausstellungen
    ? form.db_ausstellungen.split("\n").filter(Boolean)
    : [];

  return (
    <div
      id="vita-preview"
      style={{
        background: "white",
        padding: "18mm 16mm 14mm",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "10.5pt",
        lineHeight: "1.45",
        color: "#1a1a1a",
        minHeight: "257mm",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "7mm" }}>
        <div>
          <div style={{ fontSize: "22pt", fontWeight: "bold", color: "#0f2d5e", lineHeight: 1.1 }}>
            {kuenstler.db_vorname} {kuenstler.db_name}
          </div>
          {form.db_beruf && (
            <div style={{ fontSize: "11pt", color: "#555", marginTop: "2mm", letterSpacing: "0.5px", textTransform: "uppercase" }}>
              {form.db_beruf}
            </div>
          )}
        </div>
        {kuenstler.portrait_foto && (
          <img
            src={`${API}${kuenstler.portrait_foto}`}
            alt="Portrait"
            style={{ width: "26mm", height: "26mm", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        )}
      </div>

      <div style={{ borderTop: "2.5px solid #0f2d5e", marginBottom: "6mm" }} />

      {/* Inspiration | Ausstellungen */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8mm", marginBottom: "5mm" }}>
        <div>
          <div style={{ fontSize: "8pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#888", marginBottom: "3mm" }}>
            Inspiration
          </div>
          <div style={{ fontSize: "10pt", whiteSpace: "pre-wrap", color: form.db_kommentar ? "#222" : "#ccc" }}>
            {form.db_kommentar || "Noch keine künstlerische Aussage eingetragen."}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "8pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#888", marginBottom: "3mm" }}>
            Ausstellungen & Auszeichnungen
          </div>
          {ausstellungszeilen.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {ausstellungszeilen.map((z, i) => (
                <li key={i} style={{ fontSize: "10pt", marginBottom: "1.5mm", paddingLeft: "3mm" }}>
                  {z.startsWith("•") ? z : `• ${z}`}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: "10pt", color: "#ccc" }}>Noch keine Ausstellungen eingetragen.</div>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #ddd", marginBottom: "5mm" }} />

      {/* Leben | Kontakt */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8mm" }}>
        <div>
          <div style={{ fontSize: "8pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#888", marginBottom: "3mm" }}>
            Leben / Ausbildung
          </div>
          <div style={{ fontSize: "10pt", whiteSpace: "pre-wrap", color: form.db_leben ? "#222" : "#ccc" }}>
            {form.db_leben || "Noch keine Angaben eingetragen."}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "8pt", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#888", marginBottom: "3mm" }}>
            Kontakt
          </div>
          <div style={{ fontSize: "10pt", lineHeight: "1.7", color: "#222" }}>
            {form.db_adresse && <div>{form.db_adresse}</div>}
            {(form.db_plz || form.db_ort) && <div>{[form.db_plz, form.db_ort].filter(Boolean).join(" ")}</div>}
            {form.db_telefon && <div>{form.db_telefon}</div>}
            {form.db_email && <div>{form.db_email}</div>}
            {form.db_webseite && <div>{form.db_webseite}</div>}
            {form.db_instagram && <div>{form.db_instagram}</div>}
            {form.db_facebook && <div>{form.db_facebook}</div>}
            {form.db_pinterest && <div>{form.db_pinterest}</div>}
            {!form.db_adresse && !form.db_email && !form.db_webseite && !form.db_instagram && (
              <div style={{ color: "#ccc" }}>Noch keine Kontaktdaten eingetragen.</div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "auto", paddingTop: "8mm", borderTop: "1px solid #eee", textAlign: "center", fontSize: "8pt", color: "#aaa" }}>
        Kunsttage auf der Ludwigshöhe · Eine Benefizveranstaltung der Lions Clubs der Südpfalz
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hauptseite
// ---------------------------------------------------------------------------
export default function KuenstlerPortalPage() {
  const router = useRouter();
  const [kuenstler, setKuenstler] = useState<Kuenstler | null>(null);
  const [form, setForm] = useState<FormData>({
    db_beruf: "", db_kommentar: "", db_ausstellungen: "",
    db_leben: "", db_adresse: "", db_plz: "", db_ort: "",
    db_email: "", db_telefon: "",
    db_instagram: "", db_facebook: "", db_pinterest: "", db_webseite: "",
  });
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState("");
  const [tab, setTab] = useState<"formular" | "vorschau">("formular");

  // Nachrichten-State
  type Nachricht = { id: number; betreff: string; text: string; erstellt_am: string; gelesen: boolean };
  const [nachrichten, setNachrichten] = useState<Nachricht[]>([]);
  const [offeneNachricht, setOffeneNachricht] = useState<number | null>(null);

  // Bilder-State
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [alleKuenstler, setAlleKuenstler] = useState<Kuenstler[]>([]);
  const [showBildForm, setShowBildForm] = useState(false);
  const [bildForm, setBildForm] = useState({ bildtitel: "", bildtechnik: "", genre: "Landschaft" as Genre, breite_rahmen_cm: "", hoehe_rahmen_cm: "", einlieferungspreis: "", anmerkung_bild: "", abrechnungsempf: "Künstler", galerist_id: "", in_ausstellung: true });
  const [bildFehler, setBildFehler] = useState("");
  const [bildLaden, setBildLaden] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("kuenstler_id");
    if (!id) { router.push("/kuenstler/login"); return; }
    getKuenstlerBilder(Number(id)).then(setBilder).catch(() => {});
    getKuenstlerNachrichten(Number(id)).then(setNachrichten).catch(() => {});
    getKuenstler().then(setAlleKuenstler).catch(() => {});
    getKuenstlerById(Number(id)).then((k) => {
      setKuenstler(k);
      setForm({
        db_beruf:         k.db_beruf         ?? "",
        db_kommentar:     k.db_kommentar     ?? "",
        db_ausstellungen: k.db_ausstellungen ?? "",
        db_leben:         k.db_leben         ?? "",
        db_adresse:       k.db_adresse       ?? "",
        db_plz:           (k as any).db_plz  ?? "",
        db_ort:           (k as any).db_ort  ?? "",
        db_email:         k.db_email         ?? "",
        db_telefon:       (k as any).db_telefon ?? "",
        db_instagram:     k.db_instagram     ?? "",
        db_facebook:      k.db_facebook      ?? "",
        db_pinterest:     (k as any).db_pinterest ?? "",
        db_webseite:      k.db_webseite      ?? "",
      });
    });
  }, []);

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSpeichern(e: React.FormEvent) {
    e.preventDefault();
    if (!kuenstler) return;
    setFehler("");
    try {
      await updateProfil(kuenstler.id, form);
      if (portraitFile) {
        const fd = new FormData();
        fd.append("file", portraitFile);
        const res = await fetch(`${API}/kuenstler/${kuenstler.id}/portrait`, { method: "POST", body: fd });
        const data = await res.json();
        setKuenstler(k => k ? { ...k, portrait_foto: data.portrait_foto } : k);
      }
      setGespeichert(true);
      setTimeout(() => setGespeichert(false), 3000);
    } catch (err: any) {
      setFehler(err.message);
    }
  }

  async function handleBildEinreichen(e: React.FormEvent) {
    e.preventDefault();
    if (!kuenstler) return;
    setBildFehler(""); setBildLaden(true);
    try {
      const neuesBild = await kuenstlerBildEinreichen(kuenstler.id, {
        bildtitel: bildForm.bildtitel,
        bildtechnik: bildForm.bildtechnik,
        genre: bildForm.genre,
        breite_rahmen_cm: Number(bildForm.breite_rahmen_cm) || 0,
        hoehe_rahmen_cm: Number(bildForm.hoehe_rahmen_cm) || 0,
        einlieferungspreis: bildForm.einlieferungspreis ? Number(bildForm.einlieferungspreis) : undefined,
        anmerkung_bild: bildForm.anmerkung_bild || undefined,
        abrechnungsempf: bildForm.abrechnungsempf,
        galerist_id: bildForm.abrechnungsempf === "Galerist" && bildForm.galerist_id ? Number(bildForm.galerist_id) : undefined,
        in_ausstellung: bildForm.in_ausstellung,
      });
      setBilder(prev => [...prev, neuesBild]);
      setBildForm({ bildtitel: "", bildtechnik: "", genre: "Landschaft", breite_rahmen_cm: "", hoehe_rahmen_cm: "", einlieferungspreis: "", anmerkung_bild: "", abrechnungsempf: "Künstler", galerist_id: "", in_ausstellung: true });
      setShowBildForm(false);
    } catch (err: any) { setBildFehler(err.message); }
    finally { setBildLaden(false); }
  }

  async function handleBildFoto(bild: Bild, file: File) {
    if (!kuenstler) return;
    try {
      const { bild_url_web } = await kuenstlerBildFotoHochladen(kuenstler.id, bild.id, file);
      setBilder(prev => prev.map(b => b.id === bild.id ? { ...b, bild_url_web } : b));
    } catch {}
  }

  async function handleBildLoeschen(bildId: number) {
    if (!kuenstler) return;
    try {
      await kuenstlerBildLoeschen(kuenstler.id, bildId);
      setBilder(prev => prev.filter(b => b.id !== bildId));
    } catch {}
  }

  async function handleDsgvo() {
    if (!kuenstler) return;
    await dsgvoEinwilligung(kuenstler.id);
    alert("Einwilligung erteilt. Vielen Dank.");
  }

  function handleDrucken() {
    window.print();
  }

  if (!kuenstler) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  return (
    <>
      {/* Print-Styles: nur #vita-preview drucken */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #__next > * { display: none !important; }
          #vita-print-wrapper { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          #vita-print-wrapper #vita-preview { box-shadow: none !important; }
          header, footer, nav { display: none !important; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Seitenkopf */}
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-md px-4 py-2.5 flex items-center justify-between gap-4 print:hidden">
          <p className="text-xs text-blue-700">
            💡 Speichern Sie diese Seite als <strong>Lesezeichen</strong> — so können Sie jederzeit ohne neuen Link zurückkehren.
          </p>
          <button onClick={() => window.location.href = "/kuenstler/login"}
            className="text-xs text-blue-500 hover:underline whitespace-nowrap flex-shrink-0">
            Abmelden
          </button>
        </div>

        {/* Nachrichten */}
        {nachrichten.length > 0 && (() => {
          const ungelesen = nachrichten.filter(n => !n.gelesen);
          return (
            <div className={`mb-6 rounded-lg border ${ungelesen.length > 0 ? "border-lions-blue/40 bg-blue-50" : "border-gray-200 bg-white"} overflow-hidden`}>
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 text-sm">Mitteilungen</span>
                  {ungelesen.length > 0 && (
                    <span className="bg-lions-blue text-white text-xs px-2 py-0.5 rounded-full font-bold">
                      {ungelesen.length} neu
                    </span>
                  )}
                </div>
              </div>
              <div className="divide-y">
                {nachrichten.map(n => (
                  <div key={n.id}>
                    <button
                      onClick={async () => {
                        const id = Number(localStorage.getItem("kuenstler_id"));
                        if (!n.gelesen) {
                          await nachrichtAlsGelesen(id, n.id).catch(() => {});
                          setNachrichten(prev => prev.map(x => x.id === n.id ? { ...x, gelesen: true } : x));
                        }
                        setOffeneNachricht(prev => prev === n.id ? null : n.id);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-white/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {!n.gelesen && <span className="w-2 h-2 rounded-full bg-lions-blue flex-shrink-0" />}
                        <span className={`text-sm truncate ${!n.gelesen ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                          {n.betreff}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-3">
                        {new Date(n.erstellt_am).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        {" "}{offeneNachricht === n.id ? "▲" : "▼"}
                      </span>
                    </button>
                    {offeneNachricht === n.id && (
                      <div className="px-4 pb-3 pt-1 bg-white/80 text-sm text-gray-700 whitespace-pre-wrap border-t">
                        {n.text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-lions-blue">Ihr Künstler-Portal</h1>
            <p className="text-gray-500">{kuenstler.db_vorname} {kuenstler.db_name}</p>
          </div>
          <button onClick={handleDrucken}
            className="flex items-center gap-2 px-4 py-2 border border-lions-blue text-lions-blue rounded-md text-sm hover:bg-lions-blue hover:text-white transition-colors">
            ⎙ Vita drucken / als PDF
          </button>
        </div>

        {/* Mobile Tab-Umschalter */}
        <div className="flex gap-2 mb-4 lg:hidden">
          {(["formular", "vorschau"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t ? "bg-lions-blue text-white" : "bg-white border text-gray-600"
              }`}>
              {t === "formular" ? "Formular" : "Vorschau"}
            </button>
          ))}
        </div>

        <div className="flex gap-8">
          {/* ---- Formular ---- */}
          <div className={`flex-1 min-w-0 ${tab === "vorschau" ? "hidden lg:block" : ""}`}>
            <form onSubmit={handleSpeichern} className="space-y-5">

              {/* Portrait */}
              <div className="bg-white rounded-lg shadow p-5">
                <h2 className="font-semibold text-gray-700 border-b pb-2 mb-4">Portrait-Foto</h2>
                <div className="flex items-center gap-4">
                  {kuenstler.portrait_foto ? (
                    <img src={`${API}${kuenstler.portrait_foto}`} alt="Portrait"
                      className="w-20 h-20 rounded-full object-cover shadow" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-lions-blue/10 flex items-center justify-center text-lions-blue font-bold text-2xl">
                      {kuenstler.db_vorname[0]}{kuenstler.db_name[0]}
                    </div>
                  )}
                  <input type="file" accept="image/*"
                    onChange={e => setPortraitFile(e.target.files?.[0] ?? null)}
                    className="text-sm text-gray-600" />
                </div>
              </div>

              {/* Vita-Felder */}
              <div className="bg-white rounded-lg shadow p-5 space-y-4">
                <h2 className="font-semibold text-gray-700 border-b pb-2">Vita</h2>

                <Field label="Berufsbezeichnung / Technik"
                  hint="z.B. »Malerin«, »Maler und Grafiker«, »BetonGestalten«">
                  <input value={form.db_beruf} onChange={set("db_beruf")}
                    placeholder="Malerin"
                    className="input" />
                </Field>

                <Field label="Inspiration / Künstlerische Aussage"
                  hint="Kurzer persönlicher Text — erscheint links auf der Vita">
                  <textarea rows={5} value={form.db_kommentar} onChange={set("db_kommentar")}
                    placeholder="Was inspiriert Sie? Was möchten Sie mit Ihrer Kunst ausdrücken?"
                    className="input" />
                </Field>

                <Field label="Ausstellungen & Auszeichnungen"
                  hint="Eine Ausstellung pro Zeile — wird als Aufzählung dargestellt">
                  <textarea rows={6} value={form.db_ausstellungen} onChange={set("db_ausstellungen")}
                    placeholder={"2023 Kunsttage auf der Ludwigshöhe\n2022 Galerie Musterstadt\n2020 Gruppenausstellung Neustadt"}
                    className="input" />
                </Field>

                <Field label="Leben / Ausbildung"
                  hint="Geburtsort, Ausbildung, künstlerischer Werdegang">
                  <textarea rows={5} value={form.db_leben} onChange={set("db_leben")}
                    placeholder={"geboren 1970 in Landau\nAusbildung …\nSeit 2010 als freie Künstlerin tätig"}
                    className="input" />
                </Field>
              </div>

              {/* Kontakt */}
              <div className="bg-white rounded-lg shadow p-5 space-y-4">
                <h2 className="font-semibold text-gray-700 border-b pb-2">Kontakt & Erreichbarkeit</h2>

                <Field label="Straße und Hausnummer" hint="Erscheint auf der Vita — nur wenn gewünscht">
                  <input value={form.db_adresse} onChange={set("db_adresse")}
                    placeholder="Musterstraße 1" className="input" />
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="PLZ">
                    <input value={form.db_plz} onChange={set("db_plz")}
                      placeholder="76829" className="input" />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Ort">
                      <input value={form.db_ort} onChange={set("db_ort")}
                        placeholder="Landau" className="input" />
                    </Field>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="E-Mail">
                    <input type="email" value={form.db_email} onChange={set("db_email")}
                      placeholder="ihre@email.de" className="input" />
                  </Field>
                  <Field label="Telefon">
                    <input value={form.db_telefon} onChange={set("db_telefon")}
                      placeholder="0621 000000" className="input" />
                  </Field>
                </div>
              </div>

              {/* Social Media */}
              <div className="bg-white rounded-lg shadow p-5 space-y-4">
                <div className="border-b pb-2">
                  <h2 className="font-semibold text-gray-700">Social Media & Online-Präsenz</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Bitte prüfen und ergänzen Sie Ihre Adressen — wir verlinken Sie im Katalog und nutzen sie für gemeinsame Beiträge.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Webseite">
                    <input value={form.db_webseite} onChange={set("db_webseite")}
                      placeholder="https://…" className="input" />
                  </Field>
                  <Field label="Instagram">
                    <input value={form.db_instagram} onChange={set("db_instagram")}
                      placeholder="https://instagram.com/…" className="input" />
                  </Field>
                  <Field label="Pinterest">
                    <input value={form.db_pinterest} onChange={set("db_pinterest")}
                      placeholder="https://pinterest.de/…" className="input" />
                  </Field>
                  <Field label="Facebook">
                    <input value={form.db_facebook} onChange={set("db_facebook")}
                      placeholder="https://facebook.com/…" className="input" />
                  </Field>
                </div>
              </div>

              {fehler && <p className="text-red-600 text-sm">{fehler}</p>}
              {gespeichert && <p className="text-green-600 text-sm font-medium">✓ Gespeichert</p>}

              <button type="submit"
                className="w-full bg-lions-blue text-white py-2.5 rounded-md font-medium hover:bg-blue-900 transition-colors">
                Vita speichern
              </button>

              {/* DSGVO */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <h3 className="font-semibold text-yellow-800 mb-1 text-sm">Einwilligung zur Veröffentlichung</h3>
                <p className="text-xs text-yellow-700 mb-1">
                  Ich willige ein, dass mein Name, mein Portrait-Foto, meine Vita und die Abbildungen meiner Werke für die
                  Kunsttage auf der Ludwigshöhe 2026 veröffentlicht werden (Webseite, Katalog, Druckmaterialien).
                </p>
                <p className="text-xs text-yellow-600 mb-3">
                  Die Einwilligung kann jederzeit widerrufen werden.{" "}
                  <a href="/datenschutz" target="_blank" className="underline">Datenschutzerklärung</a>
                </p>
                <button type="button" onClick={handleDsgvo}
                  className="bg-yellow-600 text-white px-4 py-1.5 rounded text-sm hover:bg-yellow-700 transition-colors">
                  Einwilligung erteilen
                </button>
              </div>
            </form>
          </div>

          {/* ---- A4-Vorschau ---- */}
          <div id="vita-print-wrapper"
            className={`w-full lg:w-[420px] xl:w-[480px] flex-shrink-0 ${tab === "formular" ? "hidden lg:block" : ""}`}>
            <div className="sticky top-6">
              <p className="text-xs text-gray-400 text-center mb-2">
                Vorschau · aktualisiert live beim Tippen
              </p>
              <div className="shadow-xl rounded overflow-hidden border border-gray-200">
                {kuenstler && <VitaVorschau kuenstler={kuenstler} form={form} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Bilder-Sektion ---- */}
      <div className="max-w-7xl mx-auto mt-10 print:hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-lions-blue">Meine Bilder</h2>
            <p className="text-sm text-gray-500">{bilder.length} {bilder.length === 1 ? "Werk" : "Werke"} eingereicht</p>
          </div>
          <div className="flex items-center gap-2">
            {bilder.length > 0 && (
              <button
                onClick={() => window.open("/kuenstler/aufsteller", "_blank")}
                className="px-4 py-2 border border-lions-blue text-lions-blue text-sm font-medium rounded-md hover:bg-lions-blue hover:text-white transition-colors whitespace-nowrap">
                ⎙ Aufsteller drucken
              </button>
            )}
            <button onClick={() => setShowBildForm(v => !v)}
              className="px-4 py-2 bg-lions-blue text-white text-sm font-medium rounded-md hover:bg-blue-900 transition-colors">
              {showBildForm ? "Abbrechen" : "+ Bild einreichen"}
            </button>
          </div>
        </div>

        {/* Neues-Bild-Formular */}
        {showBildForm && (
          <form onSubmit={handleBildEinreichen}
            className="bg-white rounded-lg shadow p-5 mb-6 space-y-4 border-l-4 border-lions-blue">
            <h3 className="font-semibold text-gray-700">Neues Bild einreichen</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Bildtitel *</label>
                <input required value={bildForm.bildtitel} onChange={e => setBildForm(f => ({...f, bildtitel: e.target.value}))}
                  placeholder="Titel des Werks" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Technik *</label>
                <input required value={bildForm.bildtechnik} onChange={e => setBildForm(f => ({...f, bildtechnik: e.target.value}))}
                  placeholder="z.B. Öl auf Leinwand" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Genre *</label>
                <select required value={bildForm.genre} onChange={e => setBildForm(f => ({...f, genre: e.target.value as Genre}))}
                  className="input">
                  {(["Abstrakt","Akt","Landschaft","Menschen","Pfalz","Portrait","Städte","Stilleben","Sonstiges"] as Genre[]).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Breite mit Rahmen (cm)</label>
                <input type="number" min="0" value={bildForm.breite_rahmen_cm} onChange={e => setBildForm(f => ({...f, breite_rahmen_cm: e.target.value}))}
                  placeholder="70" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Höhe mit Rahmen (cm)</label>
                <input type="number" min="0" value={bildForm.hoehe_rahmen_cm} onChange={e => setBildForm(f => ({...f, hoehe_rahmen_cm: e.target.value}))}
                  placeholder="50" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Einlieferungspreis (€)</label>
                <input type="number" min="0" value={bildForm.einlieferungspreis} onChange={e => setBildForm(f => ({...f, einlieferungspreis: e.target.value}))}
                  placeholder="500" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Anmerkung</label>
                <input value={bildForm.anmerkung_bild} onChange={e => setBildForm(f => ({...f, anmerkung_bild: e.target.value}))}
                  placeholder="Optionale Anmerkung" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Abrechnung über</label>
                <select value={bildForm.abrechnungsempf} onChange={e => setBildForm(f => ({...f, abrechnungsempf: e.target.value, galerist_id: ""}))} className="input">
                  <option value="Künstler">Künstler</option>
                  <option value="Galerist">Galerist / Sammler</option>
                </select>
              </div>
              {bildForm.abrechnungsempf === "Galerist" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Galerist / Sammler auswählen</label>
                  <select required value={bildForm.galerist_id} onChange={e => setBildForm(f => ({...f, galerist_id: e.target.value}))} className="input">
                    <option value="">— bitte wählen —</option>
                    {alleKuenstler.sort((a, b) => a.db_name.localeCompare(b.db_name)).map(k => (
                      <option key={k.id} value={k.id}>{k.db_name}, {k.db_vorname}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
              <div className="col-span-2">
                <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={bildForm.in_ausstellung}
                    onChange={e => setBildForm(f => ({...f, in_ausstellung: e.target.checked}))}
                    className="mt-0.5 rounded" />
                  <span>
                    <strong>Werk ist vor Ort bei der Ausstellung</strong>
                    <span className="block text-gray-400 text-xs mt-0.5">Deaktivieren, wenn das Werk nur im Online-Katalog erscheinen soll (nicht physisch ausgestellt und nicht vor Ort kaufbar)</span>
                  </span>
                </label>
              </div>
            {bildFehler && <p className="text-red-600 text-sm">{bildFehler}</p>}
            <button type="submit" disabled={bildLaden}
              className="bg-lions-blue text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-900 disabled:opacity-50">
              {bildLaden ? "Wird eingereicht…" : "Bild einreichen"}
            </button>
            <p className="text-xs text-gray-400">Das Foto können Sie nach dem Einreichen hochladen. Das Bild wird erst nach Freigabe durch die Veranstaltungsleitung sichtbar.</p>
          </form>
        )}

        {/* Bilder-Liste */}
        {bilder.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">Noch keine Bilder eingereicht.</p>
        ) : (
          <div className="space-y-3">
            {bilder.map(b => (
              <div key={b.id} className="bg-white rounded-lg shadow-sm border p-4 flex gap-4 items-start">
                {/* Thumbnail / Foto-Upload */}
                <label className="w-20 h-20 flex-shrink-0 rounded overflow-hidden bg-gray-100 cursor-pointer relative group">
                  {b.bild_url_web
                    ? <img src={`${API}${b.bild_url_web}`} alt={b.bildtitel} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 text-xs text-center p-1">
                        <span className="text-2xl">+</span>Foto
                      </div>
                  }
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs">
                    {b.bild_url_web ? "Ersetzen" : "Hochladen"}
                  </div>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleBildFoto(b, e.target.files[0])} />
                </label>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{b.bildtitel}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{b.bildtechnik} · {b.genre} · {b.breite_rahmen_cm > 0 ? `${b.breite_rahmen_cm} × ${b.hoehe_rahmen_cm} cm` : "Maße fehlen"}</p>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">Nr. {formatBildNr(b.bild_nr)}</p>
                      {b.einlieferungspreis && (
                        <p className="text-xs text-gray-500">Einlieferungspreis: {b.einlieferungspreis} € → Vorschlag: {b.verkaufspreis_vorschlag?.toFixed(0)} €</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.freigegeben ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {b.freigegeben ? "✓ Freigegeben" : "Ausstehend"}
                      </span>
                      <button
                        onClick={() => window.open(`/kuenstler/aufsteller?suche=${encodeURIComponent(b.bild_nr)}&vorschau=1`, "_blank")}
                        className="text-xs px-2 py-1 rounded border text-gray-500 hover:text-lions-blue hover:border-lions-blue transition-colors"
                        title="Aufsteller drucken">
                        ⎙
                      </button>
                      {!b.freigegeben && (
                        <button onClick={() => handleBildLoeschen(b.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                          title="Zurückziehen">×</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Globale Input-Styles */}
      <style>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 0.875rem;
          outline: none;
          resize: vertical;
        }
        .input:focus { border-color: #0f2d5e; box-shadow: 0 0 0 2px rgba(15,45,94,0.15); }
      `}</style>
    </>
  );
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getKuenstlerById, updateProfil, dsgvoEinwilligung } from "@/lib/api";
import { Kuenstler } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL;

type FormData = {
  db_beruf: string;
  db_kommentar: string;
  db_ausstellungen: string;
  db_leben: string;
  db_adresse: string;
  db_email: string;
  db_instagram: string;
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
            {form.db_adresse && <div style={{ whiteSpace: "pre-wrap" }}>{form.db_adresse}</div>}
            {form.db_email && <div>{form.db_email}</div>}
            {form.db_webseite && <div>{form.db_webseite}</div>}
            {form.db_instagram && <div>{form.db_instagram}</div>}
            {!form.db_adresse && !form.db_email && !form.db_webseite && (
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
    db_leben: "", db_adresse: "", db_email: "",
    db_instagram: "", db_webseite: "",
  });
  const [portraitFile, setPortraitFile] = useState<File | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState("");
  const [tab, setTab] = useState<"formular" | "vorschau">("formular");

  useEffect(() => {
    const id = localStorage.getItem("kuenstler_id");
    if (!id) { router.push("/kuenstler/login"); return; }
    getKuenstlerById(Number(id)).then((k) => {
      setKuenstler(k);
      setForm({
        db_beruf:         k.db_beruf         ?? "",
        db_kommentar:     k.db_kommentar     ?? "",
        db_ausstellungen: k.db_ausstellungen ?? "",
        db_leben:         k.db_leben         ?? "",
        db_adresse:       k.db_adresse       ?? "",
        db_email:         k.db_email         ?? "",
        db_instagram:     k.db_instagram     ?? "",
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
                <h2 className="font-semibold text-gray-700 border-b pb-2">Kontakt</h2>

                <Field label="Adresse" hint="Erscheint auf der Vita — nur wenn gewünscht">
                  <textarea rows={2} value={form.db_adresse} onChange={set("db_adresse")}
                    placeholder={"Musterstraße 1, 76829 Landau"} className="input" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="E-Mail">
                    <input type="email" value={form.db_email} onChange={set("db_email")}
                      placeholder="ihre@email.de" className="input" />
                  </Field>
                  <Field label="Webseite">
                    <input value={form.db_webseite} onChange={set("db_webseite")}
                      placeholder="https://…" className="input" />
                  </Field>
                  <Field label="Instagram">
                    <input value={form.db_instagram} onChange={set("db_instagram")}
                      placeholder="https://instagram.com/…" className="input" />
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
                <h3 className="font-semibold text-yellow-800 mb-1 text-sm">DSGVO-Einwilligung</h3>
                <p className="text-xs text-yellow-700 mb-3">
                  Ich willige ein, dass meine Daten und Bilder für die Kunsttage auf der Ludwigshöhe 2026 veröffentlicht werden.
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

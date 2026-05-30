"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Kuenstler } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function DruckenPage() {
  const { id } = useParams<{ id: string }>();
  const [kuenstler, setKuenstler] = useState<Kuenstler | null>(null);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    fetch(`${API}/admin/kuenstler/${id}`)
      .then(r => r.json())
      .then(setKuenstler)
      .catch(() => setFehler("Fehler beim Laden."));
  }, [id]);

  // App-Chrome ausblenden
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "drucken-override";
    style.textContent = `
      header { display: none !important; }
      body > footer, body > div > footer { display: none !important; }
      main { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("drucken-override")?.remove();
  }, []);

  useEffect(() => {
    if (kuenstler) {
      const name = [kuenstler.db_vorname, kuenstler.db_name].filter(Boolean).join(" ");
      document.title = `Vita – ${name}`;
      setTimeout(() => window.print(), 400);
    }
  }, [kuenstler]);

  if (fehler) return <p style={{ padding: 32, color: "red" }}>{fehler}</p>;
  if (!kuenstler) return <p style={{ padding: 32, color: "#888" }}>Laden…</p>;

  const name = [kuenstler.db_vorname, kuenstler.db_name].filter(Boolean).join(" ");
  const portrait = kuenstler.portrait_foto ? `${API}${kuenstler.portrait_foto}` : null;

  const adresse = [
    kuenstler.db_adresse,
    [kuenstler.db_plz, kuenstler.db_ort].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ");

  function textLines(text: string) {
    return text.trim().split("\n").map(l => l.trim()).filter(Boolean);
  }

  function ausstellungLines(text: string) {
    return text.trim().split("\n")
      .map(l => l.trim().replace(/^[•·\-]\s*/, ""))
      .filter(Boolean);
  }

return (
    <>
      <div id="no-print-bar">
        <button onClick={() => window.print()}>Drucken / Als PDF</button>
        <button onClick={() => window.close()}>Schließen</button>
      </div>

      <div id="vita">

        {/* ── Header ── */}
        <div id="header">
          <div id="portrait">
            {portrait
              ? <img src={portrait} alt={name} />
              : <div id="portrait-placeholder">{name[0]}</div>}
          </div>
          <div id="name-col">
            <h1>{name}</h1>
            <hr className="olive" />
            {kuenstler.db_beruf && <div id="beruf">{kuenstler.db_beruf}</div>}
          </div>
        </div>

        <hr className="olive thick" />

        {/* ── Body ── */}
        <div id="body">

          {/* Linke Spalte */}
          <div id="col-left">
            {kuenstler.db_inspiration && (
              <section>
                <h2>Inspiration</h2>
                <div className="box">
                  {textLines(kuenstler.db_inspiration).map((l, i) => <p key={i}>{l}</p>)}
                </div>
              </section>
            )}

            {(kuenstler.db_lebenstext || kuenstler.db_kommentar) && (
              <section>
                <h2>{kuenstler.db_lebenstext ? "Leben/Ausbildung" : "Kurzbiografie"}</h2>
                <div className="box">
                  {textLines(kuenstler.db_lebenstext || kuenstler.db_kommentar || "")
                    .map((l, i) => <p key={i}>{l}</p>)}
                </div>
              </section>
            )}

          </div>

          {/* Rechte Spalte */}
          <div id="col-right">
            {kuenstler.db_ausstellungen && (
              <section>
                <h2>Ausstellungen / Auszeichnungen</h2>
                <div className="box">
                  <ul>
                    {ausstellungLines(kuenstler.db_ausstellungen).map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Kontakt immer am unteren Ende der rechten Spalte */}
            <div id="kontakt-push" />
            <section id="kontakt">
              <h2>Kontakt</h2>
              <div className="box kontakt-grid">
                {[
                  ["Adr.",   adresse],
                  ["Web",    kuenstler.db_webseite || ""],
                  ["Tel.",   kuenstler.db_telefon || ""],
                  ["E-Mail", kuenstler.db_email || ""],
                  ["Insta",  kuenstler.db_instagram || ""],
                  ["FB",     kuenstler.db_facebook || ""],
                ].map(([label, val]) => (
                  <div key={label} className="krow">
                    <span className="klabel">{label}</span>
                    <span>{val}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer>
          <hr className="olive" />
          <div id="footer-text">
            Kunsttage auf der Ludwigshöhe · Eine Benefizveranstaltung der Lions Clubs der Südpfalz · Alle Erlöse für gemeinnützige Zwecke
          </div>
        </footer>
      </div>

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; background: #fff;
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }

        #no-print-bar {
          position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 999;
        }
        #no-print-bar button {
          padding: 6px 14px; font-size: 13px; border-radius: 4px; cursor: pointer; border: 1px solid #ccc;
        }
        #no-print-bar button:first-child { background: #1a3a6b; color: #fff; border-color: #1a3a6b; }

        #vita {
          width: 210mm; padding: 16mm 18mm; margin: 0 auto;
          min-height: 297mm; display: flex; flex-direction: column;
        }

        /* Header */
        #header { display: grid; grid-template-columns: 58mm 1fr; gap: 8mm; align-items: start; }
        #portrait img { width: 54mm; height: 54mm; object-fit: cover; display: block; }
        #portrait-placeholder {
          width: 54mm; height: 54mm; background: #ddd;
          display: flex; align-items: center; justify-content: center; font-size: 26pt; color: #888;
        }
        #name-col { padding-top: 2mm; }
        h1 { font-size: 26pt; font-weight: bold; line-height: 1.2; margin-bottom: 3mm; text-align: center; }
        hr.olive { border: none; border-top: 1px solid #7a8c50; margin: 2mm 0; }
        hr.thick { border-top-width: 1.5px; margin: 3mm 0 4mm; }
        #beruf {
          background: #888888; color: #fff; text-align: center;
          padding: 5px 10px; font-size: 14pt; margin-top: 3mm;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }

        /* Body */
        #body { display: grid; grid-template-columns: 44% 56%; flex: 1; margin-top: 2mm; }
        #col-left { padding-right: 6mm; }
        #col-right { padding-left: 2mm; display: flex; flex-direction: column; }
        #kontakt-push { flex: 1; min-height: 4mm; }

        section { margin-top: 5mm; }
        h2 { font-size: 11pt; font-weight: bold; margin-bottom: 2mm; }

        .box {
          background: #f4f4f2; border: 0.5px solid #d0d0c8;
          padding: 5px 8px; font-size: 8.5pt; line-height: 1.5;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .box p { margin: 1px 0; }
        .box ul { list-style: none; padding: 0; }
        .box ul li { padding-left: 10px; position: relative; margin: 1px 0; }
        .box ul li::before { content: "•"; position: absolute; left: 0; }

        /* Kontakt */
        .kontakt-grid { display: flex; flex-direction: column; gap: 0; }
        .krow { display: grid; grid-template-columns: 38px 1fr; gap: 4px; line-height: 1.7; }
        .klabel { font-weight: bold; }

        /* Footer */
        footer { margin-top: auto; padding-top: 3mm; }
        #footer-text {
          text-align: center;
          font-size: 10pt; color: #7a8c50; padding-top: 2mm;
        }

        @media print {
          #no-print-bar { display: none !important; }
          body { margin: 0; }
          #vita { width: 100%; padding: 12mm 15mm 28mm; min-height: auto; }
          footer { position: fixed; bottom: 0; left: 15mm; right: 15mm; background: white;
                   -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}

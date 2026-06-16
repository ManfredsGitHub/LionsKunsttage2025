"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getKauf } from "@/lib/api";
import { KaufDetail } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";

export default function QuittungPage() {
  const { id } = useParams<{ id: string }>();
  const [kauf, setKauf] = useState<KaufDetail | null>(null);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    getKauf(Number(id)).then(setKauf).finally(() => setLaden(false));
  }, [id]);

  useEffect(() => {
    if (!laden && kauf) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [laden, kauf]);

  if (laden) return <p style={{ padding: "2rem", fontFamily: "Georgia, serif" }}>Laden…</p>;
  if (!kauf) return <p style={{ padding: "2rem" }}>Kauf nicht gefunden.</p>;

  const kaeufer = [kauf.kaeufer_titel, kauf.kaeufer_vorname, kauf.kaeufer_name].filter(Boolean).join(" ");
  const datum = new Date(kauf.erstellt_am).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const abmessungen = (() => {
    const hatRahmen = kauf.breite_rahmen_cm && kauf.hoehe_rahmen_cm;
    const hatOhne = kauf.breite_cm && kauf.hoehe_cm;
    const unterschiedlich = hatRahmen && hatOhne &&
      (kauf.breite_rahmen_cm !== kauf.breite_cm || kauf.hoehe_rahmen_cm !== kauf.hoehe_cm);
    if (unterschiedlich)
      return `${kauf.breite_rahmen_cm} × ${kauf.hoehe_rahmen_cm} cm (mit Rahmen) · ${kauf.breite_cm} × ${kauf.hoehe_cm} cm ohne Rahmen`;
    if (hatRahmen) return `${kauf.breite_rahmen_cm} × ${kauf.hoehe_rahmen_cm} cm`;
    if (hatOhne) return `${kauf.breite_cm} × ${kauf.hoehe_cm} cm`;
    return null;
  })();

  return (
    <>
      <style>{`
        @media print {
          html, body { margin: 0; padding: 0; }
          .no-print { display: none !important; }
        }
        body { font-family: Georgia, 'Times New Roman', serif; background: #fff; }
      `}</style>

      {/* Drucken-Button — nur am Bildschirm */}
      <div className="no-print flex gap-3 p-4 bg-gray-50 border-b">
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-lions-blue text-white text-sm font-medium rounded-md hover:bg-blue-900"
        >
          Drucken / PDF
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300"
        >
          Schließen
        </button>
      </div>

      {/* Quittung */}
      <div style={{
        maxWidth: "180mm",
        margin: "0 auto",
        padding: "15mm 15mm",
        minHeight: "240mm",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Header */}
        <div style={{ borderBottom: "2px solid #0f2d5e", paddingBottom: "6mm", marginBottom: "8mm" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "8pt", color: "#888", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "2mm" }}>
                Lions Club Edenkoben · Kunsttage auf der Ludwigshöhe 2026
              </div>
              <div style={{ fontSize: "22pt", fontWeight: "bold", color: "#0f2d5e", lineHeight: 1 }}>
                Quittung
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "8pt", color: "#888" }}>Nr. {kauf.id}</div>
              <div style={{ fontSize: "9pt", color: "#333", marginTop: "1mm" }}>{datum}</div>
              {kauf.bezahlt && (
                <div style={{ fontSize: "8pt", color: "#16a34a", marginTop: "2mm", fontWeight: "bold" }}>
                  ✓ Bezahlt · {kauf.zahlungsart}
                </div>
              )}
              {!kauf.bezahlt && (
                <div style={{ fontSize: "8pt", color: "#b45309", marginTop: "2mm" }}>
                  Zahlung ausstehend · {kauf.zahlungsart}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kunstwerk */}
        <div style={{ marginBottom: "8mm" }}>
          <div style={{ fontSize: "7.5pt", color: "#888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "3mm" }}>
            Kunstwerk
          </div>
          <div style={{ fontSize: "16pt", fontWeight: "bold", color: "#0f2d5e", lineHeight: 1.2, marginBottom: "2mm" }}>
            {kauf.bildtitel ?? "—"}
          </div>
          {kauf.kuenstler && (
            <div style={{ fontSize: "11pt", color: "#333", marginBottom: "1.5mm" }}>
              {kauf.kuenstler}
              {kauf.kuenstler_beruf && (
                <span style={{ fontSize: "9pt", color: "#888", marginLeft: "6px" }}>{kauf.kuenstler_beruf}</span>
              )}
            </div>
          )}
          <div style={{ fontSize: "9pt", color: "#555", lineHeight: 1.6 }}>
            {kauf.bildtechnik && <span>{kauf.bildtechnik}</span>}
            {abmessungen && <span style={{ marginLeft: "8px", color: "#888" }}>· {abmessungen}</span>}
            {kauf.bild_nr && (
              <span style={{ marginLeft: "8px", color: "#aaa", fontFamily: "monospace" }}>
                · {formatBildNr(kauf.bild_nr)}
              </span>
            )}
          </div>
        </div>

        <div style={{ borderTop: "0.5px solid #eee", marginBottom: "8mm" }} />

        {/* Käufer */}
        <div style={{ marginBottom: "8mm" }}>
          <div style={{ fontSize: "7.5pt", color: "#888", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "3mm" }}>
            Käufer
          </div>
          <div style={{ fontSize: "11pt", color: "#333", lineHeight: 1.7 }}>
            <div style={{ fontWeight: "bold" }}>{kaeufer}</div>
            <div>{kauf.kaeufer_strasse}</div>
            <div>{kauf.kaeufer_plz} {kauf.kaeufer_ort}</div>
            <div style={{ color: "#888", fontSize: "9pt" }}>{kauf.kaeufer_email}</div>
          </div>
        </div>

        <div style={{ borderTop: "0.5px solid #eee", marginBottom: "8mm" }} />

        {/* Preis */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8mm" }}>
          <div style={{ fontSize: "11pt", color: "#555" }}>Kaufpreis</div>
          <div style={{ fontSize: "28pt", fontWeight: "bold", color: "#0f2d5e", lineHeight: 1 }}>
            {kauf.verkaufspreis ? `${kauf.verkaufspreis.toLocaleString("de-DE")} €` : "auf Anfrage"}
          </div>
        </div>

        {/* Hinweis */}
        <div style={{ fontSize: "7.5pt", color: "#aaa", lineHeight: 1.5, marginBottom: "8mm" }}>
          Der Erlös dient gemeinnützigen Zwecken des Lions Club Edenkoben e. V. ·
          Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.
        </div>

        {/* Unterschriften */}
        <div style={{ marginTop: "auto", display: "flex", gap: "20mm" }}>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: "0.5px solid #ccc", paddingTop: "2mm", fontSize: "7.5pt", color: "#aaa" }}>
              Datum / Unterschrift Käufer
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ borderTop: "0.5px solid #ccc", paddingTop: "2mm", fontSize: "7.5pt", color: "#aaa" }}>
              Datum / Unterschrift Lions Club
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

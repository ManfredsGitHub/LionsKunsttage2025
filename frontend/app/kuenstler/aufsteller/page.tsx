"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getKuenstlerById, getKuenstlerBilder } from "@/lib/api";
import { Bild, Kuenstler } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function KuenstlerAufstellerPage() {
  const router = useRouter();
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [kuenstler, setKuenstler] = useState<Kuenstler | null>(null);
  const [laden, setLaden] = useState(true);
  const [suche, setSuche] = useState("");
  const [vorschau, setVorschau] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("kuenstler_id");
    if (!id) { router.push("/kuenstler/login"); return; }
    const params = new URLSearchParams(window.location.search);
    const s = params.get("suche");
    if (s) setSuche(s);
    if (params.get("vorschau") === "1") setVorschau(true);

    Promise.all([
      getKuenstlerById(Number(id)),
      getKuenstlerBilder(Number(id)),
    ]).then(([k, b]) => {
      setKuenstler(k);
      // Künstler-Objekt in Bilder einbetten falls nicht vorhanden
      setBilder(b.map(bild => ({ ...bild, kuenstler: bild.kuenstler ?? k })));
    }).finally(() => setLaden(false));
  }, [router]);

  useEffect(() => {
    if (vorschau && !laden && bilder.length > 0) {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, [vorschau, laden, bilder]);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "aufsteller-print";
    style.textContent = `
      @media print {
        header, footer, nav, .no-print { display: none !important; }
        body { margin: 0; }
        main { padding: 0 !important; max-width: 100% !important; margin: 0 !important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById("aufsteller-print")?.remove();
  }, []);

  function abmessungen(b: Bild): string {
    const hatRahmen = b.breite_rahmen_cm && b.hoehe_rahmen_cm;
    const hatOhne = b.breite_cm && b.hoehe_cm;
    const unterschiedlich = hatRahmen && hatOhne &&
      (b.breite_rahmen_cm !== b.breite_cm || b.hoehe_rahmen_cm !== b.hoehe_cm);
    if (unterschiedlich)
      return `${b.breite_rahmen_cm} × ${b.hoehe_rahmen_cm} cm (mit Rahmen) · ${b.breite_cm} × ${b.hoehe_cm} cm ohne Rahmen`;
    if (hatRahmen) return `${b.breite_rahmen_cm} × ${b.hoehe_rahmen_cm} cm`;
    if (hatOhne) return `${b.breite_cm} × ${b.hoehe_cm} cm`;
    return "—";
  }

  const terme = suche.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  const sichtbar = terme.length
    ? bilder.filter(b =>
        terme.some(t =>
          b.bild_nr.toLowerCase().includes(t) ||
          b.bildtitel.toLowerCase().includes(t)
        )
      )
    : bilder;

  if (laden) return <p className="p-8 text-gray-400">Laden…</p>;

  return (
    <div>
      {/* Toolbar */}
      <div className={`no-print flex items-center gap-4 px-6 py-3 bg-white border-b sticky top-0 z-10${vorschau ? " hidden" : ""}`}>
        <div className="flex-1">
          <h1 className="font-bold text-lions-blue">Bildaufsteller</h1>
          <p className="text-xs text-gray-400">
            {kuenstler && `${kuenstler.db_vorname} ${kuenstler.db_name} · `}
            {terme.length ? `${sichtbar.length} von ${bilder.length}` : bilder.length} Aufsteller
          </p>
        </div>
        <input
          type="search"
          placeholder="Bild-Nr. oder Titel…"
          value={suche}
          onChange={e => setSuche(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue w-56"
        />
        {terme.length > 0 && (
          <button onClick={() => setSuche("")} className="text-sm text-gray-400 hover:text-gray-700 px-2">
            Alle anzeigen
          </button>
        )}
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (suche.trim()) params.set("suche", suche.trim());
            params.set("vorschau", "1");
            window.open(`/kuenstler/aufsteller?${params.toString()}`, "_blank");
          }}
          className="px-4 py-2 bg-lions-blue text-white text-sm font-medium rounded-md hover:bg-blue-900 whitespace-nowrap"
        >
          {terme.length ? `${sichtbar.length} drucken` : "Alle drucken"}
        </button>
        <button
          onClick={() => router.back()}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border rounded-md"
        >
          ← Zurück
        </button>
      </div>

      {/* Aufsteller-Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "2mm",
        padding: "0",
      }}>
        {sichtbar.map(b => (
          <Aufsteller key={b.id} bild={b} abmessungen={abmessungen(b)} />
        ))}
      </div>

      {bilder.length === 0 && (
        <p className="no-print text-center text-gray-400 py-16">Noch keine Bilder eingereicht.</p>
      )}
      {bilder.length > 0 && sichtbar.length === 0 && (
        <p className="no-print text-center text-gray-400 py-16">Keine Treffer für „{suche}"</p>
      )}
    </div>
  );
}

function Aufsteller({ bild: b, abmessungen }: { bild: Bild; abmessungen: string }) {
  const kuenstler = b.kuenstler
    ? `${b.kuenstler.db_vorname} ${b.kuenstler.db_name}`.trim()
    : "—";
  const beruf = b.kuenstler?.db_beruf ?? "";
  const leben = b.kuenstler?.db_leben ?? "";

  return (
    <div style={{
      width: "148mm",
      height: "105mm",
      boxSizing: "border-box",
      padding: "8mm 10mm",
      border: "0.4px solid #aaa",
      pageBreakInside: "avoid",
      breakInside: "avoid",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Georgia, 'Times New Roman', serif",
      backgroundColor: "#fff",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3mm" }}>
        <div style={{ fontSize: "7pt", color: "#888", letterSpacing: "0.5px", textTransform: "uppercase" }}>
          Kunsttage auf der Ludwigshöhe 2026
        </div>
        <div style={{ fontSize: "15pt", fontWeight: "bold", color: "#0f2d5e", fontFamily: "monospace" }}>
          {formatBildNr(b.bild_nr)}
        </div>
      </div>

      <div style={{ borderTop: "1.5px solid #0f2d5e", marginBottom: "4mm" }} />

      {/* Zweispaltiger Inhalt */}
      <div style={{ display: "flex", gap: "6mm", flex: 1, minHeight: 0 }}>

        {/* Linke Spalte: Text */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ fontSize: "15pt", fontWeight: "bold", color: "#0f2d5e", lineHeight: 1.15, marginBottom: "3mm", flexShrink: 0 }}>
            {b.bildtitel}
          </div>
          <div style={{ fontSize: "10pt", color: "#333", marginBottom: "1mm" }}>
            {kuenstler}
            {(beruf || leben) && (
              <span style={{ fontSize: "8pt", color: "#888", marginLeft: "4px" }}>
                {[beruf, leben].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
          <div style={{ fontSize: "8.5pt", color: "#555", lineHeight: 1.5 }}>
            {b.bildtechnik}
            {abmessungen !== "—" && (
              <span style={{ marginLeft: "8px", color: "#888" }}>· {abmessungen}</span>
            )}
          </div>

          {/* Anmerkung */}
          <div style={{ fontSize: "7.5pt", color: "#777", fontStyle: "italic", marginTop: "1.5mm", marginBottom: "auto" }}>
            {b.anmerkung_bild ?? ""}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "0.5px solid #eee", paddingTop: "3mm" }}>
            <div style={{ fontSize: "7.5pt", color: "#aaa" }}>{b.genre}</div>
            <div style={{ fontSize: "20pt", fontWeight: "bold", color: "#0f2d5e", lineHeight: 1 }}>
              {b.verkaufspreis ? `${b.verkaufspreis.toLocaleString("de-DE")} €` : "auf Anfrage"}
            </div>
          </div>
        </div>

        {/* Rechte Spalte: Bild */}
        {b.bild_url_web && (
          <div style={{
            width: "42mm",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f8f8f8",
            borderRadius: "1mm",
            overflow: "hidden",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${API}${b.bild_url_web}`}
              alt={b.bildtitel}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

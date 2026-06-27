"use client";
import Link from "next/link";
import { useState } from "react";
import { authHeaders } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const kacheln = [
  { href: "/admin/export", titel: "DATEV-Export", beschreibung: "Buchungsstapel, Debitoren, Kreditoren", icon: "📊" },
  { href: "/admin/import", titel: "CSV / Excel Import", beschreibung: "Galerie-Bilder importieren", icon: "📥" },
  { href: "/admin/archiv", titel: "Archivierung", beschreibung: "Nummernkreis exportieren & archivieren", icon: "🗄️" },
  { href: "/admin/impressum", titel: "Impressum", beschreibung: "Impressum bearbeiten", icon: "📄" },
  { href: "/admin/datenschutz", titel: "Datenschutz", beschreibung: "Datenschutzerklärung bearbeiten", icon: "🔒" },
];

export default function SonstigesPage() {
  const [laden, setLaden] = useState(false);

  async function drucklisteHerunterladen() {
    setLaden(true);
    try {
      const res = await fetch(`${API}/admin/druckliste`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "druckliste.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Fehler beim Herunterladen der Druckliste.");
    } finally {
      setLaden(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-lions-blue mb-2">Sonstiges</h1>
      <p className="text-gray-500 mb-8">DATEV, Import, Archiv, Impressum & Datenschutz</p>

      <div className="grid sm:grid-cols-3 gap-4">
        {kacheln.map((k) => (
          <Link key={k.href} href={k.href}>
            <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 h-full">
              <div className="text-3xl mb-3">{k.icon}</div>
              <h2 className="font-semibold text-gray-900">{k.titel}</h2>
              <p className="text-sm text-gray-500 mt-1">{k.beschreibung}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <button
          onClick={drucklisteHerunterladen}
          disabled={laden}
          className="bg-lions-gold text-white px-5 py-2 rounded-md font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50"
        >
          {laden ? "Wird erstellt…" : "Druckliste als CSV herunterladen"}
        </button>
      </div>
    </div>
  );
}

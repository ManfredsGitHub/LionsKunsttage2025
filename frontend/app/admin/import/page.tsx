"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [ergebnis, setErgebnis] = useState<{ importiert: number; fehler: any[] } | null>(null);
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState("");

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLaden(true);
    setFehler("");
    setErgebnis(null);
    const fd = new FormData();
    fd.append("file", file);
    const endpoint = file.name.endsWith(".csv") ? "csv" : "excel";
    try {
      const res = await fetch(`${API}/admin/import/${endpoint}`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setErgebnis(await res.json());
    } catch (err: any) {
      setFehler(err.message);
    } finally {
      setLaden(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-lions-blue mb-6">CSV / Excel Import</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-5">
        <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-600 space-y-3">
          <div>
            <p className="font-medium mb-1">Pflichtfelder:</p>
            <code className="text-xs block leading-relaxed text-gray-700">
              bild_nr, kuenstler_name, kuenstler_vorname, bildtitel,<br />
              bildtechnik, genre, hoehe_rahmen_cm, breite_rahmen_cm
            </code>
          </div>
          <div>
            <p className="font-medium mb-1">Optional — Maße &amp; Gewicht:</p>
            <code className="text-xs block leading-relaxed text-gray-700">
              hoehe_cm, breite_cm, tiefe_cm, gewicht_kg
            </code>
          </div>
          <div>
            <p className="font-medium mb-1">Optional — Sonstiges:</p>
            <code className="text-xs block leading-relaxed text-gray-700">
              anmerkung_bild, einlieferungspreis, verkaufspreis,<br />
              abrechnungsempf, bild_dateiname, galerist_name, galerist_vorname
            </code>
          </div>
          <p className="text-xs text-gray-400">Bei abrechnungsempf=Galerist werden galerist_name + galerist_vorname zur Zuordnung verwendet. Archiv-CSVs (mit Käufer-Spalten) können direkt reimportiert werden — die Käufer-Spalten werden ignoriert.</p>
        </div>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">CSV- oder Excel-Datei</label>
            <input type="file" accept=".csv,.xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm text-gray-600" required />
          </div>
          {fehler && <p className="text-red-600 text-sm">{fehler}</p>}
          <button type="submit" disabled={laden || !file}
            className="w-full bg-lions-blue text-white py-2 rounded-md font-medium hover:bg-blue-900 transition-colors disabled:opacity-50">
            {laden ? "Importiere…" : "Import starten"}
          </button>
        </form>

        {ergebnis && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-green-700 font-medium">{ergebnis.importiert} Datensätze erfolgreich importiert</p>
            {ergebnis.fehler.length > 0 && (
              <div>
                <p className="text-red-600 text-sm font-medium mb-1">{ergebnis.fehler.length} Fehler:</p>
                <ul className="text-xs text-red-500 space-y-1 max-h-40 overflow-y-auto">
                  {ergebnis.fehler.map((f, i) => (
                    <li key={i}>Zeile {f.zeile}: {f.fehler}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

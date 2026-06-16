"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function ExportPage() {
  const [berater, setBerater] = useState("");
  const [mandant, setMandant] = useState("1");
  const [wjBeginn, setWjBeginn] = useState("20260101");
  const [nurBezahlt, setNurBezahlt] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState("");

  async function exportieren() {
    if (!berater.trim()) {
      setFehler("Bitte Beraternummer eingeben.");
      return;
    }
    setFehler("");
    setLoading(true);
    try {
      const params = new URLSearchParams({
        berater: berater.trim(),
        mandant: mandant.trim(),
        wj_beginn: wjBeginn.trim(),
        nur_bezahlt: String(nurBezahlt),
      });
      const resp = await fetch(`${API}/admin/export/datev?${params}`);
      if (!resp.ok) throw new Error(`Fehler: ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DATEV_Kunsttage_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFehler(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-lions-blue mb-1">DATEV-Export</h1>
      <p className="text-gray-500 mb-8">
        Buchungsstapel, Debitoren- und Kreditoren-Stammdaten als DATEV EXTF ZIP
      </p>

      <div className="bg-white rounded-lg shadow p-6 space-y-5">

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beraternummer <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={berater}
              onChange={e => setBerater(e.target.value)}
              placeholder="z. B. 12345"
              className="w-full border rounded-md px-3 py-2 text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">Vom Steuerberater</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mandantennummer
            </label>
            <input
              type="number"
              value={mandant}
              onChange={e => setMandant(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Wirtschaftsjahr-Beginn
          </label>
          <input
            type="text"
            value={wjBeginn}
            onChange={e => setWjBeginn(e.target.value)}
            placeholder="YYYYMMDD"
            className="w-full border rounded-md px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">Format YYYYMMDD · z. B. 20260101</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="nurBezahlt"
            checked={nurBezahlt}
            onChange={e => setNurBezahlt(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          <label htmlFor="nurBezahlt" className="text-sm text-gray-700">
            Nur bezahlte Käufe exportieren (empfohlen)
          </label>
        </div>

        {fehler && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {fehler}
          </p>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm">
          <p className="font-medium text-blue-800 mb-2">ZIP-Inhalt:</p>
          <ul className="space-y-1 text-blue-700 text-xs font-mono">
            <li>EXTF_Buchungsstapel_2026.csv</li>
            <li>EXTF_Debitoren_2026.csv</li>
            <li>EXTF_Kreditoren_2026.csv</li>
            <li>Artikel_Bilder_2026.csv</li>
          </ul>
        </div>

        <button
          onClick={exportieren}
          disabled={loading}
          className="w-full bg-lions-blue text-white py-2.5 rounded-md font-medium hover:bg-blue-900 disabled:opacity-50 transition-colors"
        >
          {loading ? "Exportiere…" : "DATEV-Export herunterladen"}
        </button>
      </div>

      <div className="mt-6 bg-gray-50 border rounded-md p-4 text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-600">Verwendete Konten (SKR03):</p>
        <div className="grid grid-cols-2 gap-x-4 mt-1">
          <span>1000 · Kasse (Bar)</span>
          <span>8400 · Erlöse</span>
          <span>1200 · Bank (Überweisung)</span>
          <span>10001+ · Debitoren (Käufer)</span>
          <span>1361 · Kreditkarte</span>
          <span>70001+ · Kreditoren (Künstler)</span>
          <span>1362 · PayPal</span>
        </div>
        <p className="mt-2">Kontenplan bitte mit Steuerberater abstimmen.</p>
      </div>
    </div>
  );
}

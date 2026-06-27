"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Gruppe { name: string; anzahl: number; }
interface Vorschau { prafix: string; jahr: string; anzahl: number; gruppen: Gruppe[]; }
interface ArchivErgebnis { archiviert: number; dateien_verschoben: number; zielverzeichnis: string; csv: string; fehler: string[]; }
interface ArchivEintrag { jahr: string; datei: string; pfad: string; anzahl: number; }
interface ReimportErgebnis { importiert: number; import_fehler: any[]; dateien_zurueck: number; datei_fehler: string[]; }

export default function ArchivPage() {
  // Archivieren
  const [prafix, setPrafix] = useState("");
  const [vorschau, setVorschau] = useState<Vorschau | null>(null);
  const [vorschauLaden, setVorschauLaden] = useState(false);
  const [archivLaden, setArchivLaden] = useState(false);
  const [archivErgebnis, setArchivErgebnis] = useState<ArchivErgebnis | null>(null);
  const [archivFehler, setArchivFehler] = useState("");

  // Rück-Import
  const [archive, setArchive] = useState<ArchivEintrag[]>([]);
  const [archiveLaden, setArchiveLaden] = useState(true);
  const [reimportPfad, setReimportPfad] = useState<string | null>(null);
  const [reimportLaden, setReimportLaden] = useState(false);
  const [reimportErgebnis, setReimportErgebnis] = useState<ReimportErgebnis | null>(null);

  function ladeArchive() {
    setArchiveLaden(true);
    fetch(`${API}/admin/archiv/liste`)
      .then(r => r.json())
      .then(data => setArchive(Array.isArray(data) ? data : []))
      .catch(() => setArchive([]))
      .finally(() => setArchiveLaden(false));
  }
  useEffect(ladeArchive, []);

  async function handleVorschau() {
    setArchivFehler(""); setVorschau(null); setArchivErgebnis(null);
    setVorschauLaden(true);
    try {
      const res = await fetch(`${API}/admin/archiv/vorschau?prafix=${encodeURIComponent(prafix)}`);
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      setVorschau(await res.json());
    } catch (e: any) { setArchivFehler(e.message); }
    finally { setVorschauLaden(false); }
  }

  async function handleArchivieren() {
    if (!vorschau) return;
    setArchivFehler(""); setArchivLaden(true);
    try {
      const res = await fetch(`${API}/admin/archiv/erstellen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prafix }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      setArchivErgebnis(await res.json());
      setVorschau(null);
      ladeArchive();
    } catch (e: any) { setArchivFehler(e.message); }
    finally { setArchivLaden(false); }
  }

  async function handleReimport(pfad: string) {
    setReimportPfad(pfad); setReimportErgebnis(null); setReimportLaden(true);
    try {
      const res = await fetch(`${API}/admin/archiv/reimport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pfad }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      setReimportErgebnis(await res.json());
    } catch (e: any) { alert(e.message); }
    finally { setReimportLaden(false); setReimportPfad(null); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-lions-blue mb-1">Archivierung</h1>
        <p className="text-gray-500 text-sm">
          Bilder eines Nummernkreises als CSV exportieren, Bilddateien ins Archivverzeichnis verschieben und aus der Datenbank entfernen — oder ein bestehendes Archiv zurück importieren.
        </p>
      </div>

      {/* ── ARCHIVIEREN ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Nummernkreis archivieren</h2>

        {archivErgebnis ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-green-800 mb-3">Archivierung abgeschlossen</h3>
            <div className="space-y-1 text-sm text-green-700">
              <p>✓ <strong>{archivErgebnis.archiviert}</strong> Bilder aus der Datenbank entfernt</p>
              <p>✓ <strong>{archivErgebnis.dateien_verschoben}</strong> Bilddateien verschoben</p>
              <p>✓ CSV: <code className="bg-green-100 px-1 rounded text-xs">{archivErgebnis.csv}</code></p>
              <p>✓ Verzeichnis: <code className="bg-green-100 px-1 rounded text-xs">{archivErgebnis.zielverzeichnis}</code></p>
            </div>
            {archivErgebnis.fehler.length > 0 && (
              <div className="mt-2 text-sm text-red-600">{archivErgebnis.fehler.map((f, i) => <p key={i}>{f}</p>)}</div>
            )}
            <button onClick={() => { setArchivErgebnis(null); setPrafix(""); }}
              className="mt-4 px-4 py-2 bg-green-700 text-white text-sm rounded-md hover:bg-green-800">
              Neue Archivierung
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nummernkreis-Präfix</label>
              <p className="text-xs text-gray-400 mb-2">
                Jahrgang: <code className="bg-gray-100 px-1 rounded">25.</code> · Jahrgang + Künstler: <code className="bg-gray-100 px-1 rounded">25.400.</code>
              </p>
              <div className="flex gap-3">
                <input type="text" value={prafix}
                  onChange={e => { setPrafix(e.target.value); setVorschau(null); setArchivFehler(""); }}
                  placeholder="z. B. 25. oder 25.400."
                  className="flex-1 border rounded-md px-3 py-2 text-sm bg-gray-100 font-mono focus:outline-none focus:ring-2 focus:ring-lions-blue"
                />
                <button onClick={handleVorschau} disabled={!prafix.trim() || vorschauLaden}
                  className="px-4 py-2 bg-lions-blue text-white text-sm font-medium rounded-md hover:bg-blue-900 disabled:opacity-40 whitespace-nowrap">
                  {vorschauLaden ? "Laden…" : "Vorschau"}
                </button>
              </div>
              {archivFehler && <p className="mt-2 text-sm text-red-600">{archivFehler}</p>}
            </div>

            {vorschau && (
              <div>
                <div className="mb-3">
                  <p className="font-medium text-gray-800">
                    Archiv <span className="text-lions-blue font-mono">{vorschau.jahr}</span>
                    <span className="text-gray-400 font-normal text-sm ml-2">(Präfix {vorschau.prafix})</span>
                  </p>
                  <p className="text-sm text-gray-500"><strong>{vorschau.anzahl}</strong> Bilder werden archiviert</p>
                </div>
                <div className="border rounded-md overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs text-gray-400 uppercase tracking-wide">
                        <th className="px-4 py-2 text-left font-medium">Unterverzeichnis</th>
                        <th className="px-4 py-2 text-right font-medium">Bilder</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vorschau.gruppen.map(g => (
                        <tr key={g.name}>
                          <td className="px-4 py-2 font-mono text-gray-700 text-xs">{g.name}/</td>
                          <td className="px-4 py-2 text-right text-gray-600">{g.anzahl}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3 text-sm text-yellow-800">
                  <strong>Achtung:</strong> {vorschau.anzahl} Bilder werden dauerhaft aus der Datenbank gelöscht.
                </div>
                <div className="flex gap-3">
                  <button onClick={handleArchivieren} disabled={archivLaden}
                    className="px-6 py-2 bg-red-600 text-white text-sm font-semibold rounded-md hover:bg-red-700 disabled:opacity-40">
                    {archivLaden ? "Archiviere…" : `${vorschau.anzahl} Bilder archivieren`}
                  </button>
                  <button onClick={() => setVorschau(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300">
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── RÜCK-IMPORT ── */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Archiv zurück importieren</h2>

        {reimportErgebnis && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">Rück-Import abgeschlossen</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p>✓ <strong>{reimportErgebnis.importiert}</strong> Bilder in die Datenbank importiert</p>
              <p>✓ <strong>{reimportErgebnis.dateien_zurueck}</strong> Bilddateien zurückverschoben</p>
            </div>
            {reimportErgebnis.datei_fehler.length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                {reimportErgebnis.datei_fehler.map((f, i) => <p key={i}>{f}</p>)}
              </div>
            )}
            <button onClick={() => setReimportErgebnis(null)}
              className="mt-3 px-3 py-1.5 bg-blue-700 text-white text-sm rounded-md hover:bg-blue-800">
              OK
            </button>
          </div>
        )}

        {archiveLaden ? (
          <p className="text-gray-400 text-sm">Laden…</p>
        ) : archive.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-400 text-sm">
            Noch keine archivierten Nummernkreise vorhanden.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-400 uppercase tracking-wide">
                  <th className="px-4 py-2 text-left font-medium">Jahr</th>
                  <th className="px-4 py-2 text-left font-medium">Datei</th>
                  <th className="px-4 py-2 text-right font-medium">Bilder</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {archive.map(a => (
                  <tr key={a.pfad} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-lions-blue font-medium">{a.jahr}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{a.datei}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{a.anzahl}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`${a.anzahl} Bilder aus „${a.datei}" zurück in die Datenbank importieren?`))
                            handleReimport(a.pfad);
                        }}
                        disabled={reimportLaden && reimportPfad === a.pfad}
                        className="px-3 py-1.5 bg-lions-blue text-white text-xs font-medium rounded-md hover:bg-blue-900 disabled:opacity-40 whitespace-nowrap"
                      >
                        {reimportLaden && reimportPfad === a.pfad ? "Importiere…" : "Zurück importieren"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

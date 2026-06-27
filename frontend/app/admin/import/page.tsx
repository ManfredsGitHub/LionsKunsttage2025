"use client";
import { useState } from "react";
import { authHeaders } from "@/lib/auth";

const API = process.env.NEXT_PUBLIC_API_URL;

type BilderErgebnis = { importiert: number; fehler: any[] };
type KuenstlerErgebnis = { aktualisiert: number; neu: number; fehler: any[] };

function ImportBlock<T>({
  titel,
  beschreibung,
  felder,
  hinweis,
  endpoint,
  ergebnisRenderer,
}: {
  titel: string;
  beschreibung: string;
  felder: { label: string; felder: string }[];
  hinweis?: string;
  endpoint: (dateiname: string) => string;
  ergebnisRenderer: (e: T) => React.ReactNode;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [ergebnis, setErgebnis] = useState<T | null>(null);
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
    const url = `${API}${endpoint(file.name)}`;
    try {
      const res = await fetch(url, { method: "POST", headers: authHeaders(), body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `HTTP ${res.status}`);
      }
      setErgebnis(await res.json());
    } catch (err: any) {
      setFehler(err.message);
    } finally {
      setLaden(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-lions-blue mb-1">{titel}</h2>
        <p className="text-sm text-gray-500">{beschreibung}</p>
      </div>

      <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-600 space-y-3">
        {felder.map((g) => (
          <div key={g.label}>
            <p className="font-medium mb-1">{g.label}</p>
            <code className="text-xs block leading-relaxed text-gray-700 whitespace-pre-wrap">{g.felder}</code>
          </div>
        ))}
        {hinweis && <p className="text-xs text-gray-400">{hinweis}</p>}
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
          {ergebnisRenderer(ergebnis)}
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  return (
    <div className="max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-lions-blue">Import</h1>

      <ImportBlock<BilderErgebnis>
        titel="Bilder-Import (Kunsttage-Tabelle)"
        beschreibung="Importiert Bilder und legt fehlende Künstler automatisch an."
        felder={[
          {
            label: "Pflichtfelder:",
            felder: "bild_nr, kuenstler_name, kuenstler_vorname, bildtitel,\nbildtechnik, genre, hoehe_rahmen_cm, breite_rahmen_cm",
          },
          {
            label: "Optional — Maße & Gewicht:",
            felder: "hoehe_cm, breite_cm, tiefe_cm, gewicht_kg",
          },
          {
            label: "Optional — Sonstiges:",
            felder: "anmerkung_bild, einlieferungspreis, verkaufspreis,\nabrechnungsempf, bild_dateiname, galerist_name, galerist_vorname",
          },
        ]}
        hinweis="Bei abrechnungsempf=Galerist werden galerist_name + galerist_vorname zur Zuordnung verwendet."
        endpoint={(name) => name.endsWith(".csv") ? "/admin/import/csv" : "/admin/import/excel"}
        ergebnisRenderer={(e) => (
          <>
            <p className="text-green-700 font-medium">{e.importiert} Bilder erfolgreich importiert</p>
            {e.fehler.length > 0 && (
              <div>
                <p className="text-red-600 text-sm font-medium mb-1">{e.fehler.length} Fehler:</p>
                <ul className="text-xs text-red-500 space-y-1 max-h-40 overflow-y-auto">
                  {e.fehler.map((f, i) => <li key={i}>Zeile {f.zeile}: {f.fehler}</li>)}
                </ul>
              </div>
            )}
          </>
        )}
      />

      <ImportBlock<KuenstlerErgebnis>
        titel="Künstler-Daten-Import (Archiv-Tabelle)"
        beschreibung="Importiert biographische Daten aus der Galeristen-Datenbank. Vorhandene manuell gepflegte Felder werden nicht überschrieben."
        felder={[
          {
            label: "Pflichtfelder:",
            felder: "db_Name, db_Vorname",
          },
          {
            label: "Optional:",
            felder: "db_Leben, db_Kommentar, db_email, db_Telefon,\ndb_Instagram, db_Facebook, db_Pinterest, db_Webseite",
          },
        ]}
        hinweis="Künstler werden anhand von Name + Vorname abgeglichen. Bereits vorhandene Felder bleiben erhalten — nur leere Felder werden befüllt."
        endpoint={(name) => name.endsWith(".csv") ? "/admin/import/kuenstler-csv" : "/admin/import/kuenstler-excel"}
        ergebnisRenderer={(e) => (
          <>
            <div className="flex gap-4">
              {e.neu > 0 && <p className="text-green-700 font-medium">{e.neu} neu angelegt</p>}
              {e.aktualisiert > 0 && <p className="text-blue-700 font-medium">{e.aktualisiert} aktualisiert</p>}
            </div>
            {e.fehler.length > 0 && (
              <div>
                <p className="text-red-600 text-sm font-medium mb-1">{e.fehler.length} Fehler:</p>
                <ul className="text-xs text-red-500 space-y-1 max-h-40 overflow-y-auto">
                  {e.fehler.map((f, i) => <li key={i}>Zeile {f.zeile}: {f.fehler}</li>)}
                </ul>
              </div>
            )}
          </>
        )}
      />
    </div>
  );
}

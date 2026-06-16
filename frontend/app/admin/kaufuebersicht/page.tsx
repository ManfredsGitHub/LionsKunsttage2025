"use client";
import { useEffect, useState } from "react";
import { getAlleKaeufe, alsBezahltMarkieren } from "@/lib/api";
import { Kauf } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";

export default function KaufuebersichtPage() {
  const [kaeufe, setKaeufe] = useState<Kauf[]>([]);
  const [laden, setLaden] = useState(true);
  const [suche, setSuche] = useState("");

  function laden_() {
    setLaden(true);
    getAlleKaeufe().then(setKaeufe).finally(() => setLaden(false));
  }

  useEffect(laden_, []);

  async function handleBezahlt(k: Kauf) {
    await alsBezahltMarkieren(k.id);
    laden_();
  }

  const gefiltert = kaeufe.filter(k => {
    const s = suche.toLowerCase();
    return (
      !s ||
      k.kaeufer_name.toLowerCase().includes(s) ||
      k.kaeufer_vorname.toLowerCase().includes(s) ||
      k.kaeufer_email.toLowerCase().includes(s) ||
      (k.bild_nr ?? "").toLowerCase().includes(s) ||
      (k.bildtitel ?? "").toLowerCase().includes(s) ||
      (k.kuenstler ?? "").toLowerCase().includes(s)
    );
  });

  const gesamtErloese = kaeufe.reduce((s, k) => s + (k.verkaufspreis ?? 0), 0);
  const bezahltErloese = kaeufe.filter(k => k.bezahlt).reduce((s, k) => s + (k.verkaufspreis ?? 0), 0);

  if (laden) return <p className="p-8 text-gray-400">Laden…</p>;

  return (
    <div>
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b sticky top-0 z-10">
        <div className="flex-1">
          <h1 className="font-bold text-lions-blue">Kaufübersicht</h1>
          <p className="text-xs text-gray-400">
            {kaeufe.length} Verkäufe · {bezahltErloese.toLocaleString("de-DE")} € bezahlt
            {bezahltErloese < gesamtErloese && ` · ${(gesamtErloese - bezahltErloese).toLocaleString("de-DE")} € ausstehend`}
          </p>
        </div>
        <input
          type="search"
          placeholder="Käufer, Titel oder Bild-Nr.…"
          value={suche}
          onChange={e => setSuche(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue w-64"
        />
      </div>

      <div className="p-6">
        {gefiltert.length === 0 ? (
          <p className="text-center text-gray-400 py-16">
            {kaeufe.length === 0 ? "Noch keine Verkäufe erfasst." : `Keine Treffer für „${suche}"`}
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="pb-2 pr-4 font-medium">Datum</th>
                <th className="pb-2 pr-4 font-medium">Bild</th>
                <th className="pb-2 pr-4 font-medium">Künstler</th>
                <th className="pb-2 pr-4 font-medium">Käufer</th>
                <th className="pb-2 pr-4 font-medium">Zahlung</th>
                <th className="pb-2 pr-4 font-medium text-right">Preis</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gefiltert.map(k => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 text-gray-400 whitespace-nowrap font-mono text-xs">
                    {new Date(k.erstellt_am).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    <br />
                    <span className="text-gray-300">{new Date(k.erstellt_am).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-800 leading-tight">{k.bildtitel ?? "—"}</div>
                    <div className="font-mono text-xs text-gray-400 mt-0.5">{k.bild_nr ? formatBildNr(k.bild_nr) : "—"}</div>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{k.kuenstler ?? "—"}</td>
                  <td className="py-3 pr-4">
                    <div className="text-gray-800">
                      {[k.kaeufer_titel, k.kaeufer_vorname, k.kaeufer_name].filter(Boolean).join(" ")}
                    </div>
                    <div className="text-xs text-gray-400">{k.kaeufer_email}</div>
                    <div className="text-xs text-gray-400">{k.kaeufer_strasse}, {k.kaeufer_plz} {k.kaeufer_ort}</div>
                  </td>
                  <td className="py-3 pr-4 text-gray-500">{k.zahlungsart}</td>
                  <td className="py-3 pr-4 text-right font-semibold text-gray-800 whitespace-nowrap">
                    {k.verkaufspreis ? `${k.verkaufspreis.toLocaleString("de-DE")} €` : "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-col gap-1.5 items-start">
                      {k.bezahlt ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                          ✓ Bezahlt
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBezahlt(k)}
                          className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-medium transition-colors whitespace-nowrap"
                        >
                          Ausstehend
                        </button>
                      )}
                      <button
                        onClick={() => window.open(`/admin/kaufuebersicht/${k.id}/quittung`, "_blank")}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors whitespace-nowrap"
                      >
                        Quittung
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={5} className="pt-3 text-sm text-gray-500">Gesamt ({gefiltert.length} Verkäufe)</td>
                <td className="pt-3 text-right font-bold text-lions-blue">
                  {gefiltert.reduce((s, k) => s + (k.verkaufspreis ?? 0), 0).toLocaleString("de-DE")} €
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}

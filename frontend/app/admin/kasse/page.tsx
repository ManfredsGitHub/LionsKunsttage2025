"use client";
import { useEffect, useState } from "react";
import { getAlleBilder, kaufErfassen, alsBezahltMarkieren } from "@/lib/api";
import { Bild, KaufCreate } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";

const leerForm = (): Omit<KaufCreate, "bild_id"> => ({
  kaeufer_titel: "",
  kaeufer_vorname: "",
  kaeufer_name: "",
  kaeufer_strasse: "",
  kaeufer_plz: "",
  kaeufer_ort: "",
  kaeufer_email: "",
  zahlungsart: "Bar",
});

export default function KassePage() {
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [suche, setSuche] = useState("");
  const [gewaehlt, setGewaehlt] = useState<Bild | null>(null);
  const [form, setForm] = useState(leerForm());
  const [kaufId, setKaufId] = useState<number | null>(null);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    getAlleBilder().then(setBilder);
  }, []);

  const gefunden = bilder.filter(
    (b) =>
      b.verfuegbarkeit !== "Verkauft" &&
      (b.bild_nr.toLowerCase().includes(suche.toLowerCase()) ||
        b.bildtitel.toLowerCase().includes(suche.toLowerCase()))
  );

  async function handleKauf(e: React.FormEvent) {
    e.preventDefault();
    if (!gewaehlt) return;
    setFehler("");
    try {
      const res = await kaufErfassen({ ...form, bild_id: gewaehlt.id });
      setKaufId(res.id);
    } catch (err: any) {
      setFehler(err.message);
    }
  }

  async function handleBezahlt() {
    if (!kaufId) return;
    await alsBezahltMarkieren(kaufId);
    alert("Als bezahlt markiert. Bestätigungs-E-Mail wurde gesendet.");
    setGewaehlt(null);
    setKaufId(null);
    setForm(leerForm());
    getAlleBilder().then(setBilder);
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-lions-blue mb-6">Vor-Ort-Kasse</h1>

      {!gewaehlt ? (
        <div>
          <input
            placeholder="Bild-Nr. oder Titel suchen…"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            className="w-full border rounded-md px-4 py-2 mb-4 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue"
          />
          <div className="space-y-2">
            {gefunden.slice(0, 20).map((b) => (
              <button key={b.id} onClick={() => setGewaehlt(b)}
                className="w-full text-left bg-white border rounded-md px-4 py-3 hover:border-lions-blue transition-colors flex justify-between items-center">
                <span>
                  <span className="font-mono text-xs text-gray-400 mr-2">{formatBildNr(b.bild_nr)}</span>
                  <span className="font-medium">{b.bildtitel}</span>
                </span>
                <span className={`text-sm px-2 py-0.5 rounded-full ${b.verfuegbarkeit === "Verfügbar" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {b.verfuegbarkeit}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : kaufId ? (
        <div className="bg-green-50 border border-green-200 rounded-md p-6 space-y-4">
          <p className="font-semibold text-green-800">Kauf erfasst: {gewaehlt.bildtitel}</p>
          <p className="text-sm text-gray-600">Zahlungsart: {form.zahlungsart}</p>
          {form.zahlungsart !== "Überweisung" ? (
            <button onClick={handleBezahlt}
              className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors">
              Zahlung bestätigen & abschließen
            </button>
          ) : (
            <div className="text-sm text-gray-600">
              <p>Bankdaten wurden per E-Mail verschickt. Nach Zahlungseingang:</p>
              <button onClick={handleBezahlt} className="mt-2 bg-lions-blue text-white px-4 py-2 rounded-md text-sm">
                Als bezahlt markieren
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleKauf} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold text-lg">{gewaehlt.bildtitel}</h2>
              <p className="text-gray-500 text-sm">{formatBildNr(gewaehlt.bild_nr)} · {gewaehlt.verkaufspreis} €</p>
            </div>
            <button type="button" onClick={() => setGewaehlt(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <input placeholder="Titel" value={form.kaeufer_titel}
              onChange={(e) => setForm({ ...form, kaeufer_titel: e.target.value })}
              className="border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue" />
            <input required placeholder="Vorname" value={form.kaeufer_vorname}
              onChange={(e) => setForm({ ...form, kaeufer_vorname: e.target.value })}
              className="border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue" />
            <input required placeholder="Nachname" value={form.kaeufer_name}
              onChange={(e) => setForm({ ...form, kaeufer_name: e.target.value })}
              className="border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue" />
          </div>
          <input required placeholder="Straße und Hausnummer" value={form.kaeufer_strasse}
            onChange={(e) => setForm({ ...form, kaeufer_strasse: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue" />
          <div className="grid grid-cols-3 gap-3">
            <input required placeholder="PLZ" value={form.kaeufer_plz}
              onChange={(e) => setForm({ ...form, kaeufer_plz: e.target.value })}
              className="border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue" />
            <input required placeholder="Ort" value={form.kaeufer_ort}
              onChange={(e) => setForm({ ...form, kaeufer_ort: e.target.value })}
              className="col-span-2 border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue" />
          </div>
          <input required type="email" placeholder="E-Mail" value={form.kaeufer_email}
            onChange={(e) => setForm({ ...form, kaeufer_email: e.target.value })}
            className="w-full border rounded-md px-3 py-2 text-sm bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue" />

          <div>
            <label className="block text-sm text-gray-600 mb-1">Zahlungsart</label>
            <div className="flex gap-3">
              {(["Bar", "Kreditkarte", "PayPal", "Überweisung"] as const).map((z) => (
                <label key={z} className={`flex-1 border rounded-md p-3 text-center cursor-pointer text-sm transition-colors ${form.zahlungsart === z ? "border-lions-blue bg-lions-blue/5 font-medium" : "hover:border-gray-400"}`}>
                  <input type="radio" name="zahlungsart" value={z} checked={form.zahlungsart === z}
                    onChange={() => setForm({ ...form, zahlungsart: z })} className="hidden" />
                  {z}
                </label>
              ))}
            </div>
          </div>

          {fehler && <p className="text-red-600 text-sm">{fehler}</p>}
          <button type="submit"
            className="w-full bg-lions-blue text-white py-3 rounded-md font-semibold hover:bg-blue-900 transition-colors">
            Kauf erfassen
          </button>
        </form>
      )}
    </div>
  );
}

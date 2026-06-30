"use client";
import { useEffect, useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { getAlleBilder, kaufErfassen, alsBezahltMarkieren } from "@/lib/api";
import { Bild, KaufCreate, VERFUEGBARKEIT } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";

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

// ── PayPal-Bestätigungsblock ──────────────────────────────────────────────────
function PayPalZahlung({
  betrag,
  beschreibung,
  onErfolg,
  onFehler,
}: {
  betrag: number;
  beschreibung: string;
  onErfolg: () => void;
  onFehler: (msg: string) => void;
}) {
  if (!PAYPAL_CLIENT_ID) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        <p className="font-semibold mb-1">PayPal nicht konfiguriert</p>
        <p>
          Bitte <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_PAYPAL_CLIENT_ID</code> in{" "}
          <code className="bg-yellow-100 px-1 rounded">frontend/.env.local</code> eintragen.
        </p>
      </div>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: PAYPAL_CLIENT_ID,
        currency: "EUR",
        intent: "capture",
      }}
    >
      <PayPalButtons
        style={{ layout: "vertical", color: "blue", shape: "rect", label: "pay" }}
        createOrder={(_data, actions) =>
          actions.order.create({
            intent: "CAPTURE",
            purchase_units: [
              {
                amount: { value: betrag.toFixed(2), currency_code: "EUR" },
                description: beschreibung.slice(0, 127),
              },
            ],
          })
        }
        onApprove={async (_data, actions) => {
          await actions.order!.capture();
          onErfolg();
        }}
        onError={() => onFehler("PayPal-Zahlung fehlgeschlagen. Bitte erneut versuchen oder manuell bestätigen.")}
        onCancel={() => onFehler("Zahlung abgebrochen.")}
      />
    </PayPalScriptProvider>
  );
}

// ── Hauptseite ────────────────────────────────────────────────────────────────
export default function KassePage() {
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [suche, setSuche] = useState("");
  const [gewaehlt, setGewaehlt] = useState<Bild | null>(null);
  const [form, setForm] = useState(leerForm());
  const [kaufId, setKaufId] = useState<number | null>(null);
  const [fehler, setFehler] = useState("");
  const [paypalFehler, setPaypalFehler] = useState("");
  const [abgeschlossen, setAbgeschlossen] = useState(false);

  useEffect(() => {
    getAlleBilder().then(setBilder);
  }, []);

  const gefunden = bilder.filter(
    (b) =>
      b.verfuegbarkeit !== VERFUEGBARKEIT.VERKAUFT &&
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
    setAbgeschlossen(true);
    getAlleBilder().then(setBilder);
  }

  function reset() {
    setGewaehlt(null);
    setKaufId(null);
    setForm(leerForm());
    setFehler("");
    setPaypalFehler("");
    setAbgeschlossen(false);
  }

  // ── Abschlussmeldung ─────────────────────────────────────────────────────
  if (abgeschlossen) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-lions-blue mb-6">Vor-Ort-Kasse</h1>
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center space-y-3">
          <div className="text-4xl">✓</div>
          <p className="font-semibold text-green-800 text-lg">Zahlung abgeschlossen</p>
          <p className="text-sm text-green-700">
            {gewaehlt?.bildtitel} · {form.zahlungsart} · {gewaehlt?.verkaufspreis?.toFixed(2)} €
          </p>
          <p className="text-xs text-green-600">Bestätigungs-E-Mail wurde an {form.kaeufer_email} gesendet.</p>
          <button onClick={reset}
            className="mt-4 bg-lions-blue text-white px-6 py-2 rounded-lg hover:bg-blue-900 transition-colors text-sm font-medium">
            Nächsten Kauf erfassen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-lions-blue mb-6">Vor-Ort-Kasse</h1>

      {/* ── Schritt 1: Bild wählen ── */}
      {!gewaehlt ? (
        <div>
          <input
            placeholder="Bild-Nr. oder Titel suchen…"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            autoFocus
            className="w-full border rounded-md px-4 py-2 mb-4 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-lions-blue"
          />
          <div className="space-y-2">
            {gefunden.slice(0, 20).map((b) => (
              <button key={b.id} onClick={() => setGewaehlt(b)}
                className="w-full text-left bg-white border rounded-md px-4 py-3 hover:border-lions-blue transition-colors flex justify-between items-center">
                <span>
                  <span className="font-mono text-xs text-gray-400 mr-2">{formatBildNr(b.bild_nr)}</span>
                  <span className="font-medium">{b.bildtitel}</span>
                  {b.kuenstler && (
                    <span className="text-xs text-gray-400 ml-2">
                      {b.kuenstler.db_vorname} {b.kuenstler.db_name}
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  {b.verkaufspreis && (
                    <span className="text-sm font-semibold text-lions-blue">{b.verkaufspreis.toFixed(2)} €</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    b.verfuegbarkeit === VERFUEGBARKEIT.VERFUEGBAR ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  }`}>
                    {b.verfuegbarkeit}
                  </span>
                </span>
              </button>
            ))}
            {gefunden.length === 0 && suche && (
              <p className="text-center text-gray-400 text-sm py-8">Keine verfügbaren Bilder gefunden.</p>
            )}
          </div>
        </div>

      /* ── Schritt 3: PayPal-Zahlung ── */
      ) : kaufId && form.zahlungsart === "PayPal" ? (
        <div className="bg-white rounded-xl shadow p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800 text-lg">{gewaehlt.bildtitel}</p>
              <p className="text-sm text-gray-500">{formatBildNr(gewaehlt.bild_nr)} · {form.kaeufer_vorname} {form.kaeufer_name}</p>
            </div>
            <p className="text-2xl font-bold text-lions-blue">{gewaehlt.verkaufspreis?.toFixed(2)} €</p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-600 mb-3">
              Gerät dem Käufer zeigen oder QR-Code scannen lassen:
            </p>
            <PayPalZahlung
              betrag={gewaehlt.verkaufspreis ?? 0}
              beschreibung={`Kunstkauf: ${gewaehlt.bildtitel} (${formatBildNr(gewaehlt.bild_nr)})`}
              onErfolg={handleBezahlt}
              onFehler={setPaypalFehler}
            />
            {paypalFehler && (
              <p className="text-red-600 text-sm mt-2">{paypalFehler}</p>
            )}
          </div>

          <div className="border-t pt-3">
            <button onClick={handleBezahlt}
              className="text-sm text-gray-400 hover:text-gray-600 underline">
              Zahlung manuell als erhalten bestätigen
            </button>
          </div>
        </div>

      /* ── Schritt 3b: Bestätigung (Bar / Kreditkarte / Überweisung) ── */
      ) : kaufId ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
          <div>
            <p className="font-semibold text-green-800 text-lg">{gewaehlt.bildtitel}</p>
            <p className="text-sm text-gray-600">Zahlungsart: {form.zahlungsart}</p>
          </div>
          {form.zahlungsart !== "Überweisung" ? (
            <button onClick={handleBezahlt}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
              Zahlung bestätigen & abschließen
            </button>
          ) : (
            <div className="text-sm text-gray-600 space-y-2">
              <p>Bankverbindung wurde per E-Mail mitgeteilt. Nach Zahlungseingang:</p>
              <button onClick={handleBezahlt}
                className="bg-lions-blue text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-900 transition-colors">
                Als bezahlt markieren
              </button>
            </div>
          )}
        </div>

      /* ── Schritt 2: Käufer-Daten ── */
      ) : (
        <form onSubmit={handleKauf} className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-semibold text-lg">{gewaehlt.bildtitel}</h2>
              <p className="text-gray-500 text-sm">
                {formatBildNr(gewaehlt.bild_nr)}
                {gewaehlt.verkaufspreis && ` · ${gewaehlt.verkaufspreis.toFixed(2)} €`}
              </p>
            </div>
            <button type="button" onClick={() => setGewaehlt(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
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
            <label className="block text-sm text-gray-600 mb-2">Zahlungsart</label>
            <div className="flex gap-3">
              {(["Bar", "Kreditkarte", "PayPal", "Überweisung"] as const).map((z) => (
                <label key={z} className={`flex-1 border rounded-lg p-3 text-center cursor-pointer text-sm transition-colors ${
                  form.zahlungsart === z
                    ? "border-lions-blue bg-lions-blue/5 font-semibold text-lions-blue"
                    : "hover:border-gray-400"
                }`}>
                  <input type="radio" name="zahlungsart" value={z} checked={form.zahlungsart === z}
                    onChange={() => setForm({ ...form, zahlungsart: z })} className="hidden" />
                  {z === "PayPal" ? "🅿 PayPal" : z}
                </label>
              ))}
            </div>
            {form.zahlungsart === "PayPal" && (
              <p className="text-xs text-gray-400 mt-1.5">
                Nach dem Erfassen erscheint der PayPal-Button — Gerät dem Käufer zeigen.
              </p>
            )}
          </div>

          {fehler && <p className="text-red-600 text-sm">{fehler}</p>}
          <button type="submit"
            className="w-full bg-lions-blue text-white py-3 rounded-lg font-semibold hover:bg-blue-900 transition-colors">
            Kauf erfassen
          </button>
        </form>
      )}
    </div>
  );
}

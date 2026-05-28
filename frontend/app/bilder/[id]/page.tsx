"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBild, reservieren } from "@/lib/api";
import { Bild } from "@/lib/types";

export default function BildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bild, setBild] = useState<Bild | null>(null);
  const [fehler, setFehler] = useState("");
  const [form, setForm] = useState({ vorname: "", name: "", email: "", telefon: "" });
  const [erfolg, setErfolg] = useState(false);
  const [senden, setSenden] = useState(false);
  const [dsgvo, setDsgvo] = useState(false);

  useEffect(() => {
    getBild(Number(id)).then(setBild).catch(() => setFehler("Bild nicht gefunden."));
  }, [id]);

  async function handleReservieren(e: React.FormEvent) {
    e.preventDefault();
    if (!bild || !dsgvo) return;
    setSenden(true);
    try {
      await reservieren({ bild_id: bild.id, ...form });
      setErfolg(true);
      setBild({ ...bild, verfuegbarkeit: "Reserviert" });
    } catch (err: any) {
      setFehler(err.message);
    } finally {
      setSenden(false);
    }
  }

  if (fehler) return <p className="text-red-600">{fehler}</p>;
  if (!bild) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  const imgSrc = bild.bild_url_web
    ? `${process.env.NEXT_PUBLIC_API_URL}${bild.bild_url_web}`
    : "/placeholder.jpg";

  return (
    <div className="grid md:grid-cols-2 gap-10">
      {/* Bild */}
      <div>
        <img
          src={imgSrc}
          alt={bild.bildtitel}
          className="w-full rounded-lg shadow-lg object-contain max-h-[600px]"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg"; }}
        />
      </div>

      {/* Details */}
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-lions-blue">{bild.bildtitel}</h1>
          {bild.kuenstler && (
            <p className="text-lg text-gray-600 mt-1">
              {bild.kuenstler.db_vorname} {bild.kuenstler.db_name}
            </p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">Technik</dt>
          <dd className="font-medium">{bild.bildtechnik}</dd>
          <dt className="text-gray-500">Genre</dt>
          <dd className="font-medium">{bild.genre}</dd>
          {(bild.breite_rahmen_cm > 0 || bild.hoehe_rahmen_cm > 0) && (
            <>
              <dt className="text-gray-500">Maße mit Rahmen</dt>
              <dd className="font-medium">{bild.breite_rahmen_cm} × {bild.hoehe_rahmen_cm} cm</dd>
            </>
          )}
          {(bild.breite_cm || bild.hoehe_cm) && (
            <>
              <dt className="text-gray-500">Maße ohne Rahmen</dt>
              <dd className="font-medium">
                {bild.breite_cm ?? "?"} × {bild.hoehe_cm ?? "?"} cm
                {bild.tiefe_cm ? ` × ${bild.tiefe_cm} cm` : ""}
              </dd>
            </>
          )}
          {bild.gewicht_kg && (
            <>
              <dt className="text-gray-500">Gewicht</dt>
              <dd className="font-medium">{bild.gewicht_kg} kg</dd>
            </>
          )}
          <dt className="text-gray-500">Nr.</dt>
          <dd className="font-medium text-gray-400">{bild.bild_nr}</dd>
          {bild.verkaufspreis && (
            <>
              <dt className="text-gray-500">Preis</dt>
              <dd className="font-bold text-lions-blue text-lg">{bild.verkaufspreis.toFixed(0)} €</dd>
            </>
          )}
        </dl>

        {bild.anmerkung_bild && (
          <div className="bg-gray-50 rounded-md px-4 py-3 text-sm text-gray-600 leading-relaxed">
            {bild.anmerkung_bild}
          </div>
        )}

        {/* Verfügbarkeitsstatus */}
        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
          bild.verfuegbarkeit === "Verfügbar" ? "bg-green-100 text-green-800" :
          bild.verfuegbarkeit === "Reserviert" ? "bg-yellow-100 text-yellow-800" :
          "bg-red-100 text-red-800"
        }`}>
          {bild.verfuegbarkeit}
        </div>

        {/* Reservierungsformular */}
        {bild.verfuegbarkeit === "Verfügbar" && !erfolg && (
          <form onSubmit={handleReservieren} className="space-y-4 border-t pt-6">
            <h2 className="font-semibold text-gray-800">Werk reservieren</h2>
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Vorname" value={form.vorname}
                onChange={(e) => setForm({ ...form, vorname: e.target.value })}
                className="border rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-lions-blue" />
              <input required placeholder="Nachname" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-lions-blue" />
            </div>
            <input required type="email" placeholder="E-Mail" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-lions-blue" />
            <input placeholder="Telefon (optional)" value={form.telefon}
              onChange={(e) => setForm({ ...form, telefon: e.target.value })}
              className="border rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-lions-blue" />
            <label className="flex items-start gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={dsgvo} onChange={(e) => setDsgvo(e.target.checked)} className="mt-0.5" required />
              Ich stimme der Verarbeitung meiner Daten zur Abwicklung der Reservierung zu (DSGVO).
            </label>
            {fehler && <p className="text-red-600 text-sm">{fehler}</p>}
            <button type="submit" disabled={senden || !dsgvo}
              className="w-full bg-lions-blue text-white py-2 rounded-md font-medium hover:bg-blue-900 transition-colors disabled:opacity-50">
              {senden ? "Wird gesendet…" : "Jetzt reservieren"}
            </button>
          </form>
        )}

        {erfolg && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800">
            Ihre Reservierung wurde bestätigt. Sie erhalten eine E-Mail-Bestätigung.
          </div>
        )}
      </div>
    </div>
  );
}

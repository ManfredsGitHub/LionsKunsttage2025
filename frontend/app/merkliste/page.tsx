"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useMerkliste } from "@/lib/MerklisteContext";
import { getMerkliste, merklisteZusenden } from "@/lib/api";
import { formatBildNr } from "@/lib/utils";
import { Bild } from "@/lib/types";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function MerklistePage() {
  const { token, email, telefon, ids, toggle, openModal, updateProfil } = useMerkliste();
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [laden, setLaden] = useState(false);
  const [mailLaden, setMailLaden] = useState(false);
  const [mailStatus, setMailStatus] = useState<"" | "ok" | "fehler">("");
  const [emailErgaenzen, setEmailErgaenzen] = useState(false);
  const [neueEmail, setNeueEmail] = useState("");
  const [neuesTelefon, setNeuesTelefon] = useState("");
  const [profilLaden, setProfilLaden] = useState(false);

  const druckTitel = email
    ? `Kunsttag26_Merkliste_von_${email}`
    : "Kunsttag26_Merkliste";

  useEffect(() => {
    document.title = druckTitel;
    return () => { document.title = "Kunsttage auf der Ludwigshöhe"; };
  }, [druckTitel]);

  useEffect(() => {
    if (!token) return;
    setLaden(true);
    getMerkliste(token)
      .then(data => setBilder(data.bilder))
      .finally(() => setLaden(false));
  }, [token]);

  async function handleProfilSpeichern() {
    setProfilLaden(true);
    try {
      await updateProfil(neueEmail || undefined, neuesTelefon || undefined);
      setEmailErgaenzen(false);
      setNeueEmail(""); setNeuesTelefon("");
    } finally { setProfilLaden(false); }
  }

  async function handleZusenden() {
    if (!token) return;
    setMailLaden(true); setMailStatus("");
    try {
      await merklisteZusenden(token);
      setMailStatus("ok");
      setTimeout(() => setMailStatus(""), 4000);
    } catch {
      setMailStatus("fehler");
      setTimeout(() => setMailStatus(""), 4000);
    } finally { setMailLaden(false); }
  }

  async function handleRemove(bildId: number) {
    await toggle(bildId);
    setBilder(prev => prev.filter(b => b.id !== bildId));
  }

  if (!token) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-5 text-gray-300">♡</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Ihre Merkliste</h1>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Melden Sie sich an, um Ihre persönliche Favoritenliste zu erstellen und zur Ausstellung mitzubringen.
        </p>
        <button
          onClick={openModal}
          className="bg-lions-blue text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-900 transition-colors">
          Anmelden / Merkliste erstellen
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Kontakt-Info + E-Mail ergänzen */}
      {token && (
        <div className="mb-4 print:hidden">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            {email && <span>✉ {email}</span>}
            {telefon && <span>☏ {telefon}</span>}
            <button onClick={() => { setEmailErgaenzen(v => !v); setNeueEmail(email ?? ""); setNeuesTelefon(telefon ?? ""); }}
              className="text-lions-blue hover:underline text-xs">
              {emailErgaenzen ? "Abbrechen" : (email && telefon) ? "Kontakt bearbeiten" : "Kontakt ergänzen"}
            </button>
          </div>
          {emailErgaenzen && (
            <div className="mt-3 flex flex-wrap items-end gap-3 bg-gray-50 rounded-lg p-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">E-Mail</label>
                <input type="email" value={neueEmail} onChange={e => setNeueEmail(e.target.value)}
                  placeholder="ihre@email.de"
                  className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-lions-blue w-56" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefon</label>
                <input type="tel" value={neuesTelefon} onChange={e => setNeuesTelefon(e.target.value)}
                  placeholder="0611 12345"
                  className="border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-lions-blue w-40" />
              </div>
              <button onClick={handleProfilSpeichern} disabled={profilLaden || (!neueEmail && !neuesTelefon)}
                className="px-4 py-1.5 bg-lions-blue text-white text-sm rounded-md hover:bg-blue-900 disabled:opacity-50">
                {profilLaden ? "…" : "Speichern"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bildschirm-Kopfzeile */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-lions-blue">Meine Merkliste</h1>
        {bilder.length > 0 && (
          <div className="flex items-center gap-2">
            {/* E-Mail senden */}
            {email && (
              <div className="flex items-center gap-2">
                {mailStatus === "ok" && (
                  <span className="text-sm text-green-600">✓ Gesendet an {email}</span>
                )}
                {mailStatus === "fehler" && (
                  <span className="text-sm text-red-500">Fehler beim Senden</span>
                )}
                <button
                  onClick={handleZusenden}
                  disabled={mailLaden}
                  className="flex items-center gap-2 border border-lions-blue text-lions-blue px-4 py-2 rounded-lg text-sm font-medium hover:bg-lions-blue/5 transition-colors disabled:opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  {mailLaden ? "Wird gesendet…" : "Per E-Mail senden"}
                </button>
              </div>
            )}
            {/* Drucken */}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-lions-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              Liste drucken
            </button>
          </div>
        )}
      </div>

      {/* Druck-Kopfzeile */}
      <div className="hidden print:block mb-8">
        <div className="flex justify-between items-start border-b pb-4 mb-2">
          <div>
            <h1 className="text-xl font-bold">{druckTitel}</h1>
            <p className="text-sm text-gray-600 mt-0.5">Schloss Villa Ludwigshöhe · Edenkoben</p>
          </div>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}</p>
        </div>
        <p className="text-sm text-gray-500 italic">Bitte bringen Sie diese Liste zur Ausstellung mit. Die Preise sind unverbindlich.</p>
      </div>

      {laden ? (
        <p className="text-gray-400 animate-pulse">Laden…</p>
      ) : bilder.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>Ihre Merkliste ist leer.</p>
          <Link href="/" className="inline-block mt-3 text-lions-blue hover:underline text-sm">
            Zur Galerie →
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {bilder.map((b, i) => (
              <div key={b.id}
                className="bg-white rounded-lg shadow-sm border p-4 flex gap-4 items-start print:shadow-none print:border-gray-200 print:rounded-none print:border-0 print:border-b">
                {/* Laufende Nummer (nur Druck) */}
                <span className="hidden print:block text-gray-400 text-sm pt-1 w-5 flex-shrink-0">{i + 1}.</span>

                {/* Thumbnail */}
                <div className="w-20 flex-shrink-0 rounded overflow-hidden bg-gray-100 print:w-16">
                  {b.bild_url_web ? (
                    <img src={`${API}${b.bild_url_web}`} alt={b.bildtitel}
                      className="w-full h-auto block" />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center text-gray-300 text-xs">—</div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <a href={`/bilder/${b.id}`}
                      className="font-semibold text-gray-900 hover:text-lions-blue transition-colors print:text-black print:no-underline">
                      {b.bildtitel}
                    </a>
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                      b.verfuegbarkeit === "Verfügbar" ? "bg-green-100 text-green-800" :
                      b.verfuegbarkeit === "Reserviert" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>{b.verfuegbarkeit}</span>
                  </div>
                  {b.kuenstler && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {b.kuenstler.db_vorname} {b.kuenstler.db_name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-xs text-gray-500">
                    <span className="font-mono text-gray-400">Nr. {formatBildNr(b.bild_nr)}</span>
                    <span>{b.bildtechnik}</span>
                    {b.breite_rahmen_cm > 0 && (
                      <span>{b.breite_rahmen_cm} × {b.hoehe_rahmen_cm} cm</span>
                    )}
                    {b.verkaufspreis && (
                      <span className="text-lions-blue font-semibold print:text-black">
                        {b.verkaufspreis.toFixed(0)} €
                      </span>
                    )}
                  </div>
                  {b.anmerkung_bild && (
                    <p className="mt-1.5 text-xs text-gray-500 italic leading-relaxed">
                      {b.anmerkung_bild}
                    </p>
                  )}
                </div>

                {/* Entfernen-Button */}
                <button
                  onClick={() => handleRemove(b.id)}
                  className="print:hidden text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                  title="Entfernen">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-400 mt-4 print:hidden">
            {bilder.length} {bilder.length === 1 ? "Werk" : "Werke"} gespeichert
          </p>
        </>
      )}
    </div>
  );
}

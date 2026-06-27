"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getKuenstlerById, getBilder } from "@/lib/api";
import { Kuenstler, Bild } from "@/lib/types";
import BildCard from "@/components/BildCard";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function KuenstlerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [kuenstler, setKuenstler] = useState<Kuenstler | null>(null);
  const [bilder, setBilder] = useState<Bild[]>([]);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    const kid = Number(id);
    getKuenstlerById(kid)
      .then((k) => {
        setKuenstler(k);
        return getBilder({ kuenstler_id: kid, nur_verfuegbar: false });
      })
      .then(setBilder)
      .catch(() => setFehler("Künstler nicht gefunden."));
  }, [id]);

  if (fehler) return <p className="text-red-600">{fehler}</p>;
  if (!kuenstler) return <p className="text-gray-400 animate-pulse">Laden…</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-10">

      {/* Kopfbereich */}
      <div className="flex gap-6 items-start">
        {kuenstler.portrait_foto ? (
          <img
            src={`${API}${kuenstler.portrait_foto}`}
            alt={`${kuenstler.db_vorname} ${kuenstler.db_name}`}
            className="w-28 h-28 rounded-full object-cover flex-shrink-0 shadow"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-lions-blue/10 flex items-center justify-center flex-shrink-0 shadow">
            <span className="text-lions-blue font-bold text-3xl">
              {kuenstler.db_vorname[0]}{kuenstler.db_name[0]}
            </span>
          </div>
        )}
        <div className="pt-1">
          <h1 className="text-3xl font-bold text-lions-blue">
            {kuenstler.db_vorname} {kuenstler.db_name}
          </h1>
          <div className="flex gap-4 mt-3">
            {kuenstler.db_instagram && (
              <a href={kuenstler.db_instagram} target="_blank" rel="noopener noreferrer"
                className="text-sm text-lions-blue hover:underline">
                Instagram
              </a>
            )}
            {kuenstler.db_facebook && (
              <a href={kuenstler.db_facebook} target="_blank" rel="noopener noreferrer"
                className="text-sm text-lions-blue hover:underline">
                Facebook
              </a>
            )}
            {kuenstler.db_pinterest && (
              <a href={kuenstler.db_pinterest} target="_blank" rel="noopener noreferrer"
                className="text-sm text-lions-blue hover:underline">
                Pinterest
              </a>
            )}
            {kuenstler.db_webseite && (
              <a href={kuenstler.db_webseite} target="_blank" rel="noopener noreferrer"
                className="text-sm text-lions-blue hover:underline">
                Webseite
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Textabschnitte */}
      {(kuenstler.db_leben || kuenstler.db_kommentar || kuenstler.db_ausstellungen) && (
        <div className="grid md:grid-cols-2 gap-6">
          {(kuenstler.db_leben || kuenstler.db_kommentar) && (
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Biografie
              </h2>
              {kuenstler.db_leben && (
                <p className="text-sm font-medium text-gray-600 mb-1">{kuenstler.db_leben}</p>
              )}
              {kuenstler.db_kommentar && (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {kuenstler.db_kommentar}
                </p>
              )}
            </div>
          )}
          {kuenstler.db_ausstellungen && (
            <div className="bg-white rounded-lg shadow p-5 md:col-span-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Ausstellungen & Auszeichnungen
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {kuenstler.db_ausstellungen}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Werke */}
      <div>
        <h2 className="text-xl font-bold text-lions-blue mb-4">
          Werke {bilder.length > 0 && <span className="text-gray-400 font-normal text-base">({bilder.length})</span>}
        </h2>
        {bilder.length === 0 ? (
          <p className="text-gray-400 text-sm">Noch keine Werke veröffentlicht.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {bilder.map((b) => <BildCard key={b.id} bild={b} />)}
          </div>
        )}
      </div>

    </div>
  );
}

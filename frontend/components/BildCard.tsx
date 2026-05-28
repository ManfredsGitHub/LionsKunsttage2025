"use client";
import Link from "next/link";
import { Bild } from "@/lib/types";
import MerklistenButton from "./MerklistenButton";

const statusColors: Record<string, string> = {
  "Verfügbar": "bg-green-100 text-green-800",
  "Reserviert": "bg-yellow-100 text-yellow-800",
  "Verkauft": "bg-red-100 text-red-800",
};

export default function BildCard({ bild }: { bild: Bild }) {
  const imgSrc = bild.bild_url_web
    ? `${process.env.NEXT_PUBLIC_API_URL}${bild.bild_url_web}`
    : "/placeholder.jpg";

  return (
    <Link href={`/bilder/${bild.id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden group relative">
        <div className="relative aspect-[4/3] bg-gray-100">
          <img
            src={imgSrc}
            alt={bild.bildtitel}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg"; }}
          />
          <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full font-medium ${statusColors[bild.verfuegbarkeit]}`}>
            {bild.verfuegbarkeit}
          </span>
          {bild.in_ausstellung === false && (
            <span className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800">
              Online-Katalog
            </span>
          )}
        </div>
        <div className="p-4 pb-3">
          <p className="font-semibold text-gray-900 truncate">{bild.bildtitel}</p>
          {bild.kuenstler && (
            <p className="text-sm text-gray-500 mt-0.5">
              {bild.kuenstler.db_vorname} {bild.kuenstler.db_name}
            </p>
          )}
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-gray-400">{bild.bildtechnik}</span>
            {bild.verkaufspreis && (
              <span className="font-bold text-lions-blue">{bild.verkaufspreis.toFixed(0)} €</span>
            )}
          </div>
          {(bild.breite_rahmen_cm > 0 || bild.hoehe_rahmen_cm > 0) && (
            <p className="text-xs text-gray-400 mt-1">
              {bild.breite_rahmen_cm} × {bild.hoehe_rahmen_cm} cm
            </p>
          )}
        </div>
        <div className="absolute bottom-3 right-3" onClick={e => e.stopPropagation()}>
          <MerklistenButton bildId={bild.id} />
        </div>
      </div>
    </Link>
  );
}

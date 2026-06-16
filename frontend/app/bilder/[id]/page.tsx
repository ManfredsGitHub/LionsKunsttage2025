"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBild, reservieren, getBildFotosPublic } from "@/lib/api";
import { Bild, BildFoto } from "@/lib/types";
import { formatBildNr } from "@/lib/utils";
import MerklistenButton from "@/components/MerklistenButton";

const API = process.env.NEXT_PUBLIC_API_URL;

// ---------------------------------------------------------------------------
// Maßstabgerechte Wandansicht
// ---------------------------------------------------------------------------
function WandVorschau({ bild }: { bild: Bild }) {
  const h = (bild.hoehe_rahmen_cm ?? 0) > 0 ? bild.hoehe_rahmen_cm! : (bild.hoehe_cm ?? 0);
  const w = (bild.breite_rahmen_cm ?? 0) > 0 ? bild.breite_rahmen_cm! : (bild.breite_cm ?? 0);
  if (h === 0 && w === 0) return null;

  const SCENE_W = 600;
  const SCENE_H = 380;
  const FLOOR_PX = 44;
  const floor_y = SCENE_H - FLOOR_PX;

  // Raumhöhe dynamisch: Tür (200cm) oder Bild — was größer ist, plus Luft
  const DOOR_H_CM = 200, DOOR_W_CM = 90;
  const roomH_cm = Math.max(240, h + 60);
  const scale = (floor_y - 10) / roomH_cm;

  const door_h = DOOR_H_CM * scale;
  const door_w = DOOR_W_CM * scale;
  const door_x = SCENE_W - door_w - 50;
  const door_y = floor_y - door_h;

  const img_h = h * scale;
  const img_w = w * scale;

  // Bild bei Augenhöhe (155 cm) zentriert hängen
  const hang_y = floor_y - 155 * scale;
  const img_y = hang_y - img_h / 2;
  // Horizontal mittig im Wandbereich links der Tür
  const img_x = (door_x - img_w) / 2;

  const imgSrc = bild.bild_url_web ? `${API}${bild.bild_url_web}` : null;

  return (
    <div className="mt-4">
      <p className="text-xs text-gray-400 mb-1.5 text-center">
        Wandansicht (maßstabgerecht) · Tür als Referenz: 200 × 90 cm
      </p>
      <svg
        viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}
        className="w-full rounded-lg overflow-hidden border border-gray-100"
        style={{ background: "#f5f0eb" }}
      >
        {/* Wand */}
        <rect x={0} y={0} width={SCENE_W} height={floor_y} fill="#f5f0eb" />
        {/* Boden */}
        <rect x={0} y={floor_y} width={SCENE_W} height={FLOOR_PX} fill="#d9cfc3" />
        {/* Sockelleiste */}
        <rect x={0} y={floor_y} width={SCENE_W} height={5} fill="#c8bdb0" />

        {/* Bildschatten */}
        <rect x={img_x + 5} y={img_y + 5} width={img_w} height={img_h}
          fill="rgba(0,0,0,0.12)" rx={2} />
        {/* Rahmen */}
        <rect x={img_x} y={img_y} width={img_w} height={img_h}
          fill="#7a5c2e" rx={2} />
        {/* Passepartout */}
        <rect x={img_x + 5} y={img_y + 5} width={img_w - 10} height={img_h - 10}
          fill="#ede8e0" />
        {/* Bild-URL oder leere Fläche */}
        {imgSrc ? (
          <image href={imgSrc}
            x={img_x + 5} y={img_y + 5}
            width={img_w - 10} height={img_h - 10}
            preserveAspectRatio="xMidYMid meet" />
        ) : (
          <text x={img_x + img_w / 2} y={img_y + img_h / 2}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fill="#bbb">Kein Foto</text>
        )}
        {/* Nagel */}
        <line x1={img_x + img_w / 2} y1={img_y} x2={img_x + img_w / 2} y2={img_y - 6}
          stroke="#888" strokeWidth={1.5} />
        <circle cx={img_x + img_w / 2} cy={img_y - 7} r={2.5} fill="#999" />

        {/* Maß-Beschriftung Bild */}
        <text x={img_x + img_w / 2} y={Math.min(img_y + img_h + 16, floor_y - 4)}
          textAnchor="middle" fontSize={11} fill="#666" fontFamily="sans-serif">
          {w} × {h} cm
        </text>

        {/* Türzarge */}
        <rect x={door_x - 7} y={door_y - 4} width={door_w + 14} height={door_h + 4}
          fill="#c4b5a2" rx={2} />
        {/* Türblatt */}
        <rect x={door_x} y={door_y} width={door_w} height={door_h}
          fill="#e4d9cc" />
        {/* Türfüllungen */}
        <rect x={door_x + 7} y={door_y + 10} width={door_w - 14} height={door_h * 0.42}
          fill="none" stroke="#cfc3b4" strokeWidth={1.5} rx={2} />
        <rect x={door_x + 7} y={door_y + door_h * 0.52} width={door_w - 14} height={door_h * 0.38}
          fill="none" stroke="#cfc3b4" strokeWidth={1.5} rx={2} />
        {/* Türknauf */}
        <circle cx={door_x + 14} cy={door_y + door_h * 0.55} r={4} fill="#b0a090" />
        <circle cx={door_x + 14} cy={door_y + door_h * 0.55} r={2} fill="#c8b8a4" />

        {/* Tür-Beschriftung */}
        <text x={door_x + door_w / 2} y={door_y - 11}
          textAnchor="middle" fontSize={10} fill="#aaa" fontFamily="sans-serif">
          200 × 90 cm
        </text>
      </svg>
    </div>
  );
}

export default function BildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [bild, setBild] = useState<Bild | null>(null);
  const [fehler, setFehler] = useState("");
  const [form, setForm] = useState({ vorname: "", name: "", email: "", telefon: "" });
  const [erfolg, setErfolg] = useState(false);
  const [senden, setSenden] = useState(false);
  const [dsgvo, setDsgvo] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [aktivFoto, setAktivFoto] = useState<string | null>(null);
  const [zusatzFotos, setZusatzFotos] = useState<BildFoto[]>([]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox]);

  useEffect(() => {
    getBild(Number(id)).then(b => { setBild(b); setAktivFoto(b.bild_url_web ?? null); }).catch(() => setFehler("Bild nicht gefunden."));
    getBildFotosPublic(Number(id)).then(setZusatzFotos).catch(() => {});
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

  const imgSrc = aktivFoto ? `${API}${aktivFoto}` : "/placeholder.jpg";
  const alleUrls = [bild.bild_url_web, ...zusatzFotos.map(f => f.url)].filter(Boolean) as string[];

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 text-sm text-lions-blue hover:text-blue-900"
      >
        ← Zurück zur Galerie
      </button>
    <div className="grid md:grid-cols-2 gap-10">
      {/* Bild + Wandansicht */}
      <div>
        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out"
            onClick={() => setLightbox(false)}
          >
            <img
              src={imgSrc}
              alt={bild.bildtitel}
              className="max-w-full max-h-full object-contain select-none"
              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg"; }}
            />
          </div>
        )}
        <img
          src={imgSrc}
          alt={bild.bildtitel}
          className="w-full rounded-lg shadow-lg object-contain max-h-[600px] cursor-zoom-in"
          onClick={() => setLightbox(true)}
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.jpg"; }}
        />

        {/* Thumbnail-Galerie bei mehreren Fotos */}
        {alleUrls.length > 1 && (
          <div className="flex gap-2 mt-3">
            {alleUrls.map(url => (
              <button
                key={url}
                onClick={() => setAktivFoto(url)}
                className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-colors flex-shrink-0 ${
                  aktivFoto === url ? "border-lions-blue" : "border-transparent hover:border-gray-300"
                }`}
              >
                <img src={`${API}${url}`} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <WandVorschau bild={bild} />
      </div>

      {/* Details */}
      <div className="space-y-6">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-bold text-lions-blue">{bild.bildtitel}</h1>
            <MerklistenButton bildId={bild.id} size="md"
              className="flex-shrink-0 mt-1" />
          </div>

          {bild.kuenstler && (
            <div className="mt-3 flex items-start gap-3">
              {/* Portrait */}
              {bild.kuenstler.portrait_foto ? (
                <img
                  src={`${API}${bild.kuenstler.portrait_foto}`}
                  alt="Portrait"
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0 mt-0.5 shadow"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-lions-blue/10 flex items-center justify-center
                  text-lions-blue font-bold text-sm flex-shrink-0 mt-0.5">
                  {bild.kuenstler.db_vorname?.[0]}{bild.kuenstler.db_name?.[0]}
                </div>
              )}

              <div className="min-w-0">
                <a href={`/kuenstler/${bild.kuenstler.id}`}
                  className="text-lg font-medium text-gray-800 hover:text-lions-blue transition-colors">
                  {bild.kuenstler.db_vorname} {bild.kuenstler.db_name}
                </a>
                {bild.kuenstler.db_beruf && (
                  <p className="text-sm text-gray-500">{bild.kuenstler.db_beruf}</p>
                )}
                {bild.kuenstler.db_kommentar && (
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-3">
                    {bild.kuenstler.db_kommentar}
                  </p>
                )}
                <a href={`/kuenstler/${bild.kuenstler.id}`}
                  className="inline-block mt-1.5 text-xs text-lions-blue hover:underline">
                  Portrait & Vita ansehen →
                </a>
              </div>
            </div>
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
          <dd className="font-medium text-gray-400">{formatBildNr(bild.bild_nr)}</dd>
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

        {/* Verfügbarkeitsstatus + Ausstellungskontext */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
            bild.verfuegbarkeit === "Verfügbar" ? "bg-green-100 text-green-800" :
            bild.verfuegbarkeit === "Reserviert" ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }`}>
            {bild.verfuegbarkeit}
          </div>
          {bild.in_ausstellung === false && (
            <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Online-Katalog · Abrechnung über Lions
            </div>
          )}
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
    </div>
  );
}

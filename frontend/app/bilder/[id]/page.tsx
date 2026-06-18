import type { Metadata } from "next";
import BildDetailClient from "./BildDetailClient";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function fetchBild(id: string) {
  try {
    const res = await fetch(`${API}/bilder/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const bild = await fetchBild(params.id);
  if (!bild) return { title: "Bild" };

  const kuenstler = bild.kuenstler
    ? `${bild.kuenstler.db_vorname} ${bild.kuenstler.db_name}`.trim()
    : "";
  const title = kuenstler ? `${bild.bildtitel} – ${kuenstler}` : bild.bildtitel;
  const description = [
    bild.bildtechnik,
    bild.genre,
    bild.breite_rahmen_cm && bild.hoehe_rahmen_cm
      ? `${bild.breite_rahmen_cm} × ${bild.hoehe_rahmen_cm} cm`
      : null,
    bild.verkaufspreis ? `${bild.verkaufspreis.toFixed(0)} €` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const ogImage = bild.bild_url_web ? `${API}${bild.bild_url_web}` : undefined;

  return {
    title,
    description: description || undefined,
    alternates: { canonical: `/bilder/${params.id}` },
    openGraph: {
      title,
      description: description || undefined,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: "article",
    },
  };
}

export default async function BildDetailPage({ params }: { params: { id: string } }) {
  const bild = await fetchBild(params.id);

  const jsonLd = bild
    ? {
        "@context": "https://schema.org",
        "@type": "VisualArtwork",
        name: bild.bildtitel,
        artMedium: bild.bildtechnik,
        genre: bild.genre,
        width: bild.breite_rahmen_cm ? `${bild.breite_rahmen_cm} cm` : undefined,
        height: bild.hoehe_rahmen_cm ? `${bild.hoehe_rahmen_cm} cm` : undefined,
        offers: bild.verkaufspreis
          ? {
              "@type": "Offer",
              price: bild.verkaufspreis,
              priceCurrency: "EUR",
              availability:
                bild.verfuegbarkeit === "Verfügbar"
                  ? "https://schema.org/InStock"
                  : "https://schema.org/SoldOut",
            }
          : undefined,
        creator: bild.kuenstler
          ? {
              "@type": "Person",
              name: `${bild.kuenstler.db_vorname} ${bild.kuenstler.db_name}`.trim(),
            }
          : undefined,
        image: bild.bild_url_web ? `${API}${bild.bild_url_web}` : undefined,
        url: `${SITE}/bilder/${params.id}`,
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <BildDetailClient id={params.id} />
    </>
  );
}

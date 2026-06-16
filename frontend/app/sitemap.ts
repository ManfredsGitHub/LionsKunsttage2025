import { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE}/veranstaltung`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/impressum`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/datenschutz`, changeFrequency: "yearly", priority: 0.2 },
  ];

  let bildUrls: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API}/bilder?limit=1000`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const bilder: { id: number }[] = await res.json();
      bildUrls = bilder.map((b) => ({
        url: `${SITE}/bilder/${b.id}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
    }
  } catch {}

  return [...staticPages, ...bildUrls];
}

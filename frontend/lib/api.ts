import { Bild, Kuenstler, ReservierungCreate, KaufCreate } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Galerie ---
export const getBilder = (params?: {
  genre?: string;
  technik?: string;
  kuenstler_id?: number;
  nur_verfuegbar?: boolean;
}) => {
  const q = new URLSearchParams();
  if (params?.genre) q.set("genre", params.genre);
  if (params?.technik) q.set("technik", params.technik);
  if (params?.kuenstler_id) q.set("kuenstler_id", String(params.kuenstler_id));
  if (params?.nur_verfuegbar !== undefined) q.set("nur_verfuegbar", String(params.nur_verfuegbar));
  return req<Bild[]>(`/bilder/?${q}`);
};

export const getBild = (id: number) => req<Bild>(`/bilder/${id}`);

// --- Künstler ---
export const getKuenstler = () => req<Kuenstler[]>("/kuenstler/");
export const getKuenstlerById = (id: number) => req<Kuenstler>(`/kuenstler/${id}`);
export const verifyToken = (token: string) =>
  req<{ kuenstler_id: number; name: string }>(`/kuenstler/login/verify?token=${token}`);
export const updateProfil = (id: number, daten: Record<string, string>) =>
  req(`/kuenstler/${id}/profil`, { method: "PATCH", body: JSON.stringify(daten) });
export const dsgvoEinwilligung = (id: number) =>
  req(`/kuenstler/${id}/dsgvo`, { method: "PATCH" });

// --- Reservierung ---
export const reservieren = (data: ReservierungCreate) =>
  req<{ id: number; status: string }>("/reservierungen/", {
    method: "POST",
    body: JSON.stringify(data),
  });

// --- Kasse ---
export const kaufErfassen = (data: KaufCreate) =>
  req<{ id: number; status: string }>("/kaeufe/", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const alsBezahltMarkieren = (kaufId: number) =>
  req(`/kaeufe/${kaufId}/bezahlt`, { method: "PATCH" });

// --- Admin ---
export const getAlleBilder = () => req<Bild[]>("/admin/bilder/alle");
export const bilderFreigeben = (id: number) =>
  req(`/admin/bilder/${id}/freigeben`, { method: "PATCH" });
export const massenFreigeben = (ids: number[], freigegeben: boolean = true) =>
  req<{ freigegeben: number }>("/admin/bilder/massenfreigabe", {
    method: "PATCH",
    body: JSON.stringify({ ids, freigegeben }),
  });
export const preisSetzen = (id: number, preis: number) =>
  req(`/admin/bilder/${id}/preis?verkaufspreis=${preis}`, { method: "PATCH" });
export const getAlleReservierungen = () => req("/admin/reservierungen");
export const getAlleKaeufe = () => req("/admin/kaeufe");
export const getAlleKuenstler = (mitInaktiven = false) =>
  req<Kuenstler[]>(`/admin/kuenstler/alle${mitInaktiven ? "?mit_inaktiven=true" : ""}`);
export const kuenstlerAktualisieren = (id: number, data: Partial<Kuenstler>) =>
  req<Kuenstler>(`/admin/kuenstler/${id}`, { method: "PATCH", body: JSON.stringify(data) });
export const kuenstlerEinladen = (id: number) =>
  req<{ token: string; portal_url: string }>(`/admin/kuenstler/${id}/einladen`, { method: "POST" });
export const kuenstlerLoeschen = (id: number) =>
  req(`/admin/kuenstler/${id}`, { method: "DELETE" });
export const bildNeuAnlegen = (data: {
  kuenstler_id: number; bildtitel: string; bildtechnik: string; genre: string;
  breite_rahmen_cm: number; hoehe_rahmen_cm: number; einlieferungspreis?: number;
  in_ausstellung?: boolean;
}) => req<Bild>("/admin/bilder/neu", { method: "POST", body: JSON.stringify(data) });

export const ausstellungToggle = (id: number, inAusstellung: boolean) =>
  req(`/admin/bilder/${id}/ausstellung?in_ausstellung=${inAusstellung}`, { method: "PATCH" });

export const bildLoeschen = (id: number) =>
  req(`/admin/bilder/${id}`, { method: "DELETE" });

export const bildAktualisieren = (id: number, data: Partial<{
  bildtitel: string; bildtechnik: string; genre: string;
  breite_rahmen_cm: number; hoehe_rahmen_cm: number;
  breite_cm: number; hoehe_cm: number; tiefe_cm: number; gewicht_kg: number;
  einlieferungspreis: number; verkaufspreis: number;
  anmerkung_bild: string; foto_nr: string;
  in_ausstellung: boolean; freigegeben: boolean;
  abrechnungsempf: string;
}>) => req<import("./types").Bild>(`/admin/bilder/${id}`, { method: "PATCH", body: JSON.stringify(data) });

// --- Merkliste ---
export const merklisteAnmelden = (email?: string, telefon?: string) =>
  req<{ token: string; besucher_id: number }>("/merkliste/anmelden", {
    method: "POST",
    body: JSON.stringify({ email: email ?? null, telefon: telefon ?? null }),
  });

export const getMerkliste = (token: string) =>
  req<{ bilder: Bild[]; email: string | null; telefon: string | null }>(`/merkliste/?token=${encodeURIComponent(token)}`);

export const merklisteZusenden = (token: string) =>
  req<{ status: string; email: string }>(`/merkliste/zusenden?token=${encodeURIComponent(token)}`, { method: "POST" });

export const merklisteHinzufuegen = (token: string, bildId: number) =>
  req(`/merkliste/${bildId}?token=${encodeURIComponent(token)}`, { method: "POST" });

export const merklisteEntfernen = (token: string, bildId: number) =>
  req(`/merkliste/${bildId}?token=${encodeURIComponent(token)}`, { method: "DELETE" });

export async function fotoHochladen(bildId: number, file: File): Promise<{ bild_url_web: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/admin/bilder/${bildId}/foto`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

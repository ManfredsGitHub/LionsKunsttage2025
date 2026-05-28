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
export const massenFreigeben = (ids: number[]) =>
  req<{ freigegeben: number }>("/admin/bilder/massenfreigabe", {
    method: "PATCH",
    body: JSON.stringify({ ids }),
  });
export const preisSetzen = (id: number, preis: number) =>
  req(`/admin/bilder/${id}/preis?verkaufspreis=${preis}`, { method: "PATCH" });
export const getAlleReservierungen = () => req("/admin/reservierungen");
export const getAlleKaeufe = () => req("/admin/kaeufe");

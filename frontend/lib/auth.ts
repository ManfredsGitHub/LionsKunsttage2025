const SESSION_KEY = "kt_token";

export type Rolle = "admin" | "orga" | "kasse" | "kuenstler";

export interface TokenPayload {
  sub: string;        // nutzer_id
  email: string;
  rolle: Rolle;
  kuenstler_id?: number;
  exp: number;
}

// ── Primärspeicher: sessionStorage (cleared on tab close) ─────────────────────

function _readToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}

export function getToken(): string | null {
  return _readToken();
}

export function getPayload(): TokenPayload | null {
  const token = _readToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as TokenPayload;
    if (payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getRolle(): Rolle | null {
  return getPayload()?.rolle ?? null;
}

export function getNutzerId(): number | null {
  const p = getPayload();
  return p ? parseInt(p.sub) : null;
}

// ── Sekundärspeicher: httpOnly-Cookie (via Next.js API, nicht lesbar per JS) ──

async function _setHttpOnlyCookie(token: string, stunden: number): Promise<void> {
  try {
    await fetch("/api/auth/set-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, stunden }),
    });
  } catch {
    // httpOnly-Cookie ist Security-Bonus, kein showstopper
  }
}

async function _clearHttpOnlyCookie(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignorieren
  }
}

// ── Öffentliche Auth-Funktionen ───────────────────────────────────────────────

export async function setToken(token: string, stunden: number): Promise<void> {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, token);
  }
  await _setHttpOnlyCookie(token, stunden);
}

export async function logout(): Promise<void> {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(SESSION_KEY);
  }
  await _clearHttpOnlyCookie();
}

export function authHeaders(): Record<string, string> {
  const token = _readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ── Künstler-Portal Auth ───────────────────────────────────────────────────────
const KT_TOKEN_KEY = "kt_kuenstler_token";

export function setKuenstlerToken(token: string): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(KT_TOKEN_KEY, token);
  }
}

export function getKuenstlerToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(KT_TOKEN_KEY);
}

export function kuenstlerAuthHeaders(): Record<string, string> {
  const token = getKuenstlerToken();
  return token ? { "X-Kuenstler-Token": token } : {};
}

export function logoutKuenstler(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(KT_TOKEN_KEY);
    localStorage.removeItem("kuenstler_id");
    localStorage.removeItem("kuenstler_name");
  }
}

export function redirectNachRolle(rolle: Rolle): string {
  if (rolle === "admin") return "/admin";
  if (rolle === "orga") return "/admin/bilder";
  if (rolle === "kasse") return "/admin/kasse";
  if (rolle === "kuenstler") return "/kuenstler/portal";
  return "/admin";
}

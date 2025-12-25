export const AUTH_EXPIRY_KEY = "authExpiry";
export const SHORT_SESSION_MS = 30 * 60 * 1000; // 30 minutes

export function setAuthExpiry(durationMs: number = SHORT_SESSION_MS): number | null {
  if (typeof window === "undefined") return null;
  const next = Date.now() + durationMs;
  sessionStorage.setItem(AUTH_EXPIRY_KEY, String(next));
  return next;
}

export function clearAuthExpiry() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(AUTH_EXPIRY_KEY);
}

export function getAuthExpiry(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(AUTH_EXPIRY_KEY);
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function isAuthExpired(): boolean {
  const expiry = getAuthExpiry();
  return expiry !== null && expiry <= Date.now();
}

export function remainingAuthMs(): number | null {
  const expiry = getAuthExpiry();
  if (expiry === null) return null;
  return Math.max(0, expiry - Date.now());
}

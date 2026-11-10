import { auth } from "@/lib/firebase/client";

/** fetch() com o Bearer token do utilizador autenticado (Firebase ID token). */
export async function authFetch(input: string, init: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

function filenameFromResponse(res: Response, fallback: string) {
  const cd = res.headers.get("content-disposition") || "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/**
 * Descarrega um ficheiro de uma rota protegida (que exige Bearer token) e
 * dispara o "Guardar" no browser. Substitui os antigos `<a href>` diretos,
 * que não conseguem enviar o header Authorization.
 */
export async function downloadWithAuth(url: string, fallbackName: string) {
  const res = await authFetch(url, { cache: "no-store" });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || `Falha no download (${res.status})`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filenameFromResponse(res, fallbackName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

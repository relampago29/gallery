"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase/client";

type AdminUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  provider: string | null;
  emailVerified: boolean;
  disabled: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
};

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar.");
  return user.getIdToken();
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-PT");
}

function providerLabel(provider: string | null) {
  if (!provider) return "firebase";
  if (provider === "password") return "Email/Password";
  if (provider === "google.com") return "Google";
  return provider;
}

function abbreviateUid(uid: string) {
  if (uid.length <= 14) return uid;
  return `${uid.slice(0, 6)}…${uid.slice(-4)}`;
}

function buildPageItems(totalPages: number, currentPage: number): (number | "ellipsis")[] {
  if (totalPages <= 1) return [0];
  const candidates = new Set<number>();
  candidates.add(0);
  candidates.add(1);
  candidates.add(totalPages - 1);
  candidates.add(totalPages - 2);
  candidates.add(currentPage);

  const pages = Array.from(candidates).filter((p) => p >= 0 && p < totalPages).sort((a, b) => a - b);
  const items: (number | "ellipsis")[] = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (i > 0) {
      const prev = pages[i - 1];
      if (page - prev > 1) {
        items.push("ellipsis");
      }
    }
    items.push(page);
  }

  return items;
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [pageTokens, setPageTokens] = useState<(string | null)[]>([null]); // page index -> pageToken
  const [pageIndex, setPageIndex] = useState(0);
  const [prefetchingPages, setPrefetchingPages] = useState(false);
  const [pagesFullyLoaded, setPagesFullyLoaded] = useState(false);

  const PAGE_SIZE = 5;

  async function loadUsers(targetPageIndex: number) {
    if (targetPageIndex < 0) return;
    if (targetPageIndex >= pageTokens.length) return;
    const pageToken = pageTokens[targetPageIndex] ?? null;
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      const params = new URLSearchParams();
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(`/api/users${params.size ? `?${params.toString()}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Falha ao carregar utilizadores.");
      }
      const data = await res.json();
      const pageUsers = Array.isArray(data?.users) ? (data.users as AdminUser[]) : [];
      setUsers(pageUsers);
      setNextPageToken(data?.nextPageToken || null);
      if (!data?.nextPageToken) {
        setPagesFullyLoaded(true);
      }

      setPageTokens((prev) => {
        if (data?.nextPageToken && !prev[targetPageIndex + 1]) {
          const updated = [...prev];
          updated[targetPageIndex + 1] = data.nextPageToken;
          return updated;
        }
        return prev;
      });

      setPageIndex(targetPageIndex);
      if (!pagesFullyLoaded && !prefetchingPages) {
        void prefetchAllPages();
      }
    } catch (err: any) {
      setError(err?.message || "Não foi possível obter os emails.");
      setUsers([]);
      setNextPageToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function prefetchAllPages() {
    if (pagesFullyLoaded || prefetchingPages) return;
    setPrefetchingPages(true);
    try {
      const token = await getIdToken();
      const tokens: (string | null)[] = [null];
      let pageToken: string | null = null;

      for (let i = 0; i < 400; i++) {
        const params = new URLSearchParams();
        if (pageToken) params.set("pageToken", pageToken);
        params.set("metaOnly", "1");
        const res = await fetch(`/api/users?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload?.error || "Falha ao carregar páginas.");
        }
        const data = await res.json();
        const next = data?.nextPageToken || null;
        if (next) {
          tokens.push(next);
          pageToken = next;
        } else {
          break;
        }
      }

      setPageTokens(tokens);
      setPagesFullyLoaded(true);
    } catch {
      // Se falhar, mantemos apenas as páginas conhecidas
    } finally {
      setPrefetchingPages(false);
    }
  }

  useEffect(() => {
    loadUsers(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => [u.email, u.displayName, u.uid].some((field) => field?.toLowerCase().includes(term)));
  }, [filter, users]);

  const totalPages = pageTokens.length;
  const hasPrev = pageIndex > 0;
  const hasNext = pagesFullyLoaded ? pageIndex < pageTokens.length - 1 : !!nextPageToken;
  const pageList = buildPageItems(Math.max(totalPages, 1), pageIndex);

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por email, nome ou UID"
            className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white/50 focus:outline-none sm:w-72"
          />
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setPageTokens([null]);
                setPagesFullyLoaded(false);
                setPageIndex(0);
                setNextPageToken(null);
                loadUsers(0);
              }}
              disabled={loading}
              className="rounded-full border border-white/25 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? "A atualizar…" : "Recarregar"}
            </button>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 text-center text-sm text-white/70">A carregar utilizadores…</div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/60">Sem utilizadores para mostrar.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredUsers.map((user) => (
              <div key={user.uid} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="text-base font-semibold text-white">{user.email || "Sem email"}</div>
                  <div className="text-sm text-white/70">{user.displayName || "Sem nome"}</div>
                  <div className="text-xs text-white/50">
                    Criado: {formatDate(user.createdAt)} · Último acesso: {formatDate(user.lastLoginAt)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/80">{providerLabel(user.provider)}</span>
                  <span
                    className={`rounded-full px-3 py-1 font-semibold ${
                      user.emailVerified ? "border border-emerald-400/60 bg-emerald-500/10 text-emerald-100" : "border border-amber-400/60 bg-amber-500/10 text-amber-100"
                    }`}
                  >
                    {user.emailVerified ? "Email verificado" : "Email por verificar"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 ${
                      user.disabled ? "border border-red-400/60 bg-red-500/10 text-red-100" : "border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                    }`}
                  >
                    {user.disabled ? "Conta desativada" : "Ativa"}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-white/70" title={user.uid}>
                    UID {abbreviateUid(user.uid)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-white/60">Máximo de {PAGE_SIZE} registos por página.</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => hasPrev && loadUsers(pageIndex - 1)}
              disabled={!hasPrev || loading}
              className="rounded-full border border-white/25 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              Anterior
            </button>
            <div className="flex items-center gap-2">
              {pageList.map((entry, idx) =>
                entry === "ellipsis" ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-sm text-white/70">
                    …
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => loadUsers(entry)}
                    disabled={loading || pageTokens[entry] === undefined || pageIndex === entry}
                    aria-current={pageIndex === entry ? "page" : undefined}
                    className={`min-w-10 rounded-full px-3 py-1.5 text-sm transition ${
                      pageIndex === entry
                        ? "bg-white text-gray-900"
                        : "border border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
                    }`}
                  >
                    {entry + 1}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              onClick={() => hasNext && loadUsers(pageIndex + 1)}
              disabled={!hasNext || loading}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

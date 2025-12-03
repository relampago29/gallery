"use client";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Sidebar } from "@/components/ui/auth/Sidebar";
import RequireAuth from "@/components/ui/auth/RequireAuth";
import { Toaster } from "sonner";
import { ensureFirebaseUser } from "@/lib/firebase/ensureAuth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { UploadProgressProvider, useUploadProgress } from "@/components/admin/UploadProgressContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    ensureFirebaseUser().catch(console.error);
  }, []);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [sessionExpiry, setSessionExpiry] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const SESSION_MS = 2 * 60 * 60 * 1000;
  const GRACE_MS = 5 * 60 * 1000;
  const keyExpiry = "adminSessionExpiry";
  const keyLastActive = "adminSessionLastActive";

  const fallbackCallbackUrl = useMemo(() => {
    const qs = searchParams?.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }, [pathname, searchParams]);

  const avatarFallback = useMemo(() => userEmail?.charAt(0)?.toUpperCase() ?? "A", [userEmail]);

  const forceSignOut = useCallback(async () => {
    try {
      await auth.signOut();
    } catch (err) {
      console.error("Erro ao terminar sessão", err);
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? null);
      setUserAvatar(user?.photoURL ?? null);

      if (!user || typeof window === "undefined") {
        setSessionExpiry(null);
        setRemainingMs(null);
        return;
      }

      const now = Date.now();
      const storedExpiry = Number(localStorage.getItem(keyExpiry));
      const lastActive = Number(localStorage.getItem(keyLastActive));
      let nextExpiry = storedExpiry;

      if (!storedExpiry || storedExpiry <= now) {
        if (lastActive && now - lastActive <= GRACE_MS) {
          nextExpiry = now + SESSION_MS;
        } else {
          nextExpiry = now + SESSION_MS;
        }
      }

      localStorage.setItem(keyExpiry, String(nextExpiry));
      localStorage.setItem(keyLastActive, String(now));
      setSessionExpiry(nextExpiry);
    });
    return () => unsub();
  }, [GRACE_MS, SESSION_MS, keyExpiry, keyLastActive, forceSignOut]);

  useEffect(() => {
    if (sessionExpiry === null) {
      setRemainingMs(null);
      return;
    }
    const tick = () => {
      const now = Date.now();
      const remaining = sessionExpiry - now;
      setRemainingMs(remaining > 0 ? remaining : 0);
      if (remaining <= 0) {
        forceSignOut();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionExpiry, forceSignOut]);

  const refreshTokenIfNeeded = useCallback(async () => {
    if (refreshing) return;
    const now = Date.now();
    const THRESHOLD = 15 * 60 * 1000;
    if (sessionExpiry === null || sessionExpiry - now > THRESHOLD) return;
    if (!auth.currentUser) return;
    setRefreshing(true);
    try {
      await auth.currentUser.getIdToken(true);
      const next = Date.now() + SESSION_MS;
      localStorage.setItem(keyExpiry, String(next));
      setSessionExpiry(next);
      localStorage.setItem(keyLastActive, String(Date.now()));
    } catch (err) {
      console.error("Falha ao renovar token", err);
    } finally {
      setRefreshing(false);
    }
  }, [sessionExpiry, refreshing, SESSION_MS, keyExpiry, keyLastActive]);

  return (
    <UploadProgressProvider>
      <div className="admin-shell relative flex min-h-screen overflow-hidden bg-[#030303] text-gray-100">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_60%)]" />
          <div className="absolute -left-20 top-24 h-72 w-72 rounded-full bg-[#7c3aed1f] blur-3xl" />
          <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#f472b61f] blur-3xl" />
        </div>

        <aside className="relative z-10 w-64 flex-shrink-0 border-r border-white/10 bg-white/5 backdrop-blur-lg">
          <Sidebar />
        </aside>

        <div className="relative z-10 flex flex-1 flex-col">
          <Header
            userEmail={userEmail}
            userAvatar={userAvatar}
            avatarFallback={avatarFallback}
            remainingMs={remainingMs}
            onRefreshToken={refreshTokenIfNeeded}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-6 py-10">
              <RequireAuth fallbackCallbackUrl={fallbackCallbackUrl}>{children}</RequireAuth>
            </div>
          </main>
        </div>

        <Toaster richColors closeButton />
      </div>
    </UploadProgressProvider>
  );
}

function Header({
  userEmail,
  userAvatar,
  avatarFallback,
  remainingMs,
  onRefreshToken,
}: {
  userEmail: string | null;
  userAvatar: string | null;
  avatarFallback: string;
  remainingMs: number | null;
  onRefreshToken: () => void;
}) {
  const { state: uploadState, etaSeconds } = useUploadProgress();
  const percent = uploadState ? Math.round(uploadState.progress * 100) : 0;
  const [notifications, setNotifications] = useState<
    { id: string; type: "payment" | "info"; title: string; description?: string; createdAt?: number | null }[]
  >([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const etaLabel = React.useMemo(() => {
    if (etaSeconds === null || etaSeconds < 0) return "A processar...";
    if (etaSeconds >= 3600) {
      const hours = Math.floor(etaSeconds / 3600);
      const minutes = Math.floor((etaSeconds % 3600) / 60);
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} h`;
    }
    if (etaSeconds >= 60) {
      const minutes = Math.floor(etaSeconds / 60);
      const seconds = etaSeconds % 60;
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} min`;
    }
    return `${etaSeconds}s`;
  }, [etaSeconds]);

  const loadNotifications = useCallback(async () => {
    if (!auth.currentUser) return;
    setNotifLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/session-orders/pending", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Falha ao obter notificações.");
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const mapped = items.slice(0, 5).map((item: any) => ({
        id: item.id || String(item.sessionId || Math.random()),
        type: "payment" as const,
        title: "Pagamento pendente",
        description: item.sessionName ? `Sessão: ${item.sessionName}` : `Código: ${item.sessionId || "—"}`,
        createdAt: item.createdAt ?? null,
      }));
      setNotifications(mapped);
    } catch (err) {
      console.error("[Header] notificações", err);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 60_000);
    return () => clearInterval(id);
  }, [loadNotifications]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!notifOpen) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  useEffect(() => {
    if (uploadState) {
      onRefreshToken();
    }
  }, [uploadState, onRefreshToken]);

  const sessionLabel = useMemo(() => {
    if (remainingMs === null) return "--:--";
    if (remainingMs <= 0) return "00:00";
    const totalSec = Math.floor(remainingMs / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [remainingMs]);

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-white/10 bg-[#030303]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6 gap-6">
        <div className="flex-1 min-w-[180px] max-w-[50%]">
          {uploadState ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                <span>{uploadState.label}</span>
                <span>{percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-white transition-[width] duration-200"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="text-[11px] text-white/50">Tempo estimado: {etaLabel}</div>
            </div>
          ) : (
            <div className="w-10" aria-hidden />
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end leading-tight">
            <div className="text-sm font-medium text-white/80">{userEmail || "Utilizador"}</div>
            <div className="text-[11px] text-white/50">Sessão: {sessionLabel}</div>
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full">
                {userAvatar ? (
                  <img src={userAvatar} alt={userEmail ?? "Utilizador"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-sm font-semibold uppercase text-white">{avatarFallback}</span>
                )}
              </span>
              {notifications.length > 0 && (
                <span className="pointer-events-none absolute inset-[-4px] rounded-full ring-2 ring-amber-400 ring-offset-2 ring-offset-[#030303]" />
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-[#0b0b0b]/95 px-3 py-3 shadow-xl backdrop-blur z-50">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/60">
                  <span>Notificações</span>
                  {notifLoading ? <span className="text-[10px] text-white/40">a atualizar…</span> : null}
                </div>
                {notifications.length === 0 ? (
                  <div className="text-sm text-white/60">Sem notificações.</div>
                ) : (
                  <ul className="space-y-2">
                    {notifications.map((n) => (
                      <li key={n.id} className="rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-white/80">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-2 w-2 rounded-full bg-amber-400" />
                          <span className="font-semibold flex-1">{n.title}</span>
                          <button
                            type="button"
                            className="text-white/60 hover:text-white transition"
                            onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
                            aria-label="Marcar como lida"
                          >
                            ✓
                          </button>
                        </div>
                        {n.description ? <div className="mt-1 text-white/60 text-xs">{n.description}</div> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

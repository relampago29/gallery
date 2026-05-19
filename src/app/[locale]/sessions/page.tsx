"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/shared/navbar/navbar";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  Lock,
  ImageIcon,
  Calendar,
  ChevronRight,
  Loader2,
  Gift,
} from "lucide-react";

type SessionItem = {
  id: string;
  name: string;
  createdAt: number | null;
  role: "owner" | "guest";
  freeAccess: boolean;
  photoCount?: number;
};

function formatDate(value: number | null, locale: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(
      locale === "en" ? "en-GB" : "pt-PT",
      { day: "2-digit", month: "short", year: "numeric" },
    );
  } catch {
    return "—";
  }
}

export default function SessionsEntryPage() {
  const t = useTranslations("sessionsPage");
  const locale = useLocale();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escutar estado de auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Redirecionar para login se não estiver autenticado (ou se for anónimo)
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.isAnonymous) {
      router.replace(
        `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/sessions`)}`,
      );
    }
  }, [user, authLoading, locale, router]);

  // Carregar sessões do utilizador
  const loadSessions = useCallback(async () => {
    if (!user || user.isAnonymous) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/sessions/my-sessions", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || t("loadFailed"));
      }
      const data = await res.json();
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (err: any) {
      setError(err?.message || t("loadFailed"));
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (user && !user.isAnonymous) {
      loadSessions();
    }
  }, [user, loadSessions]);

  // Enquanto verifica auth
  if (authLoading || !user || user.isAnonymous) {
    return (
      <div className="min-h-screen bg-[#030303] text-gray-100">
        <NavBar />
        <main className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-white/40" />
        </main>
      </div>
    );
  }

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <header className="text-center space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              {t("badge")}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              {t("title")}
            </h1>
            <p className="text-sm text-white/70">{t("subtitle")}</p>
          </header>

          {error && (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          {loading ? (
            <div className={`${cardClass} p-10 text-center`}>
              <Loader2
                size={24}
                className="mx-auto mb-3 animate-spin text-white/40"
              />
              <p className="text-sm text-white/50">{t("loadingSessions")}</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className={`${cardClass} p-10 text-center`}>
              <Lock size={32} className="mx-auto mb-3 text-white/20" />
              <p className="text-sm text-white/50">{t("noSessions")}</p>
              <p className="mt-2 text-xs text-white/30">{t("noSessionsHint")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() =>
                    router.push(`/${locale}/sessions/${session.id}`)
                  }
                  className={`${cardClass} cursor-pointer p-5 transition hover:border-white/20 hover:bg-white/[0.07]`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Nome */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="truncate text-base font-semibold text-white">
                        {session.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-white/40">
                        {session.role === "owner" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                            {t("roleOwner")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
                            {t("roleGuest")}
                          </span>
                        )}
                        {session.freeAccess ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-200">
                            <Gift size={8} />
                            {t("freeAccess")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">
                            {t("paidAccess")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {session.photoCount != null && (
                        <div className="flex items-center gap-1.5 text-white/50">
                          <ImageIcon size={12} />
                          <span className="font-medium text-white/70">
                            {session.photoCount}
                          </span>
                          {t("photos")}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-white/50">
                        <Calendar size={12} />
                        <span className="text-white/70">
                          {formatDate(session.createdAt, locale)}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-white/20"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

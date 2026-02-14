"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { auth } from "@/lib/firebase/client";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  clearAuthExpiry,
  getAuthExpiry,
  isAuthExpired,
  remainingAuthMs,
  setAuthExpiry,
} from "@/lib/firebase/sessionExpiry";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/shared/navbar/navbar";
import {
  UserCircle,
  ShieldCheck,
  Clock,
  ArrowLeft,
  CalendarDays,
  Camera,
  Download,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

type Tab = "info" | "history";
type HistorySub = "events" | "sessions";

type EventOrder = {
  id: string;
  status: string;
  itemCount: number;
  totalPrice: number;
  eventNames: Record<string, string>;
  createdAt: number | null;
  paymentConfirmedAt: number | null;
  fulfilledAt: number | null;
  publicToken: string;
};

type SessionOrder = {
  id: string;
  status: string;
  sessionId: string;
  sessionName: string;
  selectedCount: number;
  createdAt: number | null;
  token: string;
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [displayName, setDisplayName] = useState("");
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "history") setActiveTab("history");
  }, [searchParams]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        clearAuthExpiry();
        setUser(null);
        setChecking(false);
        return;
      }
      const expiry = getAuthExpiry();
      if (!expiry) {
        setAuthExpiry();
      } else if (isAuthExpired()) {
        await auth.signOut().catch(() => {});
        clearAuthExpiry();
        setUser(null);
        setChecking(false);
        router.replace(`/${locale}/login?callbackUrl=/${locale}/dashboard`);
        return;
      } else {
        // keep existing expiry
      }
      setUser(u);
      setDisplayName(u.displayName || u.email || "");
      setRemainingMs(remainingAuthMs());
      setChecking(false);
    });
    return () => unsub();
  }, [router, locale]);

  useEffect(() => {
    if (checking) return;
    if (!user) {
      router.replace(`/${locale}/login?callbackUrl=/${locale}/dashboard`);
    }
  }, [checking, user, router, locale]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      const remaining = remainingAuthMs();
      if (remaining === null) {
        const next = setAuthExpiry();
        setRemainingMs(next ? next - Date.now() : null);
        return;
      }
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearAuthExpiry();
        auth.signOut().catch(() => {});
        router.replace(`/${locale}/login?callbackUrl=/${locale}/dashboard`);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [user, router, locale]);

  const sessionLabel = useMemo(() => {
    if (remainingMs === null) return "--:--";
    const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [remainingMs]);

  const avatarLetter = useMemo(() => {
    if (user?.displayName) return user.displayName[0]?.toUpperCase() ?? "U";
    if (user?.email) return user.email[0]?.toUpperCase() ?? "U";
    return "U";
  }, [user]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setStatus(null);
    try {
      await updateProfile(user, { displayName: displayName.trim() || null });
      setStatus({ type: "success", message: t("successName") });
      setAuthExpiry();
    } catch (err: any) {
      console.error("[dashboard] update name", err);
      setStatus({ type: "error", message: t("errorGeneric") });
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setStatus(null);
    if (!user.email) {
      setStatus({ type: "error", message: t("errorGeneric") });
      return;
    }
    if (!passwords.next || passwords.next !== passwords.confirm) {
      setStatus({ type: "error", message: t("passwordMismatch") });
      return;
    }
    if (!passwords.current) {
      setStatus({ type: "error", message: t("passwordMissing") });
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(
        user.email || "",
        passwords.current
      );
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwords.next);
      setStatus({ type: "success", message: t("successPassword") });
      setAuthExpiry();
      setPasswords({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      console.error("[dashboard] update password", err);
      setStatus({ type: "error", message: t("errorGeneric") });
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center">
        <p className="text-sm text-white/60">{t("checking")}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030303] text-gray-100">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-[#7c3aed1a] blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-[#f472b61a] blur-3xl" />
      </div>

      <div className="relative z-10">
        <NavBar />

        <div className="mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:border-white/30 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} /> {t("backToHome")}
          </Link>

          {/* Header */}
          <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl font-bold text-white shadow-lg backdrop-blur-sm">
                {avatarLetter}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                  {t("title")}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {user?.displayName || user?.email || t("subtitle")}
                </h1>
                {user?.email && user?.displayName && (
                  <p className="text-sm text-white/50">{user.email}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur-sm">
              <Clock size={14} className="text-white/40" />
              {t("sessionEnds")}{" "}
              <span className="font-semibold text-white">{sessionLabel}</span>
            </div>
          </header>

          {/* Tab switcher */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("info")}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition ${
                activeTab === "info"
                  ? "bg-white text-gray-900 font-semibold shadow-lg"
                  : "border border-white/15 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <UserCircle size={15} />
              {t("infoTab")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition ${
                activeTab === "history"
                  ? "bg-white text-gray-900 font-semibold shadow-lg"
                  : "border border-white/15 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Clock size={15} />
              {t("historyTab")}
            </button>
          </div>

          {/* Status notification */}
          {status && (
            <div
              className={`rounded-2xl border px-5 py-4 text-sm ${
                status.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/30 bg-red-500/10 text-red-200"
              }`}
            >
              {status.message}
            </div>
          )}

          {/* Info tab */}
          {activeTab === "info" && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Name card */}
              <form
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm lg:p-8"
                onSubmit={handleSaveName}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <UserCircle size={18} className="text-white/60" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {t("nameLabel")}
                    </h2>
                    <p className="text-xs text-white/50">{t("nameSubtitle")}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                    placeholder={t("namePlaceholder")}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
                  >
                    {t("saveName")}
                  </button>
                </div>
              </form>

              {/* Password card */}
              <form
                className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm lg:p-8"
                onSubmit={handleUpdatePassword}
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <ShieldCheck size={18} className="text-white/60" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {t("passwordLabel")}
                    </h2>
                    <p className="text-xs text-white/50">
                      {t("passwordSubtitle")}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) =>
                      setPasswords((prev) => ({
                        ...prev,
                        current: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                    placeholder={t("currentPassword")}
                    autoComplete="current-password"
                  />
                  <input
                    type="password"
                    value={passwords.next}
                    onChange={(e) =>
                      setPasswords((prev) => ({
                        ...prev,
                        next: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                    placeholder={t("newPassword")}
                    autoComplete="new-password"
                  />
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords((prev) => ({
                        ...prev,
                        confirm: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
                    placeholder={t("confirmPassword")}
                    autoComplete="new-password"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
                  >
                    {t("savePassword")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* History tab */}
          {activeTab === "history" && <HistoryPanel locale={locale} />}
        </div>
      </div>
    </div>
  );
}

/* ── Purchase History Component ── */
function HistoryPanel({ locale }: { locale: string }) {
  const t = useTranslations("dashboard");
  const [sub, setSub] = useState<HistorySub>("events");
  const [eventOrders, setEventOrders] = useState<EventOrder[]>([]);
  const [sessionOrders, setSessionOrders] = useState<SessionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEventOrders = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/event-orders", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setEventOrders(Array.isArray(data.orders) ? data.orders : []);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadSessionOrders = useCallback(async () => {
    // We don't have a "my session orders" endpoint yet, so we leave it empty for now
    // TODO: Implement /api/session-orders/mine once needed
    setSessionOrders([]);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadEventOrders(), loadSessionOrders()]).finally(() =>
      setLoading(false)
    );
  }, [loadEventOrders, loadSessionOrders]);

  function statusBadge(status: string) {
    switch (status) {
      case "pending":
        return (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
            {t("statusPending")}
          </span>
        );
      case "paid":
        return (
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
            {t("statusPaid")}
          </span>
        );
      case "fulfilled":
        return (
          <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-medium text-sky-200">
            {t("statusFulfilled")}
          </span>
        );
      case "rejected":
        return (
          <span className="rounded-full border border-red-400/40 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-medium text-red-200">
            {t("statusRejected")}
          </span>
        );
      default:
        return (
          <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-white/60">
            {status}
          </span>
        );
    }
  }

  function formatDate(ts: number | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-5">
      {/* Sub-tab switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSub("events")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
            sub === "events"
              ? "bg-white/10 text-white font-semibold border border-white/20"
              : "border border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <CalendarDays size={14} />
          {t("eventsTab")}
        </button>
        <button
          type="button"
          onClick={() => setSub("sessions")}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
            sub === "sessions"
              ? "bg-white/10 text-white font-semibold border border-white/20"
              : "border border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Camera size={14} />
          {t("sessionsTab")}
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-white/50">
          {t("loadingHistory")}
        </div>
      ) : sub === "events" ? (
        eventOrders.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
              <CalendarDays size={28} className="text-white/30" />
            </div>
            <p className="text-lg font-semibold text-white">
              {t("eventsEmpty")}
            </p>
            <p className="mt-2 text-sm text-white/50">{t("eventsEmptyHint")}</p>
            <Link
              href={`/${locale}/events`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {t("exploreEvents")} <ExternalLink size={13} />
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending orders section */}
            {eventOrders.filter((o) => o.status === "pending").length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">
                  {t("awaitingPayment")}
                </h3>
                {eventOrders
                  .filter((o) => o.status === "pending")
                  .map((order) => {
                    const eventNameStr =
                      Object.values(order.eventNames || {}).join(", ") ||
                      "Evento";
                    return (
                      <div
                        key={order.id}
                        className="flex flex-col gap-4 rounded-3xl border border-amber-400/20 bg-amber-500/5 p-5 shadow-[0_15px_60px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white truncate max-w-xs">
                              {eventNameStr}
                            </p>
                            {statusBadge(order.status)}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-white/50">
                            <span>{order.itemCount} fotos</span>
                            <span>{order.totalPrice.toFixed(2)}€</span>
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/${locale}/events/orders/${order.id}?token=${order.publicToken}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
                          >
                            <Clock size={13} /> {t("viewPayment")}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Other orders (paid, fulfilled, rejected) */}
            {eventOrders.filter((o) => o.status !== "pending").length > 0 && (
              <div className="space-y-3">
                {eventOrders.filter((o) => o.status === "pending").length >
                  0 && (
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                    {t("historyLabel")}
                  </h3>
                )}
                {eventOrders
                  .filter((o) => o.status !== "pending")
                  .map((order) => {
                    const eventNameStr =
                      Object.values(order.eventNames || {}).join(", ") ||
                      "Evento";
                    const canDownload =
                      order.status === "paid" || order.status === "fulfilled";
                    return (
                      <div
                        key={order.id}
                        className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_15px_60px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white truncate max-w-xs">
                              {eventNameStr}
                            </p>
                            {statusBadge(order.status)}
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-white/50">
                            <span>{order.itemCount} fotos</span>
                            <span>{order.totalPrice.toFixed(2)}€</span>
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {canDownload && (
                            <Link
                              href={`/${locale}/events/orders/${order.id}/download?token=${order.publicToken}`}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-gray-900 transition hover:bg-white/90"
                            >
                              <Download size={13} /> Download
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )
      ) : /* sessions */ sessionOrders.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Camera size={28} className="text-white/30" />
          </div>
          <p className="text-lg font-semibold text-white">
            {t("sessionsEmpty")}
          </p>
          <p className="mt-2 text-sm text-white/50">{t("sessionsEmptyHint")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessionOrders.map((order) => {
            const canDownload =
              order.status === "paid" || order.status === "fulfilled";
            return (
              <div
                key={order.id}
                className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_15px_60px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">
                      {order.sessionName}
                    </p>
                    {statusBadge(order.status)}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-white/50">
                    <span>{order.selectedCount} fotos</span>
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {canDownload && (
                    <Link
                      href={`/${locale}/sessions/orders/${order.id}/download?token=${order.token}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-gray-900 transition hover:bg-white/90"
                    >
                      <Download size={13} /> Download
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

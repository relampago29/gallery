"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase/client";
import {
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  type User,
} from "firebase/auth";
import { clearAuthExpiry, getAuthExpiry, isAuthExpired, remainingAuthMs, setAuthExpiry } from "@/lib/firebase/sessionExpiry";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

type Tab = "info" | "history";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [displayName, setDisplayName] = useState("");
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
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
      const credential = EmailAuthProvider.credential(user.email || "", passwords.current);
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
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <p className="text-sm text-white/70">{t("checking")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-8 lg:px-6">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t("title")}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold">{t("subtitle")}</h1>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
              {t("sessionEnds")} {sessionLabel}
            </div>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg backdrop-blur lg:sticky lg:top-8 self-start">
            <div className="text-xs uppercase tracking-[0.25em] text-white/60 mb-3">Navegação</div>
            <nav className="space-y-2 text-sm">
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className={`w-full rounded-xl px-4 py-2 text-left transition ${
                  activeTab === "info" ? "bg-white text-gray-900 font-semibold" : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {t("infoTab")}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`w-full rounded-xl px-4 py-2 text-left transition ${
                  activeTab === "history" ? "bg-white text-gray-900 font-semibold" : "bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                {t("historyTab")}
              </button>
            </nav>
          </aside>

          <main className="rounded-3xl border border-white/10 bg-white/5 p-4 lg:p-6 shadow-lg backdrop-blur">
            {activeTab === "info" && (
              <div className="space-y-6">
                <form className="space-y-3 rounded-2xl border border-white/10 bg-[#0b0b0b] p-6 max-w-3xl" onSubmit={handleSaveName}>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-white/80">{t("nameLabel")}</label>
                    <span className="text-xs text-white/60">{user?.email}</span>
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input input-bordered w-full bg-white/5 text-white"
                    placeholder={t("namePlaceholder")}
                  />
                  <button type="submit" className="btn btn-outline">
                    {t("saveName")}
                  </button>
                </form>

                <form className="space-y-3 rounded-2xl border border-white/10 bg-[#0b0b0b] p-6 max-w-3xl" onSubmit={handleUpdatePassword}>
                  <div className="text-sm font-semibold text-white/80">{t("passwordLabel")}</div>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, current: e.target.value }))}
                    className="input input-bordered w-full bg-white/5 text-white"
                    placeholder={t("currentPassword")}
                    autoComplete="current-password"
                  />
                  <input
                    type="password"
                    value={passwords.next}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, next: e.target.value }))}
                    className="input input-bordered w-full bg-white/5 text-white"
                    placeholder={t("newPassword")}
                    autoComplete="new-password"
                  />
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((prev) => ({ ...prev, confirm: e.target.value }))}
                    className="input input-bordered w-full bg-white/5 text-white"
                    placeholder={t("confirmPassword")}
                    autoComplete="new-password"
                  />
                  <button type="submit" className="btn btn-outline">
                    {t("savePassword")}
                  </button>
                </form>
              </div>
            )}

            {activeTab === "history" && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#0b0b0b]/80 p-10 text-center text-white/70">
                <p className="text-lg font-semibold">{t("historyTab")}</p>
                <p className="mt-2 text-sm">{t("historyPlaceholder")}</p>
              </div>
            )}

            {status && (
              <div
                className={`mt-6 rounded-2xl border px-4 py-3 text-sm ${
                  status.type === "success"
                    ? "border-green-500/40 bg-green-500/10 text-green-200"
                    : "border-red-500/40 bg-red-500/10 text-red-100"
                }`}
              >
                {status.message}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

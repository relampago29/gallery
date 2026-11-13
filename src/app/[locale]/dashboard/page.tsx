"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, updateProfile, updatePassword } from "firebase/auth";
import NavBar from "@/components/shared/navbar/navbar";

export default function DashboardPage() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<"info" | "history">("info");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const paramTab = searchParams.get("tab");
    if (paramTab === "history") setTab("history");
  }, [searchParams]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace(`/${locale}/login`);
        return;
      }
      setUserEmail(user.email || "");
      setDisplayName(user.displayName || "");
    });
    return () => unsub();
  }, [locale, router]);

  const saveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (displayName.trim()) {
        await updateProfile(user, { displayName: displayName.trim() });
      }
      if (password || passwordConfirm) {
        if (password !== passwordConfirm) {
          throw new Error("As passwords não coincidem.");
        }
        await updatePassword(user, password);
      }
      setMessage("Dados atualizados.");
      setPassword("");
      setPasswordConfirm("");
    } catch (err: any) {
      setError(err?.message || "Falha ao atualizar o perfil.");
    } finally {
      setSaving(false);
    }
  };

  const tabLabel = useMemo(() => (tab === "info" ? "Informação" : "Histórico"), [tab]);

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <NavBar />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex flex-col gap-4 border-b border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Dashboard</p>
              <h1 className="text-2xl font-semibold">Bem-vindo{displayName ? `, ${displayName}` : ""}</h1>
            </div>
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                className={`rounded-full px-4 py-2 ${tab === "info" ? "bg-white text-gray-900" : "border border-white/30 text-white"}`}
                onClick={() => setTab("info")}
              >
                Informação
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 ${tab === "history" ? "bg-white text-gray-900" : "border border-white/30 text-white"}`}
                onClick={() => setTab("history")}
              >
                Histórico de compras
              </button>
              <Link
                href={`/${locale}/portofolio`}
                className="rounded-full border border-white/30 px-4 py-2 text-white transition hover:bg-white/10"
              >
                Voltar ao portfólio
              </Link>
            </div>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[220px_1fr]">
            <aside className="space-y-2">
              <button
                type="button"
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                  tab === "info" ? "bg-white text-gray-900" : "border border-white/20 bg-white/5 text-white"
                }`}
                onClick={() => setTab("info")}
              >
                Informação
              </button>
              <button
                type="button"
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm transition ${
                  tab === "history" ? "bg-white text-gray-900" : "border border-white/20 bg-white/5 text-white"
                }`}
                onClick={() => setTab("history")}
              >
                Histórico de compras
              </button>
            </aside>

            <section className="space-y-4 rounded-3xl border border-white/10 bg-black/30 p-5">
              {tab === "info" ? (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Dados da conta</p>
                    <h2 className="text-xl font-semibold">{tabLabel}</h2>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm text-white/70">Email</label>
                    <input className="input input-bordered w-full" type="email" value={userEmail} disabled />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm text-white/70">Nome de utilizador</label>
                    <input
                      className="input input-bordered w-full"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="block text-sm text-white/70">Password</label>
                      <input
                        className="input input-bordered w-full"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nova password"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm text-white/70">Confirmar password</label>
                      <input
                        className="input input-bordered w-full"
                        type="password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        placeholder="Repete a password"
                      />
                    </div>
                  </div>
                  {message ? <div className="text-sm text-emerald-300">{message}</div> : null}
                  {error ? <div className="text-sm text-red-300">{error}</div> : null}
                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={saving}
                    className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
                  >
                    {saving ? "A guardar…" : "Guardar alterações"}
                  </button>
                </>
              ) : (
                <div className="text-sm text-white/70">Histórico de compras em breve.</div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

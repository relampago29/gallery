"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase/client";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { clearAuthExpiry, getAuthExpiry, isAuthExpired, setAuthExpiry } from "@/lib/firebase/sessionExpiry";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  callbackUrl?: string;
};

type Mode = "login" | "signup";

export default function EmailPasswordForm({ callbackUrl }: Props) {
  const router = useRouter();

  const [firebaseEmail, setFirebaseEmail] = useState("");
  const [firebasePassword, setFirebasePassword] = useState("");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const targetUrl = useMemo(() => {
    return callbackUrl && callbackUrl.length > 0 ? callbackUrl : "/";
  }, [callbackUrl]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const expiry = getAuthExpiry();
        if (!expiry) {
          setAuthExpiry();
        } else if (isAuthExpired()) {
          await firebaseSignOut(auth).catch(() => {});
          clearAuthExpiry();
          setFirebaseUser(null);
          return;
        } else {
          // keep existing expiry
        }
      } else {
        clearAuthExpiry();
      }
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  async function onSignOut(e: React.FormEvent) {
    e.preventDefault();
    setSignOutLoading(true);
    setFirebaseError(null);
    try {
      await firebaseSignOut(auth);
      clearAuthExpiry();
      router.replace("/");
      router.refresh();
    } catch (err: any) {
      setFirebaseError(err?.message ?? "Erro ao terminar sessão.");
    } finally {
      setSignOutLoading(false);
    }
  }

  async function onFirebaseSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseEmail.trim() || !firebasePassword.trim()) {
      setFirebaseError("Indica email e password.");
      return;
    }
    setFirebaseLoading(true);
    setFirebaseError(null);
    try {
      await signInWithEmailAndPassword(auth, firebaseEmail.trim(), firebasePassword);
      setAuthExpiry();
      router.replace(targetUrl);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/user-not-found") {
        setFirebaseError("Credenciais inválidas.");
      } else {
        setFirebaseError(err?.message ?? "Falha no login Firebase.");
      }
    } finally {
      setFirebaseLoading(false);
    }
  }

  async function onFirebaseSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseEmail.trim() || !firebasePassword.trim() || !username.trim()) {
      setFirebaseError("Preenche email, username e password.");
      return;
    }
    if (firebasePassword !== confirmPassword) {
      setFirebaseError("As passwords não coincidem.");
      return;
    }
    setFirebaseLoading(true);
    setFirebaseError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, firebaseEmail.trim(), firebasePassword);
      if (username.trim()) {
        await updateProfile(credential.user, { displayName: username.trim() });
      }
      setAuthExpiry();
      router.replace(targetUrl);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        setFirebaseError("Já existe uma conta com este email.");
      } else if (code === "auth/weak-password") {
        setFirebaseError("Password demasiado fraca. Tenta outra.");
      } else {
        setFirebaseError(err?.message ?? "Falha na criação da conta.");
      }
    } finally {
      setFirebaseLoading(false);
    }
  }

  const sessionLabel = useMemo(() => {
    if (!firebaseUser) return null;
    return firebaseUser.email || firebaseUser.uid;
  }, [firebaseUser]);

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-[0.3em]">
          <span className="h-px flex-1 bg-white/20" aria-hidden />
          <span>Entrar</span>
          <span className="h-px flex-1 bg-white/20" aria-hidden />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-2 text-sm text-white/70">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-center font-semibold transition cursor-pointer ${
                mode === "login" ? "bg-white text-gray-900 shadow" : "text-white/80 hover:bg-white/10"
              }`}
              onClick={() => {
                setMode("login");
                setFirebasePassword("");
                setConfirmPassword("");
                setFirebaseEmail("");
                setUsername("");
                setFirebaseError(null);
              }}
              disabled={mode === "login"}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-center font-semibold transition cursor-pointer ${
                mode === "signup" ? "bg-white text-gray-900 shadow" : "text-white/80 hover:bg-white/10"
              }`}
              onClick={() => {
                setMode("signup");
                setFirebasePassword("");
                setConfirmPassword("");
                setFirebaseEmail("");
                setUsername("");
                setFirebaseError(null);
              }}
              disabled={mode === "signup"}
            >
              Criar conta
            </button>
          </div>
        </div>
        <p className="text-xs text-white/70">
          Usa email e password. Sessão curta no browser, termina automaticamente após expirar.
        </p>
      </section>

      <section className="space-y-5 rounded-3xl border border-white/10 bg-[#0b0b0b]/85 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-sm text-white/80">
            {mode === "login" ? "Entrar com email" : "Criar conta com email e username"}
          </div>
          {sessionLabel && (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">Sessão ativa</span>
          )}
        </div>

        <div className="space-y-3">
          <label className="space-y-1 text-sm text-white/70">
            <span>Email</span>
            <input
              className="input input-bordered w-full bg-white/5 text-white"
              type="email"
              placeholder="email@exemplo.com"
              value={firebaseEmail}
              onChange={(e) => setFirebaseEmail(e.target.value)}
              autoComplete={mode === "login" ? "email" : "new-email"}
            />
          </label>

          {mode === "signup" && (
            <label className="space-y-1 text-sm text-white/70">
              <span>Username</span>
              <input
                className="input input-bordered w-full bg-white/5 text-white"
                type="text"
                placeholder="Ex.: ana.silva"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </label>
          )}

          <label className="space-y-1 text-sm text-white/70">
            <span>Password</span>
            <div className="relative">
              <input
                className="input input-bordered w-full bg-white/5 text-white pr-12"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={firebasePassword}
                onChange={(e) => setFirebasePassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-2 z-10 flex h-full items-center justify-center rounded-full bg-white/0 px-2 text-white/70 hover:text-white hover:bg-white/10 transition pointer-events-auto cursor-pointer"
                aria-label={showPassword ? "Esconder password" : "Mostrar password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {mode === "signup" && (
            <label className="space-y-1 text-sm text-white/70">
              <span>Confirmar password</span>
              <div className="relative">
                <input
                  className="input input-bordered w-full bg-white/5 text-white pr-12"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repete a password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-2 z-10 flex h-full items-center justify-center rounded-full bg-white/0 px-2 text-white/70 hover:text-white hover:bg-white/10 transition pointer-events-auto cursor-pointer"
                  aria-label={showConfirm ? "Esconder confirmação" : "Mostrar confirmação"}
                  aria-pressed={showConfirm}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {mode === "login" ? (
            <button className="btn btn-primary w-full" onClick={onFirebaseSignIn} disabled={firebaseLoading}>
              {firebaseLoading ? "A processar..." : "Entrar"}
            </button>
          ) : (
            <button className="btn btn-primary w-full" onClick={onFirebaseSignUp} disabled={firebaseLoading}>
              {firebaseLoading ? "A criar..." : "Criar conta"}
            </button>
          )}
          {firebaseUser && (
            <button className="btn btn-outline w-full" onClick={onSignOut} disabled={firebaseLoading || signOutLoading}>
              {signOutLoading ? "A terminar..." : "Terminar sessão"}
            </button>
          )}
        </div>

        {firebaseUser && (
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/80">
            <div>
              <div className="text-white/60">Sessão ativa</div>
              <div className="text-white font-semibold">{sessionLabel}</div>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70">
              Firebase
            </span>
          </div>
        )}
        {firebaseError && <p className="text-red-400 text-sm">{firebaseError}</p>}
      </section>
    </div>
  );
}

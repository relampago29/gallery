"use client";

import { signIn as nextSignIn, signOut as nextSignOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";

type Props = {
  callbackUrl?: string;
};

export default function EmailPasswordForm({ callbackUrl }: Props) {
  const { status, data } = useSession();
  const [nextError, setNextError] = useState<string | null>(null);
  const [nextLoading, setNextLoading] = useState(false);
  const router = useRouter();

  const [firebaseEmail, setFirebaseEmail] = useState("");
  const [firebasePassword, setFirebasePassword] = useState("");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(false);

  const targetUrl = callbackUrl && callbackUrl.length > 0 ? callbackUrl : "/";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(targetUrl);
    }
  }, [status, targetUrl, router]);

  async function onNextAuthSignIn(e: React.FormEvent) {
    e.preventDefault();
    setNextLoading(true);
    setNextError(null);
    try {
      await nextSignIn("google", { callbackUrl: targetUrl });
    } catch (err: any) {
      setNextError(err?.message ?? "Falha ao iniciar sessão.");
    } finally {
      setNextLoading(false);
    }
  }

  async function onNextAuthSignOut(e: React.FormEvent) {
    e.preventDefault();
    setNextLoading(true);
    try {
      await nextSignOut({ callbackUrl: "/" });
    } catch (err: any) {
      setNextError(err?.message ?? "Erro ao terminar sessão.");
    } finally {
      setNextLoading(false);
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
      window.location.href = targetUrl;
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

  async function onFirebaseSignOut(e: React.FormEvent) {
    e.preventDefault();
    setFirebaseLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (err: any) {
      setFirebaseError(err?.message ?? "Erro ao terminar sessão Firebase.");
    } finally {
      setFirebaseLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <button className="btn btn-outline" onClick={onNextAuthSignIn} disabled={nextLoading || status === "authenticated"}>
          {nextLoading ? "A iniciar sessão..." : "Entrar com Google"}
        </button>

        {status === "authenticated" && (
          <button className="btn btn-secondary" onClick={onNextAuthSignOut} disabled={nextLoading}>
            Terminar sessão
          </button>
        )}

        {data?.user?.email && (
          <div role="alert" className="alert alert-success mt-2 text-sm">
            Autenticado via Google como <strong>{data.user.email}</strong>.
          </div>
        )}

        {nextError && <p className="text-red-600 text-sm">{nextError}</p>}
      </section>

      <section className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="text-sm text-white/80">Acesso direto ao Firebase (Email/Password)</div>
        <input
          className="input input-bordered w-full"
          type="email"
          placeholder="email@exemplo.com"
          value={firebaseEmail}
          onChange={(e) => setFirebaseEmail(e.target.value)}
        />
        <input
          className="input input-bordered w-full"
          type="password"
          placeholder="password"
          value={firebasePassword}
          onChange={(e) => setFirebasePassword(e.target.value)}
        />
        <div className="flex gap-2">
          <button className="btn btn-outline flex-1" onClick={onFirebaseSignIn} disabled={firebaseLoading || !!firebaseUser}>
            {firebaseLoading ? "A autenticar..." : "Entrar no Firebase"}
          </button>
          {firebaseUser && (
            <button className="btn flex-1" onClick={onFirebaseSignOut} disabled={firebaseLoading}>
              Terminar Firebase
            </button>
          )}
        </div>
        {firebaseUser && (
          <p className="text-xs text-white/70">
            Sessão Firebase ativa como <strong>{firebaseUser.email || firebaseUser.uid}</strong>.
          </p>
        )}
        {firebaseError && <p className="text-red-500 text-sm">{firebaseError}</p>}
      </section>
    </div>
  );
}

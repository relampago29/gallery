"use client";

import { signIn as nextSignIn, signOut as nextSignOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase/client";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";

type Props = {
  callbackUrl?: string;
};

export default function EmailPasswordForm({ callbackUrl }: Props) {
  const router = useRouter();

  const [firebaseEmail, setFirebaseEmail] = useState("");
  const [firebasePassword, setFirebasePassword] = useState("");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const targetUrl = callbackUrl && callbackUrl.length > 0 ? callbackUrl : "/";
  const googleProvider = useMemo(() => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  const syncNextAuthSession = useCallback(async (user: User) => {
    const idToken = await user.getIdToken();
    const response = await nextSignIn("credentials", {
      idToken,
      redirect: false,
      callbackUrl: targetUrl,
    });
    if (response?.error) {
      throw new Error(response.error);
    }
  }, [targetUrl]);

  async function onGoogleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      await syncNextAuthSession(credential.user);
      router.replace(targetUrl);
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        setGoogleError("A janela de login foi fechada antes de concluir.");
      } else {
        setGoogleError(err?.message ?? "Falha ao autenticar com o Google.");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  async function onSignOut(e: React.FormEvent) {
    e.preventDefault();
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      await firebaseSignOut(auth);
      await nextSignOut({ callbackUrl: "/" });
    } catch (err: any) {
      setGoogleError(err?.message ?? "Erro ao terminar sessão.");
    } finally {
      setGoogleLoading(false);
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
      const credential = await signInWithEmailAndPassword(auth, firebaseEmail.trim(), firebasePassword);
      await syncNextAuthSession(credential.user);
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

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <button className="btn btn-outline" onClick={onGoogleSignIn} disabled={googleLoading || !!firebaseUser}>
          {googleLoading ? "A iniciar sessão..." : "Entrar com Google"}
        </button>

        {firebaseUser && (
          <button className="btn btn-secondary" onClick={onSignOut} disabled={googleLoading}>
            Terminar sessão
          </button>
        )}

        {firebaseUser?.email && (
          <div role="alert" className="alert alert-success mt-2 text-sm">
            Autenticado como <strong>{firebaseUser.email}</strong>.
          </div>
        )}

        {googleError && <p className="text-red-600 text-sm">{googleError}</p>}
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
            <button className="btn flex-1" onClick={onSignOut} disabled={firebaseLoading || googleLoading}>
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

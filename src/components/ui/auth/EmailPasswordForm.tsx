"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  updateProfile,
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
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const targetUrl = callbackUrl && callbackUrl.length > 0 ? callbackUrl : "/";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
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
      router.replace("/");
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
    if (mode === "signup") {
      if (!displayName.trim()) {
        setFirebaseError("Indica um nome de utilizador.");
        return;
      }
      if (firebasePassword !== passwordConfirm) {
        setFirebaseError("As passwords não coincidem.");
        return;
      }
    }
    setFirebaseLoading(true);
    setFirebaseError(null);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, firebaseEmail.trim(), firebasePassword);
        await updateProfile(cred.user, { displayName: displayName.trim() }).catch(() => {});
      } else {
        await signInWithEmailAndPassword(auth, firebaseEmail.trim(), firebasePassword);
      }
      router.replace(targetUrl);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/user-not-found") {
        setFirebaseError("Credenciais inválidas.");
      } else if (code === "auth/email-already-in-use") {
        setFirebaseError("Email já registado. Faz login.");
      } else {
        setFirebaseError(err?.message ?? "Falha no login Firebase.");
      }
    } finally {
      setFirebaseLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-3">
        <div className="rounded-full border border-white/10 bg-white/5 p-1 text-sm text-white/70">
          <div className="flex">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-4 py-2 text-center font-medium transition ${
                mode === "login" ? "bg-white text-gray-900" : "text-white/60 hover:text-white"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full px-4 py-2 text-center font-medium transition ${
                mode === "signup" ? "bg-white text-gray-900" : "text-white/60 hover:text-white"
              }`}
            >
              Criar conta
            </button>
          </div>
        </div>
        <p className="text-xs text-white/70">
          Usa email e password para clientes ou admins. Admins precisam do claim configurado no Firebase.
        </p>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-[#070707]/80 p-5">
        <div className="text-sm text-white/80">Entrar com email e password</div>
        <input
          className="input input-bordered w-full"
          type="email"
          placeholder="email@exemplo.com"
          value={firebaseEmail}
          onChange={(e) => setFirebaseEmail(e.target.value)}
        />
        {mode === "signup" ? (
          <input
            className="input input-bordered w-full"
            type="text"
            placeholder="Nome de utilizador"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        ) : null}
        <input
          className="input input-bordered w-full"
          type="password"
          placeholder="password"
          value={firebasePassword}
          onChange={(e) => setFirebasePassword(e.target.value)}
        />
        {mode === "signup" ? (
          <input
            className="input input-bordered w-full"
            type="password"
            placeholder="Confirmar password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
        ) : null}
        <div className="flex gap-2">
          <button
            className="btn btn-outline flex-1"
            onClick={onFirebaseSignIn}
            disabled={firebaseLoading}
          >
            {firebaseLoading ? "A processar..." : mode === "signup" ? "Criar conta" : "Entrar"}
          </button>
          {firebaseUser && (
            <button className="btn flex-1" onClick={onSignOut} disabled={firebaseLoading || signOutLoading}>
              {signOutLoading ? "A terminar..." : "Terminar"}
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

"use client";

import { signIn as nextSignIn, signOut as nextSignOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase/client";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
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
  const [firebaseName, setFirebaseName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
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

  const syncNextAuthSession = useCallback(
    async (user: User) => {
      const idToken = await user.getIdToken();
      const response = await nextSignIn("credentials", {
        idToken,
        redirect: false,
        callbackUrl: targetUrl,
      });
      if (response?.error) {
        throw new Error(response.error);
      }
    },
    [targetUrl]
  );

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

  async function onFirebaseRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseEmail.trim() || !firebasePassword.trim()) {
      setFirebaseError("Indica email e password.");
      return;
    }
    if (firebasePassword !== confirmPassword) {
      setFirebaseError("As passwords têm de coincidir.");
      return;
    }
    setFirebaseLoading(true);
    setFirebaseError(null);
    try {
      const credential = await createUserWithEmailAndPassword(auth, firebaseEmail.trim(), firebasePassword);
      if (firebaseName.trim()) {
        await updateProfile(credential.user, { displayName: firebaseName.trim() });
      }
      await syncNextAuthSession(credential.user);
      router.replace(targetUrl);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        setFirebaseError("Este email já está registado.");
      } else {
        setFirebaseError(err?.message ?? "Falha ao criar conta.");
      }
    } finally {
      setFirebaseLoading(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="rounded-full border border-white/10 bg-white/5 p-1 text-sm text-white/70">
          <div className="flex">
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-2 font-medium transition ${!isRegister ? "bg-white text-gray-900" : "hover:bg-white/10"}`}
              onClick={() => setMode("login")}
              disabled={!isRegister}
            >
              Entrar
            </button>
            <button
              type="button"
              className={`flex-1 rounded-full px-4 py-2 font-medium transition ${isRegister ? "bg-white text-gray-900" : "hover:bg-white/10"}`}
              onClick={() => setMode("register")}
              disabled={isRegister}
            >
              Criar conta
            </button>
          </div>
        </div>

        <button
          className="btn btn-outline"
          onClick={onGoogleSignIn}
          disabled={googleLoading || (!!firebaseUser && !isRegister)}
        >
          {googleLoading ? "A autenticar..." : "Continuar com Google"}
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

      <section className="space-y-4 rounded-3xl border border-white/10 bg-[#070707]/80 p-5">
        <div className="text-sm text-white/80">
          {isRegister ? "Cria uma conta com email" : "Entrar com email e password"}
        </div>
        {isRegister && (
          <input
            className="input input-bordered w-full"
            type="text"
            placeholder="Nome completo (opcional)"
            value={firebaseName}
            onChange={(e) => setFirebaseName(e.target.value)}
          />
        )}
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
        {isRegister && (
          <input
            className="input input-bordered w-full"
            type="password"
            placeholder="confirmar password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        )}
        <div className="flex gap-2">
          <button
            className="btn btn-outline flex-1"
            onClick={isRegister ? onFirebaseRegister : onFirebaseSignIn}
            disabled={firebaseLoading || (!!firebaseUser && !isRegister)}
          >
            {firebaseLoading ? "A processar..." : isRegister ? "Criar conta" : "Entrar"}
          </button>
          {firebaseUser && !isRegister && (
            <button className="btn flex-1" onClick={onSignOut} disabled={firebaseLoading || googleLoading}>
              Terminar
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

"use client";

import { signIn as nextSignIn, signOut as nextSignOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from "firebase/auth";
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

  const targetUrl = callbackUrl && callbackUrl.length > 0 ? callbackUrl : "/";

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
        // se não for admin, termina a sessão Firebase para não ficar autenticado como user normal
        if (response.error === "NotAdmin") {
          await firebaseSignOut(auth);
          throw new Error("not_admin");
        }
        await firebaseSignOut(auth);
        throw new Error(response.error);
      }
    },
    [targetUrl]
  );

  async function onSignOut(e: React.FormEvent) {
    e.preventDefault();
    setSignOutLoading(true);
    setFirebaseError(null);
    try {
      await firebaseSignOut(auth);
      await nextSignOut({ callbackUrl: "/" });
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
      const credential = await signInWithEmailAndPassword(auth, firebaseEmail.trim(), firebasePassword);
      await syncNextAuthSession(credential.user);
      router.replace(targetUrl);
    } catch (err: any) {
      if (err?.message === "not_admin") {
        setFirebaseError("Esta conta não tem permissões de admin.");
        return;
      }
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
      <section className="space-y-3">
        <div className="rounded-full border border-white/10 bg-white/5 p-1 text-sm text-white/70">
          <div className="flex">
            <div className="flex-1 rounded-full bg-white px-4 py-2 text-center font-medium text-gray-900">Entrar</div>
            <button
              type="button"
              className="flex-1 rounded-full px-4 py-2 font-medium text-white/60 transition cursor-not-allowed"
              disabled
              title="Criação de conta desativada"
            >
              Criar conta (indisponível)
            </button>
          </div>
        </div>
        <p className="text-xs text-white/70">
          A criação de novas contas está temporariamente desativada. Contacta um administrador para pedir acesso.
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
        <input
          className="input input-bordered w-full"
          type="password"
          placeholder="password"
          value={firebasePassword}
          onChange={(e) => setFirebasePassword(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className="btn btn-outline flex-1"
            onClick={onFirebaseSignIn}
            disabled={firebaseLoading || !!firebaseUser}
          >
            {firebaseLoading ? "A processar..." : "Entrar"}
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

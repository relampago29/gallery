import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function EmailPasswordForm() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [showAuthAlert, setShowAuthAlert] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      let response = await signInWithEmailAndPassword(auth, email, pw);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) await fetch("/api/auth/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      } catch {}
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Erro a iniciar sessão");
    }
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pw);
      console.log(res);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Erro a registar");
    }
  }

  async function onGoogle(e: React.FormEvent) {
    e.preventDefault();
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) await fetch("/api/auth/session", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      } catch {}
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Erro no login com Google");
    }
  }

  async function onSignOut(e: React.FormEvent) {
    e.preventDefault();
    try {
      await auth.signOut();
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setShowAuthAlert(!!u); // mostra o alert quando entra, esconde quando sai
    });
    return () => unsub();
  }, []);

  // (Opcional) auto-fechar o alert de sucesso após 4s
  useEffect(() => {
    if (showAuthAlert) {
      const t = setTimeout(() => setShowAuthAlert(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showAuthAlert]);

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <input
          className="input input-bordered"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
        />
        <input
          className="input input-bordered"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="password"
        />

        <div className="flex gap-2">
          <button className="btn btn-primary" type="submit">Entrar</button>
          <button className="btn" onClick={onSignup}>Registar</button>
        </div>

        <div className="divider">ou</div>
        <button className="btn btn-outline" onClick={onGoogle}>
          Entrar com Google
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button onClick={onSignOut} className="btn btn-secondary mt-2">
          Sair
        </button>

        {user && showAuthAlert && (
          <div role="alert" className="alert alert-success mt-2">
            <span>
              Autenticado como <strong>{user.email}</strong>.
            </span>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShowAuthAlert(false)}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

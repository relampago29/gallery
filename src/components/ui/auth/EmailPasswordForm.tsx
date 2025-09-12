"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, User } from "firebase/auth";
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

        console.log(response);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Erro a iniciar sessão");
    }
  }

  async function onSignOut(e: React.FormEvent) {
    e.preventDefault();
    try{
        await auth.signOut()
    }catch(err: any){
        setError(err.message)
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
    <form onSubmit={onSubmit} className="card bg-base-100 w-96 shadow-sm">
      <input
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
      />
      <input
        className="input"
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="password"
      />
      <button className="btn">Entrar</button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button onClick={onSignOut} className="btn btn-secondary mt-2">Sair</button>

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
    </form>
  );
}

"use client";
import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";

const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Conta criada com sucesso!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Login efetuado com sucesso!");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      alert("Login com Google efetuado com sucesso!");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 350,
        margin: "32px auto",
        color: "#333",
        padding: 24,
        borderRadius: 12,
        boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <h2 style={{ textAlign: "center", margin: 0 }}>{isRegister ? "Criar Conta" : "Entrar"}</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          color: "#333",
          fontSize: "1rem",
        }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        style={{
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #ccc",
          color: "#333",
          fontSize: "1rem",
        }}
      />
      <button
        type="submit"
        style={{
          padding: "10px",
          borderRadius: "6px",
          border: "none",
          background: "#0070f3",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "1rem",
          cursor: "pointer",
          marginBottom: 4,
        }}
      >
        {isRegister ? "Registar" : "Entrar"}
      </button>
      <button
        type="button"
        onClick={() => setIsRegister(!isRegister)}
        style={{
          background: "none",
          border: "none",
          color: "#0070f3",
          cursor: "pointer",
          textDecoration: "underline",
          marginBottom: 8,
        }}
      >
        {isRegister ? "Já tenho conta" : "Criar conta"}
      </button>
      <button
        type="button"
        onClick={handleGoogleLogin}
        style={{
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid #4285F4",
          background: "#fff",
          color: "#4285F4",
          fontWeight: "bold",
          fontSize: "1rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#4285F4" d="M44.5 20H24v8.5h11.7C34.1 33.1 29.6 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.5 6.2 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.3-4z"/>
          <path fill="#34A853" d="M6.3 14.7l7 5.1C15.5 17.1 19.4 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.5 6.2 29.5 4 24 4c-7.1 0-13.1 3.1-17.1 8.1z"/>
          <path fill="#FBBC05" d="M24 44c5.6 0 10.5-1.9 14.3-5.1l-6.6-5.4C29.7 35.9 27 36.9 24 36.9c-5.6 0-10.1-3.8-11.7-9.1l-7 5.4C10.9 40.9 17.1 44 24 44z"/>
          <path fill="#EA4335" d="M44.5 20H24v8.5h11.7c-1.2 3.2-4.1 5.5-7.7 5.5-5.6 0-10.1-3.8-11.7-9.1l-7 5.4C10.9 40.9 17.1 44 24 44c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.3-4z"/>
        </svg>
        Entrar com Google
      </button>
      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
    </form>
  );
};

export default AuthForm;
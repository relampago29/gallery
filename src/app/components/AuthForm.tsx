"use client";
import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
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

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button type="submit">{isRegister ? "Registar" : "Entrar"}</button>
      <button type="button" onClick={() => setIsRegister(!isRegister)}>
        {isRegister ? "Já tenho conta" : "Criar conta"}
      </button>
      {error && <p style={{color: "red"}}>{error}</p>}
    </form>
  );
};

export default AuthForm;
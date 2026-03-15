"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/client";

type Props = {
  initialEmail: string | null;
};

export default function ContactEmailCard({ initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken(true) : null;
      if (!token) throw new Error("Precisas de iniciar sessão.");

      const res = await fetch("/api/settings/contact-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("Resposta inesperada do servidor.");
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao guardar.");
      }

      setEmail(data?.email || email);
      setMessage("Email de contacto atualizado.");
    } catch (err: any) {
      setError(err?.message || "Não foi possível guardar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">
          Contacto
        </p>
        <h3 className="text-lg font-semibold text-white">Email</h3>
        <p className="text-sm leading-relaxed text-white/60">
          Define o email de contacto visível para os clientes.
        </p>
      </div>
      <div className="mt-auto space-y-3 pt-5">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-white/40">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </span>
          <input
            type="email"
            className="w-full rounded-xl border border-white/10 bg-white/[0.07] py-2.5 pl-11 pr-4 text-sm text-white placeholder-white/40 transition focus:border-white/30 focus:bg-white/10 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Ex.: contacto@exemplo.pt"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy || !email.trim()}
          className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
        >
          {busy ? "A guardar…" : "Guardar email"}
        </button>
        {message ? <p className="text-xs text-emerald-400">{message}</p> : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}

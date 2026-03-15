"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/client";

type Props = {
  initialPhone: string | null;
};

export default function PaymentPhoneCard({ initialPhone }: Props) {
  const [phone, setPhone] = useState(initialPhone || "");
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

      const res = await fetch("/api/settings/payment-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("Resposta inesperada do servidor.");
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao guardar.");
      }

      setPhone(data?.phone || phone);
      setMessage("Número MBWay atualizado.");
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
          Pagamentos
        </p>
        <h3 className="text-lg font-semibold text-white">Número MBWay</h3>
        <p className="text-sm leading-relaxed text-white/60">
          Define o número usado nas sessões pendentes e comunicações.
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
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/[0.07] py-2.5 pl-11 pr-4 text-sm text-white placeholder-white/40 transition focus:border-white/30 focus:bg-white/10 focus:outline-none"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="912 345 678"
            maxLength={15}
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy || !phone.trim()}
          className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
        >
          {busy ? "A guardar…" : "Guardar número"}
        </button>
        {message ? <p className="text-xs text-emerald-400">{message}</p> : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}

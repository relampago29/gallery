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
      const token = user ? await user.getIdToken() : null;
      if (!token) throw new Error("Precisas de iniciar sessão.");
      const res = await fetch("/api/settings/payment-phone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao guardar.");
      }
      const data = await res.json();
      setPhone(data?.phone || phone);
      setMessage("Número MBWay atualizado.");
    } catch (err: any) {
      setError(err?.message || "Não foi possível guardar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Pagamentos</p>
        <h3 className="text-xl font-semibold text-white">Número MBWay</h3>
        <p className="text-sm text-white/70">Define o número usado nas sessões pendentes e comunicações.</p>
      </div>
      <div className="mt-4 space-y-3">
        <input
          className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:border-white/50 focus:outline-none"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Ex.: 912 345 678"
        />
        <button
          type="button"
          onClick={save}
          disabled={busy || !phone.trim()}
          className="w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
        >
          {busy ? "A guardar…" : "Guardar número"}
        </button>
        {message ? <div className="text-xs text-emerald-300">{message}</div> : null}
        {error ? <div className="text-xs text-red-300">{error}</div> : null}
      </div>
    </div>
  );
}

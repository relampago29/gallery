"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase/client";
import { Key } from "lucide-react";

type Props = {
  initialAccessKey: string | null;
};

export default function ContactEmailCard({ initialAccessKey }: Props) {
  const [accessKey, setAccessKey] = useState(initialAccessKey || "");
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
        body: JSON.stringify({ accessKey: accessKey.trim() }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("Resposta inesperada do servidor.");
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Falha ao guardar.");
      }

      setAccessKey(data?.accessKey || accessKey);
      setMessage("Access Key do StaticForms atualizada.");
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
          Formulário de contacto
        </p>
        <h3 className="text-lg font-semibold text-white">StaticForms</h3>
        <p className="text-sm leading-relaxed text-white/60">
          Cola a Access Key do StaticForms. Os emails do formulário serão
          enviados para o email associado a esta key.
        </p>
      </div>
      <div className="mt-auto space-y-3 pt-5">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-white/40">
            <Key size={16} />
          </span>
          <input
            type="text"
            className="w-full rounded-xl border border-white/10 bg-white/[0.07] py-2.5 pl-11 pr-4 text-sm text-white placeholder-white/40 transition focus:border-white/30 focus:bg-white/10 focus:outline-none font-mono"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            placeholder="sf_xxxxxxxxxxxxxxxxx"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy || !accessKey.trim()}
          className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
        >
          {busy ? "A guardar…" : "Guardar Access Key"}
        </button>
        {message ? <p className="text-xs text-emerald-400">{message}</p> : null}
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}

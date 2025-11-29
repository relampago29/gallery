"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import NavBar from "@/components/shared/navbar/navbar";
import { Link } from "@/i18n/navigation";

export default function OrderDownloadPage() {
  const locale = useLocale();
  const params = useParams<{ orderId: string; locale: string }>();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    setOrderId(params?.orderId || null);
    const qsToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || "" : "";
    setToken(qsToken);
  }, [params?.orderId]);

  const triggerDownload = useCallback(async () => {
    if (!token || !orderId || runningRef.current) return;
    runningRef.current = true;
    setState("running");
    setError(null);
    try {
      const res = await fetch(`/api/session-orders/${orderId}/download?token=${token}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Falha ao preparar o download");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${orderId || "sessao"}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setState("done");
    } catch (err: any) {
      setError(err?.message || "Não foi possível descarregar o ficheiro.");
      setState("error");
    } finally {
      runningRef.current = false;
    }
  }, [orderId, token]);

  useEffect(() => {
    if (token && orderId) {
      triggerDownload();
    }
  }, [token, triggerDownload, orderId]);

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-16 pt-10 text-center sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Download</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">As tuas fotos estão prontas</h1>
        <p className="text-sm text-white/70">Estamos a gerar o ZIP com as fotos escolhidas. O download começa automaticamente.</p>

        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          {state === "running" ? (
            <p className="text-sm text-white/70">A preparar o ficheiro…</p>
          ) : null}
          {state === "done" ? (
            <p className="text-sm text-emerald-300">Download iniciado. Mantém a página aberta até terminares.</p>
          ) : null}
          {state === "error" ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : null}
          {!token ? <p className="text-sm text-red-400">Token em falta. Reabre o link enviado.</p> : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={triggerDownload}
            disabled={!token || state === "running"}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
          >
            {state === "running" ? "A preparar…" : "Transferir novamente"}
          </button>
          <Link
            href="/"
            locale={locale}
            className="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Voltar ao início
          </Link>
        </div>

        {orderId ? <div className="text-xs text-white/60">Pedido #{orderId}</div> : null}
      </main>
    </div>
  );
}

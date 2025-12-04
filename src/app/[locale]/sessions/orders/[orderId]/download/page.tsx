"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import NavBar from "@/components/shared/navbar/navbar";
import { Link } from "@/i18n/navigation";

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m${seconds.toString().padStart(2, "0")}s`;
}

function estimateTotalMs(selectedCount: number | null) {
  if (!selectedCount || selectedCount <= 0) return 15000; // fallback ~15s
  const perPhotoMs = 140; // heurística leve por foto
  const baseMs = 8000; // custo fixo para arrancar o ZIP
  const estimated = baseMs + selectedCount * perPhotoMs;
  return Math.min(300000, Math.max(12000, estimated)); // máx 5m, mínimo 12s
}

export default function OrderDownloadPage() {
  const locale = useLocale();
  const params = useParams<{ orderId: string; locale: string }>();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [token, setToken] = useState<string>("");
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [estimatedMs, setEstimatedMs] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "done">("idle");
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setOrderId(params?.orderId || null);
    const qsToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("token") || "" : "";
    setToken(qsToken);
  }, [params?.orderId]);

  useEffect(() => {
    if (!orderId || !token) return;
    let aborted = false;
    fetch(`/api/session-orders/${orderId}?token=${token}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (aborted) return;
        const count = typeof payload?.selectedCount === "number" ? payload.selectedCount : null;
        setSelectedCount(count);
      })
      .catch(() => {
        if (aborted) return;
        setSelectedCount(null);
      });
    return () => {
      aborted = true;
    };
  }, [orderId, token]);

  const clearProgress = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startedAtRef.current = null;
    if (doneTimeoutRef.current) {
      clearTimeout(doneTimeoutRef.current);
      doneTimeoutRef.current = null;
    }
    if (downloadIntervalRef.current) {
      clearInterval(downloadIntervalRef.current);
      downloadIntervalRef.current = null;
    }
  }, []);

  const kickOffProgress = useCallback(
    (count: number | null) => {
      clearProgress();
      const estimate = estimateTotalMs(count);
      setEstimatedMs(estimate);
      setElapsedMs(0);
      setProgress(3);
      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (!startedAtRef.current) return;
        const elapsed = Date.now() - startedAtRef.current;
        setElapsedMs(elapsed);
        if (estimate) {
          const ratio = elapsed / estimate;
          // Mantém a barra abaixo de 90% até concluir, para não “chegar ao fim” antes do ZIP estar pronto
          const eased = Math.min(0.9, ratio * 0.85);
          const pct = Math.max(3, Math.min(90, Math.round(eased * 100)));
          setProgress(pct);
        } else {
          const pct = Math.min(80, Math.round(elapsed / 400));
          setProgress(pct);
        }
      }, 350);
    },
    [clearProgress]
  );

  const triggerDownload = useCallback(async () => {
    if (!token || !orderId || runningRef.current) return;
    runningRef.current = true;
    setState("running");
    setError(null);
    setDownloadUrl(null);
    kickOffProgress(selectedCount);
    console.log("[download-ui] start", { orderId, selectedCount });

    const downloadEndpoint = `/api/session-orders/${orderId}/download?token=${token}`;
    const estimate = estimateTotalMs(selectedCount);
    const fallbackMs = Math.max(estimate, 30000); // pelo menos 30s para grandes lotes

    doneTimeoutRef.current = setTimeout(() => {
      setDownloadUrl(downloadEndpoint);
      setProgress(100);
      setElapsedMs(startedAtRef.current ? Date.now() - startedAtRef.current : elapsedMs);
      setState("done");
      runningRef.current = false;
      console.log("[download-ui] ready (no-buffer)", { orderId });
    }, fallbackMs);
  }, [clearProgress, elapsedMs, kickOffProgress, orderId, selectedCount, token]);

  const handleDownloadClick = useCallback(() => {
    if (!downloadUrl || downloadState === "downloading") return;
    setDownloadState("downloading");
    setDownloadProgress(5);

    if (downloadIntervalRef.current) {
      clearInterval(downloadIntervalRef.current);
    }
    downloadIntervalRef.current = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 5;
      });
    }, 800);

    // dispara o download via link oculto para evitar mudar de página
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = `${orderId || "sessao"}.zip`;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // após 20s (ou menos se já completou a barra), consideramos concluído
    setTimeout(() => {
      if (downloadIntervalRef.current) {
        clearInterval(downloadIntervalRef.current);
        downloadIntervalRef.current = null;
      }
      setDownloadProgress(100);
      setDownloadState("done");
    }, 20000);
  }, [downloadUrl, downloadState, orderId]);

  useEffect(() => {
    return () => {
      clearProgress();
      abortRef.current?.abort();
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      if (downloadIntervalRef.current) clearInterval(downloadIntervalRef.current);
    };
  }, [clearProgress, downloadUrl]);

  const remainingMs =
    state === "running" && estimatedMs ? Math.max(estimatedMs - elapsedMs, estimatedMs * 0.15) : null;

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-16 pt-10 text-center sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Download</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">As tuas fotos estão prontas</h1>
        <p className="text-sm text-white/70">Estamos a gerar o ZIP com as fotos escolhidas. Depois clica em “Descarregar”.</p>

        <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          {state === "running" ? (
            <div className="space-y-3 text-left">
              <p className="text-sm text-white/80">
                A preparar o ficheiro{selectedCount ? ` (${selectedCount} fotos)` : ""}…
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white via-white/90 to-white/70 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex flex-col gap-1 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
                <span>Progresso: {Math.min(100, Math.max(0, progress)).toFixed(0)}%</span>
                <span>
                  {remainingMs
                    ? `Tempo estimado: ~${formatDuration(estimatedMs || 0)} (restam ${formatDuration(remainingMs)})`
                    : estimatedMs
                      ? `Tempo estimado: ~${formatDuration(estimatedMs)}`
                      : "A estimar tempo…"}
                </span>
              </div>
            </div>
          ) : null}
          {state === "done" ? (
            <div className="space-y-2 text-left">
              <p className="text-sm text-emerald-300">Ficheiro pronto. Clica em descarregar para guardar.</p>
              {elapsedMs ? (
                <p className="text-xs text-white/60">Preparação concluída em {formatDuration(elapsedMs)}.</p>
              ) : null}
            </div>
          ) : null}
          {state === "error" ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : null}
          {!token ? <p className="text-sm text-red-400">Token em falta. Reabre o link enviado.</p> : null}

          {state === "done" && downloadState === "downloading" ? (
            <div className="mt-4 space-y-2 text-left">
              <p className="text-sm text-white/80">A descarregar… mantém a página aberta.</p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white via-white/90 to-white/70 transition-[width]"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-xs text-white/60">Progresso estimado: {downloadProgress}%</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {state === "idle" || state === "error" ? (
            <button
              type="button"
              onClick={triggerDownload}
              disabled={!token}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
            >
              Preparar ficheiro
            </button>
          ) : null}

          {state === "done" && downloadUrl ? (
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={downloadState === "downloading"}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
            >
              {downloadState === "downloading" ? "A descarregar…" : "Descarregar"}
            </button>
          ) : null}

          {state === "running" ? (
            <Link
              href="/"
              locale={locale}
              className="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Cancelar e voltar
            </Link>
          ) : null}

          {state !== "running" ? (
            <Link
              href="/"
              locale={locale}
              className="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Voltar ao início
            </Link>
          ) : null}
        </div>

        {orderId ? <div className="text-xs text-white/60">Pedido #{orderId}</div> : null}
      </main>
    </div>
  );
}

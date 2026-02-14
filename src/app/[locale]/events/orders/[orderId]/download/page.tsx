"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
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

function estimateTotalMs(count: number | null) {
  if (!count || count <= 0) return 15000;
  const perPhotoMs = 140;
  const baseMs = 8000;
  const estimated = baseMs + count * perPhotoMs;
  return Math.min(300000, Math.max(12000, estimated));
}

export default function EventOrderDownloadPage() {
  const locale = useLocale();
  const t = useTranslations("eventOrderDownload");
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId || "";
  const token =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("token") || ""
      : "";
  const [state, setState] = useState<"idle" | "running" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!orderId || !token) return;
    let aborted = false;
    fetch(`/api/event-orders/${orderId}?token=${token}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (aborted) return;
        const count =
          typeof payload?.itemCount === "number" ? payload.itemCount : null;
        setItemCount(count);
      })
      .catch(() => {
        if (aborted) return;
        setItemCount(null);
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
  }, []);

  const startDownload = useCallback(async () => {
    if (runningRef.current || !orderId || !token) return;
    runningRef.current = true;
    setState("running");
    setProgress(0);
    setElapsedMs(0);
    setError(null);

    const total = estimateTotalMs(itemCount);
    startedAtRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - (startedAtRef.current || Date.now());
      setElapsedMs(elapsed);
      const p = Math.min(0.95, elapsed / total);
      setProgress(p);
    }, 250);

    try {
      // First validate the order status via the API
      const checkUrl = `/api/event-orders/${orderId}/download?token=${encodeURIComponent(
        token
      )}`;
      const res = await fetch(checkUrl, { redirect: "manual" });

      if (
        res.type === "opaqueredirect" ||
        (res.status >= 300 && res.status < 400)
      ) {
        // The API returned a redirect to the Cloud Function — use anchor click
        // to avoid CORS (browser navigation follows redirects natively)
        const redirectTarget = res.headers.get("location") || checkUrl;
        const a = document.createElement("a");
        a.href = redirectTarget;
        a.download = `fotos-evento.zip`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Keep progress running for estimated time, then mark done
        const fallbackMs = Math.max(total, 20000);
        setTimeout(() => {
          clearProgress();
          setProgress(1);
          setState("done");
          runningRef.current = false;
        }, fallbackMs);
        return;
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || t("downloadFailed"));
      }

      // If somehow we got the blob directly (no redirect), handle it
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `fotos-evento.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      clearProgress();
      setProgress(1);
      setState("done");
    } catch (err: any) {
      clearProgress();
      setError(err?.message || t("downloadFailed"));
      setState("error");
    } finally {
      runningRef.current = false;
    }
  }, [orderId, token, itemCount, clearProgress]);

  useEffect(() => {
    return () => clearProgress();
  }, [clearProgress]);

  const progressPercent = Math.round(progress * 100);

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <header className="space-y-3 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">
            {t("badge")}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {t("title")}
          </h1>
          <p className="text-sm text-white/70">{t("subtitle")}</p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div className="space-y-5 text-center">
            {state === "idle" && (
              <button
                type="button"
                onClick={startDownload}
                className="mx-auto inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
              >
                {t("startDownload")}
              </button>
            )}

            {state === "running" && (
              <div className="space-y-3">
                <p className="text-sm text-white/70">
                  {t("preparingZip", { percent: progressPercent })}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-xs text-white/50">
                  {t("timeElapsed", { time: formatDuration(elapsedMs) })}
                </p>
              </div>
            )}

            {state === "done" && (
              <div className="space-y-3">
                <p className="text-lg font-semibold text-emerald-300">
                  {t("downloadComplete")}
                </p>
                <p className="text-sm text-white/60">{t("checkDownloads")}</p>
                <Link
                  href="/dashboard?tab=history"
                  locale={locale}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm text-white/80 transition hover:bg-white/10"
                >
                  {t("viewHistory")}
                </Link>
              </div>
            )}

            {state === "error" && (
              <div className="space-y-3">
                <p className="text-sm text-red-300">{error}</p>
                <button
                  type="button"
                  onClick={startDownload}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
                >
                  {t("tryAgain")}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-white/50">
          {t("orderId")}{" "}
          <span className="font-mono text-white/80">{orderId}</span>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import {
  ArrowLeft,
  Copy,
  Check,
  Download,
  RefreshCw,
  ExternalLink,
  ImageIcon,
  Lock,
} from "lucide-react";

type SessionPhoto = {
  id: string;
  title?: string | null;
  url: string;
  downloadUrl: string;
  createdAt?: number;
};

async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw new Error("Inicia sessão para continuar");
  return user.getIdToken();
}

export default function SessionDetailPage() {
  const params = useParams<{ locale: string; sessionId: string }>();
  const locale = params?.locale || "pt";
  const sessionId = params?.sessionId || "";
  const router = useRouter();

  const [photos, setPhotos] = useState<SessionPhoto[]>([]);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sessionsPath = `/${locale}/sessions`;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${sessionsPath}/${sessionId}?hours=48`
      : "";

  const loadPhotos = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/session-photos/list?sessionId=${encodeURIComponent(
          sessionId
        )}&hours=48`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Falha (${res.status})`);
      }
      const data = await res.json();
      setPhotos(Array.isArray(data.files) ? data.files : []);
      setSessionName(data.sessionName || sessionId);
    } catch (err: any) {
      setError(err?.message || "Falhou ao carregar as fotos da sessão.");
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  function copyCode() {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyShareUrl() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const cardClass =
    "rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm";

  return (
    <div className="space-y-8">
      {/* Back + header */}
      <header className="space-y-4">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/admin/sessions`)}
          className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
        >
          <ArrowLeft size={14} />
          Voltar às sessões
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              Sessão privada
            </p>
            <h1 className="text-4xl font-semibold text-white tracking-tight">
              {sessionName || sessionId}
            </h1>
            <div className="flex items-center gap-2 pt-1">
              <span className="font-mono text-sm tracking-wider text-white/40">
                {sessionId}
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-1 text-[10px] text-white/50 transition hover:bg-white/10 hover:text-white/70"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadPhotos}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Recarregar
            </button>
            {shareUrl && (
              <button
                type="button"
                onClick={copyShareUrl}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                <ExternalLink size={14} />
                Copiar link
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Session info */}
      <div className={`${cardClass} divide-y divide-white/10`}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3 text-sm text-white/60">
            <ImageIcon size={14} />
            <span>
              <span className="font-semibold text-white">{photos.length}</span>{" "}
              {photos.length === 1 ? "foto" : "fotos"}
            </span>
          </div>
          {photos.length > 0 && (
            <a
              href={`/api/session-photos/download-all?sessionId=${encodeURIComponent(
                sessionId
              )}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90"
            >
              <Download size={14} />
              Transferir tudo
            </a>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className={`${cardClass} p-10 text-center text-sm text-white/50`}>
          A carregar fotos…
        </div>
      ) : photos.length === 0 && !error ? (
        <div className={`${cardClass} p-10 text-center`}>
          <Lock size={32} className="mx-auto mb-3 text-white/20" />
          <p className="text-sm text-white/50">
            Esta sessão ainda não tem fotos.
          </p>
        </div>
      ) : (
        /* Photo grid */
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm transition hover:border-white/20"
            >
              <div className="aspect-4/3 bg-white/10 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.title || "Foto da sessão"}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="space-y-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {photo.title || "(sem título)"}
                  </p>
                  {photo.createdAt && (
                    <p className="text-[10px] uppercase tracking-wider text-white/40">
                      {new Date(photo.createdAt).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <a
                  href={photo.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-1.5 text-xs text-white transition hover:bg-white/10"
                >
                  <Download size={12} />
                  Transferir
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

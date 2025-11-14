"use client";

import { useState } from "react";

type Props = {
  sessionId: string;
  className?: string;
};

export function DownloadAllButton({ sessionId, className }: Props) {
  const [downloading, setDownloading] = useState(false);

  async function handleClick() {
    try {
      setDownloading(true);
      const res = await fetch(`/api/session-photos/download-all?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Falha ao gerar o download");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sessionId || "sessao"}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || "Não foi possível transferir todas as fotos.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={downloading}
      className={`inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-1.5 text-sm text-white transition hover:bg-white/10 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50 ${className || ""}`}
    >
      {downloading ? "A preparar…" : "Transferir todas"}
    </button>
  );
}


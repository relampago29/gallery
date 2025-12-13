"use client";

import { useEffect, useState } from "react";
import { pickThumb, type PublicPhoto } from "@/lib/publicPhotos";
import { Link } from "@/i18n/navigation";

type Props = {
  locale: string;
  seeAllHref: string;
};

export function PublicPreviewGrid({ locale, seeAllHref }: Props) {
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/public-photos/list?limit=12", { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setPhotos(Array.isArray(data.items) ? data.items : []);
      } catch (err: any) {
        setError(err?.message || "Falha ao carregar as fotos.");
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Portfólio</p>
          <h2 className="text-2xl font-semibold text-white">Últimos uploads públicos</h2>
        </div>
        <Link
          href={seeAllHref}
          locale={locale}
          className="inline-flex items-center justify-center rounded-full border border-white/30 px-4 py-1.5 text-sm text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
        >
          Ver todos
        </Link>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        {loading ? (
          <div className="py-10 text-center text-sm text-white/60">A carregar…</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
            {error.includes("index") ? "Precisas de publicar o índice no Firestore." : error}
          </div>
        ) : photos.length === 0 ? (
          <div className="py-10 text-center text-sm text-white/60">
            Ainda não existem fotos públicas. Faz upload para começar.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p) => {
              const thumb = pickThumb(p);
              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm"
                >
                  <div className="aspect-[4/3] bg-white/10">
                    {thumb.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb.src} alt={p.alt || p.title || "foto"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-white/70">
                        {p.status === "processing" ? "A gerar variantes…" : "Sem preview"}
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <div className="truncate text-sm font-medium text-white">{p.title || "(sem título)"}</div>
                    <div className="text-xs uppercase tracking-wide text-white/50">{p.status || "–"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}


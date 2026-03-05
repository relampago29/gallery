"use client";

import { useState } from "react";
import { Maximize2 } from "lucide-react";
import {
  PhotoLightbox,
  type LightboxPhoto,
} from "@/components/shared/PhotoLightbox";

type SessionPhoto = {
  id: string;
  title?: string | null;
  url: string;
  createdAt?: number;
  downloadName?: string;
  downloadUrl: string;
};

type Props = {
  files: SessionPhoto[];
  locale: string;
  transferLabel: string;
  noTitleLabel: string;
};

export function SessionPhotoGrid({
  files,
  locale,
  transferLabel,
  noTitleLabel,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const lightboxPhotos: LightboxPhoto[] = files.map((f) => ({
    id: f.id,
    src: f.url,
    alt: f.title || undefined,
  }));

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm transition hover:border-white/30"
          >
            <div className="relative aspect-4/3 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.url}
                alt={file.title || noTitleLabel}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {/* Hover overlay + expand button */}
              <button
                type="button"
                onClick={() => setSelectedId(file.id)}
                className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/30"
                aria-label="Ampliar foto"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <Maximize2 size={18} />
                </span>
              </button>
            </div>
            <div className="space-y-3 p-5">
              <div className="text-base font-medium text-white truncate">
                {file.title || noTitleLabel}
              </div>
              {file.createdAt ? (
                <div className="text-xs text-white/60 uppercase tracking-wide">
                  {new Date(file.createdAt).toLocaleDateString(
                    locale === "en" ? "en-GB" : "pt-PT",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </div>
              ) : null}
              <a
                href={file.downloadUrl}
                download={file.downloadName || undefined}
                className="inline-flex w-full items-center justify-center rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
              >
                {transferLabel}
              </a>
            </div>
          </div>
        ))}
      </div>

      <PhotoLightbox
        photos={lightboxPhotos}
        selectedId={selectedId}
        onClose={() => setSelectedId(null)}
        onChangeId={setSelectedId}
      />
    </>
  );
}

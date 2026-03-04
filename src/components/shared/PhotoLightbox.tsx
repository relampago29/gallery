"use client";

import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxPhoto = {
  id: string;
  src: string;
  alt?: string;
};

type PhotoLightboxProps = {
  photos: LightboxPhoto[];
  selectedId: string | null;
  onClose: () => void;
  onChangeId: (id: string | null) => void;
};

export function PhotoLightbox({
  photos,
  selectedId,
  onClose,
  onChangeId,
}: PhotoLightboxProps) {
  const selectedIndex = useMemo(
    () => (selectedId ? photos.findIndex((p) => p.id === selectedId) : -1),
    [photos, selectedId],
  );

  const selected = selectedIndex >= 0 ? photos[selectedIndex] : null;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < photos.length - 1;

  function goToPrev() {
    if (hasPrev) onChangeId(photos[selectedIndex - 1].id);
  }
  function goToNext() {
    if (hasNext) onChangeId(photos[selectedIndex + 1].id);
  }

  useEffect(() => {
    if (!selected) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
    };

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, selectedIndex, photos.length]);

  if (!selected) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 rounded-full border border-white/20 bg-black/50 p-2 text-white/70 backdrop-blur-sm transition hover:border-white/40 hover:bg-black/70 hover:text-white"
        aria-label="Fechar"
      >
        <X size={20} />
      </button>

      {/* Prev */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/70 backdrop-blur-sm transition hover:border-white/40 hover:bg-black/70 hover:text-white sm:left-4 sm:p-3"
          aria-label="Foto anterior"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/70 backdrop-blur-sm transition hover:border-white/40 hover:bg-black/70 hover:text-white sm:right-4 sm:p-3"
          aria-label="Próxima foto"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-h-[90vh] max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selected.src}
          alt={selected.alt || ""}
          className="max-h-[90vh] w-auto rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}

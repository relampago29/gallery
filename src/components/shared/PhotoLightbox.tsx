"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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

  const [imgLoaded, setImgLoaded] = useState(false);
  const [visible, setVisible] = useState(false);

  // Touch / swipe support
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const goToPrev = useCallback(() => {
    if (hasPrev) {
      setImgLoaded(false);
      onChangeId(photos[selectedIndex - 1].id);
    }
  }, [hasPrev, onChangeId, photos, selectedIndex]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      setImgLoaded(false);
      onChangeId(photos[selectedIndex + 1].id);
    }
  }, [hasNext, onChangeId, photos, selectedIndex]);

  // Entrance animation
  useEffect(() => {
    if (selected) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      setImgLoaded(false);
    }
  }, [selected]);

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
  }, [selected, selectedIndex, photos.length, onClose, goToPrev, goToNext]);

  if (!selected) return null;

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    // Only count horizontal swipes (min 50px, mostly horizontal)
    if (absDx > 50 && absDx > absDy * 1.5) {
      if (dx > 0) goToPrev();
      else goToNext();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div
        className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-4 py-3 sm:px-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo counter */}
        <div className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm sm:text-sm">
          {selectedIndex + 1} / {photos.length}
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:text-white active:scale-95"
          aria-label="Fechar"
        >
          <X size={22} />
        </button>
      </div>

      {/* Prev */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:text-white active:scale-95 sm:left-4 sm:h-12 sm:w-12"
          aria-label="Foto anterior"
        >
          <ChevronLeft size={26} />
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
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:text-white active:scale-95 sm:right-4 sm:h-12 sm:w-12"
          aria-label="Próxima foto"
        >
          <ChevronRight size={26} />
        </button>
      )}

      {/* Image */}
      <div
        className="relative flex max-h-[85vh] max-w-5xl items-center justify-center px-12 sm:px-16"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Loading spinner */}
        {!imgLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={selected.id}
          src={selected.src}
          alt={selected.alt || ""}
          onLoad={() => setImgLoaded(true)}
          className={`max-h-[85vh] w-auto rounded-2xl object-contain shadow-2xl transition-all duration-300 ${
            imgLoaded ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
          draggable={false}
        />
      </div>

      {/* Bottom hint (mobile) */}
      <div className="absolute bottom-4 left-0 right-0 text-center sm:hidden">
        <span className="rounded-full bg-black/40 px-3 py-1 text-xs text-white/50 backdrop-blur-sm">
          ← Deslize para navegar →
        </span>
      </div>
    </div>
  );
}

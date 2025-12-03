"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type UploadState = {
  label: string;
  progress: number; // 0..1
  scope: string;
  startedAt: number;
  lastUpdated: number;
};

type UploadProgressContextValue = {
  state: UploadState | null;
  etaSeconds: number | null;
  setUploadProgress: (payload: { label: string; progress: number; scope: string }) => void;
  clearUpload: () => void;
};

const UploadProgressContext = createContext<UploadProgressContextValue | undefined>(undefined);

export function UploadProgressProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState | null>(null);

  const setUploadProgress = useCallback((payload: { label: string; progress: number; scope: string }) => {
    setState((prev) => {
      const startedAt = prev?.startedAt ?? Date.now();
      return {
        label: payload.label,
        progress: Math.min(1, Math.max(0, payload.progress)),
        scope: payload.scope,
        startedAt,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const clearUpload = useCallback(() => setState(null), []);

  const etaSeconds = useMemo(() => {
    if (!state || state.progress <= 0 || state.progress >= 1) return null;
    const elapsedMs = Date.now() - state.startedAt;
    const remainingFraction = 1 - state.progress;
    const msPerUnit = elapsedMs / state.progress;
    const remainingMs = remainingFraction * msPerUnit;
    return remainingMs > 0 && Number.isFinite(remainingMs) ? Math.round(remainingMs / 1000) : null;
  }, [state]);

  const value = useMemo(
    () => ({
      state,
      etaSeconds,
      setUploadProgress,
      clearUpload,
    }),
    [state, etaSeconds, setUploadProgress, clearUpload]
  );

  return <UploadProgressContext.Provider value={value}>{children}</UploadProgressContext.Provider>;
}

export function useUploadProgress() {
  const ctx = useContext(UploadProgressContext);
  if (!ctx) {
    throw new Error("useUploadProgress deve ser usado dentro de UploadProgressProvider");
  }
  return ctx;
}

"use client";

import { FormEvent, useMemo, useState, useEffect, useCallback } from "react";
import NavBar from "@/components/shared/navbar/navbar";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useParams } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, type User } from "firebase/auth";
import Image from "next/image";
import { Loader2, ArrowLeft } from "lucide-react";

type SessionPhoto = {
  id: string;
  title?: string | null;
  url: string;
  createdAt?: number;
};

type SessionPayload = {
  sessionId: string;
  sessionName: string;
  files: SessionPhoto[];
  freeAccess: boolean;
};

type ExistingOrder = {
  id: string;
  status: string;
  token?: string | null;
  selectedCount?: number;
  sessionName?: string;
};

export default function SessionDetailPage() {
  const t = useTranslations("sessionsPage");
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId || "";

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [existingOrder, setExistingOrder] = useState<ExistingOrder | null>(
    null,
  );
  const [checkingOrder, setCheckingOrder] = useState(false);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.isAnonymous) {
      router.replace(
        `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/sessions/${sessionId}`)}`,
      );
    }
  }, [user, authLoading, locale, router, sessionId]);

  // Load session photos
  const loadSession = useCallback(async () => {
    if (!user || user.isAnonymous || !sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams({ sessionId });
      const res = await fetch(`/api/session-photos/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || t("sessionNotFound"));
      }
      const data = await res.json();
      if (!data?.files?.length) {
        throw new Error(t("noPhotosYet"));
      }
      setSession({
        sessionId: data.sessionId,
        sessionName: data.sessionName,
        files: data.files,
        freeAccess: data.freeAccess === true,
      });
      // Check existing orders
      void fetchExistingOrder(data.sessionId, token);
    } catch (err: any) {
      setError(err?.message || t("searchFailed"));
    } finally {
      setLoading(false);
    }
  }, [user, sessionId, t]);

  useEffect(() => {
    if (user && !user.isAnonymous) {
      loadSession();
    }
  }, [user, loadSession]);

  async function fetchExistingOrder(sid: string, idToken?: string) {
    setCheckingOrder(true);
    try {
      const tok = idToken || (await user?.getIdToken());
      const res = await fetch(
        `/api/session-orders?sessionId=${encodeURIComponent(sid)}`,
        {
          headers: { Authorization: `Bearer ${tok}` },
          cache: "no-store",
        },
      );
      if (!res.ok) return;
      const data = await res.json();
      const ord = data?.order || null;
      if (ord && (ord.status === "rejected" || ord.status === "cancelled")) {
        setExistingOrder(null);
      } else {
        setExistingOrder(ord);
      }
    } catch {
      setExistingOrder(null);
    } finally {
      setCheckingOrder(false);
    }
  }

  const togglePhoto = (photoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const selectAll = () => {
    if (!session) return;
    setSelected(new Set(session.files.map((f) => f.id)));
  };
  const clearSelection = () => setSelected(new Set());
  const selectionCount = selected.size;
  const allSelected = session ? selectionCount === session.files.length : false;

  const proceed = async () => {
    if (!session || !selectionCount || !user) return;
    setCreatingOrder(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/session-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          photoIds: Array.from(selected),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || t("proceedFailed"));
      }
      const payload = await res.json();
      const orderId = payload?.orderId;
      const token = payload?.token;
      const status = payload?.status;
      if (!orderId || !token) throw new Error(t("createOrderFailed"));

      // Use the status returned by the API — it reads fresh from Firestore,
      // so it is always authoritative. "paid" = freeAccess was true → download.
      // "pending" = payment required → MBWay page.
      if (status === "paid") {
        router.push(
          `/${locale}/sessions/orders/${orderId}/download?token=${token}`,
        );
      } else {
        router.push(`/${locale}/sessions/orders/${orderId}?token=${token}`);
      }
    } catch (err: any) {
      setError(err?.message || t("proceedError"));
    } finally {
      setCreatingOrder(false);
    }
  };

  const resumeOrder = () => {
    if (!existingOrder || !existingOrder.token) return;
    const target =
      existingOrder.status === "pending"
        ? `/${locale}/sessions/orders/${existingOrder.id}?token=${existingOrder.token}`
        : `/${locale}/sessions/orders/${existingOrder.id}/download?token=${existingOrder.token}`;
    router.push(target);
  };

  // Auth loading
  if (authLoading || !user || user.isAnonymous) {
    return (
      <div className="min-h-screen bg-[#030303] text-gray-100">
        <NavBar />
        <main className="flex items-center justify-center py-32">
          <Loader2 size={28} className="animate-spin text-white/40" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030303] text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Back button */}
          <button
            type="button"
            onClick={() => router.push(`/${locale}/sessions`)}
            className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white"
          >
            <ArrowLeft size={14} />
            {t("backToSessions")}
          </button>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center">
              <Loader2
                size={24}
                className="mx-auto mb-3 animate-spin text-white/40"
              />
              <p className="text-sm text-white/50">{t("searching")}</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : session ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      {t("sessionLabel")}
                    </p>
                    <h2 className="text-2xl font-semibold text-white">
                      {session.sessionName}
                    </h2>
                    <p className="text-sm text-white/70">
                      {session.freeAccess
                        ? t("freeAccessNote")
                        : t("choosePhotos")}
                    </p>
                  </div>
                  {existingOrder?.status !== "paid" && (
                    <div className="space-y-2 text-sm">
                      <div className="text-white">
                        {t("selected")}:{" "}
                        <span className="font-semibold">{selectionCount}</span>
                      </div>
                      <div className="flex gap-2 text-xs uppercase tracking-wide text-white/60">
                        <button
                          type="button"
                          className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/10"
                          onClick={selectAll}
                        >
                          {t("selectAll")}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/10"
                          onClick={clearSelection}
                        >
                          {t("clear")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Existing order card */}
              {checkingOrder && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
                  {t("checkingOrders")}
                </div>
              )}

              {existingOrder ? (
                <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/50">
                      {t("existingOrderLabel")}
                    </p>
                    <h2 className="text-2xl font-semibold text-white">
                      {t("existingOrderTitle")}
                    </h2>
                    <p className="text-sm text-white/70">
                      {existingOrder.status === "pending"
                        ? t("existingOrderPending")
                        : existingOrder.status === "paid"
                          ? t("existingOrderPaid")
                          : t("existingOrderDone")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={resumeOrder}
                      disabled={!existingOrder.token}
                      className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
                    >
                      {existingOrder.status === "pending"
                        ? t("goToPayment")
                        : t("downloadPhotos")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExistingOrder(null);
                        setSelected(new Set());
                      }}
                      className="rounded-full border border-white/30 px-5 py-2 text-sm text-white transition hover:bg-white/10"
                    >
                      {t("chooseAgain")}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Photo grid */}
                  <div className="photo-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {session.files.map((photo) => {
                      const isSelected = selected.has(photo.id);
                      const imageSrc = photo?.url?.trim()?.length
                        ? photo.url
                        : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => togglePhoto(photo.id)}
                          className={`relative overflow-hidden rounded-3xl border ${isSelected ? "border-white/80" : "border-white/10"} bg-white/5 text-left shadow-[0_25px_120px_rgba(0,0,0,0.45)] transition hover:border-white/40`}
                        >
                          <span className="absolute right-3 top-3 z-10 rounded-full border border-white/60 bg-black/40 px-2 py-0.5 text-xs text-white">
                            {isSelected ? t("photoSelected") : t("photoSelect")}
                          </span>
                          <div className="relative aspect-[4/5]">
                            <Image
                              src={imageSrc}
                              alt={photo.title || t("photoAlt")}
                              fill
                              sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                              className="object-cover"
                              loading="lazy"
                              unoptimized
                              style={{ backgroundColor: "#0a0a0a" }}
                            />
                            <div
                              className={`pointer-events-none absolute inset-0 bg-black/60 transition ${isSelected ? "opacity-40" : "opacity-0"}`}
                            />
                          </div>
                          <div className="p-4">
                            <div className="truncate text-base font-medium text-white">
                              {photo.title || t("noTitle")}
                            </div>
                            {photo.createdAt && (
                              <div className="text-xs uppercase tracking-wide text-white/60">
                                {new Date(photo.createdAt).toLocaleDateString(
                                  "pt-PT",
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom actions */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      disabled={!selectionCount || creatingOrder}
                      onClick={proceed}
                      className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-40"
                    >
                      {creatingOrder
                        ? t("preparing")
                        : session.freeAccess
                          ? t("proceedFree", { count: selectionCount })
                          : t("proceed", { count: selectionCount })}
                    </button>
                  </div>
                  {!selectionCount && (
                    <p className="text-center text-sm text-white/60">
                      {t("selectAtLeastOne")}
                    </p>
                  )}
                  {allSelected && (
                    <p className="text-center text-sm text-emerald-300/80">
                      {t("allPhotosSelected")}
                    </p>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

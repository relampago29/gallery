"use client";

import { useState } from "react";
import { useCart } from "./CartContext";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { ShoppingCart, X, Trash2, ArrowRight } from "lucide-react";

export function CartDrawer() {
  const { items, count, total, remove, clear } = useCart();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();
  const t = useTranslations("cart");
  const router = useRouter();

  async function handleCheckout() {
    setError(null);
    const user = auth.currentUser;
    if (!user) {
      router.push(`/${locale}/login?callbackUrl=/${locale}/events`);
      return;
    }

    if (!items.length) return;

    setCreating(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/event-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            photoId: i.photoId,
            eventId: i.eventId,
            masterPath: i.masterPath,
            title: i.title,
            pricePerPhoto: i.pricePerPhoto,
            createdAt: i.createdAt,
          })),
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || t("createOrderFailed"));
      }
      const data = await res.json();
      clear();
      setOpen(false);
      router.push(
        `/${locale}/events/orders/${data.orderId}?token=${data.token}`
      );
    } catch (err: any) {
      setError(err?.message || t("processingError"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      {/* Floating cart button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-lg transition hover:bg-white/20"
        aria-label={t("title")}
      >
        <ShoppingCart size={22} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-gray-900">
            {count}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0a0a0a] shadow-[0_0_60px_rgba(0,0,0,0.6)] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{t("title")}</h2>
            <p className="text-xs text-white/50">
              {count} {t("photoCount", { count })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <ShoppingCart size={40} className="text-white/20" />
              <p className="text-sm text-white/50">{t("emptyCart")}</p>
              <p className="text-xs text-white/40">{t("emptyCartHint")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.photoId}
                  className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/10">
                    {item.thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbUrl}
                        alt={item.title || t("photo")}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-white/40">
                        {t("photo")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <p className="text-xs text-white/50 truncate">
                        {item.eventTitle}
                      </p>
                      <p className="text-sm font-medium text-white truncate">
                        {item.title || t("untitledPhoto")}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      {item.pricePerPhoto.toFixed(2)}€
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item.photoId)}
                    className="self-center rounded-lg p-1.5 text-white/40 transition hover:bg-red-500/20 hover:text-red-300"
                    aria-label={t("remove")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Total</span>
              <span className="text-xl font-bold text-white">
                {total.toFixed(2)}€
              </span>
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleCheckout}
              disabled={creating}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-50"
            >
              {creating ? (
                t("processing")
              ) : (
                <>
                  {t("buy")} <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={clear}
              className="w-full rounded-xl border border-white/15 px-4 py-2.5 text-xs text-white/60 transition hover:bg-white/5 hover:text-white"
            >
              {t("clearCart")}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

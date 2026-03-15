// src/app/[locale]/verify-pending/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase/client";
import {
  onAuthStateChanged,
  sendEmailVerification,
  type User,
} from "firebase/auth";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getMailProvider } from "@/lib/utils/mailProvider";
import {
  Mail,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import logotipo from "../../../../public/brand/logo-sem-fundo-sem-nome.png";

const RESEND_COOLDOWN = 60; // seconds

export default function VerifyPendingPage() {
  const t = useTranslations("verifyPending");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFromQuery = searchParams?.get("email") ?? "";

  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [notVerifiedHint, setNotVerifiedHint] = useState(false);

  const email = user?.email || emailFromQuery;
  const provider = email ? getMailProvider(email) : null;

  // Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.emailVerified) {
        setVerified(true);
      }
    });
    return () => unsub();
  }, []);

  // Redirect after verified
  useEffect(() => {
    if (verified) {
      const timer = setTimeout(() => {
        router.replace(`/${locale}/dashboard`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [verified, router, locale]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Resend verification email
  const handleResend = useCallback(async () => {
    if (!user || cooldown > 0) return;
    setResending(true);
    setResendMsg(null);
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/${locale}/login/action`,
        handleCodeInApp: false,
      });
      setResendMsg({ type: "success", text: t("resendSuccess") });
      setCooldown(RESEND_COOLDOWN);
    } catch (err: any) {
      console.error("[verify-pending] resend failed:", err);
      const code = err?.code || "";
      if (code === "auth/too-many-requests") {
        setResendMsg({ type: "error", text: t("tooManyRequests") });
      } else if (code === "auth/network-request-failed") {
        setResendMsg({ type: "error", text: t("networkError") });
      } else {
        setResendMsg({ type: "error", text: t("resendFailed") });
      }
    } finally {
      setResending(false);
    }
  }, [user, cooldown, locale, t]);

  // "I've already verified" handler
  const handleCheckVerified = useCallback(async () => {
    if (!user) return;
    setChecking(true);
    setNotVerifiedHint(false);
    try {
      await user.reload();
      const refreshed = auth.currentUser;
      if (refreshed?.emailVerified) {
        setVerified(true);
      } else {
        setNotVerifiedHint(true);
      }
    } catch {
      setNotVerifiedHint(true);
    } finally {
      setChecking(false);
    }
  }, [user]);

  // ===== Render =====

  if (verified) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-5 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">
              {t("verified")}
            </h2>
            <p className="text-sm text-white/50">{t("redirecting")}</p>
          </div>
          <Loader2 size={20} className="animate-spin text-white/40" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col items-center gap-6 py-4 text-center">
        {/* Icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
          <Mail size={32} className="text-blue-400" />
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">{t("title")}</h2>
          {email ? (
            <p className="text-sm leading-relaxed text-white/60">
              {t.rich("subtitle", {
                email,
                strong: (chunks) => (
                  <strong className="font-semibold text-white/80">
                    {chunks}
                  </strong>
                ),
              })}
            </p>
          ) : null}
          <p className="text-xs text-white/40">{t("checkSpam")}</p>
        </div>

        {/* Open webmail button */}
        {provider && (
          <a
            href={provider.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary w-full gap-2"
          >
            <ExternalLink size={16} />
            {t("openWebmail", { provider: provider.name })}
          </a>
        )}

        {/* Resend button */}
        <button
          type="button"
          className="btn btn-outline btn-sm w-full gap-2 text-white/60"
          disabled={resending || cooldown > 0 || !user}
          onClick={handleResend}
        >
          <RefreshCw size={14} className={resending ? "animate-spin" : ""} />
          {resending
            ? t("resending")
            : cooldown > 0
              ? t("resendCooldown", { seconds: cooldown })
              : t("resendEmail")}
        </button>

        {/* Resend feedback */}
        {resendMsg && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${
              resendMsg.type === "success"
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {resendMsg.text}
          </p>
        )}

        {/* Already verified check */}
        <button
          type="button"
          className="btn btn-ghost btn-sm w-full gap-2 text-white/50"
          disabled={checking || !user}
          onClick={handleCheckVerified}
        >
          {checking ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {t("checking")}
            </>
          ) : (
            t("alreadyVerified")
          )}
        </button>

        {/* Not verified hint */}
        {notVerifiedHint && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-left">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-400">{t("notVerifiedYet")}</p>
          </div>
        )}

        {/* Divider + back to login */}
        <div className="w-full border-t border-white/10 pt-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 transition hover:text-white/70"
          >
            ← {t("backToLogin")}
          </Link>
        </div>
      </div>
    </Shell>
  );
}

// ===== Layout shell (same as login page) =====
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#030303] px-4">
      <div className="absolute inset-0">
        <img
          src="/images/bryanminear.png"
          alt=""
          className="h-full w-full object-cover opacity-40"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/40" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Image
            src={logotipo}
            alt="Momentos"
            width={64}
            height={64}
            className="mx-auto opacity-90"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Momentos
          </h1>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

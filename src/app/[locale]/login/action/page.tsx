// src/app/[locale]/login/action/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/firebase/client";
import {
  applyActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import logotipo from "../../../../../public/brand/logo-sem-fundo-sem-nome.png";

type PageState = "loading" | "form" | "success" | "error";

export default function AuthActionPage() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("authAction");

  const mode = searchParams?.get("mode") ?? "";
  const oobCode = searchParams?.get("oobCode") ?? "";

  // ---------- Shared ----------
  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // ---------- Reset Password ----------
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");

  // ========== Verify the oobCode on mount ==========
  useEffect(() => {
    if (!oobCode) {
      setErrorMsg(t("invalidCode"));
      setPageState("error");
      return;
    }

    if (mode === "resetPassword") {
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => {
          setVerifiedEmail(email);
          setPageState("form");
        })
        .catch((err) => {
          const code = err?.code || "";
          if (code === "auth/expired-action-code") {
            setErrorMsg(t("expiredCode"));
          } else {
            setErrorMsg(t("invalidCode"));
          }
          setPageState("error");
        });
    } else if (mode === "verifyEmail") {
      applyActionCode(auth, oobCode)
        .then(() => {
          setPageState("success");
        })
        .catch((err) => {
          const code = err?.code || "";
          if (code === "auth/expired-action-code") {
            setErrorMsg(t("expiredCode"));
          } else if (code === "auth/invalid-action-code") {
            setErrorMsg(t("invalidCode"));
          } else {
            setErrorMsg(t("verifyEmailFailed"));
          }
          setPageState("error");
        });
    } else {
      setErrorMsg(t("invalidModeHint"));
      setPageState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, oobCode]);

  // ========== Reset Password handler ==========
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setErrorMsg(t("passwordsDontMatch"));
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg(t("weakPassword"));
      return;
    }

    setResetting(true);
    setErrorMsg("");

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setPageState("success");
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/weak-password") {
        setErrorMsg(t("weakPassword"));
      } else if (
        code === "auth/expired-action-code" ||
        code === "auth/invalid-action-code"
      ) {
        setErrorMsg(t("expiredCode"));
        setPageState("error");
      } else {
        setErrorMsg(t("resetFailed"));
      }
    } finally {
      setResetting(false);
    }
  }

  // ========================================
  // Render helpers
  // ========================================

  function renderLoading() {
    const label =
      mode === "verifyEmail" ? t("verifyEmailLoading") : t("loading");
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <Loader2 size={32} className="animate-spin text-white/60" />
        <p className="text-sm text-white/50">{label}</p>
      </div>
    );
  }

  function renderError() {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {mode === "verifyEmail"
              ? t("verifyEmailTitle")
              : mode === "resetPassword"
                ? t("resetPasswordTitle")
                : t("invalidMode")}
          </h2>
          <p className="text-sm leading-relaxed text-red-400">{errorMsg}</p>
        </div>
        <div className="flex flex-col gap-2 w-full">
          {mode === "resetPassword" && (
            <Link href="/login" className="btn btn-primary w-full">
              {t("requestNewLink")}
            </Link>
          )}
          <Link href="/login" className="btn btn-ghost btn-sm text-white/60">
            {t("goToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  function renderResetForm() {
    return (
      <div className="flex flex-col gap-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t("resetPasswordTitle")}
          </h2>
          <p className="text-sm text-white/50">{t("resetPasswordSubtitle")}</p>
          {verifiedEmail && (
            <p className="text-xs text-white/30">{verifiedEmail}</p>
          )}
        </div>

        <form className="space-y-4" onSubmit={handleResetPassword}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/70">
              {t("newPasswordLabel")}
            </span>
            <div className="relative">
              <input
                className="input input-bordered w-full bg-white/5 text-white pr-12 placeholder:text-white/30"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-2 z-10 flex h-full items-center justify-center rounded-full px-2 text-white/50 hover:text-white transition cursor-pointer"
                aria-label={
                  showPassword ? t("hidePassword") : t("showPassword")
                }
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/70">
              {t("confirmPasswordLabel")}
            </span>
            <div className="relative">
              <input
                className="input input-bordered w-full bg-white/5 text-white pr-12 placeholder:text-white/30"
                type={showConfirm ? "text" : "password"}
                placeholder={t("confirmPasswordPlaceholder")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-2 z-10 flex h-full items-center justify-center rounded-full px-2 text-white/50 hover:text-white transition cursor-pointer"
                aria-label={showConfirm ? t("hideConfirm") : t("showConfirm")}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {errorMsg && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={resetting}
          >
            {resetting ? t("resetting") : t("resetButton")}
          </button>
        </form>
      </div>
    );
  }

  function renderSuccess() {
    if (mode === "verifyEmail") {
      return (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">
              {t("verifyEmailSuccess")}
            </h2>
            <p className="text-sm text-white/50">
              {t("verifyEmailSuccessHint")}
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-primary w-full">
            {t("goToDashboard")}
          </Link>
        </div>
      );
    }

    // resetPassword success
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle size={28} className="text-green-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t("resetSuccess")}
          </h2>
          <p className="text-sm text-white/50">{t("resetSuccessHint")}</p>
        </div>
        <Link href="/login" className="btn btn-primary w-full">
          {t("goToLogin")}
        </Link>
      </div>
    );
  }

  // ========================================
  // Main render
  // ========================================

  function renderContent() {
    switch (pageState) {
      case "loading":
        return renderLoading();
      case "error":
        return renderError();
      case "form":
        return renderResetForm();
      case "success":
        return renderSuccess();
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#030303] px-4">
      {/* Background photo */}
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
        {/* Brand header */}
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

        {/* Content card */}
        <div className="rounded-3xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl">
          {renderContent()}
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-white/40 transition hover:text-white/70"
          >
            ← {t("goToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}

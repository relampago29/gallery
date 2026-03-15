"use client";

import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase/client";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  clearAuthExpiry,
  getAuthExpiry,
  isAuthExpired,
  setAuthExpiry,
} from "@/lib/firebase/sessionExpiry";
import { ArrowLeft, Eye, EyeOff, Mail } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

type Props = {
  callbackUrl?: string;
};

type Mode = "login" | "signup";

export default function EmailPasswordForm({ callbackUrl }: Props) {
  const router = useRouter();
  const t = useTranslations("auth");

  const [firebaseEmail, setFirebaseEmail] = useState("");
  const [firebasePassword, setFirebasePassword] = useState("");
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const locale = useLocale();

  const targetUrl = useMemo(() => {
    return callbackUrl && callbackUrl.length > 0 ? callbackUrl : "/";
  }, [callbackUrl]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const expiry = getAuthExpiry();
        if (!expiry) {
          setAuthExpiry();
        } else if (isAuthExpired()) {
          await firebaseSignOut(auth).catch(() => {});
          clearAuthExpiry();
          setFirebaseUser(null);
          return;
        } else {
          // keep existing expiry
        }
      } else {
        clearAuthExpiry();
      }
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  async function onSignOut(e: React.FormEvent) {
    e.preventDefault();
    setSignOutLoading(true);
    setFirebaseError(null);
    try {
      await firebaseSignOut(auth);
      clearAuthExpiry();
      router.replace("/");
      router.refresh();
    } catch (err: any) {
      setFirebaseError(err?.message ?? t("signOutError"));
    } finally {
      setSignOutLoading(false);
    }
  }

  async function onFirebaseSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseEmail.trim() || !firebasePassword.trim()) {
      setFirebaseError(t("emailPasswordRequired"));
      return;
    }
    setFirebaseLoading(true);
    setFirebaseError(null);
    try {
      await signInWithEmailAndPassword(
        auth,
        firebaseEmail.trim(),
        firebasePassword,
      );
      setAuthExpiry();
      router.replace(targetUrl);
    } catch (err: any) {
      const code = err?.code || "";
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found"
      ) {
        setFirebaseError(t("invalidCredentials"));
      } else {
        setFirebaseError(err?.message ?? t("loginFailed"));
      }
    } finally {
      setFirebaseLoading(false);
    }
  }

  async function onFirebaseSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!firebaseEmail.trim() || !firebasePassword.trim() || !username.trim()) {
      setFirebaseError(t("allFieldsRequired"));
      return;
    }
    if (firebasePassword !== confirmPassword) {
      setFirebaseError(t("passwordsDontMatch"));
      return;
    }
    setFirebaseLoading(true);
    setFirebaseError(null);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        firebaseEmail.trim(),
        firebasePassword,
      );
      if (username.trim()) {
        await updateProfile(credential.user, { displayName: username.trim() });
      }
      setAuthExpiry();
      router.replace(targetUrl);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/email-already-in-use") {
        setFirebaseError(t("emailAlreadyInUse"));
      } else if (code === "auth/weak-password") {
        setFirebaseError(t("weakPassword"));
      } else {
        setFirebaseError(err?.message ?? t("signupFailed"));
      }
    } finally {
      setFirebaseLoading(false);
    }
  }

  async function onForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError(t("emailPasswordRequired"));
      return;
    }
    setForgotLoading(true);
    setForgotError(null);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/${locale}/login/action`,
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(
        auth,
        forgotEmail.trim(),
        actionCodeSettings,
      );
      setForgotSuccess(true);
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found") {
        setForgotError(t("userNotFound"));
      } else if (code === "auth/too-many-requests") {
        setForgotError(t("tooManyRequests"));
      } else {
        setForgotError(err?.message ?? t("resetEmailFailed"));
      }
    } finally {
      setForgotLoading(false);
    }
  }

  const sessionLabel = useMemo(() => {
    if (!firebaseUser) return null;
    return firebaseUser.email || firebaseUser.uid;
  }, [firebaseUser]);

  return (
    <div className="flex flex-col gap-5">
      {/* Login / Signup toggle */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-1">
        <div className="grid grid-cols-2 gap-1">
          <button
            type="button"
            className={`rounded-lg px-4 py-2.5 text-center text-sm font-medium transition cursor-pointer ${
              mode === "login"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
            onClick={() => {
              setMode("login");
              setFirebasePassword("");
              setConfirmPassword("");
              setFirebaseEmail("");
              setUsername("");
              setFirebaseError(null);
            }}
            disabled={mode === "login"}
          >
            {t("loginTab")}
          </button>
          <button
            type="button"
            className={`rounded-lg px-4 py-2.5 text-center text-sm font-medium transition cursor-pointer ${
              mode === "signup"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
            onClick={() => {
              setMode("signup");
              setFirebasePassword("");
              setConfirmPassword("");
              setFirebaseEmail("");
              setUsername("");
              setFirebaseError(null);
            }}
            disabled={mode === "signup"}
          >
            {t("signupTab")}
          </button>
        </div>
      </div>

      {/* Form fields */}
      <form
        className="space-y-4"
        onSubmit={mode === "login" ? onFirebaseSignIn : onFirebaseSignUp}
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-white/70">
            {t("emailLabel")}
          </span>
          <input
            className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
            type="email"
            placeholder="email@exemplo.com"
            value={firebaseEmail}
            onChange={(e) => setFirebaseEmail(e.target.value)}
            autoComplete={mode === "login" ? "email" : "new-email"}
          />
        </label>

        {mode === "signup" && (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-white/70">
              {t("usernameLabel")}
            </span>
            <input
              className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
              type="text"
              placeholder="Ex.: ana.silva"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-white/70">
            {t("passwordLabel")}
          </span>
          <div className="relative">
            <input
              className="input input-bordered w-full bg-white/5 text-white pr-12 placeholder:text-white/30"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={firebasePassword}
              onChange={(e) => setFirebasePassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 z-10 flex h-full items-center justify-center rounded-full px-2 text-white/50 hover:text-white transition cursor-pointer"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>

        {mode === "signup" && (
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
                aria-pressed={showConfirm}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
        )}

        {mode === "login" && (
          <button
            type="button"
            className="-mt-1 self-end text-xs text-white/40 transition hover:text-white/70 cursor-pointer"
            onClick={() => {
              setShowForgot(true);
              setForgotEmail(firebaseEmail);
              setForgotError(null);
              setForgotSuccess(false);
            }}
          >
            {t("forgotPassword")}
          </button>
        )}

        {firebaseError && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {firebaseError}
          </p>
        )}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={firebaseLoading}
        >
          {firebaseLoading
            ? t("processing")
            : mode === "login"
              ? t("loginTab")
              : t("signupTab")}
        </button>

        {firebaseUser && (
          <button
            type="button"
            className="btn btn-outline btn-sm w-full text-white/60"
            onClick={onSignOut}
            disabled={firebaseLoading || signOutLoading}
          >
            {signOutLoading
              ? t("signingOut")
              : t("signOut", { label: sessionLabel ?? "" })}
          </button>
        )}
      </form>

      {/* Forgot password overlay */}
      {showForgot && (
        <div className="absolute inset-0 z-20 flex flex-col gap-5 rounded-3xl border border-white/10 bg-black/95 p-6 backdrop-blur-xl">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 self-start text-sm text-white/40 transition hover:text-white/70 cursor-pointer"
            onClick={() => {
              setShowForgot(false);
              setForgotError(null);
              setForgotSuccess(false);
            }}
          >
            <ArrowLeft size={14} />
            {t("backToLogin")}
          </button>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-white">
              {t("forgotPasswordTitle")}
            </h2>
            <p className="text-sm text-white/50">
              {t("forgotPasswordSubtitle")}
            </p>
          </div>

          {forgotSuccess ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <Mail size={24} className="text-green-400" />
              </div>
              <p className="text-sm leading-relaxed text-green-400">
                {t("resetEmailSent")}
              </p>
              <button
                type="button"
                className="btn btn-sm btn-ghost text-white/60"
                onClick={() => {
                  setShowForgot(false);
                  setForgotSuccess(false);
                }}
              >
                {t("backToLogin")}
              </button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onForgotPassword}>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-white/70">
                  {t("emailLabel")}
                </span>
                <input
                  className="input input-bordered w-full bg-white/5 text-white placeholder:text-white/30"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
              </label>

              {forgotError && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  {forgotError}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={forgotLoading}
              >
                {forgotLoading ? t("sending") : t("sendResetLink")}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

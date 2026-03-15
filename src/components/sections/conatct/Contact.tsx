// src/components/sections/conatct/Contact.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, CheckCircle, AlertCircle } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";

const Contact = () => {
  const t = useTranslations("contactHomePage");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [accessKey, setAccessKey] = useState<string | null>(null);

  // Fetch the admin-configured StaticForms accessKey
  useEffect(() => {
    fetch("/api/settings/contact-email")
      .then((r) => r.json())
      .then((d) => {
        if (d?.accessKey) setAccessKey(d.accessKey);
      })
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const fd = new FormData(form);

    // Honeypot check (client-side early exit)
    if ((fd.get("honeypot") as string)?.trim()) {
      setState("success");
      form.reset();
      return;
    }

    if (!accessKey) {
      setErrorMsg(t("errorGeneric"));
      setState("error");
      return;
    }

    const fullName =
      `${(fd.get("firstName") as string)?.trim() || ""} ${(fd.get("lastName") as string)?.trim() || ""}`.trim();

    try {
      const res = await fetch("https://api.staticforms.xyz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessKey,
          name: fullName,
          email: (fd.get("email") as string)?.trim() || "",
          subject: (fd.get("subject") as string)?.trim() || "",
          message: (fd.get("message") as string)?.trim() || "",
          replyTo: "@",
          honeypot: "",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || t("errorGeneric"));
      }

      setState("success");
      form.reset();
    } catch (err: any) {
      setErrorMsg(err.message || t("errorGeneric"));
      setState("error");
    }
  }

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:border-white/30 focus:bg-white/[0.05]";

  return (
    <section
      id="contact"
      className="relative w-full overflow-hidden bg-[#030303]"
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(255,255,255,0.04),_transparent_60%)]" />
        <div className="absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-[#7c3aed0d] blur-3xl" />
        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-[#f472b60d] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center space-y-3">
          <span className="inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wider text-white/70 uppercase backdrop-blur-sm">
            {t("badge")}
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-sm text-white/50">{t("subtitle")}</p>
        </div>

        {/* Form card */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_25px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-10">
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Honeypot — invisible to real users, catches bots */}
            <div
              className="absolute -left-[9999px] opacity-0 h-0 w-0 overflow-hidden"
              aria-hidden="true"
            >
              <label htmlFor="honeypot">Do not fill this</label>
              <input
                type="text"
                id="honeypot"
                name="honeypot"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* First name */}
              <div className="space-y-1.5">
                <label className="block pl-1 text-xs font-medium text-white/60">
                  {t("firstNameLabel")}
                </label>
                <input
                  name="firstName"
                  type="text"
                  placeholder={t("firstNamePlaceholder")}
                  required
                  className={inputClass}
                />
              </div>

              {/* Last name */}
              <div className="space-y-1.5">
                <label className="block pl-1 text-xs font-medium text-white/60">
                  {t("lastNameLabel")}
                </label>
                <input
                  name="lastName"
                  type="text"
                  placeholder={t("lastNamePlaceholder")}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block pl-1 text-xs font-medium text-white/60">
                {t("emailLabel")}
              </label>
              <input
                name="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                inputMode="email"
                autoComplete="email"
                required
                className={inputClass}
              />
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="block pl-1 text-xs font-medium text-white/60">
                {t("subjectLabel")}
              </label>
              <input
                name="subject"
                type="text"
                placeholder={t("subjectPlaceholder")}
                required
                className={inputClass}
              />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <label className="block pl-1 text-xs font-medium text-white/60">
                {t("messageLabel")}
              </label>
              <textarea
                name="message"
                minLength={10}
                required
                placeholder={t("messagePlaceholder")}
                className={`${inputClass} h-36 resize-none`}
              />
              <p className="pl-1 text-[11px] text-white/30">
                {t("messageHelp")}
              </p>
            </div>

            {/* Consent + submit */}
            <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-white"
                />
                <span className="text-xs leading-snug text-white/50">
                  {t("consentText")}
                </span>
              </label>

              <button
                type="submit"
                disabled={state === "submitting"}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-white/90 disabled:opacity-50 shrink-0"
              >
                {state === "submitting" ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-gray-900" />
                    {t("submitting")}
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    {t("submit")}
                  </>
                )}
              </button>
            </div>

            {/* Feedback */}
            {state === "success" && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-200">
                <CheckCircle size={18} className="shrink-0" />
                {t("successMessage")}
              </div>
            )}
            {state === "error" && (
              <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
                <AlertCircle size={18} className="shrink-0" />
                {errorMsg}
              </div>
            )}
          </form>
        </div>

        {/* Footer help */}
        <p className="mt-6 text-center text-xs text-white/40">
          {t("footerHelp")}{" "}
          <span className="font-medium text-white/60">
            hello@momentos.studio
          </span>
        </p>
      </div>
    </section>
  );
};

export default Contact;

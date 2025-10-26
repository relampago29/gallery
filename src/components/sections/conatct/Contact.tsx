// src/components/sections/Contact.tsx
"use client";

import React, { useState } from "react";
import { useTranslations } from "use-intl";

type FormState = "idle" | "submitting" | "success" | "error";

const Contact = () => {
  const t = useTranslations("contactHomePage"); // <— todas as cópias daqui
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const labelPad = "pl-4";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);

    // honeypot
    if ((data.get("company") as string)?.trim()) {
      setState("success");
      form.reset();
      return;
    }

    try {
      const res = await fetch("/api/contact", { method: "POST", body: data });
      if (!res.ok) throw new Error(t("errorGeneric"));
      setState("success");
      form.reset();
    } catch (err: any) {
      setErrorMsg(err.message || t("errorGeneric"));
      setState("error");
    }
  }

  return (
    <section className="w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="text-center mb-8 space-y-2">
          <div className="badge badge-primary badge-lg">{t("badge")}</div>
          {/* title com emoji vindo da tradução */}
          <h2 className="text-4xl font-bold tracking-tight">
            {t("title")}
          </h2>
          <p className="opacity-80">{t("subtitle")}</p>
        </div>

        <div className="rounded-2xl border border-base-300/60 bg-base-100/60 backdrop-blur-xl shadow-2xl">
          <form onSubmit={onSubmit} className="p-6 md:p-10">
            {/* honeypot */}
            <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <label className="form-control">
                <span className={`label-text mb-1 flex items-center gap-2 ${labelPad}`}>{t("firstNameLabel")}</span>
                <input
                  name="firstName"
                  type="text"
                  placeholder={t("firstNamePlaceholder")}
                  required
                  className="input input-bordered w-full"
                />
              </label>

              {/* Apelido */}
              <label className="form-control">
                <span className={`label-text mb-1 ${labelPad}`}>{t("lastNameLabel")}</span>
                <input
                  name="lastName"
                  type="text"
                  placeholder={t("lastNamePlaceholder")}
                  required
                  className="input input-bordered w-full"
                />
              </label>

              {/* Email */}
              <label className="form-control md:col-span-2">
                <span className={`label-text mb-1 flex items-center gap-2 ${labelPad}`}>{t("emailLabel")}</span>
                <input
                  name="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  inputMode="email"
                  autoComplete="email"
                  required
                  className="input input-bordered w-full"
                />
              </label>

              {/* Assunto */}
              <label className="form-control md:col-span-2">
                <span className={`label-text mb-1 ${labelPad}`}>{t("subjectLabel")}</span>
                <input
                  name="subject"
                  type="text"
                  placeholder={t("subjectPlaceholder")}
                  required
                  className="input input-bordered w-full"
                />
              </label>

              {/* Mensagem */}
              <div className="md:col-span-2">
                <label className="form-control">
                  <span className={`label-text mb-1 ${labelPad}`}>{t("messageLabel")}</span>
                  <textarea
                    name="message"
                    minLength={10}
                    required
                    placeholder={t("messagePlaceholder")}
                    className="textarea textarea-bordered h-44 w-full"
                  />
                </label>
                <div className={`mt-1 text-xs opacity-70 ${labelPad}`}>{t("messageHelp")}</div>
              </div>
            </div>

            {/* consent + ação */}
            <div className="mt-6 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
              <label className={`flex items-center gap-3 cursor-pointer ${labelPad}`}>
                <input type="checkbox" className="checkbox checkbox-primary" required />
                <span className="text-sm opacity-80 leading-snug">
                  {t("consentText")}
                </span>
              </label>

              <button className="btn btn-primary" type="submit" disabled={state === "submitting"}>
                {state === "submitting" ? (
                  <>
                    <span className="loading loading-spinner" />
                    {t("submitting")}
                  </>
                ) : (
                  t("submit")
                )}
              </button>
            </div>

            {/* feedback */}
            <div className="mt-4">
              {state === "success" && (
                <div className="alert alert-success">
                  <span>{t("successMessage")}</span>
                </div>
              )}
              {state === "error" && (
                <div className="alert alert-error">
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-sm opacity-70">
          {t("footerHelp")} <span className="font-medium">hello@momentos.studio</span>.
        </div>
      </div>
    </section>
  );
};

export default Contact;

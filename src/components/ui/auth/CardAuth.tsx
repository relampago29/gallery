"use client";
import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import EmailPasswordForm from "./EmailPasswordForm";

type Props = {
  defaultCallbackUrl?: string;
};

const CardAuth = ({ defaultCallbackUrl }: Props) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("navbar");

  const queryCallback = React.useMemo(() => searchParams?.get("callbackUrl"), [searchParams]);
  const normalizedCallback =
    queryCallback ||
    defaultCallbackUrl ||
    (pathname?.startsWith(`/${locale}`) ? `/${locale}/admin` : "/");

  return (
    <div className="rounded-[32px] border border-white/10 bg-[#040404]/95 p-4 shadow-2xl lg:p-8">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-white/5 via-white/0 to-white/5">
        <div className="absolute inset-0">
          <img
            src="/images/bryanminear.png"
            alt="Momentos guardados"
            className="h-full w-full object-cover opacity-70"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/60 to-black/75" />
        </div>

        <div className="relative grid gap-8 p-6 lg:grid-cols-[1fr_420px] lg:p-10">
          <div className="flex flex-col justify-between gap-6 rounded-3xl border border-white/10 bg-white/5/80 p-6 text-white backdrop-blur">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.5em] text-white/70">Momentos</p>
              <h2 className="text-3xl font-semibold leading-tight">Entrar ou criar conta.</h2>
              <p className="text-sm text-white/75">
                Usa email e password. Sessão curta no browser; termina automaticamente após expirar.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
              <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.3em] text-white/60">Clientes</div>
                <div className="mt-1 font-semibold">Área do cliente</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.3em] text-white/60">Admins</div>
                <div className="mt-1 font-semibold">Acesso com claim</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.3em] text-white/60">Segurança</div>
                <div className="mt-1 font-semibold">Firebase Auth</div>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                <div className="text-xs uppercase tracking-[0.3em] text-white/60">Sessão</div>
                <div className="mt-1 font-semibold">Expiração curta</div>
              </div>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/85">
              {t("portfolio")}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/80 p-6 lg:p-7 shadow-lg backdrop-blur">
            <EmailPasswordForm callbackUrl={normalizedCallback} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardAuth;

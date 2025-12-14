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
    <div className="grid gap-8 rounded-[32px] border border-white/10 bg-black/40 p-6 shadow-2xl lg:grid-cols-2 lg:p-10">
      <div className="rounded-3xl bg-gradient-to-br from-white/20 via-white/5 to-transparent p-6 text-white lg:p-8">
        <p className="text-xs uppercase tracking-[0.5em] text-white/70">Bem-vindo</p>
        <h2 className="mt-4 text-3xl font-semibold leading-tight">
          Aceder ao backoffice nunca foi tão simples.
        </h2>
        <p className="mt-3 text-sm text-white/70">
          Autentica-te com o teu email. Todo o processo é seguro, integrado com o Firebase e com o backoffice.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-white/65">
          <li>• Sessão sincronizada com o painel.</li>
          <li>• Acesso apenas por email e password.</li>
          <li>• Criação de novas contas sob gestão de administradores.</li>
          <li>• Depois de entrares, regressas automaticamente ao admin.</li>
        </ul>
        <div className="mt-6 rounded-2xl border border-white/20 bg-black/20 px-4 py-3 text-xs uppercase tracking-[0.3em] text-white/70">
          {t("portfolio")}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-black/80 p-6 lg:p-8">
        <EmailPasswordForm callbackUrl={normalizedCallback} />
      </div>
    </div>
  );
};

export default CardAuth;

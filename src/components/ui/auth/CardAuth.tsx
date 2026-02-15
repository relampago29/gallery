"use client";
import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import EmailPasswordForm from "./EmailPasswordForm";
import Image from "next/image";
import logotipo from "../../../../public/brand/logo-sem-fundo-sem-nome.png";

type Props = {
  defaultCallbackUrl?: string;
};

const CardAuth = ({ defaultCallbackUrl }: Props) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("auth");

  const queryCallback = React.useMemo(
    () => searchParams?.get("callbackUrl"),
    [searchParams]
  );
  const normalizedCallback =
    queryCallback ||
    defaultCallbackUrl ||
    (pathname?.startsWith(`/${locale}`) ? `/${locale}/admin` : "/");

  return (
    <div className="space-y-6">
      {/* Brand header */}
      <div className="text-center space-y-3">
        <Image
          src={logotipo}
          alt="Momentos"
          width={64}
          height={64}
          className="mx-auto opacity-90"
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {t("brand")}
          </h1>
          <p className="mt-1 text-sm text-white/50">{t("welcome")}</p>
        </div>
      </div>

      {/* Auth form card */}
      <div className="rounded-3xl border border-white/10 bg-black/60 p-6 shadow-2xl backdrop-blur-xl">
        <EmailPasswordForm callbackUrl={normalizedCallback} />
      </div>

      {/* Back link */}
      <div className="text-center">
        <Link
          href={`/`}
          className="inline-flex items-center gap-1.5 text-sm text-white/40 transition hover:text-white/70"
        >
          ← {t("backToHome")}
        </Link>
      </div>
    </div>
  );
};

export default CardAuth;

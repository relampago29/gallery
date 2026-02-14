"use client";
import React from "react";
import { useLocale } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import EmailPasswordForm from "./EmailPasswordForm";
import { Camera } from "lucide-react";

type Props = {
  defaultCallbackUrl?: string;
};

const CardAuth = ({ defaultCallbackUrl }: Props) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const locale = useLocale();

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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
          <Camera className="h-7 w-7 text-white/90" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Momentos
          </h1>
          <p className="mt-1 text-sm text-white/50">Bem-vindo de volta</p>
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
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );
};

export default CardAuth;

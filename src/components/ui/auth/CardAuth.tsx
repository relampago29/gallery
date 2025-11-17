"use client";
import React from "react";
import EmailPasswordForm from "./EmailPasswordForm";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";

type Props = {
  defaultCallbackUrl?: string;
};

const CardAuth = ({ defaultCallbackUrl }: Props) => {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const queryCallback = searchParams?.get("callbackUrl") || "";
  const fallbackCallback = defaultCallbackUrl || `/${locale}/admin/public/list`;
  const callbackUrl = normalizeCallbackUrl(queryCallback, fallbackCallback);

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="card-title">Login</h2>
        <p className="text-sm text-gray-500">Utiliza a tua conta Google para continuar.</p>
      </div>
      <div className="px-6 pb-6">
        <EmailPasswordForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
};

export default CardAuth;

function normalizeCallbackUrl(candidate: string | null, fallback: string) {
  if (!candidate) return fallback;

  try {
    const decoded = decodeURIComponent(candidate);
    return decoded.startsWith("/") ? decoded : fallback;
  } catch {
    return fallback;
  }
}

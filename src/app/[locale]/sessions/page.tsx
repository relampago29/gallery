"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

export default function SessionsRedirectPage() {
  const locale = useLocale();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${locale}/dashboard?tab=sessions`);
  }, [locale, router]);
  return null;
}

"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Suspense } from "react";

/**
 * This route is kept for backward compatibility with any existing links.
 * It redirects to the unified order page: /sessions/orders/[orderId]?token=...
 */
function DownloadRedirectContent() {
  const locale = useLocale();
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const orderId = params?.orderId || "";
    const token = searchParams.get("token") || "";
    router.replace(
      `/${locale}/sessions/orders/${orderId}${token ? `?token=${token}` : ""}`,
    );
  }, [locale, params, router, searchParams]);

  return null;
}

export default function DownloadRedirectPage() {
  return (
    <Suspense>
      <DownloadRedirectContent />
    </Suspense>
  );
}

import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

type SearchParams = {
  callbackUrl?: string;
};

export default async function GlobalLoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearch = await searchParams;
  const callbackUrl = resolvedSearch?.callbackUrl;
  const locales = routing.locales;
  let locale = routing.defaultLocale;

  if (callbackUrl) {
    try {
      const url = new URL(callbackUrl, "http://localhost");
      const possibleLocale = url.pathname.split("/")[1];
      if (locales.includes(possibleLocale as (typeof locales)[number])) {
        locale = possibleLocale as (typeof locales)[number];
      }
    } catch {
      const possibleLocale = callbackUrl.split("/")[1];
      if (locales.includes(possibleLocale as (typeof locales)[number])) {
        locale = possibleLocale as (typeof locales)[number];
      }
    }
  }

  const qs = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "";
  redirect(`/${locale}/login${qs}`);
}

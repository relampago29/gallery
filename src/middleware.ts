// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default withAuth(
  function middleware(req) {
    const intlResponse = intlMiddleware(req);

    const pathname = req.nextUrl.pathname;
    const isAdminRoute = /^\/(pt|en)\/admin(\/|$)/.test(pathname);
    if (isAdminRoute && !req.nextauth.token) {
      const [, maybeLocale] = pathname.split("/");
      const localeMatch = routing.locales.includes(maybeLocale as (typeof routing.locales)[number])
        ? (maybeLocale as (typeof routing.locales)[number])
        : routing.defaultLocale;

      const loginUrl = new URL(`/${localeMatch}/login`, req.url);
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    return intlResponse;
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
);

export const config = {
  matcher: ["/", "/(pt|en)/:path*"],
};

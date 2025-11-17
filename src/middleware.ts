import { withAuth } from "next-auth/middleware";
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default withAuth(
  function middleware(req: NextRequest) {
    return intlMiddleware(req);
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ req, token }) => {
        const pathname = req.nextUrl.pathname;
        const isAdminPath = /^\/(pt|en)\/admin(\/|$)/.test(pathname);
        if (!isAdminPath) {
          return true;
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

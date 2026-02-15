// src/middleware.ts
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Match all paths except: API routes, Next.js internals, static files
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};

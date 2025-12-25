"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { getIdTokenResult, onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { LogIn } from "lucide-react";
import logotipo from "../../../../public/brand/logo-sem-fundo-sem-nome.png";
import { clearAuthExpiry, getAuthExpiry, isAuthExpired, remainingAuthMs, setAuthExpiry } from "@/lib/firebase/sessionExpiry";
import "../../../styles/shared/navbar/navbar.css";
import { useRef } from "react";

const NavBar: React.FC = () => {
  const translate = useTranslations("navbar");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionMs, setSessionMs] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setIsAdmin(false);
        setSessionMs(null);
        clearAuthExpiry();
        return;
      }

      const expiry = getAuthExpiry();
      if (!expiry) {
        setAuthExpiry();
      } else if (isAuthExpired()) {
        await firebaseSignOut(auth).catch(() => {});
        clearAuthExpiry();
        setUser(null);
        setIsAdmin(false);
        setSessionMs(null);
        return;
      } else {
        // keep existing expiry; no renew on every render
      }

      setUser(u);
      setSessionMs(remainingAuthMs());
      try {
        const token = await getIdTokenResult(u, true);
        const claims = token.claims || {};
        const adminClaim =
          claims.isAdmin === true ||
          (claims as any)?.claims?.isAdmin === true ||
          (claims as any)?.["https://hasura.io/jwt/claims"]?.["x-hasura-default-role"] === "admin";
        setIsAdmin(adminClaim);
      } catch {
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(async () => {
      const remaining = remainingAuthMs();
      setSessionMs(remaining);
      if (remaining !== null && remaining <= 0) {
        clearAuthExpiry();
        await firebaseSignOut(auth).catch(() => {});
        setUser(null);
        setIsAdmin(false);
        setSessionMs(null);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [user, router]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const hrefWithQs = useMemo(() => {
    const qs = searchParams?.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const loginHref = useMemo(() => {
    const qs = new URLSearchParams();
    const target = hrefWithQs || "/";
    qs.set("callbackUrl", target);
    return `/login?${qs.toString()}`;
  }, [hrefWithQs]);

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      clearAuthExpiry();
      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Falha ao terminar sessão", err);
    }
  };

  const sessionLabel = useMemo(() => {
    if (sessionMs === null) return null;
    const totalSec = Math.max(0, Math.floor(sessionMs / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [sessionMs]);

  const avatarLetter = useMemo(() => {
    if (user?.displayName) return user.displayName[0]?.toUpperCase() ?? "U";
    if (user?.email) return user.email[0]?.toUpperCase() ?? "U";
    return "U";
  }, [user]);

  return (
    <div className="navbar bg-base-100 text-white">
      <div className="navbar-start">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost px-2 lg:hidden" aria-label="Abrir menu">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          </div>
          <div className="dropdown-content left-0 mt-3 w-64 rounded-3xl border border-white/10 bg-[#0f0f0f] p-4 text-white shadow-2xl lg:hidden">
            <nav className="space-y-3 text-base">
              <Link
                href={pathname === "/portofolio" ? "/" : "/portofolio"}
                className="block rounded-2xl bg-white/5 px-4 py-3 font-medium transition hover:bg-white/10"
              >
                {pathname === "/portofolio" ? translate("home") : translate("portfolio")}
              </Link>
              <Link
                href="/sessions"
                className="block rounded-2xl bg-white/5 px-4 py-3 font-medium transition hover:bg-white/10"
              >
                {translate("viewSession")}
              </Link>
              {user && (
                <>
                  <Link
                    href="/dashboard"
                    className="block rounded-2xl bg-white/5 px-4 py-3 font-medium transition hover:bg-white/10"
                  >
                    {translate("customerArea")}
                  </Link>
                  <Link
                    href="/dashboard?tab=history"
                    className="block rounded-2xl bg-white/5 px-4 py-3 font-medium transition hover:bg-white/10"
                  >
                    {translate("history")}
                  </Link>
                </>
              )}
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-2xl bg-white px-4 py-3 text-left font-semibold text-gray-900 transition hover:bg-white/90"
                >
                  {translate("logout")}
                </button>
              ) : (
                <Link
                  href={loginHref}
                  className="w-full rounded-2xl bg-white px-4 py-3 text-left font-semibold text-gray-900 transition hover:bg-white/90"
                >
                  {translate("login") || "Login"}
                </Link>
              )}
            </nav>
          </div>
        </div>
        <img src={logotipo.src} alt="logo" className="w-10 h-8" />
        <a className="text-xl pl-2 pt-1">Momentos</a>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link className="text-base font-medium text-white" href={pathname === "/portofolio" ? "/" : "/portofolio"}>
              {pathname === "/portofolio" ? translate("home") : translate("portfolio")}
            </Link>
          </li>
          <li>
            <Link className="text-base font-medium text-white" href="/sessions">
              {translate("viewSession")}
            </Link>
          </li>
          {isAdmin && (
            <li>
              <Link className="text-base font-medium text-white" href="/admin">
                Admin
              </Link>
            </li>
          )}
        </ul>
      </div>

      <div className="navbar-end">
        {!user && (
          <>
            <Link href={loginHref} className="btn btn-ghost mr-2 text-sm hidden lg:inline-flex items-center gap-2">
              <LogIn size={16} />
              {translate("login") || "Login"}
            </Link>
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost">
                {locale.toUpperCase()}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content bg-base-100 text-white rounded-box z-10 mt-2 w-28 p-2 shadow"
              >
                <li>
                  <Link
                    href={hrefWithQs}
                    locale="pt"
                    className={`text-white ${locale === "pt" ? "active" : ""}`.trim()}
                    aria-current={locale === "pt" ? "page" : undefined}
                  >
                    PT
                  </Link>
                </li>
                <li>
                  <Link
                    href={hrefWithQs}
                    locale="en"
                    className={`text-white ${locale === "en" ? "active" : ""}`.trim()}
                    aria-current={locale === "en" ? "page" : undefined}
                  >
                    EN
                  </Link>
                </li>
              </ul>
            </div>
          </>
        )}

        {user && (
          <div
            className="relative"
            ref={menuRef}
            tabIndex={-1}
            onBlur={(e) => {
              if (!menuRef.current) return;
              if (!menuRef.current.contains(e.relatedTarget as Node)) {
                setMenuOpen(false);
              }
            }}
          >
            <button
              type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold uppercase text-white shadow-sm hover:border-white/40 transition"
            onClick={() => setMenuOpen((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setMenuOpen((v) => !v);
                }
              }}
              aria-expanded={menuOpen}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">{avatarLetter}</span>
              {sessionLabel && (
                <span className="absolute -right-2 -top-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-semibold text-black shadow">
                  {sessionLabel}
                </span>
              )}
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-3 w-72 rounded-3xl border border-white/10 bg-[#0b0b0b]/95 p-4 text-white shadow-2xl backdrop-blur z-50">
                <div className="mb-3">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">Conta</div>
                  <div className="mt-1 text-sm font-semibold">{user.displayName || user.email || "Utilizador"}</div>
                  <div className="text-xs text-white/60">{sessionLabel ? `Sessão: ${sessionLabel}` : null}</div>
                </div>
                <div className="space-y-2">
                  <Link href="/dashboard" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                    {translate("customerArea")}
                  </Link>
                  <Link href="/dashboard?tab=history" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                    {translate("history")}
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="block rounded-xl px-3 py-2 text-sm hover:bg-white/10" onClick={() => setMenuOpen(false)}>
                      Admin
                    </Link>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">Idioma</div>
                  <div className="flex gap-2">
                    <Link
                      href={hrefWithQs}
                      locale="pt"
                      className={`flex-1 rounded-full px-3 py-1 text-sm ${
                        locale === "pt" ? "bg-white text-gray-900" : "border border-white/25 text-white hover:bg-white/10"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      PT
                    </Link>
                    <Link
                      href={hrefWithQs}
                      locale="en"
                      className={`flex-1 rounded-full px-3 py-1 text-sm ${
                        locale === "en" ? "bg-white text-gray-900" : "border border-white/25 text-white hover:bg-white/10"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      EN
                    </Link>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  className="mt-4 w-full rounded-xl border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  {translate("logout")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NavBar;

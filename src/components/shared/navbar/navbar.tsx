"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut as firebaseSignOut, type User, getIdTokenResult } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { LogIn } from "lucide-react";
import logotipo from "../../../../public/brand/logo-sem-fundo-sem-nome.png";
import "../../../styles/shared/navbar/navbar.css";

const NavBar: React.FC = () => {
  const translate = useTranslations("navbar");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    getIdTokenResult(user)
      .then((token) => {
        if (!active) return;
        const claims = token.claims || {};
        const adminClaim =
          claims.isAdmin === true ||
          (claims as any)?.claims?.isAdmin === true ||
          (claims as any)?.["https://hasura.io/jwt/claims"]?.["x-hasura-default-role"] === "admin";
        setIsAdmin(adminClaim);
        setDisplayName(token.claims?.name || token.claims?.displayName || user.displayName || user.email || null);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const hrefWithQs = React.useMemo(() => {
    const qs = searchParams?.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const loginHref = React.useMemo(() => {
    const qs = new URLSearchParams();
    const target = hrefWithQs || "/";
    qs.set("callbackUrl", target);
    // Link (i18n) irá prefixar o locale automaticamente
    return `/login?${qs.toString()}`;
  }, [hrefWithQs]);

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      const target = locale ? `/${locale}/login` : "/login";
      router.replace(target);
      router.refresh();
    } catch (err) {
      console.error("Falha ao terminar sessão", err);
    }
  };

  return (
    <div className="navbar relative z-50 bg-base-100 text-white">
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h8m-8 6h16"
              />
            </svg>
          </div>
          <div className="dropdown-content left-0 mt-3 w-56 rounded-3xl border border-white/10 bg-[#0f0f0f] p-4 text-white shadow-2xl lg:hidden">
            <nav className="space-y-3 text-base ">
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
                <Link
                  href="/admin"
                  className="block rounded-2xl bg-white/5 px-4 py-3 font-medium transition hover:bg-white/10"
                >
                  Admin
                </Link>
              )}
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-2xl bg-white px-4 py-3 text-left font-semibold text-gray-900 transition hover:bg-white/90"
                >
                  {translate("logout")}
                </button>
              ) : null}
            </nav>
          </div>
        </div>
        <img src={logotipo.src} alt="logo" className="w-10 h-8"  />
        <a className="text-xl pl-2 pt-1" >Momentos</a>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">
            <li>
            <Link className="text-base font-medium text-white" href={pathname === "/portofolio" ? "/" : "/portofolio"}>
              {pathname === "/portofolio" ? translate("home") : translate("portfolio")}
            </Link>
            </li>
            <li>
              <Link className="text-base font-medium text-white" href="/sessions">{translate("viewSession")}</Link>
            </li>
          {/* <li>
            <a>{translate("about")}</a>
          </li>
          <li>
            <a>{translate("contact")}</a>
          </li> */}
          {user && (
            <li>
              {isAdmin ? <Link className="text-base font-medium text-white" href="/admin">Admin</Link> : null}
            </li>
          )}
        </ul>
      </div>

      {/* ===== Dropdown de Idiomas (END) ===== */}
      <div className="navbar-end relative">
        {!user && (
          <>
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost">
                {locale.toUpperCase()}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 ml-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content bg-base-100 text-white rounded-box z-50 mt-2 w-28 p-2 shadow"
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
            <Link
              href={loginHref}
              className="btn btn-ghost mr-2 text-sm hidden lg:inline-flex items-center gap-2"
            >
              <LogIn size={16} />
              {translate("login") || "Login"}
            </Link>
          </>
        )}
        {user ? (
          <div className="relative ml-3">
            <button
              type="button"
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="max-w-[140px] truncate">{displayName || user.email || "Utilizador"}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold">
                {(displayName || user.email || "?").charAt(0).toUpperCase()}
              </span>
            </button>
            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/10 bg-[#0b0b0b]/95 p-3 shadow-xl backdrop-blur">
                <div className="px-2 py-1 text-xs uppercase tracking-[0.2em] text-white/60">Conta</div>
                <Link
                  href={`/${locale}/dashboard`}
                  className="block rounded-xl px-3 py-2 text-sm text-white transition hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  Área do cliente
                </Link>
                <Link
                  href={`/${locale}/dashboard?tab=history`}
                  className="block rounded-xl px-3 py-2 text-sm text-white transition hover:bg-white/10"
                  onClick={() => setMenuOpen(false)}
                >
                  Histórico de compras
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="block rounded-xl px-3 py-2 text-sm text-white transition hover:bg-white/10"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                ) : null}
                <div className="mt-2 border-t border-white/10 pt-2">
                  <div className="px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-white/60">Idioma</div>
                  <div className="flex gap-2 px-2">
                    <Link
                      href={hrefWithQs}
                      locale="pt"
                      className={`rounded-full px-3 py-1 text-xs ${
                        locale === "pt" ? "bg-white text-gray-900" : "border border-white/30 text-white hover:bg-white/10"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      PT
                    </Link>
                    <Link
                      href={hrefWithQs}
                      locale="en"
                      className={`rounded-full px-3 py-1 text-xs ${
                        locale === "en" ? "bg-white text-gray-900" : "border border-white/30 text-white hover:bg-white/10"
                      }`}
                      onClick={() => setMenuOpen(false)}
                    >
                      EN
                    </Link>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl px-3 py-2 text-left text-sm text-white transition hover:bg-white/10"
                  onClick={handleLogout}
                >
                  Terminar sessão
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {/* ===================================== */}
    </div>
  );
};

export default NavBar;

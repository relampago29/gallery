"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from "firebase/auth";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { auth } from "@/lib/firebase/client";
import logotipo from "../../../../public/brand/logo-sem-fundo-sem-nome.png";
import "../../../styles/shared/navbar/navbar.css";

const NavBar: React.FC = () => {
  const translate = useTranslations("navbar");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const hrefWithQs = React.useMemo(() => {
    const qs = searchParams?.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
      await nextAuthSignOut({ callbackUrl: "/" });
      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Falha ao terminar sessão", err);
    }
  };

  return (
    <div className="navbar bg-base-100">
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
            <Link className="text-2xl" href={pathname === "/portofolio" ? "/" : "/portofolio"}>
              {pathname === "/portofolio" ? translate("home") : translate("portfolio")}
            </Link>
            </li>
            <li>
              <Link className="text-2xl" href="/sessions">{translate("viewSession")}</Link>
            </li>
          {/* <li>
            <a>{translate("about")}</a>
          </li>
          <li>
            <a>{translate("contact")}</a>
          </li> */}
          {user && (
            <li>
              <Link href="/admin">Admin</Link>
            </li>
          )}
        </ul>
      </div>

      {/* ===== Dropdown de Idiomas (END) ===== */}
      <div className="navbar-end">
        {user && (
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-ghost mr-2 text-sm hidden lg:inline-flex"
          >
            {translate("logout")}
          </button>
        )}
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
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-10 mt-2 w-28 p-2 shadow"
          >
            <li>
              <Link
                href={hrefWithQs}
                locale="pt"
                className={locale === "pt" ? "active" : undefined}
                aria-current={locale === "pt" ? "page" : undefined}
              >
                PT
              </Link>
            </li>
            <li>
              <Link
                href={hrefWithQs}
                locale="en"
                className={locale === "en" ? "active" : undefined}
                aria-current={locale === "en" ? "page" : undefined}
              >
                EN
              </Link>
            </li>
          </ul>
        </div>
      </div>
      {/* ===================================== */}
    </div>
  );
};

export default NavBar;

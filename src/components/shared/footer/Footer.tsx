"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { Instagram, Facebook, Mail, MapPin, Camera } from "lucide-react";
import logotipo from "../../../../public/brand/logo-sem-fundo-sem-nome.png";

export default function Footer() {
  const t = useTranslations("footer");
  const { info } = useSiteInfo();
  const year = new Date().getFullYear();

  const locationDisplay = [info.address, info.city, info.country]
    .filter(Boolean)
    .join(", ");

  return (
    <footer className="relative w-full border-t border-white/10 bg-black">
      {/* Subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Main grid */}
        <div className="grid grid-cols-1 gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={logotipo.src} alt="Momentos" className="h-8 w-10" />
              <span className="text-xl font-semibold text-white">Momentos</span>
            </div>
            <p className="text-sm leading-relaxed text-white/60">
              {t("tagline")}
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3 pt-1">
              {info.instagram && (
                <a
                  href={info.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="rounded-full border border-white/10 p-2 text-white/50 transition hover:border-white/30 hover:text-white"
                >
                  <Instagram size={16} />
                </a>
              )}
              {info.facebook && (
                <a
                  href={info.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="rounded-full border border-white/10 p-2 text-white/50 transition hover:border-white/30 hover:text-white"
                >
                  <Facebook size={16} />
                </a>
              )}
              {info.email && (
                <a
                  href={`mailto:${info.email}`}
                  aria-label="Email"
                  className="rounded-full border border-white/10 p-2 text-white/50 transition hover:border-white/30 hover:text-white"
                >
                  <Mail size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              {t("navTitle")}
            </h3>
            <nav className="flex flex-col gap-2.5">
              <Link
                href="/"
                className="text-sm text-white/60 transition hover:text-white"
              >
                {t("home")}
              </Link>
              <Link
                href="/portofolio"
                className="text-sm text-white/60 transition hover:text-white"
              >
                {t("portfolio")}
              </Link>
              <Link
                href="/sessions"
                className="text-sm text-white/60 transition hover:text-white"
              >
                {t("sessions")}
              </Link>
              <Link
                href="/events"
                className="text-sm text-white/60 transition hover:text-white"
              >
                {t("events")}
              </Link>
            </nav>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              {t("servicesTitle")}
            </h3>
            <ul className="flex flex-col gap-2.5">
              <li className="flex items-center gap-2 text-sm text-white/60">
                <Camera size={13} className="shrink-0 text-white/30" />
                {t("service1")}
              </li>
              <li className="flex items-center gap-2 text-sm text-white/60">
                <Camera size={13} className="shrink-0 text-white/30" />
                {t("service2")}
              </li>
              <li className="flex items-center gap-2 text-sm text-white/60">
                <Camera size={13} className="shrink-0 text-white/30" />
                {t("service3")}
              </li>
              <li className="flex items-center gap-2 text-sm text-white/60">
                <Camera size={13} className="shrink-0 text-white/30" />
                {t("service4")}
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              {t("contactTitle")}
            </h3>
            <div className="flex flex-col gap-3">
              {info.email && (
                <a
                  href={`mailto:${info.email}`}
                  className="flex items-start gap-2 text-sm text-white/60 transition hover:text-white"
                >
                  <Mail size={14} className="mt-0.5 shrink-0 text-white/30" />
                  {info.email}
                </a>
              )}
              {info.phone && (
                <a
                  href={`tel:${info.phone.replace(/\s/g, "")}`}
                  className="flex items-start gap-2 text-sm text-white/60 transition hover:text-white"
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 text-white/30" />
                  {info.phone}
                </a>
              )}
              {locationDisplay && (
                <div className="flex items-start gap-2 text-sm text-white/60">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-white/30" />
                  {locationDisplay}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 sm:flex-row">
          <p className="text-xs text-white/40">
            © {year} Momentos. {t("rights")}
          </p>
          <p className="text-xs text-white/30">{t("madeWith")}</p>
        </div>
      </div>
    </footer>
  );
}

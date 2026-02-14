// src/components/sections/team-home-page.tsx
"use client";

import React from "react";
import fernandoFoto from "../../../../public/images/fernando_fernandes.jpg";
import vanessaFoto from "../../../../public/images/vanessa_alves.jpg";
import CardGlare from "../../reactBits/glareHover/GlareHover";
import { useTranslations } from "next-intl";

type TeamMember = { name: string; avatar: string };
const team: TeamMember[] = [
  { name: "Vanessa", avatar: vanessaFoto.src },
  { name: "Fernando", avatar: fernandoFoto.src },
];

const Highlight = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-gradient-to-t from-base-content to-blue-500/90 bg-clip-text text-transparent">
    {children}
  </span>
);

export default function TeamHomePage() {
  const t = useTranslations("teamHomePage");

  return (
    <section className="w-full bg-black">
      {/* --- Contexto (igual ao teu) --- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8  py-10 text-center space-y-6">
        <div className="badge badge-primary badge-lg">{t("badge")}</div>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          {t.rich("heading", {
            highlight: (chunks) => <Highlight>{chunks}</Highlight>,
          })}
        </h2>
        <p className="max-w-3xl mx-auto text-base md:text-lg opacity-90">
          {t.rich("paragraph1", {
            highlight: (chunks) => <Highlight>{chunks}</Highlight>,
          })}
        </p>
        <p className="max-w-3xl mx-auto text-base md:text-lg opacity-90">
          {t.rich("paragraph2", {
            highlight: (chunks) => <Highlight>{chunks}</Highlight>,
          })}
        </p>
        <p className="max-w-3xl mx-auto text-base md:text-lg opacity-90">
          {t.rich("paragraph3", {
            highlight: (chunks) => <Highlight>{chunks}</Highlight>,
          })}
        </p>
        <div className="max-w-3xl mx-auto text-base md:text-lg opacity-90 space-y-2 text-left">
          <p className="font-semibold">{t("objectivesTitle")}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              {t.rich("objective1", {
                highlight: (chunks) => <Highlight>{chunks}</Highlight>,
              })}
            </li>
            <li>
              {t.rich("objective2", {
                highlight: (chunks) => <Highlight>{chunks}</Highlight>,
              })}
            </li>
            <li>
              {t.rich("objective3", {
                highlight: (chunks) => <Highlight>{chunks}</Highlight>,
              })}
            </li>
            <li>
              {t.rich("objective4", {
                highlight: (chunks) => <Highlight>{chunks}</Highlight>,
              })}
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button className="btn btn-primary">{t("ctaBookSession")}</button>
          <button className="btn btn-ghost">{t("ctaViewPortfolio")}</button>
        </div>
      </div>

      <div className="divider mx-auto w-11/12">{t("teamDivider")}</div>

      {/* --- Cards (foto + nome) + glare/tilt --- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          {team.map((m) => (
            <CardGlare
              key={m.name}
              className="rounded-3xl w-full max-w-[420px] mx-auto"
              tilt={8}
              glare={0.28}
              radius={300}
              color="255,255,255"
              rounded="1.5rem"
              scale={1.03}
            >
              <article
                className="overflow-hidden relative rounded-3xl transform-gpu
                           w-full border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02]
                           shadow-[0_30px_100px_rgba(0,0,0,0.5)]"
              >
                {/* Foto */}
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="h-full w-full object-cover object-top select-none pointer-events-none transition-transform duration-500"
                    draggable={false}
                  />
                </div>
                {/* Nome – overlay gradient sobre a foto */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent px-6 pb-8 pt-20 text-center">
                  <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                    {m.name}
                  </h3>
                </div>
              </article>
            </CardGlare>
          ))}
        </div>
      </div>
    </section>
  );
}

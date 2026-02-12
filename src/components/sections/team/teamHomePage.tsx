// src/components/sections/team-home-page.tsx
"use client";

import React from "react";
import fernandoFoto from "../../../../public/images/fernando_fernandes.jpg";
import vanessaFoto from "../../../../public/images/vanessa_alves.jpg";
import CardGlare from "../../reactBits/glareHover/GlareHover";

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
  return (
    <section className="w-full bg-black">
      {/* --- Contexto (igual ao teu) --- */}      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8  py-10 text-center space-y-6">
        <div className="badge badge-primary badge-lg">Sobre nós</div>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          Momentos, <Highlight>histórias autênticas</Highlight>
        </h2>
        <p className="max-w-3xl mx-auto text-base md:text-lg opacity-90">
          <Highlight>Momentos</Highlight> nasceu da paixão de transformar momentos em{" "}
          <Highlight>memórias</Highlight> que atravessam <Highlight>gerações</Highlight>.
        </p>
        <p className="max-w-3xl mx-auto text-base md:text-lg opacity-90">
          Desde sempre que a <Highlight>fotografia</Highlight> faz parte da nossa história;
          primeiro como hobby passando a uma forma de linguagem/comunicação através da
          captura de <Highlight>emoções</Highlight>, eternizando aquilo que muitas vezes
          passa despercebido aos olhos…
        </p>
        <p className="max-w-3xl mx-auto text-base md:text-lg opacity-90">
          Oferecer um olhar <Highlight>sensível</Highlight>, <Highlight>artístico</Highlight> e{" "}
          <Highlight>profissional</Highlight> sobre momentos importantes, foi a convicção que
          levou à criação de Momentos.
        </p>
        <div className="max-w-3xl mx-auto text-base md:text-lg opacity-90 space-y-2 text-left">
          <p className="font-semibold">Os nossos objetivos principais:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Captar imagens que contenham <Highlight>histórias</Highlight>;</li>
            <li>Garantir <Highlight>qualidade</Highlight> técnica e estética em cada projeto;</li>
            <li>Disponibilizar um serviço <Highlight>personalizado</Highlight> e adaptado às necessidades de cada cliente;</li>
            <li>
              Construir relações duradouras baseadas em <Highlight>confiança</Highlight>,
              <Highlight> profissionalismo</Highlight> e <Highlight>criatividade</Highlight>.
            </li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button className="btn btn-primary">Marcar sessão</button>
          <button className="btn btn-ghost">Ver portefólio</button>
        </div>
      </div>

      <div className="divider mx-auto w-11/12">A equipa</div>

      {/* --- Cards (85% foto / 15% nome) + glare/tilt --- */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {team.map((m) => (
            <CardGlare
              key={m.name}
              className="rounded-2xl w-full max-w-[380px] mx-auto"
              tilt={10}          // 3D
              glare={0.32}       // brilho radial
              radius={260}       // raio do brilho
              color="255,255,255"
              rounded="1rem"
              scale={1.02}
            >
              <article
                className="card bg-base-100 shadow-xl overflow-hidden relative
                           rounded-2xl transform-gpu
                           h-[360px] sm:h-[440px] md:h-[500px]
                           w-full"
              >
                {/* Foto (80%) */}
                <div className="h-[85%] w-full bg-neutral-800/70 overflow-hidden flex items-center justify-center">
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="w-11/12 h-full object-cover object-center select-none pointer-events-none transition-transform duration-200"
                    draggable={false}
                  />
                </div>
                {/* Nome (20%) */}
                <div className="h-[15%] w-full flex items-center justify-center border-t border-base-300 px-4 text-center">
                  <h3 className="text-lg md:text-xl font-semibold">{m.name}</h3>
                </div>
              </article>
            </CardGlare>
          ))}
        </div>
      </div>
    </section>
  );
}

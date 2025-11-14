// src/components/sections/team-home-page.tsx
"use client";

import React from "react";
import manFoto from "../../../../public/brand/team/man.png";
import womanFoto from "../../../../public/brand/team/woman.png";
import CardGlare from "../../reactBits/glareHover/GlareHover";

type TeamMember = { name: string; avatar: string };
const team: TeamMember[] = [
  { name: "Inês Duarte", avatar: womanFoto.src },
  { name: "Miguel Rocha", avatar: manFoto.src },
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
          Acreditamos que cada sessão é um encontro entre <Highlight>luz</Highlight> e{" "}
          <Highlight>verdade</Highlight>. Não perseguimos poses; procuramos o instante
          em que a respiração abranda e a pessoa se revela. É aí que a fotografia
          deixa de ser imagem e se transforma em <Highlight>memória</Highlight>.
        </p>
        <p className="max-w-3xl mx-auto text-base md:text-lg opacity-90">
          Trabalhamos com <Highlight>luz natural</Highlight>, direção leve e um
          cuidado quase artesanal na edição. Queremos que se veja nas fotos como
          se sente por dentro: sem ruído, com espaço para o que realmente importa —{" "}
          <Highlight>proximidade</Highlight>, <Highlight>ternura</Highlight>,{" "}
          <Highlight>intimidade</Highlight>.
        </p>
        <p className="max-w-3xl mx-auto text-base md:text-lg opacity-90">
          Chamamos-nos “Momentos” porque é isso que prometemos: pequenas pausas no
          tempo, guardadas com <Highlight>delicadeza</Highlight> e{" "}
          <Highlight>respeito</Highlight>. Se vierem connosco, levamos o resto com
          calma: um roteiro simples, localizações com <Highlight>boa luz</Highlight> e
          uma entrega rápida numa galeria privada — para reviver, partilhar e voltar
          a sentir.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button className="btn btn-primary">Marcar sessão</button>
          <button className="btn btn-ghost">Ver portefólio</button>
        </div>
      </div>

      <div className="divider mx-auto w-11/12">A equipa</div>

      {/* --- Cards (80% foto / 20% nome) + glare/tilt --- */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {team.map((m) => (
            <CardGlare
              key={m.name}
              className="rounded-2xl"
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
                           h-[420px] sm:h-[520px] md:h-[560px]"
              >
                {/* Foto (80%) */}
                <div className="h-[80%] w-full">
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="w-full h-full object-cover select-none pointer-events-none"
                    draggable={false}
                  />
                </div>
                {/* Nome (20%) */}
                <div className="h-[20%] w-full flex items-center justify-center border-t border-base-300">
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

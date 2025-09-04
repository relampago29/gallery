import React from "react";
import Image from "next/image";
import Link from "next/link";
import founder from "../../public/founder.png";
import coo_founder from "../../public/coo-founder.png";
import ceo_founder from "../../public/ceo_founder.png";
import ffounder from "../../public/ffounder.png";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start p-8 sm:p-24 bg-cover bg-center bg-fixed font-sans overflow-x-clip">
      {/* Overlay do fundo */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Hero */}
      <div className="relative z-10 text-center max-w-2xl mx-auto space-y-6 py-20">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
          [Nome da Empresa]
        </h1>
        <p className="text-xl sm:text-2xl font-light leading-snug text-gray-300">
          Capturando Momentos, Criando Memórias.
        </p>

        <div className="flex justify-center flex-wrap gap-2 pt-4">
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
            Paixão
          </span>
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
            Arte
          </span>
          <span className="px-3 py-1 text-sm font-medium rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
            Qualidade
          </span>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/albums"
            className="w-full sm:w-auto rounded-full bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 text-lg font-bold text-white shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            Ver Portfólio
          </Link>

          <a
            href="mailto:contacto@suaempresa.com"
            className="w-full sm:w-auto rounded-full px-6 py-3 text-lg font-bold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors duration-200 transform hover:scale-105"
          >
            Contacte-nos
          </a>
        </div>
      </div>

      {/* Secção SOBRE NÓS em full-bleed, sem margens negativas */}
      <section
        id="sobre-nos"
        className="relative top-50 z-10 w-full py-16 sm:py-24"
      >
        {/* Camada de fundo que ocupa toda a largura do ecrã */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen bg-gray-950"
        />
        {/* Conteúdo centrado */}
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Texto */}
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-block text-teal-400 text-xs font-semibold tracking-widest uppercase">
                Sobre nós
              </span>
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                Histórias reais. Luz autêntica.
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Somos um estúdio de fotografia focado em captar momentos com
                intenção e simplicidade — de{" "}
                <span className="text-teal-400">casamentos</span> a{" "}
                <span className="text-teal-400">retratos profissionais</span>,
                <span className="text-teal-400"> moda</span> e{" "}
                <span className="text-teal-400">eventos corporativos</span>.
                Acreditamos que cada imagem deve ter propósito: emocionar hoje e
                permanecer relevante amanhã.
              </p>

              <ul className="space-y-3">
                <li className="flex gap-3">
                  <svg
                    className="mt-1 h-5 w-5 flex-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    ></path>
                  </svg>
                  <span className="text-gray-300">
                    Direção criativa completa: styling, moodboards e scouting de
                    local.
                  </span>
                </li>
                <li className="flex gap-3">
                  <svg
                    className="mt-1 h-5 w-5 flex-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    ></path>
                  </svg>
                  <span className="text-gray-300">
                    Edição fina e consistente com foco em pele, cor e luz
                    natural.
                  </span>
                </li>
                <li className="flex gap-3">
                  <svg
                    className="mt-1 h-5 w-5 flex-none"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    ></path>
                  </svg>
                  <span className="text-gray-300">
                    Entrega rápida e segura em galerias online privadas.
                  </span>
                </li>
              </ul>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
                <div>
                  <div className="text-3xl font-bold text-white">10+</div>
                  <div className="text-xs uppercase tracking-wider text-gray-400">
                    Anos de experiência
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">800+</div>
                  <div className="text-xs uppercase tracking-wider text-gray-400">
                    Sessões realizadas
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">4.9/5</div>
                  <div className="text-xs uppercase tracking-wider text-gray-400">
                    Avaliação média
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="/albums"
                  className="inline-flex items-center justify-center rounded-xl bg-teal-500 hover:bg-teal-400 px-5 py-3 text-sm font-semibold text-gray-900 transition"
                >
                  Ver portfólio
                </a>
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 hover:border-white/20 px-5 py-3 text-sm font-semibold text-white/90 hover:text-white transition"
                >
                  Pedir orçamento
                </a>
              </div>
            </div>

            {/* Imagens (lazy) */}
            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 grid-rows-2 gap-4">
                <div className="relative row-span-2">
                  <img
                    src="https://placehold.co/800x1100/E5E7EB/111827?text=Casamentos"
                    alt="Casamentos"
                    className="h-full w-full object-cover rounded-2xl shadow-2xl"
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={1100}
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute left-3 bottom-3 text-xs px-2 py-1 rounded-md bg-black/50 text-white">
                    Casamentos
                  </span>
                </div>
                <div className="relative">
                  <img
                    src="https://placehold.co/800x600/D1D5DB/111827?text=Retratos"
                    alt="Retratos"
                    className="h-full w-full object-cover rounded-2xl shadow-xl"
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={600}
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute left-3 bottom-3 text-xs px-2 py-1 rounded-md bg-black/50 text-white">
                    Retratos
                  </span>
                </div>
                <div className="relative">
                  <img
                    src="https://placehold.co/800x600/9CA3AF/111827?text=Moda+%26+Estilo"
                    alt="Moda e Estilo"
                    className="h-full w-full object-cover rounded-2xl shadow-xl"
                    loading="lazy"
                    decoding="async"
                    width={800}
                    height={600}
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute left-3 bottom-3 text-xs px-2 py-1 rounded-md bg-black/50 text-white">
                    Moda &amp; Estilo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ornamento */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" />
      </section>

      {/* Secção EQUIPA */}
      <section
        id="equipa"
        className="relative top-100 z-10 w-full py-16 sm:py-24"
      >
        {/* fundo full-bleed */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-screen bg-gray-950"
        />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12">
            <span className="inline-block text-teal-400 text-xs font-semibold tracking-widest uppercase">
              Equipa
            </span>
            <h2 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
              As pessoas por trás das câmaras
            </h2>
            <p className="mt-3 text-gray-400 max-w-2xl">
              Um estúdio é tão forte quanto a sua equipa. Conhece quem dá vida a
              cada projeto.
            </p>
          </div>

          <div className="rounded-2xl bg-black/40 p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {/* 1 */}
              <figure className="group relative overflow-hidden rounded-xl bg-gray-900 ring-1 ring-white/10">
                <div className="aspect-[3/4] w-full overflow-hidden relative">
                  <Image
                    src={founder}
                    alt="Lindsey Smith — Founder & CEO"
                    fill
                    placeholder="blur"
                    loading="lazy"
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <figcaption className="bg-black px-4 py-3">
                  <div className="text-sm font-semibold text-white">
                    Lindsey Smith
                  </div>
                  <div className="text-xs text-gray-400">Founder · CEO</div>
                </figcaption>
              </figure>

              {/* 2 */}
              <figure className="group relative overflow-hidden rounded-xl bg-gray-900 ring-1 ring-white/10">
                <div className="aspect-[3/4] w-full overflow-hidden relative">
                  <Image
                    src={coo_founder}
                    alt="Rene Thomas — Executive Creative Director"
                    fill
                    placeholder="blur"
                    loading="lazy"
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <figcaption className="bg-black px-4 py-3">
                  <div className="text-sm font-semibold text-white">
                    Rene Thomas
                  </div>
                  <div className="text-xs text-gray-400">
                    Partner · Executive Creative Director
                  </div>
                </figcaption>
              </figure>

              {/* 3 */}
              <figure className="group relative overflow-hidden rounded-xl bg-gray-900 ring-1 ring-white/10">
                <div className="aspect-[3/4] w-full overflow-hidden relative">
                  <Image
                    src={ceo_founder}
                    alt="James Voh — CTO"
                    fill
                    placeholder="blur"
                    loading="lazy"
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <figcaption className="bg-black px-4 py-3">
                  <div className="text-sm font-semibold text-white">
                    James Voh
                  </div>
                  <div className="text-xs text-gray-400">CTO</div>
                </figcaption>
              </figure>

              {/* 4 */}
              <figure className="group relative overflow-hidden rounded-xl bg-gray-900 ring-1 ring-white/10">
                <div className="aspect-[3/4] w-full overflow-hidden relative">
                  <Image
                    src={ffounder}
                    alt="Prem Sai Ramani — VP, Strategy"
                    fill
                    placeholder="blur"
                    loading="lazy"
                    sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
                    className="object-cover object-center transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <figcaption className="bg-black px-4 py-3">
                  <div className="text-sm font-semibold text-white">
                    Prem Sai Ramani
                  </div>
                  <div className="text-xs text-gray-400">VP, Strategy</div>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

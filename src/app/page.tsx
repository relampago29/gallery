import React from 'react';

export default function Home() {
  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center p-8 sm:p-24 bg-cover bg-center bg-fixed font-sans"
      // A referência da imagem foi corrigida para o diretório "public"
      style={{ backgroundImage: "url('/fundo.png')" }}
    >
      {/* Overlay para escurecer a imagem de fundo e melhorar a legibilidade */}
      <div className="absolute inset-0 bg-black opacity-60"></div>

      <div className="relative z-10 text-center max-w-2xl mx-auto space-y-6">
        {/* Secção principal de apresentação */}
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
          [Nome da Empresa]
        </h1>
        <p className="text-xl sm:text-2xl font-light leading-snug text-gray-300">
          Capturando Momentos, Criando Memórias.
        </p>

        {/* Citações ou slogans */}
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

        {/* Botões de chamada para a ação */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* O componente Link foi substituído por uma tag <a> padrão */}
          <a
            href="/albums"
            className="w-full sm:w-auto rounded-full bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 text-lg font-bold text-white shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
          >
            Ver Portfólio
          </a>
          <a
            href="mailto:contacto@suaempresa.com"
            className="w-full sm:w-auto rounded-full px-6 py-3 text-lg font-bold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors duration-200 transform hover:scale-105"
          >
            Contacte-nos
          </a>
        </div>
      </div>
    </main>
  );
}

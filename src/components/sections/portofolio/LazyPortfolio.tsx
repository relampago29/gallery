'use client';

import dynamic from 'next/dynamic';
import {useInView} from '@/hooks/useInView';

// IMPORTAÇÃO DINÂMICA: só carrega o chunk quando renderizado
const PortofolioHomePage = dynamic(
  () => import('./portofolioHomePage'),
  {
    ssr: false, // útil se o componente usa APIs do browser; podes pôr true se não precisar
    loading: () => (
      <div className="h-[600px] w-full flex items-center justify-center">
        <span className="animate-pulse opacity-70">A preparar portfólio…</span>
      </div>
    ),
  }
);

export default function LazyPortfolio() {
  const {ref, inView} = useInView<HTMLDivElement>();

  return (
    <div ref={ref}>
      {inView ? (
        <PortofolioHomePage />        
       
      ) : (
        // Placeholder para reservar espaço e evitar salto de layout
        <div className="h-[700px]" />
      )}
    </div>
  );
}

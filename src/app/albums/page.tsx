"use client";
import React from 'react';

type AlbumCard = { id: number; title: string; thumbnailUrl: string };

// Base (placeholders) — caso o Unsplash falhe, continuas com thumbs
const BASE_ALBUMS: AlbumCard[] = [
  { id: 1, title: 'Fotografia de Casamento', thumbnailUrl: 'https://placehold.co/150x150/E5E7EB/4B5563?text=Casamento' },
  { id: 2, title: 'Retratos Profissionais',   thumbnailUrl: 'https://placehold.co/150x150/D1D5DB/4B5563?text=Retratos' },
  { id: 3, title: 'Paisagens',                 thumbnailUrl: 'https://placehold.co/150x150/9CA3AF/4B5563?text=Paisagens' },
  { id: 4, title: 'Eventos Corporativos',      thumbnailUrl: 'https://placehold.co/150x150/6B7280/F9FAFB?text=Eventos' },
  { id: 5, title: 'Moda & Estilo',             thumbnailUrl: 'https://placehold.co/150x150/4B5563/F9FAFB?text=Moda' },
  { id: 6, title: 'Arquitetura',               thumbnailUrl: 'https://placehold.co/150x150/374151/F9FAFB?text=Arquitetura' },
];

// Query por categoria (podes ajustar os termos à vontade)
const QUERY_BY_ID: Record<number, string> = {
  1: "wedding photography",
  2: "professional portrait headshot",
  3: "landscape photography",
  4: "corporate event photography",
  5: "fashion editorial photography",
  6: "architecture photography exterior",
};

export default function AlbumsPage() {
  const [albums, setAlbums] = React.useState<AlbumCard[]>(BASE_ALBUMS);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const updated = await Promise.all(
          BASE_ALBUMS.map(async (a) => {
            const q = QUERY_BY_ID[a.id] || a.title;
            try {
              const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(q)}&per_page=1&orientation=landscape`, { cache: "no-store" });
              if (!res.ok) return a;
              const json = await res.json();
              const p = json.results?.[0];
              if (p?.urls?.small) {
                return { ...a, thumbnailUrl: p.urls.small };
              }
              return a;
            } catch {
              return a;
            }
          })
        );
        if (!cancelled) setAlbums(updated);
      } catch {
        // Ignora: mantém placeholders
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24 bg-gray-950 text-gray-100 font-sans transition-colors duration-300">
      <div className="text-center max-w-4xl mx-auto space-y-6 mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
          Álbuns
        </h1>
        <p className="text-lg sm:text-xl font-light leading-snug text-gray-400">
          Explore os nossos álbuns para ver o nosso trabalho.
        </p>
        <a href="/" className="inline-flex items-center text-sm font-medium text-teal-500 hover:text-teal-400 transition-colors duration-300 mt-4">
          &larr; Voltar para a página inicial
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-7xl">
        {albums.map((album) => (
          <a key={album.id} href={`/albums/${album.id}`} className="block">
            <div className="block bg-gray-800 rounded-lg shadow-lg hover:shadow-2xl transition-shadow duration-300 overflow-hidden transform hover:scale-105">
              <img
                src={album.thumbnailUrl}
                alt={album.title}
                width={150}
                height={150}
                className="w-full h-48 object-cover rounded-t-lg"
                loading="lazy"
              />
              <div className="p-4">
                <h2 className="text-lg font-semibold text-white truncate">{album.title}</h2>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

"use client";
import React from 'react';

interface AlbumDetails {
  id: number;
  title: string;
  images: string[];
}

type UnsplashPhoto = {
  id: string;
  alt: string;
  urls: { thumb: string; small: string; regular: string; full: string };
  user: { name: string; username: string };
  links: { html: string; download_location: string };
};

// Placeholders originais (fallback)
const getAlbumDetails = (id: number): AlbumDetails | null => {
  const albums: { [key: number]: AlbumDetails } = {
    1: { id: 1, title: 'Fotografia de Casamento', images: [
      'https://placehold.co/800x600/E5E7EB/4B5563?text=Casamento+1',
      'https://placehold.co/800x600/D1D5DB/4B5563?text=Casamento+2',
      'https://placehold.co/800x600/9CA3AF/4B5563?text=Casamento+3',
    ]},
    2: { id: 2, title: 'Retratos Profissionais', images: [
      'https://placehold.co/800x600/6B7280/F9FAFB?text=Retratos+1',
      'https://placehold.co/800x600/4B5563/F9FAFB?text=Retratos+2',
      'https://placehold.co/800x600/374151/F9FAFB?text=Retratos+3',
    ]},
    3: { id: 3, title: 'Paisagens', images: [
      'https://placehold.co/800x600/E5E7EB/4B5563?text=Paisagem+1',
      'https://placehold.co/800x600/D1D5DB/4B5563?text=Paisagem+2',
      'https://placehold.co/800x600/9CA3AF/4B5563?text=Paisagem+3',
    ]},
    4: { id: 4, title: 'Eventos Corporativos', images: [
      'https://placehold.co/800x600/6B7280/F9FAFB?text=Eventos+1',
      'https://placehold.co/800x600/4B5563/F9FAFB?text=Eventos+2',
      'https://placehold.co/800x600/374151/F9FAFB?text=Eventos+3',
    ]},
    5: { id: 5, title: 'Moda & Estilo', images: [
      'https://placehold.co/800x600/E5E7EB/4B5563?text=Moda+1',
      'https://placehold.co/800x600/D1D5DB/4B5563?text=Moda+2',
      'https://placehold.co/800x600/9CA3AF/4B5563?text=Moda+3',
    ]},
    6: { id: 6, title: 'Arquitetura', images: [
      'https://placehold.co/800x600/6B7280/F9FAFB?text=Arquitetura+1',
      'https://placehold.co/800x600/4B5563/F9FAFB?text=Arquitetura+2',
      'https://placehold.co/800x600/374151/F9FAFB?text=Arquitetura+3',
    ]},
  };
  return albums[id] || null;
};

// Query por álbum
const QUERY_BY_ID: Record<number, string> = {
  1: "wedding photography",
  2: "professional portrait headshot",
  3: "landscape photography",
  4: "corporate event photography",
  5: "fashion editorial photography",
  6: "architecture photography exterior",
};

// Obter albumId da URL (mantido)
const useAlbumIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const parts = window.location.pathname.split('/');
  const albumId = parts[parts.length - 1];
  return albumId && !isNaN(parseInt(albumId, 10)) ? albumId : null;
};

export default function AlbumDetailsPage() {
  const [album, setAlbum] = React.useState<AlbumDetails | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  const [unsplashPhotos, setUnsplashPhotos] = React.useState<UnsplashPhoto[]>([]);
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string | null>(null);

  const albumIdString = useAlbumIdFromUrl();
  const albumId = albumIdString ? parseInt(albumIdString, 10) : null;

  React.useEffect(() => {
    let cancelled = false;

    const fetchAlbum = async () => {
      if (albumId === null || isNaN(albumId)) {
        setLoading(false);
        return;
      }

      const data = getAlbumDetails(albumId);
      setAlbum(data);

      // Busca ao Unsplash para QUALQUER álbum
      const q = QUERY_BY_ID[albumId] || data?.title || "photography";
      try {
        const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(q)}&per_page=12&orientation=landscape`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setUnsplashPhotos(json.results || []);
        }
      } catch (err) {
        console.error("Falha ao obter fotos do Unsplash:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAlbum();
    return () => { cancelled = true; };
  }, [albumId]);

  const openFullscreen = async (imgUrl: string, downloadLocation?: string | null) => {
    setSelectedImageUrl(imgUrl);
    // Regista download no Unsplash quando o user abre a imagem
    if (downloadLocation) {
      try {
        await fetch(`/api/unsplash/download?download_location=${encodeURIComponent(downloadLocation)}`);
      } catch (e) {
        console.warn("Falhou registo de download no Unsplash:", e);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 sm:p-24 bg-gray-950 text-gray-100 transition-colors duration-300">
        <div className="text-xl font-medium">A carregar detalhes do álbum...</div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 sm:p-24 bg-gray-950 text-gray-100 transition-colors duration-300">
        <div className="text-xl font-medium">Álbum não encontrado.</div>
      </div>
    );
  }

  const appName = process.env.NEXT_PUBLIC_UNSPLASH_APP_NAME || "your-app-name";

  return (
    <div className="flex min-h-screen flex-col items-center p-8 sm:p-24 bg-gray-950 text-gray-100 font-sans transition-colors duration-300">
      <div className="text-center max-w-4xl mx-auto space-y-6 mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-white">
          {album?.title}
        </h1>
        <a href="/albums" className="inline-flex items-center text-sm font-medium text-teal-500 hover:text-teal-400 transition-colors duration-300">
          &larr; Voltar para os Álbuns
        </a>
      </div>

      {/* Mantém a mesma grelha; muda só a origem */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
        {unsplashPhotos.length > 0
          ? unsplashPhotos.map((p) => (
              <div
                key={p.id}
                className="relative rounded-lg shadow-lg overflow-hidden transition-all duration-300 transform hover:scale-105 cursor-pointer"
                onClick={() => openFullscreen(p.urls.full || p.urls.regular, p.links.download_location)}
                title={p.alt}
              >
                <img src={p.urls.regular} alt={p.alt} className="w-full h-auto object-cover" loading="lazy" />

                {/* Atribuição (requisito Unsplash) */}
                <div className="absolute inset-x-0 bottom-0 bg-black/50 backdrop-blur-sm px-3 py-2 text-xs text-gray-200">
                  Foto de{" "}
                  <a
                    className="underline hover:no-underline"
                    href={`https://unsplash.com/@${p.user.username}?utm_source=${encodeURIComponent(appName)}&utm_medium=referral`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {p.user.name}
                  </a>{" "}
                  em{" "}
                  <a
                    className="underline hover:no-underline"
                    href={`https://unsplash.com/?utm_source=${encodeURIComponent(appName)}&utm_medium=referral`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Unsplash
                  </a>
                </div>
              </div>
            ))
          : album.images.map((image, index) => (
              <div
                key={index}
                className="rounded-lg shadow-lg overflow-hidden transition-all duration-300 transform hover:scale-105 cursor-pointer"
                onClick={() => openFullscreen(image, null)}
              >
                <img src={image} alt={`${album?.title} ${index + 1}`} className="w-full h-auto object-cover" />
              </div>
            ))}
      </div>

      {selectedImageUrl && (
        <div
          className="fixed inset-0 bg-gray-950 bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImageUrl(null)}
        >
          <div className="max-w-screen-xl max-h-screen relative p-4" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 text-white text-3xl font-bold p-2"
              onClick={() => setSelectedImageUrl(null)}
              aria-label="Fechar"
            >
              &times;
            </button>
            <img src={selectedImageUrl} alt="Imagem em ecrã inteiro" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

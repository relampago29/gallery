"use client";
import React from 'react';

// Esta é a definição de tipo para o objeto de detalhes do álbum.
// O TypeScript exige isto para garantir que o código aceda a propriedades válidas.
interface AlbumDetails {
  id: number;
  title: string;
  images: string[];
}

// Esta é uma função de simulação para o ambiente Canvas.
// Numa aplicação Next.js real, esta função faria uma chamada API para obter os dados.
const getAlbumDetails = (id: number): AlbumDetails | null => {
  const albums: { [key: number]: AlbumDetails } = {
    1: {
      id: 1,
      title: 'Fotografia de Casamento',
      images: [
        'https://placehold.co/800x600/E5E7EB/4B5563?text=Casamento+1',
        'https://placehold.co/800x600/D1D5DB/4B5563?text=Casamento+2',
        'https://placehold.co/800x600/9CA3AF/4B5563?text=Casamento+3',
      ],
    },
    2: {
      id: 2,
      title: 'Retratos Profissionais',
      images: [
        'https://placehold.co/800x600/6B7280/F9FAFB?text=Retratos+1',
        'https://placehold.co/800x600/4B5563/F9FAFB?text=Retratos+2',
        'https://placehold.co/800x600/374151/F9FAFB?text=Retratos+3',
      ],
    },
    3: {
      id: 3,
      title: 'Paisagens',
      images: [
        'https://placehold.co/800x600/E5E7EB/4B5563?text=Paisagem+1',
        'https://placehold.co/800x600/D1D5DB/4B5563?text=Paisagem+2',
        'https://placehold.co/800x600/9CA3AF/4B5563?text=Paisagem+3',
      ],
    },
    4: {
      id: 4,
      title: 'Eventos Corporativos',
      images: [
        'https://placehold.co/800x600/6B7280/F9FAFB?text=Eventos+1',
        'https://placehold.co/800x600/4B5563/F9FAFB?text=Eventos+2',
        'https://placehold.co/800x600/374151/F9FAFB?text=Eventos+3',
      ],
    },
    5: {
      id: 5,
      title: 'Moda & Estilo',
      images: [
        'https://placehold.co/800x600/E5E7EB/4B5563?text=Moda+1',
        'https://placehold.co/800x600/D1D5DB/4B5563?text=Moda+2',
        'https://placehold.co/800x600/9CA3AF/4B5563?text=Moda+3',
      ],
    },
    6: {
      id: 6,
      title: 'Arquitetura',
      images: [
        'https://placehold.co/800x600/6B7280/F9FAFB?text=Arquitetura+1',
        'https://placehold.co/800x600/4B5563/F9FAFB?text=Arquitetura+2',
        'https://placehold.co/800x600/374151/F9FAFB?text=Arquitetura+3',
      ],
    },
  };
  return albums[id] || null;
};

// Esta é uma função de simulação para obter o `albumId` da URL, uma vez que o Next.js useRouter não está disponível.
const useAlbumIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const path = window.location.pathname;
  const parts = path.split('/');
  // Pega o último segmento do caminho da URL.
  const albumId = parts[parts.length - 1]; 
  // Retorna o albumId se ele for um número, caso contrário retorna null.
  return albumId && !isNaN(parseInt(albumId, 10)) ? albumId : null;
};

export default function AlbumDetailsPage() {
  const [album, setAlbum] = React.useState<AlbumDetails | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const albumIdString = useAlbumIdFromUrl();
  const albumId = albumIdString ? parseInt(albumIdString, 10) : null;

  React.useEffect(() => {
    const fetchAlbum = async () => {
      if (albumId !== null && !isNaN(albumId)) {
        try {
          const data = getAlbumDetails(albumId);
          setAlbum(data);
        } catch (error) {
          console.error("Failed to fetch album details:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchAlbum();
  }, [albumId]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
        {album?.images.map((image, index) => (
          <div 
            key={index} 
            className="rounded-lg shadow-lg overflow-hidden transition-all duration-300 transform hover:scale-105 cursor-pointer"
            onClick={() => setSelectedImage(image)}
          >
            <img src={image} alt={`${album?.title} ${index + 1}`} className="w-full h-auto object-cover" />
          </div>
        ))}
      </div>
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-gray-950 bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-screen-xl max-h-screen relative p-4" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute top-4 right-4 text-white text-3xl font-bold p-2"
              onClick={() => setSelectedImage(null)}
            >
              &times;
            </button>
            <img src={selectedImage} alt="Imagem em ecrã inteiro" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

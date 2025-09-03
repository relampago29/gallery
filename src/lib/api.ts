export { app, auth, analytics };

export interface Album {
  userId: number;
  id: number;
  title: string;
}

export interface Photo {
  albumId: number;
  id: number;
  title: string;
  url: string;
  thumbnailUrl: string;
}

export async function getAlbums(): Promise<Album[]> {
  const response = await fetch('https://jsonplaceholder.typicode.com/albums');
  if (!response.ok) {
    throw new Error('Failed to fetch albums');
  }
  return response.json();
}

export async function getAlbum(albumId: string): Promise<Album> {
  const response = await fetch(`https://jsonplaceholder.typicode.com/albums/${albumId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch album');
  }
  return response.json();
}

// Apenas um exemplo, pode não ser ideal para todos os casos
export async function getPhotosForAlbum(albumId: string): Promise<Photo[]> {
  const response = await fetch(`https://jsonplaceholder.typicode.com/albums/${albumId}/photos`);
  if (!response.ok) {
    throw new Error('Failed to fetch photos');
  }
  const photos = await response.json();

  // Mapeia as fotos e substitui a URL da miniatura pela do Picsum
  const photosWithNewUrls = photos.map(photo => ({
    ...photo,
    thumbnailUrl: `https://picsum.photos/seed/${photo.id}/150/150`,
  }));
  
  return photosWithNewUrls;
}

export interface AlbumWithThumbnail extends Album {
  thumbnailUrl: string;
}

export async function getAlbumsWithThumbnails(): Promise<AlbumWithThumbnail[]> {
  const albums = await getAlbums();
  // Limit to the first 12 albums for performance
  const limitedAlbums = albums.slice(0, 12);

  const albumsWithThumbnails = limitedAlbums.map(album => ({
    ...album,
    thumbnailUrl: `https://picsum.photos/seed/${album.id}/150/150`,
  }));

  return albumsWithThumbnails;
}


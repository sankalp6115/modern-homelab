import { getApiBase } from './api';

export const getAssetUrl = (path) => {
  const DEFAULT_ART = '/assets/album-arts/song-icon5.png';

  if (!path || path === 'None' || path === 'null' || path === 'undefined') return null;
  if (path.startsWith('http')) return path;

  let cleanPath = path
    .replace(/^\/+/, '')
    .replace(/^\.\.\/\.\.\/Assets\/Images\//i, '')
    .replace(/^\.\.\/\.\.\//, '')
    .replace(/^assets\//i, '')
    .replace(/^playlist-poster\//i, 'playlist-posters/')
    .replace(/^album-art\//i, 'album-arts/')
    .replace(/^artist-image\//i, 'artist-images/')
    .replace(/^\/+/, '');

  const apiBase = getApiBase();
  if (!path) return null;

  if (!cleanPath) {
    return apiBase ? `${apiBase}/assets` : DEFAULT_ART;
  }

  return apiBase ? `${apiBase}/assets/${cleanPath}` : `/assets/${cleanPath}`;
};

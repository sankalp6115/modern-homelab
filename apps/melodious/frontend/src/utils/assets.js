import { backend, port } from "../backend_url";

export const getAssetUrl = (path) => {
  const BACKEND_HOST = backend || window.location.hostname;
  const PORT = port || "8000";
  const BACKEND = `http://${BACKEND_HOST}:${PORT}`;
  const DEFAULT_ART = `/assets/album-arts/song-icon5.png`;

  if (!path || path === "None" || path === "null" || path === "undefined") return null;
  if (path.startsWith("http")) return path;

  // Normalize legacy paths and singular/plural mismatches
  let cleanPath = path
    .replace(/^\/+/, "")
    .replace(/^\.\.\/\.\.\/Assets\/Images\//i, "")
    .replace(/^\.\.\/\.\.\//, "")
    .replace(/^assets\//i, "")
    .replace(/^playlist-poster\//i, "playlist-posters/")
    .replace(/^album-art\//i, "album-arts/")
    .replace(/^artist-image\//i, "artist-images/")
    .replace(/^\/+/, "");

  return path ? `${BACKEND}/assets/${cleanPath}` : null;
};

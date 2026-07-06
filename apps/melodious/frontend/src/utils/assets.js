export const getAssetUrl = (path) => {
  const DEFAULT_ART = `/assets/album-arts/song-icon5.png`;

  if (!path || path === "None" || path === "null" || path === "undefined") return null;
  if (path.startsWith("http")) return path;

  let cleanPath = path
    .replace(/^\/+/, "")
    .replace(/^\.\.\/\.\.\/Assets\/Images\//i, "")
    .replace(/^\.\.\/\.\.\//, "")
    .replace(/^assets\//i, "")
    .replace(/^playlist-poster\//i, "playlist-posters/")
    .replace(/^album-art\//i, "album-arts/")
    .replace(/^artist-image\//i, "artist-images/")
    .replace(/^\/+/, "");

  return path ? `/assets/${cleanPath}` : null;
};

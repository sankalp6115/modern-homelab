const DEFAULT_API_BASE = '';
const STORAGE_KEY = 'melodious_api_base:v1';

const normalizeApiBase = (value = '') => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
};

let currentApiBase = normalizeApiBase(import.meta.env.VITE_API_BASE ?? DEFAULT_API_BASE);

export const getApiBase = () => currentApiBase;

export const getStoredApiBase = () => {
  if (typeof window === 'undefined') return currentApiBase;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored !== null ? normalizeApiBase(stored) : currentApiBase;
  } catch {
    return currentApiBase;
  }
};

export const setApiBase = (value = '') => {
  const normalized = normalizeApiBase(value);
  currentApiBase = normalized;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {}

    window.dispatchEvent(new CustomEvent('melodious-api-base-changed', {
      detail: { apiBase: normalized }
    }));
  }

  return normalized;
};

if (typeof window !== 'undefined') {
  const storedApiBase = getStoredApiBase();
  if (storedApiBase) {
    currentApiBase = storedApiBase;
  }
}

export const buildApiUrl = (path = '') => {
  const normalizedBase = currentApiBase || getStoredApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (!normalizedBase) {
    return normalizedPath;
  }

  return `${normalizedBase}${normalizedPath}`;
};

export const apiFetch = (path, options) => fetch(buildApiUrl(path), options);

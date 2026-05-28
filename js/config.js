const STORAGE_KEY = 'anadoluProxyUrl';

export function getProxyBaseUrl() {
  return (localStorage.getItem(STORAGE_KEY) || '').trim().replace(/\/$/, '');
}

export function setProxyBaseUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/$/, '');
  if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
  else localStorage.removeItem(STORAGE_KEY);
}

export function usesProxy() {
  return Boolean(getProxyBaseUrl());
}

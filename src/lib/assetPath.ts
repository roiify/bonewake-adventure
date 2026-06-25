// Prefix any public/-relative asset path with Vite's base URL so the app works
// both at root (dev / preview) and at a subpath like /bonewake/ (Pages).
const BASE = import.meta.env.BASE_URL ?? '/';
// Per-build cache-buster so newly deployed sprites don't get served stale
// from the browser disk cache. Bumped automatically each build via Vite.
const BUILD = import.meta.env.VITE_BUILD_ID ?? Date.now().toString(36);

export function asset(path: string): string {
  // Strip leading slash so we don't double up when BASE already ends with /
  const clean = path.replace(/^\/+/, '');
  return `${BASE}${clean}?b=${BUILD}`;
}

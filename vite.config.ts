import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';

// GitHub Pages serves the app at https://<user>.github.io/bonewake/
// so the base path needs the repo name in production. Locally we serve from /.
const isProd = process.env.NODE_ENV === 'production' || process.env.VITE_BUILD_TARGET === 'pages';
const base = isProd ? '/bonewake-adventure/' : '/';

function safeExec(cmd: string, fallback = ''): string {
  try { return execSync(cmd).toString().trim(); } catch { return fallback; }
}
const APP_VERSION = safeExec('git rev-parse --short HEAD', 'dev');
const APP_COMMIT_MSG = safeExec('git log -1 --pretty=%s', 'Local build');

// The PWA plugin is build-only: in dev it has hung vite startup entirely
// (no log output, port never binds) since the asset library got large, and
// the service worker just fights HMR anyway.
export default defineConfig(({ command }) => ({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_COMMIT_MSG__: JSON.stringify(APP_COMMIT_MSG),
  },
  plugins: [
    react(),
    ...(command !== 'build' ? [] : [VitePWA({
      registerType: 'autoUpdate',
      // Only the icons/favicon ship with the install shell. Sprites and audio
      // are intentionally NOT pre-bundled here — they are fetched on demand and
      // cached at runtime (see runtimeCaching below), so a fresh install is a
      // ~1-2 MB shell instead of the whole ~150 MB asset library.
      includeAssets: ['favicon.svg', 'icons/*.png'],
      workbox: {
        // Bigger limit so the heavy sprite atlases (some >1MB) can be cached
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // Precache ONLY the app shell (code/styles/fonts). Images and audio are
        // deliberately excluded so the service worker can install without
        // downloading hundreds of MB of sprites up front — that was making new
        // installs fail on cellular. They warm into the runtime caches below on
        // first visit, so offline-after-first-load still works.
        globPatterns: ['**/*.{js,css,html,svg,ttf,woff,woff2}'],
        // Sprites can exceed the file budget for precache but are fine at
        // runtime; don't let an oversized atlas abort the SW build.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bonewake-adv-images',
              // ~520 sprites today + headroom for future art. CacheFirst means
              // each sprite downloads once, then serves from cache forever.
              expiration: { maxEntries: 1500, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\.(?:mp3|wav|ogg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'bonewake-adv-audio',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Bonewake Adventure',
        short_name: 'Bonewake Adventure',
        description: 'A dark-fantasy walkable RPG. Find the cure. Offline-first, single-player.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    })]),
  ],
}));

// Tiny image loader + cache for the Adventure canvas blitter. Deliberately
// separate from <SpriteAnimator> (a DOM/CSS background-position tweener) — the
// overworld draws onto a single <canvas>, so it needs raw HTMLImageElements.

const cache = new Map<string, HTMLImageElement>();

// Opaque bounding box of a sprite, so the blitter can normalize on-screen size
// regardless of how much transparent padding the source PNG carries. The pro
// sprites are inconsistently cropped (e.g. kengo_south is 66x109 tight, but
// kengo_east/west are 220x220 with wide margins) — scaling the raw image makes
// the character size jump between facings. Trimming fixes that.
export interface Trim { sx: number; sy: number; sw: number; sh: number; }
const trimCache = new Map<HTMLImageElement, Trim>();

export function getTrim(img: HTMLImageElement): Trim {
  const cached = trimCache.get(img);
  if (cached) return cached;
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const full: Trim = { sx: 0, sy: 0, sw: w, sh: h };
  if (!w || !h) return full;
  try {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    if (!cx) { trimCache.set(img, full); return full; }
    cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    const ALPHA = 16;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > ALPHA) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    const t: Trim = maxX < minX ? full : { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 };
    trimCache.set(img, t);
    return t;
  } catch {
    trimCache.set(img, full);
    return full;
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  const hit = cache.get(src);
  if (hit) {
    if (hit.complete && hit.naturalWidth > 0) return Promise.resolve(hit);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      cache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`failed to load image: ${src}`));
    img.src = src;
  });
}

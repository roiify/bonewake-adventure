import { useEffect, useRef } from 'react';
import { asset } from '../../lib/assetPath';
import { loadImage, getTrim } from '../../lib/adventure/sprites';

// Uniform hero portrait: trims each sprite to its opaque pixels and scales the
// CONTENT to a consistent height, so every hero reads the same size regardless
// of how much transparent padding its source PNG has (which varies a lot).
export default function HeroPortrait({ heroId, w = 48, h = 60 }: { heroId: string; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    const c = ref.current;
    if (!c) return;
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    loadImage(asset(`sprites/pixellab/heroes/pro/${heroId}_south.png`))
      .then((img) => {
        if (!alive) return;
        const tr = getTrim(img);
        // fill height; cap width to frame; bottom-center anchored
        let scale = h / tr.sh;
        if (tr.sw * scale > w) scale = w / tr.sw;
        const dw = tr.sw * scale, dh = tr.sh * scale;
        const dx = Math.round((w - dw) / 2), dy = Math.round(h - dh);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, tr.sx, tr.sy, tr.sw, tr.sh, dx, dy, Math.round(dw), Math.round(dh));
      })
      .catch(() => { /* ignore */ });
    return () => { alive = false; };
  }, [heroId, w, h]);
  return <canvas ref={ref} style={{ imageRendering: 'pixelated', width: w, height: h }} />;
}

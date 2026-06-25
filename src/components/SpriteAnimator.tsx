import { useEffect, useState } from 'react';

interface Props {
  src: string;
  cols: number;
  rows: number;
  fps?: number;
  loop?: boolean;
  size?: number; // displayed size in px (square)
  className?: string;
  paused?: boolean;
  onComplete?: () => void;
}

// Plays a sprite sheet by tweening background-position frame-by-frame.
// Assumes the sheet is a grid of uniform frames, read left-to-right, top-to-bottom.
export default function SpriteAnimator({
  src,
  cols,
  rows,
  fps = 12,
  loop = true,
  size = 96,
  className = '',
  paused = false,
  onComplete,
}: Props) {
  const [frame, setFrame] = useState(0);
  const total = cols * rows;

  useEffect(() => {
    // Single-frame sprites have nothing to animate — skip the interval so
    // static units don't re-render at fps for no reason.
    if (paused || total <= 1) return;
    const interval = setInterval(() => {
      setFrame(f => {
        const next = f + 1;
        if (next >= total) {
          if (loop) return 0;
          if (onComplete) onComplete();
          return total - 1;
        }
        return next;
      });
    }, 1000 / fps);
    return () => clearInterval(interval);
  }, [fps, total, loop, paused, onComplete]);

  useEffect(() => { setFrame(0); }, [src]);

  const col = frame % cols;
  const row = Math.floor(frame / cols);
  // Background size: cols × size × rows (so each cell is `size` px)
  const bgX = -(col * size);
  const bgY = -(row * size);

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${src})`,
        backgroundSize: `${cols * size}px ${rows * size}px`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    />
  );
}

// Static sprite (no animation) — single PNG cropped/sized to fit.
export function StaticSprite({ src, size = 96, className = '', flipX = false }: { src: string; size?: number; className?: string; flipX?: boolean }) {
  return (
    <img
      src={src}
      alt=""
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        objectFit: 'contain',
        transform: flipX ? 'scaleX(-1)' : undefined,
      }}
      className={className}
    />
  );
}

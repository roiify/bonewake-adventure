import type { ReactNode } from 'react';
import { asset } from '../../lib/assetPath';

/**
 * Shared page-header used across every screen so the product feels
 * coherent: Cinzel display title with depth shadow + accent glow,
 * optional tagline, optional right-aligned readout (e.g. resource
 * counters, attempt counts). Pair with a banner image when the page
 * deserves one — see HomePage / HeroesPage / BattlePage for examples.
 */
interface Props {
  title: string;
  tagline?: string;
  /** Hex accent for the glow behind the title (default: red blood). */
  glow?: string;
  /** Optional right-side readout (e.g. "ATTEMPTS 3/5"). */
  rightSlot?: ReactNode;
  /** When supplied, render as banner-style block with a background image. */
  bannerSrc?: string;
}

export default function PageHeader({ title, tagline, glow = '#dc2626', rightSlot, bannerSrc }: Props) {
  if (bannerSrc) {
    return (
      <div
        className="relative rounded-lg overflow-hidden h-24 -mx-3 -mt-3 mb-3 border"
        style={{
          backgroundImage: `url(${bannerSrc})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 55%',
          borderColor: '#5a2222',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 20%, rgba(10,3,3,0.92) 90%)' }} />
        <div className="relative h-full flex items-end justify-between p-3">
          <div>
            <h2
              className="font-fantasy text-xl tracking-widest text-amber-200"
              style={{ textShadow: `0 2px 0 rgba(0,0,0,0.95), 0 0 14px ${glow}88` }}
            >
              {title}
            </h2>
            {tagline && (
              <p className="text-[10px] text-zinc-300 mt-1 text-shadow-deep italic">
                {tagline}
              </p>
            )}
          </div>
          {rightSlot && <div className="text-right">{rightSlot}</div>}
        </div>
      </div>
    );
  }

  // Default (non-banner) header — layered painted Nano Banana banner
  // (section_banner.png) behind the title so every page gets a premium
  // boss-bar feel without a per-page image. The PNG fades to transparent
  // at the edges so it composes nicely on any page background.
  return (
    <div className="relative flex flex-col items-center text-center py-1 mb-1">
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 pointer-events-none"
        style={{
          backgroundImage: `url(${asset('sprites/ui/section_banner.png')})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
          filter: `drop-shadow(0 0 10px ${glow}44)`,
        }}
      />
      <div className="relative z-10 flex items-end justify-between gap-3 w-full px-4">
        <div className="min-w-0 flex-1">
          <h2
            className="font-fantasy text-xl tracking-widest text-amber-200"
            style={{ textShadow: `0 2px 0 rgba(0,0,0,0.95), 0 0 12px ${glow}88` }}
          >
            {title}
          </h2>
          {tagline && (
            <p className="text-[10px] text-zinc-300 leading-snug mt-1 italic">{tagline}</p>
          )}
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
}

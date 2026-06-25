import type { ReactNode } from 'react';
import { asset } from '../../lib/assetPath';

/**
 * Vertical portrait card frame using the painted Nano Banana
 * `hero_card_frame.png` (transparent center, gilded skull corners,
 * empty plate at the bottom for the hero name). Drop a sprite or
 * portrait as children — it'll render inside the transparent center.
 *
 * Reserved for the summon-reveal moment so SSS pulls land in a
 * collectible-card frame, not for every roster cell.
 */
interface Props {
  children: ReactNode;
  /** Optional name overlay placed on the painted plate at the bottom. */
  nameLabel?: string;
  /** Optional accent color for the name overlay glow. */
  nameColor?: string;
  className?: string;
}

export default function HeroFrame({ children, nameLabel, nameColor = '#fde68a', className = '' }: Props) {
  return (
    <div
      className={`relative aspect-[4/5] ${className}`}
      style={{
        backgroundImage: `url(${asset('sprites/ui/hero_card_frame.png')})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Inner clipped area where the portrait lives — sized to land
          inside the painted frame's transparent window. */}
      <div className="absolute inset-x-[14%] top-[11%] bottom-[16%] flex items-center justify-center overflow-hidden">
        {children}
      </div>
      {/* Painted bottom plate label */}
      {nameLabel && (
        <div
          className="absolute left-[16%] right-[16%] bottom-[3%] text-center font-pixel text-[10px] truncate"
          style={{ color: nameColor, textShadow: `0 0 6px ${nameColor}88, 0 1px 0 rgba(0,0,0,0.9)` }}
        >
          {nameLabel}
        </div>
      )}
    </div>
  );
}

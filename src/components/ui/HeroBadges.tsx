// Shared archetype + element badges used by every screen that lists
// heroes (HeroesPage grid, SquadPicker, HeroDetail, Summon reveal,
// pre-battle pickers, etc.) so the visual language is uniform.
//
// Archetype now renders the painted Nano Banana class seal —
// crossed-swords / sigil / shield / cross / dagger discs — instead of
// a unicode glyph. Color stays so the rim glow matches the class
// (red warrior / purple mage / gold tank / green healer / lavender
// assassin) without needing per-asset variations.
import { asset } from '../../lib/assetPath';

const ARCH_BADGE: Record<string, { iconSrc: string; color: string }> = {
  warrior:  { iconSrc: 'sprites/ui/archetype/warrior.png',  color: '#fca5a5' },
  mage:     { iconSrc: 'sprites/ui/archetype/mage.png',     color: '#a78bfa' },
  tank:     { iconSrc: 'sprites/ui/archetype/tank.png',     color: '#fbbf24' },
  healer:   { iconSrc: 'sprites/ui/archetype/healer.png',   color: '#86efac' },
  assassin: { iconSrc: 'sprites/ui/archetype/assassin.png', color: '#c4b5fd' },
};

const ELEMENT_BADGE: Record<string, { glyph: string; color: string }> = {
  fire:  { glyph: '🔥', color: '#fb923c' },
  water: { glyph: '💧', color: '#38bdf8' },
  earth: { glyph: '🌿', color: '#84cc16' },
  light: { glyph: '✨', color: '#fde047' },
  dark:  { glyph: '🌙', color: '#a78bfa' },
};

interface BadgeProps {
  /** Optional size override. Default 20 (w-5 h-5). */
  size?: number;
}

export function ArchetypeBadge({ archetype, size = 20 }: BadgeProps & { archetype: string }) {
  const b = ARCH_BADGE[archetype];
  if (!b) return null;
  return (
    <img
      src={asset(b.iconSrc)}
      alt={archetype}
      title={archetype}
      className="rounded-full"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: `drop-shadow(0 0 3px ${b.color}cc)`,
      }}
    />
  );
}

export function ElementBadge({ element, size = 20 }: BadgeProps & { element?: string }) {
  if (!element) return null;
  const b = ELEMENT_BADGE[element];
  if (!b) return null;
  return (
    <div
      className="rounded-full flex items-center justify-center leading-none"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size - 10),
        background: '#0a0a0aee',
        border: `1px solid ${b.color}`,
        boxShadow: `0 0 4px ${b.color}88`,
      }}
      title={element}
    >
      {b.glyph}
    </div>
  );
}

/**
 * Stacked archetype + element badges anchored to a position.
 * Use inside a `relative` parent. Same look across every hero card.
 */
export function HeroBadges({ archetype, element, size = 20 }: BadgeProps & { archetype: string; element?: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5 pointer-events-none">
      <ArchetypeBadge archetype={archetype} size={size} />
      {element && <ElementBadge element={element} size={size} />}
    </div>
  );
}

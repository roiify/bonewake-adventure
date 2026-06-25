import type { OwnedEquipment } from './db';

// Lineage 2-style weapon-upgrade aura. Hero glow tier is derived from the
// highest `upgradeLevel` across the hero's currently equipped pieces.
// Painted bosses get a fixed tier 2 so they always look menacing in battle.
export type GlowTier = 0 | 1 | 2 | 3 | 4;

export function glowTierFromLevel(maxUpgradeLevel: number): GlowTier {
  if (maxUpgradeLevel >= 20) return 4; // +20 (max) — divine gold/white
  if (maxUpgradeLevel >= 15) return 3; // +15-19 — rainbow
  if (maxUpgradeLevel >= 10) return 2; // +10-14 — red-orange pulse
  if (maxUpgradeLevel >= 5)  return 1; // +5-9   — cool blue static
  return 0;
}

// Glow now follows the WEAPON slot only — swapping to a fresh weapon drops
// the aura back to 0 until you re-upgrade it. (Was: max across all slots.)
export function heroGlowTier(heroId: string, equipment: OwnedEquipment[]): GlowTier {
  let max = 0;
  for (const e of equipment) {
    if (e.equippedTo !== heroId) continue;
    if (e.slot !== 'weapon') continue;
    const lvl = e.upgradeLevel ?? 0;
    if (lvl > max) max = lvl;
  }
  return glowTierFromLevel(max);
}

// Per-equipment helper for rendering glow on item icons (bag, inventory,
// hero-detail). Returns the tier this single piece's upgradeLevel earns.
export function itemGlowTier(eq: OwnedEquipment): GlowTier {
  if (eq.slot !== 'weapon') return 0; // glow is weapons-only
  return glowTierFromLevel(eq.upgradeLevel ?? 0);
}

// In-battle weapon-glow positioning. Each hero gets an anchor rect inside
// their sprite frame (percentages, 0..1) that says "this is where the
// weapon is held". Battle renders both:
//   - Approach A: a soft glowing orb (radial gradient) at the anchor center
//   - Approach B: a clipped duplicate of the sprite, masked to this rect,
//     with the tier's glow filter applied — only the weapon pixels light up
// Defaults assume east-facing player heroes (weapon held to the right of
// the body). Override per-hero as we tune.
// Weapon anchor in the battle container. Bottom-anchored coords match how
// heroes are placed (items-end), so cy maps directly to "how far up from
// the floor the weapon sits".
//   cx   — orb center, fraction from LEFT (0=left edge, 1=right edge)
//   cy   — orb center, fraction from BOTTOM (0=feet/floor, 1=container top)
//   size — orb diameter, fraction of container
export interface WeaponAnchor { cx: number; cy: number; size: number; }
const DEFAULT_ANCHOR: WeaponAnchor = { cx: 0.60, cy: 0.50, size: 0.28 };
export const HERO_WEAPON_ANCHORS: Record<string, WeaponAnchor> = {
  // Tanks / warriors — weapon held mid-body.
  kaius:          { cx: 0.50, cy: 0.45, size: 0.30 }, // sword + shield
  bone_king:      { cx: 0.50, cy: 0.50, size: 0.32 }, // greatsword center
  // Samurai — twin katanas span wide at the waist.
  reiji:          { cx: 0.50, cy: 0.45, size: 0.55 },
  // Mages — staff/crystal held high.
  pyra:           { cx: 0.60, cy: 0.65, size: 0.28 }, // flame tip upper-right
  george:         { cx: 0.65, cy: 0.70, size: 0.30 }, // bone staff top
  manny:          { cx: 0.60, cy: 0.75, size: 0.30 }, // crystal staff top
  aelia:          { cx: 0.55, cy: 0.70, size: 0.28 }, // staff crystal
  lich_sovereign: { cx: 0.62, cy: 0.50, size: 0.25 }, // casting-hand orb
  luna:           { cx: 0.45, cy: 0.50, size: 0.22 },
  // Rangers / assassins.
  elara:          { cx: 0.50, cy: 0.50, size: 0.45 }, // bow held horizontal
  len:            { cx: 0.55, cy: 0.40, size: 0.28 }, // twin daggers
  korvan:         { cx: 0.60, cy: 0.55, size: 0.38 }, // scythe blade
  twins:          { cx: 0.50, cy: 0.50, size: 0.50 }, // both blades
  // Bare-handed.
  kengo:          { cx: 0.45, cy: 0.45, size: 0.18 },
  chino:          { cx: 0.55, cy: 0.45, size: 0.18 },
};
export function getWeaponAnchor(heroTemplateId: string): WeaponAnchor {
  return HERO_WEAPON_ANCHORS[heroTemplateId] ?? DEFAULT_ANCHOR;
}

// CSS color triple per tier for the orb (Approach A). Uses radial-gradient.
export function glowOrbColor(tier: GlowTier): string {
  switch (tier) {
    case 1: return '#60a5fa'; // blue
    case 2: return '#f97316'; // orange
    case 3: return '#ec4899'; // magenta (rainbow center)
    case 4: return '#fde047'; // gold (divine)
    default: return 'transparent';
  }
}

// Static drop-shadow chain for tier 1 (no animation). Tiers 2/3 pulse via
// CSS keyframes defined in index.css — return the class name instead.
// Tier 1 = subtle cool blue halo (distinctly cooler/quieter than tier 2's
// warm orange pulse, so the two tiers read as different colors at a glance).
export function glowFilter(tier: GlowTier): string {
  switch (tier) {
    case 1: return 'drop-shadow(0 0 4px #60a5fa) drop-shadow(0 0 2px #bfdbfe)';
    default: return '';
  }
}

export function glowClass(tier: GlowTier): string {
  switch (tier) {
    case 2: return 'glow-pulse-orange';
    case 3: return 'glow-pulse-rainbow';
    case 4: return 'glow-pulse-divine';
    default: return '';
  }
}

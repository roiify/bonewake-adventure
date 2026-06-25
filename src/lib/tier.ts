// Star → Tier label mapping for the Echoes roster.
// Star is stored as a number in OwnedHero; this maps it to display tier.
// 3 = S   (base, freshly pulled)
// 4 = SS  (first promotion)
// 5 = SSS (second promotion)
// 6 = SSS+ (max promotion, post-cap)

export const TIER_LABELS: Record<number, string> = {
  1: 'S',
  2: 'S',
  3: 'S',
  4: 'SS',
  5: 'SSS',
  6: 'SSS+',
};

export const TIER_COLORS: Record<number, string> = {
  3: '#9ca3af',  // S — gray
  4: '#60a5fa',  // SS — blue
  5: '#a855f7',  // SSS — violet
  6: '#f59e0b',  // SSS+ — gold
};

export function tierLabel(star: number): string {
  return TIER_LABELS[star] ?? 'S';
}

export function tierColor(star: number): string {
  return TIER_COLORS[star] ?? '#9ca3af';
}

// Next tier name (for "Promote to ___" UI)
export function nextTierLabel(currentStar: number): string {
  return TIER_LABELS[currentStar + 1] ?? 'MAX';
}

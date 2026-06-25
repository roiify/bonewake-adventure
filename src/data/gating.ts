// Features unlock at certain player levels — paces discovery for new players.
// "Gated" features show a locked overlay below the gate level.

export interface FeatureGate {
  path: string;
  label: string;
  unlockLevel: number;
  hint: string;
}

export const FEATURE_GATES: FeatureGate[] = [
  { path: '/dungeons',     label: 'Material Dungeons', unlockLevel: 5,  hint: 'Reach player level 5 to unlock.' },
  { path: '/tower',        label: 'Tower of Trials',   unlockLevel: 8,  hint: 'Reach player level 8 to unlock.' },
  { path: '/craft',        label: 'Ultimate Crafting', unlockLevel: 10, hint: 'Reach player level 10 to unlock.' },
  { path: '/worldboss',    label: 'World Boss',        unlockLevel: 15, hint: 'Reach player level 15 to unlock.' },
];

export const GATE_BY_PATH: Record<string, FeatureGate> = Object.fromEntries(FEATURE_GATES.map(g => [g.path, g]));

export function isUnlocked(path: string, level: number): boolean {
  const g = GATE_BY_PATH[path];
  if (!g) return true;
  return level >= g.unlockLevel;
}

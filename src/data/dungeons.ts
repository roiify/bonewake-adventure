// Material Dungeons — themed farming, weekday rotation, guaranteed targeted rewards.
import { buildEnemyUnit } from '../lib/stats';
import type { CombatUnit } from '../types';

export type DungeonKind = 'gold' | 'xp' | 'gear' | 'gem';

export interface DungeonTier {
  tier: 1 | 2 | 3;
  name: string;
  energyCost: number;
  enemyLevel: number;
  enemyStar: number;
  rewards: {
    gold?: number;
    exp?: number;
    gems?: number;
    equipmentMinRarity?: 1 | 2 | 3 | 4 | 5;
    equipmentCount?: number;
    // Economy alignment — tier-3 dungeons now also contribute to the
    // ult-gear loop. Soulshard is a flat count; essence drops on a
    // random hero so it doesn't trivialize specific-hero targeting.
    soulshard?: number;
    essenceRandomCount?: number;
  };
}

export interface DungeonDef {
  id: DungeonKind;
  name: string;
  description: string;
  emoji: string;
  enemyTemplateIds: string[];        // What enemies appear
  availableWeekdays: number[];       // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  tiers: DungeonTier[];
}

export const DUNGEONS: DungeonDef[] = [
  {
    id: 'gold',
    name: 'Gold Mine',
    description: 'Crack open the bone hoard. Heavy gold drops.',
    emoji: '⛏️',
    enemyTemplateIds: ['shambler', 'boneknight'],
    availableWeekdays: [1, 4], // Mon, Thu
    tiers: [
      { tier: 1, name: 'Surface Vein', energyCost: 6,  enemyLevel: 5,  enemyStar: 3, rewards: { gold: 800 } },
      { tier: 2, name: 'Deep Shaft',   energyCost: 12, enemyLevel: 15, enemyStar: 4, rewards: { gold: 2200 } },
      { tier: 3, name: 'Mother Lode',  energyCost: 20, enemyLevel: 30, enemyStar: 5, rewards: { gold: 5500, soulshard: 6 } },
    ],
  },
  {
    id: 'xp',
    name: 'XP Grove',
    description: 'Slow ghouls offer up their unlife as fuel.',
    emoji: '🌿',
    enemyTemplateIds: ['fastghoul', 'shambler'],
    availableWeekdays: [2, 5], // Tue, Fri
    tiers: [
      { tier: 1, name: 'Whispering Pines', energyCost: 6,  enemyLevel: 5,  enemyStar: 3, rewards: { exp: 300 } },
      { tier: 2, name: 'Twilight Glade',   energyCost: 12, enemyLevel: 15, enemyStar: 4, rewards: { exp: 800 } },
      { tier: 3, name: 'Heart of the Grove',energyCost:20, enemyLevel: 30, enemyStar: 5, rewards: { exp: 2000 } },
    ],
  },
  {
    id: 'gear',
    name: 'Equipment Trove',
    description: 'Old armory haunted by gear-hungry knights.',
    emoji: '🎁',
    enemyTemplateIds: ['boneknight', 'fastghoul'],
    availableWeekdays: [3, 6], // Wed, Sat
    tiers: [
      { tier: 1, name: 'Old Armory',      energyCost: 8,  enemyLevel: 5,  enemyStar: 3, rewards: { equipmentMinRarity: 2, equipmentCount: 2 } },
      { tier: 2, name: 'Knight\'s Hoard', energyCost: 14, enemyLevel: 15, enemyStar: 4, rewards: { equipmentMinRarity: 3, equipmentCount: 2 } },
      { tier: 3, name: 'Royal Vault',     energyCost: 22, enemyLevel: 30, enemyStar: 5, rewards: { equipmentMinRarity: 4, equipmentCount: 2, soulshard: 10, essenceRandomCount: 2 } },
    ],
  },
  {
    id: 'gem',
    name: 'Gem Geode',
    description: 'The lich\'s cache yields gems.',
    emoji: '💎',
    enemyTemplateIds: ['graveyardlich', 'boneknight'],
    availableWeekdays: [0], // Sunday only — rarest
    tiers: [
      { tier: 1, name: 'Cracked Geode', energyCost: 10, enemyLevel: 10, enemyStar: 3, rewards: { gems: 25 } },
      { tier: 2, name: 'Sealed Vault',  energyCost: 18, enemyLevel: 20, enemyStar: 4, rewards: { gems: 75 } },
      { tier: 3, name: 'Lich\'s Trove', energyCost: 28, enemyLevel: 35, enemyStar: 5, rewards: { gems: 200, soulshard: 8, essenceRandomCount: 3 } },
    ],
  },
];

// All dungeons are available every day. This is a single-player, offline
// game — there is no live economy to protect by weekday-gating the primary
// material faucets, and the old rotation (gold only Mon/Thu, gems Sunday-only)
// just created dead days that compounded with the energy crunch. Energy cost
// is the real throttle. The `availableWeekdays` field is retained on the data
// for potential future event use but no longer gates access.
export function dungeonsForToday(): DungeonDef[] {
  return DUNGEONS;
}

export function buildDungeonTeam(def: DungeonDef, tier: DungeonTier): CombatUnit[] {
  return def.enemyTemplateIds.slice(0, 3).map((tid, i) =>
    buildEnemyUnit(tid, tier.enemyLevel + (i === 1 ? 2 : 0), tier.enemyStar, `dgn_${i}`)
  ).concat(
    def.enemyTemplateIds.length < 3
      ? Array.from({ length: 3 - def.enemyTemplateIds.length }).map((_, i) =>
          buildEnemyUnit(def.enemyTemplateIds[0], tier.enemyLevel, tier.enemyStar, `dgn_pad_${i}`)
        )
      : []
  );
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function weekdayNames(days: number[]): string {
  return days.map(d => WEEKDAY_NAMES[d]).join(', ');
}

export const DUNGEON_BY_ID: Record<string, DungeonDef> = Object.fromEntries(DUNGEONS.map(d => [d.id, d]));

// First-clear tracking — once a (dungeon, tier) is cleared by playing
// through the battle, the player unlocks the instant-skip button for it.
const DGN_CLEAR_KEY = 'bonewake_dungeon_clears';
type DungeonClearMap = Record<string, true>;
function loadDungeonClears(): DungeonClearMap {
  try { return JSON.parse(localStorage.getItem(DGN_CLEAR_KEY) ?? '{}'); } catch { return {}; }
}
export function dungeonClearKey(dungeonId: string, tier: number): string {
  return `${dungeonId}-t${tier}`;
}
export function hasClearedDungeon(dungeonId: string, tier: number): boolean {
  return !!loadDungeonClears()[dungeonClearKey(dungeonId, tier)];
}
export function markDungeonCleared(dungeonId: string, tier: number): void {
  const map = loadDungeonClears();
  map[dungeonClearKey(dungeonId, tier)] = true;
  localStorage.setItem(DGN_CLEAR_KEY, JSON.stringify(map));
}

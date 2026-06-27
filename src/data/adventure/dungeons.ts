import type { AdventureMap, Biome } from './types';
import { makeGrid, type Rect } from './buildMap';

// Floor-based dungeons. Pick one from the town board; each is a descent of
// procedurally-built floors. Clear every enemy on a floor to reveal the stairs
// down; an exit portal back to town is always available so you can bail to a
// lesser dungeon and grind. Harder dungeons start at a higher level.
export interface DungeonDef {
  id: string;
  name: string;
  biome: Biome;
  baseLevel: number;     // enemy level on floor 1
  enemies: string[];     // ENEMIES pool
  blurb: string;
  unlockReq?: { dungeon: string; floor: number }; // must reach this floor in another dungeon first
}

export const DUNGEONS: DungeonDef[] = [
  { id: 'burial', name: 'The Old Burial Ground', biome: 'crypt', baseLevel: 1, enemies: ['shambler', 'fastghoul', 'boneknight', 'graveyardlich'], blurb: 'Shallow graves. Where every survivor cuts their teeth.' },
  { id: 'wastes', name: 'The Scorched Wastes', biome: 'field', baseLevel: 8, enemies: ['fastghoul', 'boneknight', 'shambler', 'graveyardlich'], blurb: 'Open ash-fields crawling with fast dead.', unlockReq: { dungeon: 'burial', floor: 5 } },
  { id: 'necropolis', name: 'The Necropolis', biome: 'crypt', baseLevel: 16, enemies: ['boneknight', 'graveyardlich', 'fastghoul'], blurb: 'The dead\'s own city. Bring a leveled party.', unlockReq: { dungeon: 'wastes', floor: 5 } },
];

export const DUNGEON_BY_ID: Record<string, DungeonDef> = Object.fromEntries(DUNGEONS.map((d) => [d.id, d]));

// A dungeon is unlocked once you've reached the required floor in its prerequisite.
export function isUnlocked(d: DungeonDef, depth: Record<string, number>): boolean {
  return !d.unlockReq || (depth[d.unlockReq.dungeon] ?? 0) >= d.unlockReq.floor;
}

export const floorLevel = (d: DungeonDef, floor: number) => d.baseLevel + Math.floor((floor - 1) * 1.5);
export const floorCount = (floor: number) => Math.min(12, 4 + Math.floor(floor * 0.7));
export const isBossFloor = (floor: number) => floor % 5 === 0;
export const floorMapId = (dungeonId: string, floor: number) => `dgn_${dungeonId}_${floor}`;

// Deterministic floor layout so a reload regenerates the same room.
export function genFloor(d: DungeonDef, floor: number): AdventureMap {
  const W = 17, H = 13;
  const seed = (floor * 2654435761) % 1000;
  // Isolated 1×1 pillars in the interior only — never touching a wall or sitting
  // on the spawn / stairs / exit lanes, so nothing can box an enemy into a pocket.
  const spots: [number, number][] = [[4, 4], [W - 5, 4], [4, H - 5], [W - 5, H - 5], [6, 6], [W - 7, H - 7]];
  const rects: Rect[] = [];
  const used = new Set<number>();
  const n = 2 + (seed % 2);
  for (let i = 0; i < n; i++) { const idx = (seed + i * 3) % spots.length; if (used.has(idx)) continue; used.add(idx); const [x, y] = spots[idx]; rects.push({ x, y, w: 1, h: 1 }); }
  const grid = makeGrid(W, H, rects);
  return {
    id: floorMapId(d.id, floor),
    name: `${d.name} · Floor ${floor}`,
    biome: d.biome,
    music: 'menu',
    tile: 32,
    ...grid,
    spawn: { x: Math.floor(W / 2), y: H - 2, facing: 'north' },
    dungeon: {
      id: d.id, floor, enemies: d.enemies, count: floorCount(floor), level: floorLevel(d, floor), boss: isBossFloor(floor),
      descend: { x: Math.floor(W / 2), y: 1 },
      exit: { x: 1, y: H - 2 },
    },
  };
}

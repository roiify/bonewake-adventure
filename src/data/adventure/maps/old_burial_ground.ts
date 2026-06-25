import type { AdventureMap } from '../types';
import { makeGrid } from '../buildMap';

// THE OLD BURIAL GROUND — the slice dungeon. Bottom room: entrance, Elara
// recruit, Bone Shrine, patrolling bone-knights + crypt random encounters.
// A gate (opens once the gate-patrol is down) leads up to the boss chamber:
// The First Lich (graveyardlich + boss banter). Beat it -> the Cure Fragment.
const W = 20;
const H = 18;
const grid = makeGrid(W, H, [
  // dividing wall at y=9 with a single gap (the gate) at x=9
  { x: 1, y: 9, w: 8, h: 1 },
  { x: 10, y: 9, w: 9, h: 1 },
  // crypt pillars / headstones
  { x: 4, y: 5, w: 1, h: 1 }, { x: 14, y: 5, w: 1, h: 1 },
  { x: 4, y: 12, w: 1, h: 1 }, { x: 15, y: 12, w: 1, h: 1 },
]);

export const OLD_BURIAL_GROUND: AdventureMap = {
  id: 'old_burial_ground',
  name: 'The Old Burial Ground',
  biome: 'crypt',
  music: 'menu',
  tile: 32,
  ...grid,
  spawn: { x: 2, y: 14, facing: 'east' },
  npcs: [
    // Elara reveals herself at the dungeon mouth (Act I optional recruit).
    { id: 'elara', sprite: 'elara', x: 5, y: 14, facing: 'east', dialogueId: 'elara_recruit', recruits: 'elara', hideAfterFlag: 'recruited_elara' },
  ],
  signs: [
    { x: 16, y: 12, dialogueId: 'corpse_note' },
    { x: 12, y: 2, dialogueId: 'ch2_wall' },
  ],
  shrines: [{ x: 3, y: 14 }],
  gateDoors: [{ x: 9, y: 9, openFlag: 'gate_patrol_down' }],
  encounterZones: [
    { x: 2, y: 10, w: 16, h: 5, enemies: ['fastghoul', 'boneknight', 'graveyardlich'], min: 1, max: 2, minLevel: 5, maxLevel: 7, dangerBase: 20, bgChapter: 4 },
  ],
  fixedEncounters: [
    // gate patrol — beating it opens the gate to the boss chamber
    { id: 'gate_patrol', sprite: 'boneknight', x: 9, y: 11, facing: 'south', enemies: ['boneknight', 'fastghoul'], levels: [7, 6], bgChapter: 4, setsFlag: 'gate_patrol_down' },
    // optional elite guarding an alcove
    { id: 'crypt_elite', sprite: 'graveyardlich', x: 15, y: 14, facing: 'west', enemies: ['graveyardlich'], levels: [8], bgChapter: 4, setsFlag: 'elite_down' },
    // THE FIRST LICH — boss
    { id: 'first_lich', sprite: 'graveyardlich', x: 9, y: 4, facing: 'south', enemies: ['graveyardlich'], levels: [10], bgChapter: 4, bossBanterId: '1-5', isBoss: true, setsFlag: 'beat_first_lich' },
  ],
  pickups: [
    { id: 'cure_frag', x: 9, y: 2, setsFlag: 'have_cure_fragment', dialogueId: 'cure_fragment', requiresFlag: 'beat_first_lich' },
  ],
  warps: [
    { x: 1, y: 14, toMap: 'forsaken_crossing', toX: 18, toY: 5, facing: 'west' },
  ],
};

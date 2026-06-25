import type { AdventureMap } from '../types';
import { makeGrid } from '../buildMap';

// FORSAKEN CROSSING — the field between Lastlight (W) and the Old Burial Ground
// (E). Step-accumulator random encounters (shambler/fastghoul) + one visible
// bone-knight you can fight or skirt. Rotted farmland, dead trees, headstones.
const W = 22;
const H = 12;
const grid = makeGrid(W, H, [
  { x: 3, y: 2, w: 1, h: 1 }, { x: 9, y: 2, w: 1, h: 1 }, { x: 16, y: 2, w: 1, h: 1 },
  { x: 6, y: 8, w: 1, h: 1 }, { x: 13, y: 8, w: 1, h: 1 }, { x: 18, y: 3, w: 1, h: 1 },
]);

export const FORSAKEN_CROSSING: AdventureMap = {
  id: 'forsaken_crossing',
  name: 'Forsaken Crossing',
  biome: 'field',
  music: 'menu',
  tile: 32,
  ...grid,
  spawn: { x: 2, y: 5, facing: 'east' },
  npcs: [
    { id: 'refugee', sprite: 'chino', x: 3, y: 8, facing: 'east', dialogueId: 'refugee' },
  ],
  signs: [{ x: 10, y: 9, dialogueId: 'crossing_sign' }],
  encounterZones: [
    { x: 4, y: 2, w: 14, h: 8, enemies: ['shambler', 'fastghoul'], min: 1, max: 2, minLevel: 2, maxLevel: 4, dangerBase: 24, bgChapter: 1 },
  ],
  fixedEncounters: [
    { id: 'crossing_knight', sprite: 'boneknight', x: 11, y: 3, facing: 'south', enemies: ['boneknight', 'fastghoul'], levels: [6, 5], bgChapter: 1, setsFlag: 'crossing_knight_down' },
  ],
  warps: [
    { x: 1, y: 5, toMap: 'lastlight', toX: 17, toY: 6, facing: 'west' },
    { x: 20, y: 5, toMap: 'old_burial_ground', toX: 2, toY: 14, facing: 'east' },
  ],
};

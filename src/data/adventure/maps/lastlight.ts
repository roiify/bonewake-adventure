import type { AdventureMap } from '../types';
import { makeGrid } from '../buildMap';

// LASTLIGHT — the hub town: a walled survivor holdfast on the edge of the
// Forsaken Fields. NPCs use stand-in hero sprites (real town-NPC art is an
// asset gap); their name labels make who's who clear. East gate -> Crossing.
const W = 20;
const H = 14;
const grid = makeGrid(W, H, [
  { x: 3, y: 2, w: 2, h: 2 },   // hut
  { x: 14, y: 2, w: 2, h: 2 },  // hut
  { x: 3, y: 10, w: 2, h: 2 },  // hut
  { x: 14, y: 10, w: 2, h: 2 }, // hut
  { x: 10, y: 8, w: 1, h: 1 },  // dead tree
]);

export const LASTLIGHT: AdventureMap = {
  id: 'lastlight',
  name: 'Lastlight',
  biome: 'town',
  music: 'menu',
  tile: 32,
  ...grid,
  spawn: { x: 9, y: 6, facing: 'south' },
  npcs: [
    // The only town NPC — hire/swap a mercenary companion (shops/stash/etc. are top-menu buttons).
    { id: 'mercenary', sprite: 'korvan', x: 11, y: 6, facing: 'south', dialogueId: 'mercenary' },
  ],
  shrines: [{ x: 3, y: 5 }],
  // No overworld door — dungeons are entered from the board / Mercenary hub.
};

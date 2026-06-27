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
    { id: 'mara', sprite: 'aelia', x: 9, y: 3, facing: 'south', dialogueId: 'mara', altDialogueId: 'mara__done', altFlag: 'have_cure_fragment' },
    { id: 'joss', sprite: 'george', x: 7, y: 4, facing: 'south', dialogueId: 'joss', shop: true },
    { id: 'tender', sprite: 'pyra', x: 13, y: 8, facing: 'south', dialogueId: 'tender', heal: true },
    // The Warden — talk to choose a dungeon descent.
    { id: 'warden', sprite: 'kengo', x: 11, y: 6, facing: 'south', dialogueId: 'warden' },
    // Luna is recruited here in town (Act I).
    { id: 'luna', sprite: 'luna', x: 5, y: 8, facing: 'east', dialogueId: 'luna_recruit', recruits: 'luna', hideAfterFlag: 'recruited_luna' },
  ],
  shrines: [{ x: 3, y: 5 }],
  warps: [
    { x: 18, y: 6, toMap: 'forsaken_crossing', toX: 2, toY: 5, facing: 'east' },
  ],
};

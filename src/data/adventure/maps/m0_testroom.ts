import type { AdventureMap, Dir } from '../types';

// M0 spike test room, authored as ASCII for readability.
//   #  wall (solid)     o  pillar (solid)
//   .  floor            P  player spawn
// The room (20x15) is intentionally larger than the 15x11 viewport so the
// camera-follow + edge-clamping can be verified by walking to every wall.
const LAYOUT: string[] = [
  '####################',
  '#..................#',
  '#..####......####..#',
  '#..................#',
  '#....o........o....#',
  '#..................#',
  '#..................#',
  '#.......P..........#',
  '#..................#',
  '#..................#',
  '#....o........o....#',
  '#..................#',
  '#..####......####..#',
  '#..................#',
  '####################',
];

function build(layout: string[]): AdventureMap {
  const h = layout.length;
  const w = layout[0].length;
  const ground = new Array<number>(w * h);
  const solid = new Array<number>(w * h).fill(0);
  let spawn = { x: 1, y: 1, facing: 'south' as Dir };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const c = layout[y][x];
      // subtle checker variant for the floor renderer
      ground[i] = (x + y) % 2;
      if (c === '#' || c === 'o') solid[i] = 1;
      if (c === 'P') spawn = { x, y, facing: 'south' };
    }
  }

  return { id: 'm0_testroom', name: 'M0 Test Crypt', w, h, tile: 32, ground, solid, spawn };
}

export const M0_TESTROOM: AdventureMap = build(LAYOUT);

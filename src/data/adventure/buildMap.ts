// Rect-based terrain builder — auto-borders the map and fills solid rectangles
// (walls, buildings, headstone clusters). Avoids the off-by-one pitfalls of
// hand-counted ASCII rows. Entities (NPCs, warps, encounters, shrines, pickups)
// are placed by coordinate in each map file.

export interface Rect { x: number; y: number; w: number; h: number; }

export function makeGrid(
  w: number,
  h: number,
  solidRects: Rect[] = [],
): { w: number; h: number; ground: number[]; solid: number[] } {
  const ground = new Array<number>(w * h);
  const solid = new Array<number>(w * h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      ground[y * w + x] = (x + y) % 2; // cosmetic checker
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) solid[y * w + x] = 1; // border
    }
  }
  for (const r of solidRects) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        if (x >= 0 && y >= 0 && x < w && y < h) solid[y * w + x] = 1;
      }
    }
  }
  return { w, h, ground, solid };
}

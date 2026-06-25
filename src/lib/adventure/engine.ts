// AdventureEngine — the M1 walkable-RPG overworld. A plain class owning one
// requestAnimationFrame loop that renders a tile map + entities to a canvas and
// drives the explore loop: move/collide, talk to NPCs, read signs, save at
// shrines, pick up items, open gates, warp between maps, and trigger battles
// (random step-accumulator + visible/bump enemies) that hand off to the existing
// combat engine via React. State changes (flags/recruits/defeated) are applied
// by React/stores; the engine just reports them via callbacks. See RPG_DESIGN.md.

import { asset } from '../assetPath';
import { loadImage, getTrim } from './sprites';
import type { AdventureMap, Dir, NPC, FixedEncounter, EncounterZone } from '../../data/adventure/types';
import { ADVENTURE_MAPS } from '../../data/adventure/maps';

const VIEW_W = 15;
const VIEW_H = 11;
const STEP_MS = 140;
const GRACE_STEPS = 8;

export interface BattleRequest {
  enemies: { templateId: string; level: number; star?: number }[];
  chapter: number;
  bossBanterId?: string;
  isBoss?: boolean;
  xp: number;
  fixedId?: string;
  setsFlag?: string;
}

export interface DialogueRequest {
  dialogueId: string;
  npcId?: string;
  recruits?: string;
  shop?: boolean;
  heal?: boolean;
  pickupId?: string;
  setsFlag?: string;
}

export interface EngineCallbacks {
  onDialogue: (req: DialogueRequest) => void;
  onBattle: (req: BattleRequest) => void;
  onShrine: () => void;
  onAutosave: (mapId: string, x: number, y: number, facing: Dir) => void;
  onHud?: (info: { map: string; x: number; y: number; facing: Dir }) => void;
}

export interface EngineInit {
  mapId: string;
  x: number;
  y: number;
  facing: Dir;
  leaderSprite: string;             // player avatar sprite key (heroes/pro)
  flags: Record<string, boolean>;
  defeated: string[];
  cb: EngineCallbacks;
}

const DIR_KEYS: Record<string, Dir> = {
  ArrowUp: 'north', KeyW: 'north', ArrowDown: 'south', KeyS: 'south',
  ArrowLeft: 'west', KeyA: 'west', ArrowRight: 'east', KeyD: 'east',
};
const ACTION_KEYS = new Set(['Space', 'Enter', 'KeyE', 'KeyZ']);
const DELTA: Record<Dir, [number, number]> = { north: [0, -1], south: [0, 1], west: [-1, 0], east: [1, 0] };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

type Palette = { floorA: string; floorB: string; face: string; top: string; base: string; accent: string };
const PALETTES: Record<string, Palette> = {
  town: { floorA: '#2a2620', floorB: '#252019', face: '#3a3128', top: '#4c4034', base: '#191309', accent: '#6b4a2a' },
  field: { floorA: '#22281b', floorB: '#1d2317', face: '#2e3a25', top: '#3f4c30', base: '#121a0e', accent: '#3b5a2a' },
  crypt: { floorA: '#1a1822', floorB: '#15131d', face: '#2a2734', top: '#3b3749', base: '#0d0b12', accent: '#5a3a6b' },
};

export class AdventureEngine {
  private ctx: CanvasRenderingContext2D;
  private map!: AdventureMap;
  private tile = 32;
  private cb: EngineCallbacks;
  private leaderSprite: string;

  private flags: Record<string, boolean>;
  private defeated: Set<string>;

  private raf = 0;
  private running = false;
  private paused = false;
  private held: Dir[] = [];

  private tx = 0; private ty = 0; private px = 0; private py = 0;
  private facing: Dir = 'south';
  private moving = false;
  private fromX = 0; private fromY = 0; private toX = 0; private toY = 0;
  private moveStart = 0; private moveProgress = 0;

  private danger = 0;
  private grace = GRACE_STEPS;

  private cache = new Map<string, HTMLImageElement | null>();

  constructor(canvas: HTMLCanvasElement, init: EngineInit) {
    this.cb = init.cb;
    this.leaderSprite = init.leaderSprite;
    this.flags = { ...init.flags };
    this.defeated = new Set(init.defeated);
    canvas.width = VIEW_W * this.tile;
    canvas.height = VIEW_H * this.tile;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.setMap(init.mapId, init.x, init.y, init.facing);
  }

  // --- lifecycle ---
  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.raf = requestAnimationFrame(this.loop);
  }
  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.held = [];
  }

  // --- React control ---
  pause(): void { this.paused = true; this.held = []; }
  resume(): void { this.paused = false; this.grace = GRACE_STEPS; }
  syncState(s: { flags?: Record<string, boolean>; defeated?: string[] }): void {
    if (s.flags) this.flags = { ...s.flags };
    if (s.defeated) this.defeated = new Set(s.defeated);
  }
  setVirtualDir(dir: Dir, down: boolean): void {
    if (down) { if (!this.held.includes(dir)) this.held.push(dir); }
    else this.held = this.held.filter((d) => d !== dir);
  }
  action(): void { if (!this.paused && !this.moving) this.interact(); }

  // --- input ---
  private onKeyDown = (e: KeyboardEvent): void => {
    if (ACTION_KEYS.has(e.code)) { e.preventDefault(); this.action(); return; }
    const d = DIR_KEYS[e.code];
    if (!d) return;
    e.preventDefault();
    if (!e.repeat && !this.held.includes(d)) this.held.push(d);
  };
  private onKeyUp = (e: KeyboardEvent): void => {
    const d = DIR_KEYS[e.code];
    if (d) this.held = this.held.filter((x) => x !== d);
  };

  // --- map / state queries ---
  private setMap(mapId: string, x: number, y: number, facing: Dir): void {
    const m = ADVENTURE_MAPS[mapId];
    if (!m) throw new Error(`unknown map ${mapId}`);
    this.map = m;
    this.tile = m.tile;
    const sx = x < 0 ? m.spawn.x : x;
    const sy = y < 0 ? m.spawn.y : y;
    this.tx = sx; this.ty = sy;
    this.px = sx * this.tile; this.py = sy * this.tile;
    this.facing = facing;
    this.danger = 0; this.grace = GRACE_STEPS; this.moving = false;
    this.cb.onHud?.({ map: m.id, x: sx, y: sy, facing });
  }

  private npcVisible(n: NPC): boolean {
    if (n.hideAfterFlag && this.flags[n.hideAfterFlag]) return false;
    if (n.requiresFlag && !this.flags[n.requiresFlag]) return false;
    return true;
  }
  private fixedActive(f: FixedEncounter): boolean {
    if (this.defeated.has(f.id)) return false;
    if (f.requiresFlag && !this.flags[f.requiresFlag]) return false;
    return true;
  }
  private npcAt(x: number, y: number): NPC | undefined {
    return (this.map.npcs ?? []).find((n) => n.x === x && n.y === y && this.npcVisible(n));
  }
  private fixedAt(x: number, y: number): FixedEncounter | undefined {
    return (this.map.fixedEncounters ?? []).find((f) => f.x === x && f.y === y && this.fixedActive(f));
  }
  private gateClosedAt(x: number, y: number): boolean {
    return (this.map.gateDoors ?? []).some((g) => g.x === x && g.y === y && !this.flags[g.openFlag]);
  }
  private signAt(x: number, y: number) {
    return (this.map.signs ?? []).find((s) => s.x === x && s.y === y);
  }

  private solidBase(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return true;
    return this.map.solid[y * this.map.w + x] === 1;
  }
  private blocked(x: number, y: number): boolean {
    return this.solidBase(x, y) || this.gateClosedAt(x, y) || !!this.npcAt(x, y) || !!this.signAt(x, y);
  }

  // --- movement / triggers ---
  private tryStep(now: number): void {
    const dir = this.held[this.held.length - 1];
    if (!dir) return;
    this.facing = dir;
    const [dx, dy] = DELTA[dir];
    const nx = this.tx + dx, ny = this.ty + dy;
    const fixed = this.fixedAt(nx, ny);
    if (fixed) { this.startBattle(fixed); return; }   // bump = battle
    if (this.blocked(nx, ny)) { this.cb.onHud?.({ map: this.map.id, x: this.tx, y: this.ty, facing: this.facing }); return; }
    this.fromX = this.tx; this.fromY = this.ty; this.toX = nx; this.toY = ny;
    this.moveStart = now; this.moving = true;
  }

  private onEnterTile(): void {
    const x = this.tx, y = this.ty;
    this.cb.onHud?.({ map: this.map.id, x, y, facing: this.facing });
    if (this.grace > 0) this.grace--;

    // warp
    const warp = (this.map.warps ?? []).find((w) => w.x === x && w.y === y);
    if (warp) {
      this.cb.onAutosave(warp.toMap, warp.toX, warp.toY, warp.facing);
      this.setMap(warp.toMap, warp.toX, warp.toY, warp.facing);
      return;
    }
    // pickup
    const pickup = (this.map.pickups ?? []).find(
      (p) => p.x === x && p.y === y && !this.flags[p.setsFlag] && (!p.requiresFlag || this.flags[p.requiresFlag]),
    );
    if (pickup) {
      this.pause();
      this.cb.onDialogue({ dialogueId: pickup.dialogueId ?? '', pickupId: pickup.id, setsFlag: pickup.setsFlag });
      return;
    }
    // shrine (save + heal)
    if ((this.map.shrines ?? []).some((s) => s.x === x && s.y === y)) {
      this.cb.onAutosave(this.map.id, x, y, this.facing);
      this.cb.onShrine();
    }
    // random encounter (step-accumulator)
    const zone = (this.map.encounterZones ?? []).find(
      (z) => x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h,
    );
    if (zone && this.grace <= 0) {
      this.danger += 1;
      const threshold = zone.dangerBase * (0.85 + ((x * 7 + y * 13) % 30) / 100); // jitter ~±15%
      if (this.danger >= threshold) { this.danger = 0; this.startRandom(zone); }
    } else if (!zone) {
      this.danger = 0;
    }
  }

  private interact(): void {
    const [dx, dy] = DELTA[this.facing];
    const x = this.tx + dx, y = this.ty + dy;
    const fixed = this.fixedAt(x, y);
    if (fixed) { this.startBattle(fixed); return; }
    const npc = this.npcAt(x, y);
    if (npc) {
      this.pause();
      const dialogueId = npc.altDialogueId && npc.altFlag && this.flags[npc.altFlag] ? npc.altDialogueId : npc.dialogueId;
      this.cb.onDialogue({ dialogueId, npcId: npc.id, recruits: npc.recruits, shop: npc.shop, heal: npc.heal });
      return;
    }
    const sign = this.signAt(x, y);
    if (sign) { this.pause(); this.cb.onDialogue({ dialogueId: sign.dialogueId }); }
  }

  private startBattle(f: FixedEncounter): void {
    this.pause();
    const xp = f.isBoss ? 400 : 60 + f.levels.reduce((a, b) => a + b, 0) * 4;
    this.cb.onBattle({
      enemies: f.enemies.map((id, i) => ({ templateId: id, level: f.levels[i] ?? f.levels[0] ?? 5, star: f.isBoss ? 4 : 3 })),
      chapter: f.bgChapter, bossBanterId: f.bossBanterId, isBoss: f.isBoss, xp, fixedId: f.id, setsFlag: f.setsFlag,
    });
  }

  private startRandom(z: EncounterZone): void {
    this.pause();
    const seed = (this.tx * 31 + this.ty * 17 + this.danger * 7);
    const count = z.min + (seed % (z.max - z.min + 1));
    const enemies = Array.from({ length: count }, (_, i) => {
      const id = z.enemies[(seed + i * 5) % z.enemies.length];
      const level = z.minLevel + ((seed + i * 3) % (z.maxLevel - z.minLevel + 1));
      return { templateId: id, level, star: 3 };
    });
    const xp = 25 + enemies.reduce((a, e) => a + e.level * 3, 0);
    this.cb.onBattle({ enemies, chapter: z.bgChapter, xp });
  }

  // --- loop ---
  private loop = (now: number): void => {
    if (!this.running) return;
    if (!this.paused) {
      if (this.moving) {
        const t = clamp((now - this.moveStart) / STEP_MS, 0, 1);
        this.moveProgress = t;
        const e = smooth(t);
        this.px = lerp(this.fromX * this.tile, this.toX * this.tile, e);
        this.py = lerp(this.fromY * this.tile, this.toY * this.tile, e);
        if (t >= 1) {
          this.moving = false; this.moveProgress = 0;
          this.tx = this.toX; this.ty = this.toY;
          this.px = this.tx * this.tile; this.py = this.ty * this.tile;
          this.onEnterTile();
        }
      } else {
        this.tryStep(now);
      }
    }
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  // --- sprites ---
  private img(path: string): HTMLImageElement | null {
    const hit = this.cache.get(path);
    if (hit !== undefined) return hit;
    this.cache.set(path, null);
    loadImage(asset(path)).then((im) => this.cache.set(path, im)).catch(() => { /* keep null */ });
    return null;
  }
  private charImg(key: string, dir: Dir, enemy: boolean): HTMLImageElement | null {
    const folder = enemy ? 'enemies' : 'heroes';
    const im = this.img(`sprites/pixellab/${folder}/pro/${key}_${dir}.png`);
    if (im) return im;
    // fall back to south if the requested facing isn't present
    return this.img(`sprites/pixellab/${folder}/pro/${key}_south.png`);
  }

  // --- render ---
  private pal(): Palette { return PALETTES[this.map.biome ?? 'crypt'] ?? PALETTES.crypt; }

  private render(): void {
    const { ctx, tile } = this;
    const vw = VIEW_W * tile, vh = VIEW_H * tile;
    const mapPxW = this.map.w * tile, mapPxH = this.map.h * tile;
    const camX = clamp(this.px + tile / 2 - vw / 2, 0, Math.max(0, mapPxW - vw));
    const camY = clamp(this.py + tile / 2 - vh / 2, 0, Math.max(0, mapPxH - vh));
    const p = this.pal();

    ctx.fillStyle = '#07060a';
    ctx.fillRect(0, 0, vw, vh);

    const x0 = Math.floor(camX / tile), y0 = Math.floor(camY / tile);
    const x1 = Math.min(this.map.w - 1, x0 + VIEW_W), y1 = Math.min(this.map.h - 1, y0 + VIEW_H);

    // tiles
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const sx = Math.round(x * tile - camX), sy = Math.round(y * tile - camY);
        const closedGate = this.gateClosedAt(x, y);
        if (this.map.solid[y * this.map.w + x] === 1 || closedGate) {
          ctx.fillStyle = closedGate ? p.accent : p.face;
          ctx.fillRect(sx, sy, tile, tile);
          ctx.fillStyle = p.top; ctx.fillRect(sx, sy, tile, 4);
          ctx.fillStyle = p.base; ctx.fillRect(sx, sy + tile - 3, tile, 3);
          if (closedGate) { ctx.fillStyle = '#1a1018'; for (let i = 6; i < tile; i += 8) ctx.fillRect(sx + i, sy + 5, 3, tile - 9); }
        } else {
          ctx.fillStyle = (x + y) % 2 ? p.floorA : p.floorB;
          ctx.fillRect(sx, sy, tile, tile);
          ctx.fillStyle = 'rgba(0,0,0,0.16)';
          ctx.fillRect(sx, sy, tile, 1); ctx.fillRect(sx, sy, 1, tile);
        }
      }
    }

    // ground markers (shrines, signs, pickups) drawn under entities
    for (const s of this.map.shrines ?? []) this.drawShrine(s.x, s.y, camX, camY);
    for (const sg of this.map.signs ?? []) this.drawSign(sg.x, sg.y, camX, camY);
    for (const pk of this.map.pickups ?? []) {
      if (!this.flags[pk.setsFlag] && (!pk.requiresFlag || this.flags[pk.requiresFlag])) this.drawPickup(pk.x, pk.y, camX, camY);
    }

    // y-sorted characters: NPCs, fixed encounters, player
    type D = { y: number; draw: () => void };
    const ds: D[] = [];
    for (const n of this.map.npcs ?? []) {
      if (this.npcVisible(n)) ds.push({ y: n.y, draw: () => this.drawChar(n.sprite, n.facing, false, n.x * tile, n.y * tile, camX, camY, 0, n.id) });
    }
    for (const f of this.map.fixedEncounters ?? []) {
      if (this.fixedActive(f)) ds.push({ y: f.y, draw: () => this.drawChar(f.sprite, f.facing, true, f.x * tile, f.y * tile, camX, camY, 0, undefined, f.isBoss) });
    }
    const bob = this.moving ? Math.sin(this.moveProgress * Math.PI) * 2.5 : 0;
    ds.push({ y: this.ty + 0.5, draw: () => this.drawChar(this.leaderSprite, this.facing, false, this.px, this.py, camX, camY, bob) });
    ds.sort((a, b) => a.y - b.y);
    for (const d of ds) d.draw();
  }

  private drawChar(key: string, dir: Dir, enemy: boolean, px: number, py: number, camX: number, camY: number, bob: number, label?: string, boss?: boolean): void {
    const { ctx, tile } = this;
    const dx = px - camX, dy = py - camY;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.36)';
    ctx.beginPath();
    ctx.ellipse(dx + tile / 2, dy + tile - 3, tile * 0.32, tile * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    if (boss) {
      ctx.strokeStyle = 'rgba(224,90,72,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(dx + tile / 2, dy + tile - 3, tile * 0.4, tile * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const spr = this.charImg(key, dir, enemy);
    if (spr && spr.naturalWidth > 0) {
      const tr = getTrim(spr);
      const h = tile * (boss ? 1.85 : 1.55);
      const w = tr.sw * (h / tr.sh);
      const ix = Math.round(dx + tile / 2 - w / 2);
      const iy = Math.round(dy + tile - h + 2 - bob);
      ctx.drawImage(spr, tr.sx, tr.sy, tr.sw, tr.sh, ix, iy, Math.round(w), Math.round(h));
    } else {
      ctx.fillStyle = enemy ? '#7a2520' : '#3a5a7a';
      ctx.fillRect(Math.round(dx + tile * 0.28), Math.round(dy + tile * 0.15), Math.round(tile * 0.44), Math.round(tile * 0.75));
    }
    if (label) {
      const name = NPC_NAMES[label] ?? '';
      if (name) {
        ctx.font = '9px ui-monospace, monospace';
        ctx.textAlign = 'center';
        const tw = ctx.measureText(name).width;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(dx + tile / 2 - tw / 2 - 3, dy - 14, tw + 6, 12);
        ctx.fillStyle = '#e7dcd2';
        ctx.fillText(name, dx + tile / 2, dy - 5);
        ctx.textAlign = 'left';
      }
    }
  }

  private drawShrine(x: number, y: number, camX: number, camY: number): void {
    const { ctx, tile } = this;
    const dx = x * tile - camX, dy = y * tile - camY;
    ctx.fillStyle = '#4a4450';
    ctx.fillRect(dx + tile * 0.3, dy + tile * 0.35, tile * 0.4, tile * 0.5);
    ctx.fillStyle = '#cbb89a';
    ctx.beginPath(); ctx.arc(dx + tile / 2, dy + tile * 0.4, tile * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7fd0ff';
    ctx.fillRect(dx + tile * 0.46, dy + tile * 0.2, 3, 6);
  }
  private drawSign(x: number, y: number, camX: number, camY: number): void {
    const { ctx, tile } = this;
    const dx = x * tile - camX, dy = y * tile - camY;
    ctx.fillStyle = '#5a4632';
    ctx.fillRect(dx + tile * 0.46, dy + tile * 0.4, 4, tile * 0.4);
    ctx.fillStyle = '#7a5f42';
    ctx.fillRect(dx + tile * 0.28, dy + tile * 0.3, tile * 0.44, tile * 0.22);
  }
  private drawPickup(x: number, y: number, camX: number, camY: number): void {
    const { ctx, tile } = this;
    const dx = x * tile - camX, dy = y * tile - camY;
    ctx.fillStyle = 'rgba(180,220,255,0.25)';
    ctx.beginPath(); ctx.arc(dx + tile / 2, dy + tile / 2, tile * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfe8ff';
    ctx.fillRect(dx + tile * 0.42, dy + tile * 0.36, tile * 0.16, tile * 0.28);
  }
}

// Display names for NPC labels (real town-NPC art is an asset gap; the labels
// make the stand-in sprites read correctly).
const NPC_NAMES: Record<string, string> = {
  mara: 'Mara', joss: 'Joss', tender: 'The Tender', refugee: 'Refugee',
  luna: 'Luna', elara: 'Elara',
};

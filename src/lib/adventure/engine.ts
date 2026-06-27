// AdventureEngine — real-time, top-down ACTION combat (Diablo / twin-stick).
// Free 8-direction movement, mouse-aim attacks, live enemies that chase and
// hit you, HP + death, XP on kill. Combat happens IN the world (no battle
// screen). Town/NPCs/dialogue/shrines/warps still work as proximity triggers.
// Stats come from the Bonewake combat data (buildEnemyUnit / a player unit);
// the damage formula mirrors combat.ts (mitigation + element triangle + crit).

import { asset } from '../assetPath';
import { loadImage, getTrim } from './sprites';
import { ENEMIES, statsAtLevel, type Element } from '../../data/adventure/units';
import type { AdventureMap, Dir, NPC, EncounterZone } from '../../data/adventure/types';
import { ADVENTURE_MAPS } from '../../data/adventure/maps';

// Zoomed-in, character-focused camera (more 3rd-person feel) — fewer tiles
// visible => bigger sprites.
const VIEW_W = 11;
const VIEW_H = 8;

export interface PlayerStats {
  templateId: string;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  element: Element;
  ranged: boolean;
  power: number; // damage multiplier applied to every player hit (hero strength)
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
  onShrine: () => void;
  onAutosave: (mapId: string, x: number, y: number, facing: Dir) => void;
  onHud: (h: { map: string; hp: number; maxHp: number; enemies: number; xp: number }) => void;
  onXp: (xp: number) => void;
  onDeath: () => void;
  onFlag: (flag: string, fixedId?: string) => void;
  onLoot: (itemLevel: number, isBoss: boolean) => void;
}

export interface EngineInit {
  mapId: string;
  x: number; // tile coords (-1 = spawn)
  y: number;
  facing: Dir;
  player: PlayerStats;
  allies: PlayerStats[]; // AI companions (non-leader party)
  flags: Record<string, boolean>;
  defeated: string[];
  cb: EngineCallbacks;
}

const DIR_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const TRIANGLE: Record<Element, Element> = { fire: 'earth', earth: 'water', water: 'fire', light: 'dark', dark: 'light' };
function elementAdv(a: Element, b: Element): number {
  if (TRIANGLE[a] === b) return 1.5;
  if (TRIANGLE[b] === a) return 0.75;
  return 1.0;
}
function mitigate(raw: number, def: number): number {
  return Math.max(Math.floor(raw * 0.05), (raw * 100) / (100 + Math.max(0, def)));
}
function hit(att: { atk: number; crit: number; element: Element }, def: { def: number; element: Element }, mult: number): { dmg: number; crit: boolean; strong: boolean } {
  const ele = elementAdv(att.element, def.element);
  const crit = Math.random() < att.crit;
  const raw = att.atk * mult * ele * (crit ? 1.6 : 1);
  return { dmg: Math.max(1, Math.round(mitigate(raw, def.def))), crit, strong: ele > 1.05 };
}

function dirFromAngle(ang: number): Dir {
  const c = Math.cos(ang), s = Math.sin(ang);
  if (Math.abs(c) >= Math.abs(s)) return c >= 0 ? 'east' : 'west';
  return s >= 0 ? 'south' : 'north';
}

interface Enemy {
  id: string; templateId: string; sprite: string; level: number;
  x: number; y: number; hp: number; maxHp: number;
  atk: number; def: number; spd: number; crit: number; element: Element;
  speed: number; atkCd: number; flash: number; facing: Dir;
  ranged: boolean; isBoss: boolean; packId?: string; setsFlag?: string;
}
interface Ally { templateId: string; x: number; y: number; atk: number; def: number; crit: number; element: Element; power: number; ranged: boolean; speed: number; atkCd: number; facing: Dir; }
interface Projectile { x: number; y: number; vx: number; vy: number; life: number; dmg: number; crit: boolean; fromEnemy: boolean; }
interface Float { x: number; y: number; vy: number; life: number; text: string; color: string; }
interface Orb { x: number; y: number; vx: number; vy: number; life: number; }

const PALETTES: Record<string, { fa: string; fb: string; face: string; top: string; base: string; accent: string }> = {
  town: { fa: '#2a2620', fb: '#252019', face: '#3a3128', top: '#4c4034', base: '#191309', accent: '#6b4a2a' },
  field: { fa: '#22281b', fb: '#1d2317', face: '#2e3a25', top: '#3f4c30', base: '#121a0e', accent: '#3b5a2a' },
  crypt: { fa: '#1a1822', fb: '#15131d', face: '#2a2734', top: '#3b3749', base: '#0d0b12', accent: '#5a3a6b' },
};

const NPC_NAMES: Record<string, string> = { mara: 'Mara', joss: 'Joss', tender: 'The Tender', refugee: 'Refugee', luna: 'Luna', elara: 'Elara' };

export class AdventureEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private map!: AdventureMap;
  private tile = 32;
  private cb: EngineCallbacks;

  private player: PlayerStats;
  private hp: number;
  private px = 0; private py = 0;
  private facing: Dir = 'south';
  private flags: Record<string, boolean>;
  private defeated: Set<string>;

  private raf = 0; private last = 0; private running = false; private paused = false;
  private keys = new Set<string>();
  private vdir: [number, number] = [0, 0];
  private aimX = 0; private aimY = 0;
  private pointerDown = false;
  private attackCd = 0;
  private attackAnim = 0;
  private attackHeld = false;
  private invuln = 0;     // ms of i-frames (during dodge)
  private dashTime = 0;   // ms remaining of the dash burst
  private dashVX = 0; private dashVY = 0;
  private dashCd = 0;     // ms until next dodge
  private xp = 0;

  private enemies: Enemy[] = [];
  private allies: Ally[] = [];
  private allyRoster: PlayerStats[] = [];
  private projs: Projectile[] = [];
  private floats: Float[] = [];
  private orbs: Orb[] = [];
  private activatedPacks = new Set<string>();
  private spawnTimers = new Map<EncounterZone, number>();
  private cache = new Map<string, HTMLImageElement | null>();

  constructor(canvas: HTMLCanvasElement, init: EngineInit) {
    this.canvas = canvas;
    this.cb = init.cb;
    this.player = init.player;
    this.hp = init.player.maxHp;
    this.flags = { ...init.flags };
    this.defeated = new Set(init.defeated);
    this.allyRoster = init.allies ?? [];
    canvas.width = VIEW_W * this.tile;
    canvas.height = VIEW_H * this.tile;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.aimX = canvas.width / 2 + 40;
    this.aimY = canvas.height / 2;
    this.setMap(init.mapId, init.x, init.y, init.facing);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointerup', this.onPointerUp);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }
  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.keys.clear();
  }

  pause(): void { this.paused = true; this.keys.clear(); this.vdir = [0, 0]; this.pointerDown = false; }
  resume(): void { this.paused = false; this.last = performance.now(); }
  syncState(s: { flags?: Record<string, boolean>; defeated?: string[] }): void {
    if (s.flags) this.flags = { ...s.flags };
    if (s.defeated) this.defeated = new Set(s.defeated);
  }
  setPlayer(p: PlayerStats): void {
    const ratio = this.hp / this.player.maxHp;
    this.player = p;
    this.hp = Math.max(1, Math.round(p.maxHp * ratio));
  }
  setVirtualDir(dx: number, dy: number): void { this.vdir = [dx, dy]; }
  attackAuto(): void {
    const e = this.nearestEnemy();
    if (e) { const s = this.worldToScreen(e.x, e.y); this.aimX = s.sx; this.aimY = s.sy; }
    this.tryAttack();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); this.interact(); return; }
    if (e.code === 'KeyJ' || e.code === 'KeyZ') { e.preventDefault(); this.attackHeld = true; this.attackFacing(); return; }
    if (e.code === 'Space' || e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); this.dodge(); return; }
    if (DIR_KEYS[e.code]) { e.preventDefault(); this.keys.add(e.code); }
  };
  private onKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'KeyJ' || e.code === 'KeyZ') this.attackHeld = false;
    this.keys.delete(e.code);
  };
  private onPointerMove = (e: PointerEvent): void => {
    const r = this.canvas.getBoundingClientRect();
    this.aimX = ((e.clientX - r.left) / r.width) * this.canvas.width;
    this.aimY = ((e.clientY - r.top) / r.height) * this.canvas.height;
  };
  private onPointerDown = (e: PointerEvent): void => {
    const r = this.canvas.getBoundingClientRect();
    this.aimX = ((e.clientX - r.left) / r.width) * this.canvas.width;
    this.aimY = ((e.clientY - r.top) / r.height) * this.canvas.height;
    this.pointerDown = true;
    this.tryAttack();
  };
  private onPointerUp = (): void => { this.pointerDown = false; };

  private setMap(mapId: string, x: number, y: number, facing: Dir): void {
    const m = ADVENTURE_MAPS[mapId];
    if (!m) throw new Error(`unknown map ${mapId}`);
    this.map = m;
    this.tile = m.tile;
    const sx = x < 0 ? m.spawn.x : x;
    const sy = y < 0 ? m.spawn.y : y;
    this.px = sx * this.tile + this.tile / 2;
    this.py = sy * this.tile + this.tile / 2;
    this.facing = facing;
    this.enemies = []; this.projs = []; this.floats = []; this.orbs = [];
    this.activatedPacks.clear(); this.spawnTimers.clear();
    this.spawnAllies();
    this.cb.onHud({ map: m.id, hp: this.hp, maxHp: this.player.maxHp, enemies: 0, xp: this.xp });
  }

  private spawnAllies(): void {
    this.allies = this.allyRoster.map((p, i) => {
      const a = ((i + 1) / (this.allyRoster.length + 1)) * Math.PI * 2;
      return { templateId: p.templateId, x: this.px + Math.cos(a) * this.tile * 1.3, y: this.py + Math.sin(a) * this.tile * 1.3,
        atk: p.atk, def: p.def, crit: p.crit, element: p.element, power: p.power, ranged: p.ranged, speed: 116, atkCd: 0, facing: 'south' };
    });
  }
  setAllies(list: PlayerStats[]): void { this.allyRoster = list; this.spawnAllies(); }

  private solidPx(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / this.tile), ty = Math.floor(wy / this.tile);
    if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) return true;
    if (this.map.solid[ty * this.map.w + tx] === 1) return true;
    return (this.map.gateDoors ?? []).some((g) => g.x === tx && g.y === ty && !this.flags[g.openFlag]);
  }
  private canBe(wx: number, wy: number, r: number): boolean {
    return !this.solidPx(wx - r, wy - r) && !this.solidPx(wx + r, wy - r) &&
           !this.solidPx(wx - r, wy + r) && !this.solidPx(wx + r, wy + r);
  }
  private npcVisible(n: NPC): boolean {
    if (n.hideAfterFlag && this.flags[n.hideAfterFlag]) return false;
    if (n.requiresFlag && !this.flags[n.requiresFlag]) return false;
    return true;
  }
  private worldToScreen(wx: number, wy: number): { sx: number; sy: number } {
    const cam = this.camera();
    return { sx: wx - cam.x, sy: wy - cam.y };
  }
  private camera(): { x: number; y: number } {
    const vw = VIEW_W * this.tile, vh = VIEW_H * this.tile;
    return {
      x: clamp(this.px - vw / 2, 0, Math.max(0, this.map.w * this.tile - vw)),
      y: clamp(this.py - vh / 2, 0, Math.max(0, this.map.h * this.tile - vh)),
    };
  }
  private nearestEnemy(): Enemy | null {
    let best: Enemy | null = null, bd = Infinity;
    for (const e of this.enemies) { const d = (e.x - this.px) ** 2 + (e.y - this.py) ** 2; if (d < bd) { bd = d; best = e; } }
    return best;
  }

  private interact(): void {
    if (this.paused) return;
    const reach = this.tile * 1.3;
    let best: NPC | null = null, bd = reach * reach;
    for (const n of this.map.npcs ?? []) {
      if (!this.npcVisible(n)) continue;
      const d = (n.x * this.tile + this.tile / 2 - this.px) ** 2 + (n.y * this.tile + this.tile / 2 - this.py) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    if (best) {
      this.pause();
      const id = best.altDialogueId && best.altFlag && this.flags[best.altFlag] ? best.altDialogueId : best.dialogueId;
      this.cb.onDialogue({ dialogueId: id, npcId: best.id, recruits: best.recruits, shop: best.shop, heal: best.heal });
      return;
    }
    for (const s of this.map.signs ?? []) {
      const d = (s.x * this.tile + this.tile / 2 - this.px) ** 2 + (s.y * this.tile + this.tile / 2 - this.py) ** 2;
      if (d < reach * reach) { this.pause(); this.cb.onDialogue({ dialogueId: s.dialogueId }); return; }
    }
  }

  private facingAngle(): number {
    return ({ east: 0, west: Math.PI, south: Math.PI / 2, north: -Math.PI / 2 } as Record<Dir, number>)[this.facing];
  }
  // keyboard / touch: swing in the direction you're facing (move-and-hit)
  attackFacing(): void { this.swing(this.facingAngle()); }
  // mouse: swing toward the cursor
  private tryAttack(): void {
    const cam = this.camera();
    this.swing(Math.atan2(this.aimY + cam.y - this.py, this.aimX + cam.x - this.px));
  }
  dodge(): void {
    if (this.paused || this.dashCd > 0) return;
    let dx = this.vdir[0], dy = this.vdir[1];
    for (const k of this.keys) { const d = DIR_KEYS[k]; if (d) { dx += d[0]; dy += d[1]; } }
    if (dx === 0 && dy === 0) { const a = this.facingAngle(); dx = Math.cos(a); dy = Math.sin(a); }
    const l = Math.hypot(dx, dy) || 1;
    this.dashVX = dx / l; this.dashVY = dy / l;
    this.dashTime = 165; this.invuln = 300; this.dashCd = 480;
    this.facing = dirFromAngle(Math.atan2(this.dashVY, this.dashVX));
  }
  private swing(ang: number): void {
    if (this.paused || this.attackCd > 0) return;
    this.facing = dirFromAngle(ang);
    this.attackCd = clamp(360 - this.player.spd, 150, 360);
    this.attackAnim = 180;
    if (this.player.ranged) {
      const sp = 320;
      const c = Math.random() < this.player.crit;
      this.projs.push({ x: this.px, y: this.py, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 900, dmg: this.player.atk, crit: c, fromEnemy: false });
    } else {
      const range = this.tile * 1.3;
      for (const e of this.enemies) {
        const dx = e.x - this.px, dy = e.y - this.py;
        if (dx * dx + dy * dy > range * range) continue;
        let diff = Math.abs(Math.atan2(dy, dx) - ang);
        if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff <= 1.25) this.damageEnemy(e, this.player.power);
      }
    }
  }

  private damageEnemy(e: Enemy, mult: number, src: { atk: number; crit: number; element: Element } = this.player): void {
    const h = hit({ atk: src.atk, crit: src.crit, element: src.element }, { def: e.def, element: e.element }, mult);
    e.hp -= h.dmg; e.flash = 120;
    this.floats.push({ x: e.x, y: e.y - this.tile * 0.6, vy: -28, life: 700, text: String(h.dmg), color: h.crit ? '#ffd36b' : (h.strong ? '#ff7a66' : '#fff') });
    if (e.hp <= 0) this.killEnemy(e);
  }
  private killEnemy(e: Enemy): void {
    this.enemies = this.enemies.filter((x) => x !== e);
    const gain = Math.round(e.isBoss ? 400 : 12 + e.maxHp * 0.02);
    this.xp += gain; this.cb.onXp(gain);
    for (let i = 0, n = e.isBoss ? 8 : 2; i < n; i++) { const a = Math.random() * Math.PI * 2; this.orbs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 6000 }); }
    // gear drops: bosses always, lich elites often, trash rarely
    const dropChance = e.isBoss ? 1 : e.templateId === 'graveyardlich' ? 0.5 : 0.12;
    if (Math.random() < dropChance) this.cb.onLoot(Math.max(2, e.level * 2), e.isBoss);
    if (e.packId && !this.enemies.some((x) => x.packId === e.packId)) {
      this.defeated.add(e.packId);
      if (e.setsFlag) this.flags[e.setsFlag] = true;
      this.cb.onFlag(e.setsFlag ?? '', e.packId);
    }
  }

  private spawnEnemy(templateId: string, level: number, wx: number, wy: number, opts: { isBoss?: boolean; packId?: string; setsFlag?: string } = {}): void {
    const def = ENEMIES[templateId];
    if (!def) return;
    const s = statsAtLevel(def.base, level);
    const maxHp = Math.round(s.hp * (opts.isBoss ? 4 : 1));
    this.enemies.push({
      id: `${templateId}_${this.enemies.length}_${Math.floor(wx)}`, templateId, sprite: templateId, level, x: wx, y: wy, hp: maxHp, maxHp,
      atk: Math.round(s.atk * (opts.isBoss ? 0.9 : 0.6)), def: s.def, spd: s.spd, crit: s.crit, element: def.element,
      speed: 30 + s.spd * 0.7, atkCd: 700, flash: 0, facing: 'south',
      ranged: def.ranged, isBoss: !!opts.isBoss, packId: opts.packId, setsFlag: opts.setsFlag,
    });
  }

  private updateSpawns(dt: number): void {
    for (const z of this.map.encounterZones ?? []) {
      const inZone = this.px >= z.x * this.tile && this.px < (z.x + z.w) * this.tile && this.py >= z.y * this.tile && this.py < (z.y + z.h) * this.tile;
      const cap = z.max + 1;
      const count = this.enemies.filter((e) => !e.packId).length;
      let t = (this.spawnTimers.get(z) ?? 0) - dt;
      if (inZone && count < cap && t <= 0) {
        for (let tries = 0; tries < 8; tries++) {
          const wx = (z.x + Math.random() * z.w) * this.tile, wy = (z.y + Math.random() * z.h) * this.tile;
          if (!this.canBe(wx, wy, 10)) continue;
          if ((wx - this.px) ** 2 + (wy - this.py) ** 2 < (this.tile * 3) ** 2) continue;
          const id = z.enemies[Math.floor(Math.random() * z.enemies.length)];
          const lvl = z.minLevel + Math.floor(Math.random() * (z.maxLevel - z.minLevel + 1));
          this.spawnEnemy(id, lvl, wx, wy); break;
        }
        t = 1400;
      }
      this.spawnTimers.set(z, t);
    }
    for (const f of this.map.fixedEncounters ?? []) {
      if (this.defeated.has(f.id) || this.activatedPacks.has(f.id)) continue;
      if (f.requiresFlag && !this.flags[f.requiresFlag]) continue;
      const fx = f.x * this.tile + this.tile / 2, fy = f.y * this.tile + this.tile / 2;
      if ((fx - this.px) ** 2 + (fy - this.py) ** 2 > (this.tile * 6) ** 2) continue;
      this.activatedPacks.add(f.id);
      f.enemies.forEach((id, i) => {
        const a = (i / f.enemies.length) * Math.PI * 2;
        const ox = fx + Math.cos(a) * this.tile * 1.2, oy = fy + Math.sin(a) * this.tile * 1.2;
        const ok = this.canBe(ox, oy, 10);
        this.spawnEnemy(id, f.levels[i] ?? f.levels[0] ?? 5, ok ? ox : fx, ok ? oy : fy, { isBoss: f.isBoss, packId: f.id, setsFlag: f.setsFlag });
      });
    }
  }

  private worldTriggers(): void {
    const tx = Math.floor(this.px / this.tile), ty = Math.floor(this.py / this.tile);
    const warp = (this.map.warps ?? []).find((w) => w.x === tx && w.y === ty);
    if (warp) { this.cb.onAutosave(warp.toMap, warp.toX, warp.toY, warp.facing); this.setMap(warp.toMap, warp.toX, warp.toY, warp.facing); return; }
    const pk = (this.map.pickups ?? []).find((p) => p.x === tx && p.y === ty && !this.flags[p.setsFlag] && (!p.requiresFlag || this.flags[p.requiresFlag]));
    if (pk) { this.pause(); this.cb.onDialogue({ dialogueId: pk.dialogueId ?? '', pickupId: pk.id, setsFlag: pk.setsFlag }); return; }
    if ((this.map.shrines ?? []).some((s) => s.x === tx && s.y === ty)) { this.hp = this.player.maxHp; this.cb.onAutosave(this.map.id, tx, ty, this.facing); this.cb.onShrine(); }
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(50, now - this.last); this.last = now;
    if (!this.paused) this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    const s = dt / 1000;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    const r = 10;
    if (this.dashTime > 0) {
      // dash burst overrides normal movement
      this.dashTime -= dt;
      const dspeed = 360;
      const nx = this.px + this.dashVX * dspeed * s; if (this.canBe(nx, this.py, r)) this.px = nx;
      const ny = this.py + this.dashVY * dspeed * s; if (this.canBe(this.px, ny, r)) this.py = ny;
    } else {
      let ix = this.vdir[0], iy = this.vdir[1];
      for (const k of this.keys) { const d = DIR_KEYS[k]; if (d) { ix += d[0]; iy += d[1]; } }
      const len = Math.hypot(ix, iy);
      if (len > 0) {
        ix /= len; iy /= len;
        const speed = 120;
        const nx = this.px + ix * speed * s; if (this.canBe(nx, this.py, r)) this.px = nx;
        const ny = this.py + iy * speed * s; if (this.canBe(this.px, ny, r)) this.py = ny;
        if (this.attackAnim <= 0) this.facing = dirFromAngle(Math.atan2(iy, ix));
      }
    }
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.attackAnim > 0) this.attackAnim -= dt;
    if (this.attackHeld && this.attackCd <= 0) this.attackFacing();
    if (this.pointerDown && this.attackCd <= 0) this.tryAttack();

    this.updateSpawns(dt);

    for (const e of this.enemies) {
      if (e.flash > 0) e.flash -= dt;
      if (e.atkCd > 0) e.atkCd -= dt;
      const dx = this.px - e.x, dy = this.py - e.y, dist = Math.hypot(dx, dy) || 1;
      e.facing = dirFromAngle(Math.atan2(dy, dx));
      const range = e.ranged ? this.tile * 5 : this.tile * 0.7;
      if (dist > range) {
        const vx = (dx / dist) * e.speed * s, vy = (dy / dist) * e.speed * s;
        if (this.canBe(e.x + vx, e.y, 9)) e.x += vx;
        if (this.canBe(e.x, e.y + vy, 9)) e.y += vy;
      }
      if (e.atkCd <= 0 && dist <= range + (e.ranged ? 0 : this.tile * 0.4)) {
        e.atkCd = e.ranged ? 1300 : 900;
        if (e.ranged) {
          const a = Math.atan2(dy, dx), sp = 160;
          const h = hit({ atk: e.atk, crit: e.crit, element: e.element }, { def: this.player.def, element: this.player.element }, 1);
          this.projs.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 2500, dmg: h.dmg, crit: h.crit, fromEnemy: true });
        } else {
          this.hurtPlayer(hit({ atk: e.atk, crit: e.crit, element: e.element }, { def: this.player.def, element: this.player.element }, 1));
        }
      }
    }

    // allies (AI companions): seek the nearest enemy and attack, else follow you
    for (const a of this.allies) {
      if (a.atkCd > 0) a.atkCd -= dt;
      let tgt: Enemy | null = null, bd = (this.tile * 6) ** 2;
      for (const e of this.enemies) { const dd = (e.x - a.x) ** 2 + (e.y - a.y) ** 2; if (dd < bd) { bd = dd; tgt = e; } }
      const goX = tgt ? tgt.x : this.px, goY = tgt ? tgt.y : this.py;
      const dx = goX - a.x, dy = goY - a.y, dist = Math.hypot(dx, dy) || 1;
      a.facing = dirFromAngle(Math.atan2(dy, dx));
      const stop = tgt ? (a.ranged ? this.tile * 4 : this.tile * 0.9) : this.tile * 1.6;
      if (dist > stop) {
        const vx = (dx / dist) * a.speed * s, vy = (dy / dist) * a.speed * s;
        if (this.canBe(a.x + vx, a.y, 9)) a.x += vx;
        if (this.canBe(a.x, a.y + vy, 9)) a.y += vy;
      }
      if (tgt && a.atkCd <= 0 && dist <= (a.ranged ? this.tile * 4.5 : this.tile * 1.2)) {
        a.atkCd = a.ranged ? 650 : 420;
        if (a.ranged) {
          const ang = Math.atan2(dy, dx), sp = 300;
          this.projs.push({ x: a.x, y: a.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 800, dmg: a.atk, crit: false, fromEnemy: false });
        } else {
          this.damageEnemy(tgt, a.power, a);
        }
      }
    }

    for (const p of this.projs) {
      p.x += p.vx * s; p.y += p.vy * s; p.life -= dt;
      if (this.solidPx(p.x, p.y)) { p.life = 0; continue; }
      if (p.fromEnemy) {
        if ((p.x - this.px) ** 2 + (p.y - this.py) ** 2 < 144) { this.hurtPlayer({ dmg: p.dmg, crit: p.crit, strong: false }); p.life = 0; }
      } else {
        for (const e of this.enemies) { if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < 196) { this.damageEnemy(e, this.player.power); p.life = 0; break; } }
      }
    }
    this.projs = this.projs.filter((p) => p.life > 0);

    for (const o of this.orbs) {
      o.life -= dt; o.vx *= 0.9; o.vy *= 0.9; o.x += o.vx * s; o.y += o.vy * s;
      const dd = (o.x - this.px) ** 2 + (o.y - this.py) ** 2;
      if (dd < (this.tile * 1.6) ** 2) { const a = Math.atan2(this.py - o.y, this.px - o.x); o.x += Math.cos(a) * 140 * s; o.y += Math.sin(a) * 140 * s; }
      if (dd < 100) o.life = 0;
    }
    this.orbs = this.orbs.filter((o) => o.life > 0);
    for (const f of this.floats) { f.y += f.vy * s; f.life -= dt; }
    this.floats = this.floats.filter((f) => f.life > 0);

    this.worldTriggers();
    this.cb.onHud({ map: this.map.id, hp: Math.max(0, Math.round(this.hp)), maxHp: this.player.maxHp, enemies: this.enemies.length, xp: this.xp });
  }

  private hurtPlayer(h: { dmg: number; crit: boolean; strong: boolean }): void {
    if (this.invuln > 0) return; // dodge i-frames
    this.hp -= h.dmg;
    this.floats.push({ x: this.px, y: this.py - this.tile * 0.6, vy: -28, life: 700, text: String(h.dmg), color: '#ff5a5a' });
    if (this.hp <= 0 && !this.paused) { this.pause(); this.cb.onDeath(); }
  }

  private img(path: string): HTMLImageElement | null {
    const c = this.cache.get(path);
    if (c !== undefined) return c;
    this.cache.set(path, null);
    loadImage(asset(path)).then((im) => this.cache.set(path, im)).catch(() => {});
    return null;
  }
  private charImg(key: string, dir: Dir, enemy: boolean): HTMLImageElement | null {
    const folder = enemy ? 'enemies' : 'heroes';
    return this.img(`sprites/pixellab/${folder}/pro/${key}_${dir}.png`) ?? this.img(`sprites/pixellab/${folder}/pro/${key}_south.png`);
  }

  private render(): void {
    const { ctx, tile } = this;
    const vw = VIEW_W * tile, vh = VIEW_H * tile;
    const cam = this.camera();
    const p = PALETTES[this.map.biome ?? 'crypt'] ?? PALETTES.crypt;
    ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, vw, vh);
    const x0 = Math.floor(cam.x / tile), y0 = Math.floor(cam.y / tile);
    const x1 = Math.min(this.map.w - 1, x0 + VIEW_W), y1 = Math.min(this.map.h - 1, y0 + VIEW_H);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const sx = Math.round(x * tile - cam.x), sy = Math.round(y * tile - cam.y);
      const gate = (this.map.gateDoors ?? []).some((g) => g.x === x && g.y === y && !this.flags[g.openFlag]);
      if (this.map.solid[y * this.map.w + x] === 1 || gate) {
        ctx.fillStyle = gate ? p.accent : p.face; ctx.fillRect(sx, sy, tile, tile);
        ctx.fillStyle = p.top; ctx.fillRect(sx, sy, tile, 4);
        ctx.fillStyle = p.base; ctx.fillRect(sx, sy + tile - 3, tile, 3);
      } else {
        ctx.fillStyle = (x + y) % 2 ? p.fa : p.fb; ctx.fillRect(sx, sy, tile, tile);
        ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(sx, sy, tile, 1); ctx.fillRect(sx, sy, 1, tile);
      }
    }
    for (const w of this.map.warps ?? []) this.drawWarp(w.x, w.y, ADVENTURE_MAPS[w.toMap]?.name ?? '', cam);
    for (const sh of this.map.shrines ?? []) this.marker(sh.x, sh.y, cam, '#7fd0ff', '✚');
    for (const sg of this.map.signs ?? []) this.marker(sg.x, sg.y, cam, '#c8a878', '▯');
    for (const pk of this.map.pickups ?? []) if (!this.flags[pk.setsFlag] && (!pk.requiresFlag || this.flags[pk.requiresFlag])) this.marker(pk.x, pk.y, cam, '#cfe8ff', '✦');
    for (const o of this.orbs) { ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(o.x - cam.x, o.y - cam.y, 3, 0, Math.PI * 2); ctx.fill(); }

    type D = { y: number; draw: () => void };
    const ds: D[] = [];
    for (const n of this.map.npcs ?? []) if (this.npcVisible(n)) ds.push({ y: n.y * tile, draw: () => this.drawChar(n.sprite, n.facing, false, n.x * tile + tile / 2, n.y * tile + tile / 2, cam, false, n.id) });
    for (const e of this.enemies) ds.push({ y: e.y, draw: () => this.drawEnemy(e, cam) });
    for (const a of this.allies) ds.push({ y: a.y, draw: () => this.drawAlly(a, cam) });
    ds.push({ y: this.py, draw: () => this.drawPlayer(cam) });
    ds.sort((a, b) => a.y - b.y);
    for (const d of ds) d.draw();

    for (const pr of this.projs) { ctx.fillStyle = pr.fromEnemy ? '#b06bff' : '#ffe08a'; ctx.beginPath(); ctx.arc(pr.x - cam.x, pr.y - cam.y, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.font = 'bold 11px ui-monospace, monospace'; ctx.textAlign = 'center';
    for (const f of this.floats) { ctx.globalAlpha = clamp(f.life / 700, 0, 1); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x - cam.x, f.y - cam.y); }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }

  private drawWarp(tx: number, ty: number, name: string, cam: { x: number; y: number }): void {
    const { ctx, tile } = this;
    const dx = tx * tile - cam.x, dy = ty * tile - cam.y;
    // stone archway
    ctx.fillStyle = '#140d12'; ctx.fillRect(dx + 2, dy - 2, tile - 4, tile);
    ctx.fillStyle = '#4a3f33'; ctx.fillRect(dx, dy - 5, 5, tile + 5); ctx.fillRect(dx + tile - 5, dy - 5, 5, tile + 5);
    ctx.fillStyle = '#5d4d3a'; ctx.fillRect(dx - 1, dy - 7, tile + 2, 6);
    // pulsing portal glow
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 320);
    const g = ctx.createLinearGradient(dx, dy, dx, dy + tile);
    g.addColorStop(0, '#8fdcff'); g.addColorStop(1, '#b06bff');
    ctx.globalAlpha = 0.3 + pulse * 0.45; ctx.fillStyle = g;
    ctx.fillRect(dx + 5, dy, tile - 10, tile - 2);
    ctx.globalAlpha = 1;
    // destination label
    const short = name.length > 16 ? name.slice(0, 15) + '…' : name;
    const txt = '→ ' + short;
    ctx.font = '9px ui-monospace, monospace'; ctx.textAlign = 'center';
    const w = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(dx + tile / 2 - w / 2 - 3, dy - 20, w + 6, 12);
    ctx.fillStyle = '#cfe8ff'; ctx.fillText(txt, dx + tile / 2, dy - 11);
    ctx.textAlign = 'left';
  }

  private marker(tx: number, ty: number, cam: { x: number; y: number }, color: string, glyph: string): void {
    const { ctx, tile } = this;
    const dx = tx * tile - cam.x, dy = ty * tile - cam.y;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(dx + 6, dy + 6, tile - 12, tile - 12);
    ctx.fillStyle = color; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.fillText(glyph, dx + tile / 2, dy + tile / 2 + 6); ctx.textAlign = 'left';
  }

  private drawChar(key: string, dir: Dir, enemy: boolean, cx: number, cy: number, cam: { x: number; y: number }, flash: boolean, label?: string, boss?: boolean): void {
    const { ctx, tile } = this;
    const dx = cx - cam.x, dy = cy - cam.y;
    ctx.fillStyle = 'rgba(0,0,0,0.36)'; ctx.beginPath(); ctx.ellipse(dx, dy + tile * 0.4, tile * 0.3, tile * 0.13, 0, 0, Math.PI * 2); ctx.fill();
    if (boss) { ctx.strokeStyle = 'rgba(224,90,72,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(dx, dy + tile * 0.4, tile * 0.42, tile * 0.18, 0, 0, Math.PI * 2); ctx.stroke(); }
    const spr = this.charImg(key, dir, enemy);
    if (spr && spr.naturalWidth > 0) {
      const tr = getTrim(spr);
      const h = tile * (boss ? 1.9 : 1.5), w = tr.sw * (h / tr.sh);
      const ix = Math.round(dx - w / 2), iy = Math.round(dy + tile * 0.42 - h);
      ctx.drawImage(spr, tr.sx, tr.sy, tr.sw, tr.sh, ix, iy, Math.round(w), Math.round(h));
      if (flash) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(spr, tr.sx, tr.sy, tr.sw, tr.sh, ix, iy, Math.round(w), Math.round(h)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    } else {
      ctx.fillStyle = enemy ? '#7a2520' : '#3a5a7a';
      ctx.fillRect(Math.round(dx - tile * 0.22), Math.round(dy - tile * 0.5), Math.round(tile * 0.44), Math.round(tile * 0.8));
    }
    if (label) { const name = NPC_NAMES[label]; if (name) { ctx.font = '9px ui-monospace, monospace'; ctx.textAlign = 'center'; const tw = ctx.measureText(name).width; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(dx - tw / 2 - 3, dy - tile * 0.95, tw + 6, 12); ctx.fillStyle = '#e7dcd2'; ctx.fillText(name, dx, dy - tile * 0.95 + 9); ctx.textAlign = 'left'; } }
  }

  private drawEnemy(e: Enemy, cam: { x: number; y: number }): void {
    this.drawChar(e.sprite, e.facing, true, e.x, e.y, cam, e.flash > 0, undefined, e.isBoss);
    const { ctx, tile } = this;
    const dx = e.x - cam.x, dy = e.y - cam.y;
    const w = e.isBoss ? tile * 1.4 : tile * 0.8, frac = clamp(e.hp / e.maxHp, 0, 1);
    const top = dy - tile * (e.isBoss ? 1.05 : 0.85);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(dx - w / 2, top, w, 4);
    ctx.fillStyle = e.isBoss ? '#e05a48' : '#c0392b'; ctx.fillRect(dx - w / 2, top, w * frac, 4);
  }

  private drawAlly(a: Ally, cam: { x: number; y: number }): void {
    const { ctx, tile } = this;
    const dx = a.x - cam.x, dy = a.y - cam.y;
    ctx.strokeStyle = 'rgba(120,200,255,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(dx, dy + tile * 0.4, tile * 0.3, tile * 0.13, 0, 0, Math.PI * 2); ctx.stroke();
    this.drawChar(a.templateId, a.facing, false, a.x, a.y, cam, false, a.templateId);
  }

  private drawPlayer(cam: { x: number; y: number }): void {
    const { ctx, tile } = this;
    if (this.attackAnim > 0 && !this.player.ranged) {
      const cx = this.px - cam.x, cy = this.py - cam.y;
      const base = ({ east: 0, west: Math.PI, south: Math.PI / 2, north: -Math.PI / 2 } as Record<Dir, number>)[this.facing];
      ctx.strokeStyle = 'rgba(255,235,150,0.85)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, tile * 1.15, base - 0.9, base + 0.9); ctx.stroke();
    }
    if (this.invuln > 0) ctx.globalAlpha = Math.floor(this.invuln / 70) % 2 ? 0.35 : 0.85;
    this.drawChar(this.player.templateId, this.facing, false, this.px, this.py, cam, false);
    ctx.globalAlpha = 1;
  }
}

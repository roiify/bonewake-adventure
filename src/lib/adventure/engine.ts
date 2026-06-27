// AdventureEngine — real-time action RPG with a 3D over-the-shoulder view.
// The WORLD is rendered in Three.js (floor/walls/doors with depth, behind-the-
// character camera); heroes & enemies are the pixel sprites as upright
// billboards (Octopath / Don't Starve style). All gameplay logic — movement,
// collision, enemy/ally AI, combat, leveling, gear, dialogue, triggers — is the
// same simulation as before; only rendering + camera + input changed. Sim runs
// in "pixel" space (tile = this.tile); the renderer maps it to 3D units (1 tile
// = 1 unit). Nothing inherited from the gacha game but the sprite PNGs.

import * as THREE from 'three';
import { asset } from '../assetPath';
import { loadImage, getTrim } from './sprites';
import { ENEMIES, HEROES, statsAtLevel, rollRarity, RARITY, type Element } from '../../data/adventure/units';
import type { AdventureMap, Dir, NPC, EncounterZone, DungeonMeta } from '../../data/adventure/types';
import { ADVENTURE_MAPS } from '../../data/adventure/maps';
import { RUNTIME_MAPS } from '../../data/adventure/runtime';

const CAM_DIST = 7;     // camera distance behind the hero (world units)
const CAM_HEIGHT = 6;   // camera height
const LOOK_Y = 1.2;     // look-at height above ground
const HERO_H = 1.7;     // hero billboard height (units); boss bigger
const HOMING_TURN = 7;  // rad/sec a player/ally projectile can curve toward its target

export interface PlayerStats {
  templateId: string; maxHp: number; atk: number; def: number; spd: number; crit: number; element: Element; ranged: boolean; power: number;
}
export interface DialogueRequest { dialogueId: string; npcId?: string; recruits?: string; shop?: boolean; heal?: boolean; pickupId?: string; setsFlag?: string; }
export interface EngineCallbacks {
  onDialogue: (req: DialogueRequest) => void;
  onShrine: () => void;
  onAutosave: (mapId: string, x: number, y: number, facing: Dir) => void;
  onHud: (h: { map: string; hp: number; maxHp: number; enemies: number; xp: number }) => void;
  onXp: (xp: number) => void;
  onDeath: () => void;
  onFlag: (flag: string, fixedId?: string) => void;
  onPickupLoot: (itemLevel: number, rarity: number) => void;
  onFloorCleared: () => void;
  onDescend: () => void;
  onExitTown: () => void;
}
export interface EngineInit {
  mapId: string; x: number; y: number; facing: Dir; player: PlayerStats; allies: PlayerStats[];
  flags: Record<string, boolean>; defeated: string[]; cb: EngineCallbacks;
}

const DIR_KEYS: Record<string, [number, number]> = {
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const TRIANGLE: Record<Element, Element> = { fire: 'earth', earth: 'water', water: 'fire', light: 'dark', dark: 'light' };
function elementAdv(a: Element, b: Element): number { if (TRIANGLE[a] === b) return 1.5; if (TRIANGLE[b] === a) return 0.75; return 1.0; }
function mitigate(raw: number, def: number): number { return Math.max(Math.floor(raw * 0.05), (raw * 100) / (100 + Math.max(0, def))); }
function hit(att: { atk: number; crit: number; element: Element }, def: { def: number; element: Element }, mult: number) {
  const ele = elementAdv(att.element, def.element); const crit = Math.random() < att.crit;
  const raw = att.atk * mult * ele * (crit ? 1.6 : 1);
  return { dmg: Math.max(1, Math.round(mitigate(raw, def.def))), crit, strong: ele > 1.05 };
}
function dirFromAngle(ang: number): Dir { const c = Math.cos(ang), s = Math.sin(ang); if (Math.abs(c) >= Math.abs(s)) return c >= 0 ? 'east' : 'west'; return s >= 0 ? 'south' : 'north'; }

interface Enemy { id: string; templateId: string; sprite: string; level: number; x: number; y: number; hp: number; maxHp: number; atk: number; def: number; spd: number; crit: number; element: Element; speed: number; atkCd: number; flash: number; facing: Dir; ranged: boolean; isBoss: boolean; packId?: string; setsFlag?: string; wallSide: number; }
interface Ally { templateId: string; x: number; y: number; atk: number; def: number; crit: number; element: Element; power: number; ranged: boolean; speed: number; atkCd: number; facing: Dir; moving: boolean; }
interface Projectile { x: number; y: number; vx: number; vy: number; life: number; dmg: number; crit: boolean; fromEnemy: boolean; }
interface Orb { x: number; y: number; vx: number; vy: number; life: number; }
interface LootDrop { x: number; y: number; itemLevel: number; rarity: number; life: number; }

const BIOME: Record<string, { floorA: string; floorB: string; wall: string; wallTop: string; fog: number }> = {
  town: { floorA: '#2a2620', floorB: '#221d17', wall: '#3a3128', wallTop: '#4c4034', fog: 0x140d0a },
  field: { floorA: '#222a1b', floorB: '#1b2216', wall: '#2e3a25', wallTop: '#3f4c30', fog: 0x0f140c },
  crypt: { floorA: '#1a1822', floorB: '#15131d', wall: '#2a2734', wallTop: '#3b3749', fog: 0x0b0810 },
};
interface SpriteEntry { mat: THREE.MeshBasicMaterial; aspect: number; ready: boolean; }

export class AdventureEngine {
  private canvas: HTMLCanvasElement;
  private cb: EngineCallbacks;
  private map!: AdventureMap;
  private tile = 32;

  // sim state
  private player: PlayerStats; private hp: number;
  private px = 0; private py = 0; private facing: Dir = 'south';
  private flags: Record<string, boolean>; private defeated: Set<string>;
  private raf = 0; private last = 0; private running = false; private paused = false;
  private keys = new Set<string>(); private vdir: [number, number] = [0, 0]; private pointerDown = false;
  private attackCd = 0; private attackAnim = 0; private attackHeld = false;
  private invuln = 0; private dashTime = 0; private dashVX = 0; private dashVY = 0; private dashCd = 0;
  private xp = 0; private playerMoving = false; private animClock = 0;
  private enemies: Enemy[] = []; private allies: Ally[] = []; private allyRoster: PlayerStats[] = [];
  private projs: Projectile[] = []; private orbs: Orb[] = []; private drops: LootDrop[] = [];
  private activatedPacks = new Set<string>(); private spawnTimers = new Map<EncounterZone, number>();

  // three.js
  private renderer: THREE.WebGLRenderer; private scene: THREE.Scene; private cam: THREE.PerspectiveCamera;
  private staticGroup = new THREE.Group();
  private quad = new THREE.PlaneGeometry(1, 1);
  private slab = this.makeSlab(10, 0.34); // extruded sprite: stacked layers w/ depth = pseudo-3D volume
  private sphere = new THREE.SphereGeometry(0.16, 8, 6);
  private gem = new THREE.OctahedronGeometry(0.26);
  private sprites = new Map<string, SpriteEntry>();
  private playerMesh!: THREE.Mesh;
  private enemyMeshes: THREE.Mesh[] = []; private hpBg: THREE.Mesh[] = []; private hpFill: THREE.Mesh[] = [];
  private allyMeshes: THREE.Mesh[] = [];
  private projMeshes: THREE.Mesh[] = []; private orbMeshes: THREE.Mesh[] = []; private dropMeshes: THREE.Mesh[] = [];
  private npcMeshes: { mesh: THREE.Mesh; npc: NPC }[] = [];
  private gateMeshes: { mesh: THREE.Mesh; flag: string }[] = [];
  private pickupMarks: { mesh: THREE.Mesh; setsFlag: string; req?: string }[] = [];
  private doorMats: THREE.MeshStandardMaterial[] = [];
  private projMatP = new THREE.MeshBasicMaterial({ color: 0xffe08a });
  private projMatE = new THREE.MeshBasicMaterial({ color: 0xb06bff });
  private orbMat = new THREE.MeshBasicMaterial({ color: 0xffd36b });
  private rarityMats: THREE.MeshBasicMaterial[] = RARITY.map((r) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r.color || '#ffffff') }));
  private blankMat = new THREE.MeshBasicMaterial({ transparent: true });
  private hpBgMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  private hpFillMat = new THREE.MeshBasicMaterial({ color: 0xc0392b });
  private hpFillBossMat = new THREE.MeshBasicMaterial({ color: 0xe05a48 });
  private floorCleared = false;
  private killStall = 0; // ms since the dungeon enemy count last dropped (anti-stuck safety)
  private descendMesh?: THREE.Mesh;

  constructor(canvas: HTMLCanvasElement, init: EngineInit) {
    this.canvas = canvas; this.cb = init.cb; this.player = init.player; this.hp = init.player.maxHp;
    this.flags = { ...init.flags }; this.defeated = new Set(init.defeated); this.allyRoster = init.allies ?? [];

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(55, 1.5, 0.1, 200);
    this.scene.add(new THREE.AmbientLight(0x8a84a0, 1.0));
    const key = new THREE.DirectionalLight(0xffe6c8, 0.9); key.position.set(6, 14, 4); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xc0392b, 0.35); rim.position.set(-6, 5, -8); this.scene.add(rim);
    this.scene.add(this.staticGroup);
    this.playerMesh = new THREE.Mesh(this.slab, new THREE.MeshBasicMaterial({ transparent: true }));
    this.scene.add(this.playerMesh);

    this.setMap(init.mapId, init.x, init.y, init.facing);
    this.resize();
  }

  // ---------------- lifecycle ----------------
  start(): void {
    if (this.running) return; this.running = true;
    window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('pointerdown', this.onPointerDown); window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('resize', this.resize);
    window.addEventListener('blur', this.clearInput); document.addEventListener('visibilitychange', this.onVisibility);
    this.last = performance.now(); this.raf = requestAnimationFrame(this.loop);
  }
  destroy(): void {
    this.running = false; cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown); window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('blur', this.clearInput); document.removeEventListener('visibilitychange', this.onVisibility);
    this.keys.clear(); this.renderer.dispose();
  }
  // Release all inputs when the window loses focus / tab is hidden, so a held
  // key or d-pad press can never strand the hero auto-running in one direction.
  private clearInput = (): void => { this.keys.clear(); this.vdir = [0, 0]; this.pointerDown = false; this.attackHeld = false; };
  private onVisibility = (): void => { if (document.visibilityState !== 'visible') this.clearInput(); };
  pause(): void { this.paused = true; this.keys.clear(); this.vdir = [0, 0]; this.pointerDown = false; }
  resume(): void { this.paused = false; this.last = performance.now(); }
  syncState(s: { flags?: Record<string, boolean>; defeated?: string[] }): void { if (s.flags) this.flags = { ...s.flags }; if (s.defeated) this.defeated = new Set(s.defeated); }
  setPlayer(p: PlayerStats): void { const ratio = this.hp / this.player.maxHp; this.player = p; this.hp = Math.max(1, Math.round(p.maxHp * ratio)); }
  setVirtualDir(dx: number, dy: number): void { this.vdir = [dx, dy]; }
  setAllies(list: PlayerStats[]): void { this.allyRoster = list; this.spawnAllies(); }

  attackAuto(): void { const e = this.nearestEnemy(); if (e) this.swing(Math.atan2(e.y - this.py, e.x - this.px)); else this.attackFacing(); }
  attackFacing(): void { this.swing(this.facingAngle()); }
  dodge(): void {
    if (this.paused || this.dashCd > 0) return;
    let dx = this.vdir[0], dy = this.vdir[1];
    for (const k of this.keys) { const d = DIR_KEYS[k]; if (d) { dx += d[0]; dy += d[1]; } }
    if (dx === 0 && dy === 0) { const a = this.facingAngle(); dx = Math.cos(a); dy = Math.sin(a); }
    const l = Math.hypot(dx, dy) || 1; this.dashVX = dx / l; this.dashVY = dy / l;
    this.dashTime = 165; this.invuln = 300; this.dashCd = 480; this.facing = dirFromAngle(Math.atan2(this.dashVY, this.dashVX));
  }

  private resize = (): void => {
    const w = this.canvas.clientWidth || 480, h = this.canvas.clientHeight || 360;
    this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
  };

  // ---------------- input ----------------
  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Enter' || e.code === 'KeyE') { e.preventDefault(); this.interact(); return; }
    if (e.code === 'KeyJ' || e.code === 'KeyZ') { e.preventDefault(); this.attackHeld = true; this.attackFacing(); return; }
    if (e.code === 'Space' || e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { e.preventDefault(); this.dodge(); return; }
    if (DIR_KEYS[e.code]) { e.preventDefault(); this.keys.add(e.code); }
  };
  private onKeyUp = (e: KeyboardEvent): void => { if (e.code === 'KeyJ' || e.code === 'KeyZ') this.attackHeld = false; this.keys.delete(e.code); };
  private onPointerDown = (e: PointerEvent): void => { e.preventDefault(); this.pointerDown = true; this.attackAuto(); };
  private onPointerUp = (): void => { this.pointerDown = false; };

  private facingAngle(): number { return ({ east: 0, west: Math.PI, south: Math.PI / 2, north: -Math.PI / 2 } as Record<Dir, number>)[this.facing]; }
  private nearestEnemy(): Enemy | null { let best: Enemy | null = null, bd = Infinity; for (const e of this.enemies) { const d = (e.x - this.px) ** 2 + (e.y - this.py) ** 2; if (d < bd) { bd = d; best = e; } } return best; }
  private npcVisible(n: NPC): boolean { if (n.hideAfterFlag && this.flags[n.hideAfterFlag]) return false; if (n.requiresFlag && !this.flags[n.requiresFlag]) return false; return true; }

  // ---------------- map / collision ----------------
  loadMap(mapId: string, x = -1, y = -1, facing: Dir = 'south'): void { this.setMap(mapId, x, y, facing); this.resume(); }
  private setMap(mapId: string, x: number, y: number, facing: Dir): void {
    const m = RUNTIME_MAPS[mapId] ?? ADVENTURE_MAPS[mapId]; if (!m) throw new Error(`unknown map ${mapId}`);
    this.map = m; this.tile = m.tile;
    const sx = x < 0 ? m.spawn.x : x, sy = y < 0 ? m.spawn.y : y;
    this.px = sx * this.tile + this.tile / 2; this.py = sy * this.tile + this.tile / 2; this.facing = facing;
    this.enemies = []; this.projs = []; this.orbs = []; this.drops = []; this.activatedPacks.clear(); this.spawnTimers.clear();
    this.floorCleared = false; this.killStall = 0;
    this.clearInput(); // drop any held key so it can't carry across a transition and strand movement
    this.spawnAllies();
    this.buildScene();
    if (m.dungeon) this.spawnWave(m.dungeon);
    this.cb.onHud({ map: m.id, hp: this.hp, maxHp: this.player.maxHp, enemies: 0, xp: this.xp });
  }
  private spawnWave(dm: DungeonMeta): void {
    for (let i = 0; i < dm.count; i++) {
      const boss = dm.boss && i === 0;
      let wx = 0, wy = 0, ok = false;
      for (let t = 0; t < 24; t++) {
        const x = (1 + Math.random() * (this.map.w - 2)) * this.tile, y = (1 + Math.random() * (this.map.h - 3)) * this.tile;
        if (this.canBe(x, y, 10) && (x - this.px) ** 2 + (y - this.py) ** 2 > (this.tile * 3.5) ** 2) { wx = x; wy = y; ok = true; break; }
      }
      if (!ok) continue;
      const id = boss && dm.enemies.includes('graveyardlich') ? 'graveyardlich' : dm.enemies[Math.floor(Math.random() * dm.enemies.length)];
      this.spawnEnemy(id, dm.level + (boss ? 2 : 0), wx, wy, { isBoss: boss });
    }
  }
  private spawnAllies(): void {
    this.allies = this.allyRoster.map((p, i) => {
      const a = ((i + 1) / (this.allyRoster.length + 1)) * Math.PI * 2;
      return { templateId: p.templateId, x: this.px + Math.cos(a) * this.tile * 1.3, y: this.py + Math.sin(a) * this.tile * 1.3, atk: p.atk, def: p.def, crit: p.crit, element: p.element, power: p.power, ranged: p.ranged, speed: 116, atkCd: 0, facing: 'south', moving: false };
    });
  }
  private solidPx(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / this.tile), ty = Math.floor(wy / this.tile);
    if (tx < 0 || ty < 0 || tx >= this.map.w || ty >= this.map.h) return true;
    if (this.map.solid[ty * this.map.w + tx] === 1) return true;
    return (this.map.gateDoors ?? []).some((g) => g.x === tx && g.y === ty && !this.flags[g.openFlag]);
  }
  private canBe(wx: number, wy: number, r: number): boolean {
    return !this.solidPx(wx - r, wy - r) && !this.solidPx(wx + r, wy - r) && !this.solidPx(wx - r, wy + r) && !this.solidPx(wx + r, wy + r);
  }

  private interact(): void {
    if (this.paused) return;
    const reach = this.tile * 1.4; let best: NPC | null = null, bd = reach * reach;
    for (const n of this.map.npcs ?? []) { if (!this.npcVisible(n)) continue; const d = (n.x * this.tile + this.tile / 2 - this.px) ** 2 + (n.y * this.tile + this.tile / 2 - this.py) ** 2; if (d < bd) { bd = d; best = n; } }
    if (best) { this.pause(); const id = best.altDialogueId && best.altFlag && this.flags[best.altFlag] ? best.altDialogueId : best.dialogueId; this.cb.onDialogue({ dialogueId: id, npcId: best.id, recruits: best.recruits, shop: best.shop, heal: best.heal }); return; }
    for (const s of this.map.signs ?? []) { const d = (s.x * this.tile + this.tile / 2 - this.px) ** 2 + (s.y * this.tile + this.tile / 2 - this.py) ** 2; if (d < reach * reach) { this.pause(); this.cb.onDialogue({ dialogueId: s.dialogueId }); return; } }
  }

  private swing(ang: number): void {
    if (this.paused || this.attackCd > 0) return;
    this.facing = dirFromAngle(ang); this.attackCd = clamp(360 - this.player.spd, 150, 360); this.attackAnim = 180;
    if (this.player.ranged) {
      const sp = 320, c = Math.random() < this.player.crit;
      this.projs.push({ x: this.px, y: this.py, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 900, dmg: this.player.atk, crit: c, fromEnemy: false });
    } else {
      const range = this.tile * 1.35;
      for (const e of this.enemies) { const dx = e.x - this.px, dy = e.y - this.py; if (dx * dx + dy * dy > range * range) continue; let diff = Math.abs(Math.atan2(dy, dx) - ang); if (diff > Math.PI) diff = Math.PI * 2 - diff; if (diff <= 1.3) this.damageEnemy(e, this.player.power); }
    }
  }
  private damageEnemy(e: Enemy, mult: number, src: { atk: number; crit: number; element: Element } = this.player): void {
    const h = hit({ atk: src.atk, crit: src.crit, element: src.element }, { def: e.def, element: e.element }, mult);
    e.hp -= h.dmg; e.flash = 120; if (e.hp <= 0) this.killEnemy(e);
  }
  private killEnemy(e: Enemy): void {
    this.enemies = this.enemies.filter((x) => x !== e);
    this.killStall = 0; // progress made — reset the anti-stuck timer
    const gain = Math.round(e.isBoss ? 400 : 12 + e.maxHp * 0.04); this.xp += gain; this.cb.onXp(gain);
    for (let i = 0, n = e.isBoss ? 8 : 2; i < n; i++) { const a = Math.random() * Math.PI * 2; this.orbs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 6000 }); }
    const dropChance = e.isBoss ? 1 : e.templateId === 'graveyardlich' ? 0.5 : 0.16;
    if (Math.random() < dropChance) {
      const rarity = rollRarity(e.isBoss ? 2 : 0, e.isBoss ? 3 : 1);
      this.drops.push({ x: e.x, y: e.y, itemLevel: Math.max(2, e.level * 2), rarity, life: 45000 });
    }
    if (e.packId && !this.enemies.some((x) => x.packId === e.packId)) { this.defeated.add(e.packId); if (e.setsFlag) this.flags[e.setsFlag] = true; this.cb.onFlag(e.setsFlag ?? '', e.packId); }
    if (this.map.dungeon && !this.floorCleared && this.enemies.length === 0) { this.floorCleared = true; this.cb.onFloorCleared(); }
  }
  private spawnEnemy(templateId: string, level: number, wx: number, wy: number, opts: { isBoss?: boolean; packId?: string; setsFlag?: string } = {}): void {
    const def = ENEMIES[templateId]; if (!def) return; const s = statsAtLevel(def.base, level);
    const maxHp = Math.round(s.hp * (opts.isBoss ? 4 : 1));
    this.enemies.push({ id: `${templateId}_${this.enemies.length}_${Math.floor(wx)}`, templateId, sprite: templateId, level, x: wx, y: wy, hp: maxHp, maxHp, atk: Math.round(s.atk * (opts.isBoss ? 0.9 : 0.6)), def: s.def, spd: s.spd, crit: s.crit, element: def.element, speed: 30 + s.spd * 0.7, atkCd: 700, flash: 0, facing: 'south', ranged: def.ranged, isBoss: !!opts.isBoss, packId: opts.packId, setsFlag: opts.setsFlag, wallSide: 1 });
  }
  private updateSpawns(dt: number): void {
    for (const z of this.map.encounterZones ?? []) {
      const inZone = this.px >= z.x * this.tile && this.px < (z.x + z.w) * this.tile && this.py >= z.y * this.tile && this.py < (z.y + z.h) * this.tile;
      const cap = z.max + 1; const count = this.enemies.filter((e) => !e.packId).length; let t = (this.spawnTimers.get(z) ?? 0) - dt;
      if (inZone && count < cap && t <= 0) {
        for (let tries = 0; tries < 8; tries++) {
          const wx = (z.x + Math.random() * z.w) * this.tile, wy = (z.y + Math.random() * z.h) * this.tile;
          if (!this.canBe(wx, wy, 10)) continue; if ((wx - this.px) ** 2 + (wy - this.py) ** 2 < (this.tile * 3) ** 2) continue;
          this.spawnEnemy(z.enemies[Math.floor(Math.random() * z.enemies.length)], z.minLevel + Math.floor(Math.random() * (z.maxLevel - z.minLevel + 1)), wx, wy); break;
        }
        t = 1400;
      }
      this.spawnTimers.set(z, t);
    }
    for (const f of this.map.fixedEncounters ?? []) {
      if (this.defeated.has(f.id) || this.activatedPacks.has(f.id)) continue; if (f.requiresFlag && !this.flags[f.requiresFlag]) continue;
      const fx = f.x * this.tile + this.tile / 2, fy = f.y * this.tile + this.tile / 2; if ((fx - this.px) ** 2 + (fy - this.py) ** 2 > (this.tile * 6) ** 2) continue;
      this.activatedPacks.add(f.id);
      f.enemies.forEach((id, i) => { const a = (i / f.enemies.length) * Math.PI * 2; const ox = fx + Math.cos(a) * this.tile * 1.2, oy = fy + Math.sin(a) * this.tile * 1.2; const ok = this.canBe(ox, oy, 10); this.spawnEnemy(id, f.levels[i] ?? f.levels[0] ?? 5, ok ? ox : fx, ok ? oy : fy, { isBoss: f.isBoss, packId: f.id, setsFlag: f.setsFlag }); });
    }
  }
  private worldTriggers(): void {
    const tx = Math.floor(this.px / this.tile), ty = Math.floor(this.py / this.tile);
    if (this.map.dungeon) {
      const dm = this.map.dungeon;
      if (tx === dm.exit.x && ty === dm.exit.y) { this.cb.onExitTown(); return; }
      if (this.floorCleared && tx === dm.descend.x && ty === dm.descend.y) { this.cb.onDescend(); return; }
      return; // dungeon floors have no static warps/pickups/shrines
    }
    const warp = (this.map.warps ?? []).find((w) => w.x === tx && w.y === ty);
    if (warp) { this.cb.onAutosave(warp.toMap, warp.toX, warp.toY, warp.facing); this.setMap(warp.toMap, warp.toX, warp.toY, warp.facing); return; }
    const pk = (this.map.pickups ?? []).find((p) => p.x === tx && p.y === ty && !this.flags[p.setsFlag] && (!p.requiresFlag || this.flags[p.requiresFlag]));
    if (pk) { this.pause(); this.cb.onDialogue({ dialogueId: pk.dialogueId ?? '', pickupId: pk.id, setsFlag: pk.setsFlag }); return; }
    if ((this.map.shrines ?? []).some((s) => s.x === tx && s.y === ty)) { this.hp = this.player.maxHp; this.cb.onAutosave(this.map.id, tx, ty, this.facing); this.cb.onShrine(); }
  }
  private hurtPlayer(h: { dmg: number; crit: boolean; strong: boolean }): void { if (this.invuln > 0) return; this.hp -= h.dmg; if (this.hp <= 0 && !this.paused) { this.pause(); this.cb.onDeath(); } }

  // ---------------- loop / update (sim) ----------------
  private loop = (now: number): void => { if (!this.running) return; const dt = Math.min(50, now - this.last); this.last = now; if (!this.paused) this.update(dt); this.render(); this.raf = requestAnimationFrame(this.loop); };
  private update(dt: number): void {
    const s = dt / 1000; this.animClock += dt; if (this.dashCd > 0) this.dashCd -= dt; if (this.invuln > 0) this.invuln -= dt; const r = 10;
    if (this.dashTime > 0) { this.dashTime -= dt; const ds = 360; const nx = this.px + this.dashVX * ds * s; if (this.canBe(nx, this.py, r)) this.px = nx; const ny = this.py + this.dashVY * ds * s; if (this.canBe(this.px, ny, r)) this.py = ny; this.playerMoving = true; }
    else {
      let ix = this.vdir[0], iy = this.vdir[1]; for (const k of this.keys) { const d = DIR_KEYS[k]; if (d) { ix += d[0]; iy += d[1]; } }
      const len = Math.hypot(ix, iy); this.playerMoving = len > 0;
      if (len > 0) { ix /= len; iy /= len; const sp = 120; const nx = this.px + ix * sp * s; if (this.canBe(nx, this.py, r)) this.px = nx; const ny = this.py + iy * sp * s; if (this.canBe(this.px, ny, r)) this.py = ny; if (this.attackAnim <= 0) this.facing = dirFromAngle(Math.atan2(iy, ix)); }
    }
    if (this.attackCd > 0) this.attackCd -= dt; if (this.attackAnim > 0) this.attackAnim -= dt;
    if (this.attackHeld && this.attackCd <= 0) this.attackFacing();
    if (this.pointerDown && this.attackCd <= 0) this.attackAuto();
    this.updateSpawns(dt);

    for (const e of this.enemies) {
      if (e.flash > 0) e.flash -= dt; if (e.atkCd > 0) e.atkCd -= dt;
      const dx = this.px - e.x, dy = this.py - e.y, dist = Math.hypot(dx, dy) || 1; e.facing = dirFromAngle(Math.atan2(dy, dx));
      const range = e.ranged ? this.tile * 5 : this.tile * 0.7;
      if (dist > range) {
        const vx = (dx / dist) * e.speed * s, vy = (dy / dist) * e.speed * s;
        const ox = e.x, oy = e.y;
        if (this.canBe(e.x + vx, e.y, 9)) e.x += vx;
        if (this.canBe(e.x, e.y + vy, 9)) e.y += vy;
        // fully blocked → slide perpendicular (wall-follow) to get around the obstacle
        if (e.x === ox && e.y === oy) {
          const tx = -(dy / dist) * e.speed * s * e.wallSide, ty = (dx / dist) * e.speed * s * e.wallSide;
          if (this.canBe(e.x + tx, e.y + ty, 9)) { e.x += tx; e.y += ty; }
          else if (this.canBe(e.x - tx, e.y - ty, 9)) { e.x -= tx; e.y -= ty; e.wallSide = -e.wallSide; }
          else e.wallSide = -e.wallSide;
        }
      }
      if (e.atkCd <= 0 && dist <= range + (e.ranged ? 0 : this.tile * 0.4)) {
        e.atkCd = e.ranged ? 1300 : 900;
        if (e.ranged) { const a = Math.atan2(dy, dx), sp = 160; const h = hit({ atk: e.atk, crit: e.crit, element: e.element }, { def: this.player.def, element: this.player.element }, 1); this.projs.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 2500, dmg: h.dmg, crit: h.crit, fromEnemy: true }); }
        else this.hurtPlayer(hit({ atk: e.atk, crit: e.crit, element: e.element }, { def: this.player.def, element: this.player.element }, 1));
      }
    }
    for (const a of this.allies) {
      if (a.atkCd > 0) a.atkCd -= dt; let tgt: Enemy | null = null, bd = (this.tile * 6) ** 2;
      for (const e of this.enemies) { const dd = (e.x - a.x) ** 2 + (e.y - a.y) ** 2; if (dd < bd) { bd = dd; tgt = e; } }
      const goX = tgt ? tgt.x : this.px, goY = tgt ? tgt.y : this.py; const dx = goX - a.x, dy = goY - a.y, dist = Math.hypot(dx, dy) || 1; a.facing = dirFromAngle(Math.atan2(dy, dx));
      const stop = tgt ? (a.ranged ? this.tile * 4 : this.tile * 0.9) : this.tile * 1.6;
      a.moving = dist > stop;
      if (dist > stop) { const vx = (dx / dist) * a.speed * s, vy = (dy / dist) * a.speed * s; if (this.canBe(a.x + vx, a.y, 9)) a.x += vx; if (this.canBe(a.x, a.y + vy, 9)) a.y += vy; }
      if (tgt && a.atkCd <= 0 && dist <= (a.ranged ? this.tile * 4.5 : this.tile * 1.2)) { a.atkCd = a.ranged ? 650 : 420; if (a.ranged) { const ang = Math.atan2(dy, dx), sp = 300; this.projs.push({ x: a.x, y: a.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 800, dmg: a.atk, crit: false, fromEnemy: false }); } else this.damageEnemy(tgt, a.power, a); }
    }
    for (const p of this.projs) {
      // homing: player/ally shots curve toward the nearest enemy
      if (!p.fromEnemy) {
        let tgt: Enemy | null = null, bd = Infinity;
        for (const e of this.enemies) { const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2; if (d < bd) { bd = d; tgt = e; } }
        // only curve while the target is still far — close up it flies straight so
        // it lands a hit instead of orbiting (the turn rate can't track a near target)
        if (tgt && bd > (this.tile * 1.6) ** 2) {
          const sp = Math.hypot(p.vx, p.vy) || 1;
          const cur = Math.atan2(p.vy, p.vx);
          let diff = Math.atan2(tgt.y - p.y, tgt.x - p.x) - cur;
          while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
          const na = cur + Math.sign(diff) * Math.min(Math.abs(diff), HOMING_TURN * s);
          p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
        }
      }
      p.x += p.vx * s; p.y += p.vy * s; p.life -= dt; if (this.solidPx(p.x, p.y)) { p.life = 0; continue; }
      if (p.fromEnemy) { if ((p.x - this.px) ** 2 + (p.y - this.py) ** 2 < 144) { this.hurtPlayer({ dmg: p.dmg, crit: p.crit, strong: false }); p.life = 0; } }
      else { for (const e of this.enemies) { if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < (this.tile * 0.6) ** 2) { this.damageEnemy(e, this.player.power); p.life = 0; break; } } }
    }
    this.projs = this.projs.filter((p) => p.life > 0);
    for (const o of this.orbs) { o.life -= dt; o.vx *= 0.9; o.vy *= 0.9; o.x += o.vx * s; o.y += o.vy * s; const dd = (o.x - this.px) ** 2 + (o.y - this.py) ** 2; if (dd < (this.tile * 1.6) ** 2) { const a = Math.atan2(this.py - o.y, this.px - o.x); o.x += Math.cos(a) * 140 * s; o.y += Math.sin(a) * 140 * s; } if (dd < 100) o.life = 0; }
    this.orbs = this.orbs.filter((o) => o.life > 0);
    for (const d of this.drops) { d.life -= dt; if ((d.x - this.px) ** 2 + (d.y - this.py) ** 2 < (this.tile * 1.0) ** 2) { this.cb.onPickupLoot(d.itemLevel, d.rarity); d.life = 0; } }
    this.drops = this.drops.filter((d) => d.life > 0);
    // anti-stuck safety: if a dungeon floor's leftover enemies are unreachable and
    // no kill lands for a while, clear them so the stairs can still appear.
    if (this.map.dungeon && !this.floorCleared && this.enemies.length > 0) {
      this.killStall += dt;
      const n = this.nearestEnemy();
      const far = !n || (n.x - this.px) ** 2 + (n.y - this.py) ** 2 > (this.tile * 3) ** 2;
      if (this.killStall > 14000 && far) { this.enemies = []; this.floorCleared = true; this.cb.onFloorCleared(); }
    }
    this.worldTriggers();
    this.cb.onHud({ map: this.map.id, hp: Math.max(0, Math.round(this.hp)), maxHp: this.player.maxHp, enemies: this.enemies.length, xp: this.xp });
  }

  // ---------------- sprites (cropped, size-normalized textures) ----------------
  private getSprite(path: string): SpriteEntry {
    let e = this.sprites.get(path); if (e) return e;
    const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true });
    e = { mat, aspect: 0.6, ready: false }; this.sprites.set(path, e);
    const setup = (img: HTMLImageElement, entry: SpriteEntry) => {
      const tr = getTrim(img); const tex = new THREE.Texture(img);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
      tex.offset.set(tr.sx / img.naturalWidth, 1 - (tr.sy + tr.sh) / img.naturalHeight);
      tex.repeat.set(tr.sw / img.naturalWidth, tr.sh / img.naturalHeight); tex.needsUpdate = true;
      entry.mat.map = tex; entry.mat.needsUpdate = true; entry.aspect = tr.sw / tr.sh; entry.ready = true;
    };
    loadImage(asset(path)).then((img) => setup(img, e!)).catch(() => {
      const south = path.replace(/_(north|east|west)\.png$/, '_south.png');
      if (south !== path) loadImage(asset(south)).then((img) => setup(img, e!)).catch(() => { /* keep blank */ });
    });
    return e;
  }
  private billboard(mesh: THREE.Mesh, key: string, dir: Dir, enemy: boolean, px: number, py: number, h: number): void {
    const folder = enemy ? 'enemies' : 'heroes';
    const e = this.getSprite(`sprites/pixellab/${folder}/pro/${key}_${dir}.png`);
    mesh.material = e.mat; mesh.scale.set(h * e.aspect, h, 1);
    mesh.position.set(px / this.tile, h / 2, py / this.tile); mesh.visible = true;
  }
  // Animated hero: plays the right spritesheet (idle/walk/attack) + direction row.
  // Each mesh keeps its own per-state material/texture so frame offsets don't clash.
  private animBillboard(mesh: THREE.Mesh, heroId: string, facing: Dir, state: 'idle' | 'walk' | 'attack', px: number, py: number): void {
    const a = HEROES[heroId]?.anim; if (!a) { this.billboard(mesh, heroId, facing, false, px, py, HERO_H); return; }
    let store = mesh.userData.anim as Record<string, THREE.MeshBasicMaterial> | undefined;
    if (!store) { store = {}; mesh.userData.anim = store; }
    let mat = store[state];
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, vertexColors: true });
      store[state] = mat;
      loadImage(asset(`${a.base}/${state}.png`)).then((img) => {
        const tex = new THREE.Texture(img); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
        tex.repeat.set(1 / a.cols, 1 / a.rows); tex.needsUpdate = true; mat!.map = tex; mat!.needsUpdate = true;
      }).catch(() => {});
    }
    const row = (a.dir as Record<string, number>)[facing] ?? a.dir.south;
    const fr = Math.floor((this.animClock / 1000) * a.fps) % a.cols;
    if (mat.map) mat.map.offset.set(fr / a.cols, 1 - (row + 1) / a.rows);
    mesh.material = mat; mesh.scale.set(a.h, a.h, 1);
    mesh.position.set(px / this.tile, a.h / 2, py / this.tile); mesh.visible = true;
  }
  private renderHero(mesh: THREE.Mesh, heroId: string, facing: Dir, moving: boolean, attacking: boolean, px: number, py: number): void {
    if (HEROES[heroId]?.anim) this.animBillboard(mesh, heroId, facing, attacking ? 'attack' : moving ? 'walk' : 'idle', px, py);
    else this.billboard(mesh, heroId, facing, false, px, py, HERO_H);
  }
  private getMesh(pool: THREE.Mesh[], i: number, geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
    if (!pool[i]) { const m = new THREE.Mesh(geo, mat); m.visible = false; this.scene.add(m); pool[i] = m; }
    return pool[i];
  }
  // A stack of N sprite quads spaced along depth (Z), shaded darker toward the
  // back — extrudes a flat sprite into a 3D-looking slab (Smack-Studio style).
  private makeSlab(layers: number, depth: number): THREE.BufferGeometry {
    const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
    for (let i = 0; i < layers; i++) {
      const f = layers === 1 ? 1 : i / (layers - 1); // 0 = back, 1 = front (toward camera)
      const z = (f - 0.5) * depth, sh = 0.5 + 0.5 * f, b = pos.length / 3;
      pos.push(-0.5, -0.5, z, 0.5, -0.5, z, 0.5, 0.5, z, -0.5, 0.5, z);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      for (let k = 0; k < 4; k++) col.push(sh, sh, sh);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  }

  // ---------------- static scene build ----------------
  private floorTexture(b: { floorA: string; floorB: string }): THREE.Texture {
    const sCanvas = document.createElement('canvas'); sCanvas.width = sCanvas.height = 64; const x = sCanvas.getContext('2d')!;
    x.fillStyle = b.floorA; x.fillRect(0, 0, 64, 64); x.fillStyle = b.floorB; x.fillRect(0, 0, 32, 32); x.fillRect(32, 32, 32, 32);
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2; x.strokeRect(0, 0, 32, 32); x.strokeRect(32, 32, 32, 32);
    const t = new THREE.CanvasTexture(sCanvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.repeat.set(this.map.w, this.map.h); return t;
  }
  private buildScene(): void {
    // wipe previous static content
    this.scene.remove(this.staticGroup);
    this.staticGroup.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry && m.geometry !== this.quad) m.geometry.dispose?.(); });
    this.staticGroup = new THREE.Group(); this.scene.add(this.staticGroup);
    for (const n of this.npcMeshes) this.scene.remove(n.mesh); // clear old map's NPC billboards (materials are shared/cached)
    this.gateMeshes = []; this.pickupMarks = []; this.npcMeshes = []; this.doorMats = []; this.descendMesh = undefined;
    const b = BIOME[this.map.biome ?? 'crypt'] ?? BIOME.crypt;
    this.scene.background = new THREE.Color(b.fog); this.scene.fog = new THREE.Fog(b.fog, 16, 46);

    // floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.map.w, this.map.h), new THREE.MeshStandardMaterial({ map: this.floorTexture(b), roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(this.map.w / 2, 0, this.map.h / 2); this.staticGroup.add(floor);

    // walls (instanced cubes for solid cells)
    const cells: [number, number][] = [];
    for (let y = 0; y < this.map.h; y++) for (let x = 0; x < this.map.w; x++) if (this.map.solid[y * this.map.w + x] === 1) cells.push([x, y]);
    if (cells.length) {
      const wallMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(b.wall), roughness: 1 });
      const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1.5, 1), wallMat, cells.length);
      const mtx = new THREE.Matrix4();
      cells.forEach(([x, y], i) => { mtx.makeTranslation(x + 0.5, 0.75, y + 0.5); inst.setMatrixAt(i, mtx); });
      inst.instanceMatrix.needsUpdate = true; this.staticGroup.add(inst);
    }
    // gate doors (toggle by flag)
    for (const g of this.map.gateDoors ?? []) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1.6, 1), new THREE.MeshStandardMaterial({ color: 0x6b3a2a, roughness: 0.9, emissive: 0x2a0f08, emissiveIntensity: 0.4 }));
      mesh.position.set(g.x + 0.5, 0.8, g.y + 0.5); this.staticGroup.add(mesh); this.gateMeshes.push({ mesh, flag: g.openFlag });
    }
    // warp portals
    for (const w of this.map.warps ?? []) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x241036, emissive: 0x7fbfff, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 });
      const portal = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), mat); portal.position.set(w.x + 0.5, 0.85, w.y + 0.5); this.staticGroup.add(portal); this.doorMats.push(mat);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.3), new THREE.MeshStandardMaterial({ color: 0x4a3f33, roughness: 1 })); frame.position.set(w.x + 0.5, 0.95, w.y + 0.5 - 0.2); this.staticGroup.add(frame);
    }
    // shrines + signs + pickups
    for (const sh of this.map.shrines ?? []) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), new THREE.MeshStandardMaterial({ color: 0x3a4452, emissive: 0x2f6f9a, emissiveIntensity: 0.7 })); m.position.set(sh.x + 0.5, 0.45, sh.y + 0.5); this.staticGroup.add(m); }
    for (const sg of this.map.signs ?? []) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.15), new THREE.MeshStandardMaterial({ color: 0x6b513a, roughness: 1 })); m.position.set(sg.x + 0.5, 0.5, sg.y + 0.5); this.staticGroup.add(m); }
    for (const pk of this.map.pickups ?? []) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, emissive: 0x7fbfff, emissiveIntensity: 0.8 })); m.position.set(pk.x + 0.5, 0.6, pk.y + 0.5); this.staticGroup.add(m); this.pickupMarks.push({ mesh: m, setsFlag: pk.setsFlag, req: pk.requiresFlag }); }
    // NPCs as billboards
    for (const n of this.map.npcs ?? []) { const mesh = new THREE.Mesh(this.slab, new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true })); this.scene.add(mesh); this.npcMeshes.push({ mesh, npc: n }); }
    // dungeon portals: exit-to-town (red, always) + stairs-down (green, after clear)
    if (this.map.dungeon) {
      const dm = this.map.dungeon;
      const exitMat = new THREE.MeshStandardMaterial({ color: 0x3a1010, emissive: 0xff5a3a, emissiveIntensity: 0.6, transparent: true, opacity: 0.92 });
      const exit = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.7), exitMat); exit.position.set(dm.exit.x + 0.5, 0.9, dm.exit.y + 0.5); this.staticGroup.add(exit); this.doorMats.push(exitMat);
      const desMat = new THREE.MeshStandardMaterial({ color: 0x103a24, emissive: 0x6bffa0, emissiveIntensity: 0.7, transparent: true, opacity: 0.92 });
      const des = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.9), desMat); des.position.set(dm.descend.x + 0.5, 0.95, dm.descend.y + 0.5); des.visible = false; this.staticGroup.add(des); this.descendMesh = des; this.doorMats.push(desMat);
    }
  }

  // ---------------- 3D render ----------------
  private render(): void {
    const tx = this.px / this.tile, tz = this.py / this.tile;
    this.cam.position.set(tx, CAM_HEIGHT, tz + CAM_DIST); this.cam.lookAt(tx, LOOK_Y, tz);
    const pulse = 0.45 + 0.35 * Math.sin(performance.now() / 320);
    for (const m of this.doorMats) m.emissiveIntensity = pulse;
    for (const g of this.gateMeshes) g.mesh.visible = !this.flags[g.flag];
    for (const p of this.pickupMarks) p.mesh.visible = !this.flags[p.setsFlag] && (!p.req || this.flags[p.req]);
    if (this.descendMesh) this.descendMesh.visible = this.floorCleared;
    for (const n of this.npcMeshes) { if (this.npcVisible(n.npc)) this.billboard(n.mesh, n.npc.sprite, n.npc.facing, false, n.npc.x * this.tile + this.tile / 2, n.npc.y * this.tile + this.tile / 2, HERO_H); else n.mesh.visible = false; }

    // player
    this.renderHero(this.playerMesh, this.player.templateId, this.facing, this.playerMoving, this.attackAnim > 0, this.px, this.py);
    this.playerMesh.visible = this.invuln > 0 ? Math.floor(this.invuln / 80) % 2 === 0 : true;

    // enemies + hp bars
    let i = 0;
    for (const e of this.enemies) {
      const h = e.isBoss ? HERO_H * 1.35 : HERO_H;
      const m = this.getMesh(this.enemyMeshes, i, this.slab, this.blankMat); this.billboard(m, e.sprite, e.facing, true, e.x, e.y, h);
      const bg = this.getMesh(this.hpBg, i, this.quad, this.hpBgMat);
      const fill = this.getMesh(this.hpFill, i, this.quad, this.hpFillMat); fill.material = e.isBoss ? this.hpFillBossMat : this.hpFillMat;
      const bw = e.isBoss ? 1.4 : 0.9, frac = clamp(e.hp / e.maxHp, 0, 1), by = h + 0.25;
      bg.position.set(e.x / this.tile, by, e.y / this.tile); bg.scale.set(bw, 0.12, 1); bg.visible = true;
      fill.position.set(e.x / this.tile - (bw * (1 - frac)) / 2, by, e.y / this.tile + 0.01); fill.scale.set(bw * frac, 0.1, 1); fill.visible = true;
      i++;
    }
    for (let k = i; k < this.enemyMeshes.length; k++) { this.enemyMeshes[k].visible = false; if (this.hpBg[k]) this.hpBg[k].visible = false; if (this.hpFill[k]) this.hpFill[k].visible = false; }

    // allies
    let ai = 0; for (const a of this.allies) { const m = this.getMesh(this.allyMeshes, ai, this.slab, this.blankMat); this.renderHero(m, a.templateId, a.facing, a.moving, false, a.x, a.y); ai++; }
    for (let k = ai; k < this.allyMeshes.length; k++) this.allyMeshes[k].visible = false;

    // projectiles
    let pi = 0; for (const p of this.projs) { const m = this.getMesh(this.projMeshes, pi, this.sphere, p.fromEnemy ? this.projMatE : this.projMatP); m.material = p.fromEnemy ? this.projMatE : this.projMatP; m.position.set(p.x / this.tile, 0.9, p.y / this.tile); m.visible = true; pi++; }
    for (let k = pi; k < this.projMeshes.length; k++) this.projMeshes[k].visible = false;
    // orbs
    let oi = 0; for (const o of this.orbs) { const m = this.getMesh(this.orbMeshes, oi, this.sphere, this.orbMat); m.scale.setScalar(0.5); m.position.set(o.x / this.tile, 0.35, o.y / this.tile); m.visible = true; oi++; }
    for (let k = oi; k < this.orbMeshes.length; k++) this.orbMeshes[k].visible = false;
    // loot drops — gems colored by rarity, bobbing + spinning
    let li = 0; const tnow = performance.now();
    for (const d of this.drops) { const mat = this.rarityMats[d.rarity] ?? this.orbMat; const m = this.getMesh(this.dropMeshes, li, this.gem, mat); m.material = mat; m.position.set(d.x / this.tile, 0.5 + Math.sin(tnow / 300 + li) * 0.12, d.y / this.tile); m.rotation.y = tnow / 700; m.visible = true; li++; }
    for (let k = li; k < this.dropMeshes.length; k++) this.dropMeshes[k].visible = false;

    this.renderer.render(this.scene, this.cam);
  }
}

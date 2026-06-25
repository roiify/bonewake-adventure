import Dexie, { type EntityTable } from 'dexie';

export interface Profile {
  id: 'me';
  displayName: string;
  level: number;
  exp: number;
  energy: number;
  lastEnergyTick: number;
  gold: number;
  gems: number;
  friendPoints: number;
  pityCounter: number;
  tutorialDone: boolean;
  lastDailyClaim: string;
  signinStreak: number;
  lastClosedAt: number;
  createdAt: number;
  energyBuysToday?: number;
  energyBuysDate?: string;
  // Lifetime stat counters (persistent, never reset). Read by Achievements.
  lifetime?: LifetimeStats;
  // Tower
  towerHighestFloor?: number;
  towerWeekStart?: string;
  towerAttemptsDate?: string;
  towerAttemptsToday?: number;
  // Training Chamber
  trainingHeroId?: string | null;
  trainingStartedAt?: number | null;
  // World Boss
  worldBossWeek?: string;
  worldBossAttemptsUsed?: number;
  worldBossBestDamage?: number;
  worldBossClaimedTier?: number;
  // Settings
  settings?: GameSettings;
  // Tutorial
  tutorialStep?: number;
  welcomeMailSent?: boolean;
  // Active cosmetic title id (or null)
  activeTitle?: string | null;
  // Mystery box claim tracking
  mysteryBoxLastClaim?: string;  // YYYY-MM-DD
  // Mission Pass
  passSeasonStart?: string;       // YYYY-MM-DD (season start date)
  passXp?: number;
  passClaimedTiers?: number[];
  // Spirit Bomb
  spiritBossWeek?: string;
  spiritBossDamage?: number;
  spiritBossAttemptsUsed?: number;
  spiritBossClaimedTier?: number;
  // Soul Compass
  compassWeek?: string;
  compassFound?: string[];        // stage IDs where the hidden cache was already claimed this week
  // Boss Echoes (meta progression). owned = IDs the player has ever
  // collected; equipped = subset currently active (capped by unlocked slot
  // count from data/echoes.ts).
  ownedEchoes?: string[];
  equippedEchoes?: string[];
}

export interface GameSettings {
  defaultBattleSpeed: 1 | 2 | 4 | 8;
  showScanlines: boolean;
  reduceMotion: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  // Background music (menu / battle / boss themes).
  music: boolean;
  // Manual ultimates: heroes hold their ult at 100 energy and the player taps
  // to unleash, instead of auto-firing. Real interactive combat (re-resolves
  // the fight from the release point). Excludes World Boss / Shatter.
  manualUlt: boolean;
  // Auto-salvage: which rarities get salvaged when the player taps
  // "Salvage" on the bag page. Persists across sessions so the player
  // doesn't have to re-check boxes every visit. Default: only Common +
  // Magic — anything Rare+ requires explicit confirmation to scrap.
  autoSalvage?: { 1?: boolean; 2?: boolean; 3?: boolean; 4?: boolean; 5?: boolean };
}

export const DEFAULT_SETTINGS: GameSettings = {
  defaultBattleSpeed: 2,
  showScanlines: false,
  reduceMotion: false,
  soundEnabled: true,
  hapticsEnabled: true,
  music: true,
  manualUlt: false,
  autoSalvage: { 1: true, 2: true, 3: false, 4: false, 5: false },
};

export function normalizeSettings(settings?: Partial<GameSettings> | null): GameSettings {
  const speed = settings?.defaultBattleSpeed;
  return {
    defaultBattleSpeed: speed === 1 || speed === 2 || speed === 4 || speed === 8
      ? speed
      : DEFAULT_SETTINGS.defaultBattleSpeed,
    showScanlines: settings?.showScanlines ?? DEFAULT_SETTINGS.showScanlines,
    reduceMotion: settings?.reduceMotion ?? DEFAULT_SETTINGS.reduceMotion,
    soundEnabled: settings?.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
    hapticsEnabled: settings?.hapticsEnabled ?? DEFAULT_SETTINGS.hapticsEnabled,
    music: settings?.music ?? DEFAULT_SETTINGS.music,
    manualUlt: settings?.manualUlt ?? DEFAULT_SETTINGS.manualUlt,
    // Was previously dropped here — normalizeSettings rebuilt a fresh object
    // without autoSalvage, and profile.load() wrote that back to disk, wiping
    // the player's saved rarity checkboxes on the first load after setting them.
    autoSalvage: settings?.autoSalvage ?? DEFAULT_SETTINGS.autoSalvage,
  };
}

export interface LifetimeStats {
  battlesWon: number;
  battlesLost: number;
  stagesCleared: number;
  threeStarClears: number;
  summons: number;
  ssspulls: number;          // SSS (5★) pulls landed
  mythicsCrafted: number;
  heroesOwned: number;
  legendariesDropped: number;
  towerMaxFloor: number;
  goldEarned: number;
}

export interface OwnedHero {
  id: string;
  templateId: string;
  level: number;
  exp: number;
  star: number;
  equipped: Partial<Record<string, string>>;
  obtainedAt: number;
  talents?: string[];          // unlocked talent node IDs
  ultLevel?: number;           // ultimate skill level (0..10); adds multiplier to ult damage/heal
  // Hero-bound gem sockets. Length = slots unlocked (see HERO_GEM_SLOTS for
  // the level→slots curve). Each entry is a gemId or null. Gems live on the
  // hero, NOT on the equipment, so they persist across gear swaps.
  gems?: (string | null)[];
}

export interface OwnedEquipment {
  id: string;
  // New ARPG-style fields
  baseType?: string;
  rarity?: 1 | 2 | 3 | 4 | 5 | 6; // 6 = Mythic (crafted)
  itemLevel?: number;
  name?: string;
  // Random-loot affixes. `q` is the roll quality (0-1) — 1 means the
  // value rolled at the top of its range, 0 means the bottom. Used for
  // the T1/T20 quality-tier badges and the overall item quality score.
  // Optional for back-compat with pre-rework saves; missing q falls
  // back to a neutral T10 tier.
  primary?: { stat: string; value: number; q?: number };
  affixes?: { stat: string; value: number; q?: number }[];
  upgradeLevel?: number;
  obtainedAt?: number;
  // Crafted set-piece markers
  craftedPieceId?: string;
  setId?: string;
  setRestrictedTo?: string; // heroId — only that hero can equip this piece
  // Hero templateId — set the first time a piece is equipped. From then on
  // only that hero can ever wear it; gear is personal, never shared.
  boundTo?: string;
  isUltimateWeapon?: boolean;
  emoji?: string;
  slot?: string;
  // Gem sockets — array length = available sockets, value = gemId or null.
  // Sockets stay with the equipment instance; when this piece is swapped
  // out, the equip handler transfers the sockets to the new piece.
  sockets?: (string | null)[];
  // Dedicated ult-gem socket. Only the ultimate weapon (isUltimateWeapon)
  // gets one. The bound hero's ult gem goes here; cannot mix with normal
  // sockets so the ult gem never competes with a tier-4 for a slot.
  ultSocket?: string | null;
  // Legacy fields (kept for back-compat with older saves)
  templateId?: string;
  level?: number;
  // Common
  equippedTo: string | null;
  // Lock: when true, this item is exempt from bulk-salvage (modal +
  // any auto-salvage flow). User toggles via a 🔒 icon on the item
  // card in Bag. Defaults to false / undefined.
  locked?: boolean;
}

export interface OwnedItem {
  templateId: string;
  count: number;
}

export interface StageClear {
  stageId: string;
  stars: number;
  clears: number;
  lastClearedAt: number;
}

export interface PullLog {
  id?: number;
  poolId: string;
  heroTemplateId: string;
  pulledAt: number;
}

export interface TaskProgress {
  taskId: string;
  progress: number;
  claimed: boolean;
  cycleStart: string;
}

export interface MailMessage {
  id?: number;
  subject: string;
  body: string;
  rewards: { gold?: number; gems?: number; friendPoints?: number; soulshard?: number; energy?: number };
  read?: boolean;
  claimed?: boolean;
  sentAt: number;
}

export interface BattleLogEntry {
  id?: number;
  source: 'stage' | 'tower' | 'worldboss' | 'spirit' | 'dungeon' | 'trial';
  sourceId?: string;           // stageId / floor# / etc.
  won: boolean;
  stars?: number;
  damageDealt?: number;        // total dmg from player units
  squadIds: string[];
  enemyTemplates: string[];
  durationTicks: number;
  finishedAt: number;
}

export interface SaveBackup {
  id?: number;
  createdAt: number;
  label: string;
  source: 'auto' | 'manual' | 'pre-restore';
  payload: string;
  level: number;
  heroCount: number;
  gold: number;
  gems: number;
}

// --- Adventure (Story RPG) mode save — isolated single-row record. Exploration
// & story state only; the hero roster/gear/levels stay in the shared tables. ---
export interface AdventureSave {
  id: string;            // always 'me'
  mapId: string;         // current map id
  px: number;            // tile x (-1 = use the map's spawn)
  py: number;            // tile y
  facing: 'south' | 'east' | 'west' | 'north';
  partyIds: string[];    // OwnedHero instance ids in the active Adventure party (max 3)
  recruited: string[];   // templateIds already recruited into the story
  flags: Record<string, boolean>;
  defeated: string[];    // one-shot fixed-encounter ids already cleared
  cureProgress: number;  // 0..100
}

export const DEFAULT_ADVENTURE: AdventureSave = {
  id: 'me',
  mapId: 'lastlight',
  px: -1,
  py: -1,
  facing: 'south',
  partyIds: [],
  recruited: [],
  flags: {},
  defeated: [],
  cureProgress: 0,
};

export class GameDB extends Dexie {
  profile!: EntityTable<Profile, 'id'>;
  heroes!: EntityTable<OwnedHero, 'id'>;
  equipment!: EntityTable<OwnedEquipment, 'id'>;
  items!: EntityTable<OwnedItem, 'templateId'>;
  stageClears!: EntityTable<StageClear, 'stageId'>;
  pullLogs!: EntityTable<PullLog, 'id'>;
  tasks!: EntityTable<TaskProgress, 'taskId'>;
  mail!: EntityTable<MailMessage, 'id'>;
  backups!: EntityTable<SaveBackup, 'id'>;
  battleLogs!: EntityTable<BattleLogEntry, 'id'>;
  adventure!: EntityTable<AdventureSave, 'id'>;

  constructor() {
    super('bonewake-save');
    this.version(1).stores({
      profile: 'id',
      heroes: 'id, templateId, level, star',
      equipment: 'id, templateId, level, equippedTo',
      items: 'templateId',
      stageClears: 'stageId, lastClearedAt',
      pullLogs: '++id, poolId, pulledAt',
      tasks: 'taskId',
    });
    this.version(2).stores({
      equipment: 'id, baseType, rarity, equippedTo',
    });
    this.version(3).stores({
      mail: '++id, sentAt, read',
    });
    this.version(4).stores({
      backups: '++id, createdAt, source',
    });
    this.version(5).stores({
      battleLogs: '++id, source, finishedAt',
    });
    // Additive — Adventure mode save. Does not touch any existing table.
    this.version(6).stores({
      adventure: 'id',
    });
  }
}

export const db = new GameDB();

/**
 * One-time migration: copy data from the legacy `pixel-fighter-save`
 * IndexedDB into the new `bonewake-save` DB if the new DB is empty.
 *
 * Safe to call repeatedly — does nothing once the new DB has any rows.
 * Called from main.tsx before React mounts so the rest of the app sees
 * the user's existing save under the new name.
 */
export async function migrateLegacyDb(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  // If the new DB already has heroes, the user is past migration.
  try {
    const existing = await db.heroes.count();
    if (existing > 0) return;
  } catch { return; }

  // Does the legacy DB exist? Some browsers don't implement databases().
  let hasOld = false;
  if ('databases' in indexedDB) {
    try {
      const list = await (indexedDB as any).databases();
      hasOld = list.some((d: any) => d?.name === 'pixel-fighter-save');
    } catch {/* ignore */}
  } else {
    // Fallback: try to open it. If it didn't exist, the open creates an
    // empty one we then delete.
    hasOld = true;
  }
  if (!hasOld) return;

  const oldDb = await new Promise<IDBDatabase | null>((resolve) => {
    const req = indexedDB.open('pixel-fighter-save');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  if (!oldDb) return;

  const storeNames = Array.from(oldDb.objectStoreNames);
  for (const storeName of storeNames) {
    if (!db.tables.some(t => t.name === storeName)) continue;
    try {
      const items = await new Promise<any[]>((resolve, reject) => {
        const tx = oldDb.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (items.length) await (db as any).table(storeName).bulkPut(items);
    } catch (e) {
      console.warn(`migrate ${storeName} failed`, e);
    }
  }
  oldDb.close();

  // Drop the legacy DB so it doesn't linger.
  indexedDB.deleteDatabase('pixel-fighter-save');
}

export const DEFAULT_LIFETIME: LifetimeStats = {
  battlesWon: 0, battlesLost: 0, stagesCleared: 0, threeStarClears: 0,
  summons: 0, ssspulls: 0, mythicsCrafted: 0, heroesOwned: 0,
  legendariesDropped: 0, towerMaxFloor: 0, goldEarned: 0,
};

export const DEFAULT_PROFILE: Profile = {
  id: 'me',
  displayName: 'Hero',
  level: 1,
  exp: 0,
  energy: 100,
  lastEnergyTick: Date.now(),
  gold: 1000,
  gems: 100,
  friendPoints: 20,
  pityCounter: 0,
  tutorialDone: false,
  lastDailyClaim: '',
  signinStreak: 0,
  lastClosedAt: Date.now(),
  createdAt: Date.now(),
  energyBuysToday: 0,
  energyBuysDate: '',
  lifetime: { ...DEFAULT_LIFETIME },
  towerHighestFloor: 0,
  towerWeekStart: '',
  towerAttemptsDate: '',
  towerAttemptsToday: 0,
  trainingHeroId: null,
  trainingStartedAt: null,
  settings: { ...DEFAULT_SETTINGS },
  tutorialStep: 0,
  welcomeMailSent: false,
  activeTitle: null,
  mysteryBoxLastClaim: '',
  passSeasonStart: '',
  passXp: 0,
  passClaimedTiers: [],
  spiritBossWeek: '',
  spiritBossDamage: 0,
  spiritBossAttemptsUsed: 0,
  spiritBossClaimedTier: -1,
  compassWeek: '',
  compassFound: [],
  ownedEchoes: [],
  equippedEchoes: [],
};

// Energy regenerates 1 unit every 3 minutes, capped at 100.
export const ENERGY_REGEN_INTERVAL_MS = 3 * 60 * 1000;
// Base cap at level 1. The effective cap scales with player level so a full
// bank funds a real session at endgame (late stages cost ~76-80 energy each) —
// a flat 100 only bought ~one endgame stage. At L200 the cap is 300.
export const ENERGY_CAP = 100;
export function energyCapForLevel(level: number): number {
  return ENERGY_CAP + Math.max(0, Math.floor(level) - 1);
}

let initPromise: Promise<void> | null = null;
export async function initSave() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await db.transaction('rw', db.profile, async () => {
      const existing = await db.profile.get({ id: 'me' });
      if (!existing) await db.profile.add({ ...DEFAULT_PROFILE });
    });
    const p = (await db.profile.get({ id: 'me' }))!;
    const elapsed = Date.now() - p.lastEnergyTick;
    const regen = Math.floor(elapsed / ENERGY_REGEN_INTERVAL_MS);
    const cap = energyCapForLevel(p.level);
    if (regen > 0 && p.energy < cap) {
      const newEnergy = Math.min(cap, p.energy + regen);
      // Advance lastEnergyTick by the energy we actually credited (not by full elapsed)
      // so leftover fractional time carries over to the next tick.
      const consumed = regen * ENERGY_REGEN_INTERVAL_MS;
      await db.profile.update('me', { energy: newEnergy, lastEnergyTick: p.lastEnergyTick + consumed });
    }
    // Seed the Adventure save row (lazy single-row, like profile).
    const adv = await db.adventure.get('me');
    if (!adv) await db.adventure.add({ ...DEFAULT_ADVENTURE });
    await pruneOrphanedSaveData();
  })();
  return initPromise;
}

// Remove owned heroes whose template no longer exists in HERO_BY_ID (after a roster change).
// Also clear stale squad selection in localStorage.
async function pruneOrphanedSaveData() {
  const HERO_BY_ID = (await import('../data/heroes')).HERO_BY_ID;
  const heroes = await db.heroes.toArray();
  const orphans = heroes.filter(h => !HERO_BY_ID[h.templateId]);
  if (orphans.length > 0) {
    console.log(`[init] pruning ${orphans.length} orphaned hero(es) from older roster`);
    for (const h of orphans) {
      // Free up any equipment attached to the orphan
      for (const eqId of Object.values(h.equipped)) {
        if (eqId) await db.equipment.update(eqId, { equippedTo: null });
      }
      await db.heroes.delete(h.id);
    }
  }
  // Clean stale squad selection
  try {
    const raw = localStorage.getItem('bonewake_squad');
    if (raw) {
      const ids: string[] = JSON.parse(raw);
      const validIds = ids.filter(id => heroes.some(h => h.id === id && HERO_BY_ID[h.templateId]));
      if (validIds.length !== ids.length) {
        localStorage.setItem('bonewake_squad', JSON.stringify(validIds));
      }
    }
  } catch { /* ignore */ }
}

export async function wipeSave() {
  // Force-mirror current state to localStorage BEFORE deleting IndexedDB so the
  // user always has an undo path from browser storage that survives the delete.
  try {
    const { forceMirrorSnapshot } = await import('./backup');
    await forceMirrorSnapshot('pre-wipe');
  } catch (e) {
    console.warn('pre-wipe mirror failed (continuing anyway)', e);
  }
  await db.delete();
  await db.open();
  await db.profile.add({ ...DEFAULT_PROFILE });
}

export async function exportSave(): Promise<string> {
  const data = {
    schemaVersion: 2,  // bumped — export now includes pullLogs + mail
    profile: await db.profile.toArray(),
    heroes: await db.heroes.toArray(),
    equipment: await db.equipment.toArray(),
    items: await db.items.toArray(),
    stageClears: await db.stageClears.toArray(),
    pullLogs: await db.pullLogs.toArray(),
    tasks: await db.tasks.toArray(),
    mail: await db.mail.toArray(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// Validate import payload before destroying current data. Returns a description
// of what will be restored so callers can confirm with the user. Throws on
// obviously broken payloads.
export interface ImportSummary {
  heroes: number; equipment: number; items: number; stageClears: number;
  pullLogs: number; mail: number; tasks: number;
  hasProfile: boolean;
}

export function summarizeImport(json: string): ImportSummary {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object') throw new Error('Invalid JSON');
  if (!Array.isArray(data.profile) || data.profile.length === 0) {
    throw new Error('Backup is missing profile data');
  }
  return {
    hasProfile: true,
    heroes: data.heroes?.length ?? 0,
    equipment: data.equipment?.length ?? 0,
    items: data.items?.length ?? 0,
    stageClears: data.stageClears?.length ?? 0,
    pullLogs: data.pullLogs?.length ?? 0,
    mail: data.mail?.length ?? 0,
    tasks: data.tasks?.length ?? 0,
  };
}

export async function importSave(json: string) {
  const data = JSON.parse(json);
  // Validation — refuse to clear if the import doesn't look like a real save.
  if (!Array.isArray(data.profile) || data.profile.length === 0) {
    throw new Error('Import refused: backup file is missing profile data');
  }
  // Take pre-import safety net: in-DB pre-restore backup AND localStorage mirror
  // (deferred require to avoid circular imports — backup.ts imports from this file).
  try {
    const { createBackup, forceMirrorSnapshot } = await import('./backup');
    await createBackup('pre-restore', `pre-import-${new Date().toISOString().slice(0, 16)}`);
    await forceMirrorSnapshot('pre-import');
  } catch (e) {
    console.warn('pre-import backup failed (continuing anyway)', e);
  }
  await db.transaction('rw', [db.profile, db.heroes, db.equipment, db.items, db.stageClears, db.pullLogs, db.tasks, db.mail], async () => {
    await db.profile.clear();
    await db.heroes.clear();
    await db.equipment.clear();
    await db.items.clear();
    await db.stageClears.clear();
    await db.pullLogs.clear();
    await db.tasks.clear();
    await db.mail.clear();
    if (data.profile?.length) await db.profile.bulkAdd(data.profile);
    if (data.heroes?.length) await db.heroes.bulkAdd(data.heroes);
    if (data.equipment?.length) await db.equipment.bulkAdd(data.equipment);
    if (data.items?.length) await db.items.bulkAdd(data.items);
    if (data.stageClears?.length) await db.stageClears.bulkAdd(data.stageClears);
    if (data.pullLogs?.length) await db.pullLogs.bulkAdd(data.pullLogs);
    if (data.tasks?.length) await db.tasks.bulkAdd(data.tasks);
    if (data.mail?.length) await db.mail.bulkAdd(data.mail);
  });
}

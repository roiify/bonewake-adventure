import { HERO_BY_ID } from '../data/heroes';
import { ENEMY_TEMPLATES } from '../data/stages';
import { EQUIP_BY_ID } from '../data/equipment';
import { equipStats } from './loot';
import { equipmentGemStats } from './gems';
import { SET_BY_HERO } from '../data/ultimateGear';
import { TALENT_BY_ID } from '../data/talents';
import { bondBonusFor } from '../data/bonds';
import type { OwnedHero, OwnedEquipment } from './db';
import type { CombatUnit, Element, Archetype, Rarity } from '../types';

export const STAR_MULT = [1.0, 1.0, 1.25, 1.55, 1.95, 2.45, 3.05];
export const levelMult = (lvl: number) => 1 + (lvl - 1) * 0.05;

// Account-level ceiling. Caps gainExp + every hero's effective max level.
// 200 was picked so chapter 29 (the current final chapter) ends with
// enemy lvl ≈ 200 — i.e. the player reaches max level exactly when the
// game's hardest stage becomes the gear-check that grows them through
// equipment / soulshards / set bonuses rather than raw character power.
export const PLAYER_MAX_LEVEL = 200;

// Player-level account boost — every owned hero gets a permanent multiplier
// to HP/ATK/DEF based on the player's account level. Gives long-term player
// progression a real payoff: at lvl 100 your toons are +25% stronger, lvl
// 500 = +125%, lvl 999 ≈ +250%. SPD/CRIT are intentionally untouched (they
// shouldn't trivialize speed-tier or crit-cap design).
export const PLAYER_LEVEL_STAT_BONUS_PER_LEVEL = 0.0025;
export function playerLevelMult(playerLevel: number): number {
  return 1 + Math.max(0, playerLevel - 1) * PLAYER_LEVEL_STAT_BONUS_PER_LEVEL;
}

// Module-level mirror of the player's account level so calcHeroStats can
// apply the account-wide stat boost without importing the profile store
// (which would create a circular dep since profile.ts already imports from
// here). The profile store keeps this in sync via setPlayerLevelForBoost().
let _playerLevelForBoost = 1;
export function setPlayerLevelForBoost(n: number): void {
  _playerLevelForBoost = Math.max(1, Math.floor(n));
}
export function getPlayerLevelForBoost(): number {
  return _playerLevelForBoost;
}

// === Crit/Speed kit identity scaling (account-level driven) ===========
// Universal HP/ATK/DEF growth (playerLevelMult above) accidentally erases
// what makes crit/speed builds distinct — bruisers and assassins both gain
// the same +250% at lvl 999, so the assassin's identity flatlines.
//
// These three helpers add identity-preserving scaling that ONLY benefits
// crit-rate, crit-damage, and speed-derived dodge — bounded so they can't
// snowball into crit-cap or invincibility:
//
//   CRIT chance      +0.01% per player level   → +10% at lvl 999
//                                                (22% kit → 32%, not 100%)
//   CRIT damage      +0.05% per player level   → 1.5x → 2.0x at lvl 999
//   SPD → dodge       (spd / 1500) × (1 + lvl × 0.002)
//                                              → 95 SPD ≈ 19% at lvl 999
export const PLAYER_LEVEL_CRIT_CHANCE_PER_LEVEL = 0.0001;
export const PLAYER_LEVEL_CRIT_DAMAGE_PER_LEVEL = 0.0005;
export const PLAYER_LEVEL_DODGE_SCALE_PER_LEVEL = 0.002;
export const BASE_CRIT_DAMAGE_MULT = 1.5;

export function playerLevelCritBonus(playerLevel: number): number {
  return Math.max(0, playerLevel - 1) * PLAYER_LEVEL_CRIT_CHANCE_PER_LEVEL;
}
export function playerLevelCritDamageMult(playerLevel: number): number {
  return BASE_CRIT_DAMAGE_MULT + Math.max(0, playerLevel - 1) * PLAYER_LEVEL_CRIT_DAMAGE_PER_LEVEL;
}
export function playerLevelDodgeChance(spd: number, playerLevel: number): number {
  const base = Math.max(0, spd) / 1500;
  const scale = 1 + Math.max(0, playerLevel - 1) * PLAYER_LEVEL_DODGE_SCALE_PER_LEVEL;
  // Cap at 35% so the fastest unit at max player level still gets hit
  // ~65% of the time. Without a cap a 200-SPD char at lvl 999 could exceed
  // 50% dodge which starts trivializing damage-output design.
  return Math.min(0.35, base * scale);
}

// === Boss Echo mirror ===
// Equipped boss echo IDs are mirrored here so combat.ts and stat composers
// can read them without importing the profile store (circular-dep avoidance,
// same pattern as setPlayerLevelForBoost above).
let _equippedEchoIds: string[] = [];
export function setEquippedEchoes(ids: string[]): void {
  _equippedEchoIds = [...ids];
}
export function getEquippedEchoes(): string[] {
  return _equippedEchoIds;
}

export interface HeroStats {
  hp: number; atk: number; def: number; spd: number; crit: number;
  power: number;
  // Promised "+N% ult damage" from the active 5-piece set bonus (decimal).
  ultDmgBonus?: number;
}

// Look up a template — first heroes, then enemies. Returns null if unknown
// so callers can skip orphaned save rows instead of crashing the UI.
export function lookupTemplate(templateId: string) {
  const hero = HERO_BY_ID[templateId];
  if (hero) {
    return {
      baseStats: hero.baseStats,
      name: hero.name, color: hero.color, element: hero.element,
      archetype: hero.archetype, rarity: hero.rarity, emoji: hero.emoji,
      ultimateId: hero.ultimateId,
      isEnemy: false as const,
    };
  }
  const enemy = ENEMY_TEMPLATES[templateId as keyof typeof ENEMY_TEMPLATES];
  if (enemy) {
    return {
      baseStats: enemy.baseStats,
      name: enemy.name, color: enemy.color, element: enemy.element,
      archetype: enemy.archetype, rarity: 3 as Rarity, emoji: '💀',
      ultimateId: enemy.ultimateId,
      isEnemy: true as const,
    };
  }
  return null;
}

export function calcHeroStats(
  hero: OwnedHero | { templateId: string; level: number; star: number; equipped?: Partial<Record<string, string>> },
  ownedEquipment: OwnedEquipment[] = [],
  squadTemplateIds: string[] = []
): HeroStats {
  const tpl = lookupTemplate(hero.templateId);
  if (!tpl) return { hp: 0, atk: 0, def: 0, spd: 0, crit: 0, power: 0 };
  const sm = STAR_MULT[hero.star] ?? 1;
  const lm = levelMult(hero.level);
  // Player-level account boost — multiplies the base HP/ATK/DEF tier so the
  // boost still scales with star/level promotions instead of being a flat
  // post-tax. SPD/CRIT are intentionally untouched.
  const plm = playerLevelMult(_playerLevelForBoost);
  let hp = tpl.baseStats.hp * sm * lm * plm;
  let atk = tpl.baseStats.atk * sm * lm * plm;
  let def = tpl.baseStats.def * sm * lm * plm;
  let spd = tpl.baseStats.spd;
  let crit = tpl.baseStats.crit;

  // Track set pieces equipped on this hero for set-bonus calculation
  const setPieceIdsEquipped: string[] = [];
  if (hero.equipped) {
    for (const eqId of Object.values(hero.equipped)) {
      if (!eqId) continue;
      const own = ownedEquipment.find(e => e.id === eqId);
      if (!own) continue;
      if (own.craftedPieceId) setPieceIdsEquipped.push(own.craftedPieceId);
      // Gem socket contributions — normal sockets + dedicated ult socket.
      const gs = equipmentGemStats(own);
      if (gs.hp) hp += gs.hp as number;
      if (gs.atk) atk += gs.atk as number;
      if (gs.def) def += gs.def as number;
      if (gs.spd) spd += gs.spd as number;
      if (gs.crit) crit += gs.crit as number;
      // New ARPG-format items have primary/affixes — use them
      if (own.primary || own.affixes) {
        const s = equipStats(own);
        if (s.hp) hp += s.hp;
        if (s.atk) atk += s.atk;
        if (s.def) def += s.def;
        if (s.spd) spd += s.spd;
        if (s.crit) crit += s.crit;
        continue;
      }
      // Legacy fixed-stat templates
      if (own.templateId) {
        const et = EQUIP_BY_ID[own.templateId];
        if (!et) continue;
        const elm = 1 + ((own.level ?? 1) - 1) * 0.1;
        if (et.stats.hp) hp += et.stats.hp * elm;
        if (et.stats.atk) atk += et.stats.atk * elm;
        if (et.stats.def) def += et.stats.def * elm;
        if (et.stats.spd) spd += et.stats.spd * elm;
        if (et.stats.crit) crit += et.stats.crit;
      }
    }
  }

  // Talent bonuses
  if ('talents' in hero && Array.isArray((hero as any).talents)) {
    for (const tid of (hero as any).talents as string[]) {
      const node = TALENT_BY_ID[tid];
      if (!node) continue;
      if (node.bonus.hp) hp += node.bonus.hp;
      if (node.bonus.atk) atk += node.bonus.atk;
      if (node.bonus.def) def += node.bonus.def;
      if (node.bonus.spd) spd += node.bonus.spd;
      if (node.bonus.crit) crit += node.bonus.crit;
    }
  }

  // Set bonuses: count how many of THIS hero's signature set pieces are equipped
  const heroId = hero.templateId;
  const set = SET_BY_HERO[heroId];
  // The full-set (5-piece) bonus descriptions promise "+N% ult damage" but only
  // the stats block was ever applied. Parse that promised % out of the active
  // bonus so combat can honor it (the engine already has an ult-dmg hook).
  let ultDmgBonus = 0;
  if (set && setPieceIdsEquipped.length > 0) {
    const ownSetPieceIds = new Set(set.pieces.map(p => p.id));
    const matching = setPieceIdsEquipped.filter(id => ownSetPieceIds.has(id)).length;
    for (const bonus of set.bonuses) {
      if (matching >= bonus.atPieces) {
        if (bonus.stats.hp) hp += bonus.stats.hp;
        if (bonus.stats.atk) atk += bonus.stats.atk;
        if (bonus.stats.def) def += bonus.stats.def;
        if (bonus.stats.spd) spd += bonus.stats.spd;
        if (bonus.stats.crit) crit += bonus.stats.crit;
        const m = bonus.description.match(/\+(\d+)%\s*ult/i);
        if (m) ultDmgBonus += Number(m[1]) / 100;
      }
    }
  }
  // Bond bonuses (active only when the hero is in a squad context)
  if (squadTemplateIds.length > 0) {
    const bonds = bondBonusFor(hero.templateId, squadTemplateIds);
    if (bonds.hp) hp += bonds.hp;
    if (bonds.atk) atk += bonds.atk;
    if (bonds.def) def += bonds.def;
    if (bonds.spd) spd += bonds.spd;
    if (bonds.crit) crit += bonds.crit;
  }

  // Tank aura: any tank-archetype hero in the squad gives non-tank
  // allies +15% DEF and +10% HP. Tanks don't stack the aura on
  // themselves so two tanks don't trade buffs into infinity, and
  // multiple tanks only contribute one aura (lead by the front-most).
  if (squadTemplateIds.length > 0 && tpl.archetype !== 'tank') {
    const hasTank = squadTemplateIds.some(id => {
      if (id === hero.templateId) return false;
      const t = lookupTemplate(id);
      return t?.archetype === 'tank';
    });
    if (hasTank) {
      def = def * 1.15;
      hp = hp * 1.10;
    }
  }

  hp = Math.round(hp); atk = Math.round(atk); def = Math.round(def);
  spd = Math.round(spd);
  const power = Math.round(hp / 4 + atk * 3 + def * 2 + spd * 5 + crit * 800);
  return { hp, atk, def, spd, crit, power, ultDmgBonus };
}

export function toCombatUnit(
  hero: OwnedHero,
  ownedEquipment: OwnedEquipment[],
  side: 'player' | 'enemy',
  instanceId?: string,
  squadTemplateIds: string[] = []
): CombatUnit | null {
  const tpl = lookupTemplate(hero.templateId);
  if (!tpl) return null;
  const s = calcHeroStats(hero, ownedEquipment, squadTemplateIds);
  return {
    id: instanceId ?? hero.id,
    templateId: hero.templateId,
    side,
    name: tpl.name,
    emoji: tpl.emoji,
    color: tpl.color,
    element: tpl.element as Element,
    archetype: tpl.archetype as Archetype,
    rarity: tpl.rarity,
    level: hero.level,
    star: hero.star,
    hp: s.hp,
    maxHp: s.hp,
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    crit: s.crit,
    energy: 0,
    ultimateId: tpl.ultimateId,
    ultLevel: hero.ultLevel ?? 0,
    ultDmgBonus: s.ultDmgBonus ?? 0,
    alive: true,
  };
}

export function buildEnemyUnit(
  templateId: string,
  level: number,
  star: number,
  instanceId: string,
  squadTemplateIds: string[] = []
): CombatUnit {
  const fakeOwned: OwnedHero = {
    id: instanceId, templateId, level, exp: 0, star, equipped: {}, obtainedAt: 0,
  };
  // Pass squad context so enemies with archetype='tank' get the same
  // +15% DEF / +10% HP aura the player side enjoys. Without it, taunt
  // pulls aggro to enemy tanks who lack the defensive buff they should
  // have, so they die unnaturally fast.
  const u = toCombatUnit(fakeOwned, [], 'enemy', instanceId, squadTemplateIds);
  if (!u) throw new Error(`Cannot build enemy: unknown template ${templateId}`);
  return u;
}

export const xpForLevel = (level: number) => Math.floor(50 * Math.pow(1.18, level - 1));
export const goldToLevelUp = (level: number) => 120 + level * 80;
// Theoretical per-star ceiling — generous so star tier never artificially
// stops a hero from scaling alongside the player's account level.
export const maxLevelForStar = (star: number) => star * 200;
// Star-promotion gate — preserves the old "level 10 × star" feel so promoting
// 3★ → 4★ still happens at hero lvl 30, not at player level. Decoupled from
// the leveling cap so promotion friction stays bounded.
export const promotionLevelThreshold = (star: number) => star * 10;
// Effective level cap — clamps the star ceiling by the player's account
// level. Used everywhere a hero gains XP or is shown a "current / max"
// progress bar. Heroes can never be higher level than the player.
export function effectiveMaxLevel(star: number, playerLevel: number): number {
  return Math.min(maxLevelForStar(star), Math.max(1, playerLevel));
}

import seedrandom from 'seedrandom';
import { SKILL_BY_ID } from '../data/skills';
import { skillsForHero } from '../data/heroSkills';
import { ultLevelMultiplier } from './ultLeveling';
import {
  getPlayerLevelForBoost,
  playerLevelCritBonus,
  playerLevelCritDamageMult,
  playerLevelDodgeChance,
  getEquippedEchoes,
} from './stats';
import { ECHO_BY_ID, type EchoEffect } from '../data/echoes';
import type { CombatUnit, BattleAction, BattleResult, Element, ActiveEffect } from '../types';

// === Boss Echo aggregator ===
// Reads the equipped-echo mirror once per battle and returns a structure
// of summed bonuses (decimal multipliers / additives) so per-tick combat
// code stays cheap. Unknown effect kinds are silently ignored so future
// effects can ship without touching combat.ts.
interface EchoBonuses {
  basicDmgMult: number;       // +N (decimal) applied multiplicatively to basic dmg
  ultDmgMult: number;
  critDmgBonus: number;       // additive to BASE_CRIT_DAMAGE_MULT
  critPerAliveEnemy: number;
  squadDodge: number;         // flat dodge added per-incoming-hit
  squadHpMult: number;        // +N applied at battle init
  fullHpAtkMult: number;      // +N when attacker hp == maxHp
  lowHpDmgMult: number;       // +N when attacker hp < 30% maxHp
  firstRoundSpdMult: number;  // +N on round 0 only
  basicLifesteal: number;     // +N of basic dmg returned as heal to attacker
  bossDmgMult: number;        // +N vs target.star >= 5
  mageDmgReduction: number;   // -N from mage attackers (capped 0..1)
  stackPerTurnDmg: number;    // per-round stacking +N to outgoing dmg
  stackPerTurnDmgCap: number; // cap on the per-turn stack
  reviveFirstFallenPct: number; // 0 if no echo, else revive% (one-time)
}
function blankBonuses(): EchoBonuses {
  return {
    basicDmgMult: 0, ultDmgMult: 0, critDmgBonus: 0, critPerAliveEnemy: 0,
    squadDodge: 0, squadHpMult: 0, fullHpAtkMult: 0, lowHpDmgMult: 0,
    firstRoundSpdMult: 0, basicLifesteal: 0, bossDmgMult: 0,
    mageDmgReduction: 0, stackPerTurnDmg: 0, stackPerTurnDmgCap: 0,
    reviveFirstFallenPct: 0,
  };
}
// Per-battle mirror of the aggregated echo bonuses. Set at the top of
// resolveBattle() and read by the helper functions below — saves us from
// threading EchoBonuses through every damage call.
let _activeEchoes: EchoBonuses = {
  basicDmgMult: 0, ultDmgMult: 0, critDmgBonus: 0, critPerAliveEnemy: 0,
  squadDodge: 0, squadHpMult: 0, fullHpAtkMult: 0, lowHpDmgMult: 0,
  firstRoundSpdMult: 0, basicLifesteal: 0, bossDmgMult: 0,
  mageDmgReduction: 0, stackPerTurnDmg: 0, stackPerTurnDmgCap: 0,
  reviveFirstFallenPct: 0,
};
let _currentRound = 0;
let _playerSide: 'player' | 'enemy' = 'player';  // for dodge/lifesteal echo gating
// The revive-first-fallen echo is wired via the post-turn sweep in
// resolveBattle (see `reviveUsed`), not module state.

function aggregateEquippedEchoes(): EchoBonuses {
  const b = blankBonuses();
  for (const id of getEquippedEchoes()) {
    const ec = ECHO_BY_ID[id];
    if (!ec) continue;
    const e: EchoEffect = ec.effect;
    switch (e.kind) {
      case 'basic_dmg_mult':       b.basicDmgMult       += e.value; break;
      case 'ult_dmg_mult':         b.ultDmgMult         += e.value; break;
      case 'crit_dmg_bonus':       b.critDmgBonus       += e.value; break;
      case 'crit_chance_per_enemy':b.critPerAliveEnemy  += e.value; break;
      case 'squad_dodge_bonus':    b.squadDodge         += e.value; break;
      case 'squad_hp_mult':        b.squadHpMult        += e.value; break;
      case 'full_hp_atk_mult':     b.fullHpAtkMult      += e.value; break;
      case 'low_hp_dmg_mult':      b.lowHpDmgMult       += e.value; break;
      case 'first_round_spd_mult': b.firstRoundSpdMult  += e.value; break;
      case 'lifesteal_basic':      b.basicLifesteal     += e.value; break;
      case 'boss_dmg_mult':        b.bossDmgMult        += e.value; break;
      case 'mage_dmg_reduction':   b.mageDmgReduction   += e.value; break;
      case 'stack_per_turn_dmg':
        b.stackPerTurnDmg    += e.value;
        b.stackPerTurnDmgCap += e.cap;
        break;
      case 'revive_first_fallen':  b.reviveFirstFallenPct = Math.max(b.reviveFirstFallenPct, e.value); break;
    }
  }
  return b;
}

interface DamageMods {
  damageMultiplier: number;  // applied to outgoing damage
  critBonus: number;          // added to crit chance
}

// Classic RPG damage mitigation: dmg = raw * 100 / (100 + def).
// Replaces the old `max(1, atk - def)` formula that floored tanks (low
// atk) at 1 damage against high-def bosses. Min damage is 5% of the
// raw figure so no attack ever feels completely useless.
function mitigatedDamage(raw: number, def: number): number {
  const mitigated = raw * 100 / (100 + Math.max(0, def));
  return Math.max(Math.floor(raw * 0.05), mitigated);
}

function getDamageMods(unit: CombatUnit): DamageMods {
  let damageMultiplier = 1.0;
  let critBonus = 0;
  const skills = skillsForHero(unit.templateId);
  for (const sk of skills) {
    if (sk.trigger === 'on_attack' && sk.effect.kind === 'damage_mult') damageMultiplier *= sk.effect.value;
    if (sk.trigger === 'on_attack' && sk.effect.kind === 'crit_chance') critBonus += sk.effect.value;
    if (sk.trigger === 'on_low_hp' && unit.hp / unit.maxHp < 0.3) {
      if (sk.effect.kind === 'damage_mult') damageMultiplier *= sk.effect.value;
      // Elara's "Trail Sight" (+30% ATK when low) — previously inert because
      // getDamageMods only honored damage_mult/crit_chance. self_atk_buff value
      // is a decimal (0.30 = +30%).
      if (sk.effect.kind === 'self_atk_buff') damageMultiplier *= 1 + sk.effect.value;
    }
  }
  // Active ATK buff from ult effects (e.g. Chino's Drunken Palm, value 90 = +90%).
  damageMultiplier *= buffAtkMult(unit);
  return { damageMultiplier, critBonus };
}

// ===== Status-effect helpers (burn / shield / buff_atk / def_buff / stun) =====
// These read/mutate unit.effects. Previously effects were pushed onto units
// (and rendered as UI icons) but never processed — burn dealt no damage,
// shields absorbed nothing, buffs did nothing. Now they actually resolve.

// Active ATK multiplier from buff_atk effects. value is stored as either a
// decimal (<=1, e.g. 0.30) or a percent (>1, e.g. 90) — normalize both.
function buffAtkMult(unit: CombatUnit): number {
  let m = 1;
  for (const eff of (unit.effects ?? [])) {
    if (eff.kind === 'buff_atk' && eff.remaining > 0) {
      m += eff.value > 1 ? eff.value / 100 : eff.value;
    }
  }
  return m;
}

// Effective DEF including any active def_buff (Kaius's Battle Cry, flat +DEF).
function effectiveDef(unit: CombatUnit): number {
  let def = unit.def;
  for (const eff of (unit.effects ?? [])) {
    if (eff.kind === 'def_buff' && eff.remaining > 0) def += eff.value;
  }
  return def;
}

// Drain a target's shield pools to absorb incoming damage. Mutates shield
// `value` (the remaining pool) and prunes emptied shields. Returns the damage
// that gets through. A shield can fully negate a hit.
function absorbWithShield(target: CombatUnit, dmg: number): number {
  if (!target.effects || dmg <= 0) return dmg;
  let through = dmg;
  for (const eff of target.effects) {
    if (eff.kind !== 'shield' || eff.value <= 0) continue;
    const soak = Math.min(eff.value, through);
    eff.value -= soak;
    through -= soak;
    if (through <= 0) break;
  }
  target.effects = target.effects.filter(e => !(e.kind === 'shield' && e.value <= 0));
  return through;
}

// Route an ult's secondary effect to the correct recipients. Harmful effects
// (burn/stun) land on the enemies that were hit; beneficial effects buff the
// caster (buff_atk) or shield the whole living squad (shield). Previously every
// ult effect was pushed onto the damaged ENEMY, which — once effects actually
// resolved — would have shielded/buffed the enemy you just hit (e.g. Aegis
// Judgment's "ally shield", Chino's self buff_atk). heal/revive are handled
// inline in their own ult branches, so they're ignored here.
function applySkillEffect(
  effect: { type: string; value: number; duration?: number } | undefined,
  caster: CombatUnit,
  casterAllies: CombatUnit[],
  hitEnemies: CombatUnit[],
): void {
  if (!effect || effect.type === 'heal' || effect.type === 'revive') return;
  const remaining = effect.duration ?? 2;
  const push = (u: CombatUnit, kind: ActiveEffect['kind']) => {
    (u.effects as ActiveEffect[] | undefined) ??= [];
    (u.effects as ActiveEffect[]).push({ kind, value: effect.value, remaining });
  };
  if (effect.type === 'burn' || effect.type === 'stun') {
    for (const t of hitEnemies) if (t.alive) push(t, effect.type);
  } else if (effect.type === 'shield') {
    for (const a of casterAllies) if (a.alive) push(a, 'shield');
  } else if (effect.type === 'buff_atk') {
    push(caster, 'buff_atk');
  }
}

// Crit-resolution helpers — centralized so every damage site applies the
// same player-level scaling (crit chance bonus + crit damage multiplier).
// Echo bonuses fold in here too: critDmgBonus stacks onto the base crit
// multiplier, and a per-alive-enemy crit bonus optionally boosts roll odds.
// Crit chance is hard-capped at 95%. Without this clamp, crit from
// base + gems + sets + talents + bonds + echoes + per-level scaling trivially
// exceeded 100%, so every crit source past the ceiling was dead value while
// the UI kept selling crit gear. 95% leaves a sliver of non-crit for variance.
const CRIT_CAP = 0.95;
function rollCrit(unitCrit: number, rng: () => number, extraBonus = 0, aliveEnemyCount = 0): boolean {
  const playerLevel = getPlayerLevelForBoost();
  const echoCritBonus = _activeEchoes.critPerAliveEnemy * aliveEnemyCount;
  const chance = Math.min(CRIT_CAP, unitCrit + extraBonus + playerLevelCritBonus(playerLevel) + echoCritBonus);
  return rng() < chance;
}
function critMult(): number {
  return playerLevelCritDamageMult(getPlayerLevelForBoost()) + _activeEchoes.critDmgBonus;
}

// Per-attacker damage multiplier from echoes that depend on attacker state
// (full HP / low HP) plus per-target multiplier (vs boss / mage reduction).
function echoOffensiveMult(attacker: CombatUnit, target: CombatUnit, mode: 'basic' | 'ult'): number {
  let m = 1;
  if (attacker.side === 'player') {
    if (mode === 'basic' && _activeEchoes.basicDmgMult > 0) m *= 1 + _activeEchoes.basicDmgMult;
    if (mode === 'ult'   && _activeEchoes.ultDmgMult   > 0) m *= 1 + _activeEchoes.ultDmgMult;
    if (_activeEchoes.fullHpAtkMult > 0 && attacker.hp >= attacker.maxHp) m *= 1 + _activeEchoes.fullHpAtkMult;
    if (_activeEchoes.lowHpDmgMult  > 0 && attacker.hp < attacker.maxHp * 0.3) m *= 1 + _activeEchoes.lowHpDmgMult;
    if (_activeEchoes.bossDmgMult   > 0 && target.star >= 5)                 m *= 1 + _activeEchoes.bossDmgMult;
    if (_activeEchoes.stackPerTurnDmg > 0) {
      const stack = Math.min(_activeEchoes.stackPerTurnDmgCap, _activeEchoes.stackPerTurnDmg * _currentRound);
      m *= 1 + stack;
    }
  }
  return m;
}

// Modify incoming damage based on target's on_hit passives. Returns the dmg actually dealt
// and (optionally) reflected damage back to the attacker.
function applyOnHit(target: CombatUnit, dmg: number, rng: () => number, attacker?: CombatUnit): { dmg: number; reflect: number } {
  let actual = dmg;
  let reflect = 0;
  const skills = skillsForHero(target.templateId);
  for (const sk of skills) {
    if (sk.trigger !== 'on_hit') continue;
    if (sk.effect.kind === 'dodge' && rng() < sk.effect.value) {
      actual = Math.floor(actual * 0.5);  // dodge halves damage
    }
    if (sk.effect.kind === 'reflect' && rng() < 0.30) {
      reflect = Math.floor(dmg * sk.effect.value);
    }
  }
  // SPD-derived dodge from player-level scaling. Stacks ON TOP of any
  // kit-specific on_hit dodge passive — speed-built characters now actually
  // benefit from their SPD as an account-wide survival stat.
  const dodgeChance = playerLevelDodgeChance(target.spd, getPlayerLevelForBoost());
  if (dodgeChance > 0 && rng() < dodgeChance) {
    actual = Math.floor(actual * 0.5);
  }
  // Echo: squad-wide dodge bonus applies when target is on player side.
  if (target.side === _playerSide && _activeEchoes.squadDodge > 0) {
    if (rng() < _activeEchoes.squadDodge) actual = Math.floor(actual * 0.5);
  }
  // Echo: -damage taken from mage attackers (player only).
  if (target.side === _playerSide && attacker?.archetype === 'mage' && _activeEchoes.mageDmgReduction > 0) {
    actual = Math.floor(actual * (1 - _activeEchoes.mageDmgReduction));
  }
  return { dmg: actual, reflect };
}

// On kill — attacker gets lifesteal if they have that passive.
function applyOnKill(attacker: CombatUnit) {
  const skills = skillsForHero(attacker.templateId);
  for (const sk of skills) {
    if (sk.trigger === 'on_kill' && sk.effect.kind === 'lifesteal') {
      const heal = Math.floor(attacker.maxHp * sk.effect.value);
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    }
  }
}

// First turn — apply once. Returns log entries to push (e.g. team_heal events).
function applyFirstTurn(unit: CombatUnit, allies: CombatUnit[]): { healLogs: { dst: string; heal: number }[]; ranTeamHeal: boolean } {
  const out: { dst: string; heal: number }[] = [];
  let ranTeamHeal = false;
  const skills = skillsForHero(unit.templateId);
  for (const sk of skills) {
    if (sk.trigger !== 'first_turn') continue;
    if (sk.effect.kind === 'team_heal') {
      // Skip entirely if nobody actually needs healing — no log entries
      // emitted so the playback doesn't show "+0" green floaters.
      if (!allies.some(a => a.alive && a.hp < a.maxHp)) continue;
      for (const a of allies) {
        if (!a.alive) continue;
        const before = a.hp;
        a.hp = Math.min(a.maxHp, a.hp + sk.effect.value);
        const gained = a.hp - before;
        if (gained > 0) out.push({ dst: a.id, heal: gained });
      }
      ranTeamHeal = true;
    }
    if (sk.effect.kind === 'self_def_buff') {
      // Kaius's Battle Cry: +DEF for N turns. Was incorrectly pushed as a
      // 'shield' (which did nothing); now a real def_buff read by effectiveDef.
      (unit.effects ??= []).push({ kind: 'def_buff', value: sk.effect.value, remaining: sk.effect.duration });
    }
  }
  return { healLogs: out, ranTeamHeal };
}

// On attack lifesteal (heal lowest-HP ally proportional to damage dealt)
function applyOnAttackHeal(attacker: CombatUnit, allies: CombatUnit[], dmg: number): { dst: string; heal: number } | null {
  const skills = skillsForHero(attacker.templateId);
  for (const sk of skills) {
    if (sk.trigger === 'on_attack' && sk.effect.kind === 'lifesteal') {
      const target = [...allies].filter(a => a.alive && a.hp < a.maxHp)
        .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (!target) return null;  // no ally needs healing — skip the lifesteal
      const before = target.hp;
      const amount = Math.floor(dmg * sk.effect.value);
      target.hp = Math.min(target.maxHp, target.hp + amount);
      const gained = target.hp - before;
      if (gained <= 0) return null;
      return { dst: target.id, heal: gained };
    }
  }
  return null;
}

function elementAdvantage(a: Element, b: Element): number {
  const triangle: Record<Element, Element> = {
    fire: 'earth',
    earth: 'water',
    water: 'fire',
    light: 'dark',
    dark: 'light',
  };
  if (triangle[a] === b) return 1.5;
  if (triangle[b] === a) return 0.75;
  return 1.0;
}

// Tag for the UI damage-float badge. >1 → 'strong' (super-effective),
// <1 → 'weak' (resisted), exactly 1 → undefined (neutral, no badge).
function eleTag(eAdv: number): 'strong' | 'weak' | undefined {
  if (eAdv > 1.05) return 'strong';
  if (eAdv < 0.95) return 'weak';
  return undefined;
}

function pickEnemyTarget(enemies: CombatUnit[], rng: () => number): CombatUnit | undefined {
  const alive = enemies.filter(e => e.alive);
  if (!alive.length) return undefined;
  // Taunt: tanks (Kaius and any future tank archetype) pull aggro 80% of
  // the time when alive, so they actually function as the front line.
  const tanks = alive.filter(e => e.archetype === 'tank');
  if (tanks.length && rng() < 0.8) {
    // Pick the lowest-HP tank (so multiple tanks share aggro proportionally
    // to who's wounded).
    return [...tanks].sort((a, b) => a.hp - b.hp)[0];
  }
  // 70% lowest HP, 30% random
  if (rng() < 0.7) {
    return [...alive].sort((a, b) => a.hp - b.hp)[0];
  }
  return alive[Math.floor(rng() * alive.length)];
}

function pickAllyHealTarget(allies: CombatUnit[]): CombatUnit | undefined {
  const alive = allies.filter(a => a.alive);
  if (!alive.length) return undefined;
  return [...alive].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
}

// Per-unit ultimate policy for interactive (manual-ult) battles. 'hold' = the
// unit banks energy at 100 and keeps basic-attacking until the player releases
// it; 'auto' (default / omitted) = fires the ult automatically at 100.
export type UltPolicy = Record<string, 'auto' | 'hold'>;

export interface ResolveOpts {
  // Resume from the units AS GIVEN (current hp/energy/effects/alive) instead of
  // resetting to full + running first-turn passives. Used to re-resolve the
  // remainder of a battle from a mid-fight snapshot after a manual ult release.
  resume?: boolean;
  // Player units to hold (won't auto-fire their ult).
  ultPolicy?: UltPolicy;
  // A single unit id that should fire its ult on its next turn regardless of
  // policy — the "unleash now" action.
  forceUltNow?: string;
}

export function resolveBattle(
  player: CombatUnit[],
  enemy: CombatUnit[],
  seed?: string,
  opts?: ResolveOpts
): BattleResult {
  const s = seed ?? Date.now().toString();
  const rng = seedrandom(s);
  const resume = opts?.resume ?? false;
  const ultPolicy = opts?.ultPolicy ?? {};
  const forceUltNow = opts?.forceUltNow;
  // forceUltNow releases the held unit's ult exactly ONCE; after it fires the
  // unit reverts to its hold policy (otherwise it would auto-fire every time it
  // recharged for the rest of the branch — the ult appeared to "keep replaying").
  let forceConsumed = false;
  // Snapshot active echoes for this battle. Reset per-battle state.
  _activeEchoes = aggregateEquippedEchoes();
  _currentRound = 0;
  _playerSide = 'player';
  // Deep clone. On a fresh battle, reset hp/energy/alive/effects to start
  // state; on resume, preserve the live state passed in (clone effects so we
  // don't mutate the caller's snapshot).
  const p = resume
    ? player.map(u => ({ ...u, effects: (u.effects ?? []).map(ef => ({ ...ef })) }))
    : player.map(u => ({ ...u, hp: u.maxHp, energy: 0, alive: true, effects: [] as ActiveEffect[] }));
  const e = resume
    ? enemy.map(u => ({ ...u, effects: (u.effects ?? []).map(ef => ({ ...ef })) }))
    : enemy.map(u => ({ ...u, hp: u.maxHp, energy: 0, alive: true, effects: [] as ActiveEffect[] }));
  // Echo: squad HP boost — applied ONCE at battle init so the bonus carries
  // through damage calcs as if it were base HP (skip on resume — already in).
  if (!resume && _activeEchoes.squadHpMult > 0) {
    const mult = 1 + _activeEchoes.squadHpMult;
    for (const u of p) {
      u.maxHp = Math.floor(u.maxHp * mult);
      u.hp = u.maxHp;
    }
  }
  const initial = {
    player: p.map(u => ({ ...u, effects: [] })),
    enemy: e.map(u => ({ ...u, effects: [] })),
  };
  const log: BattleAction[] = [];
  let tick = 0;
  let round = 0;
  const firstTurnDone = new Set<string>();
  const unitMap = new Map<string, CombatUnit>([...p, ...e].map(u => [u.id, u]));
  // Stamp every log entry between [startIdx, log.length) with the current
  // energy of its src/dst. Called at the end of each unit's turn so the UI
  // can replay per-unit energy alongside HP.
  const snapshotEnergy = (startIdx: number) => {
    for (let i = startIdx; i < log.length; i++) {
      const entry = log[i];
      const srcU = unitMap.get(entry.src);
      const dstU = unitMap.get(entry.dst);
      if (srcU) entry.srcEnergyAfter = srcU.energy;
      if (dstU) entry.dstEnergyAfter = dstU.energy;
    }
  };

  // Echo: revive-first-fallen — one-time per battle. Tracks whether the
  // single resurrection has been spent. Resurrects the first player unit to
  // die at reviveFirstFallenPct of its maxHp (checked after every turn so it
  // catches deaths from any source: attacks, reflect, or burn).
  let reviveUsed = false;

  // Apply first-turn passives at round 0 for everyone (skip on resume — they
  // already fired in the original resolve before the snapshot was taken).
  if (!resume) {
    for (const unit of [...p, ...e]) {
      if (!firstTurnDone.has(unit.id)) {
        firstTurnDone.add(unit.id);
        const allies = unit.side === 'player' ? p : e;
        const ft = applyFirstTurn(unit, allies);
        for (const h of ft.healLogs) {
          log.push({ tick: ++tick, src: unit.id, dst: h.dst, dmg: 0, crit: false, ult: false, heal: h.heal });
        }
      }
    }
  }

  // Round cap raised to 120 so an appropriately-strong squad actually finishes
  // high-HP bosses (a real kill-win) within the limit instead of timing out
  // into a judged result. Manual mode (holding ults) can still reach the cap —
  // that's the player's choice not to fire.
  while (p.some(u => u.alive) && e.some(u => u.alive) && round < 120) {
    _currentRound = round;
    // Echo: round-0 SPD boost to player side only (e.g. Crimson Centaur echo).
    const firstRoundBoost = round === 0 && _activeEchoes.firstRoundSpdMult > 0
      ? _activeEchoes.firstRoundSpdMult : 0;
    const order = [...p, ...e].filter(u => u.alive).sort((a, b) => {
      const aSpd = a.side === 'player' ? a.spd * (1 + firstRoundBoost) : a.spd;
      const bSpd = b.side === 'player' ? b.spd * (1 + firstRoundBoost) : b.spd;
      return bSpd - aSpd;
    });
    for (const unit of order) {
      if (!unit.alive) continue;
      if (!p.some(u => u.alive) || !e.some(u => u.alive)) break;
      const isPlayer = unit.side === 'player';
      const allies = isPlayer ? p : e;
      const enemies = isPlayer ? e : p;
      // Wrap the turn body so we can snapshot energy onto every log entry
      // produced this turn — `break` exits the inner do-block, mimicking
      // the prior `continue`-to-next-unit flow without skipping snapshotting.
      const turnStart = log.length;
      do {
      // ===== Status-effect tick (start of this unit's turn) =====
      // Burn deals its flat damage, stun flags the turn to be skipped, then
      // every effect's remaining counter decrements and expired ones prune.
      let stunned = false;
      if (unit.effects && unit.effects.length) {
        for (const eff of unit.effects) {
          if (eff.remaining <= 0) continue;
          if (eff.kind === 'burn') {
            const burnDmg = Math.max(0, Math.floor(eff.value));
            if (burnDmg > 0) {
              unit.hp = Math.max(0, unit.hp - burnDmg);
              log.push({ tick: ++tick, src: unit.id, dst: unit.id, dmg: burnDmg, crit: false, ult: false, burn: true });
            }
          } else if (eff.kind === 'stun') {
            stunned = true;
          }
        }
        // Decrement durations and drop expired effects.
        unit.effects = unit.effects
          .map(eff => ({ ...eff, remaining: eff.remaining - 1 }))
          .filter(eff => eff.remaining > 0 && !(eff.kind === 'shield' && eff.value <= 0));
        if (unit.hp <= 0) { unit.alive = false; break; }  // died to burn
      }
      if (stunned) break;  // turn skipped by stun

      // Manual-ult policy: a player unit set to 'hold' banks energy at 100 and
      // keeps basic-attacking until the player releases it (forceUltNow). With
      // no policy (the default / every existing caller) `held` is always false,
      // so behavior is unchanged.
      const isForcedRelease = unit.id === forceUltNow && !forceConsumed;
      const held = unit.side === 'player'
        && ultPolicy[unit.id] === 'hold'
        && !isForcedRelease;
      // Heal/revive ults are "wasted" if no ally needs them — keep energy
      // pegged at 100 and fall through to the basic-attack block.
      const rawIsUlt = unit.energy >= 100 && !held;
      const rawSkill = rawIsUlt ? SKILL_BY_ID[unit.ultimateId] : undefined;
      const isHealUlt = rawSkill?.targeting === 'self' && rawSkill.effect?.type === 'heal';
      const isReviveUlt = rawSkill?.targeting === 'self' && rawSkill.effect?.type === 'revive';
      const wastedHeal = isHealUlt && !allies.some(a => a.alive && a.hp < a.maxHp);
      // Revive is wasted only if no one is dead AND nobody needs healing.
      const wastedRevive = isReviveUlt
        && !allies.some(a => !a.alive)
        && !allies.some(a => a.alive && a.hp < a.maxHp);
      const isUlt = rawIsUlt && !wastedHeal && !wastedRevive;
      const skill = (wastedHeal || wastedRevive) ? undefined : rawSkill;

      // Skills disabled — every hero now builds straight to ult at 100
      // energy. Ult multipliers were bumped ~25% in skills.ts to absorb
      // the lost mid-cycle skill damage.
      const canSkill = false;
      if (canSkill) {
        unit.skillUsed = true;
        const target = pickEnemyTarget(enemies, rng);
        if (target) {
          const eAdv = elementAdvantage(unit.element, target.element);
          const isCrit = rollCrit(unit.crit, rng);
          let dmg = mitigatedDamage(unit.atk * 2.0, target.def);
          dmg = Math.floor(dmg * (isCrit ? critMult() : 1) * eAdv);
          target.hp = Math.max(0, target.hp - dmg);
          log.push({ tick: ++tick, src: unit.id, dst: target.id, dmg, crit: isCrit, ult: false, skill: true, ele: eleTag(eAdv) });
          if (target.hp <= 0) {
            target.alive = false;
            applyOnKill(unit);
          }
        }
        unit.energy = Math.max(0, unit.energy - 50);
        break;
      }

      if (isUlt && skill) {
        // Ult-level bonus from per-hero skill leveling
        const ultMult = ultLevelMultiplier(unit.ultLevel ?? 0);
        if (skill.targeting === 'self' && skill.effect?.type === 'heal') {
          const healValue = Math.floor((skill.effect.value + Math.floor(unit.atk * 0.6)) * ultMult);
          let isFirst = true;
          for (const ally of allies) {
            if (!ally.alive) continue;
            const before = ally.hp;
            ally.hp = Math.min(ally.maxHp, ally.hp + healValue);
            log.push({ tick: ++tick, src: unit.id, dst: ally.id, dmg: 0, crit: false, ult: true, heal: ally.hp - before, cont: !isFirst });
            isFirst = false;
          }
          unit.energy = 0;
          break;
        } else if (skill.targeting === 'self' && skill.effect?.type === 'revive') {
          // Revive one dead ally to value% of maxHp (NOT full health),
          // then top up living allies by a flat amount. If no one is dead,
          // the spell falls back to a pure team heal so the ult is never
          // a complete waste.
          const revivePct = Math.max(1, skill.effect.value) / 100;
          const livingHeal = Math.floor((700 + Math.floor(unit.atk * 0.4)) * ultMult);
          let isFirst = true;

          // Pick the first dead ally (preserves squad order — the front-
          // line picks the front-line first). Only one ally revives per
          // cast so the skill stays meaningful, not infinite respawn.
          const deadAlly = allies.find(a => !a.alive);
          if (deadAlly) {
            const reviveHp = Math.max(1, Math.floor(deadAlly.maxHp * revivePct * ultMult));
            deadAlly.alive = true;
            deadAlly.hp = Math.min(deadAlly.maxHp, reviveHp);
            // skillUsed reset so the revived ally can use their skill again
            deadAlly.skillUsed = false;
            // log as a "heal" event so the UI shows the green floater + revive sparkle
            log.push({ tick: ++tick, src: unit.id, dst: deadAlly.id, dmg: 0, crit: false, ult: true, heal: deadAlly.hp });
            isFirst = false;
          }
          // Top up living allies
          for (const ally of allies) {
            if (!ally.alive) continue;
            if (ally.hp >= ally.maxHp) continue;
            const before = ally.hp;
            ally.hp = Math.min(ally.maxHp, ally.hp + livingHeal);
            log.push({ tick: ++tick, src: unit.id, dst: ally.id, dmg: 0, crit: false, ult: true, heal: ally.hp - before, cont: !isFirst });
            isFirst = false;
          }
          unit.energy = 0;
          break;
        } else if (skill.targeting === 'all') {
          let isFirst = true;
          const hitEnemies: CombatUnit[] = [];
          const atkMult = buffAtkMult(unit);
          for (const target of enemies) {
            if (!target.alive) continue;
            const eAdv = elementAdvantage(unit.element, target.element);
            const isCrit = rollCrit(unit.crit, rng);
            let dmg = mitigatedDamage(unit.atk * skill.damageMultiplier * atkMult, effectiveDef(target));
            dmg = Math.floor(dmg * (isCrit ? critMult() : 1) * eAdv * ultMult * echoOffensiveMult(unit, target, 'ult') * (1 + (unit.ultDmgBonus ?? 0)));
            const through = absorbWithShield(target, dmg);
            target.hp = Math.max(0, target.hp - through);
            log.push({ tick: ++tick, src: unit.id, dst: target.id, dmg: through, crit: isCrit, ult: true, cont: !isFirst, ele: eleTag(eAdv), shielded: through === 0 && dmg > 0 });
            isFirst = false;
            hitEnemies.push(target);
            if (target.hp <= 0) target.alive = false;
          }
          applySkillEffect(skill.effect, unit, allies, hitEnemies);
        } else {
          const target = skill.targeting === 'lowest'
            ? [...enemies].filter(x => x.alive).sort((a, b) => a.hp - b.hp)[0]
            : pickEnemyTarget(enemies, rng);
          if (target) {
            const eAdv = elementAdvantage(unit.element, target.element);
            const isCrit = rollCrit(unit.crit, rng);
            let dmg = mitigatedDamage(unit.atk * skill.damageMultiplier * buffAtkMult(unit), effectiveDef(target));
            dmg = Math.floor(dmg * (isCrit ? critMult() : 1) * eAdv * ultMult * echoOffensiveMult(unit, target, 'ult') * (1 + (unit.ultDmgBonus ?? 0)));
            const through = absorbWithShield(target, dmg);
            target.hp = Math.max(0, target.hp - through);
            log.push({ tick: ++tick, src: unit.id, dst: target.id, dmg: through, crit: isCrit, ult: true, ele: eleTag(eAdv), shielded: through === 0 && dmg > 0 });
            if (target.hp <= 0) target.alive = false;
            applySkillEffect(skill.effect, unit, allies, [target]);
          }
        }
        unit.energy = 0;
      } else {
        // Basic attack
        if (unit.archetype === 'healer' && allies.some(a => a.alive && a.hp / a.maxHp < 0.6)) {
          const ally = pickAllyHealTarget(allies);
          if (ally && ally !== unit) {
            const healValue = Math.floor(unit.atk * 1.2);
            const before = ally.hp;
            ally.hp = Math.min(ally.maxHp, ally.hp + healValue);
            log.push({ tick: ++tick, src: unit.id, dst: ally.id, dmg: 0, crit: false, ult: false, heal: ally.hp - before });
            unit.energy = Math.min(100, unit.energy + 20);
            break;
          }
        }
        const target = pickEnemyTarget(enemies, rng);
        if (!target) break;
        const eAdv = elementAdvantage(unit.element, target.element);
        const mods = getDamageMods(unit);
        const aliveEnemies = enemies.filter(en => en.alive).length;
        const isCrit = rollCrit(unit.crit, rng, mods.critBonus, aliveEnemies);
        let dmg = mitigatedDamage(unit.atk, effectiveDef(target));
        dmg = Math.floor(dmg * (isCrit ? critMult() : 1) * eAdv * mods.damageMultiplier * echoOffensiveMult(unit, target, 'basic'));
        // on_hit dodge/reflect (passes attacker so mage-damage-reduction echo can fire)
        const hit = applyOnHit(target, dmg, rng, unit);
        // Shield soaks what's left after dodge. dmg becomes the damage actually
        // dealt so downstream lifesteal scales off the real figure.
        const preShield = hit.dmg;
        dmg = absorbWithShield(target, preShield);
        target.hp = Math.max(0, target.hp - dmg);
        if (target.hp <= 0) target.alive = false;
        log.push({ tick: ++tick, src: unit.id, dst: target.id, dmg, crit: isCrit, ult: false, ele: eleTag(eAdv), shielded: dmg === 0 && preShield > 0 });
        // Echo: basic-attack lifesteal — player units only, applied after the swing.
        if (unit.side === _playerSide && unit.alive && _activeEchoes.basicLifesteal > 0 && dmg > 0) {
          const heal = Math.floor(dmg * _activeEchoes.basicLifesteal);
          if (heal > 0) {
            const before = unit.hp;
            unit.hp = Math.min(unit.maxHp, unit.hp + heal);
            const gained = unit.hp - before;
            if (gained > 0) log.push({ tick: ++tick, src: unit.id, dst: unit.id, dmg: 0, crit: false, ult: false, heal: gained });
          }
        }
        // Reflect damage back — only triggers if target survived the swing.
        // Otherwise we'd log a dead target "attacking" which renders the
        // dead-unit attack animation in the UI.
        if (hit.reflect > 0 && target.alive) {
          unit.hp = Math.max(0, unit.hp - hit.reflect);
          log.push({ tick: ++tick, src: target.id, dst: unit.id, dmg: hit.reflect, crit: false, ult: false });
          if (unit.hp <= 0) unit.alive = false;
        }
        // On-attack lifesteal — same rule: dead units can't heal post-mortem.
        if (unit.alive) {
          const lifesteal = applyOnAttackHeal(unit, allies, dmg);
          if (lifesteal) log.push({ tick: ++tick, src: unit.id, dst: lifesteal.dst, dmg: 0, crit: false, ult: false, heal: lifesteal.heal });
        }
        // Lifesteal-on-kill only fires if the attacker is also still alive.
        if (!target.alive && unit.alive) applyOnKill(unit);
        unit.energy = Math.min(100, unit.energy + 20);
        target.energy = Math.min(100, target.energy + 30);
      }
      } while (false);
      // Once the force-released unit has taken its turn, the release is spent —
      // it reverts to its hold policy for the rest of this branch.
      if (unit.id === forceUltNow) forceConsumed = true;

      // Echo: revive the first fallen player unit, once per battle.
      if (!reviveUsed && _activeEchoes.reviveFirstFallenPct > 0) {
        const fallen = p.find(u => !u.alive);
        if (fallen) {
          reviveUsed = true;
          fallen.alive = true;
          fallen.hp = Math.max(1, Math.floor(fallen.maxHp * _activeEchoes.reviveFirstFallenPct));
          fallen.energy = 0;
          fallen.effects = [];
          log.push({ tick: ++tick, src: fallen.id, dst: fallen.id, dmg: 0, crit: false, ult: false, heal: fallen.hp });
        }
      }

      snapshotEnergy(turnStart);
    }
    round++;
  }

  // Winner rule:
  //   1. All enemies dead → player wins (kill-all victory).
  //   2. All players dead → enemy wins (wipe loss).
  //   3. Round-cap TIMEOUT (both sides standing) → the player wins ONLY if they
  //      actually beat the enemy team down: the enemy team must be below half
  //      its total HP AND the player must be ahead on attrition (healthier team).
  //      Otherwise it's a defeat — you ran out of time without winning. This
  //      stops "VICTORY" from showing while the enemies are clearly still alive
  //      and healthy (the old rule awarded the win to whoever had more bodies,
  //      so 3 heroes vs 1 full-HP boss counted as a win).
  const enemyAlive = e.some(u => u.alive);
  const playerAlive = p.some(u => u.alive);
  let winner: 'player' | 'enemy';
  if (!enemyAlive) winner = 'player';
  else if (!playerAlive) winner = 'enemy';
  else {
    const teamHpFrac = (arr: typeof p) => {
      const cur = arr.reduce((s, u) => s + (u.alive ? u.hp : 0), 0);
      const max = arr.reduce((s, u) => s + Math.max(1, u.maxHp), 0);
      return cur / max;
    };
    const eFrac = teamHpFrac(e);
    const pFrac = teamHpFrac(p);
    winner = (eFrac < 0.5 && pFrac >= eFrac) ? 'player' : 'enemy';
  }
  return { seed: s, winner, log, initial };
}

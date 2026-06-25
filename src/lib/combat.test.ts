// Combat engine tests. The auto-battler is the one part of the game that is
// pure deterministic math, so it's the highest-value thing to lock down before
// any balance iteration. These also guard the Tier-2 work that resurrected the
// status-effect system (burn DoT, shields), the element triangle, and the
// revive echo — all of which were previously dead.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { resolveBattle } from './combat';
import { setPlayerLevelForBoost, setEquippedEchoes } from './stats';
import type { CombatUnit, Element, Archetype } from '../types';

let idc = 0;
function unit(over: Partial<CombatUnit> = {}): CombatUnit {
  idc += 1;
  return {
    id: over.id ?? `u${idc}`,
    templateId: over.templateId ?? 'dummy',  // no passives unless overridden
    side: over.side ?? 'player',
    name: over.name ?? 'Unit',
    emoji: '🐲',
    color: '#fff',
    element: (over.element ?? 'dark') as Element,
    archetype: (over.archetype ?? 'warrior') as Archetype,
    rarity: 3,
    level: over.level ?? 30,
    star: over.star ?? 3,
    hp: over.hp ?? over.maxHp ?? 5000,
    maxHp: over.maxHp ?? 5000,
    atk: over.atk ?? 300,
    def: over.def ?? 50,
    spd: over.spd ?? 100,
    crit: over.crit ?? 0.1,
    energy: 0,
    ultimateId: over.ultimateId ?? 'iron_palm',
    ultLevel: over.ultLevel ?? 0,
    alive: true,
    effects: [],
    ...over,
  };
}

beforeEach(() => {
  // Neutral account state so tests don't depend on a loaded profile.
  setPlayerLevelForBoost(1);
  setEquippedEchoes([]);
  idc = 0;
});

describe('determinism', () => {
  it('same seed produces an identical result', () => {
    const mk = () => ({
      p: [unit({ side: 'player', id: 'p0' }), unit({ side: 'player', id: 'p1', atk: 250 })],
      e: [unit({ side: 'enemy', id: 'e0' }), unit({ side: 'enemy', id: 'e1', spd: 80 })],
    });
    const a = mk(); const b = mk();
    const r1 = resolveBattle(a.p, a.e, 'seed-xyz');
    const r2 = resolveBattle(b.p, b.e, 'seed-xyz');
    expect(r1.winner).toBe(r2.winner);
    expect(r1.log.length).toBe(r2.log.length);
    const dmg = (r: typeof r1) => r.log.reduce((s, x) => s + x.dmg, 0);
    expect(dmg(r1)).toBe(dmg(r2));
  });

  it('different seeds can diverge', () => {
    const mk = () => ({
      p: [unit({ side: 'player', crit: 0.5 })],
      e: [unit({ side: 'enemy', maxHp: 20000 })],
    });
    const a = mk(); const b = mk();
    const r1 = resolveBattle(a.p, a.e, 'seedA');
    const r2 = resolveBattle(b.p, b.e, 'seedB');
    const dmg = (r: typeof r1) => r.log.reduce((s, x) => s + x.dmg, 0);
    // Not a hard guarantee for all seed pairs, but these two differ.
    expect(dmg(r1)).not.toBe(dmg(r2));
  });
});

describe('winner rules', () => {
  it('a vastly stronger player team wins by wipe', () => {
    const p = [unit({ side: 'player', atk: 4000, maxHp: 50000, spd: 200 })];
    const e = [unit({ side: 'enemy', atk: 10, maxHp: 500, def: 0, spd: 1 })];
    const r = resolveBattle(p, e, 's1');
    expect(r.winner).toBe('player');
    expect(r.initial.enemy.length).toBe(1);
  });

  it('a vastly stronger enemy team wins', () => {
    const p = [unit({ side: 'player', atk: 10, maxHp: 500, def: 0, spd: 1 })];
    const e = [unit({ side: 'enemy', atk: 4000, maxHp: 50000, spd: 200 })];
    const r = resolveBattle(p, e, 's2');
    expect(r.winner).toBe('enemy');
  });

  it('a timeout with a healthy enemy alive is a DEFEAT, not a body-count victory', () => {
    // 3 chip-damage players vs 1 super-tanky enemy: the fight times out at the
    // round cap with everyone near full HP. The old rule handed the player a
    // win for having more bodies standing; now a healthy living enemy = defeat.
    const p = [
      unit({ side: 'player', id: 'a', atk: 3, maxHp: 200000, def: 800, spd: 100 }),
      unit({ side: 'player', id: 'b', atk: 3, maxHp: 200000, def: 800, spd: 90 }),
      unit({ side: 'player', id: 'c', atk: 3, maxHp: 200000, def: 800, spd: 80 }),
    ];
    const e = [unit({ side: 'enemy', id: 'z', atk: 3, maxHp: 5_000_000, def: 800, spd: 50 })];
    const r = resolveBattle(p, e, 'timeout1');
    expect(r.winner).toBe('enemy');               // not a hollow victory
    expect(r.log.some(a => a.dst === 'z' && a.dmg > 0)).toBe(true); // fight happened
  });
});

describe('element triangle', () => {
  it('fire vs earth is super-effective for the attacker', () => {
    const p = [unit({ side: 'player', id: 'pf', element: 'fire', atk: 400 })];
    const e = [unit({ side: 'enemy', element: 'earth', maxHp: 40000 })];
    const r = resolveBattle(p, e, 'ele1');
    // Only the fire unit's own swings should carry the matchup tag.
    const own = r.log.filter(a => a.src === 'pf' && a.dmg > 0);
    expect(own.some(a => a.ele === 'strong')).toBe(true);
    expect(own.some(a => a.ele === 'weak')).toBe(false);
  });

  it('fire vs water is resisted for the attacker', () => {
    const p = [unit({ side: 'player', id: 'pf', element: 'fire', atk: 400 })];
    const e = [unit({ side: 'enemy', element: 'water', maxHp: 40000 })];
    const r = resolveBattle(p, e, 'ele2');
    const own = r.log.filter(a => a.src === 'pf' && a.dmg > 0);
    expect(own.some(a => a.ele === 'weak')).toBe(true);
    expect(own.some(a => a.ele === 'strong')).toBe(false);
  });
});

describe('status effects (resurrected dead content)', () => {
  it('burn ult applies a damage-over-time tick', () => {
    // infernal_cataclysm = AOE, burn 200/turn for 3. High-HP both sides so the
    // battle runs long enough for the caster to build to 100 energy and cast.
    const p = [unit({ side: 'player', ultimateId: 'infernal_cataclysm', atk: 200, maxHp: 60000, def: 200 })];
    const e = [unit({ side: 'enemy', atk: 150, maxHp: 60000, def: 50 })];
    const r = resolveBattle(p, e, 'burn1');
    const burnTicks = r.log.filter(a => a.burn === true);
    expect(burnTicks.length).toBeGreaterThan(0);
    // Each tick deals the configured 200 (floored).
    expect(burnTicks.every(t => t.dmg === 200)).toBe(true);
    // Burn ticks are self-targeted on the burning unit.
    expect(burnTicks.every(t => t.src === t.dst)).toBe(true);
  });

  it('ally-shield ult absorbs incoming damage (shielded entries appear)', () => {
    // aegis_judgment = single-target + 450 ally shield for 2 turns. Enemy hits
    // are small (< 450) so a freshly-shielded ally fully absorbs them.
    const p = [
      unit({ side: 'player', id: 'caster', ultimateId: 'aegis_judgment', atk: 120, maxHp: 80000, def: 300, spd: 150 }),
      unit({ side: 'player', id: 'ally', atk: 100, maxHp: 80000, def: 300, spd: 60 }),
    ];
    const e = [unit({ side: 'enemy', atk: 120, def: 0, maxHp: 200000, spd: 90, crit: 0 })];
    const r = resolveBattle(p, e, 'shield1');
    expect(r.log.some(a => a.shielded === true)).toBe(true);
  });
});

describe('revive_first_fallen echo', () => {
  it('revives a fallen player unit once at 30% HP when equipped', () => {
    setEquippedEchoes(['rot_phoenix']); // revive_first_fallen 0.30
    const maxHp = 4000;
    const p = [unit({ side: 'player', atk: 50, maxHp, def: 0, spd: 1 })];
    const e = [unit({ side: 'enemy', atk: 5000, maxHp: 50000, def: 0, spd: 200 })];
    const r = resolveBattle(p, e, 'rev1');
    const reviveHeal = Math.floor(maxHp * 0.30);
    // The revive is logged as a self-heal equal to 30% of maxHp.
    expect(r.log.some(a => a.heal === reviveHeal && a.src === a.dst && a.src === p[0].id)).toBe(true);
  });

  it('does NOT revive without the echo', () => {
    setEquippedEchoes([]);
    const maxHp = 4000;
    const p = [unit({ side: 'player', atk: 50, maxHp, def: 0, spd: 1 })];
    const e = [unit({ side: 'enemy', atk: 5000, maxHp: 50000, def: 0, spd: 200 })];
    const r = resolveBattle(p, e, 'rev2');
    const reviveHeal = Math.floor(maxHp * 0.30);
    expect(r.log.some(a => a.heal === reviveHeal)).toBe(false);
    expect(r.winner).toBe('enemy');
  });
});

describe('set-bonus ult damage', () => {
  it('a unit with ultDmgBonus deals more ult damage than one without', () => {
    const e = () => [unit({ side: 'enemy', maxHp: 500000, def: 100, atk: 50, spd: 1 })];
    const base = unit({ side: 'player', id: 'pb', ultimateId: 'iron_palm', atk: 600, maxHp: 60000, spd: 120, crit: 0 });
    const buffed = unit({ side: 'player', id: 'pu', ultimateId: 'iron_palm', atk: 600, maxHp: 60000, spd: 120, crit: 0, ultDmgBonus: 0.5 });
    const rBase = resolveBattle([base], e(), 'set1');
    const rBuff = resolveBattle([buffed], e(), 'set1');
    const ultDmg = (r: typeof rBase, id: string) =>
      r.log.filter(a => a.src === id && a.ult && a.dmg > 0).reduce((s, a) => s + a.dmg, 0);
    const dBase = ultDmg(rBase, 'pb');
    const dBuff = ultDmg(rBuff, 'pu');
    expect(dBase).toBeGreaterThan(0);
    // +50% set bonus → ~1.5x ult damage (allow rounding/crit-cap slack).
    expect(dBuff).toBeGreaterThan(dBase * 1.4);
  });
});

describe('manual-ult policy (interactive combat)', () => {
  const mkP = () => [unit({ side: 'player', id: 'pa', ultimateId: 'infernal_cataclysm', atk: 200, maxHp: 60000, def: 200 })];
  const mkE = () => [unit({ side: 'enemy', id: 'ea', atk: 150, maxHp: 60000, def: 50 })];

  it("a 'hold' unit never auto-fires its ult", () => {
    const auto = resolveBattle(mkP(), mkE(), 'hold1');
    const held = resolveBattle(mkP(), mkE(), 'hold1', { ultPolicy: { pa: 'hold' } });
    expect(auto.log.some(a => a.src === 'pa' && a.ult)).toBe(true);   // normally ults
    expect(held.log.some(a => a.src === 'pa' && a.ult)).toBe(false);  // held — never ults
  });

  it('forceUltNow releases a held unit EXACTLY once, then it holds again', () => {
    // Long fight (huge enemy HP) so the unit recharges to 100 many times. The
    // forced unit must fire its ult once and then revert to holding — not
    // auto-fire on every recharge (the "ult kept replaying" bug).
    const p = [unit({ side: 'player', id: 'pf', ultimateId: 'iron_palm', atk: 600, maxHp: 200000, energy: 100, spd: 120, def: 300 })];
    const e = [unit({ side: 'enemy', id: 'ef', maxHp: 5_000_000, def: 50, atk: 80, spd: 1 })];
    const r = resolveBattle(p, e, 'force1', { resume: true, ultPolicy: { pf: 'hold' }, forceUltNow: 'pf' });
    const ults = r.log.filter(a => a.src === 'pf' && a.ult && a.dmg > 0).length;
    expect(ults).toBe(1);
  });

  it('resume preserves live HP/energy instead of resetting', () => {
    const p = [unit({ side: 'player', id: 'pr', atk: 50, maxHp: 5000, hp: 1000, spd: 200 })];
    const e = [unit({ side: 'enemy', id: 'er', maxHp: 5000, atk: 10, def: 0, spd: 1 })];
    const r = resolveBattle(p, e, 'resume1', { resume: true });
    expect(r.initial.player[0].hp).toBe(1000); // not reset to maxHp 5000
  });
});

describe('crit cap', () => {
  it('does not crit on 100% of hits even with huge crit stacking', () => {
    setPlayerLevelForBoost(200); // large crit + crit-dmg scaling
    const p = [unit({ side: 'player', crit: 0.9, atk: 300, maxHp: 80000, spd: 120 })];
    const e = [unit({ side: 'enemy', atk: 100, maxHp: 300000, def: 50, spd: 80, crit: 0 })];
    const r = resolveBattle(p, e, 'crit1');
    const playerHits = r.log.filter(a => a.src === p[0].id && a.dmg > 0 && !a.heal);
    const crits = playerHits.filter(a => a.crit).length;
    expect(playerHits.length).toBeGreaterThan(20);
    expect(crits).toBeGreaterThan(0);          // crits happen
    expect(crits).toBeLessThan(playerHits.length); // but not every hit (cap < 1)
  });
});

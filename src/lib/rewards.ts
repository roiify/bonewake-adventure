// Shared battle-reward helpers. These exist because the same payout logic was
// copy-pasted across BattlePlayPage.endBattle (stage + dungeon branches),
// DungeonsPage.runTier, and other mode pages — and the copies had started to
// drift (the audit found play-through and instant-skip granting subtly
// different results). Centralizing here keeps "play" and "skip" in lockstep.
import { useHeroes } from '../store/heroes';
import { useProfile } from '../store/profile';
import { xpForLevel, effectiveMaxLevel } from './stats';

// Distribute `exp` to each squad hero (by instance id), leveling them up to
// their star/account cap. Does NOT award player-account XP — callers do that
// separately (it isn't always tied to the same number). No-op for exp <= 0.
export async function distributeSquadExp(squadIds: string[], exp: number): Promise<void> {
  if (exp <= 0 || squadIds.length === 0) return;
  const heroes = useHeroes.getState().heroes;
  const updateHero = useHeroes.getState().updateHero;
  const playerLevel = useProfile.getState().profile.level;
  for (const id of squadIds) {
    const h = heroes.find(x => x.id === id);
    if (!h) continue;
    let lvl = h.level;
    let xp = h.exp + exp;
    const cap = effectiveMaxLevel(h.star, playerLevel);
    while (xp >= xpForLevel(lvl) && lvl < cap) {
      xp -= xpForLevel(lvl);
      lvl++;
    }
    await updateHero(h.id, { level: lvl, exp: xp });
  }
}

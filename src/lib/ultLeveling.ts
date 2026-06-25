// Ultimate skill leveling — spend gold + Soulshards to upgrade each hero's ult.
// Each level adds +8% damage / heal value to the ult only (not basic attacks).
import { useProfile } from '../store/profile';
import { useHeroes } from '../store/heroes';
import { db } from './db';
import { addMaterial, spendMaterial } from './crafting';
import { MAT_SOULSHARD } from '../data/ultimateGear';

export const MAX_ULT_LEVEL = 10;
export const ULT_BONUS_PER_LEVEL = 0.06; // +6% per level

export function ultLevelMultiplier(level: number = 0): number {
  return 1 + level * ULT_BONUS_PER_LEVEL;
}

export function ultUpgradeCost(currentLevel: number): { gold: number; soulshard: number } {
  return {
    gold: 500 + currentLevel * 800,
    soulshard: currentLevel * 2,
  };
}

export async function upgradeUltimate(heroInstanceId: string): Promise<{ ok: boolean; error?: string }> {
  const hero = await db.heroes.get(heroInstanceId);
  if (!hero) return { ok: false, error: 'Hero not found' };
  const cur = hero.ultLevel ?? 0;
  if (cur >= MAX_ULT_LEVEL) return { ok: false, error: 'Already at max' };
  const cost = ultUpgradeCost(cur);
  const profile = useProfile.getState();
  if (profile.profile.gold < cost.gold) return { ok: false, error: 'Not enough gold' };
  if (cost.soulshard > 0) {
    const shardRow = await db.items.get(MAT_SOULSHARD);
    if ((shardRow?.count ?? 0) < cost.soulshard) return { ok: false, error: 'Not enough Soulshards' };
  }
  const goldOk = await profile.spendGold(cost.gold);
  if (!goldOk) return { ok: false, error: 'Not enough gold' };
  if (cost.soulshard > 0) {
    const shardOk = await spendMaterial(MAT_SOULSHARD, cost.soulshard);
    if (!shardOk) {
      await profile.addGold(cost.gold); // refund
      return { ok: false, error: 'Not enough Soulshards' };
    }
  }
  await useHeroes.getState().updateHero(heroInstanceId, { ultLevel: cur + 1 });
  return { ok: true };
}

// Expose addMaterial through this module so debug code can re-grant if needed
export { addMaterial };

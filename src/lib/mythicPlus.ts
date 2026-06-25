// Mythic+ Ascension — upgrade crafted (Mythic) set pieces beyond their base stats.
// Reuses the existing `upgradeLevel` field on OwnedEquipment. Each ascension
// level adds +12% to all stats on the piece. Capped at +10.
import { db } from './db';
import type { OwnedEquipment } from './db';
import { useProfile } from '../store/profile';
import { useHeroes } from '../store/heroes';
import { spendMaterial, getMaterialCount } from './crafting';
import { MAT_SOULSHARD, essenceItemId } from '../data/ultimateGear';

export const MAX_ASCENSION = 10;
export const ASCEND_BONUS_PER_LEVEL = 0.08; // +8% all stats per level

// Crafted items have rarity 6 (Mythic). Their effective stat scaling here.
export function mythicAscensionMultiplier(level: number = 0): number {
  return 1 + level * ASCEND_BONUS_PER_LEVEL;
}

export function ascensionCost(currentLevel: number, heroId: string): { gold: number; soulshard: number; essence: number; essenceFor: string } {
  return {
    gold: 5000 + currentLevel * 8000,
    soulshard: 20 + currentLevel * 15,
    essence: 5 + currentLevel * 5,
    essenceFor: heroId,
  };
}

export function isMythic(eq: OwnedEquipment): boolean {
  return (eq.rarity ?? 0) >= 6 && !!eq.craftedPieceId;
}

export async function ascendMythic(equipmentId: string): Promise<{ ok: boolean; error?: string }> {
  const eq = await db.equipment.get(equipmentId);
  if (!eq) return { ok: false, error: 'Item not found' };
  if (!isMythic(eq)) return { ok: false, error: 'Only Mythic crafted pieces ascend' };
  const cur = eq.upgradeLevel ?? 0;
  if (cur >= MAX_ASCENSION) return { ok: false, error: 'Already maxed (+10)' };
  const heroId = eq.setRestrictedTo ?? '';
  if (!heroId) return { ok: false, error: 'Cannot determine hero set' };
  const cost = ascensionCost(cur, heroId);
  const profile = useProfile.getState();
  if (profile.profile.gold < cost.gold) return { ok: false, error: 'Not enough gold' };
  const shards = await getMaterialCount(MAT_SOULSHARD);
  if (shards < cost.soulshard) return { ok: false, error: 'Not enough Soulshards' };
  const ess = await getMaterialCount(essenceItemId(heroId));
  if (ess < cost.essence) return { ok: false, error: `Not enough ${heroId} essence` };
  // Spend
  const goldOk = await profile.spendGold(cost.gold);
  if (!goldOk) return { ok: false, error: 'Not enough gold' };
  await spendMaterial(MAT_SOULSHARD, cost.soulshard);
  await spendMaterial(essenceItemId(heroId), cost.essence);
  await useHeroes.getState().updateEquipment(equipmentId, { upgradeLevel: cur + 1 });
  return { ok: true };
}

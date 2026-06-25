import { db, type OwnedEquipment } from './db';
import { useProfile } from '../store/profile';
import { useHeroes } from '../store/heroes';
import { equipPower } from './loot';
import { MAT_SOULSHARD, MAT_SCRAP, MAT_ARCANE_DUST, MAT_RELIC_SHARD, MAT_LEGENDARY_ESSENCE } from '../data/ultimateGear';
import { getMaterialCount, spendMaterial, addMaterial } from './crafting';
import { useItems } from '../store/items';

// Upgrade cost scales with current upgrade level and rarity
export function upgradeCost(eq: OwnedEquipment): { gold: number; gems: number } {
  const rarity = (eq.rarity ?? 1) as number;
  const lvl = eq.upgradeLevel ?? 0;
  const base = 200 * Math.pow(1.6, lvl);
  const rarityMult = rarity; // 1x..6x
  return {
    gold: Math.round(base * rarityMult),
    gems: rarity >= 4 ? Math.ceil(lvl / 3) : 0,
  };
}

export const MAX_UPGRADE_LEVEL = 20;

// Lineage 2-style enhancement: success chance drops as the current level
// climbs. +1..+4 are guaranteed, then odds fall off a cliff toward +20.
// On fail the item stays at its current level — resources are still
// consumed, but no downgrade. Tuned so a typical run to +20 is a real
// money sink and +20 feels rare.
export function upgradeSuccessChance(currentLevel: number): number {
  // Table-driven for predictability; index = currentLevel (rolling for +N+1).
  // currentLevel 0..3 = 1.0 (guaranteed +1..+4), then taper.
  const table = [
    1.00, 1.00, 1.00, 1.00, 1.00,  // 0->1..4->5
    0.90, 0.80, 0.70, 0.60, 0.50,  // 5->6..9->10
    0.40, 0.32, 0.25, 0.20, 0.15,  // 10->11..14->15
    0.12, 0.09, 0.07, 0.05, 0.01,  // 15->16..19->20
  ];
  const i = Math.max(0, Math.min(table.length - 1, currentLevel));
  return table[i];
}

// === Ult Gear Enchantment ===
// Crafted Mythic ult pieces use a separate soulshard-driven enchant curve
// rather than the gold/gem upgrade for chapter loot. This gives endgame
// soulshard farming a real sink AFTER you've crafted your set.
//
// Cost ramps quadratically — full +10 on one piece costs ~1600 shards,
// full +10 on a 5-piece set ≈ 8000 shards (~2 weeks of post-rebalance
// farming for a single hero's full ult enchant). +12% stat per level
// (already baked into loot.equipStats) caps at +120% piece power at +10.
export const MAX_ENCHANT_LEVEL = 10;

export function enchantCost(eq: OwnedEquipment): { soulshard: number; gold: number } {
  const lvl = eq.upgradeLevel ?? 0;
  // Quadratic-ish curve: 20, 32, 47, 65, 87, 112, 140, 172, 207, 245
  // Totals to ~1127 shards for a full +1→+10 sweep on one piece.
  const shards = Math.round(20 + 12 * lvl + 1.5 * lvl * lvl);
  const gold = 5000 + 2000 * lvl;
  return { soulshard: shards, gold };
}

export async function enchantUltGear(eqId: string): Promise<{ ok: boolean; error?: string }> {
  const eq = await db.equipment.get(eqId);
  if (!eq) return { ok: false, error: 'Not found' };
  if (!eq.craftedPieceId) return { ok: false, error: 'Only crafted ult gear can be enchanted' };
  if ((eq.upgradeLevel ?? 0) >= MAX_ENCHANT_LEVEL) return { ok: false, error: 'Already at max enchant' };
  const cost = enchantCost(eq);
  // Check materials + currency
  const shards = await getMaterialCount(MAT_SOULSHARD);
  if (shards < cost.soulshard) return { ok: false, error: `Need ${cost.soulshard} soulshards (have ${shards})` };
  const profile = useProfile.getState();
  if (cost.gold > 0 && profile.profile.gold < cost.gold) {
    return { ok: false, error: `Need ${cost.gold.toLocaleString()} gold` };
  }
  // Spend
  await spendMaterial(MAT_SOULSHARD, cost.soulshard);
  if (cost.gold > 0) await profile.spendGold(cost.gold);
  await db.equipment.update(eqId, { upgradeLevel: (eq.upgradeLevel ?? 0) + 1 });
  await useHeroes.getState().load();
  await useItems.getState().refresh();
  return { ok: true };
}

export async function upgradeEquipment(eqId: string): Promise<{ ok: boolean; error?: string; failed?: boolean; newLevel?: number }> {
  const eq = await db.equipment.get(eqId);
  if (!eq) return { ok: false, error: 'Not found' };
  const lvl = eq.upgradeLevel ?? 0;
  if (lvl >= MAX_UPGRADE_LEVEL) return { ok: false, error: 'Already maxed' };
  // Crafted Mythic items have fixed stats — disable upgrade for them
  if (eq.craftedPieceId) return { ok: false, error: 'Mythic items are already perfect' };

  const cost = upgradeCost(eq);
  const profile = useProfile.getState();
  if (cost.gold > 0) {
    const ok = await profile.spendGold(cost.gold);
    if (!ok) return { ok: false, error: 'Not enough gold' };
  }
  if (cost.gems > 0) {
    const ok = await profile.spendGems(cost.gems);
    if (!ok) return { ok: false, error: 'Not enough gems' };
  }
  // Roll for success. Resources are consumed either way (Lineage 2 style).
  // On fail the level is unchanged.
  const chance = upgradeSuccessChance(lvl);
  const succeeded = Math.random() < chance;
  if (succeeded) {
    const newLevel = lvl + 1;
    await db.equipment.update(eqId, { upgradeLevel: newLevel });
    await useHeroes.getState().load();
    return { ok: true, newLevel };
  }
  return { ok: true, failed: true, newLevel: lvl };
}

// Salvage yield — gold/gems plus crafting materials. Materials scale with
// rarity. Higher rarities also drop a small amount of lower-tier mats so
// a Legendary salvage feels like a real windfall.
export interface SalvageYield {
  gold: number;
  gems: number;
  mats: Record<string, number>;  // materialId → count
}

export function salvageValue(eq: OwnedEquipment): SalvageYield {
  const rarity = (eq.rarity ?? 1) as number;
  const power = equipPower(eq);
  const mats: Record<string, number> = {};
  if (rarity === 1) mats[MAT_SCRAP] = 1 + Math.floor(Math.random() * 2);                  // 1-2
  else if (rarity === 2) mats[MAT_SCRAP] = 2 + Math.floor(Math.random() * 3);             // 2-4
  else if (rarity === 3) {
    mats[MAT_SCRAP] = 2 + Math.floor(Math.random() * 2);                                  // 2-3
    mats[MAT_ARCANE_DUST] = 1;
  } else if (rarity === 4) {
    mats[MAT_ARCANE_DUST] = 1 + Math.floor(Math.random() * 2);                            // 1-2
    mats[MAT_RELIC_SHARD] = 1;
  } else if (rarity === 5) {
    mats[MAT_RELIC_SHARD] = 1;
    mats[MAT_LEGENDARY_ESSENCE] = 1;
  }
  return {
    gold: Math.round(power * 0.4 + rarity * 50),
    gems: rarity >= 4 ? rarity - 3 : 0,
    mats,
  };
}

async function grantSalvage(value: SalvageYield) {
  if (value.gold > 0) await useProfile.getState().addGold(value.gold);
  if (value.gems > 0) await useProfile.getState().addGems(value.gems);
  for (const [matId, count] of Object.entries(value.mats)) {
    if (count > 0) await addMaterial(matId, count);
  }
}

export async function salvageEquipment(eqId: string): Promise<{ ok: boolean; granted?: SalvageYield }> {
  const eq = await db.equipment.get(eqId);
  if (!eq) return { ok: false };
  // Mythic crafted gear and equipped items can't be salvaged
  if (eq.craftedPieceId) return { ok: false };
  if (eq.equippedTo) return { ok: false };
  const value = salvageValue(eq);
  await grantSalvage(value);
  await db.equipment.delete(eqId);
  await useHeroes.getState().load();
  await useItems.getState().refresh();
  return { ok: true, granted: value };
}

// Bulk salvage by exact rarity set (selected via the auto-salvage modal).
// Pass a Set of LootRarity numbers to salvage every unequipped non-Mythic
// piece whose rarity is in the set.
export async function bulkSalvageRarities(rarities: Set<number>): Promise<{ count: number; granted: SalvageYield }> {
  const all = await db.equipment.toArray();
  const targets = all.filter(eq =>
    !eq.equippedTo &&
    !eq.craftedPieceId &&
    !eq.locked &&
    rarities.has((eq.rarity ?? 1) as number)
  );
  const total: SalvageYield = { gold: 0, gems: 0, mats: {} };
  for (const eq of targets) {
    const v = salvageValue(eq);
    total.gold += v.gold;
    total.gems += v.gems;
    for (const [matId, count] of Object.entries(v.mats)) {
      total.mats[matId] = (total.mats[matId] ?? 0) + count;
    }
    await db.equipment.delete(eq.id);
  }
  await grantSalvage(total);
  await useHeroes.getState().load();
  await useItems.getState().refresh();
  return { count: targets.length, granted: total };
}

// Back-compat wrapper for legacy callers that used the "up to N" pattern.
export async function bulkSalvageBelow(maxRarity: number) {
  const set = new Set<number>();
  for (let r = 1; r <= maxRarity; r++) set.add(r);
  const result = await bulkSalvageRarities(set);
  return { count: result.count, granted: result.granted };
}

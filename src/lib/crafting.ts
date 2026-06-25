import { db, type OwnedEquipment } from './db';
import type { LootStat } from '../data/loot';
import { uid } from './id';
import { PIECE_BY_ID, MAT_SOULSHARD, essenceItemId, SET_BY_HERO, ULTIMATE_SETS } from '../data/ultimateGear';

// === Essence cross-conversion ===
// Burn N essence of any hero → 1 essence of the chosen target hero.
// Solves the "I have lots of Aelia essence but want Kengo essence" bottleneck
// from random-hero drops without adding new material types.
export const ESSENCE_CONVERT_RATE = 5;  // 5 source → 1 target

export async function convertEssence(
  sourceHeroId: string,
  targetHeroId: string,
  sourceAmount: number,
): Promise<{ ok: boolean; gained?: number; error?: string }> {
  if (sourceHeroId === targetHeroId) {
    return { ok: false, error: 'Pick a different target hero' };
  }
  if (sourceAmount <= 0) {
    return { ok: false, error: 'Amount must be positive' };
  }
  if (sourceAmount % ESSENCE_CONVERT_RATE !== 0) {
    return { ok: false, error: `Must convert in multiples of ${ESSENCE_CONVERT_RATE}` };
  }
  const have = await getMaterialCount(essenceItemId(sourceHeroId));
  if (have < sourceAmount) {
    return { ok: false, error: `Only have ${have} source essence` };
  }
  const gained = Math.floor(sourceAmount / ESSENCE_CONVERT_RATE);
  await spendMaterial(essenceItemId(sourceHeroId), sourceAmount);
  await addMaterial(essenceItemId(targetHeroId), gained);
  return { ok: true, gained };
}
import { ULT_GEM_BY_HERO, ULT_GEM_COST_BY_HERO } from '../data/gems';
import { addGemToInventory } from './gems';
import { useProfile } from '../store/profile';
import { useHeroes } from '../store/heroes';
import { useItems } from '../store/items';
import { recordEvent } from './lifetime';

export async function getMaterialCount(itemId: string): Promise<number> {
  const r = await db.items.get(itemId);
  return r?.count ?? 0;
}

export async function addMaterial(itemId: string, count: number) {
  if (count <= 0) return;
  const r = await db.items.get(itemId);
  if (r) {
    await db.items.put({ templateId: itemId, count: r.count + count });
  } else {
    await db.items.put({ templateId: itemId, count });
  }
}

export async function spendMaterial(itemId: string, count: number): Promise<boolean> {
  const r = await db.items.get(itemId);
  if (!r || r.count < count) return false;
  await db.items.put({ templateId: itemId, count: r.count - count });
  return true;
}

// Craft a set piece. Returns the new equipment instance on success, null on failure.
export async function craftSetPiece(pieceId: string): Promise<OwnedEquipment | null> {
  const piece = PIECE_BY_ID[pieceId];
  if (!piece) return null;
  const set = SET_BY_HERO[Object.values(SET_BY_HERO).find(s => s.pieces.some(p => p.id === pieceId))?.heroId ?? ''];
  const heroId = set?.heroId ?? '';

  // Verify materials
  const shards = await getMaterialCount(MAT_SOULSHARD);
  const essence = await getMaterialCount(essenceItemId(heroId));
  const profile = useProfile.getState().profile;
  if (shards < piece.cost.soulshard) return null;
  if (essence < piece.cost.essence) return null;
  if (profile.gold < piece.cost.gold) return null;

  // Verify hero owned (must own the hero to craft their set piece)
  const heroes = useHeroes.getState().heroes;
  if (!heroes.find(h => h.templateId === heroId)) return null;

  // Verify not already crafted (one per piece definition — uniqueness)
  const allEq = useHeroes.getState().equipment;
  if (allEq.find(e => e.craftedPieceId === pieceId)) return null;

  // Deduct
  await spendMaterial(MAT_SOULSHARD, piece.cost.soulshard);
  await spendMaterial(essenceItemId(heroId), piece.cost.essence);
  await useProfile.getState().patch({ gold: profile.gold - piece.cost.gold });

  // Build the OwnedEquipment instance (Mythic rarity — 6, above Legendary)
  const eq: OwnedEquipment = {
    id: uid(),
    baseType: undefined,
    rarity: 6 as any, // Mythic, beyond LootRarity 1-5
    itemLevel: 99,
    name: piece.name,
    primary: { stat: dominantStat(piece.stats), value: piece.stats[dominantStat(piece.stats)] ?? 0 },
    affixes: Object.entries(piece.stats)
      .filter(([s]) => s !== dominantStat(piece.stats))
      .map(([stat, value]) => ({ stat, value: value as number })),
    upgradeLevel: 0,
    equippedTo: null,
    obtainedAt: Date.now(),
    // crafted markers
    craftedPieceId: pieceId,
    setId: piece.setId,
    setRestrictedTo: heroId,
    isUltimateWeapon: piece.isUltimateWeapon ?? false,
    emoji: piece.emoji,
    slot: piece.slot,
  };

  await useHeroes.getState().addEquipment(eq);
  await useItems.getState().refresh();
  await recordEvent({ kind: 'mythicCrafted' });
  return eq;
}

// Craft a hero's Ultimate Socket Gem. Uses the same materials as a
// set piece. Adds the gem to the inventory on success.
export async function craftUltimateGem(heroId: string): Promise<boolean> {
  const gem = ULT_GEM_BY_HERO[heroId];
  const cost = ULT_GEM_COST_BY_HERO[heroId];
  if (!gem || !cost) return false;

  const shards = await getMaterialCount(MAT_SOULSHARD);
  const essence = await getMaterialCount(essenceItemId(heroId));
  const profile = useProfile.getState().profile;
  if (shards < cost.soulshard) return false;
  if (essence < cost.essence) return false;
  if (profile.gold < cost.gold) return false;

  // Verify hero owned
  const heroes = useHeroes.getState().heroes;
  if (!heroes.find(h => h.templateId === heroId)) return false;

  await spendMaterial(MAT_SOULSHARD, cost.soulshard);
  await spendMaterial(essenceItemId(heroId), cost.essence);
  await useProfile.getState().patch({ gold: profile.gold - cost.gold });

  await addGemToInventory(gem.id, 1);
  await useItems.getState().refresh();
  return true;
}

function dominantStat(stats: Record<string, number>): LootStat {
  const order: LootStat[] = ['atk', 'hp', 'def', 'spd', 'crit'];
  for (const s of order) if (stats[s] != null) return s;
  return (Object.keys(stats)[0] as LootStat | undefined) ?? 'hp';
}

// Check if a piece is already crafted (for UI)
export async function isPieceCrafted(pieceId: string): Promise<boolean> {
  const all = await db.equipment.toArray();
  return all.some(e => e.craftedPieceId === pieceId);
}

// Get list of crafted-piece IDs from current equipment store
export function craftedPieceIds(equipment: OwnedEquipment[]): Set<string> {
  return new Set(equipment.map(e => e.craftedPieceId).filter(Boolean) as string[]);
}

// For a hero, count how many of their set pieces are EQUIPPED on that hero.
export function setPiecesEquippedFor(
  heroId: string,
  heroInstanceId: string,
  equipment: OwnedEquipment[]
): number {
  const set = SET_BY_HERO[heroId];
  if (!set) return 0;
  const setPieceIds = new Set(set.pieces.map(p => p.id));
  let count = 0;
  for (const eq of equipment) {
    if (eq.equippedTo === heroInstanceId && eq.craftedPieceId && setPieceIds.has(eq.craftedPieceId)) {
      count++;
    }
  }
  return count;
}

// Material drop logic — called after a 3-star clear in BattlePlayPage
export interface ClearDrop {
  soulshards: number;
  essences: { heroId: string; count: number }[];
  // Forge mats from the salvage/crafting system. Bosses ALWAYS drop a
  // forge mat (tier scales with chapter). Regular clears have a smaller
  // chance to drop low-tier mats. This gives players a non-salvage path
  // to fill the forge wallet.
  forgeMats: { matId: string; count: number }[];
}

export function rollClearDrops(stageChapter: number, isBoss: boolean): ClearDrop {
  const shards = isBoss
    ? 8 + Math.floor(Math.random() * 8) + stageChapter * 2
    : 1 + Math.floor(Math.random() * 4);
  const essences: { heroId: string; count: number }[] = [];
  const rollEssence = isBoss ? 1.0 : 0.35;
  if (Math.random() < rollEssence) {
    const allSets = ULTIMATE_SETS;
    const set = allSets[Math.floor(Math.random() * allSets.length)];
    const count = isBoss ? 3 + Math.floor(Math.random() * 3) : 1;
    essences.push({ heroId: set.heroId, count });
  }

  // Forge mat drops — tier-gated by chapter so early game gives Scrap
  // and Arcane Dust shows up around chapter 10. Bosses always drop
  // one mat at a tier appropriate to the chapter.
  const forgeMats: { matId: string; count: number }[] = [];
  // Import IDs lazily to avoid a circular import; using literal strings.
  const MAT_SCRAP = 'mat_scrap';
  const MAT_ARCANE_DUST = 'mat_arcane_dust';
  const MAT_RELIC_SHARD = 'mat_relic_shard';
  const MAT_LEGENDARY_ESSENCE = 'mat_legendary_essence';
  if (isBoss) {
    // Boss kills guarantee one forge mat. Tier scales with chapter:
    //   ch 1-9  → Scrap (3-6)
    //   ch 10-19 → Arcane Dust (1-2)
    //   ch 20-26 → Relic Shard (1)
    //   ch 27+   → Legendary Essence (1)
    if (stageChapter < 10) forgeMats.push({ matId: MAT_SCRAP, count: 3 + Math.floor(Math.random() * 4) });
    else if (stageChapter < 20) forgeMats.push({ matId: MAT_ARCANE_DUST, count: 1 + Math.floor(Math.random() * 2) });
    else if (stageChapter < 27) forgeMats.push({ matId: MAT_RELIC_SHARD, count: 1 });
    else forgeMats.push({ matId: MAT_LEGENDARY_ESSENCE, count: 1 });
  } else {
    // 40% chance to drop a small Scrap pile on regular 3-star clears.
    // Chapter ≥10 also unlocks a 10% Arcane Dust drop on top.
    if (Math.random() < 0.40) forgeMats.push({ matId: MAT_SCRAP, count: 1 + Math.floor(Math.random() * 3) });
    if (stageChapter >= 10 && Math.random() < 0.10) forgeMats.push({ matId: MAT_ARCANE_DUST, count: 1 });
  }

  return { soulshards: shards, essences, forgeMats };
}

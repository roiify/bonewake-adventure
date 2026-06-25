import { db, type OwnedEquipment } from './db';
import { GEM_BY_ID, SOCKETS_BY_RARITY, gemInventoryKey, type GemDef, type GemTier } from '../data/gems';
import { useItems } from '../store/items';
import { addMaterial, spendMaterial } from './crafting';
import { MAT_GEM_DUST } from '../data/ultimateGear';
import { useProfile } from '../store/profile';

// ============ Inventory primitives ============

export async function addGemToInventory(gemId: string, count = 1) {
  const k = gemInventoryKey(gemId);
  const r = await db.items.get(k);
  await db.items.put({ templateId: k, count: (r?.count ?? 0) + count });
}

export async function removeGemFromInventory(gemId: string, count = 1): Promise<boolean> {
  const k = gemInventoryKey(gemId);
  const r = await db.items.get(k);
  if (!r || r.count < count) return false;
  await db.items.put({ templateId: k, count: r.count - count });
  return true;
}

export async function getGemInventoryMap(): Promise<Record<string, number>> {
  const all = await db.items.toArray();
  const out: Record<string, number> = {};
  for (const row of all) {
    if (row.templateId.startsWith('inv_gem_') && row.count > 0) {
      const gemId = row.templateId.slice(4); // remove 'inv_' prefix
      out[gemId] = row.count;
    }
  }
  return out;
}

// ============ Equipment-side socket helpers ============

export function socketsAvailableFor(eq: OwnedEquipment): number {
  const rarity = (eq.rarity ?? 1) as number;
  return SOCKETS_BY_RARITY[rarity] ?? 0;
}

// Whether this piece has the dedicated ult-gem socket. Only the
// ultimate weapon (one per hero set) gets it.
export function hasUltSocket(eq: OwnedEquipment): boolean {
  return !!eq.isUltimateWeapon;
}

export function ensureSockets(eq: OwnedEquipment): OwnedEquipment {
  const n = socketsAvailableFor(eq);
  if (n === 0 && !hasUltSocket(eq)) return eq;
  const next = { ...eq };
  if (n > 0 && (!eq.sockets || eq.sockets.length !== n)) {
    next.sockets = Array(n).fill(null);
  }
  if (hasUltSocket(eq) && eq.ultSocket === undefined) {
    next.ultSocket = null;
  }
  return next;
}

// Stat contribution from BOTH normal sockets and the dedicated ult socket.
export function equipmentGemStats(eq: OwnedEquipment): Partial<Record<string, number>> {
  const out: Record<string, number> = {};
  const all = [...(eq.sockets ?? []), eq.ultSocket ?? null];
  for (const gemId of all) {
    if (!gemId) continue;
    const g = GEM_BY_ID[gemId];
    if (!g) continue;
    out[g.stat] = (out[g.stat] ?? 0) + g.value;
    if (g.bonusStats) {
      for (const [s, v] of Object.entries(g.bonusStats)) {
        out[s] = (out[s] ?? 0) + (v as number);
      }
    }
  }
  return out;
}

// Back-compat alias — stats.ts and a few older callers used `gemStats`.
export const gemStats = equipmentGemStats;

// ============ Normal-socket actions ============

export async function socketGem(
  equipmentId: string,
  slotIndex: number,
  gemId: string,
  updateEquipment: (id: string, patch: Partial<OwnedEquipment>) => Promise<void>,
): Promise<{ ok: boolean; reason?: string }> {
  const eq = await db.equipment.get(equipmentId);
  if (!eq) return { ok: false, reason: 'item not found' };
  const def = GEM_BY_ID[gemId];
  if (!def) return { ok: false, reason: 'unknown gem' };
  // Ult gems never go into normal sockets — they have their own slot.
  if (def.heroId) return { ok: false, reason: 'ult gem requires the ult socket' };
  const sockets = [...(ensureSockets(eq).sockets ?? [])];
  if (slotIndex < 0 || slotIndex >= sockets.length) return { ok: false, reason: 'invalid slot' };
  const existing = sockets[slotIndex];
  if (existing) await addGemToInventory(existing, 1);
  const removed = await removeGemFromInventory(gemId, 1);
  if (!removed) {
    if (existing) await removeGemFromInventory(existing, 1).catch(() => undefined);
    return { ok: false, reason: 'not in inventory' };
  }
  sockets[slotIndex] = gemId;
  await updateEquipment(equipmentId, { sockets });
  await useItems.getState().refresh();
  return { ok: true };
}

export async function unsocketGem(
  equipmentId: string,
  slotIndex: number,
  updateEquipment: (id: string, patch: Partial<OwnedEquipment>) => Promise<void>,
): Promise<boolean> {
  const eq = await db.equipment.get(equipmentId);
  if (!eq || !eq.sockets) return false;
  const gemId = eq.sockets[slotIndex];
  if (!gemId) return false;
  await addGemToInventory(gemId, 1);
  const sockets = [...eq.sockets];
  sockets[slotIndex] = null;
  await updateEquipment(equipmentId, { sockets });
  await useItems.getState().refresh();
  return true;
}

// ============ Ult-socket actions ============

// Socket a tier-5 hero-bound ult gem into the equipment's dedicated
// ult socket. Enforces: piece must have ult socket, piece's bound hero
// must match the gem's heroId.
export async function socketUltGem(
  equipmentId: string,
  gemId: string,
  updateEquipment: (id: string, patch: Partial<OwnedEquipment>) => Promise<void>,
): Promise<{ ok: boolean; reason?: string }> {
  const eq = await db.equipment.get(equipmentId);
  if (!eq) return { ok: false, reason: 'item not found' };
  if (!hasUltSocket(eq)) return { ok: false, reason: 'no ult socket on this item' };
  const def = GEM_BY_ID[gemId];
  if (!def?.heroId) return { ok: false, reason: 'not an ult gem' };
  if (eq.setRestrictedTo && eq.setRestrictedTo !== def.heroId) {
    return { ok: false, reason: `bound to ${def.heroId}, not this hero's gear` };
  }
  const existing = eq.ultSocket ?? null;
  if (existing) await addGemToInventory(existing, 1);
  const removed = await removeGemFromInventory(gemId, 1);
  if (!removed) {
    if (existing) await removeGemFromInventory(existing, 1).catch(() => undefined);
    return { ok: false, reason: 'not in inventory' };
  }
  await updateEquipment(equipmentId, { ultSocket: gemId });
  await useItems.getState().refresh();
  return { ok: true };
}

export async function unsocketUltGem(
  equipmentId: string,
  updateEquipment: (id: string, patch: Partial<OwnedEquipment>) => Promise<void>,
): Promise<boolean> {
  const eq = await db.equipment.get(equipmentId);
  if (!eq || !eq.ultSocket) return false;
  await addGemToInventory(eq.ultSocket, 1);
  await updateEquipment(equipmentId, { ultSocket: null });
  await useItems.getState().refresh();
  return true;
}

// ============ Auto-transfer on gear swap ============

// When the user replaces gear in a slot, carry over the sockets so a
// hero never "loses" their gems just because they upgraded a piece.
// Returns the patches to apply to both pieces (caller is responsible
// for the actual writes — keeps this function easy to compose with
// the existing equip flow).
export function transferSockets(
  oldEq: OwnedEquipment | null | undefined,
  newEq: OwnedEquipment,
): { newPatch: Partial<OwnedEquipment>; oldPatch: Partial<OwnedEquipment>; overflowGems: string[] } {
  const overflow: string[] = [];
  const newNormalCap = socketsAvailableFor(newEq);
  const newNormal: (string | null)[] = Array(newNormalCap).fill(null);
  // Preserve whatever the new piece already had (uncommon but possible),
  // then layer the old piece's gems on top of empty slots.
  if (newEq.sockets) {
    for (let i = 0; i < Math.min(newEq.sockets.length, newNormalCap); i++) {
      newNormal[i] = newEq.sockets[i];
    }
  }
  if (oldEq?.sockets) {
    let writeIdx = 0;
    for (const gid of oldEq.sockets) {
      if (!gid) continue;
      while (writeIdx < newNormalCap && newNormal[writeIdx]) writeIdx++;
      if (writeIdx >= newNormalCap) {
        overflow.push(gid);
        continue;
      }
      newNormal[writeIdx] = gid;
      writeIdx++;
    }
  }
  // Ult socket: only transfers if both pieces have one. Otherwise the
  // old ult gem returns to inventory so the bound hero can re-equip it
  // on whichever ult weapon they craft next.
  let newUlt: string | null | undefined = newEq.ultSocket ?? (hasUltSocket(newEq) ? null : undefined);
  if (oldEq?.ultSocket) {
    if (hasUltSocket(newEq) && !newUlt) {
      newUlt = oldEq.ultSocket;
    } else {
      overflow.push(oldEq.ultSocket);
    }
  }
  const newPatch: Partial<OwnedEquipment> = {};
  if (newNormalCap > 0) newPatch.sockets = newNormal;
  if (hasUltSocket(newEq)) newPatch.ultSocket = newUlt ?? null;
  const oldPatch: Partial<OwnedEquipment> = {};
  if (oldEq?.sockets?.length) oldPatch.sockets = Array(oldEq.sockets.length).fill(null);
  if (oldEq?.ultSocket !== undefined) oldPatch.ultSocket = null;
  return { newPatch, oldPatch, overflowGems: overflow };
}

// ============ Ult-gem uniqueness check ============

// Counts how many copies of a hero's ult gem the player has across
// inventory + currently-socketed slots (across all equipment). Used to
// gate the craft button — only one ult gem per hero may exist at a time.
export async function ultGemOwnedCount(heroId: string): Promise<number> {
  const gemId = `gem_ult_${heroId}`;
  const invRow = await db.items.get(gemInventoryKey(gemId));
  let n = invRow?.count ?? 0;
  const allEq = await db.equipment.toArray();
  for (const eq of allEq) {
    if (eq.ultSocket === gemId) n++;
    if (eq.sockets) {
      for (const g of eq.sockets) if (g === gemId) n++;
    }
  }
  return n;
}

// ============ One-shot migrations ============

// Old behavior moved every socketed gem on equipment back to inventory
// (when we briefly made gems hero-bound). With gems-back-on-equipment,
// any hero.gems left over need to come back to inventory too.
export async function migrateHeroGemsToInventory(): Promise<{ moved: number }> {
  const heroes = await db.heroes.toArray();
  let moved = 0;
  for (const h of heroes) {
    if (!h.gems || h.gems.every(g => !g)) continue;
    for (const gid of h.gems) {
      if (gid) { await addGemToInventory(gid, 1); moved++; }
    }
    await db.heroes.update(h.id, { gems: [] });
  }
  if (moved > 0) await useItems.getState().refresh();
  return { moved };
}

// Older migration (briefly used) — kept so the App boot path still
// compiles. No-op after it ran the first time.
export async function migrateEquipmentSocketsToInventory(): Promise<{ moved: number }> {
  // Intentional no-op now — gems live on equipment again. Kept exported
  // so the existing App.tsx import doesn't break; safe to remove later.
  return { moved: 0 };
}

// ============ Drop rolls ============

// ============ Gem salvage + craft ============
//
// Mirrors the equipment forge system. Players break unwanted gems
// into Gem Dust and spend Dust to craft a specific gem at a chosen
// stat + tier. Ult gems are exempt — they're crafted via essence.

/** Dust yield per gem salvaged, by tier. Higher tiers = more dust. */
export const GEM_SALVAGE_YIELD: Record<GemTier, number> = {
  1: 1,   // Chip
  2: 3,   // Stone
  3: 8,   // Gem
  4: 20,  // Crystal
  5: 0,   // Ultimate — non-salvageable
};

/** Craft cost in dust + gold, by tier. */
export const GEM_CRAFT_COST: Record<GemTier, { dust: number; gold: number }> = {
  1: { dust: 2,  gold: 0 },
  2: { dust: 8,  gold: 50 },
  3: { dust: 25, gold: 500 },
  4: { dust: 80, gold: 5000 },
  5: { dust: 0,  gold: 0 },  // Ultimate gems craft from essence elsewhere
};

export async function salvageGems(gemId: string, count: number): Promise<{ ok: boolean; dust: number; error?: string }> {
  const gem = GEM_BY_ID[gemId];
  if (!gem) return { ok: false, dust: 0, error: 'Unknown gem' };
  if (gem.tier >= 5) return { ok: false, dust: 0, error: 'Ultimate gems cannot be salvaged' };
  const ok = await removeGemFromInventory(gemId, count);
  if (!ok) return { ok: false, dust: 0, error: 'Not enough gems' };
  const dust = GEM_SALVAGE_YIELD[gem.tier] * count;
  await addMaterial(MAT_GEM_DUST, dust);
  await useItems.getState().refresh();
  return { ok: true, dust };
}

export async function craftGem(stat: 'hp' | 'atk' | 'def' | 'spd' | 'crit', tier: GemTier): Promise<{ ok: boolean; error?: string }> {
  if (tier < 1 || tier > 4) return { ok: false, error: 'Invalid tier' };
  const gemId = `gem_${stat}_${tier}`;
  const gem = GEM_BY_ID[gemId];
  if (!gem) return { ok: false, error: 'Unknown gem' };
  const cost = GEM_CRAFT_COST[tier];
  const dustRow = await db.items.get(MAT_GEM_DUST);
  if ((dustRow?.count ?? 0) < cost.dust) return { ok: false, error: `Need ${cost.dust} Gem Dust (have ${dustRow?.count ?? 0})` };
  if (cost.gold > 0 && useProfile.getState().profile.gold < cost.gold) {
    return { ok: false, error: `Need ${cost.gold.toLocaleString()} gold` };
  }
  await spendMaterial(MAT_GEM_DUST, cost.dust);
  if (cost.gold > 0) await useProfile.getState().spendGold(cost.gold);
  await addGemToInventory(gemId, 1);
  await useItems.getState().refresh();
  return { ok: true };
}

export function maybeRollGem(itemLevel: number, isBoss: boolean): GemDef | null {
  const chance = isBoss ? 0.35 : 0.06 + itemLevel * 0.003;
  if (Math.random() > chance) return null;
  const r = Math.random();
  const tier = (isBoss && r < 0.06) ? 4 : (r < 0.18) ? 3 : (r < 0.50) ? 2 : 1;
  const stats = ['hp', 'atk', 'def', 'spd', 'crit'] as const;
  const stat = stats[Math.floor(Math.random() * stats.length)];
  return GEM_BY_ID[`gem_${stat}_${tier}`];
}

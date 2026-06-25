import { db } from './db';
import type { ShopItem } from '../data/shop';
import { useProfile } from '../store/profile';
import { useHeroes } from '../store/heroes';
import { useItems } from '../store/items';
import { addMaterial } from './crafting';
import { MAT_SOULSHARD, MATERIAL_META } from '../data/ultimateGear';
import { genLoot } from './loot';
import { addFragments } from './fragments';
import { isoWeek } from '../data/tower';

const todayStr = () => new Date().toISOString().slice(0, 10);

// Use items table for tracking purchases: shop_buy_<itemId>_<period> = count
const buyKey = (itemId: string, period: string) => `shop_buy_${itemId}_${period}`;

export async function getBuysToday(itemId: string): Promise<number> {
  const r = await db.items.get(buyKey(itemId, todayStr()));
  return r?.count ?? 0;
}
export async function getBuysThisWeek(itemId: string): Promise<number> {
  const r = await db.items.get(buyKey(itemId, isoWeek()));
  return r?.count ?? 0;
}

async function bumpBuys(itemId: string, daily: boolean, weekly: boolean) {
  if (daily) {
    const k = buyKey(itemId, todayStr());
    const r = await db.items.get(k);
    await db.items.put({ templateId: k, count: (r?.count ?? 0) + 1 });
  }
  if (weekly) {
    const k = buyKey(itemId, isoWeek());
    const r = await db.items.get(k);
    await db.items.put({ templateId: k, count: (r?.count ?? 0) + 1 });
  }
}

export interface BuyResult {
  ok: boolean;
  error?: string;
  granted?: string;
}

export async function buyShopItem(item: ShopItem): Promise<BuyResult> {
  const profile = useProfile.getState().profile;

  // Check limits
  if (item.dailyLimit) {
    const used = await getBuysToday(item.id);
    if (used >= item.dailyLimit) return { ok: false, error: 'Daily limit reached' };
  }
  if (item.weeklyLimit) {
    const used = await getBuysThisWeek(item.id);
    if (used >= item.weeklyLimit) return { ok: false, error: 'Weekly limit reached' };
  }

  // Spend
  const p = useProfile.getState();
  let spent = false;
  if (item.cost.currency === 'gold') spent = await p.spendGold(item.cost.amount);
  else if (item.cost.currency === 'gems') spent = await p.spendGems(item.cost.amount);
  else if (item.cost.currency === 'friendPoints') spent = await p.spendFriendPoints(item.cost.amount);
  else if (item.cost.currency === 'soulshard') {
    const cur = await db.items.get(MAT_SOULSHARD);
    if ((cur?.count ?? 0) >= item.cost.amount) {
      await db.items.put({ templateId: MAT_SOULSHARD, count: (cur?.count ?? 0) - item.cost.amount });
      spent = true;
    }
  }
  if (!spent) return { ok: false, error: 'Not enough ' + item.cost.currency };

  // Grant
  let grantedStr = '';
  switch (item.grant.kind) {
    case 'energy':
      await p.patch({ energy: Math.min(999, profile.energy + item.grant.amount) });
      grantedStr = `+${item.grant.amount} ⚡`;
      break;
    case 'gold':
      await p.addGold(item.grant.amount);
      grantedStr = `+${item.grant.amount} 🪙`;
      break;
    case 'gems':
      await p.addGems(item.grant.amount);
      grantedStr = `+${item.grant.amount} 💎`;
      break;
    case 'friendPoints':
      await p.addFriendPoints(item.grant.amount);
      grantedStr = `+${item.grant.amount} 🤝`;
      break;
    case 'soulshard':
      await addMaterial(MAT_SOULSHARD, item.grant.amount);
      grantedStr = `+${item.grant.amount} 💠`;
      break;
    case 'equipmentCrate': {
      const playerLevel = profile.level;
      const ilvl = Math.max(10, playerLevel * 2);
      for (let i = 0; i < item.grant.count; i++) {
        const loot = genLoot({ itemLevel: ilvl, minRarity: item.grant.minRarity, luckBoost: 0.3 });
        await useHeroes.getState().addEquipment(loot);
      }
      grantedStr = `+${item.grant.count} equipment`;
      break;
    }
    case 'summonTicketStandard': {
      const k = 'ticket_standard';
      const r = await db.items.get(k);
      await db.items.put({ templateId: k, count: (r?.count ?? 0) + item.grant.count });
      grantedStr = `+${item.grant.count} standard ticket`;
      break;
    }
    case 'summonTicketStellar': {
      const k = 'ticket_stellar';
      const r = await db.items.get(k);
      await db.items.put({ templateId: k, count: (r?.count ?? 0) + item.grant.count });
      grantedStr = `+${item.grant.count} stellar ticket`;
      break;
    }
    case 'heroFragment':
      await addFragments(item.grant.heroId, item.grant.count);
      grantedStr = `+${item.grant.count} ${item.grant.heroId} fragments`;
      break;
    case 'forgeMat':
      await addMaterial(item.grant.matId, item.grant.amount);
      grantedStr = `+${item.grant.amount} ${MATERIAL_META[item.grant.matId]?.name ?? item.grant.matId}`;
      break;
  }

  await bumpBuys(item.id, !!item.dailyLimit, !!item.weeklyLimit);
  await useItems.getState().refresh();
  return { ok: true, granted: grantedStr };
}

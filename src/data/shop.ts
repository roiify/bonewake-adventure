// Shop catalog. Items live in the items table when granted; some are equipment crates that
// produce loot when "opened" (handled in ShopPage logic).

export type ShopCurrency = 'gold' | 'gems' | 'friendPoints' | 'soulshard';
export type ShopGrantKind =
  | { kind: 'energy'; amount: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'gems'; amount: number }
  | { kind: 'friendPoints'; amount: number }
  | { kind: 'soulshard'; amount: number }
  | { kind: 'equipmentCrate'; minRarity: 1 | 2 | 3 | 4 | 5; count: number }
  | { kind: 'summonTicketStandard'; count: number }   // free standard pulls
  | { kind: 'summonTicketStellar'; count: number }   // free premium pulls
  | { kind: 'heroFragment'; heroId: string; count: number }
  | { kind: 'forgeMat'; matId: string; amount: number };  // forge crafting mats

export interface ShopItem {
  id: string;
  category: 'currency' | 'materials' | 'tickets' | 'gear' | 'fragments';
  name: string;
  description: string;
  emoji: string;
  cost: { currency: ShopCurrency; amount: number };
  grant: ShopGrantKind;
  // Purchase limits — undefined means unlimited
  dailyLimit?: number;
  weeklyLimit?: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  // Friendship Exchange — the ONLY sink for friendPoints, which otherwise
  // accrued forever with nothing to spend it on (daily sign-in + mail granted
  // it but no item ever cost it). Modest daily-limited conversions into
  // resources that are actually consumed.
  { id: 'fp_gold',   category: 'currency',  name: 'Friendship Coin',  description: 'Trade friend points for +2500 gold.', emoji: '🤝',
    cost: { currency: 'friendPoints', amount: 20 }, grant: { kind: 'gold', amount: 2500 }, dailyLimit: 5 },
  { id: 'fp_energy', category: 'currency',  name: 'Friendship Flask', description: 'Trade friend points for +60 energy.', emoji: '🤝',
    cost: { currency: 'friendPoints', amount: 30 }, grant: { kind: 'energy', amount: 60 }, dailyLimit: 3 },
  { id: 'fp_scrap',  category: 'materials', name: 'Friendship Scrap',  description: 'Trade friend points for +12 Scrap.', emoji: '🤝',
    cost: { currency: 'friendPoints', amount: 25 }, grant: { kind: 'forgeMat', matId: 'mat_scrap', amount: 12 }, dailyLimit: 5 },
  { id: 'fp_shard',  category: 'materials', name: 'Friendship Shards', description: 'Trade friend points for +3 Soulshards.', emoji: '🤝',
    cost: { currency: 'friendPoints', amount: 40 }, grant: { kind: 'soulshard', amount: 3 }, dailyLimit: 2 },

  // Currency conversion
  { id: 'energy_small',  category: 'currency', name: 'Energy Flask',  description: 'Restore 60 energy.', emoji: '⚡',
    cost: { currency: 'gems', amount: 30 }, grant: { kind: 'energy', amount: 60 }, dailyLimit: 5 },
  { id: 'energy_large',  category: 'currency', name: 'Energy Tonic',  description: 'Restore 200 energy.', emoji: '🍶',
    cost: { currency: 'gems', amount: 80 }, grant: { kind: 'energy', amount: 200 }, dailyLimit: 2 },
  { id: 'gold_pile',     category: 'currency', name: 'Pile of Gold',  description: '+5000 gold.', emoji: '💰',
    cost: { currency: 'gems', amount: 50 }, grant: { kind: 'gold', amount: 5000 }, dailyLimit: 3 },

  // Materials — soulshards
  { id: 'shard_small',   category: 'materials', name: 'Soulshard Pouch', description: '+10 Soulshards.', emoji: '💠',
    cost: { currency: 'gems', amount: 100 }, grant: { kind: 'soulshard', amount: 10 }, dailyLimit: 3 },
  { id: 'shard_bulk',    category: 'materials', name: 'Soulshard Chest', description: '+50 Soulshards.', emoji: '🪙',
    cost: { currency: 'gems', amount: 400 }, grant: { kind: 'soulshard', amount: 50 }, weeklyLimit: 2 },

  // Materials — forge mats (Scrap/Dust gold-priced for daily restocks,
  // Shard/Essence gem-priced to keep them rare).
  { id: 'forge_scrap_pack',  category: 'materials', name: 'Scrap Pack',        description: '+20 Scrap.',        emoji: '🔩',
    cost: { currency: 'gold', amount: 3000 }, grant: { kind: 'forgeMat', matId: 'mat_scrap', amount: 20 }, dailyLimit: 5 },
  { id: 'forge_dust_pack',   category: 'materials', name: 'Arcane Dust Pack',  description: '+5 Arcane Dust.',   emoji: '✨',
    cost: { currency: 'gold', amount: 8000 }, grant: { kind: 'forgeMat', matId: 'mat_arcane_dust', amount: 5 }, dailyLimit: 3 },
  { id: 'forge_shard_pack',  category: 'materials', name: 'Relic Shard',       description: '+1 Relic Shard.',   emoji: '🟪',
    cost: { currency: 'gems', amount: 60 },   grant: { kind: 'forgeMat', matId: 'mat_relic_shard', amount: 1 },  dailyLimit: 2 },
  { id: 'forge_essence',     category: 'materials', name: 'Legendary Essence', description: '+1 Legendary Essence.', emoji: '🌟',
    cost: { currency: 'gems', amount: 250 },  grant: { kind: 'forgeMat', matId: 'mat_legendary_essence', amount: 1 }, weeklyLimit: 2 },

  // Tickets + equipment crates removed:
  //   - Friend Pack: friend pulls were dropped in the summon rework
  //   - Standard/Stellar Tickets: direct gold/gem pulls make tickets redundant
  //   - Magic/Rare/Epic Crates: the Equipment Forge supersedes random crates
  //     (player picks slot + rarity, sees the result, controls mat spend)
];

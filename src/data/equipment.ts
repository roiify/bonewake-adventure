import type { EquipmentTemplate } from '../types';

// 15 equipment templates: 5 slots × 3 rarities
export const EQUIPMENT_TEMPLATES: EquipmentTemplate[] = [
  { id: 'sword_3', name: 'Iron Sword', slot: 'weapon', rarity: 3, stats: { atk: 30 }, emoji: '⚔️' },
  { id: 'sword_4', name: 'Steel Saber', slot: 'weapon', rarity: 4, stats: { atk: 80 }, emoji: '🗡️' },
  { id: 'sword_5', name: 'Solar Edge', slot: 'weapon', rarity: 5, stats: { atk: 180, crit: 0.08 }, emoji: '🌅' },

  { id: 'armor_3', name: 'Leather Vest', slot: 'armor', rarity: 3, stats: { hp: 200, def: 15 }, emoji: '🦺' },
  { id: 'armor_4', name: 'Chain Mail', slot: 'armor', rarity: 4, stats: { hp: 500, def: 40 }, emoji: '🛡️' },
  { id: 'armor_5', name: 'Dragon Plate', slot: 'armor', rarity: 5, stats: { hp: 1200, def: 90 }, emoji: '🐉' },

  { id: 'helm_3', name: 'Iron Cap', slot: 'helm', rarity: 3, stats: { hp: 100, def: 10 }, emoji: '⛑️' },
  { id: 'helm_4', name: 'Knight Helm', slot: 'helm', rarity: 4, stats: { hp: 300, def: 25 }, emoji: '🪖' },
  { id: 'helm_5', name: 'Crown of Stars', slot: 'helm', rarity: 5, stats: { hp: 700, def: 60, crit: 0.05 }, emoji: '👑' },

  { id: 'boots_3', name: 'Worn Boots', slot: 'boots', rarity: 3, stats: { spd: 8 }, emoji: '🥾' },
  { id: 'boots_4', name: 'Swift Greaves', slot: 'boots', rarity: 4, stats: { spd: 20, def: 15 }, emoji: '🥾' },
  { id: 'boots_5', name: 'Windstride', slot: 'boots', rarity: 5, stats: { spd: 45, def: 35 }, emoji: '🪶' },

  { id: 'amulet_3', name: 'Bone Charm', slot: 'accessory', rarity: 3, stats: { atk: 15, crit: 0.03 }, emoji: '🦴' },
  { id: 'amulet_4', name: 'Ember Amulet', slot: 'accessory', rarity: 4, stats: { atk: 40, crit: 0.06 }, emoji: '🔮' },
  { id: 'amulet_5', name: 'Heart of Dawn', slot: 'accessory', rarity: 5, stats: { atk: 100, hp: 400, crit: 0.12 }, emoji: '💎' },
];

export const EQUIP_BY_ID = Object.fromEntries(EQUIPMENT_TEMPLATES.map(e => [e.id, e]));

// Daily mystery box. One claim per local day. Random rewards from a weighted table.
import { useProfile } from '../store/profile';
import { addMaterial } from './crafting';
import { MAT_SOULSHARD, MAT_SCRAP, MAT_ARCANE_DUST, MAT_RELIC_SHARD, MATERIAL_META } from '../data/ultimateGear';
import { genLoot } from './loot';
import { useHeroes } from '../store/heroes';
import { addGemToInventory } from './gems';
import { GEMS } from '../data/gems';
import type { ChestReward } from '../components/ChestOpen';

type DropKind = 'gold' | 'gems' | 'friend' | 'soulshard' | 'energy' | 'equipment' | 'gem' | 'forge_mat';

interface Drop {
  kind: DropKind;
  weight: number;
  rollAmount: () => number;
  // For forge_mat drops only: which mat ID gets granted.
  matId?: string;
}

const TABLE: Drop[] = [
  { kind: 'gold',      weight: 28, rollAmount: () => 500 + Math.floor(Math.random() * 1500) },
  { kind: 'gold',      weight: 8,  rollAmount: () => 3000 + Math.floor(Math.random() * 2000) },
  { kind: 'gems',      weight: 22, rollAmount: () => 20 + Math.floor(Math.random() * 30) },
  { kind: 'gems',      weight: 4,  rollAmount: () => 100 + Math.floor(Math.random() * 100) },
  { kind: 'friend',    weight: 8,  rollAmount: () => 10 + Math.floor(Math.random() * 20) },
  { kind: 'soulshard', weight: 8,  rollAmount: () => 3 + Math.floor(Math.random() * 7) },
  { kind: 'energy',    weight: 4,  rollAmount: () => 30 + Math.floor(Math.random() * 50) },
  { kind: 'equipment', weight: 4,  rollAmount: () => 1 },
  { kind: 'gem',       weight: 2,  rollAmount: () => 1 },
  // Forge mats: scrap is common (8), arcane dust uncommon (3),
  // relic shard rare (1). Legendary essence is NOT in mystery box
  // by design — only Legendary salvage / boss kills can grant it.
  { kind: 'forge_mat', weight: 8,  rollAmount: () => 3 + Math.floor(Math.random() * 5), matId: MAT_SCRAP },
  { kind: 'forge_mat', weight: 3,  rollAmount: () => 1 + Math.floor(Math.random() * 2), matId: MAT_ARCANE_DUST },
  { kind: 'forge_mat', weight: 1,  rollAmount: () => 1,                                  matId: MAT_RELIC_SHARD },
];

function pickDrop(): Drop {
  const total = TABLE.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (const d of TABLE) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return TABLE[0];
}

const today = () => new Date().toISOString().slice(0, 10);

export function canClaimMysteryBox(lastClaim: string | undefined): boolean {
  return lastClaim !== today();
}

export async function claimMysteryBox(): Promise<ChestReward[]> {
  const p = useProfile.getState();
  const profile = p.profile;
  if (!canClaimMysteryBox(profile.mysteryBoxLastClaim)) return [];

  // 3 rolls per box
  const rewards: ChestReward[] = [];
  for (let i = 0; i < 3; i++) {
    const d = pickDrop();
    const amount = d.rollAmount();
    switch (d.kind) {
      case 'gold':
        await p.addGold(amount);
        rewards.push({ icon: '🪙', label: `+${amount.toLocaleString()} Gold` });
        break;
      case 'gems':
        await p.addGems(amount);
        rewards.push({ icon: '💎', label: `+${amount} Gems`, color: '#a78bfa' });
        break;
      case 'friend':
        await p.addFriendPoints(amount);
        rewards.push({ icon: '🤝', label: `+${amount} Friend Pts`, color: '#fb7185' });
        break;
      case 'soulshard':
        await addMaterial(MAT_SOULSHARD, amount);
        rewards.push({ icon: '💠', label: `+${amount} Soulshard`, color: '#fb7185' });
        break;
      case 'energy':
        await p.patch({ energy: Math.min(999, profile.energy + amount) });
        rewards.push({ icon: '⚡', label: `+${amount} Energy`, color: '#22d3ee' });
        break;
      case 'equipment': {
        const ilvl = Math.max(5, profile.level * 2);
        const item = genLoot({ itemLevel: ilvl, minRarity: 2, luckBoost: 0.5 });
        await useHeroes.getState().addEquipment(item);
        rewards.push({ icon: '⚔️', label: item.name ?? 'Equipment', color: '#facc15' });
        break;
      }
      case 'gem': {
        const tier = Math.random() < 0.7 ? 1 : Math.random() < 0.8 ? 2 : 3;
        const stats = ['hp', 'atk', 'def', 'spd', 'crit'] as const;
        const stat = stats[Math.floor(Math.random() * stats.length)];
        const gemId = `gem_${stat}_${tier}`;
        const gem = GEMS.find(g => g.id === gemId);
        if (gem) {
          await addGemToInventory(gem.id, 1);
          rewards.push({ icon: gem.emoji, label: gem.name, color: '#a855f7' });
        }
        break;
      }
      case 'forge_mat': {
        if (d.matId) {
          await addMaterial(d.matId, amount);
          const meta = MATERIAL_META[d.matId];
          rewards.push({ icon: meta?.emoji ?? '⚒', label: `+${amount} ${meta?.name ?? d.matId}`, color: '#a78bfa' });
        }
        break;
      }
    }
  }
  await p.patch({ mysteryBoxLastClaim: today() });
  return rewards;
}

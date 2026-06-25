import { useProfile } from '../store/profile';
import { useHeroes } from '../store/heroes';
import { addMaterial } from './crafting';
import { MAT_SOULSHARD } from '../data/ultimateGear';
import { genLoot } from './loot';
import { PASS_TIERS, dayOfSeason, seasonEnded, PASS_XP_PER_WIN, PASS_XP_PER_3STAR, PASS_XP_PER_BOSS, PASS_XP_PER_TOWER } from '../data/missionPass';
import type { PassReward } from '../data/missionPass';

export async function ensurePassSeason() {
  const p = useProfile.getState();
  const profile = p.profile;
  if (!profile.passSeasonStart || seasonEnded(profile.passSeasonStart)) {
    await p.patch({
      passSeasonStart: new Date().toISOString().slice(0, 10),
      passXp: 0,
      passClaimedTiers: [],
    });
  }
}

export async function awardPassXp(amount: number) {
  if (amount <= 0) return;
  const p = useProfile.getState();
  await p.patch({ passXp: (p.profile.passXp ?? 0) + amount });
}

export async function claimPassTier(tier: number): Promise<{ ok: boolean; granted?: PassReward; error?: string }> {
  const p = useProfile.getState();
  const profile = p.profile;
  const t = PASS_TIERS.find(x => x.tier === tier);
  if (!t) return { ok: false, error: 'Unknown tier' };
  if ((profile.passXp ?? 0) < t.xpRequired) return { ok: false, error: 'Not enough Pass XP' };
  if ((profile.passClaimedTiers ?? []).includes(tier)) return { ok: false, error: 'Already claimed' };

  const r = t.reward;
  if (r.gold) await p.addGold(r.gold);
  if (r.gems) await p.addGems(r.gems);
  if (r.friendPoints) await p.addFriendPoints(r.friendPoints);
  if (r.soulshard) await addMaterial(MAT_SOULSHARD, r.soulshard);
  if (r.energy) await p.patch({ energy: Math.min(999, profile.energy + r.energy) });
  if (r.equipmentMinRarity) {
    const ilvl = Math.max(15, profile.level * 2);
    const item = genLoot({ itemLevel: ilvl, minRarity: r.equipmentMinRarity, luckBoost: 0.4 });
    await useHeroes.getState().addEquipment(item);
  }
  await p.patch({ passClaimedTiers: [...(profile.passClaimedTiers ?? []), tier] });
  return { ok: true, granted: r };
}

export function passStatus() {
  const p = useProfile.getState().profile;
  return {
    seasonStart: p.passSeasonStart ?? '',
    day: dayOfSeason(p.passSeasonStart ?? ''),
    xp: p.passXp ?? 0,
    claimed: new Set(p.passClaimedTiers ?? []),
    ended: seasonEnded(p.passSeasonStart ?? ''),
  };
}

export { PASS_XP_PER_WIN, PASS_XP_PER_3STAR, PASS_XP_PER_BOSS, PASS_XP_PER_TOWER };

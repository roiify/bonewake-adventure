import { db } from './db';
import { ACHIEVEMENT_BY_ID, type AchievementDef } from '../data/achievements';
import { getLifetime } from './lifetime';
import { useProfile } from '../store/profile';
import { addMaterial } from './crafting';
import { MAT_SOULSHARD } from '../data/ultimateGear';

// Use the items table to track achievement claim state (templateId = "ach_<id>", count = 1 when claimed)
export const ACH_CLAIM_PREFIX = 'ach_claimed_';

export async function isClaimed(achievementId: string): Promise<boolean> {
  const r = await db.items.get(ACH_CLAIM_PREFIX + achievementId);
  return (r?.count ?? 0) > 0;
}

export function progressFor(def: AchievementDef): number {
  if (def.source === 'computed') return 0;
  const lt = getLifetime();
  return (lt[def.source] as number) ?? 0;
}

export function isComplete(def: AchievementDef): boolean {
  return progressFor(def) >= def.goal;
}

export async function claimAchievement(achievementId: string): Promise<boolean> {
  const def = ACHIEVEMENT_BY_ID[achievementId];
  if (!def) return false;
  if (await isClaimed(achievementId)) return false;
  if (!isComplete(def)) return false;

  // Grant rewards
  const p = useProfile.getState();
  if (def.rewards.gold) await p.addGold(def.rewards.gold);
  if (def.rewards.gems) await p.addGems(def.rewards.gems);
  if (def.rewards.friendPoints) await p.addFriendPoints(def.rewards.friendPoints);
  if (def.rewards.soulshard) await addMaterial(MAT_SOULSHARD, def.rewards.soulshard);

  // Mark claimed
  await db.items.put({ templateId: ACH_CLAIM_PREFIX + achievementId, count: 1 });
  return true;
}

export async function getClaimedIds(): Promise<Set<string>> {
  const rows = await db.items.toArray();
  return new Set(rows.filter(r => r.templateId.startsWith(ACH_CLAIM_PREFIX) && r.count > 0)
    .map(r => r.templateId.slice(ACH_CLAIM_PREFIX.length)));
}

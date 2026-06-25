// Manny solo-summon logic.
//
// Manny's lore: he battles alone, his minions ARE his party. When Manny
// is selected as a squad member, his two summons (Bone King + Lich
// Sovereign) auto-fill the other two slots and other heroes are locked.
//
// The summons aren't pullable from gacha — they're auto-granted as owned
// heroes the first time Manny enters a squad, and they scale with Manny's
// star/level so they're always useful but never dominant.
import type { OwnedHero } from './db';
import { useHeroes } from '../store/heroes';
import { MANNY_SUMMON_IDS } from '../data/heroes';

export const MANNY_TPL = 'manny';

// Find the user's strongest owned Manny (by level then star).
export function findOwnedManny(heroes: OwnedHero[]): OwnedHero | null {
  const mannies = heroes.filter(h => h.templateId === MANNY_TPL);
  if (mannies.length === 0) return null;
  return mannies.sort((a, b) => (b.level - a.level) || (b.star - a.star))[0];
}

// Ensure both summons exist as owned heroes, scaled to match Manny.
// Returns the summon hero IDs in display order [bone_king, lich_sovereign].
// Stats scale with Manny so they're useful but not OP — at the same
// star/level as Manny, their base power lands roughly equal to a
// mid-tier hero, not a top-tier one.
export async function ensureMannySummons(): Promise<string[]> {
  const store = useHeroes.getState();
  const manny = findOwnedManny(store.heroes);
  if (!manny) return [];

  const out: string[] = [];
  for (const tplId of MANNY_SUMMON_IDS) {
    const existing = store.heroes.find(h => h.templateId === tplId);
    if (existing) {
      // Re-sync star/level with Manny if Manny has grown.
      if (existing.level < manny.level || existing.star < manny.star) {
        await store.updateHero(existing.id, { level: manny.level, star: manny.star });
      }
      out.push(existing.id);
    } else {
      // Auto-grant a fresh summon hero matched to Manny's current state.
      const id = `summon-${tplId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newHero: OwnedHero = {
        id,
        templateId: tplId,
        level: manny.level,
        exp: 0,
        star: manny.star,
        equipped: {},
        obtainedAt: Date.now(),
      };
      await store.addHero(newHero);
      out.push(id);
    }
  }
  return out;
}

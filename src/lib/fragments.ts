import { db } from './db';
import type { Rarity } from '../types';

export const fragmentItemId = (heroTemplateId: string) => `frag_${heroTemplateId}`;

// How many fragments a duplicate is worth.
// Steeper-grind rebalance: dupes still pay out but the per-promotion cost
// climbed a lot more, so each pull contributes less of a promotion fraction.
export const DUP_FRAGMENT_VALUE: Record<Rarity, number> = {
  3: 10,
  4: 35,
  5: 100,
};

// Fragments required to advance a hero from N stars to N+1 stars.
// Pre-rebalance: 20 / 50 / 200 (3★→4★→5★→6★). New curve roughly doubles
// the front gates and quadruples the SSS+ wall — so taking ONE hero from S
// to SSS+ now costs ~770 fragments instead of ~270, turning star-up into a
// real long-term project per hero rather than a one-week sprint.
export const STAR_UP_COST: Record<number, number> = {
  3: 40,    // 3★ → 4★ (S → SS) — was 20
  4: 120,   // 4★ → 5★ (SS → SSS) — was 50
  5: 600,   // 5★ → 6★ (SSS+ endgame) — was 200
};

export const MAX_STAR = 6;

export async function addFragments(heroTemplateId: string, count: number) {
  const id = fragmentItemId(heroTemplateId);
  const existing = await db.items.get(id);
  if (existing) {
    await db.items.put({ templateId: id, count: existing.count + count });
  } else {
    await db.items.put({ templateId: id, count });
  }
}

export async function consumeFragments(heroTemplateId: string, count: number): Promise<boolean> {
  const id = fragmentItemId(heroTemplateId);
  const existing = await db.items.get(id);
  if (!existing || existing.count < count) return false;
  await db.items.put({ templateId: id, count: existing.count - count });
  return true;
}

export async function getFragmentCount(heroTemplateId: string): Promise<number> {
  const existing = await db.items.get(fragmentItemId(heroTemplateId));
  return existing?.count ?? 0;
}

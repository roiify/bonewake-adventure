// Gacha jackpot: a 5★ (SSS) pull should favor RARE heroes (low pullWeight),
// not the common-favored distribution that made an "SSS" most likely your
// most generic unit.
import { describe, it, expect } from 'vitest';
import seedrandom from 'seedrandom';
import { pullOnce } from './summon';
import { HERO_TEMPLATES, HIDDEN_HERO_IDS } from '../data/heroes';

describe('gacha jackpot couples star tier to desirability', () => {
  it('5★ pulls skew toward low-pullWeight (rare) heroes', () => {
    const pool = HERO_TEMPLATES.filter(h => !HIDDEN_HERO_IDS.has(h.id));
    const avgWeight = pool.reduce((s, h) => s + (h.pullWeight ?? 10), 0) / pool.length;
    const rng = seedrandom('jackpot');
    // Force SSS via a huge pity counter on the premium banner each pull.
    let sumWeight = 0, n = 0;
    for (let i = 0; i < 400; i++) {
      const r = pullOnce('premium', 999, rng);
      if (r.star === 5) { sumWeight += (r.hero.pullWeight ?? 10); n++; }
    }
    expect(n).toBeGreaterThan(300);
    // Mean pullWeight of SSS results should be well below the flat pool average.
    expect(sumWeight / n).toBeLessThan(avgWeight);
  });
});

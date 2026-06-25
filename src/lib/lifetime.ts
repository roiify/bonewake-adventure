import { useProfile } from '../store/profile';
import type { LifetimeStats } from './db';
import { DEFAULT_LIFETIME } from './db';
import { earnedTitles, TITLE_BY_ID } from '../data/titles';
import { sendMail } from './mail';

const TITLE_SEEN_KEY = 'bonewake_title_seen_v1';
function loadSeenTitles(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(TITLE_SEEN_KEY) ?? '[]')); }
  catch { return new Set(); }
}
function saveSeenTitles(s: Set<string>) {
  try { localStorage.setItem(TITLE_SEEN_KEY, JSON.stringify([...s])); } catch {}
}

// Persistent counters. Any in-game event that should contribute toward achievements
// or long-term tracking funnels through here.
export type LifetimeEvent =
  | { kind: 'battleWon' }
  | { kind: 'battleLost' }
  | { kind: 'stageCleared'; stars: number }
  | { kind: 'summon'; landedSSS: boolean }
  | { kind: 'mythicCrafted' }
  | { kind: 'legendaryDropped' }
  | { kind: 'goldEarned'; amount: number }
  | { kind: 'towerFloor'; floor: number };

export async function recordEvent(event: LifetimeEvent) {
  const profile = useProfile.getState().profile;
  const cur: LifetimeStats = { ...DEFAULT_LIFETIME, ...(profile.lifetime ?? {}) };
  switch (event.kind) {
    case 'battleWon': cur.battlesWon += 1; break;
    case 'battleLost': cur.battlesLost += 1; break;
    case 'stageCleared':
      cur.stagesCleared += 1;
      if (event.stars >= 3) cur.threeStarClears += 1;
      break;
    case 'summon':
      cur.summons += 1;
      if (event.landedSSS) cur.ssspulls += 1;
      break;
    case 'mythicCrafted': cur.mythicsCrafted += 1; break;
    case 'legendaryDropped': cur.legendariesDropped += 1; break;
    case 'goldEarned': cur.goldEarned += event.amount; break;
    case 'towerFloor':
      if (event.floor > cur.towerMaxFloor) cur.towerMaxFloor = event.floor;
      break;
  }
  await useProfile.getState().patch({ lifetime: cur });
  // Title unlock notifications — diff earnedTitles before/after.
  try {
    const earnedNow = new Set(earnedTitles(cur));
    const seen = loadSeenTitles();
    const newly = [...earnedNow].filter(id => !seen.has(id));
    if (newly.length > 0) {
      for (const id of newly) {
        const def = TITLE_BY_ID[id];
        if (!def) continue;
        await sendMail({
          subject: `🏆 Title earned: ${def.label}`,
          body: `Congratulations! You unlocked the "${def.label}" title.\n\n${def.description}\n\nEquip it from your Profile page.`,
          rewards: { gold: 500, gems: 10 },
        });
        seen.add(id);
      }
      saveSeenTitles(seen);
      // Auto-equip first earned title if user has none active yet
      const p = useProfile.getState().profile;
      if (!p.activeTitle && newly.length > 0) {
        await useProfile.getState().patch({ activeTitle: newly[0] });
      }
    }
  } catch (e) {
    console.warn('title-earned check failed', e);
  }
}

export function getLifetime(): LifetimeStats {
  const p = useProfile.getState().profile;
  return { ...DEFAULT_LIFETIME, ...(p.lifetime ?? {}) };
}

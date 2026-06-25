import { db } from './db';
import { TASK_BY_ID } from '../data/tasks';
import { useProfile } from '../store/profile';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function incrementTask(taskId: string, by = 1) {
  const def = TASK_BY_ID[taskId];
  if (!def) return;
  const cycle = today();
  const existing = await db.tasks.get(taskId);
  if (!existing || existing.cycleStart !== cycle) {
    await db.tasks.put({ taskId, progress: Math.min(def.goal, by), claimed: false, cycleStart: cycle });
    return;
  }
  if (existing.claimed) return;
  await db.tasks.put({
    ...existing,
    progress: Math.min(def.goal, existing.progress + by),
  });
}

export async function claimTask(taskId: string): Promise<boolean> {
  const def = TASK_BY_ID[taskId];
  if (!def) return false;
  const existing = await db.tasks.get(taskId);
  if (!existing || existing.cycleStart !== today()) return false;
  if (existing.progress < def.goal) return false;
  if (existing.claimed) return false;
  await db.tasks.put({ ...existing, claimed: true });
  const p = useProfile.getState();
  if (def.rewards.gold) await p.addGold(def.rewards.gold);
  if (def.rewards.gems) await p.addGems(def.rewards.gems);
  if (def.rewards.friendPoints) await p.addFriendPoints(def.rewards.friendPoints);
  return true;
}

export async function getTaskList() {
  const cycle = today();
  const stored = await db.tasks.toArray();
  return TASK_BY_ID && Object.values(TASK_BY_ID).map(def => {
    const t = stored.find(s => s.taskId === def.id && s.cycleStart === cycle);
    return {
      def,
      progress: t?.progress ?? 0,
      claimed: t?.claimed ?? false,
    };
  });
}

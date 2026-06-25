import { db, type BattleLogEntry } from './db';

const MAX_LOGS = 50;

export async function logBattle(entry: Omit<BattleLogEntry, 'id' | 'finishedAt'>) {
  await db.battleLogs.add({ ...entry, finishedAt: Date.now() });
  // prune to keep only the latest MAX_LOGS
  const all = await db.battleLogs.toArray();
  if (all.length > MAX_LOGS) {
    const excess = all.sort((a, b) => a.finishedAt - b.finishedAt).slice(0, all.length - MAX_LOGS);
    for (const e of excess) if (e.id != null) await db.battleLogs.delete(e.id);
  }
}

export async function recentBattles(limit = 20): Promise<BattleLogEntry[]> {
  const all = await db.battleLogs.toArray();
  return all.sort((a, b) => b.finishedAt - a.finishedAt).slice(0, limit);
}

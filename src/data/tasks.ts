export interface TaskDef {
  id: string;
  name: string;
  goal: number;
  rewards: { gold?: number; gems?: number; friendPoints?: number };
  cycle: 'daily';
}

export const TASKS: TaskDef[] = [
  { id: 'daily_battles', name: 'Win 3 battles', goal: 3, rewards: { gems: 30 }, cycle: 'daily' },
  { id: 'daily_summon', name: 'Summon 1 hero', goal: 1, rewards: { gold: 200 }, cycle: 'daily' },
  { id: 'daily_levelup', name: 'Level up any hero', goal: 1, rewards: { gold: 150 }, cycle: 'daily' },
  { id: 'daily_threestar', name: 'Clear a stage 3-star', goal: 1, rewards: { gems: 20 }, cycle: 'daily' },
];

export const TASK_BY_ID = Object.fromEntries(TASKS.map(t => [t.id, t]));

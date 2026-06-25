// Cosmetic title definitions. Earned by hitting lifetime stat milestones.
import type { LifetimeStats } from '../lib/db';

export interface TitleDef {
  id: string;
  label: string;
  description: string;
  requirement: { source: keyof LifetimeStats; goal: number };
  color: string;
}

export const TITLES: TitleDef[] = [
  { id: 'novice',          label: 'Novice',          description: 'Win 1 battle',           requirement: { source: 'battlesWon',       goal: 1 },     color: '#a3a3a3' },
  { id: 'fighter',         label: 'Fighter',         description: 'Win 100 battles',        requirement: { source: 'battlesWon',       goal: 100 },   color: '#fbbf24' },
  { id: 'mythic_slayer',   label: 'Mythic Slayer',   description: 'Win 1,000 battles',      requirement: { source: 'battlesWon',       goal: 1000 },  color: '#f97316' },
  { id: 'collector',       label: 'Collector',       description: 'Summon 50 times',        requirement: { source: 'summons',          goal: 50 },    color: '#a855f7' },
  { id: 'whale',           label: 'Whale',           description: 'Summon 200 times',       requirement: { source: 'summons',          goal: 200 },   color: '#3b82f6' },
  { id: 'lucky_star',      label: 'Lucky Star',      description: 'Pull a SSS hero',        requirement: { source: 'ssspulls',         goal: 1 },     color: '#facc15' },
  { id: 'fated_one',       label: 'Fated One',       description: 'Pull 5 SSS heroes',      requirement: { source: 'ssspulls',         goal: 5 },     color: '#fb7185' },
  { id: 'perfectionist',   label: 'Perfectionist',   description: '3-star clear 15 stages', requirement: { source: 'threeStarClears',  goal: 15 },    color: '#22c55e' },
  { id: 'forge_master',    label: 'Forge Master',    description: 'Craft 15 Mythic pieces', requirement: { source: 'mythicsCrafted',   goal: 15 },    color: '#ec4899' },
  { id: 'climber',         label: 'Climber',         description: 'Reach Tower floor 25',   requirement: { source: 'towerMaxFloor',    goal: 25 },    color: '#06b6d4' },
  { id: 'apex',            label: 'Apex',            description: 'Reach Tower floor 100',  requirement: { source: 'towerMaxFloor',    goal: 100 },   color: '#fde047' },
  { id: 'tycoon',          label: 'Tycoon',          description: 'Earn 1,000,000 gold',    requirement: { source: 'goldEarned',       goal: 1_000_000 }, color: '#fbbf24' },
];

export const TITLE_BY_ID = Object.fromEntries(TITLES.map(t => [t.id, t]));

export function earnedTitles(lifetime: LifetimeStats): string[] {
  return TITLES.filter(t => (lifetime[t.requirement.source] as number) >= t.requirement.goal).map(t => t.id);
}

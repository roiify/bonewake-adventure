// Achievement definitions. Progress reads from lifetime stats or other live state.
import type { LifetimeStats } from '../lib/db';

export type AchievementCat = 'combat' | 'summon' | 'craft' | 'tower' | 'progression';

export interface AchievementDef {
  id: string;
  category: AchievementCat;
  name: string;
  description: string;
  goal: number;
  // What field to read from lifetime stats — or 'computed' if it's checked another way
  source: keyof LifetimeStats | 'computed';
  rewards: { gold?: number; gems?: number; soulshard?: number; friendPoints?: number };
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Combat
  { id: 'win_10',  category: 'combat', name: 'First Blood',     description: 'Win 10 battles',        goal: 10,   source: 'battlesWon',   rewards: { gold: 500 },              emoji: '⚔️' },
  { id: 'win_50',  category: 'combat', name: 'Veteran',         description: 'Win 50 battles',        goal: 50,   source: 'battlesWon',   rewards: { gold: 2000, gems: 30 },   emoji: '🛡️' },
  { id: 'win_200', category: 'combat', name: 'War Machine',     description: 'Win 200 battles',       goal: 200,  source: 'battlesWon',   rewards: { gems: 100, soulshard: 10 }, emoji: '💀' },
  { id: 'win_1000',category: 'combat', name: 'Mythic Slayer',   description: 'Win 1,000 battles',     goal: 1000, source: 'battlesWon',   rewards: { gems: 500, soulshard: 50 },  emoji: '👑' },
  { id: '3star_5', category: 'combat', name: 'Perfectionist',   description: '3-star clear 5 stages', goal: 5,    source: 'threeStarClears', rewards: { gems: 50 },            emoji: '⭐' },
  { id: '3star_15',category: 'combat', name: 'Flawless',        description: '3-star clear 15 stages',goal: 15,   source: 'threeStarClears', rewards: { gems: 150, soulshard: 15 }, emoji: '🌟' },
  { id: 'stages_30',category:'progression',name: 'Story Master',description: 'Clear 30 stages',       goal: 30,   source: 'stagesCleared', rewards: { gems: 100 },               emoji: '📖' },

  // Summon
  { id: 'pull_10',  category: 'summon', name: 'Wishful',        description: 'Summon 10 times',       goal: 10,   source: 'summons',      rewards: { friendPoints: 20 },        emoji: '✨' },
  { id: 'pull_50',  category: 'summon', name: 'Devotee',        description: 'Summon 50 times',       goal: 50,   source: 'summons',      rewards: { gems: 50 },                emoji: '🌠' },
  { id: 'pull_200', category: 'summon', name: 'Whale',          description: 'Summon 200 times',      goal: 200,  source: 'summons',      rewards: { gems: 200, soulshard: 20 },emoji: '🐳' },
  { id: 'sss_1',    category: 'summon', name: 'Three Stars',    description: 'Pull your first SSS',   goal: 1,    source: 'ssspulls',     rewards: { gems: 100 },               emoji: '💎' },
  { id: 'sss_5',    category: 'summon', name: 'Lucky',          description: 'Pull 5 SSS heroes',     goal: 5,    source: 'ssspulls',     rewards: { gems: 250, soulshard: 30 },emoji: '🌌' },

  // Craft
  { id: 'mythic_1', category: 'craft',  name: 'Smith',          description: 'Craft your first Mythic', goal: 1,   source: 'mythicsCrafted', rewards: { soulshard: 50 },         emoji: '⚒️' },
  { id: 'mythic_5', category: 'craft',  name: 'Armorer',        description: 'Craft 5 Mythic pieces',  goal: 5,    source: 'mythicsCrafted', rewards: { gems: 200, soulshard: 100 }, emoji: '🔨' },
  { id: 'mythic_15',category: 'craft',  name: 'Forge Master',   description: 'Craft 15 Mythic pieces (3 sets)', goal: 15, source: 'mythicsCrafted', rewards: { gems: 1000, soulshard: 500 }, emoji: '⚡' },
  { id: 'leg_5',    category: 'craft',  name: 'Treasure Hunter',description: 'Find 5 Legendary drops', goal: 5,    source: 'legendariesDropped', rewards: { gems: 100 },         emoji: '🪙' },
  { id: 'leg_25',   category: 'craft',  name: 'Hoarder',        description: 'Find 25 Legendaries',   goal: 25,   source: 'legendariesDropped', rewards: { gems: 500, soulshard: 100 }, emoji: '🏆' },

  // Tower
  { id: 'tower_5',   category: 'tower', name: 'Stepping Up',    description: 'Reach Tower floor 5',   goal: 5,    source: 'towerMaxFloor', rewards: { gems: 50 },                emoji: '🪜' },
  { id: 'tower_25',  category: 'tower', name: 'Climber',        description: 'Reach Tower floor 25',  goal: 25,   source: 'towerMaxFloor', rewards: { gems: 200, soulshard: 30 }, emoji: '🗼' },
  { id: 'tower_50',  category: 'tower', name: 'Skywalker',      description: 'Reach Tower floor 50',  goal: 50,   source: 'towerMaxFloor', rewards: { gems: 500, soulshard: 100 },emoji: '☁️' },
  { id: 'tower_100', category: 'tower', name: 'Apex',           description: 'Reach Tower floor 100', goal: 100,  source: 'towerMaxFloor', rewards: { gems: 2000, soulshard: 500 }, emoji: '🌌' },

  // Progression
  { id: 'gold_10k',  category: 'progression', name: 'Saver',    description: 'Earn 10,000 gold',      goal: 10000, source: 'goldEarned',   rewards: { gold: 1000 },              emoji: '💰' },
  { id: 'gold_100k', category: 'progression', name: 'Tycoon',   description: 'Earn 100,000 gold',     goal: 100000,source: 'goldEarned',   rewards: { gems: 100 },               emoji: '🏦' },
  { id: 'gold_1m',   category: 'progression', name: 'Magnate',  description: 'Earn 1,000,000 gold',   goal: 1000000,source: 'goldEarned',  rewards: { gems: 500, soulshard: 50 },emoji: '💎' },
];

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

export const CATEGORY_LABEL: Record<AchievementCat, string> = {
  combat: 'Combat',
  summon: 'Summons',
  craft: 'Crafting',
  tower: 'Tower',
  progression: 'Progression',
};

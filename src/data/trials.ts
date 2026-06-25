// Hero Trial themed challenges — restricted-squad runs with bonus rewards.
// Each trial has restrictions (element, archetype, solo, no-gear) and a
// scaling enemy team. Daily limit on rewards per trial.
import type { Element, Archetype } from '../types';
import { buildEnemyUnit } from '../lib/stats';
import type { CombatUnit } from '../types';

export interface TrialDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
  energyCost: number;
  // Squad restrictions
  restrict: {
    elementsAllowed?: Element[];
    archetypesAllowed?: Archetype[];
    maxSquadSize?: number;     // e.g. 1 for solo
    noEquipment?: boolean;
  };
  enemyTeam: { templateId: string; level: number; star: number }[];
  rewards: { gold: number; gems: number; soulshard?: number };
  dailyLimit: number;
}

// Trial difficulty rebalanced: trials sit at *higher* power than the
// equivalent chapter floor so even a fully-geared squad can lose.
// Levels are picked above current end-game chapter so the existing player
// stats can't trivialize them. Rewards scale with the new difficulty.
export const TRIALS: TrialDef[] = [
  {
    id: 'light_brigade',
    name: 'Light Brigade',
    description: 'Only Light-element heroes allowed. Bring the dawn.',
    emoji: '☀️',
    energyCost: 30,
    restrict: { elementsAllowed: ['light'] },
    enemyTeam: [
      { templateId: 'graveyardlich', level: 165, star: 5 },
      { templateId: 'necromancer', level: 170, star: 6 },
      { templateId: 'graveyardlich', level: 165, star: 5 },
    ],
    rewards: { gold: 18000, gems: 400, soulshard: 40 },
    dailyLimit: 1,
  },
  {
    id: 'shadow_pact',
    name: 'Shadow Pact',
    description: 'Only Dark-element heroes. Trade light for power.',
    emoji: '🌒',
    energyCost: 30,
    restrict: { elementsAllowed: ['dark'] },
    enemyTeam: [
      { templateId: 'phantom_knight', level: 165, star: 5 },
      { templateId: 'fallen_captain', level: 170, star: 6 },
      { templateId: 'phantom_knight', level: 165, star: 5 },
    ],
    rewards: { gold: 18000, gems: 400, soulshard: 40 },
    dailyLimit: 1,
  },
  {
    id: 'solo_duel',
    name: 'Solo Duel',
    description: 'A single hero must conquer alone.',
    emoji: '⚔️',
    energyCost: 40,
    restrict: { maxSquadSize: 1 },
    enemyTeam: [
      { templateId: 'soul_leech', level: 180, star: 6 },
      { templateId: 'fallen_captain', level: 175, star: 5 },
    ],
    rewards: { gold: 28000, gems: 700, soulshard: 70 },
    dailyLimit: 1,
  },
  {
    id: 'bare_hands',
    name: 'Bare Hands',
    description: 'No equipment may be worn. Skill alone.',
    emoji: '✋',
    energyCost: 35,
    restrict: { noEquipment: true },
    enemyTeam: [
      { templateId: 'boneknight', level: 175, star: 5 },
      { templateId: 'graveyardlich', level: 175, star: 5 },
      { templateId: 'fallen_captain', level: 180, star: 6 },
    ],
    rewards: { gold: 25000, gems: 600, soulshard: 60 },
    dailyLimit: 1,
  },
  {
    id: 'monk_circle',
    name: 'Monk Circle',
    description: 'Only Warrior-archetype heroes. Fists and fury.',
    emoji: '🥋',
    energyCost: 30,
    restrict: { archetypesAllowed: ['warrior'] },
    enemyTeam: [
      { templateId: 'phantom_knight', level: 165, star: 5 },
      { templateId: 'fallen_captain', level: 170, star: 6 },
      { templateId: 'zombie_berserker', level: 165, star: 5 },
    ],
    rewards: { gold: 16000, gems: 350, soulshard: 35 },
    dailyLimit: 1,
  },
];

export const TRIAL_BY_ID = Object.fromEntries(TRIALS.map(t => [t.id, t]));

export function buildTrialEnemyTeam(def: TrialDef): CombatUnit[] {
  return def.enemyTeam.map((e, i) => buildEnemyUnit(e.templateId, e.level, e.star, `trial_${i}`));
}

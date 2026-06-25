// Hero-specific passive talents. Each hero has 9 unique nodes across 3 branches.
import type { LootStat } from './loot';

export type TalentBranch = 'might' | 'finesse' | 'endurance';

export interface TalentNode {
  id: string;            // globally unique: "<heroId>_<branch>_<rank>"
  heroId: string;
  branch: TalentBranch;
  rank: 1 | 2 | 3;
  name: string;
  description: string;
  cost: number;
  bonus: Partial<Record<LootStat, number>>;
}

// Helper to build a hero's 9 nodes
type N = { name: string; description: string; bonus: Partial<Record<LootStat, number>> };
function mk(heroId: string, branch: TalentBranch, rank: 1|2|3, n: N): TalentNode {
  // Cost curve: 1pt → 2pt → 2pt (was 1/2/3).
  // Slightly cheaper rank-3 so deep specialization is reachable without
  // requiring level 28 to max one hero, but rank-2/3 still gate properly.
  const cost = rank === 1 ? 1 : 2;
  return {
    id: `${heroId}_${branch}_${rank}`,
    heroId, branch, rank,
    cost,
    ...n,
  };
}

export const TALENT_TREE: TalentNode[] = [
  // ============ LUNA — Priestess / Healer ============
  mk('luna', 'might', 1, { name: 'Burning Light',  description: '+25 ATK · dawn cuts through',          bonus: { atk: 25 } }),
  mk('luna', 'might', 2, { name: 'Searing Word',   description: '+60 ATK · words of fire',              bonus: { atk: 60 } }),
  mk('luna', 'might', 3, { name: 'Sunlance',       description: '+140 ATK · +6% CRIT',                  bonus: { atk: 140, crit: 0.06 } }),
  mk('luna', 'finesse', 1, { name: 'Steady Hand',  description: '+8 SPD · steady chant',                bonus: { spd: 8 } }),
  mk('luna', 'finesse', 2, { name: 'Holy Rhythm',  description: '+18 SPD · +30 ATK',                    bonus: { spd: 18, atk: 30 } }),
  mk('luna', 'finesse', 3, { name: 'Dance of Dawn',description: '+35 SPD · +8% CRIT',                   bonus: { spd: 35, crit: 0.08 } }),
  mk('luna', 'endurance', 1, { name: 'Inner Light',description: '+300 HP · light shields her',         bonus: { hp: 300 } }),
  mk('luna', 'endurance', 2, { name: 'Sanctuary',   description: '+50 DEF · cannot be moved',          bonus: { def: 50 } }),
  mk('luna', 'endurance', 3, { name: 'Beacon',     description: '+1200 HP · +80 DEF',                   bonus: { hp: 1200, def: 80 } }),

  // ============ AELIA — Frost Mage ============
  mk('aelia', 'might', 1, { name: 'Frostbite',     description: '+35 ATK · stings the lungs',           bonus: { atk: 35 } }),
  mk('aelia', 'might', 2, { name: 'Crystal Surge', description: '+80 ATK · crystals pulse',             bonus: { atk: 80 } }),
  mk('aelia', 'might', 3, { name: 'Glacial Crown', description: '+180 ATK · +10% CRIT',                 bonus: { atk: 180, crit: 0.10 } }),
  mk('aelia', 'finesse', 1, { name: 'Quick Cast',  description: '+10 SPD',                               bonus: { spd: 10 } }),
  mk('aelia', 'finesse', 2, { name: 'Snowfoot',    description: '+20 SPD · +5% CRIT',                   bonus: { spd: 20, crit: 0.05 } }),
  mk('aelia', 'finesse', 3, { name: 'Winter Step', description: '+40 SPD · +12% CRIT',                  bonus: { spd: 40, crit: 0.12 } }),
  mk('aelia', 'endurance', 1, { name: 'Frost Ward',description: '+250 HP',                              bonus: { hp: 250 } }),
  mk('aelia', 'endurance', 2, { name: 'Ice Mantle',description: '+40 DEF · +200 HP',                    bonus: { def: 40, hp: 200 } }),
  mk('aelia', 'endurance', 3, { name: 'Permafrost',description: '+1000 HP · +70 DEF',                   bonus: { hp: 1000, def: 70 } }),

  // ============ KAIUS — Holy Paladin / Tank ============
  mk('kaius', 'might', 1, { name: 'Holy Edge',     description: '+20 ATK',                              bonus: { atk: 20 } }),
  mk('kaius', 'might', 2, { name: 'Judgement',     description: '+50 ATK · +30 DEF',                    bonus: { atk: 50, def: 30 } }),
  mk('kaius', 'might', 3, { name: 'Wrath of Cross',description: '+120 ATK · +60 DEF',                   bonus: { atk: 120, def: 60 } }),
  mk('kaius', 'finesse', 1, { name: 'Square Stance',description: '+6 SPD · +20 DEF',                    bonus: { spd: 6, def: 20 } }),
  mk('kaius', 'finesse', 2, { name: 'Discipline',  description: '+15 SPD · +5% CRIT',                   bonus: { spd: 15, crit: 0.05 } }),
  mk('kaius', 'finesse', 3, { name: 'Saint\'s Tempo',description: '+30 SPD · +8% CRIT',                 bonus: { spd: 30, crit: 0.08 } }),
  mk('kaius', 'endurance', 1, { name: 'Iron Will', description: '+600 HP',                              bonus: { hp: 600 } }),
  mk('kaius', 'endurance', 2, { name: 'Shield Wall',description: '+100 DEF · +500 HP',                  bonus: { def: 100, hp: 500 } }),
  mk('kaius', 'endurance', 3, { name: 'Unyielding',description: '+2500 HP · +150 DEF',                  bonus: { hp: 2500, def: 150 } }),

  // ============ ELARA — Elven Archer ============
  mk('elara', 'might', 1, { name: 'Sharpened Tips', description: '+30 ATK',                             bonus: { atk: 30 } }),
  mk('elara', 'might', 2, { name: 'Killing Stroke',description: '+70 ATK · +6% CRIT',                   bonus: { atk: 70, crit: 0.06 } }),
  mk('elara', 'might', 3, { name: 'One Shot',      description: '+150 ATK · +12% CRIT',                 bonus: { atk: 150, crit: 0.12 } }),
  mk('elara', 'finesse', 1, { name: 'Quickdraw',    description: '+15 SPD',                              bonus: { spd: 15 } }),
  mk('elara', 'finesse', 2, { name: 'Treadlight',   description: '+30 SPD · +6% CRIT',                  bonus: { spd: 30, crit: 0.06 } }),
  mk('elara', 'finesse', 3, { name: 'Wind\'s Eye',  description: '+50 SPD · +10% CRIT',                 bonus: { spd: 50, crit: 0.10 } }),
  mk('elara', 'endurance', 1, { name: 'Hunter\'s Cloak',description: '+200 HP',                          bonus: { hp: 200 } }),
  mk('elara', 'endurance', 2, { name: 'Forest Born',description: '+30 DEF · +250 HP',                   bonus: { def: 30, hp: 250 } }),
  mk('elara', 'endurance', 3, { name: 'Untouchable',description: '+800 HP · +40 SPD',                   bonus: { hp: 800, spd: 40 } }),

  // ============ KENGO — Monk / Warrior ============
  mk('kengo', 'might', 1, { name: 'Iron Knuckle',  description: '+30 ATK',                              bonus: { atk: 30 } }),
  mk('kengo', 'might', 2, { name: 'Mountain Strike',description: '+70 ATK · +40 DEF',                   bonus: { atk: 70, def: 40 } }),
  mk('kengo', 'might', 3, { name: 'Earth Shatter', description: '+160 ATK · +500 HP',                   bonus: { atk: 160, hp: 500 } }),
  mk('kengo', 'finesse', 1, { name: 'Breath Control',description: '+8 SPD · +200 HP',                   bonus: { spd: 8, hp: 200 } }),
  mk('kengo', 'finesse', 2, { name: 'Stance Shift',description: '+18 SPD · +40 ATK',                    bonus: { spd: 18, atk: 40 } }),
  mk('kengo', 'finesse', 3, { name: 'Flow State',  description: '+35 SPD · +6% CRIT',                   bonus: { spd: 35, crit: 0.06 } }),
  mk('kengo', 'endurance', 1, { name: 'Stone Body',description: '+500 HP',                              bonus: { hp: 500 } }),
  mk('kengo', 'endurance', 2, { name: 'Calloused',  description: '+70 DEF · +400 HP',                   bonus: { def: 70, hp: 400 } }),
  mk('kengo', 'endurance', 3, { name: 'Mountain Heart',description: '+1800 HP · +100 DEF',              bonus: { hp: 1800, def: 100 } }),

  // ============ LEN — Shadow Assassin ============
  mk('len', 'might', 1, { name: 'Twin Edges',      description: '+40 ATK',                              bonus: { atk: 40 } }),
  mk('len', 'might', 2, { name: 'Backstab',        description: '+90 ATK · +8% CRIT',                   bonus: { atk: 90, crit: 0.08 } }),
  mk('len', 'might', 3, { name: 'Reaper',          description: '+200 ATK · +15% CRIT',                 bonus: { atk: 200, crit: 0.15 } }),
  mk('len', 'finesse', 1, { name: 'Shadow Step',    description: '+18 SPD',                              bonus: { spd: 18 } }),
  mk('len', 'finesse', 2, { name: 'Whisper Walk',  description: '+35 SPD · +6% CRIT',                   bonus: { spd: 35, crit: 0.06 } }),
  mk('len', 'finesse', 3, { name: 'Eclipse',       description: '+55 SPD · +12% CRIT',                  bonus: { spd: 55, crit: 0.12 } }),
  mk('len', 'endurance', 1, { name: 'Smoke Cloak', description: '+150 HP · +10 SPD',                    bonus: { hp: 150, spd: 10 } }),
  mk('len', 'endurance', 2, { name: 'Vanish',       description: '+25 DEF · +250 HP',                   bonus: { def: 25, hp: 250 } }),
  mk('len', 'endurance', 3, { name: 'No Witnesses',description: '+600 HP · +25 SPD',                    bonus: { hp: 600, spd: 25 } }),

  // ============ PYRA — Pyromancer ============
  mk('pyra', 'might', 1, { name: 'Spark',           description: '+35 ATK · embers gather',              bonus: { atk: 35 } }),
  mk('pyra', 'might', 2, { name: 'Wildfire',        description: '+85 ATK · +8% CRIT',                   bonus: { atk: 85, crit: 0.08 } }),
  mk('pyra', 'might', 3, { name: 'Conflagration',   description: '+180 ATK · +12% CRIT',                 bonus: { atk: 180, crit: 0.12 } }),
  mk('pyra', 'finesse', 1, { name: 'Ember Pulse',   description: '+12 SPD',                              bonus: { spd: 12 } }),
  mk('pyra', 'finesse', 2, { name: 'Heat Mirage',   description: '+25 SPD · +6% CRIT',                   bonus: { spd: 25, crit: 0.06 } }),
  mk('pyra', 'finesse', 3, { name: 'Solar Surge',   description: '+45 SPD · +10% CRIT',                  bonus: { spd: 45, crit: 0.10 } }),
  mk('pyra', 'endurance', 1, { name: 'Magma Skin',  description: '+200 HP · burns linger',               bonus: { hp: 200 } }),
  mk('pyra', 'endurance', 2, { name: 'Phoenix Feather',description: '+35 DEF · +250 HP',                 bonus: { def: 35, hp: 250 } }),
  mk('pyra', 'endurance', 3, { name: 'Reborn in Flame',description: '+900 HP · +50 DEF',                 bonus: { hp: 900, def: 50 } }),

  // ============ KORVAN — Soul Reaper ============
  mk('korvan', 'might', 1, { name: 'Scythe Edge',   description: '+35 ATK',                              bonus: { atk: 35 } }),
  mk('korvan', 'might', 2, { name: 'Soul Cleave',   description: '+80 ATK · +10% CRIT',                  bonus: { atk: 80, crit: 0.10 } }),
  mk('korvan', 'might', 3, { name: 'Black Harvest', description: '+190 ATK · +18% CRIT',                 bonus: { atk: 190, crit: 0.18 } }),
  mk('korvan', 'finesse', 1, { name: "Reaper's Step",description: '+12 SPD',                             bonus: { spd: 12 } }),
  mk('korvan', 'finesse', 2, { name: 'Death Glide', description: '+25 SPD · +8% CRIT',                   bonus: { spd: 25, crit: 0.08 } }),
  mk('korvan', 'finesse', 3, { name: 'Last Cut',    description: '+50 SPD · +14% CRIT',                  bonus: { spd: 50, crit: 0.14 } }),
  mk('korvan', 'endurance', 1, { name: 'Soul Eater',description: '+350 HP · feeds on death',             bonus: { hp: 350 } }),
  mk('korvan', 'endurance', 2, { name: 'Bone Carapace',description: '+60 DEF · +400 HP',                 bonus: { def: 60, hp: 400 } }),
  mk('korvan', 'endurance', 3, { name: 'Unkillable',description: '+1500 HP · +90 DEF',                   bonus: { hp: 1500, def: 90 } }),

  // ============ GEORGE — Shapeshifter Druid ============
  mk('george', 'might', 1, { name: 'Claw Sharpening',description: '+30 ATK · wild teeth',                 bonus: { atk: 30 } }),
  mk('george', 'might', 2, { name: 'Pack Leader',   description: '+70 ATK · +250 HP',                    bonus: { atk: 70, hp: 250 } }),
  mk('george', 'might', 3, { name: 'Apex Predator', description: '+160 ATK · +500 HP · +5% CRIT',        bonus: { atk: 160, hp: 500, crit: 0.05 } }),
  mk('george', 'finesse', 1, { name: 'Quickfoot',   description: '+12 SPD',                              bonus: { spd: 12 } }),
  mk('george', 'finesse', 2, { name: "Wolf's Pace", description: '+25 SPD · +5% CRIT',                   bonus: { spd: 25, crit: 0.05 } }),
  mk('george', 'finesse', 3, { name: 'Wild Hunt',   description: '+45 SPD · +10% CRIT',                  bonus: { spd: 45, crit: 0.10 } }),
  mk('george', 'endurance', 1, { name: 'Bark Skin', description: '+400 HP · roots him to earth',         bonus: { hp: 400 } }),
  mk('george', 'endurance', 2, { name: 'Bear Form', description: '+80 DEF · +500 HP',                    bonus: { def: 80, hp: 500 } }),
  mk('george', 'endurance', 3, { name: 'Primal Heart',description: '+1800 HP · +100 DEF',                bonus: { hp: 1800, def: 100 } }),

  // ============ MANNY — Death Caller / Necromancer ============
  mk('manny', 'might', 1, { name: 'Death Word',     description: '+40 ATK · whispers kill',              bonus: { atk: 40 } }),
  mk('manny', 'might', 2, { name: 'Decay Touch',    description: '+90 ATK · +8% CRIT',                   bonus: { atk: 90, crit: 0.08 } }),
  mk('manny', 'might', 3, { name: "Reaper's Will",  description: '+200 ATK · +14% CRIT',                 bonus: { atk: 200, crit: 0.14 } }),
  mk('manny', 'finesse', 1, { name: 'Whisper Step', description: '+10 SPD',                              bonus: { spd: 10 } }),
  mk('manny', 'finesse', 2, { name: 'Ghost Step',   description: '+22 SPD · +6% CRIT',                   bonus: { spd: 22, crit: 0.06 } }),
  mk('manny', 'finesse', 3, { name: 'Bone Dance',   description: '+45 SPD · +12% CRIT',                  bonus: { spd: 45, crit: 0.12 } }),
  mk('manny', 'endurance', 1, { name: 'Phylactery', description: '+300 HP · soul anchored',              bonus: { hp: 300 } }),
  mk('manny', 'endurance', 2, { name: 'Lich Skin',  description: '+50 DEF · +350 HP',                    bonus: { def: 50, hp: 350 } }),
  mk('manny', 'endurance', 3, { name: 'Undying',    description: '+1200 HP · +80 DEF',                   bonus: { hp: 1200, def: 80 } }),

  // ============ CHINO — Drunken Master ============
  mk('chino', 'might', 1, { name: 'First Sip',       description: '+30 ATK · the first sting wakes him',   bonus: { atk: 30 } }),
  mk('chino', 'might', 2, { name: 'Drunken Fist',    description: '+70 ATK · +6% CRIT',                    bonus: { atk: 70, crit: 0.06 } }),
  mk('chino', 'might', 3, { name: 'Bottomless Cup',  description: '+160 ATK · +12% CRIT',                  bonus: { atk: 160, crit: 0.12 } }),
  mk('chino', 'finesse', 1, { name: 'Wobble Step',   description: '+12 SPD · unpredictable',               bonus: { spd: 12 } }),
  mk('chino', 'finesse', 2, { name: 'Stagger Sway',  description: '+25 SPD · +5% CRIT',                    bonus: { spd: 25, crit: 0.05 } }),
  mk('chino', 'finesse', 3, { name: 'Reckless Dance',description: '+45 SPD · +10% CRIT',                   bonus: { spd: 45, crit: 0.10 } }),
  mk('chino', 'endurance', 1, { name: 'Iron Liver',  description: '+350 HP · numbness is armor',           bonus: { hp: 350 } }),
  mk('chino', 'endurance', 2, { name: 'Drunkard Grit', description: '+60 DEF · +400 HP',                    bonus: { def: 60, hp: 400 } }),
  mk('chino', 'endurance', 3, { name: 'Unkillable Cup', description: '+1200 HP · +90 DEF',                   bonus: { hp: 1200, def: 90 } }),

  // ============ REIJI — Twin-Blade Samurai ============
  mk('reiji', 'might', 1, { name: 'White Cut',       description: '+35 ATK · light blade sings',           bonus: { atk: 35 } }),
  mk('reiji', 'might', 2, { name: 'Black Cut',       description: '+80 ATK · +6% CRIT',                    bonus: { atk: 80, crit: 0.06 } }),
  mk('reiji', 'might', 3, { name: 'Cross Eclipse',   description: '+180 ATK · +12% CRIT',                  bonus: { atk: 180, crit: 0.12 } }),
  mk('reiji', 'finesse', 1, { name: 'Mirror Stance', description: '+10 SPD',                                bonus: { spd: 10 } }),
  mk('reiji', 'finesse', 2, { name: 'Dual Draw',     description: '+22 SPD · +50 ATK',                     bonus: { spd: 22, atk: 50 } }),
  mk('reiji', 'finesse', 3, { name: 'Iaido Lightning', description: '+45 SPD · +10% CRIT',                   bonus: { spd: 45, crit: 0.10 } }),
  mk('reiji', 'endurance', 1, { name: 'Folded Stance', description: '+300 HP · braced',                      bonus: { hp: 300 } }),
  mk('reiji', 'endurance', 2, { name: 'Half-Light Skin', description: '+55 DEF · +350 HP',                    bonus: { def: 55, hp: 350 } }),
  mk('reiji', 'endurance', 3, { name: 'Two Souls One Body', description: '+1100 HP · +80 DEF',                  bonus: { hp: 1100, def: 80 } }),

  // ============ TWINS — Tatiana & Roiify ============
  mk('twins', 'might', 1, { name: 'Shared Strike',    description: '+30 ATK · they hit as one',             bonus: { atk: 30 } }),
  mk('twins', 'might', 2, { name: 'Mirror Curse',     description: '+70 ATK · +6% CRIT',                    bonus: { atk: 70, crit: 0.06 } }),
  mk('twins', 'might', 3, { name: 'Twin Wrath',       description: '+170 ATK · +12% CRIT',                  bonus: { atk: 170, crit: 0.12 } }),
  mk('twins', 'finesse', 1, { name: 'Synced Step',    description: '+12 SPD · one breath',                  bonus: { spd: 12 } }),
  mk('twins', 'finesse', 2, { name: 'Shadowstep Pair',description: '+22 SPD · +40 ATK',                     bonus: { spd: 22, atk: 40 } }),
  mk('twins', 'finesse', 3, { name: 'Yin-Yang Tempo', description: '+45 SPD · +10% CRIT',                   bonus: { spd: 45, crit: 0.10 } }),
  mk('twins', 'endurance', 1, { name: 'Two Hearts',    description: '+400 HP · two bodies endure',           bonus: { hp: 400 } }),
  mk('twins', 'endurance', 2, { name: 'Spousal Shield', description: '+50 DEF · +500 HP',                    bonus: { def: 50, hp: 500 } }),
  mk('twins', 'endurance', 3, { name: 'Unbroken Bond', description: '+1400 HP · +90 DEF',                    bonus: { hp: 1400, def: 90 } }),
];

export const TALENT_BY_ID = Object.fromEntries(TALENT_TREE.map(t => [t.id, t]));

export const BRANCH_COLOR: Record<TalentBranch, string> = {
  might:     '#ef4444',
  finesse:   '#a855f7',
  endurance: '#22c55e',
};
export const BRANCH_NAME: Record<TalentBranch, string> = {
  might: 'Might', finesse: 'Finesse', endurance: 'Endurance',
};

export function talentPointsForLevel(level: number): number {
  // 1 point per 3 levels past 10 — maxing every hero's tree should be a
  // long-haul goal, not automatic by mid-game.
  return Math.max(0, Math.floor((level - 10) / 3));
}

// Filter by hero AND branch
export function nodesForHeroBranch(heroId: string, branch: TalentBranch): TalentNode[] {
  return TALENT_TREE
    .filter(t => t.heroId === heroId && t.branch === branch)
    .sort((a, b) => a.rank - b.rank);
}

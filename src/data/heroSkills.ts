// Hero-specific conditional passives. Each hero gets 2 passives that fire on
// certain combat events: 'on_attack', 'on_hit', 'on_low_hp', 'on_kill', 'first_turn'.
// They're listed on the hero detail page and apply automatically in battle.

export type SkillTrigger = 'on_attack' | 'on_hit' | 'on_low_hp' | 'on_kill' | 'first_turn';
export type SkillEffect =
  | { kind: 'damage_mult'; value: number }    // multiply outgoing damage
  | { kind: 'crit_chance'; value: number }    // add to crit chance for this proc
  | { kind: 'lifesteal'; value: number }      // heal self by dmg * value
  | { kind: 'dodge'; value: number }          // chance to dodge incoming
  | { kind: 'reflect'; value: number }        // reflect damage back
  | { kind: 'team_heal'; value: number }      // heal all allies by value
  | { kind: 'self_atk_buff'; value: number; duration: number }
  | { kind: 'self_def_buff'; value: number; duration: number };

export interface HeroSkillDef {
  id: string;
  heroId: string;
  name: string;
  description: string;
  trigger: SkillTrigger;
  effect: SkillEffect;
}

export const HERO_SKILLS: HeroSkillDef[] = [
  // ===== LUNA — Priestess / Healer =====
  { id: 'luna_p1', heroId: 'luna', name: 'Healer\'s Touch',
    description: 'When Luna attacks, heal lowest-HP ally for 25% of damage dealt.',
    trigger: 'on_attack',
    effect: { kind: 'lifesteal', value: 0.25 } },
  { id: 'luna_p2', heroId: 'luna', name: 'Dawn Rises',
    description: 'On first turn, heal all allies for 800 HP.',
    trigger: 'first_turn',
    effect: { kind: 'team_heal', value: 800 } },

  // ===== AELIA — Frost Mage =====
  { id: 'aelia_p1', heroId: 'aelia', name: 'Cold Focus',
    description: 'Each attack has +15% crit chance.',
    trigger: 'on_attack',
    effect: { kind: 'crit_chance', value: 0.15 } },
  { id: 'aelia_p2', heroId: 'aelia', name: 'Frost Wreath',
    description: 'On hit, 30% chance to reflect 20% damage back.',
    trigger: 'on_hit',
    effect: { kind: 'reflect', value: 0.20 } },

  // ===== KAIUS — Holy Paladin / Tank =====
  { id: 'kaius_p1', heroId: 'kaius', name: 'Iron Stance',
    description: 'When hit, 25% chance to reduce damage by half (dodge).',
    trigger: 'on_hit',
    effect: { kind: 'dodge', value: 0.25 } },
  { id: 'kaius_p2', heroId: 'kaius', name: 'Battle Cry',
    description: 'On first turn, buff own DEF by +200 for 3 turns.',
    trigger: 'first_turn',
    effect: { kind: 'self_def_buff', value: 200, duration: 3 } },

  // ===== ELARA — Elven Archer =====
  { id: 'elara_p1', heroId: 'elara', name: 'Eagle Eye',
    description: 'Critical attacks deal +50% bonus damage.',
    trigger: 'on_attack',
    effect: { kind: 'crit_chance', value: 0.20 } },
  { id: 'elara_p2', heroId: 'elara', name: 'Trail Sight',
    description: 'On low HP, gain +30% ATK for 3 turns.',
    trigger: 'on_low_hp',
    effect: { kind: 'self_atk_buff', value: 0.30, duration: 3 } },

  // ===== KENGO — Monk / Warrior =====
  { id: 'kengo_p1', heroId: 'kengo', name: 'Stone Body',
    description: 'When hit, 35% chance to dodge.',
    trigger: 'on_hit',
    effect: { kind: 'dodge', value: 0.35 } },
  { id: 'kengo_p2', heroId: 'kengo', name: 'Fury Awakens',
    description: 'On low HP, attacks deal +40% damage.',
    trigger: 'on_low_hp',
    effect: { kind: 'damage_mult', value: 1.40 } },

  // ===== LEN — Shadow Assassin =====
  { id: 'len_p1', heroId: 'len', name: 'Bloodlust',
    description: 'On kill, heal for 30% of max HP.',
    trigger: 'on_kill',
    effect: { kind: 'lifesteal', value: 0.30 } },
  { id: 'len_p2', heroId: 'len', name: 'Shadow Step',
    description: 'On hit, 20% chance to dodge entirely.',
    trigger: 'on_hit',
    effect: { kind: 'dodge', value: 0.20 } },

  // ===== PYRA — Fire Mage =====
  { id: 'pyra_p1', heroId: 'pyra', name: 'Ember Surge',
    description: 'Each attack has +20% crit chance.',
    trigger: 'on_attack',
    effect: { kind: 'crit_chance', value: 0.20 } },
  { id: 'pyra_p2', heroId: 'pyra', name: 'Heat Veil',
    description: 'On hit, 25% chance to reflect 25% damage back as fire.',
    trigger: 'on_hit',
    effect: { kind: 'reflect', value: 0.25 } },

  // ===== KORVAN — Soul Reaper =====
  { id: 'korvan_p1', heroId: 'korvan', name: 'Crimson Frenzy',
    description: 'Each attack has +25% crit chance — every cut is precise.',
    trigger: 'on_attack',
    effect: { kind: 'crit_chance', value: 0.25 } },
  { id: 'korvan_p2', heroId: 'korvan', name: 'Soul Drink',
    description: 'On kill, heal for 35% of max HP — the blade feeds him.',
    trigger: 'on_kill',
    effect: { kind: 'lifesteal', value: 0.35 } },
];

export const HERO_SKILL_BY_ID = Object.fromEntries(HERO_SKILLS.map(s => [s.id, s]));

export function skillsForHero(heroId: string): HeroSkillDef[] {
  return HERO_SKILLS.filter(s => s.heroId === heroId);
}

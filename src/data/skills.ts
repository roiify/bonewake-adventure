import type { Skill } from '../types';

// Power-budget rule: an AOE ult hits 3 enemies, so a single-target ult
// at the SAME multiplier is doing 1/3 the work. Single-target ults stay
// ~3x the AOE multiplier so both classes contribute the same total damage.
//
// Band targets (skill-less rebalance, ult is the only burst spender):
//   AOE      → 2.5 - 2.9x ATK (effective 7.5 - 8.7x across 3 enemies)
//   Single   → 7.2 - 8.1x ATK
//   Heal     → 1250 flat + 60% ATK (Luna only)
//
// These were bumped ~25% over the prior values to compensate for the
// 50-energy mid-skill being removed in combat.ts — that skill was
// roughly 25% of a hero's per-round burst contribution.
export const SKILLS: Skill[] = [
  // AOE ults (targeting: 'all') — multiplier applies per enemy
  { id: 'arrow_volley',       name: 'Arrow Volley',       description: 'Hail of arrows on all enemies.',                      damageMultiplier: 2.5, targeting: 'all' },
  { id: 'frost_crystal',      name: 'Frost Crystal',      description: 'Crystalline blast on all enemies.',                   damageMultiplier: 2.6, targeting: 'all' },
  { id: 'infernal_cataclysm', name: 'Infernal Cataclysm', description: 'Volcanic blast across all enemies + burn DoT.',       damageMultiplier: 2.6, targeting: 'all', effect: { type: 'burn', value: 200, duration: 3 } },
  { id: 'soul_harvest',       name: 'Soul Harvest',       description: 'Spinning scythe sweeps all enemies in a brutal arc.', damageMultiplier: 2.7, targeting: 'all' },
  { id: 'army_of_the_dead',   name: 'Army of the Dead',   description: 'Necrotic blast tears through all enemies.',           damageMultiplier: 2.9, targeting: 'all', effect: { type: 'burn', value: 150, duration: 3 } },
  { id: 'lich_blast',         name: 'Tomb Blast',         description: "Lich Sovereign's necrotic AOE blast.",                damageMultiplier: 2.5, targeting: 'all' },
  // Reiji's dual-blade arc — white + black katana sweep on every enemy
  { id: 'dual_eclipse',       name: 'Dual Eclipse',       description: 'Twin-katana cross-slash hits every enemy.',           damageMultiplier: 2.6, targeting: 'all' },
  // Twins' joint ult — yin/yang energy detonation (two combatants, one slot)
  { id: 'yin_yang_strike',    name: 'Yin-Yang Strike',    description: 'Twin energies converge — every enemy is shattered.',  damageMultiplier: 2.8, targeting: 'all', effect: { type: 'burn', value: 180, duration: 3 } },

  // Single-target ults — ~3x the AOE multiplier so total damage is comparable
  { id: 'iron_palm',          name: 'Iron Palm',          description: 'Devastating single strike.',                          damageMultiplier: 8.0, targeting: 'single' },
  { id: 'aegis_judgment',     name: 'Aegis Judgment',     description: 'Massive single hit + ally shield.',                   damageMultiplier: 7.5, targeting: 'single', effect: { type: 'shield', value: 450, duration: 2 } },
  { id: 'primal_form',        name: 'Primal Form',        description: 'Shapeshift to bear and crush a single enemy.',        damageMultiplier: 7.8, targeting: 'single' },
  { id: 'bone_strike',        name: 'Bone Strike',        description: "Bone King's executioner blow on a single target.",    damageMultiplier: 7.9, targeting: 'single' },
  // Chino: wild single-target nuke + self-buff_atk so follow-up basics stay strong
  { id: 'drunken_palm',       name: 'Drunken Palm',       description: 'Reckless palm strike — single hit, leaves him hungrier for the next.', damageMultiplier: 7.5, targeting: 'single', effect: { type: 'buff_atk', value: 90, duration: 3 } },
  // Lowest-HP seek (single-target, picks the weakest — finisher tool)
  { id: 'shadow_dance',       name: 'Shadow Dance',       description: 'Multi-hit on lowest-HP target.',                      damageMultiplier: 7.2, targeting: 'lowest' },

  // Healer / self-targeting
  // Luna's ult: pure team heal — does NOT revive fallen allies. Bumped
  // 1000 → 1250 base (and ATK coefficient 0.5 → 0.6) so she scales with
  // the team's higher damage intake without skill-spike healing.
  { id: 'dawn_resurrection',  name: 'Dawn Resurrection',  description: 'Heals all living allies for a large amount.',         damageMultiplier: 0, targeting: 'self', effect: { type: 'heal', value: 1250 } },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map(s => [s.id, s]));

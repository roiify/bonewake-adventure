import type { Stage } from '../types';

// Stages now use Echoes of the Grave enemies (Shambler, BoneKnight, FastGhoul, GraveyardLich)
// Enemies share the same template/stat structure as heroes. We define enemy "templates" via
// the ENEMY_BASE_STATS map below; the stage resolver will look these up.

export const ENEMY_TEMPLATES = {
  shambler:          { name: 'Shambler',        element: 'earth' as const, archetype: 'tank' as const,     baseStats: { hp: 1400, atk: 90,  def: 70,  spd: 30, crit: 0.05 }, color: '#65a30d', ultimateId: 'enemy_basic' },
  fastghoul:         { name: 'Fast Ghoul',      element: 'dark' as const, archetype: 'assassin' as const, baseStats: { hp: 800,  atk: 130, def: 40,  spd: 90, crit: 0.20 }, color: '#a3a3a3', ultimateId: 'enemy_basic' },
  boneknight:        { name: 'Bone Knight',     element: 'earth' as const, archetype: 'warrior' as const,  baseStats: { hp: 1600, atk: 140, def: 100, spd: 55, crit: 0.10 }, color: '#e7e5e4', ultimateId: 'enemy_basic' },
  graveyardlich:     { name: 'Graveyard Lich',  element: 'dark' as const, archetype: 'mage' as const,     baseStats: { hp: 2000, atk: 180, def: 80,  spd: 65, crit: 0.15 }, color: '#7c3aed', ultimateId: 'enemy_basic' },
  // World Boss tier (used by WorldBossPage). Way more HP/ATK than regular stage enemies.
  worldboss_1:       { name: 'Crimson Apostate',element: 'dark' as const, archetype: 'mage' as const,     baseStats: { hp: 80000, atk: 950, def: 350, spd: 95, crit: 0.30 }, color: '#dc2626', ultimateId: 'enemy_basic' },
  // Chapter 7 — Undead Vanguard (HP/ATK bumped ~30% for late-game difficulty)
  undead_archer:     { name: 'Undead Archer',   element: 'water' as const, archetype: 'assassin' as const, baseStats: { hp: 1170, atk: 210, def: 45,  spd: 75, crit: 0.22 }, color: '#a8a29e', ultimateId: 'enemy_basic' },
  plague_caster:     { name: 'Plague Caster',   element: 'earth' as const, archetype: 'mage' as const,     baseStats: { hp: 1820, atk: 230, def: 85,  spd: 50, crit: 0.10 }, color: '#84cc16', ultimateId: 'enemy_basic' },
  fallen_captain:    { name: 'Fallen Captain',  element: 'fire' as const, archetype: 'warrior' as const,  baseStats: { hp: 4200, atk: 255, def: 170, spd: 60, crit: 0.18 }, color: '#a855f7', ultimateId: 'enemy_basic' },
  skeletal_warhorse: { name: 'Skeletal Warhorse', element: 'water' as const, archetype: 'assassin' as const, baseStats: { hp: 1560, atk: 230, def: 65,  spd: 100, crit: 0.20 }, color: '#67e8f9', ultimateId: 'enemy_basic' },
  carrion_spider:    { name: 'Carrion Spider',  element: 'earth' as const, archetype: 'mage' as const,     baseStats: { hp: 1430, atk: 200, def: 70,  spd: 70, crit: 0.15 }, color: '#22c55e', ultimateId: 'enemy_basic' },
  phantom_knight:    { name: 'Phantom Knight',  element: 'water' as const, archetype: 'warrior' as const,  baseStats: { hp: 1950, atk: 215, def: 115, spd: 65, crit: 0.18 }, color: '#22d3ee', ultimateId: 'enemy_basic' },
  wailing_wraith:    { name: 'Wailing Wraith',  element: 'water' as const, archetype: 'mage' as const,     baseStats: { hp: 1230, atk: 240, def: 50,  spd: 80, crit: 0.18 }, color: '#d4d4d8', ultimateId: 'enemy_basic' },
  // Chapter 8 — Zombie Legion + Necromancer's Court (HP/ATK +30%)
  zombie_knight:     { name: 'Zombie Knight',   element: 'earth' as const, archetype: 'warrior' as const,  baseStats: { hp: 2340, atk: 230, def: 140, spd: 50, crit: 0.12 }, color: '#a16207', ultimateId: 'enemy_basic' },
  zombie_berserker:  { name: 'Zombie Berserker',element: 'fire' as const, archetype: 'warrior' as const,  baseStats: { hp: 2080, atk: 285, def: 90,  spd: 65, crit: 0.25 }, color: '#dc2626', ultimateId: 'enemy_basic' },
  shield_bearer:     { name: 'Shield-Bearer',   element: 'earth' as const, archetype: 'tank' as const,     baseStats: { hp: 3380, atk: 170, def: 230, spd: 35, crit: 0.05 }, color: '#737373', ultimateId: 'enemy_basic' },
  zombie_mage:       { name: 'Zombie Mage',     element: 'fire' as const, archetype: 'mage' as const,     baseStats: { hp: 1690, atk: 245, def: 70,  spd: 65, crit: 0.16 }, color: '#65a30d', ultimateId: 'enemy_basic' },
  grave_channeler:   { name: 'Grave Channeler', element: 'water' as const, archetype: 'mage' as const,     baseStats: { hp: 1950, atk: 235, def: 90,  spd: 55, crit: 0.14 }, color: '#67e8f9', ultimateId: 'enemy_basic' },
  soul_leech:        { name: 'Soul Leech',      element: 'water' as const, archetype: 'mage' as const,     baseStats: { hp: 4680, atk: 275, def: 170, spd: 70, crit: 0.20 }, color: '#22d3ee', ultimateId: 'enemy_basic' },
  rotwolf:           { name: 'Rotwolf',         element: 'fire' as const, archetype: 'assassin' as const, baseStats: { hp: 1430, atk: 240, def: 65,  spd: 105, crit: 0.22 }, color: '#a8a29e', ultimateId: 'enemy_basic' },
  bone_bear:         { name: 'Bone Bear',       element: 'earth' as const, archetype: 'tank' as const,     baseStats: { hp: 3900, atk: 230, def: 180, spd: 40, crit: 0.10 }, color: '#92400e', ultimateId: 'enemy_basic' },
  // Chapter 9 — Necromancer's Court (HP/ATK +30%)
  possessed_corpse:  { name: 'Possessed Corpse',element: 'dark' as const, archetype: 'mage' as const,     baseStats: { hp: 2210, atk: 260, def: 95,  spd: 70, crit: 0.18 }, color: '#a855f7', ultimateId: 'enemy_basic' },
  grave_digger:      { name: 'Grave Digger',    element: 'earth' as const, archetype: 'warrior' as const,  baseStats: { hp: 2730, atk: 240, def: 125, spd: 55, crit: 0.12 }, color: '#78350f', ultimateId: 'enemy_basic' },
  plague_monk:       { name: 'Plague Monk',     element: 'earth' as const, archetype: 'mage' as const,     baseStats: { hp: 1950, atk: 265, def: 80,  spd: 75, crit: 0.16 }, color: '#16a34a', ultimateId: 'enemy_basic' },
  necromancer:       { name: 'Necromancer',     element: 'dark' as const, archetype: 'mage' as const,     baseStats: { hp: 5460, atk: 310, def: 170, spd: 80, crit: 0.22 }, color: '#7c3aed', ultimateId: 'enemy_basic' },

  // ============ CH 10-14 — NECROPOLIS ROYALTY ============
  royal_lich:        { name: 'Royal Lich',       element: 'dark' as const, archetype: 'mage' as const,     baseStats: { hp: 7200, atk: 360, def: 180, spd: 80, crit: 0.22 }, color: '#a855f7', ultimateId: 'enemy_basic' },
  bone_executioner:  { name: 'Bone Executioner', element: 'fire' as const, archetype: 'warrior' as const,  baseStats: { hp: 5800, atk: 380, def: 130, spd: 60, crit: 0.20 }, color: '#a16207', ultimateId: 'enemy_basic' },
  gilded_revenant:   { name: 'Gilded Revenant',  element: 'light' as const, archetype: 'warrior' as const,  baseStats: { hp: 5400, atk: 320, def: 200, spd: 65, crit: 0.18 }, color: '#facc15', ultimateId: 'enemy_basic' },
  crypt_assassin:    { name: 'Crypt Assassin',   element: 'dark' as const, archetype: 'assassin' as const, baseStats: { hp: 3200, atk: 360, def: 80,  spd: 120, crit: 0.30 }, color: '#7e22ce', ultimateId: 'enemy_basic' },
  plague_priest:     { name: 'Plague Priest',    element: 'light' as const, archetype: 'mage' as const,     baseStats: { hp: 4400, atk: 320, def: 100, spd: 75, crit: 0.18 }, color: '#84cc16', ultimateId: 'enemy_basic' },

  // ============ CH 15-19 — ABYSSAL CRYPTS ============
  void_zombie:       { name: 'Void Zombie',      element: 'water' as const, archetype: 'warrior' as const,  baseStats: { hp: 4800, atk: 350, def: 130, spd: 75, crit: 0.20 }, color: '#581c87', ultimateId: 'enemy_basic' },
  abyssal_warden:    { name: 'Abyssal Warden',   element: 'water' as const, archetype: 'tank' as const,     baseStats: { hp: 9000, atk: 280, def: 320, spd: 45, crit: 0.10 }, color: '#1e1b4b', ultimateId: 'enemy_basic' },
  shade_caller:      { name: 'Shade Caller',     element: 'dark' as const, archetype: 'mage' as const,     baseStats: { hp: 4600, atk: 380, def: 110, spd: 80, crit: 0.20 }, color: '#6d28d9', ultimateId: 'enemy_basic' },
  dread_knight:      { name: 'Dread Knight',     element: 'fire' as const, archetype: 'warrior' as const,  baseStats: { hp: 6400, atk: 400, def: 180, spd: 70, crit: 0.22 }, color: '#dc2626', ultimateId: 'enemy_basic' },
  corpse_hound:      { name: 'Corpse Hound',     element: 'fire' as const, archetype: 'assassin' as const, baseStats: { hp: 3400, atk: 380, def: 90,  spd: 130, crit: 0.28 }, color: '#a3a3a3', ultimateId: 'enemy_basic' },

  // ============ CH 20-24 — COSMIC CORRUPTION ============
  starfall_lich:     { name: 'Starfall Lich',    element: 'light' as const, archetype: 'mage' as const,     baseStats: { hp: 8400, atk: 460, def: 200, spd: 85, crit: 0.25 }, color: '#22d3ee', ultimateId: 'enemy_basic' },
  void_juggernaut:   { name: 'Void Juggernaut',  element: 'water' as const, archetype: 'tank' as const,     baseStats: { hp: 11000, atk: 360, def: 360, spd: 50, crit: 0.12 }, color: '#1e3a8a', ultimateId: 'enemy_basic' },
  astral_archer:     { name: 'Astral Archer',    element: 'light' as const, archetype: 'assassin' as const, baseStats: { hp: 4200, atk: 460, def: 110, spd: 130, crit: 0.32 }, color: '#67e8f9', ultimateId: 'enemy_basic' },
  orb_caster:        { name: 'Orb Caster',       element: 'water' as const, archetype: 'mage' as const,     baseStats: { hp: 5400, atk: 440, def: 130, spd: 85, crit: 0.22 }, color: '#06b6d4', ultimateId: 'enemy_basic' },
  soul_devourer:     { name: 'Soul Devourer',    element: 'water' as const, archetype: 'mage' as const,     baseStats: { hp: 7600, atk: 420, def: 200, spd: 90, crit: 0.24 }, color: '#0ea5e9', ultimateId: 'enemy_basic' },

  // ============ CH 25-29 — FINAL APOCALYPSE ============
  apocalypse_horror: { name: 'Apocalypse Horror', element: 'fire' as const, archetype: 'warrior' as const, baseStats: { hp: 14000, atk: 520, def: 220, spd: 60, crit: 0.25 }, color: '#b91c1c', ultimateId: 'enemy_basic' },
  world_eater_husk:  { name: 'World-Eater Husk',  element: 'earth' as const, archetype: 'tank' as const,    baseStats: { hp: 18000, atk: 460, def: 420, spd: 45, crit: 0.15 }, color: '#78716c', ultimateId: 'enemy_basic' },
  blood_titan:       { name: 'Blood Titan',       element: 'fire' as const, archetype: 'warrior' as const, baseStats: { hp: 13000, atk: 560, def: 250, spd: 65, crit: 0.28 }, color: '#dc2626', ultimateId: 'enemy_basic' },
  ash_lord:          { name: 'Ash Lord',          element: 'fire' as const, archetype: 'mage' as const,    baseStats: { hp: 12000, atk: 580, def: 240, spd: 80, crit: 0.28 }, color: '#ea580c', ultimateId: 'enemy_basic' },
  final_revenant:    { name: 'Final Revenant',    element: 'light' as const, archetype: 'warrior' as const, baseStats: { hp: 16000, atk: 620, def: 280, spd: 95, crit: 0.32 }, color: '#7c3aed', ultimateId: 'enemy_basic' },

  // ============ NEW BOSS-TIER (painted in PixelLab/Nano Banana) ============
  // 7 mythical creatures for World Boss daily rotation
  bonewake_dragon:  { name: 'Bonewake Dragon',  element: 'fire' as const,  archetype: 'warrior' as const, baseStats: { hp: 90000, atk: 1100, def: 380, spd: 60, crit: 0.30 }, color: '#a16207', ultimateId: 'enemy_basic' },
  plague_hydra:     { name: 'Plague Hydra',     element: 'earth' as const, archetype: 'mage'    as const, baseStats: { hp: 75000, atk: 950,  def: 280, spd: 80, crit: 0.25 }, color: '#84cc16', ultimateId: 'enemy_basic' },
  rot_phoenix:      { name: 'Rot Phoenix',      element: 'fire' as const,  archetype: 'mage'    as const, baseStats: { hp: 60000, atk: 1300, def: 200, spd: 110, crit: 0.40 }, color: '#dc2626', ultimateId: 'enemy_basic' },
  bone_cerberus:    { name: 'Bone Cerberus',    element: 'dark' as const,  archetype: 'assassin' as const,baseStats: { hp: 65000, atk: 1200, def: 240, spd: 130, crit: 0.45 }, color: '#a8a29e', ultimateId: 'enemy_basic' },
  wraith_kraken:    { name: 'Wraith Kraken',    element: 'water' as const, archetype: 'tank'    as const, baseStats: { hp:120000, atk: 800,  def: 500, spd: 50, crit: 0.20 }, color: '#1e40af', ultimateId: 'enemy_basic' },
  necro_sphinx:     { name: 'Necro Sphinx',     element: 'light' as const, archetype: 'mage'    as const, baseStats: { hp: 80000, atk: 1050, def: 320, spd: 95, crit: 0.30 }, color: '#fde047', ultimateId: 'enemy_basic' },
  crimson_centaur:  { name: 'Crimson Centaur',  element: 'dark' as const,  archetype: 'warrior' as const, baseStats: { hp: 85000, atk: 1150, def: 340, spd: 100, crit: 0.32 }, color: '#dc2626', ultimateId: 'enemy_basic' },
  // 7 humanoid overlords for Shatter daily rotation
  lich_king:        { name: 'The Lich King',    element: 'dark' as const,  archetype: 'mage'    as const, baseStats: { hp: 95000, atk: 1250, def: 360, spd: 85, crit: 0.35 }, color: '#a855f7', ultimateId: 'enemy_basic' },
  bone_titan:       { name: 'Bone Titan',       element: 'earth' as const, archetype: 'tank'    as const, baseStats: { hp:140000, atk: 900,  def: 580, spd: 45, crit: 0.18 }, color: '#71717a', ultimateId: 'enemy_basic' },
  plague_doctor:    { name: 'Plague Doctor',    element: 'dark' as const,  archetype: 'mage'    as const, baseStats: { hp: 70000, atk: 1150, def: 280, spd: 90, crit: 0.30 }, color: '#84cc16', ultimateId: 'enemy_basic' },
  ash_empress:      { name: 'Ash Empress',      element: 'fire' as const,  archetype: 'mage'    as const, baseStats: { hp: 85000, atk: 1300, def: 300, spd: 80, crit: 0.35 }, color: '#f97316', ultimateId: 'enemy_basic' },
  soul_reaper:      { name: 'Soul Reaper',      element: 'dark' as const,  archetype: 'assassin' as const,baseStats: { hp: 75000, atk: 1450, def: 220, spd: 120, crit: 0.50 }, color: '#a78bfa', ultimateId: 'enemy_basic' },
  voidlord:         { name: 'Voidlord',         element: 'dark' as const,  archetype: 'warrior' as const, baseStats: { hp:100000, atk: 1200, def: 400, spd: 75, crit: 0.30 }, color: '#581c87', ultimateId: 'enemy_basic' },
  worm_god:         { name: 'The Worm God',     element: 'earth' as const, archetype: 'tank'    as const, baseStats: { hp:160000, atk: 950,  def: 540, spd: 40, crit: 0.20 }, color: '#16a34a', ultimateId: 'enemy_basic' },
  // Net-new pro-mode horror enemies — mid-tier stats, all dark element.
  bloated_glutton:  { name: 'Bloated Glutton',  element: 'earth' as const,  archetype: 'tank'    as const, baseStats: { hp: 6200, atk: 230, def: 220, spd: 35,  crit: 0.10 }, color: '#65a30d', ultimateId: 'enemy_basic' },
  hangman:          { name: 'Hangman',          element: 'dark' as const,  archetype: 'assassin' as const,baseStats: { hp: 3200, atk: 380, def: 90,  spd: 110, crit: 0.32 }, color: '#52525b', ultimateId: 'enemy_basic' },
  conjoined_horror: { name: 'Conjoined Horror', element: 'fire' as const,  archetype: 'warrior' as const, baseStats: { hp: 4800, atk: 310, def: 150, spd: 55,  crit: 0.18 }, color: '#7c2d12', ultimateId: 'enemy_basic' },
  stitched_brute:   { name: 'Stitched Brute',   element: 'earth' as const,  archetype: 'warrior' as const, baseStats: { hp: 5400, atk: 340, def: 160, spd: 50,  crit: 0.15 }, color: '#78350f', ultimateId: 'enemy_basic' },
  drowned_lurker:   { name: 'Drowned Lurker',   element: 'water' as const,  archetype: 'assassin' as const,baseStats: { hp: 3000, atk: 360, def: 80,  spd: 105, crit: 0.30 }, color: '#0891b2', ultimateId: 'enemy_basic' },
  acid_vomiter:     { name: 'Acid Vomiter',     element: 'earth' as const,  archetype: 'mage'    as const, baseStats: { hp: 3600, atk: 330, def: 110, spd: 70,  crit: 0.18 }, color: '#84cc16', ultimateId: 'enemy_basic' },
  plague_bride:     { name: 'Plague Bride',     element: 'earth' as const,  archetype: 'mage'    as const, baseStats: { hp: 4000, atk: 340, def: 115, spd: 75,  crit: 0.20 }, color: '#a3e635', ultimateId: 'enemy_basic' },
  chained_prisoner: { name: 'Chained Prisoner', element: 'dark' as const,  archetype: 'assassin' as const,baseStats: { hp: 2800, atk: 340, def: 75,  spd: 115, crit: 0.28 }, color: '#a8a29e', ultimateId: 'enemy_basic' },
  crawling_torso:   { name: 'Crawling Torso',   element: 'dark' as const,  archetype: 'assassin' as const,baseStats: { hp: 2400, atk: 300, def: 60,  spd: 120, crit: 0.25 }, color: '#7c2d12', ultimateId: 'enemy_basic' },
  maggot_host:      { name: 'Maggot Host',      element: 'earth' as const,  archetype: 'mage'    as const, baseStats: { hp: 3400, atk: 320, def: 105, spd: 65,  crit: 0.18 }, color: '#a16207', ultimateId: 'enemy_basic' },
  butcher_zombie:   { name: 'Butcher Zombie',   element: 'fire' as const,  archetype: 'warrior' as const, baseStats: { hp: 4400, atk: 320, def: 145, spd: 60,  crit: 0.20 }, color: '#991b1b', ultimateId: 'enemy_basic' },
  crypt_wyvern:     { name: 'Crypt Wyvern',     element: 'fire' as const,  archetype: 'warrior' as const, baseStats: { hp: 4800, atk: 420, def: 130, spd: 100, crit: 0.28 }, color: '#581c87', ultimateId: 'enemy_basic' },
  obsidian_knight:  { name: 'Obsidian Knight',  element: 'earth' as const,  archetype: 'tank'    as const, baseStats: { hp: 5800, atk: 340, def: 200, spd: 65,  crit: 0.18 }, color: '#1f2937', ultimateId: 'enemy_basic' },
};
export type EnemyTemplateId = keyof typeof ENEMY_TEMPLATES;

const E = (templateId: EnemyTemplateId, level: number, star = 3) => ({ templateId: templateId as string, level, star });

// ============ CHAPTER GENERATOR (chapters 10-29) ============
// Hand-writing 100 late-game stages is noisy and error-prone. mkChapter
// takes a compact spec (5 stage names + enemy triples + a boss enemy +
// base level/reward/energy/gem floor) and emits 5 fully-formed Stage
// entries with linear in-chapter scaling. Boss is always stage 5: its
// middle slot uses the boss enemy at boss level + 5, star 6.
type EnTpl = EnemyTemplateId;
interface StageSpec { name: string; enemies: [EnTpl, EnTpl, EnTpl]; }
function mkChapter(opts: {
  chapter: number;
  stages: [StageSpec, StageSpec, StageSpec, StageSpec, StageSpec];
  bossEnemy: EnTpl;
  baseLevel: number;
  baseGold: number;
  baseExp: number;
  baseEnergy: number;
  baseGems: number;
  bossItems?: Record<string, number>;
}): Stage[] {
  const out: Stage[] = [];
  for (let i = 0; i < 5; i++) {
    const num = i + 1;
    const isBoss = num === 5;
    // Tightened intra-chapter ramp (+2/stage instead of +4) so 20 chapters
    // fit inside a 158-196 enemy-level band — keeps everything below the
    // PLAYER_MAX_LEVEL of 200 with the boss landing slightly above.
    const level = opts.baseLevel + i * 2;
    const s = opts.stages[i];
    const enemyTeam = isBoss
      ? [E(s.enemies[0], level, 5), E(opts.bossEnemy, level + 2, 6), E(s.enemies[2], level, 5)]
      : s.enemies.map(t => E(t, level, 5));
    const gold = isBoss ? opts.baseGold * 2 : opts.baseGold + i * 500;
    const exp = isBoss ? opts.baseExp * 2 : opts.baseExp + i * 300;
    const energy = isBoss ? opts.baseEnergy + 12 : opts.baseEnergy + Math.floor(i / 2) * 2;
    const gems = isBoss ? opts.baseGems * 2 : opts.baseGems + i * 30;
    out.push({
      id: `${opts.chapter}-${num}`,
      chapter: opts.chapter,
      num,
      name: s.name,
      energyCost: energy,
      enemyTeam,
      rewards: isBoss
        ? { gold, exp, items: opts.bossItems ?? { weapon_5: 1, armor_5: 1 } }
        : { gold, exp },
      firstClearBonus: { gems },
    });
  }
  return out;
}

// 15 stages: 3 chapters × 5 stages, using new enemy roster
export const STAGES: Stage[] = [
  // Chapter 1 — Forsaken Fields  (lvl 1-10)
  { id: '1-1', chapter: 1, num: 1, name: 'The Risen Path', energyCost: 6,
    enemyTeam: [E('shambler', 1), E('shambler', 1), E('shambler', 1)],
    rewards: { gold: 80, exp: 30 }, firstClearBonus: { gems: 20 } },
  { id: '1-2', chapter: 1, num: 2, name: 'Wailing Hollow', energyCost: 6,
    enemyTeam: [E('shambler', 3), E('fastghoul', 3), E('shambler', 3)],
    rewards: { gold: 100, exp: 40 }, firstClearBonus: { gems: 20 } },
  { id: '1-3', chapter: 1, num: 3, name: 'Old Burial Ground', energyCost: 6,
    enemyTeam: [E('fastghoul', 5), E('shambler', 5), E('fastghoul', 5)],
    rewards: { gold: 120, exp: 50 }, firstClearBonus: { gems: 30 } },
  { id: '1-4', chapter: 1, num: 4, name: 'Cracked Earth', energyCost: 8,
    enemyTeam: [E('shambler', 7), E('boneknight', 7), E('fastghoul', 7)],
    rewards: { gold: 150, exp: 60 }, firstClearBonus: { gems: 30 } },
  { id: '1-5', chapter: 1, num: 5, name: 'Fields Boss: First Knight', energyCost: 10,
    enemyTeam: [E('boneknight', 10, 4), E('shambler', 9), E('shambler', 9)],
    rewards: { gold: 250, exp: 100, items: { sword_4: 1 } }, firstClearBonus: { gems: 80 } },

  // Chapter 2 — Ashen Wastes  (lvl 12-20)
  { id: '2-1', chapter: 2, num: 1, name: 'Scorched March', energyCost: 8,
    enemyTeam: [E('boneknight', 12), E('fastghoul', 12), E('fastghoul', 12)],
    rewards: { gold: 200, exp: 100 }, firstClearBonus: { gems: 40 } },
  { id: '2-2', chapter: 2, num: 2, name: 'Lich-Haunted Mire', energyCost: 8,
    enemyTeam: [E('graveyardlich', 14, 4), E('shambler', 14), E('shambler', 14)],
    rewards: { gold: 220, exp: 110 }, firstClearBonus: { gems: 40 } },
  { id: '2-3', chapter: 2, num: 3, name: 'Bone Garden', energyCost: 10,
    enemyTeam: [E('boneknight', 16, 4), E('boneknight', 16, 4), E('fastghoul', 16)],
    rewards: { gold: 260, exp: 130 }, firstClearBonus: { gems: 60 } },
  { id: '2-4', chapter: 2, num: 4, name: 'Charred Sanctum', energyCost: 10,
    enemyTeam: [E('graveyardlich', 18), E('fastghoul', 18), E('boneknight', 18, 4)],
    rewards: { gold: 300, exp: 150 }, firstClearBonus: { gems: 60 } },
  { id: '2-5', chapter: 2, num: 5, name: 'Wastes Boss: Hollow Lich', energyCost: 12,
    enemyTeam: [E('graveyardlich', 20, 5), E('boneknight', 20, 4), E('fastghoul', 20, 4)],
    rewards: { gold: 500, exp: 220, items: { armor_4: 1 } }, firstClearBonus: { gems: 120 } },

  // Chapter 3 — Dread Court  (lvl 22-31)
  { id: '3-1', chapter: 3, num: 1, name: 'Throne of Bone', energyCost: 12,
    enemyTeam: [E('boneknight', 22, 4), E('boneknight', 22, 4), E('graveyardlich', 22, 4)],
    rewards: { gold: 380, exp: 200 }, firstClearBonus: { gems: 80 } },
  { id: '3-2', chapter: 3, num: 2, name: 'Lich Conclave', energyCost: 12,
    enemyTeam: [E('graveyardlich', 24, 5), E('graveyardlich', 24, 4), E('fastghoul', 24)],
    rewards: { gold: 420, exp: 220 }, firstClearBonus: { gems: 80 } },
  { id: '3-3', chapter: 3, num: 3, name: 'Necropolis Gate', energyCost: 14,
    enemyTeam: [E('boneknight', 27, 5), E('graveyardlich', 27, 4), E('graveyardlich', 27, 4)],
    rewards: { gold: 480, exp: 240 }, firstClearBonus: { gems: 100 } },
  { id: '3-4', chapter: 3, num: 4, name: 'Royal Vault', energyCost: 14,
    enemyTeam: [E('boneknight', 29, 5), E('graveyardlich', 29, 5), E('fastghoul', 29, 4)],
    rewards: { gold: 520, exp: 260 }, firstClearBonus: { gems: 100 } },
  { id: '3-5', chapter: 3, num: 5, name: 'Court Boss: The Crowned Lich', energyCost: 18,
    enemyTeam: [E('graveyardlich', 31, 5), E('boneknight', 31, 5), E('graveyardlich', 31, 5)],
    rewards: { gold: 1000, exp: 500, items: { sword_5: 1 } }, firstClearBonus: { gems: 250 } },

  // Chapter 4 — Whispering Crypts  (lvl 35-45)
  { id: '4-1', chapter: 4, num: 1, name: 'Crypt of Cinders', energyCost: 16,
    enemyTeam: [E('boneknight', 35, 5), E('graveyardlich', 35, 5), E('fastghoul', 35, 5)],
    rewards: { gold: 1100, exp: 600 }, firstClearBonus: { gems: 120 } },
  { id: '4-2', chapter: 4, num: 2, name: 'Sunken Reliquary', energyCost: 16,
    enemyTeam: [E('graveyardlich', 38, 5), E('graveyardlich', 38, 5), E('boneknight', 38, 5)],
    rewards: { gold: 1200, exp: 700 }, firstClearBonus: { gems: 130 } },
  { id: '4-3', chapter: 4, num: 3, name: 'Hall of Echoes', energyCost: 18,
    enemyTeam: [E('boneknight', 41, 5), E('boneknight', 41, 5), E('graveyardlich', 41, 5)],
    rewards: { gold: 1350, exp: 800 }, firstClearBonus: { gems: 140 } },
  { id: '4-4', chapter: 4, num: 4, name: 'The Singing Bones', energyCost: 18,
    enemyTeam: [E('graveyardlich', 43, 5), E('boneknight', 43, 5), E('fastghoul', 43, 5)],
    rewards: { gold: 1500, exp: 900 }, firstClearBonus: { gems: 150 } },
  { id: '4-5', chapter: 4, num: 5, name: 'Crypts Boss: The Worm of Names', energyCost: 22,
    enemyTeam: [E('graveyardlich', 45, 5), E('graveyardlich', 45, 5), E('boneknight', 45, 5)],
    rewards: { gold: 2500, exp: 1300, items: { armor_5: 1 } }, firstClearBonus: { gems: 350 } },

  // Chapter 5 — Pale Cathedral  (lvl 49-65)
  { id: '5-1', chapter: 5, num: 1, name: 'Frostbroken Nave', energyCost: 20,
    enemyTeam: [E('graveyardlich', 49, 5), E('boneknight', 49, 5), E('fastghoul', 49, 5)],
    rewards: { gold: 1800, exp: 1100 }, firstClearBonus: { gems: 170 } },
  { id: '5-2', chapter: 5, num: 2, name: 'Pale Choir', energyCost: 20,
    enemyTeam: [E('graveyardlich', 53, 5), E('graveyardlich', 53, 5), E('graveyardlich', 53, 5)],
    rewards: { gold: 2000, exp: 1250 }, firstClearBonus: { gems: 180 } },
  { id: '5-3', chapter: 5, num: 3, name: 'Cracked Altar', energyCost: 22,
    enemyTeam: [E('boneknight', 57, 5), E('boneknight', 57, 5), E('graveyardlich', 57, 5)],
    rewards: { gold: 2200, exp: 1400 }, firstClearBonus: { gems: 200 } },
  { id: '5-4', chapter: 5, num: 4, name: 'Bone Pulpit', energyCost: 22,
    enemyTeam: [E('graveyardlich', 61, 5), E('boneknight', 61, 5), E('boneknight', 61, 5)],
    rewards: { gold: 2400, exp: 1550 }, firstClearBonus: { gems: 220 } },
  { id: '5-5', chapter: 5, num: 5, name: 'Cathedral Boss: The Silent Pontiff', energyCost: 26,
    enemyTeam: [E('graveyardlich', 65, 5), E('graveyardlich', 65, 5), E('graveyardlich', 65, 5)],
    rewards: { gold: 4500, exp: 2200, items: { helm_5: 1 } }, firstClearBonus: { gems: 500 } },

  // Chapter 6 — World's Edge  (lvl 69-85)
  { id: '6-1', chapter: 6, num: 1, name: 'Cliffs of Forgetting', energyCost: 24,
    enemyTeam: [E('boneknight', 69, 5), E('graveyardlich', 69, 5), E('fastghoul', 69, 5)],
    rewards: { gold: 3200, exp: 1800 }, firstClearBonus: { gems: 240 } },
  { id: '6-2', chapter: 6, num: 2, name: 'Tideless Sea', energyCost: 24,
    enemyTeam: [E('graveyardlich', 73, 5), E('graveyardlich', 73, 5), E('boneknight', 73, 5)],
    rewards: { gold: 3500, exp: 2000 }, firstClearBonus: { gems: 260 } },
  { id: '6-3', chapter: 6, num: 3, name: 'Last Light', energyCost: 26,
    enemyTeam: [E('boneknight', 77, 5), E('graveyardlich', 77, 5), E('graveyardlich', 77, 5)],
    rewards: { gold: 3800, exp: 2250 }, firstClearBonus: { gems: 280 } },
  { id: '6-4', chapter: 6, num: 4, name: 'The Cold Beyond', energyCost: 26,
    enemyTeam: [E('graveyardlich', 81, 5), E('boneknight', 81, 5), E('graveyardlich', 81, 5)],
    rewards: { gold: 4100, exp: 2500 }, firstClearBonus: { gems: 300 } },
  { id: '6-5', chapter: 6, num: 5, name: 'World End: The Quiet Crown', energyCost: 32,
    enemyTeam: [E('graveyardlich', 85, 5), E('graveyardlich', 85, 5), E('graveyardlich', 85, 5)],
    rewards: { gold: 7500, exp: 4000, items: { amulet_5: 1 } }, firstClearBonus: { gems: 800 } },

  // Chapter 7 — Undead Vanguard  (lvl 89-110)
  { id: '7-1', chapter: 7, num: 1, name: 'Vanguard Outpost', energyCost: 26,
    enemyTeam: [E('undead_archer', 89, 5), E('skeletal_warhorse', 89, 5), E('undead_archer', 89, 5)],
    rewards: { gold: 4400, exp: 2400 }, firstClearBonus: { gems: 320 } },
  { id: '7-2', chapter: 7, num: 2, name: 'Plague Camp', energyCost: 26,
    enemyTeam: [E('plague_caster', 94, 5), E('carrion_spider', 94, 5), E('plague_caster', 94, 5)],
    rewards: { gold: 4700, exp: 2600 }, firstClearBonus: { gems: 340 } },
  { id: '7-3', chapter: 7, num: 3, name: 'Wraithwood Crossing', energyCost: 28,
    enemyTeam: [E('wailing_wraith', 99, 5), E('phantom_knight', 99, 5), E('wailing_wraith', 99, 5)],
    rewards: { gold: 5100, exp: 2900 }, firstClearBonus: { gems: 360 } },
  { id: '7-4', chapter: 7, num: 4, name: "Captain's March", energyCost: 28,
    enemyTeam: [E('phantom_knight', 104, 5), E('undead_archer', 104, 5), E('skeletal_warhorse', 104, 5)],
    rewards: { gold: 5500, exp: 3200 }, firstClearBonus: { gems: 400 } },
  { id: '7-5', chapter: 7, num: 5, name: 'Vanguard Boss: The Fallen Captain', energyCost: 36,
    enemyTeam: [E('phantom_knight', 108, 5), E('fallen_captain', 110, 6), E('wailing_wraith', 108, 5)],
    rewards: { gold: 9000, exp: 4800, items: { weapon_5: 1 } }, firstClearBonus: { gems: 900 } },

  // Chapter 8 — Zombie Legion  (lvl 114-135)
  { id: '8-1', chapter: 8, num: 1, name: 'Legion Muster', energyCost: 30,
    enemyTeam: [E('zombie_knight', 114, 5), E('zombie_berserker', 114, 5), E('zombie_knight', 114, 5)],
    rewards: { gold: 5500, exp: 3200 }, firstClearBonus: { gems: 440 } },
  { id: '8-2', chapter: 8, num: 2, name: 'Shield Wall', energyCost: 30,
    enemyTeam: [E('shield_bearer', 119, 5), E('zombie_berserker', 119, 5), E('shield_bearer', 119, 5)],
    rewards: { gold: 5800, exp: 3400 }, firstClearBonus: { gems: 460 } },
  { id: '8-3', chapter: 8, num: 3, name: 'Wild Hunt', energyCost: 32,
    enemyTeam: [E('rotwolf', 124, 5), E('bone_bear', 124, 5), E('rotwolf', 124, 5)],
    rewards: { gold: 6200, exp: 3700 }, firstClearBonus: { gems: 480 } },
  { id: '8-4', chapter: 8, num: 4, name: 'Necromancer\'s Conclave', energyCost: 32,
    enemyTeam: [E('zombie_mage', 129, 5), E('grave_channeler', 129, 5), E('zombie_mage', 129, 5)],
    rewards: { gold: 6700, exp: 4000 }, firstClearBonus: { gems: 520 } },
  { id: '8-5', chapter: 8, num: 5, name: 'Legion Boss: The Soul Leech', energyCost: 42,
    enemyTeam: [E('grave_channeler', 133, 5), E('soul_leech', 135, 6), E('zombie_knight', 133, 5)],
    rewards: { gold: 11000, exp: 5600, items: { armor_5: 1 } }, firstClearBonus: { gems: 1100 } },

  // Chapter 9 — Necromancer's Court  (lvl 140-156, leads into ch10 at 158)
  { id: '9-1', chapter: 9, num: 1, name: 'Open Graves', energyCost: 36,
    enemyTeam: [E('grave_digger', 140, 5), E('grave_digger', 140, 5), E('grave_digger', 140, 5)],
    rewards: { gold: 7000, exp: 4200 }, firstClearBonus: { gems: 600 } },
  { id: '9-2', chapter: 9, num: 2, name: 'Shadow-Bound', energyCost: 36,
    enemyTeam: [E('possessed_corpse', 144, 5), E('possessed_corpse', 144, 5), E('possessed_corpse', 144, 5)],
    rewards: { gold: 7400, exp: 4400 }, firstClearBonus: { gems: 620 } },
  { id: '9-3', chapter: 9, num: 3, name: 'Plague Sanctum', energyCost: 38,
    enemyTeam: [E('plague_monk', 148, 5), E('plague_monk', 148, 5), E('plague_monk', 148, 5)],
    rewards: { gold: 7800, exp: 4700 }, firstClearBonus: { gems: 660 } },
  { id: '9-4', chapter: 9, num: 4, name: 'The Final Procession', energyCost: 38,
    enemyTeam: [E('possessed_corpse', 152, 5), E('plague_monk', 152, 5), E('grave_digger', 152, 5)],
    rewards: { gold: 8400, exp: 5100 }, firstClearBonus: { gems: 720 } },
  { id: '9-5', chapter: 9, num: 5, name: 'Court Boss: The Necromancer', energyCost: 48,
    enemyTeam: [E('plague_monk', 154, 5), E('necromancer', 156, 6), E('possessed_corpse', 154, 5)],
    rewards: { gold: 14000, exp: 7200, items: { weapon_5: 1, armor_5: 1 } }, firstClearBonus: { gems: 1400 } },

  // ============ CHAPTERS 10-29 — Post-Necromancer endgame arc ============
  // After the Necromancer falls, the wound he opened keeps bleeding. The
  // world's dead are now self-organizing. Each chapter explores a fresh
  // facet of the apocalypse — drowned cities, plague spires, sky-borne
  // parasites, the shattered mirror world — culminating in the BoneWake
  // itself awakening for the final fight.

  // Ch10 — The Abyssal Maw
  // === Ch 10-14: NECROPOLIS ROYALTY ===
  // royal_lich, bone_executioner, gilded_revenant, crypt_assassin, plague_priest
  ...mkChapter({ chapter: 10, baseLevel: 158, baseGold: 8000, baseExp: 4500, baseEnergy: 42, baseGems: 650, bossEnemy: 'royal_lich',
    stages: [
      { name: 'Lip of the Maw',             enemies: ['crypt_assassin', 'plague_priest', 'crawling_torso'] },
      { name: 'First Descent',              enemies: ['plague_priest', 'crypt_assassin', 'chained_prisoner'] },
      { name: 'The Hum Below',              enemies: ['bone_executioner', 'crypt_assassin', 'drowned_lurker'] },
      { name: 'Marrow Spines',              enemies: ['gilded_revenant', 'bone_executioner', 'hangman'] },
      { name: 'Maw Boss: Royal Lich',       enemies: ['gilded_revenant', 'royal_lich', 'bone_executioner'] },
    ]}),
  ...mkChapter({ chapter: 11, baseLevel: 160, baseGold: 9500, baseExp: 5200, baseEnergy: 44, baseGems: 700, bossEnemy: 'bone_executioner',
    stages: [
      { name: 'Drowned Pier',               enemies: ['crypt_assassin', 'plague_priest', 'maggot_host'] },
      { name: 'Bloated March',              enemies: ['plague_priest', 'gilded_revenant', 'acid_vomiter'] },
      { name: 'Salt-Soaked Halls',          enemies: ['gilded_revenant', 'royal_lich', 'plague_bride'] },
      { name: 'The Long Pier',              enemies: ['royal_lich', 'bone_executioner', 'butcher_zombie'] },
      { name: 'Tide Boss: The Executioner', enemies: ['gilded_revenant', 'bone_executioner', 'royal_lich'] },
    ]}),
  ...mkChapter({ chapter: 12, baseLevel: 162, baseGold: 11000, baseExp: 5900, baseEnergy: 46, baseGems: 750, bossEnemy: 'gilded_revenant',
    stages: [
      { name: 'Burnt Wall',                 enemies: ['gilded_revenant', 'crypt_assassin', 'conjoined_horror'] },
      { name: 'Starved Bailey',             enemies: ['plague_priest', 'bone_executioner', 'bloated_glutton'] },
      { name: 'Watch of Bones',             enemies: ['royal_lich', 'gilded_revenant', 'stitched_brute'] },
      { name: 'The Iron Pyre',              enemies: ['bone_executioner', 'royal_lich', 'crypt_wyvern'] },
      { name: 'Famine Boss: Gilded King',   enemies: ['royal_lich', 'gilded_revenant', 'bone_executioner'] },
    ]}),
  ...mkChapter({ chapter: 13, baseLevel: 164, baseGold: 12500, baseExp: 6600, baseEnergy: 48, baseGems: 800, bossEnemy: 'crypt_assassin',
    stages: [
      { name: 'First Spire',                enemies: ['crypt_assassin', 'plague_priest', 'crypt_assassin'] },
      { name: 'Choking Stairs',             enemies: ['plague_priest', 'crypt_assassin', 'plague_priest'] },
      { name: 'Coughing Throne',            enemies: ['gilded_revenant', 'crypt_assassin', 'gilded_revenant'] },
      { name: 'Black Vein',                 enemies: ['plague_priest', 'royal_lich', 'plague_priest'] },
      { name: 'Spire Boss: The Twin Daggers', enemies: ['crypt_assassin', 'crypt_assassin', 'royal_lich'] },
    ]}),
  ...mkChapter({ chapter: 14, baseLevel: 166, baseGold: 14000, baseExp: 7300, baseEnergy: 50, baseGems: 850, bossEnemy: 'plague_priest',
    stages: [
      { name: 'Twilight Walk',              enemies: ['plague_priest', 'obsidian_knight', 'crypt_assassin'] },
      { name: 'Last Sunbeam',               enemies: ['plague_priest', 'royal_lich', 'plague_priest'] },
      { name: 'Silent Choir',               enemies: ['gilded_revenant', 'plague_priest', 'gilded_revenant'] },
      { name: 'Crown of Crows',             enemies: ['royal_lich', 'bone_executioner', 'royal_lich'] },
      { name: 'Sun Boss: The Plague Saint', enemies: ['royal_lich', 'plague_priest', 'gilded_revenant'] },
    ]}),

  // === Ch 15-19: ABYSSAL CRYPTS ===
  // void_zombie, abyssal_warden, shade_caller, dread_knight, corpse_hound
  ...mkChapter({ chapter: 15, baseLevel: 168, baseGold: 15500, baseExp: 8000, baseEnergy: 52, baseGems: 900, bossEnemy: 'dread_knight',
    stages: [
      { name: 'Ember Road',                 enemies: ['void_zombie', 'corpse_hound', 'void_zombie'] },
      { name: 'Smouldering Hall',           enemies: ['shade_caller', 'void_zombie', 'shade_caller'] },
      { name: 'Throne of Cinders',          enemies: ['abyssal_warden', 'shade_caller', 'abyssal_warden'] },
      { name: 'Crown Spire',                enemies: ['dread_knight', 'abyssal_warden', 'dread_knight'] },
      { name: 'Ash Boss: Dread Knight',     enemies: ['abyssal_warden', 'dread_knight', 'shade_caller'] },
    ]}),
  ...mkChapter({ chapter: 16, baseLevel: 170, baseGold: 17000, baseExp: 8700, baseEnergy: 54, baseGems: 950, bossEnemy: 'abyssal_warden',
    stages: [
      { name: 'Rotwood Trail',              enemies: ['corpse_hound', 'corpse_hound', 'void_zombie'] },
      { name: 'Hollow Thicket',             enemies: ['void_zombie', 'shade_caller', 'void_zombie'] },
      { name: 'Antler Glen',                enemies: ['shade_caller', 'dread_knight', 'shade_caller'] },
      { name: 'Wormwood Gate',              enemies: ['dread_knight', 'abyssal_warden', 'dread_knight'] },
      { name: 'March Boss: Abyssal Warden', enemies: ['dread_knight', 'abyssal_warden', 'corpse_hound'] },
    ]}),
  ...mkChapter({ chapter: 17, baseLevel: 172, baseGold: 18500, baseExp: 9400, baseEnergy: 56, baseGems: 1000, bossEnemy: 'shade_caller',
    stages: [
      { name: 'Wrecked Quay',               enemies: ['corpse_hound', 'shade_caller', 'corpse_hound'] },
      { name: 'Ghost Galleon',              enemies: ['shade_caller', 'void_zombie', 'shade_caller'] },
      { name: 'Black Tides',                enemies: ['void_zombie', 'shade_caller', 'void_zombie'] },
      { name: 'Plague Wharf',               enemies: ['abyssal_warden', 'shade_caller', 'abyssal_warden'] },
      { name: 'Harbor Boss: Shade Caller',  enemies: ['dread_knight', 'shade_caller', 'abyssal_warden'] },
    ]}),
  ...mkChapter({ chapter: 18, baseLevel: 174, baseGold: 20000, baseExp: 10100, baseEnergy: 58, baseGems: 1050, bossEnemy: 'corpse_hound',
    stages: [
      { name: 'Mirage Road',                enemies: ['corpse_hound', 'corpse_hound', 'void_zombie'] },
      { name: 'Sand-Veiled Tomb',           enemies: ['void_zombie', 'corpse_hound', 'void_zombie'] },
      { name: 'Pillared Necropolis',        enemies: ['shade_caller', 'corpse_hound', 'shade_caller'] },
      { name: 'Withered Oasis',             enemies: ['dread_knight', 'corpse_hound', 'dread_knight'] },
      { name: 'Salt Boss: Hound King',      enemies: ['abyssal_warden', 'corpse_hound', 'corpse_hound'] },
    ]}),
  ...mkChapter({ chapter: 19, baseLevel: 176, baseGold: 21500, baseExp: 10800, baseEnergy: 60, baseGems: 1100, bossEnemy: 'void_zombie',
    stages: [
      { name: 'Freezing Mouth',             enemies: ['void_zombie', 'shade_caller', 'void_zombie'] },
      { name: 'Forge of Ice',               enemies: ['void_zombie', 'abyssal_warden', 'void_zombie'] },
      { name: 'Anvil of Bone',              enemies: ['shade_caller', 'void_zombie', 'shade_caller'] },
      { name: 'Black Bellows',              enemies: ['dread_knight', 'void_zombie', 'dread_knight'] },
      { name: 'Forge Boss: The Void Risen', enemies: ['abyssal_warden', 'void_zombie', 'dread_knight'] },
    ]}),

  // === Ch 20-24: COSMIC CORRUPTION ===
  // starfall_lich, void_juggernaut, astral_archer, orb_caster, soul_devourer
  ...mkChapter({ chapter: 20, baseLevel: 178, baseGold: 23000, baseExp: 11500, baseEnergy: 62, baseGems: 1150, bossEnemy: 'starfall_lich',
    stages: [
      { name: 'Shard Plains',               enemies: ['astral_archer', 'orb_caster', 'astral_archer'] },
      { name: 'Mirror Tomb',                enemies: ['orb_caster', 'soul_devourer', 'orb_caster'] },
      { name: 'Reflecting Court',           enemies: ['void_juggernaut', 'orb_caster', 'void_juggernaut'] },
      { name: 'Crystal Spine',              enemies: ['soul_devourer', 'void_juggernaut', 'soul_devourer'] },
      { name: 'Glass Boss: Starfall Lich',  enemies: ['void_juggernaut', 'starfall_lich', 'orb_caster'] },
    ]}),
  ...mkChapter({ chapter: 21, baseLevel: 180, baseGold: 24500, baseExp: 12200, baseEnergy: 64, baseGems: 1200, bossEnemy: 'void_juggernaut',
    stages: [
      { name: 'Wing-Black Ridge',           enemies: ['astral_archer', 'astral_archer', 'orb_caster'] },
      { name: 'Skyless Vault',              enemies: ['orb_caster', 'soul_devourer', 'orb_caster'] },
      { name: 'Falling Cloister',           enemies: ['soul_devourer', 'starfall_lich', 'soul_devourer'] },
      { name: 'The High Plague',            enemies: ['starfall_lich', 'void_juggernaut', 'starfall_lich'] },
      { name: 'Sky Boss: Void Juggernaut',  enemies: ['void_juggernaut', 'void_juggernaut', 'starfall_lich'] },
    ]}),
  ...mkChapter({ chapter: 22, baseLevel: 182, baseGold: 26000, baseExp: 12900, baseEnergy: 66, baseGems: 1250, bossEnemy: 'astral_archer',
    stages: [
      { name: 'Dusk Road',                  enemies: ['astral_archer', 'astral_archer', 'orb_caster'] },
      { name: 'Hollow Vespers',             enemies: ['astral_archer', 'soul_devourer', 'astral_archer'] },
      { name: 'Final Dusk',                 enemies: ['orb_caster', 'astral_archer', 'orb_caster'] },
      { name: 'Mourning Vault',             enemies: ['starfall_lich', 'astral_archer', 'starfall_lich'] },
      { name: 'Dusk Boss: Astral Archer',   enemies: ['orb_caster', 'astral_archer', 'soul_devourer'] },
    ]}),
  ...mkChapter({ chapter: 23, baseLevel: 184, baseGold: 27500, baseExp: 13600, baseEnergy: 68, baseGems: 1300, bossEnemy: 'orb_caster',
    stages: [
      { name: 'Iron Vein',                  enemies: ['orb_caster', 'astral_archer', 'orb_caster'] },
      { name: 'Pulse Tunnels',              enemies: ['astral_archer', 'orb_caster', 'astral_archer'] },
      { name: 'Blood Atrium',               enemies: ['orb_caster', 'soul_devourer', 'orb_caster'] },
      { name: 'Heart Chamber',              enemies: ['starfall_lich', 'orb_caster', 'starfall_lich'] },
      { name: 'Vein Boss: Orb Conclave',    enemies: ['orb_caster', 'orb_caster', 'starfall_lich'] },
    ]}),
  ...mkChapter({ chapter: 24, baseLevel: 186, baseGold: 29000, baseExp: 14300, baseEnergy: 70, baseGems: 1350, bossEnemy: 'soul_devourer',
    stages: [
      { name: 'Ash Cloister',               enemies: ['soul_devourer', 'orb_caster', 'soul_devourer'] },
      { name: 'Cinder Halls',               enemies: ['soul_devourer', 'astral_archer', 'soul_devourer'] },
      { name: 'Burnt Confessional',         enemies: ['soul_devourer', 'starfall_lich', 'soul_devourer'] },
      { name: 'Smoking Pews',               enemies: ['void_juggernaut', 'soul_devourer', 'void_juggernaut'] },
      { name: 'Choir Boss: Soul Devourer',  enemies: ['starfall_lich', 'soul_devourer', 'void_juggernaut'] },
    ]}),

  // === Ch 25-29: FINAL APOCALYPSE ===
  // apocalypse_horror, world_eater_husk, blood_titan, ash_lord, final_revenant
  ...mkChapter({ chapter: 25, baseLevel: 188, baseGold: 30500, baseExp: 15000, baseEnergy: 72, baseGems: 1400, bossEnemy: 'apocalypse_horror',
    stages: [
      { name: 'Threshold Plains',           enemies: ['blood_titan', 'ash_lord', 'blood_titan'] },
      { name: 'Veiled Gate',                enemies: ['ash_lord', 'world_eater_husk', 'ash_lord'] },
      { name: 'Beyond the Veil',            enemies: ['world_eater_husk', 'apocalypse_horror', 'world_eater_husk'] },
      { name: 'Other Court',                enemies: ['apocalypse_horror', 'final_revenant', 'apocalypse_horror'] },
      { name: 'Veil Boss: Apocalypse',      enemies: ['world_eater_husk', 'apocalypse_horror', 'blood_titan'] },
    ]}),
  ...mkChapter({ chapter: 26, baseLevel: 190, baseGold: 32000, baseExp: 15700, baseEnergy: 74, baseGems: 1450, bossEnemy: 'world_eater_husk',
    stages: [
      { name: 'Throne Approach',            enemies: ['blood_titan', 'world_eater_husk', 'blood_titan'] },
      { name: 'Crimson Halls',              enemies: ['world_eater_husk', 'ash_lord', 'world_eater_husk'] },
      { name: 'Sanguine Court',             enemies: ['apocalypse_horror', 'world_eater_husk', 'apocalypse_horror'] },
      { name: 'Inner Wound',                enemies: ['world_eater_husk', 'final_revenant', 'world_eater_husk'] },
      { name: 'Throne Boss: World-Eater',   enemies: ['blood_titan', 'world_eater_husk', 'apocalypse_horror'] },
    ]}),
  ...mkChapter({ chapter: 27, baseLevel: 192, baseGold: 33500, baseExp: 16400, baseEnergy: 76, baseGems: 1500, bossEnemy: 'blood_titan',
    stages: [
      { name: 'Black Roots',                enemies: ['blood_titan', 'ash_lord', 'blood_titan'] },
      { name: 'Worm Hollow',                enemies: ['ash_lord', 'blood_titan', 'ash_lord'] },
      { name: 'Twisted Grove',              enemies: ['apocalypse_horror', 'blood_titan', 'apocalypse_horror'] },
      { name: 'Mother Tree',                enemies: ['world_eater_husk', 'blood_titan', 'world_eater_husk'] },
      { name: 'Wood Boss: Blood Titan',     enemies: ['ash_lord', 'blood_titan', 'apocalypse_horror'] },
    ]}),
  ...mkChapter({ chapter: 28, baseLevel: 194, baseGold: 35000, baseExp: 17100, baseEnergy: 78, baseGems: 1550, bossEnemy: 'ash_lord',
    stages: [
      { name: 'Sea of Corpses',             enemies: ['ash_lord', 'blood_titan', 'ash_lord'] },
      { name: 'Tide Wall',                  enemies: ['ash_lord', 'world_eater_husk', 'ash_lord'] },
      { name: 'Drowning March',             enemies: ['ash_lord', 'apocalypse_horror', 'ash_lord'] },
      { name: 'Wave of Bone',               enemies: ['ash_lord', 'final_revenant', 'ash_lord'] },
      { name: 'Tide Boss: Ash Lord',        enemies: ['blood_titan', 'ash_lord', 'world_eater_husk'] },
    ]}),
  ...mkChapter({ chapter: 29, baseLevel: 196, baseGold: 38000, baseExp: 18000, baseEnergy: 80, baseGems: 1700, bossEnemy: 'final_revenant',
    bossItems: { weapon_5: 1, armor_5: 1, amulet_5: 1 },
    stages: [
      { name: 'Dreaming Vault',             enemies: ['apocalypse_horror', 'world_eater_husk', 'apocalypse_horror'] },
      { name: "Wake's Edge",                enemies: ['blood_titan', 'ash_lord', 'blood_titan'] },
      { name: 'First Wake',                 enemies: ['world_eater_husk', 'final_revenant', 'world_eater_husk'] },
      { name: 'Final Procession',           enemies: ['ash_lord', 'final_revenant', 'ash_lord'] },
      { name: 'Final Boss: The BoneWake Itself', enemies: ['blood_titan', 'final_revenant', 'apocalypse_horror'] },
    ]}),
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map(s => [s.id, s]));

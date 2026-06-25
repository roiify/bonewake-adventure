// Boss Echoes — meta-progression collectibles dropped by special-mode
// bosses (World Boss, Shatter). The player owns up to 14, equips up to 5
// in account-wide loadout slots, and each equipped echo applies a passive
// effect to every battle. Effects are intentionally bounded so they can't
// snowball into 100% crit / invincibility / one-shots.
//
// Slot unlock cadence is tied to player level so echo investment scales
// alongside everything else.
//
// Drop rule (enforced in BattlePlayPage):
//   - First-ever defeat of a boss → 100% drop of its echo
//   - Subsequent defeats → 15% drop chance (idempotent — won't dup)

export type EchoEffect =
  | { kind: 'basic_dmg_mult';      value: number }   // +N% basic-attack dmg (decimal)
  | { kind: 'ult_dmg_mult';        value: number }   // +N% ult dmg
  | { kind: 'crit_dmg_bonus';      value: number }   // additive to crit mult (+0.25 = 1.5→1.75)
  | { kind: 'crit_chance_per_enemy'; value: number } // +N crit per alive enemy
  | { kind: 'squad_dodge_bonus';   value: number }   // +N% flat dodge to all squad
  | { kind: 'squad_hp_mult';       value: number }   // +N% maxHp to all squad (applied at battle init)
  | { kind: 'full_hp_atk_mult';    value: number }   // +N% atk while at maxHp
  | { kind: 'low_hp_dmg_mult';     value: number }   // +N% dmg when hp < 30% maxHp
  | { kind: 'first_round_spd_mult';value: number }   // +N% spd on round 1 only
  | { kind: 'lifesteal_basic';     value: number }   // basic attacks heal attacker for N% of dmg
  | { kind: 'boss_dmg_mult';       value: number }   // +N% dmg vs enemies with star >= 5
  | { kind: 'mage_dmg_reduction';  value: number }   // -N% dmg taken from mage enemies
  | { kind: 'stack_per_turn_dmg';  value: number; cap: number } // +N% dmg per round, capped
  | { kind: 'revive_first_fallen'; value: number };  // one-time revive at N% HP

export interface EchoDef {
  id: string;            // matches boss id
  bossId: string;        // boss source (same as id for now)
  name: string;          // user-facing echo name (not the boss name)
  bossName: string;      // for "dropped by" display
  flavor: string;
  effect: EchoEffect;
  effectText: string;    // human-readable summary
}

export const ECHOES: EchoDef[] = [
  // === Mythical creature echoes (World Boss drops) ===
  { id: 'bonewake_dragon', bossId: 'bonewake_dragon',
    name: 'Dragonbreath',         bossName: 'Bonewake Dragon',
    flavor: 'Its first roar still ignites the air it left.',
    effect: { kind: 'basic_dmg_mult', value: 0.15 },
    effectText: '+15% basic-attack damage' },

  { id: 'plague_hydra', bossId: 'plague_hydra',
    name: 'Triple Threat',        bossName: 'Plague Hydra',
    flavor: 'Three skulls. Three fangs. Three openings to bleed through.',
    effect: { kind: 'crit_chance_per_enemy', value: 0.03 },
    effectText: '+3% crit chance per alive enemy (max +9%)' },

  { id: 'rot_phoenix', bossId: 'rot_phoenix',
    name: 'Reborn from Ash',      bossName: 'Rot Phoenix',
    flavor: 'A dying ember refuses to be quiet.',
    effect: { kind: 'revive_first_fallen', value: 0.30 },
    effectText: 'Revive the first fallen ally at 30% HP (once per battle)' },

  { id: 'bone_cerberus', bossId: 'bone_cerberus',
    name: 'Hellgate',             bossName: 'Bone Cerberus',
    flavor: 'Untouched, it strikes hardest.',
    effect: { kind: 'full_hp_atk_mult', value: 0.20 },
    effectText: '+20% ATK while at full HP' },

  { id: 'wraith_kraken', bossId: 'wraith_kraken',
    name: 'Drowned',              bossName: 'Wraith Kraken',
    flavor: 'The mist clings. Strikes pass through.',
    effect: { kind: 'squad_dodge_bonus', value: 0.08 },
    effectText: '+8% dodge chance to the entire squad' },

  { id: 'necro_sphinx', bossId: 'necro_sphinx',
    name: "Riddle's Toll",        bossName: 'Necro Sphinx',
    flavor: 'It asks. It already knows.',
    effect: { kind: 'mage_dmg_reduction', value: 0.15 },
    effectText: '-15% damage taken from mage enemies' },

  { id: 'crimson_centaur', bossId: 'crimson_centaur',
    name: 'First Charge',         bossName: 'Crimson Centaur',
    flavor: 'Hoofbeats heard before the dawn line.',
    effect: { kind: 'first_round_spd_mult', value: 0.50 },
    effectText: '+50% SPD on round 1 only' },

  // === Humanoid overlord echoes (Shatter drops) ===
  { id: 'lich_king', bossId: 'lich_king',
    name: 'Ascension',            bossName: 'The Lich King',
    flavor: 'The crown decides who lasts.',
    effect: { kind: 'ult_dmg_mult', value: 0.20 },
    effectText: '+20% ultimate damage' },

  { id: 'bone_titan', bossId: 'bone_titan',
    name: 'Bulwark',              bossName: 'Bone Titan',
    flavor: 'Built from those who walked too far.',
    effect: { kind: 'squad_hp_mult', value: 0.15 },
    effectText: '+15% squad maximum HP' },

  { id: 'plague_doctor', bossId: 'plague_doctor',
    name: 'Quarantine',           bossName: 'The Plague Doctor',
    flavor: 'It treats the strong first.',
    effect: { kind: 'boss_dmg_mult', value: 0.25 },
    effectText: '+25% damage to bosses (★5 enemies and higher)' },

  { id: 'ash_empress', bossId: 'ash_empress',
    name: 'Final Word',           bossName: 'Ash Empress',
    flavor: 'Said with her last breath. Heard for a thousand years.',
    effect: { kind: 'low_hp_dmg_mult', value: 0.30 },
    effectText: '+30% damage when below 30% HP' },

  { id: 'soul_reaper', bossId: 'soul_reaper',
    name: 'Harvest',              bossName: 'The Soul Reaper',
    flavor: 'It does not take. It receives.',
    effect: { kind: 'lifesteal_basic', value: 0.08 },
    effectText: '8% lifesteal on basic attacks' },

  { id: 'voidlord', bossId: 'voidlord',
    name: 'Void Strike',          bossName: 'Voidlord',
    flavor: 'Where the blade lands, nothing was.',
    effect: { kind: 'crit_dmg_bonus', value: 0.25 },
    effectText: '+25% extra critical damage (1.5× → 1.75×)' },

  { id: 'worm_god', bossId: 'worm_god',
    name: 'Decay',                bossName: 'The Worm God',
    flavor: 'It already knew the ending.',
    effect: { kind: 'stack_per_turn_dmg', value: 0.03, cap: 0.15 },
    effectText: '+3% damage per round (caps at +15%)' },
];

export const ECHO_BY_ID = Object.fromEntries(ECHOES.map(e => [e.id, e]));
export const ECHO_BY_BOSS = Object.fromEntries(ECHOES.map(e => [e.bossId, e]));

// Loadout slot count keyed to player level so the system scales with
// account progression — at lvl 1 you get one slot, at lvl 160 you get 5.
export function unlockedEchoSlots(playerLevel: number): number {
  if (playerLevel >= 160) return 5;
  if (playerLevel >= 120) return 4;
  if (playerLevel >= 80)  return 3;
  if (playerLevel >= 40)  return 2;
  return 1;
}
export const ECHO_SLOT_UNLOCK_LEVELS = [1, 40, 80, 120, 160] as const;

// First-ever defeat = guaranteed drop. Subsequent = 15%.
export const FIRST_KILL_DROP_RATE = 1.0;
export const REPEAT_DROP_RATE = 0.15;

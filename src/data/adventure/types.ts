// Adventure-mode tilemap schema. The core fields (id/name/w/h/tile/ground/
// solid/spawn) are required and shared with the M0 spike; the rest are the M1
// content layer (warps, NPCs, encounters, shrines, pickups, gates) and are all
// OPTIONAL so the M0 test room still satisfies the type. See docs/RPG_DESIGN.md.

export type Dir = 'south' | 'east' | 'west' | 'north';
export type Biome = 'town' | 'field' | 'crypt';
export type Track = 'menu' | 'battle' | 'boss';

/** Map-edge / doorway transition to another map. */
export interface Warp {
  x: number;
  y: number;
  toMap: string;
  toX: number;
  toY: number;
  facing: Dir;
}

/** A talkable character standing on the map. */
export interface NPC {
  id: string;
  sprite: string;       // hero/enemy sprite key, e.g. 'luna' (loads <key>_<dir>.png)
  x: number;
  y: number;
  facing: Dir;
  dialogueId: string;   // key into DIALOGUE
  altDialogueId?: string; // used instead of dialogueId once altFlag is set
  altFlag?: string;
  recruits?: string;    // templateId added to the party when dialogue completes
  shop?: boolean;       // opens the (stub) shop after dialogue
  heal?: boolean;       // full-heals + saves the party (The Tender)
  hideAfterFlag?: string;  // NPC disappears once this story flag is set
  requiresFlag?: string;   // NPC only present once this flag is set
}

/** Random-encounter region: step-accumulator builds danger while inside it. */
export interface EncounterZone {
  x: number;
  y: number;
  w: number;
  h: number;
  enemies: string[];    // pool of enemy template ids
  min: number;          // min enemies per battle
  max: number;          // max enemies per battle
  minLevel: number;
  maxLevel: number;
  dangerBase: number;   // average steps to trigger (jittered +-25%)
  bgChapter: number;    // CHAPTER_BG index for the battle backdrop
}

/** Visible enemy you can see & bump into; one-shot (never respawns once cleared). */
export interface FixedEncounter {
  id: string;            // unique; recorded in the save's defeated[] list
  sprite: string;        // overworld enemy sprite key, e.g. 'boneknight'
  x: number;
  y: number;
  facing: Dir;
  enemies: string[];     // exact enemy template ids in the fight
  levels: number[];      // level per enemy (parallel to enemies)
  bgChapter: number;
  bossBanterId?: string; // e.g. '1-5' -> shown pre-battle
  isBoss?: boolean;      // boss music + aura render
  setsFlag?: string;     // story flag set true when defeated
  requiresFlag?: string; // only present once this flag is set (e.g. boss after patrols)
}

/** Save point: writes the adventure row + full-heals. */
export interface Shrine {
  x: number;
  y: number;
}

/** A walk-over item that sets a story flag (e.g. the Cure Fragment). */
export interface Pickup {
  id: string;
  x: number;
  y: number;
  sprite?: string;
  setsFlag: string;
  dialogueId?: string;
  requiresFlag?: string;
}

/** A door that is solid until its flag is set (cleared patrols, accepted quest…). */
export interface GateDoor {
  x: number;
  y: number;
  openFlag: string;
}

export interface Sign {
  x: number;
  y: number;
  dialogueId: string;
}

// A procedurally-generated dungeon floor (see dungeons.ts). Drives a fixed
// enemy "wave" the engine spawns on entry; clear it to reveal the stairs down.
export interface DungeonMeta {
  id: string;
  floor: number;
  enemies: string[];
  count: number;
  level: number;
  boss: boolean;
  descend: { x: number; y: number };
  exit: { x: number; y: number };
}

export interface AdventureMap {
  id: string;
  name: string;
  w: number;
  h: number;
  tile: number;
  dungeon?: DungeonMeta;      // present on generated dungeon floors
  ground: number[];          // row-major floor variant ids (cosmetic)
  solid: number[];           // row-major collision: 1 = blocked
  spawn: { x: number; y: number; facing: Dir };
  biome?: Biome;
  music?: Track;
  warps?: Warp[];
  npcs?: NPC[];
  encounterZones?: EncounterZone[];
  fixedEncounters?: FixedEncounter[];
  shrines?: Shrine[];
  pickups?: Pickup[];
  gateDoors?: GateDoor[];
  signs?: Sign[];
}

/** A line of dialogue: speaker + the text shown. */
export interface DialogueLine {
  who: string;
  text: string;
}

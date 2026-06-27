import { create } from 'zustand';
import type { Dir } from '../data/adventure/types';
import type { GearPiece } from '../data/adventure/units';

// Diablo-style character SLOTS. Each slot is an independent playthrough: a
// created hero with its own level/exp/gear/depth/skills/story-flags/position.
// All in localStorage. Nothing inherited from the gacha game.
export interface PartyMember {
  heroId: string;
  level: number;
  exp: number;
  gear: GearPiece[];
}

export interface AdvSave {
  id: string;
  createdHero: string;   // the hero you created this slot as (== party[0])
  mapId: string;
  px: number;
  py: number;
  facing: Dir;
  party: PartyMember[];  // [0] = your character; rest = recruited companions
  flags: Record<string, boolean>;
  defeated: string[];
  cureProgress: number;
  depth: number;         // best dungeon floor reached (any dungeon)
  skills: string[];      // unlocked skill ids (reserved for the skill system)
  createdAt: number;
  dungeon: { id: string; floor: number } | null;  // current dungeon run (null = overworld/town)
  dungeonDepth: Record<string, number>;            // deepest floor per dungeon
}

const KEY = 'bonewake_adv_slots';
let counter = 0;
const newId = () => `c${Date.now().toString(36)}${counter++}`;

function freshSlot(heroId: string): AdvSave {
  return {
    id: newId(), createdHero: heroId, mapId: 'lastlight', px: -1, py: -1, facing: 'south',
    party: [{ heroId, level: 1, exp: 0, gear: [] }], flags: {}, defeated: [], cureProgress: 0,
    depth: 0, skills: [], createdAt: Date.now(), dungeon: null, dungeonDepth: {},
  };
}
function readSlots(): AdvSave[] {
  try { const r = localStorage.getItem(KEY); if (r) { const a = JSON.parse(r); if (Array.isArray(a)) return a; } } catch { /* ignore */ }
  return [];
}
function writeSlots(s: AdvSave[]) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }

interface AdventureState {
  slots: AdvSave[];
  activeId: string | null;
  save: AdvSave;          // the active slot (valid only while activeId != null)
  loaded: boolean;
  load: () => void;
  createSlot: (heroId: string) => void;
  selectSlot: (id: string) => void;
  deleteSlot: (id: string) => void;
  exitToSelect: () => void;
  patch: (p: Partial<AdvSave>) => void;
}

export const useAdventure = create<AdventureState>((set, get) => ({
  slots: [],
  activeId: null,
  save: freshSlot('reiji'),
  loaded: false,
  load: () => set({ slots: readSlots(), loaded: true }),
  createSlot: (heroId) => {
    const s = freshSlot(heroId);
    const slots = [...get().slots, s];
    writeSlots(slots);
    set({ slots, activeId: s.id, save: s });
  },
  selectSlot: (id) => { const s = get().slots.find((x) => x.id === id); if (s) set({ activeId: id, save: s }); },
  deleteSlot: (id) => {
    const slots = get().slots.filter((x) => x.id !== id);
    writeSlots(slots);
    set({ slots, activeId: get().activeId === id ? null : get().activeId });
  },
  exitToSelect: () => set({ activeId: null }),
  patch: (p) => {
    const merged = { ...get().save, ...p };
    const slots = get().slots.map((s) => (s.id === merged.id ? merged : s));
    writeSlots(slots);
    set({ save: merged, slots });
  },
}));

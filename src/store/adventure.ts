import { create } from 'zustand';
import type { Dir } from '../data/adventure/types';
import type { GearPiece } from '../data/adventure/units';

// Self-contained Adventure save (localStorage). No Dexie, no gacha stores —
// the party (with per-hero level/exp/gear), story flags, and position live here.
export interface PartyMember {
  heroId: string;        // HEROES[] key (also the sprite key)
  level: number;
  exp: number;
  gear: GearPiece[];     // equipped pieces (one per slot, replaced on upgrade)
}

export interface AdvSave {
  mapId: string;
  px: number;            // tile x (-1 = use map spawn)
  py: number;
  facing: Dir;
  party: PartyMember[];  // [0] = leader (the hero you control)
  flags: Record<string, boolean>;
  defeated: string[];
  cureProgress: number;
}

const KEY = 'bonewake_adventure_save';

function fresh(): AdvSave {
  return { mapId: 'lastlight', px: -1, py: -1, facing: 'south', party: [{ heroId: 'kengo', level: 1, exp: 0, gear: [] }], flags: {}, defeated: [], cureProgress: 0 };
}

function read(): AdvSave {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const j = JSON.parse(raw);
      const def = fresh();
      return { ...def, ...j, party: Array.isArray(j.party) && j.party.length ? j.party : def.party, flags: j.flags ?? {}, defeated: j.defeated ?? [] };
    }
  } catch { /* ignore */ }
  return fresh();
}

interface AdventureState {
  save: AdvSave;
  loaded: boolean;
  load: () => void;
  patch: (p: Partial<AdvSave>) => void;
}

export const useAdventure = create<AdventureState>((set, get) => ({
  save: fresh(),
  loaded: false,
  load: () => set({ save: read(), loaded: true }),
  patch: (p) => {
    const merged = { ...get().save, ...p };
    try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch { /* ignore */ }
    set({ save: merged });
  },
}));

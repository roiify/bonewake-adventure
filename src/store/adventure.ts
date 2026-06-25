import { create } from 'zustand';
import { db, DEFAULT_ADVENTURE, type AdventureSave } from '../lib/db';

// zustand-over-Dexie singleton, mirroring useProfile: load() reads the row,
// patch() writes Dexie first then memory. Holds ONLY exploration/story state —
// the hero roster/gear/levels live in the shared heroes/equipment tables.
interface AdventureState {
  save: AdventureSave;
  loaded: boolean;
  load: () => Promise<void>;
  patch: (p: Partial<AdventureSave>) => Promise<void>;
  setFlag: (key: string, value?: boolean) => Promise<void>;
}

export const useAdventure = create<AdventureState>((set, get) => ({
  save: { ...DEFAULT_ADVENTURE },
  loaded: false,
  load: async () => {
    const a = await db.adventure.get('me');
    set(a ? { save: a, loaded: true } : { save: { ...DEFAULT_ADVENTURE }, loaded: true });
  },
  patch: async (p) => {
    const merged = { ...get().save, ...p, id: 'me' };
    await db.adventure.put(merged);
    set({ save: merged });
  },
  setFlag: async (key, value = true) => {
    const cur = get().save;
    const flags = { ...cur.flags, [key]: value };
    await get().patch({ flags });
  },
}));

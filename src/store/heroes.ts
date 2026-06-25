import { create } from 'zustand';
import { db, type OwnedHero, type OwnedEquipment } from '../lib/db';
import { pickOwnerFor } from '../data/loot';
import { HIDDEN_HERO_IDS } from '../data/heroes';

interface HeroesState {
  heroes: OwnedHero[];
  equipment: OwnedEquipment[];
  loaded: boolean;
  load: () => Promise<void>;
  addHero: (h: OwnedHero) => Promise<void>;
  updateHero: (id: string, patch: Partial<OwnedHero>) => Promise<void>;
  addEquipment: (e: OwnedEquipment) => Promise<void>;
  updateEquipment: (id: string, patch: Partial<OwnedEquipment>) => Promise<void>;
}

export const useHeroes = create<HeroesState>((set, get) => ({
  heroes: [],
  equipment: [],
  loaded: false,
  load: async () => {
    const heroes = await db.heroes.toArray();
    // One-time migration: gear is hero-specific now. Assign an owner to
    // every piece that predates the binding system — worn gear belongs to
    // its wearer, loose gear goes to a random hero of the right class.
    const migratedFlag = 'bonewake_gear_owners_v1';
    if (!localStorage.getItem(migratedFlag)) {
      const eqs = await db.equipment.toArray();
      const heroById = new Map(heroes.map(h => [h.id, h]));
      const owned = [...new Set(heroes.map(h => h.templateId).filter(t => !HIDDEN_HERO_IDS.has(t)))];
      for (const e of eqs) {
        if (e.boundTo) continue;
        const wearer = e.equippedTo ? heroById.get(e.equippedTo) : undefined;
        const owner = e.setRestrictedTo ?? wearer?.templateId ?? pickOwnerFor(e.baseType ?? '', owned);
        if (owner) await db.equipment.update(e.id, { boundTo: owner });
      }
      localStorage.setItem(migratedFlag, '1');
    }
    const equipment = await db.equipment.toArray();
    set({ heroes, equipment, loaded: true });
  },
  addHero: async (h) => {
    await db.heroes.add(h);
    set({ heroes: [...get().heroes, h] });
  },
  updateHero: async (id, patch) => {
    await db.heroes.update(id, patch);
    set({ heroes: get().heroes.map(h => h.id === id ? { ...h, ...patch } : h) });
  },
  addEquipment: async (e) => {
    await db.equipment.add(e);
    set({ equipment: [...get().equipment, e] });
  },
  updateEquipment: async (id, patch) => {
    await db.equipment.update(id, patch);
    set({ equipment: get().equipment.map(e => e.id === id ? { ...e, ...patch } : e) });
  },
}));

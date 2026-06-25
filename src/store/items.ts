import { create } from 'zustand';
import { db, type OwnedItem } from '../lib/db';

interface ItemsState {
  items: OwnedItem[];
  loaded: boolean;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  getCount: (templateId: string) => number;
}

export const useItems = create<ItemsState>((set, get) => ({
  items: [],
  loaded: false,
  load: async () => {
    const items = await db.items.toArray();
    set({ items, loaded: true });
  },
  refresh: async () => {
    const items = await db.items.toArray();
    set({ items });
  },
  getCount: (templateId) => {
    return get().items.find(i => i.templateId === templateId)?.count ?? 0;
  },
}));

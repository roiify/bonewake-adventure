import { create } from 'zustand';
import { db, type Profile, DEFAULT_PROFILE, normalizeSettings, energyCapForLevel } from '../lib/db';
import { xpForLevel, setPlayerLevelForBoost, setEquippedEchoes, PLAYER_MAX_LEVEL } from '../lib/stats';

interface ProfileState {
  profile: Profile;
  loaded: boolean;
  load: () => Promise<void>;
  patch: (p: Partial<Profile>) => Promise<void>;
  addGold: (n: number) => Promise<void>;
  spendGold: (n: number) => Promise<boolean>;
  addGems: (n: number) => Promise<void>;
  spendGems: (n: number) => Promise<boolean>;
  addFriendPoints: (n: number) => Promise<void>;
  spendFriendPoints: (n: number) => Promise<boolean>;
  spendEnergy: (n: number) => Promise<boolean>;
  gainExp: (n: number) => Promise<void>;
}

export const useProfile = create<ProfileState>((set, get) => ({
  profile: { ...DEFAULT_PROFILE },
  loaded: false,
  load: async () => {
    const p = await db.profile.get({ id: 'me' });
    if (p) {
      const normalized = { ...p, settings: normalizeSettings(p.settings) };
      if (JSON.stringify(p.settings) !== JSON.stringify(normalized.settings)) {
        await db.profile.put(normalized);
      }
      set({ profile: normalized, loaded: true });
      setPlayerLevelForBoost(normalized.level);
      setEquippedEchoes(normalized.equippedEchoes ?? []);
    } else set({ loaded: true });
  },
  patch: async (p) => {
    const current = get().profile;
    const merged = { ...current, ...p };
    await db.profile.put(merged);
    set({ profile: merged });
    if (p.level != null) setPlayerLevelForBoost(merged.level);
    if (p.equippedEchoes != null) setEquippedEchoes(merged.equippedEchoes ?? []);
  },
  addGold: async (n) => {
    const p = get().profile;
    await get().patch({ gold: p.gold + n });
  },
  spendGold: async (n) => {
    const p = get().profile;
    if (p.gold < n) return false;
    await get().patch({ gold: p.gold - n });
    return true;
  },
  addGems: async (n) => {
    const p = get().profile;
    await get().patch({ gems: p.gems + n });
  },
  spendGems: async (n) => {
    const p = get().profile;
    if (p.gems < n) return false;
    await get().patch({ gems: p.gems - n });
    return true;
  },
  addFriendPoints: async (n) => {
    const p = get().profile;
    await get().patch({ friendPoints: p.friendPoints + n });
  },
  spendFriendPoints: async (n) => {
    const p = get().profile;
    if (p.friendPoints < n) return false;
    await get().patch({ friendPoints: p.friendPoints - n });
    return true;
  },
  spendEnergy: async (n) => {
    const p = get().profile;
    if (p.energy < n) return false;
    await get().patch({ energy: p.energy - n });
    return true;
  },
  gainExp: async (n) => {
    let p = get().profile;
    const startLevel = p.level;
    let level = p.level;
    let exp = p.exp + n;
    // Account-level ceiling — stop accruing levels at the cap and
    // discard any overflow exp so a player can't bank +200,000 xp into
    // PLAYER_MAX_LEVEL and instantly outscale every endgame stage.
    while (level < PLAYER_MAX_LEVEL && exp >= xpForLevel(level)) {
      exp -= xpForLevel(level);
      level++;
    }
    if (level >= PLAYER_MAX_LEVEL) exp = 0;
    // On level-up, refill energy to the (level-scaled) cap — common gacha
    // pattern that keeps players playing.
    const leveledUp = level > startLevel;
    await get().patch({
      level,
      exp,
      ...(leveledUp ? { energy: energyCapForLevel(level), lastEnergyTick: Date.now() } : {}),
    });
  },
}));

// Squad presets — up to 5 named configs in localStorage.
export interface SquadPreset {
  name: string;
  heroIds: string[];   // owned hero IDs (not template IDs — these are user-instance IDs)
}

const KEY = 'bonewake_squad_presets';
export const MAX_PRESETS = 5;

export function loadPresets(): SquadPreset[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function savePresets(presets: SquadPreset[]) {
  localStorage.setItem(KEY, JSON.stringify(presets.slice(0, MAX_PRESETS)));
}

export function upsertPreset(name: string, heroIds: string[]) {
  const all = loadPresets();
  const idx = all.findIndex(p => p.name === name);
  if (idx >= 0) all[idx] = { name, heroIds };
  else all.push({ name, heroIds });
  savePresets(all);
}

export function deletePreset(name: string) {
  const all = loadPresets().filter(p => p.name !== name);
  savePresets(all);
}

// Set the currently active squad (used by all battle flows)
const SQUAD_KEY = 'bonewake_squad';
export function setActiveSquad(heroIds: string[]) {
  localStorage.setItem(SQUAD_KEY, JSON.stringify(heroIds));
}

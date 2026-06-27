import { useState } from 'react';
import { useAdventure } from '../../store/adventure';
import { ROSTER, HEROES } from '../../data/adventure/units';
import { ADVENTURE_MAPS } from '../../data/adventure/maps';
import HeroPortrait from './HeroPortrait';

const MAX_SLOTS = 6;
const ELE_COLOR: Record<string, string> = { fire: '#e0654a', water: '#5aa9e0', earth: '#7aa34a', light: '#e0cf6b', dark: '#a06bd0' };

// Diablo-style character select. Each slot is an independent run with its own
// hero, level, gear, depth, and story progress.
export default function CharacterSelect() {
  const slots = useAdventure((s) => s.slots);
  const createSlot = useAdventure((s) => s.createSlot);
  const selectSlot = useAdventure((s) => s.selectSlot);
  const deleteSlot = useAdventure((s) => s.deleteSlot);
  const [creating, setCreating] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-[#140d10] to-[#0b0809] text-zinc-100">
      <div className="max-w-[680px] mx-auto px-4 py-6">
        <div className="text-center mb-1">
          <h1 className="font-[Georgia] text-3xl font-bold tracking-wide text-white" style={{ textShadow: '0 2px 16px rgba(192,57,43,.4)' }}>BONEWAKE</h1>
          <div className="text-red-400/80 text-xs tracking-[0.3em] uppercase">Adventure</div>
        </div>
        <p className="text-center text-zinc-500 text-xs mb-5">{creating ? 'Choose a survivor to begin a new run' : 'Choose your character'}</p>

        {creating ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROSTER.map((h) => (
                <button key={h.id} type="button" onClick={() => createSlot(h.id)}
                  className="flex items-center gap-2 p-2 rounded-xl border border-zinc-700 bg-zinc-900/80 hover:border-red-600 active:bg-zinc-800 text-left">
                  <div className="shrink-0 flex items-end"><HeroPortrait heroId={h.id} w={44} h={56} /></div>
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-100 truncate">{h.name}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{h.role}</div>
                    <div className="text-[10px] mt-0.5 flex items-center gap-1">
                      <span style={{ color: ELE_COLOR[h.element] }}>●</span>
                      <span className="text-zinc-500">{h.ranged ? 'ranged' : 'melee'}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setCreating(false)}
              className="mt-4 w-full py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 text-sm active:bg-zinc-800">← Back</button>
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {slots.map((s) => {
              const def = HEROES[s.createdHero];
              const leader = s.party[0];
              return (
                <div key={s.id} className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-3 flex gap-3">
                  <div className="shrink-0 flex items-end"><HeroPortrait heroId={s.createdHero} w={56} h={64} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-100 text-base font-semibold truncate">{def?.name ?? s.createdHero}</span>
                      <span style={{ color: ELE_COLOR[def?.element ?? 'dark'] }} className="text-xs">●</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">{def?.role}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mt-1">
                      <span className="text-amber-400">Lv {leader?.level ?? 1}</span>
                      <span className="text-sky-400">Depth {s.depth}</span>
                      <span className="text-zinc-500">{ADVENTURE_MAPS[s.mapId]?.name ?? s.mapId}</span>
                      {s.party.length > 1 && <span className="text-zinc-500">· {s.party.length}-hero party</span>}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => selectSlot(s.id)}
                        className="flex-1 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-xs font-semibold border border-red-700">▶ Play</button>
                      {confirmDel === s.id ? (
                        <button type="button" onClick={() => { deleteSlot(s.id); setConfirmDel(null); }}
                          className="px-3 py-1.5 rounded-lg bg-red-950 text-red-300 text-xs border border-red-800">Confirm?</button>
                      ) : (
                        <button type="button" onClick={() => setConfirmDel(s.id)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs border border-zinc-700">🗑</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {slots.length < MAX_SLOTS && (
              <button type="button" onClick={() => setCreating(true)}
                className="rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/40 hover:border-red-600 hover:bg-zinc-900/70 p-3 min-h-[112px] flex flex-col items-center justify-center text-zinc-400">
                <span className="text-3xl leading-none mb-1">+</span>
                <span className="text-xs">New Character</span>
              </button>
            )}

            {slots.length === 0 && (
              <div className="sm:col-span-2 text-center text-zinc-600 text-xs mt-2">No survivors yet — create one to enter the Bonewake.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

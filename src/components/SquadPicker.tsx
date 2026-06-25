import { useState, useEffect } from 'react';
import { useHeroes } from '../store/heroes';
import { HERO_BY_ID, HERO_PORTRAITS, HIDDEN_HERO_IDS } from '../data/heroes';
import { calcHeroStats } from '../lib/stats';
import { ensureMannySummons, MANNY_TPL } from '../lib/mannySummons';
import { HeroBadges } from './ui/HeroBadges';

// Shared squad display + inline edit grid used by every battle entrypoint
// that needs to let the player pick a team (Spirit Bomb, Dungeons, Tower,
// Trials, World Boss). Reads/writes the same `bonewake_squad` localStorage
// key that BattlePlayPage and the rest of the codebase rely on, so swapping
// squads from any page propagates everywhere.
//
// Manny handling: picking Manny replaces the entire squad with Manny + his
// two summons (one slot, but the squad-build code expects all three units).
// Unpicking Manny clears the squad. While Manny is in the squad, no other
// hero is selectable.

// Stacked archetype + element badges anchored to the top-right corner
// of a relative-positioned card — uses the shared HeroBadges component
// so look + colors match the rest of the game's hero displays.
function CornerBadges({ archetype, element }: { archetype: string; element?: string }) {
  return (
    <div className="absolute top-0.5 right-0.5 z-10">
      <HeroBadges archetype={archetype} element={element} size={18} />
    </div>
  );
}

const SQUAD_KEY = 'bonewake_squad';
function loadSquad(): string[] {
  try { return JSON.parse(localStorage.getItem(SQUAD_KEY) ?? '[]'); } catch { return []; }
}
function saveSquad(ids: string[]) {
  localStorage.setItem(SQUAD_KEY, JSON.stringify(ids));
}

interface Props {
  /** Optional label override — defaults to "Your Squad". */
  title?: string;
  /** Called after squad changes so the parent can re-render with the new list. */
  onChange?: (ids: string[]) => void;
}

export default function SquadPicker({ title = 'Your Squad', onChange }: Props) {
  const heroes = useHeroes(s => s.heroes);
  const equipment = useHeroes(s => s.equipment);
  const [squad, setSquad] = useState<string[]>(loadSquad());
  const [editing, setEditing] = useState(false);

  // Persist any squad mutation immediately + notify the parent.
  useEffect(() => {
    saveSquad(squad);
    onChange?.(squad);
  }, [squad]);

  async function toggleHero(hid: string) {
    const h = heroes.find(x => x.id === hid);
    const isManny = h?.templateId === MANNY_TPL;
    const mannyInSquad = squad.some(id => heroes.find(x => x.id === id)?.templateId === MANNY_TPL);
    if (squad.includes(hid)) {
      if (isManny) setSquad([]);
      else setSquad(squad.filter(id => id !== hid));
      return;
    }
    if (isManny) {
      const summonIds = await ensureMannySummons();
      setSquad([hid, ...summonIds]);
      return;
    }
    if (mannyInSquad) return;
    if (squad.length < 3) setSquad([...squad, hid]);
  }

  async function autoFill() {
    const eligible = heroes
      .filter(h => !HIDDEN_HERO_IDS.has(h.templateId))
      .filter(h => !!HERO_BY_ID[h.templateId])
      .map(h => ({ h, power: calcHeroStats(h, equipment).power }))
      .sort((a, b) => b.power - a.power);
    if (eligible.length === 0) return;
    // If Manny is in the top picks, special-case: he occupies the squad
    // alone (with his two summons auto-included via toggleHero).
    const topManny = eligible.find(e => e.h.templateId === MANNY_TPL);
    if (topManny && eligible[0].h.id === topManny.h.id) {
      const summonIds = await ensureMannySummons();
      setSquad([topManny.h.id, ...summonIds]);
      return;
    }
    setSquad(eligible.slice(0, 3).filter(e => e.h.templateId !== MANNY_TPL).map(e => e.h.id).slice(0, 3));
  }

  return (
    <div className="rounded-md border border-emerald-900/50 bg-emerald-950/20 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-pixel text-[10px] text-emerald-300">{title} ({squad.length}/3)</div>
        <div className="flex gap-1">
          <button
            className="btn-pixel text-[10px] px-2 py-1"
            onClick={autoFill}
            title="Auto-pick the top-3 heroes by power"
          >Auto</button>
          <button
            className="btn-pixel text-[10px] px-2 py-1"
            onClick={() => setSquad([])}
            disabled={squad.length === 0}
            title="Remove all heroes from the squad"
          >Clear</button>
          <button
            className="btn-pixel text-[10px] px-2 py-1"
            onClick={() => setEditing(e => !e)}
          >{editing ? 'Done' : 'Edit'}</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => {
          const id = squad[i];
          const h = id ? heroes.find(x => x.id === id) : undefined;
          if (!h) return (
            <button
              key={i}
              type="button"
              onClick={() => setEditing(true)}
              className="rounded border-2 border-dashed border-zinc-700 bg-zinc-950 aspect-square flex flex-col items-center justify-center gap-0.5 hover:border-emerald-500 hover:bg-emerald-950/30 active:scale-95 transition"
              aria-label="Add hero to squad"
            >
              <span className="text-2xl text-zinc-600 leading-none">＋</span>
              <span className="text-[10px] text-zinc-600">empty</span>
            </button>
          );
          const tpl = HERO_BY_ID[h.templateId];
          return (
            <div key={id} className="relative rounded border bg-zinc-950 p-1.5 text-center" style={{ borderColor: tpl.color }}>
              <CornerBadges archetype={tpl.archetype} element={tpl.element} />
              <div className="aspect-square flex items-center justify-center overflow-hidden">
                {HERO_PORTRAITS[tpl.id]
                  ? <img src={HERO_PORTRAITS[tpl.id]} alt={tpl.name} className="w-[90%] h-[90%] object-contain" style={{ imageRendering: 'pixelated' }} />
                  : <div className="text-2xl">{tpl.emoji}</div>}
              </div>
              <div className="text-[9px] truncate" style={{ color: tpl.color }}>{tpl.name}</div>
              <div className="text-[8px] text-zinc-500">LVL:{h.level}</div>
            </div>
          );
        })}
      </div>
      {editing && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {heroes.filter(h => !HIDDEN_HERO_IDS.has(h.templateId)).map(h => {
            const tpl = HERO_BY_ID[h.templateId];
            if (!tpl) return null;
            const stats = calcHeroStats(h, equipment);
            const inSquad = squad.includes(h.id);
            const mannyInSquad = squad.some(sid => heroes.find(x => x.id === sid)?.templateId === MANNY_TPL);
            const locked = mannyInSquad && h.templateId !== MANNY_TPL;
            return (
              <button
                key={h.id}
                onClick={() => toggleHero(h.id)}
                disabled={locked}
                className={`relative rounded p-1.5 text-center transition-all ${inSquad ? 'scale-105 ring-4 ring-amber-300' : ''} ${locked ? 'opacity-30 grayscale' : ''}`}
                style={{
                  borderWidth: inSquad ? 3 : 2,
                  borderStyle: 'solid',
                  borderColor: inSquad ? '#fbbf24' : tpl.color,
                  background: inSquad ? `${tpl.color}33` : '#09090b',
                  boxShadow: inSquad ? `0 0 18px ${tpl.color}, 0 0 8px #fbbf24` : undefined,
                }}
              >
                <CornerBadges archetype={tpl.archetype} element={tpl.element} />
                {inSquad && (
                  <div className="absolute -top-2 -left-2 z-10 w-6 h-6 rounded-full bg-amber-400 border-2 border-zinc-950 flex items-center justify-center text-zinc-950 font-pixel text-xs">
                    ✓
                  </div>
                )}
                <div className="aspect-square flex items-center justify-center overflow-hidden">
                  {HERO_PORTRAITS[tpl.id]
                    ? <img src={HERO_PORTRAITS[tpl.id]} alt={tpl.name} className="w-[90%] h-[90%] object-contain" style={{ imageRendering: 'pixelated' }} />
                    : <div className="text-2xl">{tpl.emoji}</div>}
                </div>
                <div className="text-[9px] truncate font-pixel" style={{ color: inSquad ? '#fde68a' : tpl.color }}>{tpl.name}</div>
                <div className="text-[8px] text-zinc-500">LVL:{h.level} ⚔{stats.power}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

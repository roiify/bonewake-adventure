import { useEffect, useRef, useState } from 'react';
import { AdventureEngine, type DialogueRequest, type PlayerStats } from '../lib/adventure/engine';
import type { Dir, DialogueLine } from '../data/adventure/types';
import { ADVENTURE_MAPS } from '../data/adventure/maps';
import { DIALOGUE } from '../data/adventure/dialogue';
import DialogueBox from '../components/adventure/DialogueBox';
import { useAdventure, type PartyMember } from '../store/adventure';
import { HEROES, heroStats, rollGear, gearScore, xpForLevel, HERO_MAX_LEVEL } from '../data/adventure/units';
import HeroPortrait from '../components/adventure/HeroPortrait';

// Hero strength knobs — player hits PLAYER_POWER× harder, PLAYER_HP_MULT× tankier.
const PLAYER_POWER = 2.4;
const PLAYER_HP_MULT = 1.5;

type Hud = { map: string; hp: number; maxHp: number; enemies: number; xp: number };

export default function AdventurePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AdventureEngine | null>(null);
  const respawnRef = useRef<(() => void) | null>(null);
  const leaderRef = useRef<string>('reiji'); // heroId of the controlled hero

  const [hud, setHud] = useState<Hud>({ map: 'lastlight', hp: 1, maxHp: 1, enemies: 0, xp: 0 });
  const [dialogue, setDialogue] = useState<{ lines: DialogueLine[]; req: DialogueRequest } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [lvl, setLvl] = useState<{ level: number; exp: number; need: number }>({ level: 1, exp: 0, need: 40 });
  const [banner, setBanner] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 1900); };

  // --- stats from the self-contained party ---
  const statsFor = (m: PartyMember | undefined): PlayerStats | null => {
    if (!m) return null;
    const def = HEROES[m.heroId];
    if (!def) return null;
    const s = heroStats(def, m.level, m.gear);
    return { templateId: m.heroId, maxHp: Math.round(s.hp * PLAYER_HP_MULT), atk: s.atk, def: s.def, spd: s.spd, crit: s.crit, element: def.element, ranged: def.ranged, power: PLAYER_POWER };
  };
  const allyStats = (party: PartyMember[]): PlayerStats[] =>
    party.slice(1).map((m) => statsFor(m)).filter((s): s is PlayerStats => !!s);
  const readLevel = () => {
    const m = useAdventure.getState().save.party[0];
    return m ? { level: m.level, exp: m.exp, need: xpForLevel(m.level) } : { level: 1, exp: 0, need: 40 };
  };

  // --- hero picker ---
  const partyList = () => useAdventure.getState().save.party.map((m) => ({ heroId: m.heroId, lvl: m.level, def: HEROES[m.heroId] }));
  const openPicker = () => { engineRef.current?.pause(); setShowPicker(true); };
  const closePicker = () => { setShowPicker(false); engineRef.current?.resume(); };
  const pickHero = (heroId: string) => {
    const adv = useAdventure.getState();
    const party = [...adv.save.party];
    const idx = party.findIndex((m) => m.heroId === heroId);
    if (idx > 0) { const [m] = party.splice(idx, 1); party.unshift(m); }
    adv.patch({ party });
    leaderRef.current = heroId;
    const st = statsFor(party[0]);
    if (st) engineRef.current?.setPlayer(st);
    engineRef.current?.setAllies(allyStats(party));
    setLvl(readLevel());
    closePicker();
  };

  // --- engine callbacks ---
  const onDialogue = (req: DialogueRequest) => setDialogue({ lines: DIALOGUE[req.dialogueId] ?? [], req });
  const onShrine = () => showToast('Saved at the Bone Shrine. Wounds mended.');
  const onAutosave = (map: string, x: number, y: number, facing: Dir) => useAdventure.getState().patch({ mapId: map, px: x, py: y, facing });
  const onHud = (h: Hud) => setHud(h);
  const onXp = (xp: number) => {
    const adv = useAdventure.getState();
    const party = adv.save.party.map((m) => ({ ...m }));
    let leaderLevelUp = 0;
    for (const m of party) {
      let level = m.level, exp = m.exp + xp;
      while (level < HERO_MAX_LEVEL && exp >= xpForLevel(level)) { exp -= xpForLevel(level); level += 1; }
      if (level !== m.level && m === party[0]) leaderLevelUp = level;
      m.level = level; m.exp = exp;
    }
    adv.patch({ party });
    const st = statsFor(party[0]);
    if (st) engineRef.current?.setPlayer(st);
    engineRef.current?.setAllies(allyStats(party));
    setLvl(readLevel());
    if (leaderLevelUp) showToast(`Level up! Lv ${leaderLevelUp} — stats raised`);
  };
  const onLoot = (itemLevel: number, isBoss: boolean) => {
    const g = rollGear(itemLevel, isBoss);
    const adv = useAdventure.getState();
    const party = adv.save.party.map((m) => ({ ...m, gear: [...m.gear] }));
    const leader = party[0];
    const idx = leader.gear.findIndex((x) => x.slot === g.slot);
    const cur = idx >= 0 ? leader.gear[idx] : null;
    if (!cur || gearScore(g) > gearScore(cur)) {
      if (idx >= 0) leader.gear[idx] = g; else leader.gear.push(g);
      adv.patch({ party });
      const st = statsFor(leader);
      if (st) engineRef.current?.setPlayer(st);
      showToast(`Looted & equipped: ${g.name}`);
    } else {
      showToast(`Looted: ${g.name} (weaker — discarded)`);
    }
  };
  const onFlag = (flag: string, fixedId?: string) => {
    const adv = useAdventure.getState();
    const flags = { ...adv.save.flags };
    if (flag) flags[flag] = true;
    const defeated = fixedId && !adv.save.defeated.includes(fixedId) ? [...adv.save.defeated, fixedId] : adv.save.defeated;
    if (flag === 'beat_first_lich') flags['cleared_old_burial_ground'] = true;
    const depth = flag === 'beat_first_lich' ? Math.max(adv.save.depth, 1) : adv.save.depth;
    adv.patch({ flags, defeated, depth });
    engineRef.current?.syncState({ flags, defeated });
    if (flag === 'beat_first_lich') {
      setBanner('DUNGEON CLEARED — The First Lich is destroyed. Grab the Cure Fragment, then leave through a door.');
      window.setTimeout(() => setBanner(null), 5000);
    }
  };
  const onDeath = () => { showToast('You fell. You wake at the last shrine.'); window.setTimeout(() => respawnRef.current?.(), 900); };

  const closeDialogue = () => {
    const cur = dialogue;
    setDialogue(null);
    if (cur) applyDialogue(cur.req);
    const s = useAdventure.getState().save;
    engineRef.current?.syncState({ flags: s.flags, defeated: s.defeated });
    engineRef.current?.resume();
  };

  const applyDialogue = (req: DialogueRequest) => {
    const adv = useAdventure.getState();
    if (req.recruits && HEROES[req.recruits] && !adv.save.party.some((m) => m.heroId === req.recruits) && adv.save.party.length < 4) {
      const leaderLvl = adv.save.party[0]?.level ?? 1;
      const party = [...adv.save.party, { heroId: req.recruits, level: leaderLvl, exp: 0, gear: [] }];
      adv.patch({ party, flags: { ...adv.save.flags, [`recruited_${req.recruits}`]: true } });
      engineRef.current?.setAllies(allyStats(party));
      showToast(`${HEROES[req.recruits].name} joined the party.`);
    }
    if (req.setsFlag) {
      const cure = req.pickupId === 'cure_frag' ? Math.min(100, adv.save.cureProgress + 3) : adv.save.cureProgress;
      adv.patch({ flags: { ...adv.save.flags, [req.setsFlag]: true }, cureProgress: cure });
      if (req.pickupId === 'cure_frag') showToast('Cure Research advanced — Stage 0. Bring it to Mara.');
    }
  };

  // --- mount ---
  useEffect(() => {
    const create = (opts?: { respawn?: boolean }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const adv = useAdventure.getState();
      const leader = adv.save.party[0];
      leaderRef.current = leader.heroId;
      const stats = statsFor(leader);
      if (!stats) return;
      let mapId = adv.save.mapId, px = adv.save.px, py = adv.save.py;
      const facing = adv.save.facing;
      if (opts?.respawn) {
        const shrine = ADVENTURE_MAPS[mapId]?.shrines?.[0];
        if (shrine) { px = shrine.x; py = shrine.y; } else { mapId = 'lastlight'; px = -1; py = -1; }
      }
      engineRef.current?.destroy();
      const engine = new AdventureEngine(canvas, {
        mapId, x: px, y: py, facing, player: stats, allies: allyStats(adv.save.party), flags: adv.save.flags, defeated: adv.save.defeated,
        cb: { onDialogue, onShrine, onAutosave, onHud, onXp, onDeath, onFlag, onLoot },
      });
      engineRef.current = engine;
      engine.start();
      setLvl(readLevel());
    };
    respawnRef.current = () => create({ respawn: true });
    create();
    return () => { engineRef.current?.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- touch controls ---
  const move = (dx: number, dy: number) => (e: React.PointerEvent) => { e.preventDefault(); engineRef.current?.setVirtualDir(dx, dy); };
  const stop = (e: React.PointerEvent) => { e.preventDefault(); engineRef.current?.setVirtualDir(0, 0); };
  const padBtn = (dx: number, dy: number, label: string) => (
    <button type="button" aria-label={label}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={move(dx, dy)} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      className="flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-800/90 text-zinc-200 text-xl active:bg-zinc-700 border border-zinc-700 select-none touch-none">{label}</button>
  );

  const mapName = ADVENTURE_MAPS[hud.map]?.name ?? '';
  const hpFrac = Math.max(0, Math.min(1, hud.hp / (hud.maxHp || 1)));

  return (
    <div className="h-full w-full max-w-[480px] mx-auto flex flex-col bg-zinc-950 text-zinc-100 select-none relative">
      {/* top bar: map + HP + hero swap */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
        <button type="button" aria-label="characters" onClick={() => useAdventure.getState().exitToSelect()}
          className="shrink-0 px-2 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-700 active:bg-zinc-700">‹</button>
        <div className="text-[11px] tracking-widest uppercase text-red-400/80 shrink-0">{mapName}</div>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-3 rounded bg-zinc-800 overflow-hidden border border-zinc-700">
            <div className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-[width] duration-150" style={{ width: `${hpFrac * 100}%` }} />
          </div>
          <span className="font-mono text-[10px] text-zinc-400 w-[58px] text-right">{hud.hp}/{hud.maxHp}</span>
        </div>
        <button type="button" onClick={openPicker}
          className="shrink-0 px-2 py-1 rounded-lg bg-zinc-800 text-zinc-200 text-[11px] border border-zinc-700 active:bg-zinc-700">⇄ Hero</button>
      </div>

      {/* level + XP bar */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-zinc-900 bg-zinc-950/60">
        <span className="text-amber-400 text-[11px] font-bold shrink-0">Lv {lvl.level}</span>
        <div className="flex-1 h-2 rounded bg-zinc-800 overflow-hidden border border-zinc-800">
          <div className="h-full bg-amber-500 transition-[width] duration-150" style={{ width: lvl.level >= HERO_MAX_LEVEL ? '100%' : `${Math.min(100, (lvl.exp / (lvl.need || 1)) * 100)}%` }} />
        </div>
        <span className="font-mono text-[9px] text-zinc-500 shrink-0">{lvl.level >= HERO_MAX_LEVEL ? 'MAX' : `XP ${lvl.exp}/${lvl.need}`}</span>
      </div>

      {/* canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-2 relative">
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', cursor: 'crosshair', touchAction: 'none' }}
          className="w-full max-w-[460px] h-auto rounded-lg border border-zinc-800 shadow-[0_0_40px_rgba(192,57,43,0.18)]" />
        {dialogue && <DialogueBox lines={dialogue.lines} onClose={closeDialogue} />}
        {toast && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg bg-zinc-900/95 border border-red-900/50 text-xs text-zinc-100 shadow-lg max-w-[90%] text-center">{toast}</div>}
        {banner && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none p-4">
            <div className="px-5 py-3 rounded-xl bg-zinc-950/95 border-2 border-red-700 text-center shadow-[0_0_40px_rgba(192,57,43,0.45)]">
              <div className="text-red-400 text-base font-bold tracking-widest uppercase mb-1">Dungeon Cleared</div>
              <div className="text-zinc-300 text-[11px] max-w-[300px]">{banner.replace('DUNGEON CLEARED — ', '')}</div>
            </div>
          </div>
        )}
        <div className="absolute top-2 right-3 text-[10px] font-mono text-zinc-500">{hud.enemies > 0 ? `${hud.enemies} enemies` : ''}</div>
      </div>

      {/* hero picker */}
      {showPicker && (
        <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4" onClick={closePicker}>
          <div className="w-full max-w-[420px] rounded-xl border border-red-900/50 bg-zinc-950 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-widest text-red-400/90">Choose your hero</h2>
              <button type="button" onClick={closePicker} className="text-zinc-500 text-lg leading-none px-1">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {partyList().map((p) => {
                const active = leaderRef.current === p.heroId;
                return (
                  <button key={p.heroId} type="button" onClick={() => pickHero(p.heroId)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left ${active ? 'border-red-500 bg-red-950/40' : 'border-zinc-700 bg-zinc-900 active:bg-zinc-800'}`}>
                    <div className="shrink-0"><HeroPortrait heroId={p.heroId} w={40} h={48} /></div>
                    <div className="min-w-0">
                      <div className="text-zinc-100 text-sm truncate">{p.def?.name ?? p.heroId}{active && ' ●'}</div>
                      <div className="text-zinc-500 text-[10px] capitalize truncate">{p.def?.role} · {p.def?.element} · Lv {p.lvl}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-zinc-600 text-[10px] mt-3 text-center">Pick who you control. Recruit more heroes by talking to allies (Luna in Lastlight, Elara at the dungeon mouth).</p>
          </div>
        </div>
      )}

      {/* controls */}
      <div className="px-4 pb-6 pt-2">
        <p className="text-center text-[11px] text-zinc-600 mb-3">WASD/arrows move · <span className="text-zinc-400">J</span> attack (hold) · <span className="text-zinc-400">Space/Shift</span> dodge · <span className="text-zinc-400">E</span> talk</p>
        <div className="flex items-end justify-between max-w-[340px] mx-auto">
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
            <div />{padBtn(0, -1, '▲')}<div />
            {padBtn(-1, 0, '◀')}<div className="w-14 h-14" />{padBtn(1, 0, '▶')}
            <div />{padBtn(0, 1, '▼')}<div />
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="dodge"
              onPointerDown={(e) => { e.preventDefault(); engineRef.current?.dodge(); }}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-zinc-800/90 text-zinc-200 text-lg border border-zinc-700 active:bg-zinc-700 select-none touch-none">➤</button>
            <button type="button" aria-label="attack"
              onPointerDown={(e) => { e.preventDefault(); engineRef.current?.attackAuto(); }}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-red-900/70 text-zinc-100 text-2xl border border-red-800 active:bg-red-800 select-none touch-none">⚔</button>
          </div>
        </div>
      </div>
    </div>
  );
}

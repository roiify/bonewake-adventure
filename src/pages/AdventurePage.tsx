import { useEffect, useRef, useState } from 'react';
import { AdventureEngine, type DialogueRequest, type PlayerStats } from '../lib/adventure/engine';
import type { Dir, DialogueLine } from '../data/adventure/types';
import { ADVENTURE_MAPS } from '../data/adventure/maps';
import { DIALOGUE } from '../data/adventure/dialogue';
import DialogueBox from '../components/adventure/DialogueBox';
import { useAdventure, type PartyMember } from '../store/adventure';
import { HEROES, heroStats, rollItem, xpForLevel, HERO_MAX_LEVEL, type Item, type Rarity } from '../data/adventure/units';
import { DUNGEONS, DUNGEON_BY_ID, genFloor, isUnlocked } from '../data/adventure/dungeons';
import { RUNTIME_MAPS } from '../data/adventure/runtime';
import HeroPortrait from '../components/adventure/HeroPortrait';
import GearPanels, { type PanelMode } from '../components/adventure/GearPanels';

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
  const [showDungeons, setShowDungeons] = useState(false);
  const [panel, setPanel] = useState<PanelMode | null>(null);
  const gold = useAdventure((s) => s.save.gold);

  const showToast = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 1900); };
  const openPanel = (p: PanelMode) => { engineRef.current?.pause(); setShowDungeons(false); setPanel(p); };
  const closePanel = () => { setPanel(null); engineRef.current?.resume(); };
  const reapplyStats = () => { const st = statsFor(useAdventure.getState().save.party[0]); if (st) engineRef.current?.setPlayer(st); };

  // --- stats from the self-contained party ---
  const statsFor = (m: PartyMember | undefined): PlayerStats | null => {
    if (!m) return null;
    const def = HEROES[m.heroId];
    if (!def) return null;
    const items = Object.values(m.equipped ?? {}).filter((x): x is Item => !!x);
    const s = heroStats(def, m.level, items);
    return { templateId: m.heroId, maxHp: Math.round(s.hp * PLAYER_HP_MULT), atk: s.atk, def: s.def, spd: s.spd, crit: s.crit, element: def.element, ranged: def.ranged, power: PLAYER_POWER * (1 + s.power) };
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
    adv.patch({ party, gold: adv.save.gold + Math.max(1, Math.round(xp * 0.5)) });
    const st = statsFor(party[0]);
    if (st) engineRef.current?.setPlayer(st);
    engineRef.current?.setAllies(allyStats(party));
    setLvl(readLevel());
    if (leaderLevelUp) showToast(`Level up! Lv ${leaderLevelUp} — stats raised`);
  };
  // ground loot → the controlled character's backpack (Diablo-style; equip via Inventory)
  const onPickupLoot = (itemLevel: number, rarity: number) => {
    const adv = useAdventure.getState();
    const leader = adv.save.party[0];
    const def = HEROES[leader?.heroId];
    const it = rollItem(itemLevel, { ranged: def?.ranged, forceRarity: rarity as Rarity });
    const party = adv.save.party.map((m, i) => (i === 0 ? { ...m, inventory: [it, ...m.inventory] } : m));
    adv.patch({ party });
    showToast(`Looted: ${it.name}`);
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
  // --- dungeon flow ---
  const enterDungeon = (id: string) => {
    const d = DUNGEON_BY_ID[id]; if (!d) return;
    if (!isUnlocked(d, useAdventure.getState().save.dungeonDepth)) { showToast('That descent is still barred.'); return; }
    const m = genFloor(d, 1); RUNTIME_MAPS[m.id] = m;
    useAdventure.getState().patch({ dungeon: { id, floor: 1 }, mapId: m.id, px: -1, py: -1, facing: 'north' });
    setShowDungeons(false);
    engineRef.current?.loadMap(m.id, -1, -1, 'north');
    showToast(`Entering ${d.name} — Floor 1`);
  };
  const onExitTown = () => {
    useAdventure.getState().patch({ dungeon: null, mapId: 'lastlight', px: -1, py: -1, facing: 'south' });
    engineRef.current?.loadMap('lastlight', -1, -1, 'south');
  };
  const onDescend = () => {
    const adv = useAdventure.getState(); const cur = adv.save.dungeon; if (!cur) return;
    const d = DUNGEON_BY_ID[cur.id]; if (!d) return;
    const floor = cur.floor + 1; const m = genFloor(d, floor); RUNTIME_MAPS[m.id] = m;
    const dd = { ...adv.save.dungeonDepth, [cur.id]: Math.max(adv.save.dungeonDepth[cur.id] ?? 0, floor) };
    adv.patch({ dungeon: { id: cur.id, floor }, mapId: m.id, px: -1, py: -1, facing: 'north', depth: Math.max(adv.save.depth, floor), dungeonDepth: dd });
    engineRef.current?.loadMap(m.id, -1, -1, 'north');
    showToast(`Descending — Floor ${floor}`);
  };
  const onFloorClearedCb = () => showToast('Floor cleared — the stairs down are open. (Red portal = town)');
  const onDeath = () => {
    const inDungeon = !!useAdventure.getState().save.dungeon;
    showToast(inDungeon ? 'You fell. Dragged back to Lastlight…' : 'You fell. You wake at the last shrine.');
    window.setTimeout(() => { if (useAdventure.getState().save.dungeon) onExitTown(); else respawnRef.current?.(); }, 900);
  };

  const closeDialogue = () => {
    const cur = dialogue;
    setDialogue(null);
    if (cur) applyDialogue(cur.req);
    const s = useAdventure.getState().save;
    engineRef.current?.syncState({ flags: s.flags, defeated: s.defeated });
    // Town NPCs open their panels instead of resuming the engine.
    const npc = cur?.req.npcId;
    if (npc === 'warden') setShowDungeons(true);
    else if (npc === 'joss') setPanel('shop');
    else if (npc === 'smith') setPanel('craft');
    else if (npc === 'keeper') setPanel('stash');
    else engineRef.current?.resume();
  };

  const applyDialogue = (req: DialogueRequest) => {
    const adv = useAdventure.getState();
    if (req.recruits && HEROES[req.recruits] && !adv.save.party.some((m) => m.heroId === req.recruits) && adv.save.party.length < 4) {
      const leaderLvl = adv.save.party[0]?.level ?? 1;
      const party = [...adv.save.party, { heroId: req.recruits, level: leaderLvl, exp: 0, equipped: {}, inventory: [] }];
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
      // regenerate the current dungeon floor after a reload (runtime maps aren't persisted)
      if (adv.save.dungeon && !RUNTIME_MAPS[adv.save.mapId]) { const dd = DUNGEON_BY_ID[adv.save.dungeon.id]; if (dd) { const fm = genFloor(dd, adv.save.dungeon.floor); RUNTIME_MAPS[fm.id] = fm; } }
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
        cb: { onDialogue, onShrine, onAutosave, onHud, onXp, onDeath, onFlag, onPickupLoot, onFloorCleared: onFloorClearedCb, onDescend, onExitTown },
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

  // tap "I" to open/close the inventory anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setPanel((p) => { const next = p === 'inv' ? null : 'inv'; if (next) engineRef.current?.pause(); else engineRef.current?.resume(); return next; });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  const mapName = ADVENTURE_MAPS[hud.map]?.name ?? RUNTIME_MAPS[hud.map]?.name ?? '';
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
        {hud.map === 'lastlight' && (
          <button type="button" onClick={() => { engineRef.current?.pause(); setShowDungeons(true); }}
            className="shrink-0 px-2 py-1 rounded-lg bg-red-900/60 text-zinc-100 text-[11px] border border-red-800 active:bg-red-800">⚔ Dungeons</button>
        )}
      </div>

      {/* level + XP bar */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-zinc-900 bg-zinc-950/60">
        <span className="text-amber-400 text-[11px] font-bold shrink-0">Lv {lvl.level}</span>
        <div className="flex-1 h-2 rounded bg-zinc-800 overflow-hidden border border-zinc-800">
          <div className="h-full bg-amber-500 transition-[width] duration-150" style={{ width: lvl.level >= HERO_MAX_LEVEL ? '100%' : `${Math.min(100, (lvl.exp / (lvl.need || 1)) * 100)}%` }} />
        </div>
        <span className="font-mono text-[9px] text-zinc-500 shrink-0">{lvl.level >= HERO_MAX_LEVEL ? 'MAX' : `XP ${lvl.exp}/${lvl.need}`}</span>
      </div>

      {/* facilities */}
      <div className="flex items-center gap-1.5 px-3 py-1 border-b border-zinc-900 bg-zinc-950/40 text-[11px]">
        <button type="button" onClick={() => openPanel('inv')} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 active:bg-zinc-700">🎒 Inventory <span className="text-zinc-500">(I)</span></button>
        {hud.map === 'lastlight' && (<>
          <button type="button" onClick={() => openPanel('shop')} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 active:bg-zinc-700">🛒 Shop</button>
          <button type="button" onClick={() => openPanel('stash')} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 active:bg-zinc-700">📦 Stash</button>
          <button type="button" onClick={() => openPanel('craft')} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 active:bg-zinc-700">⚒ Reforge</button>
        </>)}
        <span className="ml-auto text-amber-300 font-mono shrink-0">🪙 {gold}</span>
      </div>

      {/* canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-2 relative">
        <canvas ref={canvasRef} style={{ touchAction: 'none' }}
          className="w-full max-w-[640px] aspect-[4/3] rounded-lg border border-zinc-800 shadow-[0_0_40px_rgba(192,57,43,0.18)]" />
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

      {/* dungeon board */}
      {showDungeons && (
        <div className="absolute inset-0 z-40 bg-black/70 flex items-center justify-center p-4" onClick={() => { setShowDungeons(false); engineRef.current?.resume(); }}>
          <div className="w-full max-w-[460px] rounded-xl border border-red-900/50 bg-zinc-950 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm uppercase tracking-widest text-red-400/90">Dungeons</h2>
              <button type="button" onClick={() => { setShowDungeons(false); engineRef.current?.resume(); }} className="text-zinc-500 text-lg leading-none px-1">✕</button>
            </div>
            <div className="space-y-2">
              {DUNGEONS.map((d) => {
                const dd = useAdventure.getState().save.dungeonDepth;
                const best = dd[d.id] ?? 0;
                const unlocked = isUnlocked(d, dd);
                const tough = d.baseLevel > lvl.level + 3;
                const reqName = d.unlockReq ? DUNGEON_BY_ID[d.unlockReq.dungeon]?.name : '';
                return (
                  <button key={d.id} type="button" disabled={!unlocked} onClick={() => enterDungeon(d.id)}
                    className={`w-full text-left p-3 rounded-lg border ${unlocked ? 'border-zinc-700 bg-zinc-900 active:bg-zinc-800 hover:border-red-600' : 'border-zinc-800 bg-zinc-950 opacity-60 cursor-not-allowed'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-100 text-sm font-semibold">{unlocked ? '' : '🔒 '}{d.name}</span>
                      <span className={`text-[10px] ${tough ? 'text-red-400' : 'text-emerald-400'}`}>Lv {d.baseLevel}+{tough ? ' ⚠ tough' : ''}</span>
                    </div>
                    <div className="text-zinc-500 text-[11px] mt-0.5">{d.blurb}</div>
                    {unlocked
                      ? <div className="text-zinc-600 text-[10px] mt-1">Deepest reached: Floor {best}</div>
                      : <div className="text-amber-500/80 text-[10px] mt-1">🔒 Reach Floor {d.unlockReq!.floor} of {reqName} to unlock</div>}
                  </button>
                );
              })}
            </div>
            <p className="text-zinc-600 text-[10px] mt-3 text-center">Clear every enemy on a floor to reveal the stairs down. The red portal returns to town — swap to an easier dungeon to grind levels first.</p>
          </div>
        </div>
      )}

      {/* inventory / stash / shop / reforge */}
      {panel && <GearPanels mode={panel} onClose={closePanel} onStatsChanged={reapplyStats} />}

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

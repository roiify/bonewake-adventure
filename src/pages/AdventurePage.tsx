import { useEffect, useRef, useState } from 'react';
import { AdventureEngine, type DialogueRequest, type PlayerStats } from '../lib/adventure/engine';
import type { Dir, DialogueLine } from '../data/adventure/types';
import { ADVENTURE_MAPS } from '../data/adventure/maps';
import { DIALOGUE } from '../data/adventure/dialogue';
import DialogueBox from '../components/adventure/DialogueBox';
import { useAdventure } from '../store/adventure';
import { useHeroes } from '../store/heroes';
import { HERO_BY_ID } from '../data/heroes';
import { toCombatUnit, xpForLevel } from '../lib/stats';
import { genLoot } from '../lib/loot';
import { asset } from '../lib/assetPath';
import { uid } from '../lib/id';

// Hero strength knobs (tune to taste). Player hits hit PLAYER_POWER× harder and
// has PLAYER_HP_MULT× more HP than the raw combat-stat unit, so the action feel
// favors the player.
const PLAYER_POWER = 2.6;
const PLAYER_HP_MULT = 1.6;

// Heroes whose basic attack is a ranged projectile (casters/archers). Everyone
// else swings melee. Kengo (the solo starter) is melee.
const RANGED = new Set(['elara', 'twins', 'manny', 'pyra', 'aelia', 'luna']);

type Hud = { map: string; hp: number; maxHp: number; enemies: number; xp: number };

export default function AdventurePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AdventureEngine | null>(null);
  const respawnRef = useRef<(() => void) | null>(null);
  const leaderRef = useRef<string>('');

  const [hud, setHud] = useState<Hud>({ map: 'lastlight', hp: 1, maxHp: 1, enemies: 0, xp: 0 });
  const [dialogue, setDialogue] = useState<{ lines: DialogueLine[]; req: DialogueRequest } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [lvl, setLvl] = useState<{ level: number; exp: number; need: number }>({ level: 1, exp: 0, need: 50 });
  const [banner, setBanner] = useState<string | null>(null);

  const showToast = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 1900); };

  // --- hero picker (choose which toon you control) ---
  const partyList = () => {
    const heroes = useHeroes.getState().heroes;
    return useAdventure.getState().save.partyIds
      .map((id) => { const h = heroes.find((x) => x.id === id); return h ? { id, t: h.templateId, lvl: h.level } : null; })
      .filter((x): x is { id: string; t: string; lvl: number } => !!x);
  };
  const openPicker = () => { engineRef.current?.pause(); setShowPicker(true); };
  const closePicker = () => { setShowPicker(false); engineRef.current?.resume(); };
  const pickHero = async (id: string) => {
    const adv = useAdventure.getState();
    const partyIds = [id, ...adv.save.partyIds.filter((x) => x !== id)];
    await adv.patch({ partyIds });
    leaderRef.current = id;
    const st = buildPlayerStats(id);
    if (st) engineRef.current?.setPlayer(st);
    engineRef.current?.setAllies(buildAllies(id));
    setLvl(readLevel());
    closePicker();
  };

  const buildPlayerStats = (leaderId: string): PlayerStats | null => {
    const heroes = useHeroes.getState().heroes;
    const equipment = useHeroes.getState().equipment;
    const owned = heroes.find((h) => h.id === leaderId);
    if (!owned) return null;
    const cu = toCombatUnit(owned, equipment, 'player', 'p0', [owned.templateId]);
    if (!cu) return null;
    return { templateId: owned.templateId, maxHp: Math.round(cu.maxHp * PLAYER_HP_MULT), atk: cu.atk, def: cu.def, spd: cu.spd, crit: cu.crit, element: cu.element, ranged: RANGED.has(owned.templateId), power: PLAYER_POWER };
  };
  // Non-leader party members become AI companions (up to 3 → team of 4).
  const buildAllies = (leaderId: string): PlayerStats[] =>
    useAdventure.getState().save.partyIds.filter((id) => id !== leaderId).map((id) => buildPlayerStats(id)).filter((s): s is PlayerStats => !!s);
  const readLevel = () => {
    const h = useHeroes.getState().heroes.find((x) => x.id === leaderRef.current);
    return h ? { level: h.level, exp: h.exp, need: xpForLevel(h.level) } : { level: 1, exp: 0, need: 50 };
  };

  // --- engine callbacks ---
  const onDialogue = (req: DialogueRequest) => setDialogue({ lines: DIALOGUE[req.dialogueId] ?? [], req });
  const onShrine = () => showToast('Saved at the Bone Shrine. Wounds mended.');
  const onAutosave = (map: string, x: number, y: number, facing: Dir) => { void useAdventure.getState().patch({ mapId: map, px: x, py: y, facing }); };
  const onHud = (h: Hud) => setHud(h);
  const onXp = (xp: number) => {
    const id = leaderRef.current;
    if (!id) return;
    void (async () => {
      // Level the whole team directly (not via distributeSquadExp, which caps
      // hero level at the gacha account level — always 1 here, so nothing grew).
      const store = useHeroes.getState();
      const ids = useAdventure.getState().save.partyIds;
      let leaderLevelUp = 0;
      for (const hid of ids) {
        const h = store.heroes.find((x) => x.id === hid);
        if (!h) continue;
        let level = h.level, exp = h.exp + xp;
        while (level < 200 && exp >= xpForLevel(level)) { exp -= xpForLevel(level); level += 1; }
        if (level !== h.level && hid === id) leaderLevelUp = level;
        await store.updateHero(hid, { level, exp });
      }
      const st = buildPlayerStats(id);
      if (st) engineRef.current?.setPlayer(st);
      engineRef.current?.setAllies(buildAllies(id));
      setLvl(readLevel());
      if (leaderLevelUp) showToast(`Level up! Lv ${leaderLevelUp} — stats raised`);
    })();
  };
  const onLoot = (itemLevel: number, isBoss: boolean) => {
    void (async () => {
      const item = genLoot({ itemLevel, luckBoost: isBoss ? 0.35 : 0.06, minRarity: isBoss ? 3 : 1 });
      const leaderId = leaderRef.current;
      const heroes = useHeroes.getState();
      const leader = heroes.heroes.find((h) => h.id === leaderId);
      const slot = item.slot ?? item.baseType ?? 'trinket';
      const curId = leader?.equipped?.[slot];
      const cur = curId ? heroes.equipment.find((e) => e.id === curId) : null;
      await heroes.addEquipment({ ...item, equippedTo: leaderId });
      if (leader && (!cur || (item.itemLevel ?? 0) >= (cur.itemLevel ?? 0))) {
        await heroes.updateHero(leaderId, { equipped: { ...leader.equipped, [slot]: item.id } });
        const st = buildPlayerStats(leaderId);
        if (st) engineRef.current?.setPlayer(st);
        showToast(`Looted & equipped: ${item.name ?? 'gear'}`);
      } else {
        showToast(`Looted: ${item.name ?? 'gear'} (bag)`);
      }
    })();
  };
  const onFlag = (flag: string, fixedId?: string) => {
    void (async () => {
      const adv = useAdventure.getState();
      const flags = { ...adv.save.flags };
      if (flag) flags[flag] = true;
      const defeated = fixedId && !adv.save.defeated.includes(fixedId) ? [...adv.save.defeated, fixedId] : adv.save.defeated;
      if (flag === 'beat_first_lich') flags['cleared_old_burial_ground'] = true;
      await adv.patch({ flags, defeated });
      engineRef.current?.syncState({ flags, defeated });
      if (flag === 'beat_first_lich') {
        setBanner('DUNGEON CLEARED — The First Lich is destroyed. Grab the Cure Fragment, then leave through a door.');
        window.setTimeout(() => setBanner(null), 5000);
      }
    })();
  };
  const onDeath = () => { showToast('You fell. You wake at the last shrine.'); window.setTimeout(() => respawnRef.current?.(), 900); };

  const closeDialogue = async () => {
    const cur = dialogue;
    setDialogue(null);
    if (cur) await applyDialogue(cur.req);
    const s = useAdventure.getState().save;
    engineRef.current?.syncState({ flags: s.flags, defeated: s.defeated });
    engineRef.current?.resume();
  };

  const applyDialogue = async (req: DialogueRequest) => {
    const adv = useAdventure.getState();
    if (req.recruits) {
      const flagKey = `recruited_${req.recruits}`;
      if (!adv.save.flags[flagKey]) {
        const hero = { id: uid(), templateId: req.recruits, level: 1, exp: 0, star: 3 as const, equipped: {}, obtainedAt: 0 };
        await useHeroes.getState().addHero(hero);
        const partyIds = adv.save.partyIds.length < 4 ? [...adv.save.partyIds, hero.id] : adv.save.partyIds;
        await adv.patch({ partyIds, flags: { ...adv.save.flags, [flagKey]: true } });
        showToast(`${HERO_BY_ID[req.recruits]?.name ?? 'A hero'} joined the party.`);
      }
    }
    if (req.setsFlag) {
      const cure = req.pickupId === 'cure_frag' ? Math.min(100, adv.save.cureProgress + 3) : adv.save.cureProgress;
      await adv.patch({ flags: { ...adv.save.flags, [req.setsFlag]: true }, cureProgress: cure });
      if (req.pickupId === 'cure_frag') showToast('Cure Research advanced — Stage 0. Bring it to Mara.');
    }
  };

  // --- mount ---
  useEffect(() => {
    let alive = true;
    const create = (opts?: { respawn?: boolean }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const adv = useAdventure.getState();
      const leaderId = adv.save.partyIds[0];
      leaderRef.current = leaderId;
      const stats = buildPlayerStats(leaderId);
      if (!stats) return;
      let mapId = adv.save.mapId, px = adv.save.px, py = adv.save.py;
      const facing = adv.save.facing as Dir;
      if (opts?.respawn) {
        const shrine = ADVENTURE_MAPS[mapId]?.shrines?.[0];
        if (shrine) { px = shrine.x; py = shrine.y; }
        else { mapId = 'lastlight'; px = -1; py = -1; }
      }
      engineRef.current?.destroy();
      const engine = new AdventureEngine(canvas, {
        mapId, x: px, y: py, facing, player: stats, allies: buildAllies(leaderId), flags: adv.save.flags, defeated: adv.save.defeated,
        cb: { onDialogue, onShrine, onAutosave, onHud, onXp, onDeath, onFlag, onLoot },
      });
      engineRef.current = engine;
      engine.start();
      setLvl(readLevel());
    };
    respawnRef.current = () => create({ respawn: true });

    (async () => {
      await useAdventure.getState().load();
      // ensure protagonist + party leader
      let kengo = useHeroes.getState().heroes.find((h) => h.templateId === 'kengo');
      if (!kengo) { const h = { id: uid(), templateId: 'kengo', level: 1, exp: 0, star: 3 as const, equipped: {}, obtainedAt: 0 }; await useHeroes.getState().addHero(h); kengo = h; }
      const owned = useHeroes.getState().heroes;
      const adv = useAdventure.getState();
      let partyIds = adv.save.partyIds.filter((id) => owned.some((h) => h.id === id));
      if (!partyIds.includes(kengo.id)) partyIds = [kengo.id, ...partyIds];
      partyIds = partyIds.slice(0, 4);
      await adv.patch({ partyIds });
      if (!alive) return;
      create();
    })();

    return () => { alive = false; engineRef.current?.destroy(); engineRef.current = null; };
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
      {/* top bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800">
        <span className="text-zinc-600 text-xs tracking-wide shrink-0">☠</span>
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
          <div className="h-full bg-amber-500 transition-[width] duration-150" style={{ width: `${Math.min(100, (lvl.exp / (lvl.need || 1)) * 100)}%` }} />
        </div>
        <span className="font-mono text-[9px] text-zinc-500 shrink-0">XP {lvl.exp}/{lvl.need}</span>
      </div>

      {/* canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-2 relative">
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', cursor: 'crosshair', touchAction: 'none' }}
          className="w-full max-w-[460px] h-auto rounded-lg border border-zinc-800 shadow-[0_0_40px_rgba(192,57,43,0.18)]" />
        {dialogue && <DialogueBox lines={dialogue.lines} onClose={() => { void closeDialogue(); }} />}
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
                const tmpl = HERO_BY_ID[p.t];
                const active = leaderRef.current === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => { void pickHero(p.id); }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left ${active ? 'border-red-500 bg-red-950/40' : 'border-zinc-700 bg-zinc-900 active:bg-zinc-800'}`}>
                    <img src={asset(`sprites/pixellab/heroes/pro/${p.t}_south.png`)} alt="" style={{ imageRendering: 'pixelated' }} className="w-10 h-12 object-contain shrink-0" />
                    <div className="min-w-0">
                      <div className="text-zinc-100 text-sm truncate">{tmpl?.name ?? p.t}{active && ' ●'}</div>
                      <div className="text-zinc-500 text-[10px] capitalize truncate">{tmpl?.archetype} · {tmpl?.element} · Lv {p.lvl}</div>
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

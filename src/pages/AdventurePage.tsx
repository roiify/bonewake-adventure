import { useEffect, useRef, useState } from 'react';
import { AdventureEngine, type DialogueRequest, type PlayerStats } from '../lib/adventure/engine';
import type { Dir, DialogueLine } from '../data/adventure/types';
import { ADVENTURE_MAPS } from '../data/adventure/maps';
import { DIALOGUE } from '../data/adventure/dialogue';
import DialogueBox from '../components/adventure/DialogueBox';
import { useAdventure } from '../store/adventure';
import { useHeroes } from '../store/heroes';
import { HERO_BY_ID } from '../data/heroes';
import { toCombatUnit } from '../lib/stats';
import { distributeSquadExp } from '../lib/rewards';
import { uid } from '../lib/id';

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

  const showToast = (m: string) => { setToast(m); window.setTimeout(() => setToast(null), 1900); };

  const buildPlayerStats = (leaderId: string): PlayerStats | null => {
    const heroes = useHeroes.getState().heroes;
    const equipment = useHeroes.getState().equipment;
    const owned = heroes.find((h) => h.id === leaderId);
    if (!owned) return null;
    const cu = toCombatUnit(owned, equipment, 'player', 'p0', [owned.templateId]);
    if (!cu) return null;
    return { templateId: owned.templateId, maxHp: cu.maxHp, atk: cu.atk, def: cu.def, spd: cu.spd, crit: cu.crit, element: cu.element, ranged: RANGED.has(owned.templateId) };
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
      await distributeSquadExp([id], xp);
      const st = buildPlayerStats(id);
      if (st) engineRef.current?.setPlayer(st);
    })();
  };
  const onFlag = (flag: string, fixedId?: string) => {
    void (async () => {
      const adv = useAdventure.getState();
      const flags = { ...adv.save.flags };
      if (flag) flags[flag] = true;
      const defeated = fixedId && !adv.save.defeated.includes(fixedId) ? [...adv.save.defeated, fixedId] : adv.save.defeated;
      await adv.patch({ flags, defeated });
      engineRef.current?.syncState({ flags, defeated });
      if (flag === 'beat_first_lich') showToast('The First Lich falls. Something pale glints in the ash…');
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
        const partyIds = adv.save.partyIds.length < 3 ? [...adv.save.partyIds, hero.id] : adv.save.partyIds;
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
        mapId, x: px, y: py, facing, player: stats, flags: adv.save.flags, defeated: adv.save.defeated,
        cb: { onDialogue, onShrine, onAutosave, onHud, onXp, onDeath, onFlag },
      });
      engineRef.current = engine;
      engine.start();
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
      partyIds = partyIds.slice(0, 3);
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
          <span className="font-mono text-[10px] text-zinc-400 w-[64px] text-right">{hud.hp}/{hud.maxHp}</span>
        </div>
      </div>

      {/* canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-2 relative">
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', cursor: 'crosshair', touchAction: 'none' }}
          className="w-full max-w-[460px] h-auto rounded-lg border border-zinc-800 shadow-[0_0_40px_rgba(192,57,43,0.18)]" />
        {dialogue && <DialogueBox lines={dialogue.lines} onClose={() => { void closeDialogue(); }} />}
        {toast && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg bg-zinc-900/95 border border-red-900/50 text-xs text-zinc-100 shadow-lg max-w-[90%] text-center">{toast}</div>}
        <div className="absolute top-2 right-3 text-[10px] font-mono text-zinc-500">XP {hud.xp}{hud.enemies > 0 ? ` · ${hud.enemies} enemies` : ''}</div>
      </div>

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

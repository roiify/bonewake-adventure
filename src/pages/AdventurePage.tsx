import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdventureEngine, type BattleRequest, type DialogueRequest } from '../lib/adventure/engine';
import type { Dir, DialogueLine } from '../data/adventure/types';
import { ADVENTURE_MAPS } from '../data/adventure/maps';
import { DIALOGUE } from '../data/adventure/dialogue';
import DialogueBox from '../components/adventure/DialogueBox';
import { useAdventure } from '../store/adventure';
import { useHeroes } from '../store/heroes';
import { HERO_BY_ID } from '../data/heroes';
import { uid } from '../lib/id';

const ADV_BATTLE_KEY = 'bonewake_adv_battle';
const ADV_RESULT_KEY = 'bonewake_adv_result';

interface AdvResult { won: boolean; fixedId?: string; setsFlag?: string; isBoss?: boolean }

export default function AdventurePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AdventureEngine | null>(null);
  const hudRef = useRef<{ map: string; x: number; y: number; facing: Dir }>({ map: 'lastlight', x: 0, y: 0, facing: 'south' });
  const navigate = useNavigate();

  const [hud, setHud] = useState<{ map: string; x: number; y: number; facing: Dir } | null>(null);
  const [party, setParty] = useState<string[]>([]);
  const [dialogue, setDialogue] = useState<{ lines: DialogueLine[]; req: DialogueRequest } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const partyNames = (ids: string[]) => {
    const heroes = useHeroes.getState().heroes;
    return ids.map((id) => HERO_BY_ID[heroes.find((h) => h.id === id)?.templateId ?? '']?.name ?? '?');
  };

  // --- engine callbacks (stable: read fresh state via getState / refs) ---
  const onDialogue = (req: DialogueRequest) => {
    setDialogue({ lines: DIALOGUE[req.dialogueId] ?? [], req });
  };
  const onBattle = (req: BattleRequest) => {
    const save = useAdventure.getState().save;
    const h = hudRef.current;
    void useAdventure.getState().patch({ mapId: h.map, px: h.x, py: h.y, facing: h.facing });
    const payload = {
      party: save.partyIds,
      enemies: req.enemies,
      chapter: req.chapter,
      bossBanterId: req.bossBanterId,
      isBoss: req.isBoss,
      xp: req.xp,
      fixedId: req.fixedId,
      setsFlag: req.setsFlag,
      returnTo: '/',
    };
    localStorage.setItem(ADV_BATTLE_KEY, JSON.stringify(payload));
    navigate('/battle/play/adv');
  };
  const onShrine = () => showToast('Saved at the Bone Shrine. Your dead are buried proper.');
  const onAutosave = (map: string, x: number, y: number, facing: Dir) => {
    void useAdventure.getState().patch({ mapId: map, px: x, py: y, facing });
  };
  const onHud = (info: { map: string; x: number; y: number; facing: Dir }) => {
    hudRef.current = info;
    setHud(info);
  };

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
        setParty(partyNames(partyIds));
        showToast(`${HERO_BY_ID[req.recruits]?.name ?? 'A hero'} joined the party.`);
      }
    }
    if (req.setsFlag) {
      const cure = req.pickupId === 'cure_frag' ? Math.min(100, adv.save.cureProgress + 3) : adv.save.cureProgress;
      await adv.patch({ flags: { ...adv.save.flags, [req.setsFlag]: true }, cureProgress: cure });
      if (req.pickupId === 'cure_frag') showToast('Cure Research advanced — Stage 0. (+8% max HP)');
    }
  };

  // --- mount: load save, apply pending battle result, build engine ---
  useEffect(() => {
    let alive = true;
    let engine: AdventureEngine | null = null;
    (async () => {
      await useAdventure.getState().load();
      // ensure the protagonist exists and leads the party
      let heroes = useHeroes.getState().heroes;
      let kengo = heroes.find((h) => h.templateId === 'kengo');
      if (!kengo) {
        const h = { id: uid(), templateId: 'kengo', level: 1, exp: 0, star: 3 as const, equipped: {}, obtainedAt: 0 };
        await useHeroes.getState().addHero(h);
        kengo = h;
      }
      const adv = useAdventure.getState();
      // Keep only party ids that still resolve to an owned hero (drops stale ids
      // from older saves), ensure the protagonist leads, and cap at 3.
      const owned = useHeroes.getState().heroes;
      let partyIds = adv.save.partyIds.filter((id) => owned.some((h) => h.id === id));
      if (!partyIds.includes(kengo.id)) partyIds = [kengo.id, ...partyIds];
      partyIds = partyIds.slice(0, 3);

      let flags = { ...adv.save.flags };
      let defeated = adv.save.defeated.slice();
      let mapId = adv.save.mapId;
      let px = adv.save.px;
      let py = adv.save.py;
      let facing = adv.save.facing as Dir;

      // pending battle result?
      let res: AdvResult | null = null;
      try { res = JSON.parse(localStorage.getItem(ADV_RESULT_KEY) ?? 'null'); } catch { res = null; }
      if (res) {
        if (res.won) {
          if (res.fixedId && !defeated.includes(res.fixedId)) defeated.push(res.fixedId);
          if (res.setsFlag) flags[res.setsFlag] = true;
        } else {
          const m = ADVENTURE_MAPS[mapId];
          const shrine = m?.shrines?.[0];
          if (shrine) { px = shrine.x; py = shrine.y; }
          else { mapId = 'lastlight'; px = -1; py = -1; }
          showToast('You fell. You wake at the last shrine.');
        }
        localStorage.removeItem(ADV_RESULT_KEY);
      }

      await useAdventure.getState().patch({ partyIds, flags, defeated, mapId, px, py, facing });
      if (!alive) return;
      setParty(partyNames(partyIds));

      const canvas = canvasRef.current;
      if (!canvas) return;
      engine = new AdventureEngine(canvas, {
        mapId, x: px, y: py, facing, leaderSprite: 'kengo', flags, defeated,
        cb: { onDialogue, onBattle, onShrine, onAutosave, onHud },
      });
      engineRef.current = engine;
      engine.start();
    })();
    return () => { alive = false; engine?.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hold = (dir: Dir) => (e: React.PointerEvent) => { e.preventDefault(); engineRef.current?.setVirtualDir(dir, true); };
  const release = (dir: Dir) => (e: React.PointerEvent) => { e.preventDefault(); engineRef.current?.setVirtualDir(dir, false); };

  const padBtn = (dir: Dir, label: string) => (
    <button type="button" aria-label={dir}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={hold(dir)} onPointerUp={release(dir)} onPointerLeave={release(dir)} onPointerCancel={release(dir)}
      className="flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-800/90 text-zinc-200 text-xl active:bg-red-900/70 border border-zinc-700 select-none touch-none">
      {label}
    </button>
  );

  const mapName = hud ? ADVENTURE_MAPS[hud.map]?.name ?? '' : '';

  return (
    <div className="h-full w-full max-w-[480px] mx-auto flex flex-col bg-zinc-950 text-zinc-100 select-none relative">
      {/* top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-zinc-600 text-xs tracking-wide">☠ Bonewake</span>
        <div className="text-xs tracking-widest uppercase text-red-400/80 truncate">{mapName || 'Adventure'}</div>
        <div className="font-mono text-[10px] text-zinc-500 w-[80px] text-right truncate">{party.join(' · ')}</div>
      </div>

      {/* canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden p-2 relative">
        <canvas ref={canvasRef} style={{ imageRendering: 'pixelated' }}
          className="w-full max-w-[460px] h-auto rounded-lg border border-zinc-800 shadow-[0_0_40px_rgba(192,57,43,0.15)]" />
        {dialogue && <DialogueBox lines={dialogue.lines} onClose={() => { void closeDialogue(); }} />}
        {toast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg bg-zinc-900/95 border border-red-900/50 text-xs text-zinc-100 shadow-lg">{toast}</div>
        )}
      </div>

      {/* controls */}
      <div className="px-4 pb-6 pt-2">
        <p className="text-center text-[11px] text-zinc-600 mb-3">Arrow keys / WASD to walk · Space/Enter or ⊙ to talk · tap pad on touch</p>
        <div className="flex items-end justify-between max-w-[320px] mx-auto">
          <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
            <div />{padBtn('north', '▲')}<div />
            {padBtn('west', '◀')}<div className="w-14 h-14" />{padBtn('east', '▶')}
            <div />{padBtn('south', '▼')}<div />
          </div>
          <button type="button" aria-label="action"
            onPointerDown={(e) => { e.preventDefault(); engineRef.current?.action(); }}
            className="flex items-center justify-center w-16 h-16 rounded-full bg-red-900/70 text-zinc-100 text-lg border border-red-800 active:bg-red-800 select-none touch-none">⊙</button>
        </div>
      </div>
    </div>
  );
}

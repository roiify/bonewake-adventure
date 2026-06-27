import { useState } from 'react';
import { useAdventure, type PartyMember } from '../../store/adventure';
import { HEROES, RARITY, SLOTS, affixLabel, itemScore, itemSellValue, rollItem, type Item } from '../../data/adventure/units';

export type PanelMode = 'inv' | 'stash' | 'shop' | 'craft' | 'filter';

const sellPrice = itemSellValue;
const buyPrice = (it: Item) => sellPrice(it) * 3;
const RARITY_IDS = [1, 2, 3, 4, 5];
const reforgeCost = (it: Item) => 30 + it.itemLevel * 4 + it.rarity * 20;
const SLOT_ICON: Record<string, string> = { weapon: '⚔', armor: '🛡', helm: '🪖', boots: '🥾', amulet: '📿', ring: '💍' };

function Affixes({ it }: { it: Item }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0 mt-0.5">
      {it.affixes.map((a, i) => <span key={i} className="text-[9px] text-emerald-300/90">{affixLabel(a)}</span>)}
    </div>
  );
}
function ItemCard({ it, sub, onClick, active }: { it: Item; sub?: string; onClick?: () => void; active?: boolean }) {
  const r = RARITY[it.rarity];
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left p-2 rounded-lg border bg-zinc-900/80 ${active ? 'border-red-500' : 'border-zinc-800'} active:bg-zinc-800`}
      style={{ boxShadow: `inset 3px 0 0 ${r.color}` }}>
      <div className="flex items-center justify-between gap-2">
        <span style={{ color: r.color }} className="text-xs font-semibold truncate">{SLOT_ICON[it.slot]} {it.name}</span>
        {sub && <span className="text-[9px] text-amber-300 shrink-0">{sub}</span>}
      </div>
      <div className="text-[9px] text-zinc-500 capitalize">{r.name} {it.slot} · iLvl {it.itemLevel}</div>
      <Affixes it={it} />
    </button>
  );
}

export default function GearPanels({ mode, onClose, onStatsChanged }: { mode: PanelMode; onClose: () => void; onStatsChanged: () => void }) {
  const save = useAdventure((s) => s.save);
  const stash = useAdventure((s) => s.stash);
  const setStash = useAdventure((s) => s.setStash);
  const [sel, setSel] = useState<Item | null>(null);
  const [stock, setStock] = useState<Item[]>(() => {
    const lvl = save.party[0]?.level ?? 1;
    return Array.from({ length: 8 }, () => rollItem(Math.max(2, lvl * 2), { luck: 0.35 }));
  });

  const leader = save.party[0];
  const ranged = HEROES[leader?.heroId]?.ranged;

  // mutate the controlled hero (party[0]) immutably, return the new party array
  const mutLeader = (fn: (m: PartyMember) => PartyMember): PartyMember[] =>
    useAdventure.getState().save.party.map((m, i) => (i === 0 ? fn({ ...m, equipped: { ...m.equipped }, inventory: [...m.inventory] }) : m));

  const equip = (it: Item) => {
    const party = mutLeader((m) => { const prev = m.equipped[it.slot] ?? null; m.inventory = m.inventory.filter((x) => x.id !== it.id); if (prev) m.inventory.push(prev); m.equipped[it.slot] = it; return m; });
    useAdventure.getState().patch({ party }); onStatsChanged(); setSel(null);
  };
  const unequip = (slot: string) => {
    const party = mutLeader((m) => { const cur = m.equipped[slot]; if (cur) { m.equipped[slot] = null; m.inventory.push(cur); } return m; });
    useAdventure.getState().patch({ party }); onStatsChanged();
  };
  const salvage = (it: Item) => {
    const party = mutLeader((m) => { m.inventory = m.inventory.filter((x) => x.id !== it.id); return m; });
    useAdventure.getState().patch({ party, gold: useAdventure.getState().save.gold + sellPrice(it) }); setSel(null);
  };
  const toStash = (it: Item) => {
    const party = mutLeader((m) => { m.inventory = m.inventory.filter((x) => x.id !== it.id); return m; });
    useAdventure.getState().patch({ party }); setStash([it, ...useAdventure.getState().stash]); setSel(null);
  };
  const fromStash = (it: Item) => {
    const party = mutLeader((m) => { m.inventory.push(it); return m; });
    useAdventure.getState().patch({ party }); setStash(useAdventure.getState().stash.filter((x) => x.id !== it.id));
  };
  const buy = (it: Item) => {
    const adv = useAdventure.getState(); if (adv.save.gold < buyPrice(it)) return;
    const party = mutLeader((m) => { m.inventory.push(it); return m; });
    adv.patch({ party, gold: adv.save.gold - buyPrice(it) }); setStock((s) => s.filter((x) => x.id !== it.id));
  };
  const sell = (it: Item) => salvage(it);
  const rerollStock = () => {
    const adv = useAdventure.getState(); if (adv.save.gold < 20) return;
    adv.patch({ gold: adv.save.gold - 20 });
    const lvl = leader?.level ?? 1; setStock(Array.from({ length: 8 }, () => rollItem(Math.max(2, lvl * 2), { luck: 0.35 })));
  };
  const reforge = (it: Item) => {
    const adv = useAdventure.getState(); const cost = reforgeCost(it); if (adv.save.gold < cost) return;
    const fresh = rollItem(it.itemLevel, { ranged, forceRarity: it.rarity });
    const reforged: Item = { ...it, affixes: fresh.affixes };
    const party = mutLeader((m) => { m.inventory = m.inventory.map((x) => (x.id === it.id ? reforged : x)); return m; });
    adv.patch({ party, gold: adv.save.gold - cost }); setSel(reforged);
  };

  // equip the highest-score item in every slot (from equipped + backpack)
  const autoEquip = () => {
    const party = useAdventure.getState().save.party.map((m, i) => {
      if (i !== 0) return m;
      const equipped = { ...m.equipped }; let inv = [...m.inventory];
      for (const slot of SLOTS) {
        const cands = [equipped[slot], ...inv.filter((x) => x.slot === slot)].filter(Boolean) as Item[];
        if (!cands.length) continue;
        const best = cands.reduce((a, b) => (itemScore(b) > itemScore(a) ? b : a));
        if (equipped[slot]?.id === best.id) continue;
        inv = inv.filter((x) => x.id !== best.id);
        if (equipped[slot]) inv.push(equipped[slot]!);
        equipped[slot] = best;
      }
      return { ...m, equipped, inventory: inv };
    });
    useAdventure.getState().patch({ party }); onStatsChanged(); setSel(null);
  };
  const sellAllRarity = (r: number) => {
    const adv = useAdventure.getState();
    const items = adv.save.party[0].inventory.filter((x) => x.rarity === r);
    if (!items.length) return;
    const gain = items.reduce((s, it) => s + sellPrice(it), 0);
    const party = mutLeader((m) => { m.inventory = m.inventory.filter((x) => x.rarity !== r); return m; });
    adv.patch({ party, gold: adv.save.gold + gain });
  };
  const sellAll = () => {
    const adv = useAdventure.getState();
    const items = adv.save.party[0].inventory;
    if (!items.length) return;
    const gain = items.reduce((s, it) => s + sellPrice(it), 0);
    const party = mutLeader((m) => { m.inventory = []; return m; });
    adv.patch({ party, gold: adv.save.gold + gain });
  };
  const toggleSalvage = (r: number) => {
    const adv = useAdventure.getState();
    const cur = adv.save.salvageRarities ?? [];
    adv.patch({ salvageRarities: cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r] });
  };

  const TITLES: Record<PanelMode, string> = { inv: 'Inventory', stash: 'Stash', shop: 'Shop', craft: 'Reforge', filter: 'Loot Filter' };
  const inv = leader?.inventory ?? [];

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-[460px] max-h-[88%] overflow-y-auto rounded-xl border border-red-900/50 bg-zinc-950 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2 sticky top-0 bg-zinc-950 pb-1">
          <h2 className="text-sm uppercase tracking-widest text-red-400/90">{TITLES[mode]}</h2>
          <div className="flex items-center gap-3">
            <span className="text-amber-300 text-xs font-mono">🪙 {save.gold}</span>
            <button type="button" onClick={onClose} className="text-zinc-500 text-lg leading-none px-1">✕</button>
          </div>
        </div>

        {/* INVENTORY */}
        {mode === 'inv' && (
          <>
            <button type="button" onClick={autoEquip} className="w-full mb-2 py-1.5 rounded-lg bg-emerald-800/70 text-emerald-50 text-xs font-semibold border border-emerald-700 active:bg-emerald-700">✨ Auto-Equip Best</button>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {SLOTS.map((slot) => {
                const it = leader?.equipped?.[slot] ?? null;
                const r = it ? RARITY[it.rarity] : null;
                return (
                  <button key={slot} type="button" onClick={() => it && unequip(slot)}
                    className="p-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-left min-h-[52px]"
                    style={it ? { boxShadow: `inset 3px 0 0 ${r!.color}` } : undefined}>
                    <div className="text-[9px] text-zinc-600 capitalize">{SLOT_ICON[slot]} {slot}</div>
                    {it ? <div style={{ color: r!.color }} className="text-[10px] font-semibold truncate leading-tight">{it.name}</div>
                      : <div className="text-[10px] text-zinc-700">empty</div>}
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-zinc-600 mb-1">Backpack ({inv.length}) — tap to manage</div>
            <div className="space-y-1.5">
              {inv.length === 0 && <div className="text-center text-zinc-700 text-[11px] py-4">No loot yet. Kill mobs — items drop on the ground.</div>}
              {inv.map((it) => (
                <div key={it.id}>
                  <ItemCard it={it} active={sel?.id === it.id} onClick={() => setSel(sel?.id === it.id ? null : it)} />
                  {sel?.id === it.id && (
                    <div className="flex gap-1.5 mt-1 mb-1">
                      <button type="button" onClick={() => equip(it)} className="flex-1 py-1 rounded bg-red-800 text-white text-[11px] border border-red-700">Equip</button>
                      <button type="button" onClick={() => toStash(it)} className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-[11px] border border-zinc-700">→ Stash</button>
                      <button type="button" onClick={() => salvage(it)} className="px-2 py-1 rounded bg-zinc-800 text-amber-300 text-[11px] border border-zinc-700">Salvage +{sellPrice(it)}🪙</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* STASH */}
        {mode === 'stash' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] text-zinc-500 mb-1">Backpack → Stash</div>
              <div className="space-y-1.5">
                {inv.length === 0 && <div className="text-zinc-700 text-[11px] py-2">empty</div>}
                {inv.map((it) => <ItemCard key={it.id} it={it} onClick={() => toStash(it)} />)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 mb-1">Stash → Backpack ({stash.length})</div>
              <div className="space-y-1.5">
                {stash.length === 0 && <div className="text-zinc-700 text-[11px] py-2">empty</div>}
                {stash.map((it) => <ItemCard key={it.id} it={it} onClick={() => fromStash(it)} />)}
              </div>
            </div>
          </div>
        )}

        {/* SHOP */}
        {mode === 'shop' && (
          <>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-zinc-500">For sale</div>
              <button type="button" onClick={rerollStock} disabled={save.gold < 20} className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 disabled:opacity-40">↻ Restock (20🪙)</button>
            </div>
            <div className="space-y-1.5 mb-3">
              {stock.length === 0 && <div className="text-zinc-700 text-[11px] py-2 text-center">Sold out — restock.</div>}
              {stock.map((it) => (
                <ItemCard key={it.id} it={it} sub={`${buyPrice(it)}🪙`} onClick={() => buy(it)} />
              ))}
            </div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-zinc-500">Sell your backpack</div>
              <button type="button" onClick={sellAll} disabled={!inv.length} className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 border border-amber-800 text-amber-100 disabled:opacity-40">Sell All (+{inv.reduce((s, it) => s + sellPrice(it), 0)}🪙)</button>
            </div>
            {inv.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {RARITY_IDS.map((r) => { const n = inv.filter((i) => i.rarity === r).length; if (!n) return null;
                  return <button key={r} type="button" onClick={() => sellAllRarity(r)} className="text-[10px] px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900" style={{ color: RARITY[r].color }}>Sell {RARITY[r].name} ×{n}</button>; })}
              </div>
            )}
            <div className="space-y-1.5">
              {inv.length === 0 && <div className="text-zinc-700 text-[11px] py-2">nothing to sell</div>}
              {inv.map((it) => <ItemCard key={it.id} it={it} sub={`sell +${sellPrice(it)}🪙`} onClick={() => sell(it)} />)}
            </div>
          </>
        )}

        {/* LOOT FILTER */}
        {mode === 'filter' && (
          <>
            <p className="text-[10px] text-zinc-500 mb-2">Toggle a rarity to <span className="text-amber-300">auto-salvage</span> it the instant it drops — it turns straight into gold instead of filling your backpack. Great for skipping Commons on deep runs.</p>
            <div className="space-y-1.5">
              {RARITY_IDS.map((r) => { const on = (save.salvageRarities ?? []).includes(r);
                return (
                  <button key={r} type="button" onClick={() => toggleSalvage(r)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border ${on ? 'border-amber-600 bg-amber-950/30' : 'border-zinc-800 bg-zinc-900'}`}>
                    <span style={{ color: RARITY[r].color }} className="text-sm font-semibold">{RARITY[r].name}</span>
                    <span className={`text-[11px] ${on ? 'text-amber-300' : 'text-emerald-400/80'}`}>{on ? '↺ Auto-salvage' : '✓ Keep'}</span>
                  </button>
                ); })}
            </div>
          </>
        )}

        {/* CRAFT / REFORGE */}
        {mode === 'craft' && (
          <>
            <p className="text-[10px] text-zinc-500 mb-2">Reforge rerolls an item's affixes (keeps its rarity). Pick one from your backpack.</p>
            <div className="space-y-1.5">
              {inv.length === 0 && <div className="text-center text-zinc-700 text-[11px] py-4">No items to reforge.</div>}
              {inv.map((it) => (
                <div key={it.id}>
                  <ItemCard it={it} active={sel?.id === it.id} onClick={() => setSel(sel?.id === it.id ? null : it)} />
                  {sel?.id === it.id && (
                    <button type="button" onClick={() => reforge(it)} disabled={save.gold < reforgeCost(it)}
                      className="w-full mt-1 mb-1 py-1.5 rounded bg-purple-900/70 text-purple-100 text-[11px] border border-purple-700 disabled:opacity-40">
                      ⚒ Reforge affixes — {reforgeCost(it)}🪙
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

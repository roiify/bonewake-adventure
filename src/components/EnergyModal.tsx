import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '../store/profile';
import { ENERGY_REGEN_INTERVAL_MS, energyCapForLevel } from '../lib/db';

const BUY_AMOUNT = 60;
const BUY_COST_GEMS = 30;
const BUY_DAILY_CAP = 5;

function todayStr() { return new Date().toISOString().slice(0, 10); }

function formatCountdown(ms: number) {
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props { open: boolean; onClose: () => void; }

export default function EnergyModal({ open, onClose }: Props) {
  const profile = useProfile(s => s.profile);
  const patch = useProfile(s => s.patch);
  const spendGems = useProfile(s => s.spendGems);
  const [now, setNow] = useState(Date.now());
  const [buyState, setBuyState] = useState<'idle' | 'buying' | 'done' | 'capped'>('idle');

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  // Effective cap scales with player level.
  const cap = energyCapForLevel(profile.level);
  // How many full regen ticks would be credited if we recomputed now
  const elapsed = now - profile.lastEnergyTick;
  const buffered = Math.floor(elapsed / ENERGY_REGEN_INTERVAL_MS);
  const projectedEnergy = Math.min(cap, profile.energy + buffered);
  const msUntilNext = profile.energy >= cap
    ? 0
    : ENERGY_REGEN_INTERVAL_MS - (elapsed % ENERGY_REGEN_INTERVAL_MS);
  const msUntilFull = profile.energy >= cap
    ? 0
    : (cap - projectedEnergy) * ENERGY_REGEN_INTERVAL_MS + msUntilNext;

  const today = todayStr();
  const buysToday = profile.energyBuysDate === today ? (profile.energyBuysToday ?? 0) : 0;
  const buysLeft = Math.max(0, BUY_DAILY_CAP - buysToday);

  async function buyEnergy() {
    if (buysLeft <= 0) { setBuyState('capped'); return; }
    setBuyState('buying');
    const ok = await spendGems(BUY_COST_GEMS);
    if (!ok) { setBuyState('idle'); alert('Not enough gems'); return; }
    const newEnergy = Math.min(999, profile.energy + BUY_AMOUNT); // allow temporary overcap
    await patch({
      energy: newEnergy,
      energyBuysToday: buysToday + 1,
      energyBuysDate: today,
    });
    setBuyState('done');
    setTimeout(() => setBuyState('idle'), 600);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          className="w-full max-w-[420px] bg-zinc-900 border-t border-zinc-700 rounded-t-2xl p-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="font-pixel text-sm text-cyan-300">⚡ Energy</div>
            <button className="text-zinc-500 text-xs" onClick={onClose}>✕</button>
          </div>

          {/* Status */}
          <div className="rounded-md border border-zinc-700 bg-zinc-950 p-3 mb-3">
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-3xl font-pixel text-cyan-300">{profile.energy}</div>
                <div className="text-[10px] text-zinc-500">/ {cap} cap</div>
              </div>
              <div className="text-right">
                {profile.energy < cap ? (
                  <>
                    <div className="text-[10px] text-zinc-400">Next +1 in</div>
                    <div className="text-sm font-pixel text-amber-300">{formatCountdown(msUntilNext)}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">full in {formatCountdown(msUntilFull)}</div>
                  </>
                ) : (
                  <div className="text-[10px] text-emerald-400">FULL</div>
                )}
              </div>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded overflow-hidden">
              <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, (profile.energy / cap) * 100)}%` }} />
            </div>
          </div>

          {/* Buy */}
          <div className="rounded-md border border-violet-700 bg-violet-900/20 p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-pixel text-xs">Buy Energy</div>
              <div className="text-[10px] text-zinc-400">{buysLeft}/{BUY_DAILY_CAP} buys left today</div>
            </div>
            <button
              className="btn-pixel primary w-full"
              disabled={buysLeft <= 0 || profile.gems < BUY_COST_GEMS || buyState === 'buying'}
              onClick={buyEnergy}
            >
              +{BUY_AMOUNT} ⚡ for {BUY_COST_GEMS} 💎
              {buyState === 'done' && ' ✓'}
            </button>
            {profile.gems < BUY_COST_GEMS && (
              <div className="text-[10px] text-rose-400 mt-2">Need {BUY_COST_GEMS - profile.gems} more 💎</div>
            )}
          </div>

          {/* Other sources */}
          <div className="rounded-md border border-zinc-700 bg-zinc-950 p-3">
            <div className="font-pixel text-xs text-zinc-300 mb-2">Free energy sources</div>
            <ul className="text-[11px] text-zinc-400 space-y-1">
              <li>• Passive regen: +1 every 3 minutes</li>
              <li>• Daily sign-in: bonus energy some days</li>
              <li>• Daily tasks: gem rewards → buy more energy</li>
              <li>• Stage clears: level up → free 100 ⚡ on level-up</li>
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

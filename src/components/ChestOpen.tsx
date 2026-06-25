import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx, haptic } from '../lib/sfx';

export interface ChestReward {
  icon: string;       // emoji
  label: string;      // e.g. "+1000 Gold"
  color?: string;     // border accent
}

interface Props {
  open: boolean;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  rewards: ChestReward[];
  onClose: () => void;
}

const RARITY_GLOW: Record<NonNullable<Props['rarity']>, string> = {
  common: '#9ca3af',
  rare: '#facc15',
  epic: '#a855f7',
  legendary: '#f97316',
};

// 4-stage opening: chest shake → burst → reveal items → click to dismiss
export default function ChestOpen({ open, rarity = 'rare', rewards, onClose }: Props) {
  const [phase, setPhase] = useState<'shake' | 'burst' | 'reveal'>('shake');

  useEffect(() => {
    if (!open) return;
    setPhase('shake');
    const t1 = setTimeout(() => { setPhase('burst'); sfx('chest'); haptic([15, 30, 40]); }, 900);
    const t2 = setTimeout(() => setPhase('reveal'), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [open]);

  if (!open) return null;
  const glow = RARITY_GLOW[rarity];

  return (
    <AnimatePresence>
      <motion.div
        key="chest-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
        onClick={() => phase === 'reveal' && onClose()}
      >
        {/* Burst flash */}
        {phase === 'burst' && (
          <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute w-32 h-32 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, ${glow}, transparent 70%)` }}
          />
        )}

        {/* Chest stage */}
        {phase !== 'reveal' && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
              scale: phase === 'shake' ? [1, 1.05, 0.96, 1.1, 0.92, 1] : [1, 1.4, 0],
              rotate: phase === 'shake' ? [0, -6, 6, -4, 4, 0] : [0, 12, -6],
              opacity: 1,
            }}
            transition={{ duration: phase === 'shake' ? 0.85 : 0.45 }}
            className="text-8xl"
            style={{ filter: `drop-shadow(0 0 18px ${glow}aa)` }}
          >
            📦
          </motion.div>
        )}

        {/* Reveal stage */}
        {phase === 'reveal' && (
          <>
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220 }}
              className="font-pixel text-base mb-4"
              style={{ color: glow }}
            >
              REWARDS
            </motion.div>
            <div className="grid grid-cols-3 gap-3 max-w-sm">
              {rewards.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.08, type: 'spring', stiffness: 250 }}
                  className="rounded-md border-2 p-2 bg-zinc-900 text-center"
                  style={{ borderColor: r.color ?? glow, boxShadow: `0 0 10px ${r.color ?? glow}40` }}
                >
                  <div className="text-3xl">{r.icon}</div>
                  <div className="text-[10px] mt-1" style={{ color: r.color ?? glow }}>{r.label}</div>
                </motion.div>
              ))}
            </div>
            <button
              className="btn-pixel primary mt-6"
              onClick={(e) => { e.stopPropagation(); onClose(); }}
            >
              Tap to Close
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

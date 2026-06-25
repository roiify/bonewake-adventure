import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { formatCompact } from '../../lib/format';

type PillVariant = 'gold' | 'gem' | 'energy' | 'rose' | 'neutral';

/**
 * Embossed currency / stat chip. Pure CSS via `.pill-embossed` for the
 * inner-shadow + bevel look. Optional onClick turns it into a button.
 */
interface PillProps {
  icon: string;             // emoji fallback (used if iconSrc not given)
  iconSrc?: string;         // optional sprite PNG to render instead of emoji
  value?: number;           // numeric value (compact-formatted)
  label?: string;           // optional label override (no compact format)
  color?: string;           // color of the icon glyph (emoji-mode only)
  variant?: PillVariant;
  onClick?: () => void;
  title?: string;
  /** Show a "+" hint after the value (used for "tap to refill" affordance). */
  plus?: boolean;
}

export default function Pill({ icon, iconSrc, value, label, color, variant = 'neutral', onClick, title, plus }: PillProps) {
  // Pulse the whole pill briefly when value increases. Uses ref to skip
  // the initial mount so the user doesn't see a pulse on page load.
  const [pulsing, setPulsing] = useState(false);
  const prev = useRef<number | undefined>(value);
  useEffect(() => {
    if (prev.current !== undefined && value !== undefined && value > prev.current) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 400);
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  useEffect(() => { prev.current = value; }, [value]);

  const className = `pill-embossed pill-embossed--${variant}${pulsing ? ' pill-pulse' : ''}`;
  const titleAttr = title ?? (value != null ? value.toLocaleString() : undefined);

  const inner = (
    <>
      {iconSrc ? (
        <img
          src={iconSrc}
          alt=""
          className="w-5 h-5 object-contain shrink-0"
          style={{ imageRendering: 'pixelated', filter: color ? `drop-shadow(0 0 4px ${color}88)` : undefined }}
        />
      ) : (
        <span className="text-sm" style={{ color, textShadow: color ? `0 0 6px ${color}88` : undefined }}>
          {icon}
        </span>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={value ?? label}
          initial={{ y: -8, opacity: 0, scale: 0.85 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 8, opacity: 0, scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          className="text-zinc-100"
        >
          {label ?? (value != null ? formatCompact(value) : '')}
        </motion.span>
      </AnimatePresence>
      {plus && <span className="text-[8px] text-zinc-500">+</span>}
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={className} title={titleAttr}>
        {inner}
      </button>
    );
  }
  return (
    <div className={className} title={titleAttr}>{inner}</div>
  );
}

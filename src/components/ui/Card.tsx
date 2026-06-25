import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';
import { asset } from '../../lib/assetPath';

const CORNER_TL = asset('sprites/ui/frame_corner_tl.png');
const CORNER_TR = asset('sprites/ui/frame_corner_tr.png');
const CORNER_BL = asset('sprites/ui/frame_corner_bl.png');
const CORNER_BR = asset('sprites/ui/frame_corner_br.png');

/**
 * Premium card with layered shadow + top bevel + inner vignette.
 * Pure CSS via `.card-premium` (see index.css) so the same look ports
 * to any page that uses it. Pass `interactive` to add hover-lift +
 * cursor pointer; pass `goldFrame` for the gilded-corner variant.
 */
interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
  goldFrame?: boolean;
  onClick?: () => void;
  /** Apply a tinted radial wash inside the card (e.g. rose, amber, violet). */
  tint?: string;
  /** Render the four gilded corner ornaments inside the card (premium look). */
  withCorners?: boolean;
}

function Corners() {
  const cls = "absolute w-6 h-6 pointer-events-none select-none";
  const style: CSSProperties = { imageRendering: 'pixelated', opacity: 0.85 };
  return (
    <>
      <img src={CORNER_TL} alt="" className={`${cls} top-0 left-0`}        style={style} />
      <img src={CORNER_TR} alt="" className={`${cls} top-0 right-0`}       style={style} />
      <img src={CORNER_BL} alt="" className={`${cls} bottom-0 left-0`}     style={style} />
      <img src={CORNER_BR} alt="" className={`${cls} bottom-0 right-0`}    style={style} />
    </>
  );
}

export default function Card({ children, className = '', style, interactive, goldFrame, onClick, tint, withCorners }: CardProps) {
  const classes = [
    'card-premium',
    interactive ? 'card-premium--interactive' : '',
    goldFrame ? 'card-premium--gold-frame' : '',
    className,
  ].filter(Boolean).join(' ');

  const tintStyle: CSSProperties | undefined = tint ? {
    backgroundImage: `radial-gradient(ellipse at top, ${tint}22 0%, transparent 60%), linear-gradient(180deg, rgba(40, 32, 29, 0.95) 0%, rgba(20, 16, 15, 0.95) 100%)`,
  } : undefined;

  const inner = (
    <>
      {withCorners && <Corners />}
      {children}
    </>
  );

  if (interactive) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        whileHover={{ y: -2 }}
        className={classes}
        style={{ ...tintStyle, ...style, width: '100%', textAlign: 'left' }}
      >
        {inner}
      </motion.button>
    );
  }

  return (
    <div className={classes} style={{ ...tintStyle, ...style }} onClick={onClick}>
      {inner}
    </div>
  );
}

import type { ReactNode } from 'react';
import { asset } from '../../lib/assetPath';

/**
 * Premium panel using the painted Nano Banana `panel_frame.png` —
 * ornate skull-and-bone border surrounding a transparent center
 * where children render. The frame stretches to fit any aspect ratio
 * but reads best at 4:3 or wider. Reserve for "premium moment" panels
 * (boss intro, summon SSS reveal, settings root) — not for every
 * inline card, since the painted chrome is heavy.
 */
interface Props {
  children: ReactNode;
  className?: string;
  /** Inner padding adjustment — the frame eats roughly 9% on each side,
   *  so default content padding sits inside that bone border. */
  contentClassName?: string;
}

export default function Panel({ children, className = '', contentClassName = '' }: Props) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        backgroundImage: `url(${asset('sprites/ui/panel_frame.png')})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        padding: '9% 10%',
      }}
    >
      <div className={`relative ${contentClassName}`}>{children}</div>
    </div>
  );
}

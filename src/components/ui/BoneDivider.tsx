import { asset } from '../../lib/assetPath';

/**
 * Horizontal section divider using the painted Nano Banana
 * `divider_bone.png` — a single bone bar with a skull cartouche in
 * the middle, fading transparent at both ends. Drop between sections
 * for a premium hand-painted break instead of a CSS rule.
 */
interface Props {
  /** Vertical breathing room above + below the divider. Default 4 (16px). */
  my?: number;
  /** Slight horizontal inset so the bone tips don't bleed off frame. */
  className?: string;
}

export default function BoneDivider({ my = 4, className = '' }: Props) {
  return (
    <div
      className={`w-full pointer-events-none select-none ${className}`}
      style={{
        marginTop: my * 4,
        marginBottom: my * 4,
        height: 28,
        backgroundImage: `url(${asset('sprites/ui/divider_bone.png')})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
      }}
    />
  );
}

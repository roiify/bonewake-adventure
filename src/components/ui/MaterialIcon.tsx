import { MATERIAL_META } from '../../data/ultimateGear';
import { asset } from '../../lib/assetPath';

/**
 * Painted material icon. Falls back to the emoji if no iconSrc is
 * registered (older mats / hero essences). Pass `size` in pixels.
 */
interface Props {
  matId: string;
  size?: number;
  className?: string;
}

export default function MaterialIcon({ matId, size = 32, className = '' }: Props) {
  const m = MATERIAL_META[matId];
  if (!m) return null;
  if (m.iconSrc) {
    return (
      <img
        src={asset(m.iconSrc)}
        alt={m.name}
        title={m.name}
        className={className}
        style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block' }}
      />
    );
  }
  // Emoji fallback for materials without a painted icon yet
  return (
    <span
      className={className}
      title={m.name}
      style={{ fontSize: size * 0.8, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}
    >
      {m.emoji}
    </span>
  );
}

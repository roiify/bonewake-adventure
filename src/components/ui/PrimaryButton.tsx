import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'gold' | 'blood' | 'bone';

/**
 * Premium chunky button — gradient + bevel + drop shadow + shine sweep on
 * hover + scale-on-press. Built on the `.btn-premium` CSS class so the
 * full visual is portable to any other UI.
 */
interface Props {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  className?: string;
  type?: 'button' | 'submit';
  fullWidth?: boolean;
  title?: string;
}

export default function PrimaryButton({
  children, onClick, disabled, variant = 'gold', className = '', type = 'button', fullWidth, title,
}: Props) {
  const classes = [
    'btn-premium',
    `btn-premium--${variant}`,
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={classes}
      title={title}
    >
      {children}
    </motion.button>
  );
}

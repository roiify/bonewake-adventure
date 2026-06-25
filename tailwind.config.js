/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        rarity: {
          3: '#9ca3af',
          4: '#a855f7',
          5: '#f59e0b',
        },
        element: {
          fire: '#ef4444',
          water: '#3b82f6',
          earth: '#84cc16',
          light: '#fde047',
          dark: '#8b5cf6',
        },
      },
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'shake': 'shake 0.4s ease-in-out',
        'screen-shake': 'screen-shake 0.18s ease-out',
        'screen-shake-hard': 'screen-shake-hard 0.32s ease-out',
        'impact-flash': 'impact-flash 0.18s ease-out',
        'bob': 'bob 1.6s ease-in-out infinite',
        'hit-flash': 'hit-flash 0.25s ease-out',
      },
      keyframes: {
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        // Idle breathing — units gently bob while waiting for their turn.
        // Staggered per-unit via animation-delay so the field doesn't sync.
        bob: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        // Brief white-hot flash on the sprite the moment damage lands.
        'hit-flash': {
          '0%': { filter: 'brightness(2.4) saturate(0.5)' },
          '100%': { filter: 'brightness(1)' },
        },
        // Global battlefield shake — short, sharp, decays toward 0.
        'screen-shake': {
          '0%':   { transform: 'translate(0, 0)' },
          '20%':  { transform: 'translate(-6px, 3px)' },
          '40%':  { transform: 'translate(5px, -2px)' },
          '60%':  { transform: 'translate(-3px, 1px)' },
          '80%':  { transform: 'translate(2px, -1px)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        'screen-shake-hard': {
          '0%':   { transform: 'translate(0, 0)' },
          '10%':  { transform: 'translate(-12px, 6px)' },
          '25%':  { transform: 'translate(10px, -5px)' },
          '40%':  { transform: 'translate(-8px, 4px)' },
          '55%':  { transform: 'translate(7px, -3px)' },
          '70%':  { transform: 'translate(-4px, 2px)' },
          '85%':  { transform: 'translate(2px, -1px)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        // Quick white flash overlay for impact frames.
        'impact-flash': {
          '0%':   { opacity: '0' },
          '20%':  { opacity: '0.55' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

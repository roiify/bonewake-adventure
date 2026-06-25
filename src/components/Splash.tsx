import { motion, AnimatePresence } from 'framer-motion';
import { asset } from '../lib/assetPath';

const SPLASH = asset('sprites/ui/splash.png');

/**
 * Full-screen loading splash. Painted Nano Banana art with title +
 * loading message overlay. Fades out smoothly once `visible` flips
 * to false (typically once profile + heroes + equipment have loaded).
 */
export default function Splash({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          className="fixed inset-0 z-[100] flex flex-col"
          style={{
            backgroundImage: `url(${SPLASH})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundColor: '#0a0303',
          }}
        >
          {/* Bottom darken for title legibility */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(10,3,3,0.95) 80%)' }}
          />
          <div className="relative z-10 mt-auto pb-12 px-8 text-center">
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { duration: 0.6, delay: 0.15 } }}
              className="font-fantasy text-5xl font-bold tracking-[0.25em]"
              style={{
                color: '#fde68a',
                textShadow: '0 3px 0 rgba(0,0,0,0.95), 0 0 30px rgba(220,38,38,0.7), 0 0 8px rgba(0,0,0,0.9)',
              }}
            >
              BONEWAKE
            </motion.h1>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.4 } }}
              className="mt-4 text-[11px] tracking-[0.4em] uppercase text-amber-200/70 italic"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
            >
              The dead are restless
            </motion.div>
            {/* Tiny throbbing loading dot */}
            <div className="mt-6 flex justify-center gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-amber-300"
                  style={{ boxShadow: '0 0 6px #fbbf24' }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

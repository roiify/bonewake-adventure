import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { initSave } from './lib/db';
import { uid } from './lib/id';
import { useProfile } from './store/profile';
import { useHeroes } from './store/heroes';
import { useItems } from './store/items';
import { useAdventure } from './store/adventure';
import Splash from './components/Splash';
import AdventurePage from './pages/AdventurePage';
import BattlePlayPage from './pages/BattlePlayPage';

// Bonewake Adventure — standalone walkable dark-fantasy RPG. Reuses the combat
// engine + sprite library from the original Bonewake, but the only game here is
// the Adventure: explore, recruit, fight, find the cure. No gacha meta.
export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initSave();
      await useProfile.getState().load();
      await useHeroes.getState().load();
      await useItems.getState().load();
      await useAdventure.getState().load();
      // Seed the protagonist so the Adventure party always has a leader.
      if (useHeroes.getState().heroes.length === 0) {
        const starter = { id: uid(), templateId: 'kengo', level: 1, exp: 0, star: 3 as const, equipped: {}, obtainedAt: 0 };
        await useHeroes.getState().addHero(starter);
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return <Splash visible={true} />;

  // BrowserRouter basename mirrors Vite's base so GitHub Pages subpath works.
  const basename = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const reduceMotion = useProfile.getState().profile.settings?.reduceMotion ?? false;

  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'never'}>
      <BrowserRouter basename={basename || undefined}>
        <Routes>
          <Route path="/" element={<div className="h-full bg-zinc-950"><AdventurePage /></div>} />
          <Route path="/battle/play/:stageId" element={
            <div className="h-full max-w-[480px] mx-auto bg-zinc-950"><BattlePlayPage /></div>
          } />
        </Routes>
      </BrowserRouter>
    </MotionConfig>
  );
}

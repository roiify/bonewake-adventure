import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdventurePage from './pages/AdventurePage';

// Bonewake Adventure — standalone, self-contained walkable action-RPG. The ONLY
// thing borrowed from the original Bonewake gacha game is the sprite PNGs under
// public/sprites/. All stats, leveling, gear, combat, and saving are native.
export default function App() {
  const basename = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const page = <div className="h-full bg-zinc-950"><AdventurePage /></div>;
  return (
    <BrowserRouter basename={basename || undefined}>
      <Routes>
        <Route path="/" element={page} />
        {/* catch-all so stale deep-links (e.g. old /battle/play/adv) still land in-game */}
        <Route path="*" element={page} />
      </Routes>
    </BrowserRouter>
  );
}

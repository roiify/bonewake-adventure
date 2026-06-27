import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AdventurePage from './pages/AdventurePage';
import CharacterSelect from './components/adventure/CharacterSelect';
import { useAdventure } from './store/adventure';

// Bonewake Adventure — standalone pixel action-RPG. Only the sprite PNGs are
// shared with the original gacha game. Character SELECT first, then the game
// for the chosen slot. All stats/leveling/gear/save are native.
export default function App() {
  const activeId = useAdventure((s) => s.activeId);
  useEffect(() => { useAdventure.getState().load(); }, []);

  const basename = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const content = activeId
    ? <div className="h-full bg-zinc-950"><AdventurePage /></div>
    : <CharacterSelect />;

  return (
    <BrowserRouter basename={basename || undefined}>
      <Routes>
        <Route path="*" element={content} />
      </Routes>
    </BrowserRouter>
  );
}

import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { migrateLegacyDb } from './lib/db'

// One-time localStorage rename: pf_<x> → bonewake_<x>. Squad, last-stage,
// presets, lifetime markers etc. all lived under pf_ before the rebrand.
function migrateLegacyLocalStorage() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('pf_')) continue;
      const newKey = `bonewake_${key.slice(3)}`;
      if (localStorage.getItem(newKey) != null) continue;  // new already wins
      const value = localStorage.getItem(key);
      if (value != null) localStorage.setItem(newKey, value);
      localStorage.removeItem(key);
    }
  } catch { /* private mode etc. */ }
}

// One-time IndexedDB rename: copy the user's existing pixel-fighter-save
// into bonewake-save before React mounts so the roster/equipment/progress
// shows up under the new DB name.
migrateLegacyLocalStorage();
migrateLegacyDb().finally(() => {
  createRoot(document.getElementById('root')!).render(<App />);
});

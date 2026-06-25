import { useState } from 'react';
import type { DialogueLine } from '../../data/adventure/types';

// Bottom-of-screen dialogue overlay: advances one line per tap/click, then
// closes. Tone-neutral chrome; the writing carries the mood.
export default function DialogueBox({ lines, onClose }: { lines: DialogueLine[]; onClose: () => void }) {
  const [i, setI] = useState(0);
  const line = lines[i];
  if (!line) { onClose(); return null; }
  const last = i >= lines.length - 1;
  const next = () => (last ? onClose() : setI(i + 1));

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center" onClick={next}>
      <div className="w-full max-w-[460px] m-3 mb-5 rounded-xl border border-red-900/50 bg-zinc-950/95 p-4 shadow-[0_0_30px_rgba(0,0,0,0.7)]">
        {line.who && <div className="text-red-400 text-xs font-bold tracking-wide uppercase mb-1">{line.who}</div>}
        <p className="text-zinc-100 text-sm leading-relaxed min-h-[2.5rem]">{line.text}</p>
        <div className="flex justify-between items-center mt-2">
          <span className="text-zinc-600 text-[10px]">{i + 1}/{lines.length}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="px-3 py-1 rounded-lg bg-red-900/60 text-zinc-100 text-xs border border-red-800 active:bg-red-800"
          >
            {last ? 'Close' : 'Next ▸'}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  createBackup,
  deleteBackup,
  downloadBackup,
  formatBackupTime,
  listBackups,
  restoreBackup,
} from '../lib/backup';
import type { SaveBackup } from '../lib/db';

function sourceColor(s: SaveBackup['source']) {
  return s === 'manual' ? '#a855f7' : s === 'pre-restore' ? '#f59e0b' : '#22c55e';
}

export default function BackupsPanel() {
  const [list, setList] = useState<SaveBackup[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function refresh() { setList(await listBackups()); }
  useEffect(() => { refresh(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  async function makeNow() {
    setBusy(true);
    try {
      await createBackup('manual');
      await refresh();
      showToast('✓ Backup saved');
    } finally { setBusy(false); }
  }

  async function restoreOne(id: number) {
    if (!confirm('Restore this backup? Your current save will be auto-backed up first.')) return;
    setBusy(true);
    try {
      const r = await restoreBackup(id);
      if (r.ok) {
        showToast('✓ Restored — reloading…');
        setTimeout(() => window.location.reload(), 800);
      } else {
        showToast(r.error ?? 'Restore failed');
      }
    } finally { setBusy(false); }
  }

  async function removeOne(id: number) {
    if (!confirm('Delete this backup permanently?')) return;
    await deleteBackup(id);
    await refresh();
  }

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-pixel text-xs text-amber-300">Backups (Safety Net)</div>
        <div className="text-[9px] text-zinc-500">Auto-snap daily</div>
      </div>
      <p className="text-[10px] text-zinc-400 leading-snug">
        A snapshot is taken automatically once per day (keeping the last 7).
        Restoring takes a "pre-restore" backup first so you can undo. For maximum
        safety, also download a copy to your device.
      </p>

      <div className="flex gap-2">
        <button className="btn-pixel primary flex-1" disabled={busy} onClick={makeNow}>
          Snapshot Now
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-[10px] text-zinc-500 text-center py-3">No backups yet.</div>
      ) : (
        <div className="space-y-1.5">
          {list.map(b => (
            <div key={b.id} className="rounded border border-zinc-700 bg-zinc-950 p-2">
              <div className="flex items-center gap-2">
                <span
                  className="text-[9px] font-pixel px-1.5 py-0.5 rounded uppercase shrink-0"
                  style={{ background: sourceColor(b.source) + '20', color: sourceColor(b.source) }}
                >{b.source}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-pixel truncate">{b.label}</div>
                  <div className="text-[9px] text-zinc-500">
                    LVL:{b.level} · {b.heroCount} heroes · {b.gold.toLocaleString()}🪙 · {b.gems}💎 · {formatBackupTime(b.createdAt)}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 mt-2">
                <button className="btn-pixel flex-1" disabled={busy} onClick={() => downloadBackup(b)}>Download</button>
                <button className="btn-pixel success flex-1" disabled={busy} onClick={() => b.id != null && restoreOne(b.id)}>Restore</button>
                <button className="btn-pixel danger" disabled={busy} onClick={() => b.id != null && removeOne(b.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="text-[10px] font-pixel text-emerald-400 text-center pt-1">{toast}</div>
      )}
    </div>
  );
}

import { db, type MailMessage } from './db';
import { useProfile } from '../store/profile';
import { addMaterial } from './crafting';
import { MAT_SOULSHARD } from '../data/ultimateGear';

export async function sendMail(msg: Omit<MailMessage, 'id' | 'sentAt' | 'read' | 'claimed'>) {
  await db.mail.add({
    ...msg,
    sentAt: Date.now(),
    read: false,
    claimed: false,
  });
}

export async function markRead(id: number) {
  await db.mail.update(id, { read: true });
}

export async function claimMail(id: number): Promise<boolean> {
  const m = await db.mail.get(id);
  if (!m || m.claimed) return false;
  const p = useProfile.getState();
  const r = m.rewards;
  if (r.gold) await p.addGold(r.gold);
  if (r.gems) await p.addGems(r.gems);
  if (r.friendPoints) await p.addFriendPoints(r.friendPoints);
  if (r.soulshard) await addMaterial(MAT_SOULSHARD, r.soulshard);
  if (r.energy) {
    const cur = p.profile;
    await p.patch({ energy: Math.min(999, cur.energy + r.energy) });
  }
  await db.mail.update(id, { claimed: true, read: true });
  return true;
}

export async function getUnreadCount(): Promise<number> {
  const all = await db.mail.toArray();
  return all.filter(m => !m.read).length;
}

export async function purgeOldMail() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await db.mail.where('sentAt').below(cutoff).delete();
}

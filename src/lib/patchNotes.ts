// On every app boot, if the build SHA differs from the last one the user saw,
// drop a "What's New" mail entry into their inbox so they always see what changed.
import { useProfile } from '../store/profile';
import { sendMail } from './mail';
import { db } from './db';

const SEEN_KEY = 'patch_seen_sha';

export async function maybeNotifyPatchNotes() {
  try {
    const sha = (typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__) || 'dev';
    const msg = (typeof __APP_COMMIT_MSG__ !== 'undefined' && __APP_COMMIT_MSG__) || 'Local build';
    if (sha === 'dev') return;  // skip in local dev

    const seen = await db.items.get(SEEN_KEY);
    if (seen?.templateId === SEEN_KEY && (seen as any).sha === sha) return;

    // First boot also skips (user just installed; no "before" to compare)
    const profile = useProfile.getState().profile;
    if (!profile.welcomeMailSent) {
      await db.items.put({ templateId: SEEN_KEY, count: 1, sha } as any);
      return;
    }

    await sendMail({
      subject: `📰 What's New (${sha})`,
      body: `Latest update:\n\n${msg}\n\nReward attached as a thank-you for keeping the game updated.`,
      rewards: { gold: 500, gems: 20, energy: 30 },
    });
    await db.items.put({ templateId: SEEN_KEY, count: 1, sha } as any);
  } catch (e) {
    console.warn('patch-notes mail failed', e);
  }
}

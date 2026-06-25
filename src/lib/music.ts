// Background music — one looping track at a time with a short cross-fade.
// Tracks: Kevin MacLeod (incompetech.com), licensed CC BY 4.0.
//   menu:   "Penumbra" · battle: "Crusade" · boss: "Five Armies"
// Browsers block audio until the first user gesture, so a failed play()
// queues the track and retries on the next pointer/key event.
import { useProfile } from '../store/profile';
import { asset } from './assetPath';

export type MusicKey = 'menu' | 'battle' | 'boss';

const TRACKS: Record<MusicKey, string> = {
  menu: asset('audio/menu_theme.mp3'),
  battle: asset('audio/battle_theme.mp3'),
  boss: asset('audio/boss_theme.mp3'),
};

const VOLUME: Record<MusicKey, number> = { menu: 0.35, battle: 0.4, boss: 0.45 };
const FADE_MS = 600;

let current: HTMLAudioElement | null = null;
let currentKey: MusicKey | null = null;
let pendingKey: MusicKey | null = null;
let gestureHooked = false;

function musicEnabled(): boolean {
  try {
    return useProfile.getState().profile?.settings?.music ?? true;
  } catch {
    return true;
  }
}

function fadeOut(el: HTMLAudioElement) {
  const step = el.volume / (FADE_MS / 50);
  const iv = setInterval(() => {
    el.volume = Math.max(0, el.volume - step);
    if (el.volume <= 0.01) {
      clearInterval(iv);
      el.pause();
      el.src = '';
    }
  }, 50);
}

function fadeIn(el: HTMLAudioElement, target: number) {
  el.volume = 0;
  const step = target / (FADE_MS / 50);
  const iv = setInterval(() => {
    el.volume = Math.min(target, el.volume + step);
    if (el.volume >= target) clearInterval(iv);
  }, 50);
}

function hookGesture() {
  if (gestureHooked) return;
  gestureHooked = true;
  const retry = () => {
    if (pendingKey) {
      const k = pendingKey;
      pendingKey = null;
      playMusic(k);
    }
    document.removeEventListener('pointerdown', retry);
    document.removeEventListener('keydown', retry);
    gestureHooked = false;
  };
  document.addEventListener('pointerdown', retry);
  document.addEventListener('keydown', retry);
}

export function playMusic(key: MusicKey) {
  if (!musicEnabled()) { currentKey = key; return; } // remember intent for toggle-on
  if (currentKey === key && current && !current.paused) return;
  if (current) fadeOut(current);
  const el = new Audio(TRACKS[key]);
  el.loop = true;
  current = el;
  currentKey = key;
  el.play().then(() => fadeIn(el, VOLUME[key])).catch(() => {
    // Autoplay blocked — retry on the first user gesture.
    pendingKey = key;
    current = null;
    hookGesture();
  });
}

// Dev introspection — lets tests confirm what's actually playing.
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__musicState = () => ({
    key: currentKey, playing: !!current && !current.paused, pending: pendingKey,
  });
}

export function stopMusic() {
  if (current) fadeOut(current);
  current = null;
  currentKey = null;
  pendingKey = null;
}

// Settings toggle support: re-assert the remembered track when music is
// switched on, kill playback when switched off.
export function syncMusicSetting(enabled: boolean) {
  if (!enabled) {
    if (current) fadeOut(current);
    current = null;
  } else if (currentKey) {
    const k = currentKey;
    currentKey = null;
    playMusic(k);
  } else {
    playMusic('menu');
  }
}

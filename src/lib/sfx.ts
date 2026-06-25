// Procedural sound + haptics. There are deliberately NO audio files: every
// effect is synthesized with the Web Audio API at call time. That keeps the
// PWA install tiny (the whole point of the precache fix), works offline, and
// finally makes the "Sound effects" setting do something (the game shipped
// with an Audio toggle and zero audio).
//
// Gated on profile.settings.soundEnabled / hapticsEnabled. The AudioContext is
// created lazily on the first call (which always happens inside a user gesture
// — a tap — so autoplay policy is satisfied) and resumed if suspended.
import { useProfile } from '../store/profile';

let ctx: AudioContext | null = null;

function soundOn(): boolean {
  return useProfile.getState().profile.settings?.soundEnabled ?? true;
}
function hapticsOn(): boolean {
  return useProfile.getState().profile.settings?.hapticsEnabled ?? true;
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// One oscillator voice: freq glide from->to, with an attack/decay envelope.
function voice(
  c: AudioContext,
  opts: { type?: OscillatorType; from: number; to?: number; dur: number; gain?: number; delay?: number; },
) {
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'square';
  osc.frequency.setValueAtTime(opts.from, t0);
  if (opts.to && opts.to !== opts.from) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
  }
  const peak = opts.gain ?? 0.12;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.02);
}

// Short filtered noise burst (impacts).
function noise(c: AudioContext, dur: number, gain = 0.15, hp = 600) {
  const t0 = c.currentTime;
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur);
}

export type SfxName =
  | 'hit' | 'crit' | 'heal' | 'ult' | 'burn'
  | 'reveal' | 'reveal_rare' | 'chest' | 'click' | 'win' | 'lose';

export function sfx(name: SfxName): void {
  if (!soundOn()) return;
  const c = getCtx();
  if (!c) return;
  switch (name) {
    case 'hit':
      noise(c, 0.09, 0.13, 800);
      voice(c, { type: 'square', from: 180, to: 90, dur: 0.09, gain: 0.08 });
      break;
    case 'crit':
      noise(c, 0.14, 0.18, 500);
      voice(c, { type: 'sawtooth', from: 320, to: 120, dur: 0.16, gain: 0.13 });
      voice(c, { type: 'square', from: 640, to: 200, dur: 0.12, gain: 0.07, delay: 0.02 });
      break;
    case 'heal':
      voice(c, { type: 'sine', from: 440, to: 880, dur: 0.22, gain: 0.09 });
      voice(c, { type: 'sine', from: 660, to: 990, dur: 0.22, gain: 0.05, delay: 0.04 });
      break;
    case 'ult':
      voice(c, { type: 'sawtooth', from: 120, to: 60, dur: 0.4, gain: 0.16 });
      voice(c, { type: 'square', from: 480, to: 1200, dur: 0.3, gain: 0.08 });
      noise(c, 0.3, 0.16, 300);
      break;
    case 'burn':
      noise(c, 0.18, 0.07, 1200);
      break;
    case 'reveal':
      [523, 659, 784].forEach((f, i) => voice(c, { type: 'triangle', from: f, dur: 0.18, gain: 0.08, delay: i * 0.06 }));
      break;
    case 'reveal_rare':
      // Bigger ascending arpeggio + shimmer for SSS/high-rarity pulls.
      [523, 659, 784, 1047, 1319].forEach((f, i) =>
        voice(c, { type: 'triangle', from: f, dur: 0.3, gain: 0.1, delay: i * 0.07 }));
      voice(c, { type: 'sine', from: 1568, to: 2093, dur: 0.5, gain: 0.05, delay: 0.35 });
      break;
    case 'chest':
      voice(c, { type: 'square', from: 220, to: 440, dur: 0.12, gain: 0.12 });
      noise(c, 0.16, 0.12, 700);
      break;
    case 'click':
      voice(c, { type: 'square', from: 660, to: 660, dur: 0.04, gain: 0.05 });
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => voice(c, { type: 'triangle', from: f, dur: 0.22, gain: 0.1, delay: i * 0.1 }));
      break;
    case 'lose':
      [392, 330, 262].forEach((f, i) => voice(c, { type: 'sawtooth', from: f, dur: 0.3, gain: 0.1, delay: i * 0.12 }));
      break;
  }
}

// Haptic feedback (mobile). Gated on the setting + API availability.
export function haptic(pattern: number | number[]): void {
  if (!hapticsOn()) return;
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

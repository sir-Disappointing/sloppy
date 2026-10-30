import { state } from './state';

// Tiny synthesized sound effects. From the AI Update on, they're "enhanced".

let ctx: AudioContext | null = null;
export let muted = false;

export function toggleMute(): boolean {
  muted = !muted;
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.08) {
  if (muted) return;
  try {
    ctx ??= new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = state.patch >= 3 ? 'sawtooth' : type;
    o.frequency.value = freq * (state.patch >= 3 ? 0.9 + Math.random() * 0.25 : 1);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch {
    // No audio, no problem.
  }
}

export const sfx = {
  tap: () => tone(500 + Math.random() * 120, 0.08, 'triangle'),
  buy: () => {
    tone(660, 0.1, 'sine');
    setTimeout(() => tone(990, 0.15, 'sine'), 80);
  },
  denied: () => tone(140, 0.15, 'square', 0.05),
  win: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle'), i * 90)),
  popup: () => tone(880, 0.12, 'square', 0.04),
};

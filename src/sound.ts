import type { Feedback } from './game/types';
import { load, save } from './storage';

/** Tiny chiptune synth on WebAudio. Muted by default; no context before user interaction. */
let ctx: AudioContext | null = null;
let enabled = load<boolean>('sound', false);

export function isSoundOn(): boolean {
  return enabled;
}

export function setSound(on: boolean): void {
  enabled = on;
  save('sound', on);
  if (on) ensureContext();
}

function ensureContext(): AudioContext | null {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.06,
): void {
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.setValueAtTime(vol, t0 + dur * 0.7);
  gain.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function play(notes: [number, number][], step: number, type?: OscillatorType): void {
  if (!enabled) return;
  notes.forEach(([f, len], i) => tone(f, i * step, len, type));
}

export const sfx = {
  key: () => play([[1320, 0.025]], 0),
  move: () => play([[880, 0.03]], 0),
  submit: () =>
    play(
      [
        [660, 0.05],
        [990, 0.07],
      ],
      0.05,
    ),
  error: () =>
    play(
      [
        [220, 0.08],
        [180, 0.12],
      ],
      0.08,
    ),
  reveal: (f: Feedback) =>
    play(
      f === 'green'
        ? [
            [1047, 0.06],
            [1568, 0.08],
          ]
        : f === 'yellow'
          ? [[784, 0.07]]
          : [[262, 0.06]],
      0.05,
      f === 'gray' ? 'triangle' : 'square',
    ),
  win: () =>
    play(
      [
        [523, 0.1],
        [659, 0.1],
        [784, 0.1],
        [1047, 0.12],
        [784, 0.08],
        [1047, 0.3],
      ],
      0.11,
    ),
  lose: () =>
    play(
      [
        [523, 0.15],
        [440, 0.15],
        [349, 0.15],
        [262, 0.4],
      ],
      0.17,
      'triangle',
    ),
};

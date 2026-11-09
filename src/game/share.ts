import type { Feedback, GameMode, GuessResult } from './types';

const SQUARE: Record<Feedback, string> = {
  green: '\u{1F7E9}',
  yellow: '\u{1F7E8}',
  gray: '⬛',
};

export interface ShareInput {
  mode: GameMode;
  dayNumber?: number;
  results: readonly GuessResult[];
  won: boolean;
  maxGuesses: number;
  url?: string;
}

/** Spoiler-free emoji grid, one row per guess in the order they were made. */
export function buildShareText(input: ShareInput): string {
  const score = input.won ? String(input.results.length) : 'X';
  const label = input.mode === 'daily' ? `#${input.dayNumber ?? 0}` : 'FREE PLAY';
  const header = `HOOPDLE ${label} ${score}/${input.maxGuesses}`;
  const rows = input.results.map((r) => r.attributes.map((a) => SQUARE[a.feedback]).join(''));
  return [header, '', ...rows, ...(input.url ? ['', input.url] : [])].join('\n');
}

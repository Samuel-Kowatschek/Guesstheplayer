import { describe, expect, it } from 'vitest';
import { buildShareText } from '../src/game/share';
import type { Feedback, GuessResult } from '../src/game/types';

function row(fb: Feedback[], correct = false): GuessResult {
  const keys = ['team', 'position', 'height', 'age', 'jersey', 'country'] as const;
  return {
    playerId: 1,
    correct,
    attributes: fb.map((f, i) => ({ key: keys[i]!, feedback: f, direction: null, display: 'X' })),
  };
}

describe('buildShareText', () => {
  const g = 'green' as const;
  const y = 'yellow' as const;
  const x = 'gray' as const;

  it('builds the daily header and grid', () => {
    const text = buildShareText({
      mode: 'daily',
      dayNumber: 12,
      won: true,
      maxGuesses: 8,
      results: [row([x, y, x, x, y, g]), row([g, g, g, g, g, g], true)],
    });
    expect(text).toBe('HOOPDLE #12 2/8\n\n⬛🟨⬛⬛🟨🟩\n🟩🟩🟩🟩🟩🟩');
  });

  it('uses X on a loss and labels free play', () => {
    const text = buildShareText({
      mode: 'free',
      won: false,
      maxGuesses: 8,
      results: [row([x, x, x, x, x, x])],
    });
    expect(text.split('\n')[0]).toBe('HOOPDLE FREE PLAY X/8');
  });

  it('contains no player names or values', () => {
    const text = buildShareText({
      mode: 'daily',
      dayNumber: 1,
      won: true,
      maxGuesses: 8,
      results: [row([g, g, g, g, g, g], true)],
      url: 'https://example.com/hoopdle/',
    });
    expect(text).not.toContain('X\n');
    expect(text.endsWith('https://example.com/hoopdle/')).toBe(true);
  });
});

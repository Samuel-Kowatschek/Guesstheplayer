import { describe, expect, it } from 'vitest';
import { effectiveStreak, emptyStats, recordGame, winRate } from '../src/game/stats';
import { describeGuess } from '../src/game/a11y';
import { strings } from '../src/i18n';
import type { GuessResult } from '../src/game/types';

describe('stats', () => {
  it('counts wins, streaks and distribution', () => {
    let s = emptyStats(8);
    s = recordGame(s, { day: 1, won: true, guesses: 3 });
    s = recordGame(s, { day: 2, won: true, guesses: 5 });
    expect(s).toMatchObject({ played: 2, wins: 2, currentStreak: 2, maxStreak: 2 });
    expect(s.distribution[2]).toBe(1);
    expect(s.distribution[4]).toBe(1);
    expect(winRate(s)).toBe(100);
  });
  it('resets the streak on a loss or a skipped day', () => {
    let s = emptyStats(8);
    s = recordGame(s, { day: 1, won: true, guesses: 3 });
    s = recordGame(s, { day: 2, won: false, guesses: 8 });
    expect(s.currentStreak).toBe(0);
    s = recordGame(s, { day: 3, won: true, guesses: 1 });
    s = recordGame(s, { day: 5, won: true, guesses: 1 });
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(1);
    expect(winRate(s)).toBe(75);
  });
  it('ignores a second record of the same day', () => {
    const s = recordGame(emptyStats(8), { day: 1, won: true, guesses: 2 });
    expect(recordGame(s, { day: 1, won: true, guesses: 2 })).toBe(s);
  });
  it('shows streak 0 after a missed day', () => {
    const s = recordGame(emptyStats(8), { day: 1, won: true, guesses: 2 });
    expect(effectiveStreak(s, 2)).toBe(1);
    expect(effectiveStreak(s, 3)).toBe(0);
  });
});

describe('describeGuess', () => {
  it('produces readable text for screen readers', () => {
    const r: GuessResult = {
      playerId: 1,
      correct: false,
      attributes: [
        {
          key: 'team',
          feedback: 'yellow',
          direction: null,
          display: 'LAL',
          sub: 'West',
          detail: 'Pacific',
        },
        { key: 'position', feedback: 'gray', direction: null, display: 'C' },
        { key: 'height', feedback: 'gray', direction: 'up', display: '6\'9"' },
        { key: 'age', feedback: 'yellow', direction: 'down', display: '30' },
        { key: 'jersey', feedback: 'green', direction: null, display: '#3' },
        { key: 'country', feedback: 'yellow', direction: null, display: 'Serbia' },
      ],
    };
    expect(describeGuess('Some Guy', r, 81, strings('en').a11y)).toBe(
      'Some Guy. Team LAL (West, Pacific): wrong, same division. Position C: wrong. ' +
        'Height 6 feet 9: higher. Age 30: close, lower. Number #3: correct. ' +
        'Country Serbia: wrong, same continent.',
    );
    expect(describeGuess('Some Guy', r, 81, strings('de').a11y)).toContain(
      'Größe 6 Fuß 9: höher. Alter 30: nah dran, niedriger.',
    );
  });
});

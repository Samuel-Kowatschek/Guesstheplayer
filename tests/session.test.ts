import { describe, expect, it } from 'vitest';
import { applyGuess, GuessError, newGame, sanitizeState } from '../src/game/session';
import { countryCode } from '../src/game/countries';

describe('session', () => {
  it('wins when the secret is guessed', () => {
    let s = newGame('free', 7);
    s = applyGuess(s, 1, 3);
    expect(s.status).toBe('playing');
    s = applyGuess(s, 7, 3);
    expect(s.status).toBe('won');
    expect(() => applyGuess(s, 2, 3)).toThrow(GuessError);
  });
  it('loses after max guesses', () => {
    let s = newGame('daily', 7, { dateKey: '2026-11-09', day: 9 });
    for (const id of [1, 2, 3]) s = applyGuess(s, id, 3);
    expect(s.status).toBe('lost');
    expect(s.day).toBe(9);
  });
  it('rejects duplicate guesses', () => {
    const s = applyGuess(newGame('free', 7), 1, 8);
    expect(() => applyGuess(s, 1, 8)).toThrow('Already guessed');
  });
  it('sanitizes persisted state', () => {
    const known = new Set([1, 2, 3, 7]);
    expect(sanitizeState(null, known, 8)).toBeNull();
    expect(sanitizeState({ mode: 'daily', secretId: 99 }, known, 8)).toBeNull();
    const s = sanitizeState(
      { mode: 'daily', secretId: 7, guessIds: [1, 1, 42, 7], status: 'playing', day: 3 },
      known,
      8,
    );
    expect(s).toEqual({ mode: 'daily', secretId: 7, guessIds: [1, 7], status: 'won', day: 3 });
  });
});

describe('countryCode', () => {
  it('maps known countries and falls back to 3 letters', () => {
    expect(countryCode('Bosnia and Herzegovina')).toBe('BIH');
    expect(countryCode('Atlantis')).toBe('ATL');
  });
});

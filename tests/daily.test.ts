import { describe, expect, it } from 'vitest';
import {
  dailyPlayerId,
  dayNumber,
  hashString,
  localDateKey,
  randomPlayerId,
} from '../src/game/daily';

const ids = Array.from({ length: 200 }, (_, i) => 1000 + i * 7);

describe('daily selection', () => {
  it('is deterministic for the same date', () => {
    expect(dailyPlayerId(ids, '2026-11-09')).toBe(dailyPlayerId(ids, '2026-11-09'));
  });
  it('does not depend on input order', () => {
    const shuffled = [...ids].reverse();
    expect(dailyPlayerId(shuffled, '2026-11-09')).toBe(dailyPlayerId(ids, '2026-11-09'));
  });
  it('varies across days', () => {
    const picks = new Set(
      Array.from({ length: 30 }, (_, d) =>
        dailyPlayerId(ids, `2026-12-${String(d + 1).padStart(2, '0')}`),
      ),
    );
    expect(picks.size).toBeGreaterThan(20);
  });
  it('is stable (regression guard for the hash)', () => {
    expect(hashString('hoopdle-v1:2026-11-09')).toBe(hashString('hoopdle-v1:2026-11-09'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
  it('throws on an empty pool', () => {
    expect(() => dailyPlayerId([], '2026-11-09')).toThrow();
  });
});

describe('dates', () => {
  it('formats a local date key', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('numbers days from the epoch', () => {
    expect(dayNumber('2026-11-01', '2026-11-01')).toBe(1);
    expect(dayNumber('2026-11-09', '2026-11-01')).toBe(9);
    expect(dayNumber('2027-03-29', '2027-03-27')).toBe(3); // across a DST change
  });
});

describe('random', () => {
  it('avoids the previous id', () => {
    for (let i = 0; i < 50; i++) expect(randomPlayerId([1, 2], 1)).toBe(2);
  });
  it('uses the given rng', () => {
    expect(randomPlayerId([5, 6, 7], undefined, () => 0.99)).toBe(7);
  });
});

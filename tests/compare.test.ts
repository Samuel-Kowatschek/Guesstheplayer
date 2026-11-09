import { describe, expect, it } from 'vitest';
import {
  compareAge,
  compareCountry,
  compareGuess,
  compareHeight,
  compareJersey,
  compareNumber,
  comparePosition,
  compareTeam,
} from '../src/game/compare';
import { ageOn } from '../src/game/age';
import { formatHeight } from '../src/game/format';
import { makePlayer } from './helpers';

const T = { heightInches: 2, ageYears: 2, jersey: 3 };
const NOW = new Date(2026, 10, 9); // 2026-11-09 local

describe('compareNumber', () => {
  it('green on exact match without arrow', () => {
    expect(compareNumber(5, 5, 2)).toEqual({ feedback: 'green', direction: null });
  });
  it('yellow at exactly the threshold (inclusive)', () => {
    expect(compareNumber(5, 7, 2)).toEqual({ feedback: 'yellow', direction: 'up' });
    expect(compareNumber(7, 5, 2)).toEqual({ feedback: 'yellow', direction: 'down' });
  });
  it('gray just outside the threshold, arrow points to the secret', () => {
    expect(compareNumber(5, 8, 2)).toEqual({ feedback: 'gray', direction: 'up' });
    expect(compareNumber(8, 5, 2)).toEqual({ feedback: 'gray', direction: 'down' });
  });
});

describe('team', () => {
  const lal = makePlayer({ teamId: 1, teamAbbr: 'LAL', division: 'Pacific', conference: 'West' });
  it('green for same team', () => {
    expect(compareTeam(lal, makePlayer({ teamId: 1, division: 'Pacific' })).feedback).toBe('green');
  });
  it('yellow for same division', () => {
    const gsw = makePlayer({ teamId: 2, teamAbbr: 'GSW', division: 'Pacific' });
    expect(compareTeam(lal, gsw).feedback).toBe('yellow');
  });
  it('gray otherwise, but shows conference as sub text', () => {
    const den = makePlayer({ teamId: 3, division: 'Northwest', conference: 'West' });
    const r = compareTeam(lal, den);
    expect(r.feedback).toBe('gray');
    expect(r.display).toBe('LAL');
    expect(r.sub).toBe('WEST');
  });
});

describe('position', () => {
  const pos = (g: string, s: string) =>
    comparePosition(makePlayer({ position: g }), makePlayer({ position: s })).feedback;
  it('green when identical', () => expect(pos('G-F', 'G-F')).toBe('green'));
  it('green when same letters in different order', () => expect(pos('F-G', 'G-F')).toBe('green'));
  it('yellow when sharing a letter', () => {
    expect(pos('G', 'G-F')).toBe('yellow');
    expect(pos('F-C', 'C')).toBe('yellow');
    expect(pos('G-F', 'F-C')).toBe('yellow');
  });
  it('gray when nothing shared', () => {
    expect(pos('G', 'C')).toBe('gray');
    expect(pos('G', 'F-C')).toBe('gray');
  });
});

describe('height', () => {
  it('formats feet and inches', () => {
    expect(formatHeight(81)).toBe('6\'9"');
    expect(formatHeight(84)).toBe('7\'0"');
  });
  it('compares in inches', () => {
    const g = makePlayer({ heightInches: 79 });
    expect(compareHeight(g, makePlayer({ heightInches: 79 }), T).feedback).toBe('green');
    expect(compareHeight(g, makePlayer({ heightInches: 81 }), T)).toMatchObject({
      feedback: 'yellow',
      direction: 'up',
      display: '6\'7"',
    });
    expect(compareHeight(g, makePlayer({ heightInches: 76 }), T)).toMatchObject({
      feedback: 'gray',
      direction: 'down',
    });
  });
});

describe('age', () => {
  it('computes age from birth date, respecting birthdays', () => {
    expect(ageOn('2000-11-09', NOW)).toBe(26);
    expect(ageOn('2000-11-10', NOW)).toBe(25);
    expect(ageOn('2000-02-29', new Date(2026, 1, 28))).toBe(25);
  });
  it('uses runtime age, not the shipped age field', () => {
    const g = makePlayer({ birthDate: '2000-01-01', age: 99 });
    const s = makePlayer({ birthDate: '2001-06-01', age: 0 });
    expect(compareAge(g, s, NOW, T)).toMatchObject({
      feedback: 'yellow',
      direction: 'down',
      display: '26',
    });
  });
  it('gray outside threshold', () => {
    const g = makePlayer({ birthDate: '1990-01-01' });
    const s = makePlayer({ birthDate: '2000-01-01' });
    expect(compareAge(g, s, NOW, T)).toMatchObject({ feedback: 'gray', direction: 'down' });
  });
});

describe('jersey', () => {
  const j = (g: string, s: string) =>
    compareJersey(makePlayer({ jersey: g }), makePlayer({ jersey: s }), T);
  it('green when identical', () => expect(j('23', '23').feedback).toBe('green'));
  it('yellow within 3 with arrow', () => {
    expect(j('23', '20')).toMatchObject({ feedback: 'yellow', direction: 'down' });
    expect(j('1', '4')).toMatchObject({ feedback: 'yellow', direction: 'up' });
  });
  it('gray beyond 3', () =>
    expect(j('1', '5')).toMatchObject({ feedback: 'gray', direction: 'up' }));
  it('0 vs 00 is yellow without arrow', () => {
    expect(j('0', '00')).toMatchObject({ feedback: 'yellow', direction: null });
  });
  it('displays with a hash sign', () => expect(j('7', '7').display).toBe('#7'));
});

describe('country', () => {
  const c = (gc: string, gk: string, sc: string, sk: string) =>
    compareCountry(
      makePlayer({ country: gc, continent: gk }),
      makePlayer({ country: sc, continent: sk }),
    ).feedback;
  it('green same country', () => expect(c('Serbia', 'Europe', 'Serbia', 'Europe')).toBe('green'));
  it('yellow same continent', () =>
    expect(c('Serbia', 'Europe', 'Greece', 'Europe')).toBe('yellow'));
  it('gray otherwise', () => expect(c('USA', 'North America', 'France', 'Europe')).toBe('gray'));
});

describe('compareGuess', () => {
  it('returns 6 attributes in fixed order and flags a correct guess', () => {
    const p = makePlayer();
    const r = compareGuess(p, p, NOW, T);
    expect(r.correct).toBe(true);
    expect(r.attributes.map((a) => a.key)).toEqual([
      'team',
      'position',
      'height',
      'age',
      'jersey',
      'country',
    ]);
    expect(r.attributes.every((a) => a.feedback === 'green')).toBe(true);
  });
});

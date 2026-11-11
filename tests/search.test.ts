import { describe, expect, it } from 'vitest';
import { normalize, searchPlayers } from '../src/game/search';
import { makePlayer } from './helpers';

const players = [
  makePlayer({ id: 1, name: 'Luka Dončić' }),
  makePlayer({ id: 2, name: 'Nikola Jokić' }),
  makePlayer({ id: 3, name: 'Nikola Vučević' }),
  makePlayer({ id: 4, name: "D'Angelo Russell" }),
  makePlayer({ id: 5, name: 'Giannis Antetokounmpo' }),
  makePlayer({ id: 6, name: 'Kristaps Porziņģis' }),
  makePlayer({ id: 7, name: 'Shai Gilgeous-Alexander' }),
  makePlayer({ id: 8, name: 'Jusuf Nurkić' }),
];
const names = (q: string, opts = {}) => searchPlayers(players, q, opts).map((p) => p.name);

describe('normalize', () => {
  it('strips case and accents', () => {
    expect(normalize('Luka Dončić')).toBe('luka doncic');
    expect(normalize('Porziņģis')).toBe('porzingis');
    expect(normalize('Søren Łukasz')).toBe('soren lukasz');
  });
  it('removes apostrophes and dots, turns hyphens into spaces', () => {
    expect(normalize("D'Angelo")).toBe('dangelo');
    expect(normalize('P.J. Washington')).toBe('pj washington');
    expect(normalize('Gilgeous-Alexander')).toBe('gilgeous alexander');
  });
});

describe('searchPlayers', () => {
  it('is accent- and case-insensitive', () => {
    expect(names('doncic')).toEqual(['Luka Dončić']);
    expect(names('JOKIC')).toEqual(['Nikola Jokić']);
    expect(names('porzingis')).toEqual(['Kristaps Porziņģis']);
  });
  it('matches anywhere in the name', () => {
    expect(names('kic')).toEqual(['Jusuf Nurkić', 'Nikola Jokić']);
    expect(names('alexander')).toEqual(['Shai Gilgeous-Alexander']);
  });
  it('requires 2 characters', () => {
    expect(names('n')).toEqual([]);
    expect(names('ni').length).toBeGreaterThan(0);
  });
  it('ranks prefix matches first', () => {
    expect(names('nik')[0]).toBe('Nikola Jokić');
    expect(names('ni')).toEqual(['Nikola Jokić', 'Nikola Vučević', 'Giannis Antetokounmpo']);
  });
  it('excludes already guessed players and respects the limit', () => {
    expect(names('nikola', { exclude: new Set([2]) })).toEqual(['Nikola Vučević']);
    expect(names('a', { minChars: 1, limit: 3 })).toHaveLength(3);
  });
});

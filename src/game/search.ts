import { CONFIG } from '../config';
import type { Player } from './types';

/** Letters that NFD does not decompose into base + combining mark. */
const SPECIAL: Record<string, string> = {
  ø: 'o',
  đ: 'd',
  ð: 'd',
  ł: 'l',
  æ: 'ae',
  œ: 'oe',
  ß: 'ss',
  ı: 'i',
  þ: 'th',
};

/**
 * Case- and accent-insensitive normalization:
 * "Luka Dončić" -> "luka doncic", "D'Angelo" -> "dangelo".
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[øđðłæœßıþ]/g, (c) => SPECIAL[c] ?? c)
    .replace(/['’`.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface SearchOptions {
  exclude?: ReadonlySet<number>;
  limit?: number;
  minChars?: number;
}

/**
 * Substring match anywhere in the name. Ranking: full-name prefix, then
 * word prefix, then any substring; ties alphabetical.
 */
export function searchPlayers(
  players: readonly Player[],
  query: string,
  opts: SearchOptions = {},
): Player[] {
  const {
    exclude,
    limit = CONFIG.autocomplete.maxSuggestions,
    minChars = CONFIG.autocomplete.minChars,
  } = opts;
  const q = normalize(query);
  if (q.length < minChars) return [];

  const scored: { p: Player; score: number; n: string }[] = [];
  for (const p of players) {
    if (exclude?.has(p.id)) continue;
    const n = normalize(p.name);
    const idx = n.indexOf(q);
    if (idx === -1) continue;
    const score = idx === 0 ? 0 : n[idx - 1] === ' ' ? 1 : 2;
    scored.push({ p, score, n });
  }
  scored.sort((a, b) => a.score - b.score || a.n.localeCompare(b.n));
  return scored.slice(0, limit).map((s) => s.p);
}

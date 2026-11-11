import { CONFIG } from '../config';
import { parseIsoDate } from './age';

/** Local calendar date as YYYY-MM-DD. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toUtcDays(iso: string): number {
  const { y, m, d } = parseIsoDate(iso);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Puzzle number: the epoch day is #1. */
export function dayNumber(dateKey: string, epoch: string = CONFIG.dailyEpoch): number {
  return toUtcDays(dateKey) - toUtcDays(epoch) + 1;
}

/** cyrb53 string hash: fast, well distributed, deterministic across browsers. */
export function hashString(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Picks the daily player id: hash(salt + date) over the ascending id list.
 * Same date + same player list -> same player, on every device.
 */
export function dailyPlayerId(
  playerIds: readonly number[],
  dateKey: string,
  salt: string = CONFIG.dailySalt,
): number {
  if (playerIds.length === 0) throw new Error('No players available');
  const sorted = [...playerIds].sort((a, b) => a - b);
  const index = hashString(`${salt}:${dateKey}`) % sorted.length;
  return sorted[index]!;
}

/** Uniform random pick, optionally avoiding one id (the previous secret). */
export function randomPlayerId(
  playerIds: readonly number[],
  avoid?: number,
  rng: () => number = Math.random,
): number {
  const pool = playerIds.length > 1 ? playerIds.filter((id) => id !== avoid) : playerIds;
  return pool[Math.floor(rng() * pool.length)]!;
}

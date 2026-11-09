import { CONFIG } from '../config';
import { ageOn } from './age';
import { formatHeight } from './format';
import type { AttributeResult, Direction, Feedback, GuessResult, Player } from './types';

export interface Thresholds {
  heightInches: number;
  ageYears: number;
  jersey: number;
}

function direction(guess: number, secret: number): Direction {
  if (secret > guess) return 'up';
  if (secret < guess) return 'down';
  return null;
}

/** Generic numeric comparison: exact -> green, |diff| <= close -> yellow, else gray. */
export function compareNumber(
  guess: number,
  secret: number,
  close: number,
): { feedback: Feedback; direction: Direction } {
  if (guess === secret) return { feedback: 'green', direction: null };
  const feedback: Feedback = Math.abs(guess - secret) <= close ? 'yellow' : 'gray';
  return { feedback, direction: direction(guess, secret) };
}

export function compareTeam(guess: Player, secret: Player): AttributeResult {
  let feedback: Feedback = 'gray';
  if (guess.teamId === secret.teamId) feedback = 'green';
  else if (guess.division === secret.division) feedback = 'yellow';
  return {
    key: 'team',
    feedback,
    direction: null,
    display: guess.teamAbbr,
    // Raw values; the UI translates/abbreviates them.
    sub: guess.conference,
    detail: guess.division,
  };
}

/** Splits "G-F" into ["G", "F"]. */
export function positionParts(position: string): string[] {
  return position
    .toUpperCase()
    .split('-')
    .map((p) => p.trim())
    .filter(Boolean);
}

export function comparePosition(guess: Player, secret: Player): AttributeResult {
  const g = new Set(positionParts(guess.position));
  const s = new Set(positionParts(secret.position));
  const same = g.size === s.size && [...g].every((p) => s.has(p));
  const overlap = [...g].some((p) => s.has(p));
  return {
    key: 'position',
    feedback: same ? 'green' : overlap ? 'yellow' : 'gray',
    direction: null,
    display: guess.position,
  };
}

export function compareHeight(
  guess: Player,
  secret: Player,
  t: Thresholds = CONFIG.thresholds,
): AttributeResult {
  return {
    key: 'height',
    ...compareNumber(guess.heightInches, secret.heightInches, t.heightInches),
    display: formatHeight(guess.heightInches),
  };
}

export function compareAge(
  guess: Player,
  secret: Player,
  now: Date,
  t: Thresholds = CONFIG.thresholds,
): AttributeResult {
  const g = ageOn(guess.birthDate, now);
  const s = ageOn(secret.birthDate, now);
  return { key: 'age', ...compareNumber(g, s, t.ageYears), display: String(g) };
}

/**
 * Jersey numbers are strings: "0" and "00" are numerically equal but not
 * the same number, so that case is yellow without an arrow.
 */
export function compareJersey(
  guess: Player,
  secret: Player,
  t: Thresholds = CONFIG.thresholds,
): AttributeResult {
  const display = `#${guess.jersey}`;
  if (guess.jersey === secret.jersey) {
    return { key: 'jersey', feedback: 'green', direction: null, display };
  }
  const g = Number(guess.jersey);
  const s = Number(secret.jersey);
  if (g === s) return { key: 'jersey', feedback: 'yellow', direction: null, display };
  return { key: 'jersey', ...compareNumber(g, s, t.jersey), display };
}

export function compareCountry(guess: Player, secret: Player): AttributeResult {
  let feedback: Feedback = 'gray';
  if (guess.country === secret.country) feedback = 'green';
  else if (guess.continent === secret.continent) feedback = 'yellow';
  return { key: 'country', feedback, direction: null, display: guess.country };
}

export function compareGuess(
  guess: Player,
  secret: Player,
  now: Date = new Date(),
  t: Thresholds = CONFIG.thresholds,
): GuessResult {
  return {
    playerId: guess.id,
    correct: guess.id === secret.id,
    attributes: [
      compareTeam(guess, secret),
      comparePosition(guess, secret),
      compareHeight(guess, secret, t),
      compareAge(guess, secret, now, t),
      compareJersey(guess, secret, t),
      compareCountry(guess, secret),
    ],
  };
}

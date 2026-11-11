import type { GameMode, GameStatus } from './types';

export interface GameState {
  mode: GameMode;
  secretId: number;
  /** Guessed player ids in the order they were made. */
  guessIds: number[];
  status: GameStatus;
  /** Daily only: local date key and puzzle number. */
  dateKey?: string;
  day?: number;
}

export function newGame(
  mode: GameMode,
  secretId: number,
  daily?: { dateKey: string; day: number },
): GameState {
  return { mode, secretId, guessIds: [], status: 'playing', ...daily };
}

export function statusFor(guessIds: readonly number[], secretId: number, max: number): GameStatus {
  if (guessIds.includes(secretId)) return 'won';
  return guessIds.length >= max ? 'lost' : 'playing';
}

export class GuessError extends Error {}

/** Returns a new state with the guess applied. Throws GuessError on invalid guesses. */
export function applyGuess(state: GameState, guessId: number, max: number): GameState {
  if (state.status !== 'playing') throw new GuessError('Game is over');
  if (state.guessIds.includes(guessId)) throw new GuessError('Already guessed');
  const guessIds = [...state.guessIds, guessId];
  return { ...state, guessIds, status: statusFor(guessIds, state.secretId, max) };
}

/** Restores a persisted state, dropping unknown/duplicate ids and recomputing status. */
export function sanitizeState(
  raw: unknown,
  knownIds: ReadonlySet<number>,
  max: number,
): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<GameState>;
  if (s.mode !== 'daily' && s.mode !== 'free') return null;
  if (typeof s.secretId !== 'number' || !knownIds.has(s.secretId)) return null;
  const ids = Array.isArray(s.guessIds) ? s.guessIds : [];
  const guessIds = [
    ...new Set(ids.filter((id) => typeof id === 'number' && knownIds.has(id))),
  ].slice(0, max);
  return {
    mode: s.mode,
    secretId: s.secretId,
    guessIds,
    status: statusFor(guessIds, s.secretId, max),
    ...(s.dateKey ? { dateKey: s.dateKey } : {}),
    ...(typeof s.day === 'number' ? { day: s.day } : {}),
  };
}

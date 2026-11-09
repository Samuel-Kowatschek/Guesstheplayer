export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** Index i = number of wins in i+1 guesses. */
  distribution: number[];
  /** Day number of the last finished daily game (for streaks). */
  lastDay: number | null;
}

export function emptyStats(maxGuesses: number): Stats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: Array.from({ length: maxGuesses }, () => 0),
    lastDay: null,
  };
}

/**
 * Records a finished daily game. A streak continues only if the previous
 * finished game was yesterday's puzzle. Recording the same day twice is a no-op.
 */
export function recordGame(
  stats: Stats,
  result: { day: number; won: boolean; guesses: number },
): Stats {
  if (stats.lastDay === result.day) return stats;
  const distribution = [...stats.distribution];
  let currentStreak = 0;
  if (result.won) {
    const consecutive = stats.lastDay !== null && stats.lastDay === result.day - 1;
    currentStreak = consecutive ? stats.currentStreak + 1 : 1;
    const i = result.guesses - 1;
    if (i >= 0 && i < distribution.length) distribution[i] = (distribution[i] ?? 0) + 1;
  }
  return {
    played: stats.played + 1,
    wins: stats.wins + (result.won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    distribution,
    lastDay: result.day,
  };
}

/** Streak is shown as 0 if the player skipped a day. */
export function effectiveStreak(stats: Stats, today: number): number {
  if (stats.lastDay === null) return 0;
  return today - stats.lastDay <= 1 ? stats.currentStreak : 0;
}

export function winRate(stats: Stats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
}

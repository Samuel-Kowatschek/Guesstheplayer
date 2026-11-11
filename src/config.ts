/**
 * All tunable game constants live here.
 */
export const CONFIG = {
  /** Number of guesses per game. */
  maxGuesses: 8,

  /** "Close" (yellow) thresholds for numeric attributes. Inclusive. */
  thresholds: {
    /** Height difference in inches that still counts as close. */
    heightInches: 2,
    /** Age difference in years that still counts as close. */
    ageYears: 2,
    /** Jersey number difference that still counts as close. */
    jersey: 3,
  },

  autocomplete: {
    /** Characters needed before suggestions appear. */
    minChars: 2,
    /** Maximum number of suggestions shown. */
    maxSuggestions: 8,
  },

  animation: {
    /** Delay between two tile reveals (ms). */
    revealDelayMs: 280,
    /** Duration of a single tile flip (ms). */
    flipMs: 420,
    /** Typewriter speed (ms per character). */
    typewriterMs: 28,
    /** Headshot reveal: from blocky pixels to sharp, in this many steps / ms. */
    depixelateSteps: 7,
    depixelateMs: 900,
  },

  /** Day #1 of the daily puzzle (local date, YYYY-MM-DD). */
  dailyEpoch: '2026-11-01',

  /** Salt for the daily hash. Changing it reshuffles all daily players. */
  dailySalt: 'hoopdle-v1',

  /** Headshot URL template. Only shown in the end-of-game dialog. */
  headshotUrl: (playerId: number): string =>
    `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`,
} as const;

export type Config = typeof CONFIG;

export type Conference = 'East' | 'West';

export interface Player {
  id: number;
  name: string;
  teamId: number;
  teamAbbr: string;
  teamName: string;
  conference: Conference;
  division: string;
  /** One of G, F, C, G-F, F-C (normalized by the data script). */
  position: string;
  heightInches: number;
  /** ISO date YYYY-MM-DD. */
  birthDate: string;
  /** Age at generation time. The UI recomputes it from birthDate. */
  age: number;
  /** Jersey as a string so "0" and "00" stay distinguishable. */
  jersey: string;
  country: string;
  continent: string;
}

export interface PlayerData {
  season: string;
  generatedAt: string;
  players: Player[];
}

export type Feedback = 'green' | 'yellow' | 'gray';
/** Direction of the SECRET value relative to the guess. */
export type Direction = 'up' | 'down' | null;

export type AttributeKey = 'team' | 'position' | 'height' | 'age' | 'jersey' | 'country';

export interface AttributeResult {
  key: AttributeKey;
  feedback: Feedback;
  direction: Direction;
  /** Main text shown on the tile. */
  display: string;
  /** Optional small secondary text (e.g. conference). */
  sub?: string;
}

export interface GuessResult {
  playerId: number;
  correct: boolean;
  attributes: AttributeResult[];
}

export type GameMode = 'daily' | 'free';
export type GameStatus = 'playing' | 'won' | 'lost';

import type { Player } from '../src/game/types';

let nextId = 1;

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: nextId++,
    name: 'Test Player',
    teamId: 1610612747,
    teamAbbr: 'LAL',
    teamName: 'Los Angeles Lakers',
    conference: 'West',
    division: 'Pacific',
    position: 'G',
    heightInches: 78,
    birthDate: '2000-06-15',
    age: 26,
    jersey: '10',
    country: 'USA',
    continent: 'North America',
    ...overrides,
  };
}

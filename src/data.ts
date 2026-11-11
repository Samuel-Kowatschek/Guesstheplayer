import type { Player, PlayerData } from './game/types';

const POSITIONS = new Set(['G', 'F', 'C', 'G-F', 'F-C']);

/** True if all six attributes (and identity fields) are present and sane. */
export function isCompletePlayer(p: unknown): p is Player {
  if (!p || typeof p !== 'object') return false;
  const x = p as Record<string, unknown>;
  return (
    typeof x.id === 'number' &&
    typeof x.name === 'string' &&
    x.name.length > 0 &&
    typeof x.teamId === 'number' &&
    typeof x.teamAbbr === 'string' &&
    typeof x.teamName === 'string' &&
    (x.conference === 'East' || x.conference === 'West') &&
    typeof x.division === 'string' &&
    typeof x.position === 'string' &&
    POSITIONS.has(x.position) &&
    typeof x.heightInches === 'number' &&
    x.heightInches > 0 &&
    typeof x.birthDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(x.birthDate) &&
    typeof x.jersey === 'string' &&
    /^\d{1,2}$/.test(x.jersey) &&
    typeof x.country === 'string' &&
    x.country.length > 0 &&
    typeof x.continent === 'string' &&
    x.continent.length > 0
  );
}

export interface LoadedData extends PlayerData {
  isSample: boolean;
}

async function fetchData(url: string): Promise<PlayerData | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    const json = (await res.json()) as PlayerData;
    return Array.isArray(json?.players) && json.players.length > 0 ? json : null;
  } catch {
    return null;
  }
}

/** Loads data/players.json and falls back to data/players.sample.json. */
export async function loadPlayerData(base: string = import.meta.env.BASE_URL): Promise<LoadedData> {
  let data = await fetchData(`${base}data/players.json`);
  let isSample = false;
  if (!data) {
    console.warn(
      '[HOOPDLE] data/players.json not found - using players.sample.json. ' +
        'Run `npm run data` locally to generate the full player list.',
    );
    data = await fetchData(`${base}data/players.sample.json`);
    isSample = true;
  }
  if (!data) throw new Error('No player data available');

  const players = data.players.filter(isCompletePlayer);
  const dropped = data.players.length - players.length;
  if (dropped > 0) console.warn(`[HOOPDLE] Ignored ${dropped} incomplete player entries`);
  const seen = new Set<number>();
  const unique = players.filter((p) => !seen.has(p.id) && seen.add(p.id));
  return { season: data.season, generatedAt: data.generatedAt, players: unique, isSample };
}

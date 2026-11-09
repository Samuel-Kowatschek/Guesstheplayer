/** localStorage wrapper that never throws (private mode, quota, disabled storage). */
const PREFIX = 'hoopdle:';

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Removes daily entries older than `keepDays` days to keep storage small. */
export function pruneDaily(currentDay: number, keepDays = 14): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      const match = key && /^hoopdle:daily:(\d+)$/.exec(key);
      if (match && currentDay - Number(match[1]) > keepDays) localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

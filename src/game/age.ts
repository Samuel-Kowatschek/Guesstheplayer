/** Parses YYYY-MM-DD into its numeric parts (no timezone shifting). */
export function parseIsoDate(iso: string): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new Error(`Invalid ISO date: ${iso}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Age in full years on the given (local) date. */
export function ageOn(birthDate: string, now: Date): number {
  const b = parseIsoDate(birthDate);
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  let age = y - b.y;
  if (m < b.m || (m === b.m && d < b.d)) age -= 1;
  return age;
}

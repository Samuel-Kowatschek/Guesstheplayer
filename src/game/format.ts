/** 81 -> 6'9" */
export function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const rest = inches % 12;
  return `${feet}'${rest}"`;
}

/** Spoken form for screen readers: 81 -> "6 feet 9". */
export function spokenHeight(inches: number): string {
  return `${Math.floor(inches / 12)} feet ${inches % 12}`;
}

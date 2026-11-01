// Advent of Code calendar rules, shared by server and client.

export const FIRST_YEAR = 2015;

/** Since 2025 the event has 12 days instead of 25. */
export function daysInYear(year: number): number {
  return year >= 2025 ? 12 : 25;
}

/** Puzzles unlock at midnight US Eastern (05:00 UTC). */
export function unlockTime(year: number, day: number): number {
  return Date.UTC(year, 11, day, 5);
}

export function isUnlocked(year: number, day: number, now = Date.now()): boolean {
  return now >= unlockTime(year, day);
}

/** Latest year with at least one unlocked puzzle. */
export function latestYear(now = Date.now()): number {
  const year = new Date(now).getUTCFullYear();
  return isUnlocked(year, 1, now) ? year : year - 1;
}

export function allYears(now = Date.now()): number[] {
  const years: number[] = [];
  for (let y = latestYear(now); y >= FIRST_YEAR; y--) years.push(y);
  return years;
}

export function isValidDay(year: number, day: number, now = Date.now()): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(day) &&
    year >= FIRST_YEAR &&
    year <= latestYear(now) &&
    day >= 1 &&
    day <= daysInYear(year)
  );
}

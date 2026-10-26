import type { GameState } from './game';

/* Calendar days, in the player's own time zone: which days had a workout, rest days, days in a row. */

/** "2026-10-26" for the local day of `date`. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Whole calendar days from a to b (b later is positive), ignoring the time of day. */
export function daysApart(a: Date, b: Date): number {
  const A = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()),
    B = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((B - A) / 86_400_000);
}

/** Calendar days since the last workout: 0 means today, null means none yet. */
export function daysSinceTraining(state: GameState, now: Date): number | null {
  const last = state.sessions[state.sessions.length - 1];
  return last ? daysApart(new Date(last.date), now) : null;
}

export function trainedToday(state: GameState, now: Date): boolean {
  return daysSinceTraining(state, now) === 0;
}

/** A rest day: no workout today, and the last one was yesterday or the day before. */
export function isRestDay(state: GameState, now: Date): boolean {
  const d = daysSinceTraining(state, now);
  return d === 1 || d === 2;
}

/** Days in a row with a workout, counting back from `from` (today by default). */
export function daysInRow(state: GameState, now: Date, from: 'today' | 'yesterday' = 'today'): number {
  const days = new Set(state.sessions.map((s) => dayKey(new Date(s.date))));
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (from === 'yesterday' ? 1 : 0));
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** A number that is the same all day and changes every day, for picking the day's line. */
export function daySeed(now: Date): number {
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
}

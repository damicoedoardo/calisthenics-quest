import type { DayPage, GameState } from '@/lib/game';
import { dayKey, daySeed, daysApart, daysInRow, daysSinceTraining, isRestDay } from '@/lib/days';
import { fill, storyState, storyWords } from '../engine';
import type { DailyLine, FlameMood, Moment, Quote } from '../types';
import { FLAME_LINES, MOMENT_MOOD } from './flame-lines';
import { QUOTES } from './quotes';
import { FIRE_LINES, REST_TRUTHS } from './rest';

/* Every day: the flame's line, the day's words for the road and the rest card, and the Book of
   Days page that keeps them. All picks are fixed for the day and change the next. */

/** Lines and quotes don't come back within this many days. */
const NO_REPEAT_DAYS = 21;
/** Training this many days in a row makes the flame smoky. */
export const SMOKY_AFTER = 4;
/** Away this long, the flame has dimmed to embers. */
export const DIM_AFTER = 8;
/** A gap this long is more than a weekend or a 2-a-week plan leaves: the flame says it missed you. */
export const MISSED_AFTER = 5;

/** The last workout, if it was today or yesterday. */
function recent(state: GameState, now: Date) {
  const last = state.sessions[state.sessions.length - 1];
  return last && daysApart(new Date(last.date), now) <= 1 ? last : undefined;
}

/** What kind of day it is for the flame, checked in this order. */
export function todayMoment(state: GameState, now: Date): Moment {
  const since = daysSinceTraining(state, now);
  if (since === null) return 'first';
  if (since >= DIM_AFTER) return 'back';
  if (since >= MISSED_AFTER) return 'missed';
  if (Math.max(daysInRow(state, now), daysInRow(state, now, 'yesterday')) >= SMOKY_AFTER) return 'smoky';
  const last = recent(state, now);
  if (last?.unlocked.length) return 'best';
  if (last?.kind === 'mini') return 'rough';
  if (since === 0) return 'trained';
  if (since === 1) return 'rest';
  if (since === 2) return 'rested';
  // Late at night, when there's nothing more particular to say.
  const hour = now.getHours();
  if (hour >= 22 || hour < 4) return 'late';
  const day = now.getDay();
  return day === 0 || day === 6 ? 'weekend' : 'training';
}

export function flameMood(state: GameState, now: Date): FlameMood {
  return MOMENT_MOOD[todayMoment(state, now)];
}

/**
 * Fog runs start Rested on a day without a workout that follows a full day off, or once you've sat
 * by the fire today (on the day right after a workout, that's how the rest counts).
 */
export function isRested(state: GameState, now: Date): boolean {
  const since = daysSinceTraining(state, now);
  if (since === 0) return false;
  return (since ?? 0) >= 2 || !!todayPage(state, now)?.fire;
}

/** Can sit by the fire today: any day without a workout yet. */
export function canSitByFire(state: GameState, now: Date): boolean {
  return daysSinceTraining(state, now) !== 0;
}

export function todayPage(state: GameState, now: Date): DayPage | undefined {
  const key = dayKey(now);
  return state.days?.find((d) => d.day === key);
}

/** Spread consecutive days across a list, so neighbors in the file don't follow each other. */
function pick<T>(list: T[], seed: number, salt: number): T | undefined {
  if (!list.length) return undefined;
  return list[(Math.imul(seed + salt, 2654435761) >>> 0) % list.length];
}

/** Pages from the last few weeks, not counting today. */
function recentPages(state: GameState, now: Date): DayPage[] {
  const key = dayKey(now);
  return (state.days ?? []).filter((d) => d.day !== key && daysApart(new Date(`${d.day}T12:00:00`), now) < NO_REPEAT_DAYS);
}

/** Today's line from the flame, with your words filled in. */
export function flameLine(state: GameState, now: Date): string {
  const words = storyWords(state);
  const said = new Set(recentPages(state, now).map((d) => d.line));
  const chapter = storyState(state).index + 1;
  // "That's {sessions} pages now" reads wrong after only one.
  const usable = (l: DailyLine) =>
    (!l.needs || words[l.needs].trim()) &&
    (!l.inChapter || l.inChapter === chapter) &&
    !(l.text.includes('{sessions}') && state.sessions.length < 2);
  const all = FLAME_LINES[todayMoment(state, now)].filter(usable).map((l) => fill(l.text, words));
  const fresh = all.filter((t) => !said.has(t));
  return pick(fresh.length ? fresh : all, daySeed(now), 1) ?? '';
}

/** Today's words for the road: one that fits the chapter you're in, or rest on a rest day. */
export function dayQuote(state: GameState, now: Date): { text: string; by: string } {
  const words = storyWords(state);
  const chapter = storyState(state).chapter?.n ?? 6;
  const fits = (q: Quote) => q.fits === 'any' || q.fits === chapter || (q.fits === 'rest' && isRestDay(state, now)) || (typeof q.fits === 'number' && q.fits < chapter);
  const seen = new Set(recentPages(state, now).map((d) => d.quote.text));
  const pool = QUOTES.filter(fits);
  const fresh = pool.filter((q) => !seen.has(q.text));
  const q = pick(fresh.length ? fresh : pool, daySeed(now), 2) ?? QUOTES[0];
  return { text: q.text, by: fill(q.by, words) };
}

export function restTruth(now: Date): string {
  return pick(REST_TRUTHS, daySeed(now), 3) ?? REST_TRUTHS[0];
}

export function fireLine(state: GameState, now: Date): string {
  return fill(pick(FIRE_LINES, daySeed(now), 4)?.text ?? '', storyWords(state));
}

/**
 * Today's page of the Book of Days: added on the first visit of the day. The quote stays all day;
 * the line follows the day (after a workout the flame says something new), and the page keeps the last one.
 */
export function withTodayPage(state: GameState, now: Date): GameState {
  const page = todayPage(state, now);
  const line = flameLine(state, now);
  if (page) return page.line === line ? state : { ...state, days: state.days!.map((d) => (d === page ? { ...d, line } : d)) };
  return { ...state, days: [...(state.days ?? []), { day: dayKey(now), line, quote: dayQuote(state, now) }] };
}

/** Change today's page (keep the quote, sat by the fire). */
export function updateTodayPage(state: GameState, now: Date, change: Partial<DayPage>): GameState {
  const s = withTodayPage(state, now);
  const key = dayKey(now);
  return { ...s, days: s.days!.map((d) => (d.day === key ? { ...d, ...change } : d)) };
}

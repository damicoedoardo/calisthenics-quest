import type { DayPage, GameState } from '@/lib/game';
import { dayKey, daySeed, daysApart, daysInRow, daysSinceTraining, isRestDay } from '@/lib/days';
import { ALL_SCENES, fill, storyState, storyWords } from '../engine';
import type { DailyLine, FlameMood, Moment, Quote } from '../types';
import { CALLBACKS, FLAME_LINES, MOMENT_MOOD } from './flame-lines';
import { QUOTES } from './quotes';
import { FIRE_LINES, REST_TRUTHS } from './rest';
import { AFTER_LINES, MARGIN_NOTES, type AfterKind, type MarginKind } from './after';
import { FIRST_CLEAR, RUN_LINES, type RunKind } from './fog-lines';

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
  if (last?.better) return 'best';
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

/** The lines from a list this player can be told now, with their words filled in. */
function usableLines(lines: DailyLine[], state: GameState): string[] {
  const words = storyWords(state);
  const chapter = storyState(state).index + 1;
  const usable = (l: DailyLine) =>
    (!l.needs || words[l.needs].trim()) &&
    (!l.inChapter || l.inChapter === chapter) &&
    (!l.fromChapter || chapter >= l.fromChapter) &&
    // "That's {sessions} pages now" reads wrong after only one.
    !(l.text.includes('{sessions}') && state.sessions.length < 2);
  return lines.filter(usable).map((l) => fill(l.text, words));
}

/** Days that aren't for a callback: the first, and the days the flame has missed you. */
const NO_CALLBACK: Moment[] = ['first', 'back', 'missed'];

/** A villager follow-up due today: its scene seen, not said on an earlier page, still fresh. */
export function callbackLine(state: GameState, now: Date): string | undefined {
  // Once said today, it stays today's line, even after a workout.
  const page = todayPage(state, now);
  if (page && CALLBACKS.some((c) => c.text === page.line)) return page.line;
  const since = daysSinceTraining(state, now);
  if (since === null || since === 0 || NO_CALLBACK.includes(todayMoment(state, now))) return undefined;
  const key = dayKey(now);
  const said = new Set((state.days ?? []).filter((d) => d.day !== key).map((d) => d.line));
  const seen = new Set(state.seenScenes);
  const n = state.sessions.length;
  const due = CALLBACKS.find((c) => {
    // Exact id: sceneById would also match `ch4-vela` for `ch4-vela-down`.
    const at = ALL_SCENES.find((p) => p.scene.id === c.after)?.scene.when.workouts ?? 0;
    return seen.has(c.after) && !said.has(c.text) && n <= at + c.within && (!c.restDay || isRestDay(state, now));
  });
  return due?.text;
}

/** What kind of thing the flame says about today's Fog run, if you played one today. */
export function runKind(state: GameState, now: Date): RunKind | 'firstClear' | undefined {
  const last = state.fog?.last;
  if (!last || last.day !== dayKey(now)) return undefined;
  if (last.firstClear) return 'firstClear';
  // A workout is due (not trained today, and rested enough): a gentle nudge before anything else.
  const since = daysSinceTraining(state, now);
  if (since === null || since >= 2) return 'due';
  if (last.record) return 'record';
  if (last.won) return 'won';
  return last.pastMid ? 'mid' : 'lost';
}

/** The flame on today's Fog run, if you played one: a first win, a record, a win, a loss... */
export function runLine(state: GameState, now: Date): string | undefined {
  const kind = runKind(state, now);
  if (!kind) return undefined;
  if (kind === 'firstClear') return FIRST_CLEAR[state.fog!.last!.zone] ?? FIRST_CLEAR[0];
  const said = new Set(recentPages(state, now).map((d) => d.line));
  const all = usableLines(RUN_LINES[kind], state);
  const fresh = all.filter((t) => !said.has(t));
  return pick(fresh.length ? fresh : all, daySeed(now) + (state.fog?.runs ?? 0), 7);
}

/** Today's line from the flame, with your words filled in. */
export function flameLine(state: GameState, now: Date): string {
  const callback = callbackLine(state, now);
  if (callback) return callback;
  const run = runLine(state, now);
  if (run) return run;
  const said = new Set(recentPages(state, now).map((d) => d.line));
  const all = usableLines(FLAME_LINES[todayMoment(state, now)], state);
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
  return pick(usableLines(FIRE_LINES, state), daySeed(now), 4) ?? '';
}

/** The kind of workout `state`'s last one was: the first, a comeback, a new best, short, or full. */
export function afterKind(state: GameState): AfterKind {
  const n = state.sessions.length;
  const last = state.sessions[n - 1];
  const before = state.sessions[n - 2];
  if (n <= 1) return 'first';
  if (before && daysApart(new Date(before.date), new Date(last.date)) >= MISSED_AFTER) return 'back';
  if (last.better) return 'best';
  return last.kind === 'mini' ? 'short' : 'full';
}

/** An after-workout line doesn't come back within this many workouts (when the list has enough). */
const AFTER_AVOID = 5;

/**
 * What the flame says on the loot card, right after the workout that ends `state`. The season is
 * replayed workout by workout, so the pick is the same every time the card is drawn, and it skips
 * whatever the last few workouts heard.
 */
export function afterWorkoutLine(state: GameState): string {
  const recent: string[] = [];
  let line = '';
  for (let k = 1; k <= state.sessions.length; k++) {
    const then = k === state.sessions.length ? state : { ...state, sessions: state.sessions.slice(0, k) };
    const lines = usableLines(AFTER_LINES[afterKind(then)], then);
    const fresh = lines.filter((t) => !recent.includes(t));
    const pool = fresh.length ? fresh : lines;
    line = pool.length ? pool[k % pool.length] : '';
    if (line) recent.push(line);
    if (recent.length > AFTER_AVOID) recent.shift();
  }
  return line;
}

/** What a Book of Days page held, for the note in its margin. */
export function marginKind(state: GameState, page: DayPage): MarginKind {
  const date = new Date(`${page.day}T12:00:00`);
  const i = state.sessions.findIndex((s) => dayKey(new Date(s.date)) === page.day);
  if (i >= 0) {
    const that = state.sessions.filter((s) => dayKey(new Date(s.date)) === page.day);
    const before = state.sessions[i - 1];
    if (before && daysApart(new Date(before.date), new Date(state.sessions[i].date)) >= MISSED_AFTER) return 'back';
    if (that.some((s) => s.better)) return 'best';
    return that.every((s) => s.kind === 'mini') ? 'short' : 'full';
  }
  if (page.fire) return 'fire';
  const rest = state.sessions.some((s) => {
    const d = daysApart(new Date(s.date), date);
    return d === 1 || d === 2;
  });
  return rest ? 'rest' : 'visit';
}

/** The note in your handwriting in a page's margin ('' for a quiet visit). */
export function marginNote(state: GameState, page: DayPage): string {
  return pick(MARGIN_NOTES[marginKind(state, page)], daySeed(new Date(`${page.day}T12:00:00`)), 6) ?? '';
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

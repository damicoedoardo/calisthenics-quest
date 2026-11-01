import { WEEK_SPREAD } from '@/balance';
import type { LibraryExercise } from '@/exercises/library';
import { dayKey, daysApart, isRestDay, trainedToday } from '../days';
import type { GameState, Session } from '../game';
import { buildWorkout } from './generate';
import { hardFamilies } from './laws';
import type { CoachDay, CoachPlan, CoachState, CoachWeek, Mode } from './types';

/* The week: a calendar week, Monday to Sunday. The coach plans the workout days; every other day is a
   rest day, and resting is part of the plan: you keep a rest day by sitting by the fire that day
   (the day's page in the Book of Days, `restKept`). It is the one place a workout lives. The next
   workout (`currentPlan`) is the first workout day not done yet, whatever its date: a missed day
   moves along rather than being lost. Today's quest, the workout screen and the coach all read it
   from here, and every change is written to its day (`setPlan`, `setDay`). A week planned mid-week
   starts that day (`start`): the days before it aren't part of the plan. The plan always holds
   two weeks, this one and the next (`ahead`), so at the end of a week the next is already there
   to see and change. On Monday the next week becomes this week (`planAhead`), and a new next week
   is planned behind it. */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateOf = (key: string) => new Date(`${key}T12:00:00`);

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

/** The Monday of the week `d` is in. */
export const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/** Days left in this week, today and Sunday included. */
export const daysLeft = (now: Date) => 7 - ((now.getDay() + 6) % 7);

/** The workout dates of this week from today to Sunday, for `days` workouts a week. Planned
    late in the week, fewer fit: one every other day. */
export function weekDates(now: Date, days: number): string[] {
  const left = daysLeft(now);
  const spread = WEEK_SPREAD[Math.max(2, Math.min(6, days))];
  const offsets = spread[spread.length - 1] < left ? spread : Array.from({ length: Math.min(days, Math.ceil(left / 2)) }, (_, i) => i * 2);
  return offsets.map((d) => dayKey(addDays(now, d)));
}

/** "Today", "Tomorrow", or the weekday: how a day is named on screen and to the coach. */
export function dayLabel(date: string, now: Date): string {
  const d = daysApart(now, dateOf(date));
  return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : d === -1 ? 'Yesterday' : WEEKDAYS[dateOf(date).getDay()];
}

export const weekdayOf = (date: string) => WEEKDAYS[dateOf(date).getDay()];

/** The day the next workout comes from: the first not done. */
export function nextDay(week: CoachWeek | null | undefined): CoachDay | undefined {
  return week?.days.find((d) => !d.done);
}

/** The Monday after the week: when the next one starts. */
export const nextMonday = (week: CoachWeek) => addDays(mondayOf(dateOf(week.start)), 7);

/** The plan's last day: next week's Sunday. */
export const lastDay = (week: CoachWeek) => dayKey(addDays(mondayOf(dateOf(week.start)), 13));

/** Which of the plan's two weeks a date is in: 0 this week, 1 next week. */
export const weekOf = (week: CoachWeek, date: string): 0 | 1 => (date >= dayKey(nextMonday(week)) ? 1 : 0);

/** The days of one of the plan's weeks: 0 this week, 1 next week. */
export const daysIn = (week: CoachWeek, which: 0 | 1) => week.days.filter((d) => weekOf(week, d.date) === which);

/** The week is over: its Sunday is past (its rest days count too, so it runs its course even with
    every workout done). */
export function weekOver(week: CoachWeek | null | undefined, now: Date): boolean {
  return !week || daysApart(nextMonday(week), now) >= 0;
}

/** The week to show: this week (0), or next week (1) as soon as this week's last workout is done
    (next week is always drafted ahead, so it is there the moment you finish). */
export function shownWeek(week: CoachWeek | null | undefined, now: Date): 0 | 1 {
  if (!week || !week.ahead || weekOver(week, now)) return 0;
  const mine = daysIn(week, 0);
  return mine.length && mine.every((d) => d.done) && daysIn(week, 1).length ? 1 : 0;
}

/** The nudge id of "this week is done, next week is ready", one per week. */
export const weekDoneId = (week: CoachWeek) => `weekdone:${dayKey(nextMonday(week))}`;

/** A week's seven days, Monday to Sunday (`which`: 0 this week, 1 next week): a workout day, a
    rest day (no `day`), or before the week was planned (`before`). */
export function weekSlots(week: CoachWeek, which: 0 | 1 = 0): { date: string; day?: CoachDay; before?: boolean }[] {
  const monday = addDays(mondayOf(dateOf(week.start)), 7 * which);
  return Array.from({ length: 7 }, (_, i) => {
    const date = dayKey(addDays(monday, i));
    return { date, day: week.days.find((d) => d.date === date), ...(date < week.start ? { before: true } : {}) };
  });
}

/** A rest day kept: you sat by the fire that day. */
export const restKept = (state: Pick<GameState, 'days'>, date: string) => !!state.days?.find((d) => d.day === date)?.fire;

/** What today is, the one answer Today, Train, the start button and the flame's lines all read, so
    they never disagree:
    - `workout`: the next workout can start today (its day has come; a missed one is caught up).
    - `done`: you trained today. One workout a day: the next waits for its own day.
    - `rest`: nothing to start today. `next` is the workout still ahead, if there is one.
    - `none`: no week planned yet. */
export type TodayKind = 'workout' | 'done' | 'rest' | 'none';
export interface TodayIs {
  kind: TodayKind;
  /** The next workout: today's to start, or the one ahead. */
  next?: CoachDay;
}

export function todayIs(state: Pick<GameState, 'coach' | 'sessions'>, now: Date): TodayIs {
  const week = state.coach?.week;
  const next = nextDay(week);
  if (trainedToday(state, now)) return { kind: 'done', next };
  if (!week) return { kind: 'none' };
  if (next && next.date <= dayKey(now)) return { kind: 'workout', next };
  return { kind: 'rest', next };
}

/** The next workout can start today: `todayIs` says so. With no week yet the built-in plan starts
    any day. */
export function startsToday(state: Pick<GameState, 'coach' | 'sessions'>, now: Date): boolean {
  const t = todayIs(state, now).kind;
  return t === 'workout' || t === 'none';
}

/** Today is one of the week's rest days: a day with no workout in the week (not one before it). */
export function restToday(coach: CoachState | undefined, now: Date): boolean {
  const week = coach?.week;
  if (!week || weekOver(week, now)) return false;
  const today = dayKey(now);
  return weekSlots(week).some((s) => s.date === today && !s.day && !s.before);
}

/** A rest day, for the flame's lines and the story: with a week, `todayIs` says rest; before any
    week, the day or two after a workout. */
export function isRestToday(state: GameState, now: Date): boolean {
  return state.coach?.week ? todayIs(state, now).kind === 'rest' : isRestDay(state, now);
}

/** A week of built-in workouts from today. Each day knows the days planned before it, so modes and
    A/B days take turns across the week. */
type BuildInput = { all: LibraryExercise[]; coach: CoachState; sessions: Session[]; now: Date; rng: () => number };

/** Built-in workouts on `dates`, after the days planned `before` them. */
function buildDays(input: BuildInput, dates: string[], before: CoachDay[]): CoachDay[] | null {
  const after: Mode[] = before.filter((d) => !d.done).map((d) => d.plan.mode);
  const days: CoachDay[] = [];
  for (const date of dates) {
    // The day after a workout trains other families (law 6).
    const prev = days[days.length - 1] ?? before[before.length - 1];
    const rested = prev && daysApart(new Date(`${prev.date}T12:00:00`), new Date(`${date}T12:00:00`)) === 1 ? hardFamilies(prev.plan) : [];
    const plan = buildWorkout({ ...input, after: [...after], rested });
    if (!plan) return null;
    after.push(plan.mode);
    days.push({ date, plan });
  }
  return days;
}

export function buildWeek(input: BuildInput): CoachWeek | null {
  const profile = input.coach.profile;
  if (!profile) return null;
  const days = buildDays(input, weekDates(input.now, profile.days), []);
  return days && { start: dayKey(input.now), days, by: 'built-in' };
}

/** Next week's built-in days, after this week's. */
export function buildNextWeek(input: BuildInput, week: CoachWeek): CoachDay[] | null {
  const profile = input.coach.profile;
  if (!profile) return null;
  return buildDays(input, weekDates(nextMonday(week), profile.days), [...week.days].sort((a, b) => a.date.localeCompare(b.date)));
}

/** The plan needs work: no week yet, this week is over, or next week isn't planned. */
export const needsPlan = (week: CoachWeek | null | undefined, now: Date) => !week || weekOver(week, now) || !week.ahead;

/** Keep two weeks ready (call it when `needsPlan`). On a new Monday, last week's "next week"
    becomes this week exactly as planned (what you saw is what you get; a workout missed last week
    isn't carried over), and a new next week is drafted behind it. Null: nothing to change. */
export function planAhead(input: BuildInput): CoachWeek | null {
  if (!input.coach.profile) return null;
  let week = input.coach.week ?? null;
  if (week && weekOver(week, input.now)) {
    const monday = dayKey(mondayOf(input.now));
    const rolls = week.ahead && dayKey(nextMonday(week)) === monday;
    const kept = rolls ? week.days.filter((d) => d.date >= monday) : [];
    week = rolls ? { start: monday, days: kept, by: kept.some((d) => d.plan.by === 'coach') ? 'coach' : 'built-in' } : null;
  }
  week = week ?? buildWeek(input);
  if (!week) return null;
  if (week.ahead) return week;
  if (daysIn(week, 1).length) return { ...week, ahead: true };
  const next = buildNextWeek(input, week);
  return next && { ...week, days: [...week.days.filter((d) => weekOf(week!, d.date) === 0), ...next], ahead: true };
}

/** The next workout: the week's first day not done. */
export function currentPlan(coach: CoachState | undefined): CoachPlan | undefined {
  return nextDay(coach?.week)?.plan;
}

/** Change the next workout. With no week yet (the built-in plan, before the coach), it becomes a
    week of one day, today. */
export function setPlan(state: GameState, plan: CoachPlan, now = new Date()): GameState {
  return setDay(state, undefined, plan, now);
}

/** A day still to do, by date; else the next day. */
export function dayOf(week: CoachWeek | null | undefined, date?: string): CoachDay | undefined {
  return (date && week?.days.find((d) => d.date === date && !d.done)) || nextDay(week);
}

/** A date the plan can still take: from today (and the day it was planned) to next week's Sunday. */
export function openDate(week: CoachWeek, date: string, now: Date): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= dayKey(now) && date >= week.start && date <= lastDay(week);
}

const sorted = (days: CoachDay[]) => [...days].sort((a, b) => a.date.localeCompare(b.date));
const withWeek = (state: GameState, coach: CoachState, week: CoachWeek): GameState => ({ ...state, coach: { ...coach, week } });

/** Put a plan on one day of the week: that day's workout if it has one not done, a new workout
    on a rest day still to come, else the next workout. */
export function setDay(state: GameState, date: string | undefined, plan: CoachPlan, now = new Date()): GameState {
  const coach: CoachState = state.coach ?? { notes: [] };
  const week = coach.week;
  if (!week) return withWeek(state, coach, { start: dayKey(now), days: [{ date: dayKey(now), plan }], by: plan.by });
  const target = dayOf(week, date);
  if (date && target?.date !== date && !week.days.some((d) => d.date === date) && openDate(week, date, now))
    return withWeek(state, coach, { ...week, days: sorted([...week.days, { date, plan }]) });
  if (!target) return withWeek(state, coach, { ...week, days: sorted([...week.days, { date: dayKey(now), plan }]) });
  return withWeek(state, coach, { ...week, days: week.days.map((d) => (d === target ? { ...d, plan } : d)) });
}

/** Move a day's workout to another day: onto a rest day, or swapping with that day's workout.
    Neither may be done, and the new day must be today or later this week. */
export function moveDay(state: GameState, from: string, to: string, now: Date): GameState | string {
  const coach = state.coach;
  const week = coach?.week;
  if (!coach || !week) return 'No week planned yet.';
  const a = week.days.find((d) => d.date === from);
  if (!a) return `${from} has no workout to move.`;
  if (a.done) return `${from}'s workout is done already.`;
  if (from === to) return 'That is the same day.';
  if (!openDate(week, to, now)) return `${to} is not between today and next week's Sunday.`;
  const b = week.days.find((d) => d.date === to);
  if (b?.done) return `${to}'s workout is done already.`;
  const days = week.days.map((d) => (d === a ? { ...d, date: to } : d === b ? { ...d, date: from } : d));
  return withWeek(state, coach, { ...week, days: sorted(days) });
}

/** Make a day a rest day: its workout (not done) is taken off the week. */
export function restDay(state: GameState, date: string): GameState | string {
  const coach = state.coach;
  const week = coach?.week;
  const day = week?.days.find((d) => d.date === date);
  if (!coach || !week || !day) return `${date} is a rest day already.`;
  if (day.done) return `${date}'s workout is done already.`;
  return withWeek(state, coach, { ...week, days: week.days.filter((d) => d !== day) });
}

/** A workout was finished: its day is done, so the next day's workout is up. */
export function markDone(coach: CoachState, at: string): CoachState {
  const day = nextDay(coach.week);
  if (!coach.week || !day) return coach;
  return { ...coach, week: { ...coach.week, days: coach.week.days.map((d) => (d === day ? { ...d, done: at } : d)) } };
}

/** A save from before weeks kept one `plan`: it becomes a week of one day. */
export function fromLegacy(coach: (CoachState & { plan?: CoachPlan | null }) | undefined): CoachState | undefined {
  if (!coach || !('plan' in coach)) return coach;
  const { plan, ...rest } = coach;
  if (!plan || rest.week) return rest;
  const day = dayKey(new Date(plan.at));
  return { ...rest, week: { start: day, days: [{ date: day, plan }], by: plan.by } };
}

/** A week as plain lines, for the coach brief: every day, workouts and rest days (`which`: 0 this
    week, 1 next week). */
export function weekText(week: CoachWeek | null | undefined, now: Date, kept: (date: string) => boolean = () => false, which: 0 | 1 = 0): string[] {
  if (!week) return ['No week planned yet.'];
  if (which === 1 && !week.ahead) return ['Not planned yet.'];
  return weekSlots(week, which).map(({ date, day: d, before }) => {
    const head = `- ${weekdayOf(date)} ${date} (${dayLabel(date, now)})`;
    if (before) return `${head}: before this plan`;
    if (!d) return `${head}: rest day${kept(date) ? ', KEPT' : ''}`;
    const items = d.plan.items.filter((i) => i.role !== 'warmup' && i.role !== 'stretch').map((i) => i.name);
    return `${head}${d.done ? ' DONE' : ''}: ${d.plan.mode}, ${d.plan.title}${items.length ? ` [${items.join(', ')}]` : ''}`;
  });
}

import { WEEK_SPREAD } from '@/balance';
import type { LibraryExercise } from '@/exercises/library';
import { dayKey, daysApart } from '../days';
import type { GameState, Session } from '../game';
import { buildWorkout } from './generate';
import type { CoachDay, CoachPlan, CoachState, CoachWeek, Mode } from './types';

/* The week: a calendar week, Monday to Sunday. The coach plans the workout days; every other day is a
   rest day, and resting is part of the plan: you keep a rest day by sitting by the fire that day
   (the day's page in the Book of Days, `restKept`). It is the one place a workout lives. The next
   workout (`currentPlan`) is the first workout day not done yet, whatever its date: a missed day
   moves along rather than being lost. Today's quest, the workout screen and the coach all read it
   from here, and every change is written to its day (`setPlan`, `setDay`). A week planned mid-week
   starts that day (`start`): the days before it aren't part of the plan. It ends on Sunday; on
   Monday a new one is planned. */

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

/** The week is over: its Sunday is past (its rest days count too, so it runs its course even with
    every workout done). */
export function weekOver(week: CoachWeek | null | undefined, now: Date): boolean {
  return !week || daysApart(nextMonday(week), now) >= 0;
}

/** The week's seven days, Monday to Sunday: a workout day, a rest day (no `day`), or before the
    week was planned (`before`). */
export function weekSlots(week: CoachWeek): { date: string; day?: CoachDay; before?: boolean }[] {
  const monday = mondayOf(dateOf(week.start));
  return Array.from({ length: 7 }, (_, i) => {
    const date = dayKey(addDays(monday, i));
    return { date, day: week.days.find((d) => d.date === date), ...(date < week.start ? { before: true } : {}) };
  });
}

/** A rest day kept: you sat by the fire that day. */
export const restKept = (state: Pick<GameState, 'days'>, date: string) => !!state.days?.find((d) => d.day === date)?.fire;

/** Today is one of the week's rest days. */
export function restToday(coach: CoachState | undefined, now: Date): boolean {
  const week = coach?.week;
  if (!week || weekOver(week, now)) return false;
  const today = dayKey(now);
  return weekSlots(week).some((s) => s.date === today && !s.day && !s.before);
}

/** A week of built-in workouts from today. Each day knows the days planned before it, so modes and
    A/B days take turns across the week. */
export function buildWeek(input: { all: LibraryExercise[]; coach: CoachState; sessions: Session[]; now: Date; rng: () => number }): CoachWeek | null {
  const profile = input.coach.profile;
  if (!profile) return null;
  const after: Mode[] = [];
  const days: CoachDay[] = [];
  for (const date of weekDates(input.now, profile.days)) {
    const plan = buildWorkout({ ...input, after: [...after] });
    if (!plan) return null;
    after.push(plan.mode);
    days.push({ date, plan });
  }
  return { start: dayKey(input.now), days, by: 'built-in' };
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

/** A date the week can still plan: in its Monday-to-Sunday, from today on. */
export function openDate(week: CoachWeek, date: string, now: Date): boolean {
  return date >= dayKey(now) && weekSlots(week).some((s) => s.date === date && !s.before);
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
  if (!openDate(week, to, now)) return `${to} is not between today and Sunday of this week.`;
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

/** The week as plain lines, for the coach brief: every day, workouts and rest days. */
export function weekText(week: CoachWeek | null | undefined, now: Date, kept: (date: string) => boolean = () => false): string[] {
  if (!week) return ['No week planned yet.'];
  return weekSlots(week).map(({ date, day: d, before }) => {
    const head = `- ${weekdayOf(date)} ${date} (${dayLabel(date, now)})`;
    if (before) return `${head}: before this plan`;
    if (!d) return `${head}: rest day${kept(date) ? ', KEPT' : ''}`;
    const items = d.plan.items.filter((i) => i.role !== 'warmup' && i.role !== 'stretch').map((i) => i.name);
    return `${head}${d.done ? ' DONE' : ''}: ${d.plan.mode}, ${d.plan.title}${items.length ? ` [${items.join(', ')}]` : ''}`;
  });
}

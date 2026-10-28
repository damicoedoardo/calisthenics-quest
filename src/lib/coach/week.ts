import { WEEK_SPREAD } from '@/balance';
import type { LibraryExercise } from '@/exercises/library';
import { dayKey, daysApart } from '../days';
import type { GameState, Session } from '../game';
import { buildWorkout } from './generate';
import type { CoachDay, CoachPlan, CoachState, CoachWeek, Mode } from './types';

/* The week: the coach plans the workout days of the next seven days, so you see the whole week.
   It is the one place a workout lives. The next workout (`currentPlan`) is the first day not done
   yet, whatever its date: a missed day moves along rather than being lost. Today's quest, the
   workout screen and the coach all read it from here, and every change is written to its day
   (`setPlan`, `setDay`). A week ends seven days after its start, or when every day is done; then a
   new one is planned. */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dateOf = (key: string) => new Date(`${key}T12:00:00`);

/** The workout dates of a week starting `start`, for `days` workouts. */
export function weekDates(start: Date, days: number): string[] {
  const spread = WEEK_SPREAD[Math.max(2, Math.min(6, days))];
  return spread.map((d) => dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + d, 12)));
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

/** The week is over: every day done, or seven days past its start. */
export function weekOver(week: CoachWeek | null | undefined, now: Date): boolean {
  return !week || !nextDay(week) || daysApart(dateOf(week.start), now) >= 7;
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

/** Put a plan on one day of the week (by date, if not done), else on the next day. */
export function setDay(state: GameState, date: string | undefined, plan: CoachPlan, now = new Date()): GameState {
  const coach: CoachState = state.coach ?? { notes: [] };
  const week = coach.week;
  const target = dayOf(week, date);
  const next: CoachWeek = week && target ? { ...week, days: week.days.map((d) => (d === target ? { ...d, plan } : d)) } : { start: dayKey(now), days: [{ date: dayKey(now), plan }], by: plan.by };
  return { ...state, coach: { ...coach, week: next } };
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

/** The week as plain lines, for the coach brief. */
export function weekText(week: CoachWeek | null | undefined, now: Date): string[] {
  if (!week) return ['No week planned yet.'];
  return week.days.map((d) => {
    const items = d.plan.items.filter((i) => i.role !== 'warmup' && i.role !== 'stretch').map((i) => i.name);
    return `- ${weekdayOf(d.date)} ${d.date} (${dayLabel(d.date, now)})${d.done ? ' DONE' : ''}: ${d.plan.mode}, ${d.plan.title}${items.length ? ` [${items.join(', ')}]` : ''}`;
  });
}

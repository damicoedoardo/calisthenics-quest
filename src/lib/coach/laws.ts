import { LAWS, MAX_SETS_PER_FAMILY, TIME_SLACK } from '@/balance';
import type { Family } from '@/exercises/coaching';
import type { Session } from '../game';
import { dayKey, daysApart } from '../days';
import type { CoachPlan, CoachWeek, PlanItem } from './types';

/* The coach's laws: the few rules that are always true, whatever the player or the coach asks
   (docs/handbook/game/coach.md). Everything else (split, exercises, order, reps, rests, a
   cool-down) is a default the player and the coach may change, and the player's own rules (notes
   of type `rule`) come on top. A law wins over a rule; the coach says which and why.

   Workout laws (1-4, 7-9) are fixed by `validate` on every workout; week laws (5, 6) are checked
   by `weekBreaks` before a week or a day is saved, and a week that breaks one is not saved: the
   coach gets the breaks with their fixes and tries again. Law 2 holds by design: the app never
   asks for a set to failure (every target says stop with 2 left). */

export interface Law {
  n: number;
  title: string;
  text: string;
}

export const LAW_LIST: Law[] = [
  { n: 1, title: 'A warm-up first', text: `Every workout opens with at least ${Math.round(LAWS.warmupSec / 60)} minutes of warm-up. What's in it is free.` },
  { n: 2, title: 'Never to failure', text: 'Every set ends with reps still in the tank (the app says stop with 2 left). No max-out tests.' },
  { n: 3, title: 'Nothing on a sore spot', text: 'Spared areas and pain notes keep their exercises out. Sharp, new or worse pain: stop and rest it, see a doctor or physio.' },
  { n: 4, title: 'Not too much in a day', text: `At most ${MAX_SETS_PER_FAMILY} hard sets of one movement family in a workout.` },
  { n: 5, title: 'Not too much in a week', text: `At most ${LAWS.weekSets} hard sets of one movement family in a week.` },
  { n: 6, title: 'Rest between hard days', text: `The same movement family (main or accessory work) never on two days running; at most ${LAWS.maxDays} workout days a week. Core may come every day.` },
  { n: 7, title: 'Coming back gently', text: `After ${LAWS.comebackDays}+ days off, the first ${LAWS.comebackWeek} days back drop a third of the sets.` },
  { n: 8, title: 'No sudden long run', text: `No run more than ${Math.round(LAWS.runSpike * 100)}% longer than the longest of the last ${LAWS.runWindowDays} days.` },
  { n: 9, title: 'Fits the time', text: `About the player's minutes, ${Math.round(TIME_SLACK * 100)}% over at most.` },
];

const DAY = 86_400_000;

/** Back from a break: the last workout was `comebackDays` or more ago, or the first one after such
    a gap was less than `comebackWeek` days ago. */
export function comingBack(sessions: Pick<Session, 'date'>[], now: Date): boolean {
  const t = sessions.map((s) => new Date(s.date).getTime()).filter((x) => x <= now.getTime()).sort((a, b) => a - b);
  if (!t.length) return false;
  if (now.getTime() - t[t.length - 1] >= LAWS.comebackDays * DAY) return true;
  for (let i = t.length - 1; i > 0; i--) {
    if (now.getTime() - t[i] >= LAWS.comebackWeek * DAY) return false;
    if (t[i] - t[i - 1] >= LAWS.comebackDays * DAY) return true;
  }
  return false;
}

/** The longest run of the last `runWindowDays`, in seconds (0: none). */
export function longestRun(sessions: Pick<Session, 'date' | 'mode' | 'entries'>[], now: Date): number {
  return sessions
    .filter((s) => s.mode === 'running' && now.getTime() - new Date(s.date).getTime() < LAWS.runWindowDays * DAY)
    .reduce((m, s) => Math.max(m, s.entries.reduce((a, e) => a + e.sets.reduce((b, x) => b + x.reps, 0), 0)), 0);
}

const hard = (it: PlanItem) => !it.skipped && !it.run && (it.role === 'main' || it.role === 'accessory' || it.role === 'core');

/** The movement families a workout trains hard (main and accessory work; core may come daily). */
export function hardFamilies(plan: CoachPlan): Family[] {
  return [...new Set(plan.items.filter((it) => hard(it) && it.role !== 'core').map((it) => it.family))];
}

/** What in the plan breaks a week law (5, 6), each with its fix. Empty: the plan is lawful. Days
    running are checked across both weeks (Sunday to Monday too); the counts go by calendar week. */
export function weekBreaks(week: CoachWeek | null | undefined): string[] {
  if (!week) return [];
  const days = [...week.days].sort((a, b) => a.date.localeCompare(b.date));
  const out: string[] = [];
  for (let i = 1; i < days.length; i++) {
    const a = days[i - 1],
      b = days[i];
    if (daysApart(new Date(`${a.date}T12:00:00`), new Date(`${b.date}T12:00:00`)) !== 1) continue;
    const shared = hardFamilies(a.plan).filter((f) => hardFamilies(b.plan).includes(f));
    if (shared.length) out.push(`${a.date} and ${b.date} are days running and both train ${shared.join(', ')} (law 6). Move one day, or train other families on one of them.`);
  }
  // Next week starts the Monday after the week's start.
  const s0 = new Date(`${week.start}T12:00:00`);
  const split = dayKey(new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() - ((s0.getDay() + 6) % 7) + 7, 12));
  for (const [label, group] of [
    ['this week', days.filter((d) => d.date < split)],
    ['next week', days.filter((d) => d.date >= split)],
  ] as const) {
    if (group.length > LAWS.maxDays) out.push(`${group.length} workout days ${label}: at most ${LAWS.maxDays}, so one day rests (law 6). Make one a rest day.`);
    const sets = new Map<string, number>();
    for (const d of group) for (const it of d.plan.items) if (hard(it)) sets.set(it.family, (sets.get(it.family) ?? 0) + it.sets);
    for (const [f, n] of sets) if (n > LAWS.weekSets) out.push(`${f}: ${n} hard sets ${label}, at most ${LAWS.weekSets} (law 5). Take ${n - LAWS.weekSets} off.`);
  }
  return out;
}

import { dayKey } from '../days';
import type { GameState, Session } from '../game';
import type { CoachDay, CoachState } from './types';

/* How training has really gone, as facts for the coach (the LLM) to plan from: which exercises
   were finished, the reps against the target, how each set felt (Easy 4+, Just right 2-3, Very
   hard 0-1 left), how the workout felt and the player's word after it, a rough day, how long it
   really took next to the estimate, and planned workouts still waiting. No rule here changes a
   plan: the coach reads it (the brief, `goingLines`; in full with the `workout_log` tool,
   `workoutLog`) and decides, like a trainer who looked at your log (Edoardo 2026-11-01). */

const FEEL = { '4+': 'easy', '2-3': 'just right', '0-1': 'very hard' } as const;

/** A workout that was hard on the player: it felt hard, it was a rough day, or most sets were very hard. */
export function heavy(s: Session): boolean {
  const sets = s.entries.flatMap((e) => e.sets);
  return s.felt === 'hard' || s.checkin === 'rough' || (sets.length > 0 && sets.filter((x) => x.rir === '0-1').length * 2 > sets.length);
}

/** Planned workouts whose day has passed and that still wait. */
export function waiting(coach: CoachState | undefined, now: Date): CoachDay[] {
  const today = dayKey(now);
  return coach?.week?.days.filter((d) => !d.done && d.date < today) ?? [];
}

/** Real minutes over the estimate, the middle of the last few timed workouts (null: not enough yet). */
export function paceOf(sessions: Pick<Session, 'minutes' | 'planned'>[]): number | null {
  const ratios = sessions
    .filter((s) => s.minutes && s.planned)
    .slice(-5)
    .map((s) => s.minutes! / s.planned!)
    .sort((a, b) => a - b);
  return ratios.length >= 3 ? Math.round(ratios[Math.floor(ratios.length / 2)] * 100) / 100 : null;
}

/** A short summary of the last workouts, for the brief: facts only, the coach draws the conclusions. */
export function goingLines(state: GameState, now: Date): string[] {
  const lines: string[] = [];
  const recent = state.sessions.slice(-5);
  if (!recent.length) return lines;
  const run = [...recent].reverse().findIndex((s) => !heavy(s));
  const inRow = run === -1 ? recent.length : run;
  lines.push(`- Of the last ${recent.length} workouts, ${recent.filter(heavy).length} were heavy (felt hard, a rough day, or most sets very hard)${inRow >= 2 ? `; the last ${inRow} in a row` : ''}.`);
  const easy = recent.filter((s) => s.felt === 'easy').length;
  if (easy) lines.push(`- ${easy} felt easy.`);
  const unfinished = recent.filter((s) => s.left?.length || s.entries.some((e) => e.of && e.sets.length < e.of)).length;
  if (unfinished) lines.push(`- ${unfinished} ended with exercises or sets not done.`);
  const pace = paceOf(state.sessions);
  if (pace !== null && Math.abs(pace - 1) >= 0.1) lines.push(`- Their workouts take about ${pace}x the "about N min" estimate.`);
  const late = waiting(state.coach, now);
  if (late.length) lines.push(`- ${late.length} planned workout${late.length === 1 ? '' : 's'} not done on ${late.length === 1 ? 'its day' : 'their days'} (${late.map((d) => d.date).join(', ')}).`);
  lines.push('- For every set, the reps and how it felt: the workout_log tool.');
  return lines;
}

/** One workout in full: every exercise, every set, how it went. */
function sessionText(s: Session): string[] {
  const head = [
    `${s.date.slice(0, 10)} ${s.mode ?? 'gym'}${s.plannedBy ? `, planned by ${s.plannedBy}` : ''}`,
    s.minutes ? `${s.minutes} min (estimate ${s.planned ?? '?'})` : '',
    s.checkin === 'rough' ? 'started as a rough day' : '',
    s.felt ? `felt ${s.felt}` : 'feel not said',
    s.comment ? `they said: "${s.comment}"` : '',
  ].filter(Boolean);
  const rows = s.entries.map((e) => {
    const sets = e.sets.map((x) => `${x.reps}${x.kg ? `@${x.kg}kg` : ''}${x.km ? ` ${x.km}km` : ''} ${FEEL[x.rir]}`).join(', ');
    const done = e.of ? ` ${e.sets.length} of ${e.of} sets${e.sets.length < e.of ? ' (not finished)' : ''}` : '';
    return `  - ${e.name ?? e.exerciseId}${e.family ? ` (${e.family})` : ''}: target ${e.target},${done}: ${sets}`;
  });
  const extra = [
    s.left?.length ? `  - not started: ${s.left.join(', ')}` : '',
    s.skipped?.length ? `  - skipped before starting: ${s.skipped.join(', ')}` : '',
    s.changed?.length ? `  - changed: ${s.changed.map((c) => `${c.from} -> ${c.to} (${c.how})`).join(', ')}` : '',
    s.raised?.length ? `  - target raised next time: ${s.raised.join(', ')}` : '',
  ].filter(Boolean);
  return [`- ${head.join('; ')}`, ...rows, ...extra];
}

/** The workout log in full, newest last: the last `last` workouts, or only those with an exercise
    whose name or id has `exercise` in it. */
export function workoutLog(state: GameState, opts: { last?: number; exercise?: string } = {}): string {
  const last = Math.max(1, Math.min(30, Math.round(opts.last ?? 6)));
  const word = opts.exercise?.trim().toLowerCase();
  const picked = (word ? state.sessions.filter((s) => s.entries.some((e) => `${e.name ?? ''} ${e.exerciseId}`.toLowerCase().includes(word))) : state.sessions).slice(-last);
  if (!picked.length) return word ? `No workouts with "${opts.exercise}" yet.` : 'No workouts yet.';
  return [`${picked.length} workout${picked.length === 1 ? '' : 's'}, oldest first (sets: reps, @kg, how it felt):`, ...picked.flatMap(sessionText)].join('\n');
}

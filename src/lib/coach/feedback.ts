import { FEEDBACK, PACE } from '@/balance';
import { dayKey } from '../days';
import type { GameState, Session } from '../game';
import type { CoachDay, CoachState, PlanItem } from './types';

/* How training is going, read from your own workouts, so the coach plans for how you really train:
   how each set felt (Easy, Just right, Very hard), how the whole workout felt, a rough day, how
   long it really took, and workouts still waiting. Three things follow from it, all in code:
   - Tired: a few heavy workouts in a row make the next workouts a set lighter per move
     (`adaptAhead`), said on the workout and by the flame.
   - Your pace: the "about N min" and the trim to your minutes use how long your workouts really
     take (`paceOf`).
   - The coach's brief says all of it (`goingLines`), so the LLM can talk it through.
   Each exercise's own target steps back after a very hard workout too (`finishSession`). */

/** A workout that was hard on you: it felt hard, it was a rough day, or most sets were very hard. */
export function heavy(s: Session): boolean {
  const sets = s.entries.flatMap((e) => e.sets);
  return s.felt === 'hard' || s.checkin === 'rough' || (sets.length > 0 && sets.filter((x) => x.rir === '0-1').length * 2 > sets.length);
}

/** Why the next workouts should be lighter, or nothing: the last few workouts were all heavy. */
export function tiredWhy(sessions: Session[]): string | undefined {
  const last = sessions.slice(-FEEDBACK.heavyRun);
  if (last.length < FEEDBACK.heavyRun || !last.every(heavy)) return undefined;
  return `your last ${FEEDBACK.heavyRun} workouts were heavy`;
}

/** How long your workouts take next to the estimate (1 = as estimated, 1.2 = a fifth longer). */
export function paceOf(sessions: Pick<Session, 'minutes' | 'planned'>[]): number {
  const timed = sessions.filter((s) => s.minutes && s.planned && s.minutes <= PACE.maxMinutes).slice(-PACE.window);
  if (timed.length < PACE.need) return 1;
  const ratios = timed.map((s) => s.minutes! / s.planned!).sort((a, b) => a - b);
  const mid = ratios[Math.floor(ratios.length / 2)];
  return Math.round(Math.max(PACE.min, Math.min(PACE.max, mid)) * 100) / 100;
}

/** A set off each main and accessory move (never below the least), core and runs as they are. */
function lighter(items: PlanItem[]): PlanItem[] {
  return items.map((it) => (it.run || (it.role !== 'main' && it.role !== 'accessory') ? it : { ...it, sets: Math.max(Math.min(it.sets, FEEDBACK.minSets), it.sets - FEEDBACK.lightCut) }));
}

/** After a workout (and after you say how it felt): when you're tired, the next workouts not made
    lighter yet get a set off each move, and say why. The exercises stay the ones you saw. */
export function adaptAhead(state: GameState): GameState {
  const coach = state.coach;
  const why = tiredWhy(state.sessions);
  if (!coach?.week || !why) return state;
  const ahead = coach.week.days.filter((d) => !d.done).slice(0, FEEDBACK.lightDays);
  if (!ahead.length || ahead[0].plan.why) return state;
  const change = new Set<CoachDay>(ahead.filter((d) => !d.plan.why));
  const days = coach.week.days.map((d) => (change.has(d) ? { ...d, plan: { ...d.plan, items: lighter(d.plan.items), why: `Lighter: ${why}` } } : d));
  return { ...state, coach: { ...coach, week: { ...coach.week, days } } };
}

/** Planned workouts whose day has passed and that still wait. */
export function waiting(coach: CoachState | undefined, now: Date): CoachDay[] {
  const today = dayKey(now);
  return coach?.week?.days.filter((d) => !d.done && d.date < today) ?? [];
}

/** How training is going, for the coach's brief: a few plain lines. */
export function goingLines(state: GameState, now: Date): string[] {
  const lines: string[] = [];
  const why = tiredWhy(state.sessions);
  if (why) lines.push(`- Tired: ${why}. The next ${FEEDBACK.lightDays} workouts were made a set lighter per move (their "why" says so). Ease off; check how they feel.`);
  const recent = state.sessions.slice(-5);
  const hard = recent.filter(heavy).length;
  if (recent.length && !why) lines.push(`- Of the last ${recent.length} workouts, ${hard} felt heavy.`);
  const easy = recent.filter((s) => s.felt === 'easy').length;
  if (easy >= 2) lines.push(`- ${easy} of the last ${recent.length} felt easy: targets rise on their own; a harder move or more weight may fit.`);
  const pace = paceOf(state.sessions);
  if (pace !== 1) lines.push(`- Pace: their workouts take about ${pace}x the estimate. Minutes shown and the trim to their time already count it.`);
  const late = waiting(state.coach, now);
  if (late.length) lines.push(`- Waiting: ${late.length} planned workout${late.length === 1 ? '' : 's'} not done on ${late.length === 1 ? 'its day' : 'their days'} (${late.map((d) => d.date).join(', ')}).`);
  const rough = recent.filter((s) => s.checkin === 'rough').length;
  if (rough) lines.push(`- Rough days: ${rough} of the last ${recent.length} started as a rough day (a short minimum workout).`);
  return lines;
}

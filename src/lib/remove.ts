import { totalXp, type GameState } from './game';
import { embersEarned } from './forge';
import { coinsEarned } from './sweat';
import { buildOf, pointsEarned, pointsSpent } from './stats';
import type { Build, StatId } from './stats';

/* Removing a workout logged by mistake. Everything a workout gives is counted from
   `state.sessions` (XP and level, stat points, sweat coins, embers, the week and the streak, the
   coach's workout log, what friends see), so dropping the session takes it all back. Only a few
   things are saved beside it, and this puts those back too:
   - the week's day it ticked is open again (it is the next workout once more);
   - targets it raised go back, unless a later workout trained that exercise;
   - a coach level it moved goes back;
   - what was already spent stays spent, but nothing goes below zero: points spent past what is
     left come out of the stats (the biggest first), and coins and embers stop at none.
   What was already played (story scenes, zones cleared) stays: the next workouts catch up. */

export function removeSession(state: GameState, id: string): GameState {
  const gone = state.sessions.find((s) => s.id === id);
  if (!gone) return state;
  const sessions = state.sessions.filter((s) => s !== gone);
  const later = sessions.filter((s) => s.date > gone.date);

  // Targets it raised (or sent back down for more weight), if nothing trained them since.
  const reps = { ...state.reps };
  for (const ex of [...(gone.raised ?? []), ...(gone.heavier ?? [])]) {
    const entry = gone.entries.find((e) => e.exerciseId === ex);
    if (entry && !later.some((s) => s.entries.some((e) => e.exerciseId === ex))) reps[ex] = entry.target;
  }

  let next: GameState = { ...state, sessions, reps };
  delete next.buildAt;

  // The week's day it ticked, and a coach level it moved.
  const coach = state.coach;
  if (coach) {
    const week = coach.week && { ...coach.week, days: coach.week.days.map((d) => (d.done === gone.date ? { date: d.date, plan: d.plan } : d)) };
    let profile = coach.profile;
    if (profile) {
      const moved = profile.history.filter((h) => h.at === gone.date && h.field.startsWith('levels.'));
      if (moved.length) {
        const levels = { ...profile.levels };
        for (const h of moved) {
          const p = h.field.slice('levels.'.length) as keyof typeof levels;
          levels[p] = { ...levels[p], level: h.from as (typeof levels)[typeof p]['level'] };
        }
        profile = { ...profile, levels, history: profile.history.filter((h) => !moved.includes(h)) };
      }
    }
    next = { ...next, coach: { ...coach, ...(week !== undefined ? { week } : {}), ...(profile ? { profile } : {}) } };
  }

  // Points spent past what is earned now come back out of the stats, the biggest first.
  let over = pointsSpent(next) - pointsEarned(next).total;
  if (over > 0) {
    const build: Build = { ...buildOf(next) };
    while (over > 0) {
      const top = (Object.keys(build) as StatId[]).reduce<StatId | null>((a, k) => ((build[k] ?? 0) > (a ? build[a] ?? 0 : 0) ? k : a), null);
      if (!top) break;
      build[top] = build[top]! - 1;
      over--;
    }
    next = { ...next, build };
  }

  // Coins and embers already spent stay spent, and what's left stops at none.
  const coinsCap = coinsEarned(next);
  if ((next.sweat?.spent ?? 0) > coinsCap) next = { ...next, sweat: { ...next.sweat!, spent: coinsCap } };
  const e = next.fogGear?.embers;
  const embersCap = embersEarned(next) + (e?.found ?? 0);
  if (e && e.spent > embersCap) next = { ...next, fogGear: { ...next.fogGear!, embers: { ...e, spent: embersCap } } };

  return next;
}

/** The session that ticked this day of the week, if any. */
export const sessionOfDay = (state: GameState, done: string | undefined) => (done ? state.sessions.find((s) => s.date === done) : undefined);

/** What removing a workout takes back, as the confirm step says it. */
export function takesBack(state: GameState, id: string): { xp: number; points: number; coins: number; embers: number } {
  const after = { ...state, sessions: state.sessions.filter((s) => s.id !== id) };
  return {
    xp: totalXp(state) - totalXp(after),
    points: pointsEarned(state).total - pointsEarned(after).total,
    coins: coinsEarned(state) - coinsEarned(after),
    embers: embersEarned(state) - embersEarned(after),
  };
}

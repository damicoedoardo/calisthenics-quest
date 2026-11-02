import { beforeAll, describe, expect, it } from 'vitest';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import { seeded } from './random';
import { finishSession, initialState, todaysQuest, totalXp, type GameState } from './game';
import { applySetup, type SetupAnswers } from './coach/setup';
import { buildWeek, nextDay } from './coach/week';
import { embersOf } from './forge';
import { coins } from './sweat';
import { pointsEarned, pointsFree, pointsSpent } from './stats';
import { removeSession, sessionOfDay } from './remove';

let all: LibraryExercise[];
beforeAll(async () => {
  all = await loadLibrary();
});

const NOW = new Date(2026, 9, 28, 12);
const answers: SetupAnswers = { modes: ['gym'], goal: 'muscle', days: 3, minutes: 40, gear: ['gym'], experience: 'returning', pushups: 2, pullups: 1, lifts: 1, run: 1, avoid: [] };
const withWeek = (): GameState => {
  let n = 0;
  const coach = applySetup(undefined, answers, NOW, () => `n${++n}`);
  return { ...initialState(), coach: { ...coach, week: buildWeek({ all, coach, sessions: [], now: NOW, rng: seeded(1) }) } };
};
/** Every set at target with reps to spare, so targets go up. */
const train = (s: GameState, now: Date) => {
  const sets = Object.fromEntries(todaysQuest(s).map((q) => [q.id, Array.from({ length: q.sets }, () => ({ reps: q.reps, rir: '4+' as const }))]));
  return finishSession({ ...s, draft: { startedAt: now.toISOString(), checkin: 'normal', sets } }, now, () => `s${now.getTime()}`)!;
};

describe('removing a workout', () => {
  it('takes back everything it gave and opens its day again', () => {
    const before = withWeek();
    const day = nextDay(before.coach!.week)!;
    const { state, session } = train(before, NOW);
    expect(session.raised?.length).toBeGreaterThan(0);

    const after = removeSession(state, session.id);
    expect(after.sessions).toEqual([]);
    expect(totalXp(after)).toBe(0);
    expect(pointsEarned(after).total).toBe(pointsEarned(before).total);
    expect(coins(after)).toBe(coins(before));
    expect(embersOf(after)).toBe(embersOf(before));
    expect(todaysQuest(after).map((q) => [q.id, q.reps])).toEqual(todaysQuest(before).map((q) => [q.id, q.reps]));
    expect(nextDay(after.coach!.week)?.date).toBe(day.date);
    expect(sessionOfDay(after, day.done)).toBeUndefined();
  });

  it('keeps targets a later workout trained', () => {
    const one = train(withWeek(), NOW);
    const two = train(one.state, new Date(2026, 9, 30, 12));
    const after = removeSession(two.state, one.session.id);
    for (const id of two.session.entries.map((e) => e.exerciseId)) {
      if (one.session.entries.some((e) => e.exerciseId === id)) expect(after.reps[id]).toBe(two.state.reps[id]);
    }
    expect(after.sessions.map((s) => s.id)).toEqual([two.session.id]);
  });

  it('never leaves you below zero: spent points come out of the stats, coins and embers stop at none', () => {
    const { state, session } = train(withWeek(), NOW);
    const all = pointsEarned(state).total;
    const spent: GameState = { ...state, build: { health: all - 1, damage: 1 }, sweat: { spent: 1 }, fogGear: { ...state.fogGear!, worn: state.fogGear?.worn ?? {}, vault: state.fogGear?.vault ?? [], embers: { found: 0, spent: embersOf(state) } } };
    const after = removeSession(spent, session.id);
    expect(pointsSpent(after)).toBe(pointsEarned(after).total);
    expect(pointsFree(after)).toBe(0);
    expect(after.build?.damage).toBe(1);
    expect(coins(after)).toBe(0);
    expect(after.sweat?.spent).toBe(0);
    expect(embersOf(after)).toBe(0);
  });

  it('does nothing for an unknown workout', () => {
    const { state } = train(withWeek(), NOW);
    expect(removeSession(state, 'nope')).toBe(state);
  });
});

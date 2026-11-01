import { beforeAll, describe, expect, it } from 'vitest';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import { seeded } from '@/lib/random';
import { finishSession, initialState, todaysQuest, type GameState, type Rir, type Session } from '@/lib/game';
import { applySetup, type SetupAnswers } from './setup';
import { nextDay, planAhead } from './week';
import { goingLines, heavy, paceOf, waiting, workoutLog } from './feedback';
import { coachBrief } from './brief';
import { runTool } from './tools';
import { STEP_LABEL } from './chat';

let all: LibraryExercise[];
beforeAll(async () => {
  all = await loadLibrary();
});

// A Wednesday, at noon local time.
const NOW = new Date(2026, 9, 28, 12);
const ids = () => {
  let n = 0;
  return () => `n${++n}`;
};
const answers: SetupAnswers = { modes: ['gym'], goal: 'muscle', days: 3, minutes: 40, gear: ['gym'], experience: 'returning', pushups: 2, pullups: 1, lifts: 1, run: 1, avoid: [] };
const withWeek = (): GameState => {
  const s = { ...initialState(), coach: applySetup(undefined, answers, NOW, ids()) };
  return { ...s, coach: { ...s.coach!, week: planAhead({ all, coach: s.coach!, sessions: [], now: NOW, rng: seeded(1) }) } };
};
/** Train the next workout, every set at its target felt as `rir`, `minutes` after the clock
    started; `skipLast` leaves the last exercise not started. */
const train = (s: GameState, now: Date, rir: Rir, minutes = 40, skipLast = false) => {
  const quest = todaysQuest(s);
  const work = quest.filter((q) => q.role !== 'warmup' && q.role !== 'stretch');
  const sets = Object.fromEntries(quest.filter((q) => !(skipLast && q === work[work.length - 1])).map((q) => [q.id, Array.from({ length: q.sets }, () => ({ reps: q.reps, rir }))]));
  const clockAt = now.getTime() - minutes * 60_000;
  return finishSession({ ...s, draft: { startedAt: new Date(clockAt).toISOString(), clockAt, checkin: 'normal', sets } }, now, () => `s${now.getTime()}`)!;
};
const session = (over: Partial<Session>): Session => ({ id: 'x', date: NOW.toISOString(), kind: 'full', day: 'A', xp: 0, breakdown: [], entries: [], ...over });

describe('the workout log', () => {
  it('saves the real minutes from the clock, the estimate, sets planned and what was not started', () => {
    const s = withWeek();
    const plan = nextDay(s.coach!.week)!.plan;
    const res = train(s, NOW, '2-3', 47, true);
    expect(res.session.minutes).toBe(47);
    expect(res.session.planned).toBeGreaterThan(10);
    const work = plan.items.filter((i) => i.role !== 'warmup' && i.role !== 'stretch');
    expect(res.session.left).toEqual([work[work.length - 1].name]);
    for (const e of res.session.entries.filter((x) => x.of)) expect(e.sets.length).toBe(e.of);
  });

  it('a clock left running for hours saves no time', () => {
    const res = train(withWeek(), NOW, '2-3', 400);
    expect(res.session.minutes).toBeUndefined();
  });

  it('changes no plan on its own: the coach decides', () => {
    let s = withWeek();
    const before = JSON.stringify(s.coach!.week!.days.slice(2));
    s = train(s, NOW, '0-1').state;
    s = train(s, new Date(2026, 9, 30, 12), '0-1').state;
    expect(JSON.stringify(s.coach!.week!.days.slice(2))).toBe(before);
  });

  it('a workout is heavy when it felt hard, was a rough day, or most sets were very hard', () => {
    const sets = (rir: Rir[]) => [{ exerciseId: 'a', target: 8, sets: rir.map((r) => ({ reps: 8, rir: r })) }];
    expect(heavy(session({ felt: 'hard' }))).toBe(true);
    expect(heavy(session({ checkin: 'rough' }))).toBe(true);
    expect(heavy(session({ entries: sets(['0-1', '0-1', '2-3']) }))).toBe(true);
    expect(heavy(session({ entries: sets(['0-1', '2-3', '2-3']) }))).toBe(false);
  });

  it('works out the pace once there are a few timed workouts', () => {
    const timed = (minutes: number) => session({ minutes, planned: 40 });
    expect(paceOf([timed(60), timed(60)])).toBeNull();
    expect(paceOf([timed(48), timed(50), timed(52)])).toBe(1.25);
  });

  it('the brief gives the coach the facts, and the tool every set', () => {
    let s = withWeek();
    s = train(s, NOW, '0-1', 52, true).state;
    s = train(s, new Date(2026, 9, 30, 12), '0-1', 55).state;
    const brief = coachBrief(s, new Date(2026, 9, 30, 13));
    expect(brief).toContain('55 min (planned');
    expect(brief).toContain('not started');
    expect(brief).toContain('the last 2 in a row');
    expect(brief).toContain('workout_log');

    const log = runTool(s, 'workout_log', JSON.stringify({ last: 1 }), { all, now: NOW, id: ids(), rng: seeded(1) }).result;
    expect(log).toContain('1 workout');
    expect(log).toContain('very hard');
    expect(log).toMatch(/target \d+, \d+ of \d+ sets/);
    expect(log).toContain('55 min (estimate');
    expect(STEP_LABEL.workout_log).toBeTruthy();
    const name = s.sessions[0].entries.find((e) => e.of)!.name!;
    expect(workoutLog(s, { exercise: name.split(' ')[0] })).toContain(name);
    expect(workoutLog(s, { exercise: 'zzz' })).toContain('No workouts');
  });

  it('counts planned workouts still waiting', () => {
    const s = withWeek();
    expect(waiting(s.coach, NOW)).toHaveLength(0);
    const later = new Date(2026, 9, 31, 12);
    expect(waiting(s.coach, later).length).toBeGreaterThan(0);
    expect(goingLines({ ...s, sessions: [session({})] }, later).join('\n')).toContain('not done on');
  });
});

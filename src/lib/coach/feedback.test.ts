import { beforeAll, describe, expect, it } from 'vitest';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import { seeded } from '@/lib/random';
import { feltSession, finishSession, initialState, todaysQuest, type GameState, type Rir, type Session } from '@/lib/game';
import { FEEDBACK, PACE } from '@/balance';
import { applySetup, type SetupAnswers } from './setup';
import { nextDay, planAhead } from './week';
import { adaptAhead, goingLines, heavy, paceOf, tiredWhy, waiting } from './feedback';
import { coachBrief } from './brief';
import { coachNudge } from './nudge';
import { minutesOf } from './time';
import { validate } from './validate';

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
/** Train the next workout: every set at its target, felt as `rir`, `minutes` after the clock started. */
const train = (s: GameState, now: Date, rir: Rir, minutes = 40, reps = (r: number) => r) => {
  const sets = Object.fromEntries(todaysQuest(s).map((q) => [q.id, Array.from({ length: q.sets }, () => ({ reps: reps(q.reps), rir }))]));
  const clockAt = now.getTime() - minutes * 60_000;
  return finishSession({ ...s, draft: { startedAt: new Date(clockAt).toISOString(), clockAt, checkin: 'normal', sets } }, now, () => `s${now.getTime()}`)!;
};
const session = (over: Partial<Session>): Session => ({ id: 'x', date: NOW.toISOString(), kind: 'full', day: 'A', xp: 0, breakdown: [], entries: [], ...over });

describe('how training is going', () => {
  it('a workout is heavy when it felt hard, was a rough day, or most sets were very hard', () => {
    const sets = (rir: Rir[]) => [{ exerciseId: 'a', target: 8, sets: rir.map((r) => ({ reps: 8, rir: r })) }];
    expect(heavy(session({ felt: 'hard' }))).toBe(true);
    expect(heavy(session({ checkin: 'rough' }))).toBe(true);
    expect(heavy(session({ entries: sets(['0-1', '0-1', '2-3']) }))).toBe(true);
    expect(heavy(session({ entries: sets(['0-1', '2-3', '2-3']) }))).toBe(false);
    expect(heavy(session({ felt: 'right' }))).toBe(false);
  });

  it('one heavy day alone changes nothing; a run of them makes you tired', () => {
    expect(tiredWhy([session({ felt: 'hard' })])).toBeUndefined();
    expect(tiredWhy([session({ felt: 'hard' }), session({ felt: 'right' })])).toBeUndefined();
    expect(tiredWhy(Array.from({ length: FEEDBACK.heavyRun }, () => session({ felt: 'hard' })))).toContain('heavy');
  });

  it('learns your pace from real minutes, once there are enough, within bounds', () => {
    const timed = (minutes: number) => session({ minutes, planned: 40 });
    expect(paceOf([timed(60), timed(60)])).toBe(1);
    expect(paceOf([timed(48), timed(50), timed(52)])).toBe(1.25);
    expect(paceOf([timed(120), timed(120), timed(120)])).toBe(PACE.max);
    // Left open for hours: not counted.
    expect(paceOf([timed(48), timed(50), timed(PACE.maxMinutes + 1)])).toBe(1);
    expect(minutesOf([{ role: 'core', unit: 'sec', sets: 1, low: 600, high: 600 }], 1.5)).toBe(Math.round(minutesOf([{ role: 'core', unit: 'sec', sets: 1, low: 600, high: 600 }]) * 1.5));
  });
});

describe('the coach follows it', () => {
  it('saves the real minutes, the planned ones and a rough day on the workout', () => {
    const res = train(withWeek(), NOW, '2-3', 47);
    expect(res.session.minutes).toBe(47);
    expect(res.session.planned).toBeGreaterThan(10);
    expect(res.session.checkin).toBeUndefined();
  });

  it('two heavy workouts make the next two a set lighter per move, said on the workout', () => {
    let s = withWeek();
    const planned = s.coach!.week!.days;
    s = train(s, NOW, '0-1').state;
    // One heavy workout: nothing changes yet.
    expect(nextDay(s.coach!.week)!.plan.why).toBeUndefined();
    const second = nextDay(s.coach!.week)!;
    const res = train(s, new Date(2026, 9, 30, 12), '0-1');
    s = res.state;
    const ahead = s.coach!.week!.days.filter((d) => !d.done).slice(0, FEEDBACK.lightDays);
    expect(ahead).toHaveLength(FEEDBACK.lightDays);
    for (const d of ahead) expect(d.plan.why).toMatch(/^Lighter/);
    // The same exercises as planned, fewer sets.
    const was = planned.find((d) => d.date === ahead[0].date)!.plan;
    expect(ahead[0].plan.items.map((i) => i.id)).toEqual(was.items.map((i) => i.id));
    const sets = (items: typeof was.items) => items.reduce((a, i) => a + i.sets, 0);
    expect(sets(ahead[0].plan.items)).toBeLessThan(sets(was.items));
    expect(second.plan.why).toBeUndefined();
    // Said once by the flame, and not lightened twice.
    expect(coachNudge(s, new Date(2026, 9, 31, 12))?.id).toBe(`lighter:${ahead[0].date}`);
    expect(adaptAhead(s)).toBe(s);
  });

  it('cuts a set off main moves only, never below the least', () => {
    let s = withWeek();
    const plan = s.coach!.week!.days[1].plan;
    s = { ...s, sessions: [session({ felt: 'hard' }), session({ felt: 'hard' })] };
    s = { ...s, coach: { ...s.coach!, week: { ...s.coach!.week!, days: s.coach!.week!.days.map((d, k) => (k === 0 ? { ...d, done: NOW.toISOString() } : d)) } } };
    const after = adaptAhead(s).coach!.week!.days[1].plan;
    after.items.forEach((it, k) => {
      const was = plan.items[k];
      if (it.role === 'main' || it.role === 'accessory') expect(it.sets).toBe(Math.max(Math.min(was.sets, FEEDBACK.minSets), was.sets - FEEDBACK.lightCut));
      else expect(it.sets).toBe(was.sets);
    });
  });

  it('a workout that felt hard, said after it, counts too', () => {
    let s = withWeek();
    s = { ...s, sessions: [session({ felt: 'hard' })] };
    const res = train(s, NOW, '2-3');
    expect(nextDay(res.state.coach!.week)!.plan.why).toBeUndefined();
    const after = feltSession(res.state, res.session.id, 'hard', 'long day');
    expect(nextDay(after.coach!.week)!.plan.why).toMatch(/^Lighter/);
    expect(after.sessions.at(-1)!.comment).toBe('long day');
  });

  it('a very hard exercise steps its target back one', () => {
    const s = withWeek();
    const q = todaysQuest(s).find((x) => x.role === 'main' && x.unit === 'reps')!;
    const up = { ...s, reps: { ...s.reps, [q.id]: q.slot.low + 2 } };
    const res = train(up, NOW, '0-1');
    expect(res.session.eased).toContain(q.id);
    expect(res.state.reps[q.id]).toBe(q.slot.low + 1);
    // At the bottom of its range: nothing lower to go to.
    const low = train(s, NOW, '0-1');
    expect(low.session.eased ?? []).not.toContain(q.id);
  });

  it('trims a workout to your minutes at your own pace', () => {
    const s = withWeek();
    const plan = s.coach!.week!.days[0].plan;
    const slow = Array.from({ length: 3 }, () => session({ minutes: 60, planned: 40 }));
    const fit = validate(plan, { all, profile: s.coach!.profile!, sessions: slow, now: NOW });
    expect(minutesOf(fit.plan.items, paceOf(slow))).toBeLessThanOrEqual(Math.round(40 * 1.1) + 1);
    expect(minutesOf(fit.plan.items)).toBeLessThan(minutesOf(plan.items));
  });

  it('the brief tells the coach how each set felt, the target, the time and how it is going', () => {
    let s = withWeek();
    s = train(s, NOW, '0-1', 52).state;
    s = train(s, new Date(2026, 9, 30, 12), '0-1', 55).state;
    const brief = coachBrief(s, new Date(2026, 9, 30, 13));
    expect(brief).toMatch(/\dh\/\d+h/);
    expect(brief).toMatch(/ of \d+/);
    expect(brief).toContain('55 min (planned');
    expect(brief).toContain('How training is going');
    expect(brief).toContain('Tired');
    expect(brief).toContain('Lighter');
  });

  it('counts planned workouts still waiting', () => {
    const s = withWeek();
    expect(waiting(s.coach, NOW)).toHaveLength(0);
    const later = new Date(2026, 9, 31, 12);
    expect(waiting(s.coach, later).length).toBeGreaterThan(0);
    expect(goingLines(s, later).join('\n')).toContain('Waiting');
  });
});

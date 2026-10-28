import { beforeAll, describe, expect, it } from 'vitest';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import { seeded } from '@/lib/random';
import { finishSession, initialState, migrate, todaysQuest, type GameState } from '@/lib/game';
import { applySetup, type SetupAnswers } from './setup';
import { runTool, resolveDay, type ToolContext } from './tools';
import { buildWeek, currentPlan, dayLabel, fromLegacy, markDone, nextDay, setDay, weekDates, weekOver } from './week';
import { coachNudge, freshNudge, hearNudge } from './nudge';
import { coachBrief } from './brief';
import { changeItem } from './plan';
import { REST } from '@/balance';
import type { CoachPlan } from './types';

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
const answers = (over: Partial<SetupAnswers> = {}): SetupAnswers => ({ modes: ['gym'], goal: 'muscle', days: 3, minutes: 40, gear: ['gym'], experience: 'returning', pushups: 2, pullups: 1, lifts: 1, run: 1, avoid: [], ...over });
const withSetup = (a: SetupAnswers = answers()): GameState => ({ ...initialState(), coach: applySetup(undefined, a, NOW, ids()) });
const withWeek = (a?: SetupAnswers): GameState => {
  const s = withSetup(a);
  return { ...s, coach: { ...s.coach!, week: buildWeek({ all, coach: s.coach!, sessions: [], now: NOW, rng: seeded(1) }) } };
};
const ctx = (now = NOW): ToolContext => ({ all, now, id: ids(), rng: seeded(1) });
const run = (s: GameState, name: string, args: unknown, now = NOW) => runTool(s, name, JSON.stringify(args), ctx(now));
const trainAll = (s: GameState, now: Date) => {
  const sets = Object.fromEntries(todaysQuest(s).map((q) => [q.id, [{ reps: q.reps, rir: '2-3' as const }]]));
  return finishSession({ ...s, draft: { startedAt: now.toISOString(), checkin: 'normal', sets } }, now, () => `s${now.getTime()}`)!.state;
};

describe('the week', () => {
  it('spreads the workout days over seven days', () => {
    expect(weekDates(NOW, 3)).toEqual(['2026-10-28', '2026-10-30', '2026-11-01']);
    expect(weekDates(NOW, 2)).toEqual(['2026-10-28', '2026-10-31']);
    expect(dayLabel('2026-10-28', NOW)).toBe('Today');
    expect(dayLabel('2026-10-29', NOW)).toBe('Tomorrow');
    expect(dayLabel('2026-10-30', NOW)).toBe('Fri');
  });

  it('is built with one workout a day, modes taking turns', () => {
    const s = withWeek(answers({ modes: ['gym', 'running'] }));
    const week = s.coach!.week!;
    expect(week.days).toHaveLength(3);
    expect(new Set(week.days.map((d) => d.plan.mode)).size).toBe(2);
    expect(currentPlan(s.coach)).toBe(week.days[0].plan);
  });

  it('Today and the workout read the next day; finishing marks it done and the next one is up', () => {
    let s = withWeek();
    const [first, second] = s.coach!.week!.days;
    expect(todaysQuest(s).map((q) => q.id)).toEqual(first.plan.items.filter((i) => !i.skipped).map((i) => i.id));
    s = trainAll(s, NOW);
    expect(s.coach!.week!.days[0].done).toBe(NOW.toISOString());
    expect(currentPlan(s.coach)).toEqual(second.plan);
    expect(weekOver(s.coach!.week, NOW)).toBe(false);
  });

  it('a missed day moves along, and the week ends after seven days or when all is done', () => {
    const s = withWeek();
    const later = new Date(2026, 9, 31, 12);
    expect(nextDay(s.coach!.week)!.date).toBe('2026-10-28');
    expect(weekOver(s.coach!.week, later)).toBe(false);
    expect(weekOver(s.coach!.week, new Date(2026, 10, 4, 12))).toBe(true);
    let c = s.coach!;
    for (let i = 0; i < 3; i++) c = markDone(c, NOW.toISOString());
    expect(weekOver(c.week, NOW)).toBe(true);
    expect(markDone(c, NOW.toISOString())).toBe(c);
  });

  it('setDay writes the day asked for, never a done one', () => {
    let s = withWeek();
    const plan: CoachPlan = { ...s.coach!.week!.days[2].plan, title: 'Changed' };
    s = setDay(s, '2026-11-01', plan, NOW);
    expect(s.coach!.week!.days[2].plan.title).toBe('Changed');
    s = { ...s, coach: markDone(s.coach!, NOW.toISOString()) };
    s = setDay(s, '2026-10-28', { ...plan, title: 'Again' }, NOW);
    expect(s.coach!.week!.days[0].plan.title).not.toBe('Again');
    expect(s.coach!.week!.days[1].plan.title).toBe('Again');
  });

  it('easier on a later day changes that day only', () => {
    const s = withWeek();
    const day = s.coach!.week!.days[2];
    const item = day.plan.items.find((i) => i.easier.length)!;
    const next = changeItem(s, item.id, item.easier[0], 'easier', day.date);
    expect(next.coach!.week!.days[2].plan.items.some((i) => i.id === item.easier[0].id)).toBe(true);
    expect(next.coach!.week!.days[0]).toEqual(s.coach!.week!.days[0]);
  });

  it('an old save with one plan loads as a week of one day', () => {
    const s = withWeek();
    const plan = s.coach!.week!.days[0].plan;
    const { week: _, ...old } = s.coach!;
    const legacy = { ...old, plan };
    expect(fromLegacy(legacy)!.week!.days).toEqual([{ date: plan.at.slice(0, 10), plan }]);
    expect(fromLegacy({ ...old, plan: null })).toEqual(old);
    const loaded = migrate(JSON.parse(JSON.stringify({ ...s, coach: legacy })));
    expect(currentPlan(loaded.coach)).toEqual(plan);
    expect('plan' in loaded.coach!).toBe(false);
  });
});

describe('the coach plans the week', () => {
  it('resolveDay takes weekdays, today, tomorrow and dates in the next 7 days', () => {
    expect(resolveDay('today', NOW)).toBe('2026-10-28');
    expect(resolveDay('Tomorrow', NOW)).toBe('2026-10-29');
    expect(resolveDay('Friday', NOW)).toBe('2026-10-30');
    expect(resolveDay('tue', NOW)).toBe('2026-11-03');
    expect(resolveDay('2026-11-01', NOW)).toBe('2026-11-01');
    expect(resolveDay('2026-12-01', NOW)).toBeUndefined();
    expect(resolveDay('someday', NOW)).toBeUndefined();
  });

  it('set_week saves the days it can, with rests clamped, and says what it left out', () => {
    const s = withSetup();
    const r = run(s, 'set_week', {
      days: [
        { day: 'fri', mode: 'gym', title: 'Pull', items: [{ id: 'Pullups', role: 'main', rest: 9999 }] },
        { day: 'today', mode: 'gym', title: 'Push', items: [{ id: 'Pushups', role: 'main', rest: 120 }] },
        { day: 'next year', title: 'Nope', items: [{ id: 'Pushups' }] },
      ],
    });
    const week = r.state.coach!.week!;
    expect(week.by).toBe('coach');
    expect(week.days.map((d) => [d.date, d.plan.title])).toEqual([
      ['2026-10-28', 'Push'],
      ['2026-10-30', 'Pull'],
    ]);
    expect(week.days[0].plan.items.find((i) => i.id === 'Pushups')!.rest).toBe(120);
    expect(week.days[1].plan.items.find((i) => i.id === 'Pullups')!.rest).toBe(REST.max);
    expect(r.result).toMatch(/next year/);
  });

  it('set_week keeps a day already done today', () => {
    let s = withWeek();
    s = trainAll(s, NOW);
    const r = run(s, 'set_week', { days: [{ day: 'today', title: 'Again', items: [{ id: 'Pushups' }] }, { day: 'sat', title: 'Sat', items: [{ id: 'Pushups' }] }] });
    const days = r.state.coach!.week!.days;
    expect(days[0].done).toBeDefined();
    expect(days.map((d) => d.plan.title)).toEqual([s.coach!.week!.days[0].plan.title, 'Sat']);
  });

  it('set_workout with a day changes that day', () => {
    const s = withWeek();
    const r = run(s, 'set_workout', { day: 'sun', title: 'Sunday legs', items: [{ id: 'Barbell_Squat', role: 'main' }] });
    expect(r.state.coach!.week!.days[2].plan.title).toBe('Sunday legs');
    expect(r.state.coach!.week!.days[0]).toEqual(s.coach!.week!.days[0]);
  });

  it('the brief shows the week, the flame form and the story', () => {
    const brief = coachBrief(withWeek(), NOW);
    expect(brief).toMatch(/Wed 2026-10-28 \(Today\)/);
    expect(brief).toMatch(/Your form now: Spark/);
    expect(brief).toMatch(/chapter 1 of \d+, The Ashlands/);
  });
});

describe('the flame speaks first', () => {
  it('says a new week, today, then a workout done, then a missed day, each once', () => {
    let s = withWeek();
    expect(coachNudge(s, NOW)!.id).toBe('week:2026-10-28');
    s = hearNudge(s, coachNudge(s, NOW)!, false);
    expect(s.coach!.chat).toBeUndefined();
    s = { ...s, coach: { ...s.coach!, week: { ...s.coach!.week!, start: '2026-10-27' } } };
    expect(coachNudge(s, NOW)!.id).toBe('today:2026-10-28');
    s = hearNudge(s, coachNudge(s, NOW)!, true);
    expect(freshNudge(s, NOW)).toBeUndefined();
    expect(s.coach!.chat!.at(-1)).toEqual({ role: 'assistant', content: coachNudge(s, NOW)!.text });
    s = trainAll(s, NOW);
    expect(freshNudge(s, NOW)!.id).toBe('done:2026-10-28');
    // Friday's workout not done by Saturday.
    expect(coachNudge(s, new Date(2026, 9, 31, 12))!.id).toBe('missed:2026-10-30');
  });

  it('no profile, nothing', () => {
    expect(coachNudge(initialState(), NOW)).toBeUndefined();
  });
});

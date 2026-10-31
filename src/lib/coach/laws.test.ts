import { beforeAll, describe, expect, it } from 'vitest';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import { seeded } from '@/lib/random';
import { initialState, type GameState, type Session } from '@/lib/game';
import { LAWS, MAX_SETS_PER_FAMILY } from '@/balance';
import { applySetup, type SetupAnswers } from './setup';
import { buildWorkout } from './generate';
import { buildWeek } from './week';
import { comingBack, longestRun, weekBreaks, LAW_LIST } from './laws';
import { addNote } from './notes';
import { coachBrief } from './brief';
import { runTool } from './tools';
import type { Minutes, Mode } from './types';

let all: LibraryExercise[];
beforeAll(async () => {
  all = await loadLibrary();
});

// A Monday, so a whole week is ahead.
const NOW = new Date('2026-11-02T09:00:00');
const DAY = 86_400_000;
const setup = (over: Partial<SetupAnswers> = {}, sessions: Session[] = []): GameState => {
  let n = 0;
  const a: SetupAnswers = { modes: ['gym'], goal: 'muscle', days: 3, minutes: 40, gear: ['gym'], experience: 'returning', pushups: 2, pullups: 1, lifts: 1, run: 1, avoid: [], ...over };
  return { ...initialState(), sessions, coach: applySetup(undefined, a, NOW, () => `n${++n}`) };
};
const session = (daysAgo: number, mode: Mode = 'gym', sec = 0): Session => ({
  id: `s${daysAgo}`,
  date: new Date(NOW.getTime() - daysAgo * DAY).toISOString(),
  kind: 'full',
  day: 'A',
  xp: 0,
  breakdown: [],
  mode,
  entries: sec ? [{ exerciseId: 'forma:easy-run', target: sec, family: 'cardio', sets: [{ reps: sec, rir: '2-3' }] }] : [],
} as Session);
const ctx = () => ({ all, now: NOW, id: () => 'x', rng: seeded(1) });
const run = (s: GameState, name: string, input: unknown) => runTool(s, name, JSON.stringify(input), ctx());

describe('the laws', () => {
  it('are nine, numbered, and say their numbers', () => {
    expect(LAW_LIST.map((l) => l.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const l of LAW_LIST) expect(l.text).not.toMatch(/undefined|NaN/);
  });

  it.each([2, 3, 4, 5, 6])('the built-in week keeps every law, %i days a week', (days) => {
    for (const [modes, gear, minutes] of [[['gym'], ['gym'], 60], [['calisthenics'], ['bar'], 40], [['calisthenics'], ['none'], 30], [['gym', 'running'], ['gym'], 40]] as [Mode[], SetupAnswers['gear'], Minutes][]) {
      const s = setup({ modes, gear, minutes, days });
      const week = buildWeek({ all, coach: s.coach!, sessions: [], now: NOW, rng: seeded(days) })!;
      expect(weekBreaks(week)).toEqual([]);
      for (const d of week.days) {
        const warm = d.plan.items.filter((i) => i.role === 'warmup').reduce((a, i) => a + i.low * i.sets, 0);
        expect(warm).toBeGreaterThanOrEqual(LAWS.warmupSec);
        const per = new Map<string, number>();
        for (const it of d.plan.items) if (it.role !== 'warmup' && it.role !== 'stretch') per.set(it.family, (per.get(it.family) ?? 0) + it.sets);
        for (const n of per.values()) expect(n).toBeLessThanOrEqual(MAX_SETS_PER_FAMILY);
      }
    }
  });

  it('law 7: knows a comeback, and the first week back is lighter', () => {
    expect(comingBack([], NOW)).toBe(false);
    expect(comingBack([session(2)], NOW)).toBe(false);
    expect(comingBack([session(20)], NOW)).toBe(true);
    expect(comingBack([session(30), session(3)], NOW)).toBe(true); // back 3 days ago
    expect(comingBack([session(30), session(9)], NOW)).toBe(false); // back 9 days ago
    const fresh = buildWorkout({ all, coach: setup().coach!, sessions: [session(2)], now: NOW, rng: seeded(1) })!;
    const back = buildWorkout({ all, coach: setup().coach!, sessions: [session(20)], now: NOW, rng: seeded(1) })!;
    const sets = (p: typeof fresh) => p.items.filter((i) => i.role === 'main').reduce((a, i) => a + i.sets, 0);
    expect(sets(back)).toBeLessThan(sets(fresh));
  });

  it('law 8: no run much longer than the longest lately', () => {
    const s = setup({ modes: ['running'], run: 4 }, [session(5, 'running', 15 * 60)]);
    expect(longestRun(s.sessions, NOW)).toBe(15 * 60);
    const r = run(s, 'set_workout', { day: 'tue', mode: 'running', title: 'Long', items: [{ id: 'forma:long-run', role: 'main', minutes: 60 }] });
    const runItem = r.state.coach!.week!.days[0].plan.items.find((i) => i.run)!;
    expect(runItem.low).toBeLessThanOrEqual(15 * 60 * (1 + LAWS.runSpike) + 60);
    expect(r.result).toMatch(/law 8/);
  });
});

describe('customizable inside the laws', () => {
  const day = (d: string, id: string, title: string) => ({ day: d, mode: 'gym', title, items: [{ id, role: 'main', sets: 3 }] });

  it('"push, pull, legs, six days": lawful, so saved', () => {
    const s = setup({ days: 6 });
    const ppl = ['Pushups', 'Pullups', 'Bodyweight_Squat'];
    const r = run(s, 'set_week', { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d, i) => day(d, ppl[i % 3], 'PPL')) });
    expect(r.result).toMatch(/The week is saved/);
    expect(r.state.coach!.week!.days).toHaveLength(6);
  });

  it('"legs every day": against law 6, not saved', () => {
    const s = setup({ days: 6 });
    const r = run(s, 'set_week', { days: ['mon', 'tue', 'wed'].map((d) => day(d, 'Bodyweight_Squat', 'Legs')) });
    expect(r.result).toMatch(/^Not saved[\s\S]*law 6/);
  });

  it('"every day of the week": one must rest, not saved', () => {
    const s = setup({ days: 6 });
    const ids = ['Pushups', 'Pullups', 'Bodyweight_Squat', 'Romanian_Deadlift', 'Dumbbell_Shoulder_Press', 'Seated_Cable_Rows', 'Dumbbell_Lunges'];
    const r = run(s, 'set_week', { days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d, i) => day(d, ids[i], 'Every day')) });
    expect(r.result).toMatch(/^Not saved[\s\S]*at most 6/);
  });

  it('too many sets of one family in a week: not saved (law 5)', () => {
    const s = setup({ days: 4 });
    const many = (d: string) => ({ day: d, mode: 'gym', title: 'Bench', items: [{ id: 'Barbell_Bench_Press_-_Medium_Grip', role: 'main', sets: 8 }] });
    const r = run(s, 'set_week', { days: [many('mon'), many('wed'), many('fri')] });
    expect(r.result).toMatch(/^Not saved[\s\S]*24 hard sets this week, at most 20 \(law 5\)/);
  });

  it('your rules: shown first in the brief, kept over notes, and "no ..." keeps those out', () => {
    let s = setup();
    s = { ...s, coach: addNote(s.coach!, { type: 'rule', text: 'No lunges, ever', by: 'coach' }, NOW, () => 'r1') };
    const brief = coachBrief(s, NOW);
    expect(brief).toMatch(/Their rules[^\n]*\n- \[r1\] No lunges, ever/);
    for (let seed = 1; seed < 5; seed++) {
      const p = buildWorkout({ all, coach: s.coach!, sessions: [], now: NOW, rng: seeded(seed), mode: 'gym', after: ['gym'] })!;
      expect(p.items.some((i) => /lunge/i.test(i.name))).toBe(false);
    }
  });

  it('a no from the laws reaches the coach through the playbook', () => {
    const r = run(setup(), 'training_guide', { topic: 'laws' });
    expect(r.result).toMatch(/^## The laws/);
    expect(r.result).toMatch(/6\. Rest between hard days/);
  });
});

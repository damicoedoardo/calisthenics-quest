import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import { seeded } from '@/lib/random';
import { initialState, type GameState } from '@/lib/game';
import { COOLDOWN, RAMP, REST, TIME, TIME_SLACK } from '@/balance';
import { applySetup, type SetupAnswers } from './setup';
import { buildWorkout, item } from './generate';
import { validate } from './validate';
import { BLOCKS, PLAYBOOK, askTraining } from './craft';
import { minutesOf, restFor, secondsOf } from './time';
import { runTool } from './tools';
import { MOVING_STRETCH } from './staples';
import type { CoachPlan, Minutes, Mode } from './types';

let all: LibraryExercise[];
beforeAll(async () => {
  all = await loadLibrary();
});

const NOW = new Date('2026-10-28T10:00:00Z');
const setup = (over: Partial<SetupAnswers> = {}): GameState => {
  let n = 0;
  const a: SetupAnswers = { modes: ['gym'], goal: 'muscle', days: 3, minutes: 40, gear: ['gym'], experience: 'returning', pushups: 2, pullups: 1, lifts: 1, run: 1, avoid: [], ...over };
  return { ...initialState(), coach: applySetup(undefined, a, NOW, () => `n${++n}`) };
};
const ctx = { now: NOW, id: () => 'x', rng: () => 0.5 };

describe('a built-in workout is built like a trainer would', () => {
  const cases: [Mode, SetupAnswers['gear'], Minutes, SetupAnswers['goal']][] = [];
  for (const minutes of [20, 30, 40, 60] as Minutes[]) {
    cases.push(['gym', ['gym'], minutes, 'muscle'], ['gym', ['gym'], minutes, 'strength'], ['calisthenics', ['bar'], minutes, 'health'], ['calisthenics', ['none'], minutes, 'skill']);
  }

  it.each(cases)('%s with %j, %i min, %s: blocks in order, a real warm-up and cool-down, fits the minutes', (mode, gear, minutes, goal) => {
    const s = setup({ modes: [mode], gear, minutes, goal });
    for (const after of [[], [mode]] as Mode[][]) {
      const plan = buildWorkout({ all, coach: s.coach!, sessions: [], now: NOW, rng: seeded(3), after })!;
      const roles = plan.items.map((i) => BLOCKS.indexOf(i.role));
      expect(roles).toEqual([...roles].sort((a, b) => a - b));
      const warm = plan.items.filter((i) => i.role === 'warmup');
      expect(warm.length).toBeGreaterThanOrEqual(2);
      expect(warm.reduce((a, i) => a + i.low, 0)).toBeGreaterThanOrEqual(minutes <= 20 ? 150 : 240);
      const cool = plan.items.filter((i) => i.role === 'stretch');
      expect(cool).toHaveLength(COOLDOWN.stretches[minutes]);
      for (const c of cool) expect(c.name).not.toMatch(MOVING_STRETCH);
      expect(plan.items.filter((i) => i.role === 'main').length).toBeGreaterThanOrEqual(2);
      expect(minutesOf(plan.items)).toBeLessThanOrEqual(Math.ceil(minutes * (1 + TIME_SLACK)));
      expect(validate(plan, { all, profile: s.coach!.profile! }).problems).toEqual([]);
    }
  });

  it('ramps up into the first weighted lift, and only that one', () => {
    const s = setup();
    const plan = buildWorkout({ all, coach: s.coach!, sessions: [], now: NOW, rng: seeded(1) })!;
    const ramped = plan.items.filter((i) => i.ramp);
    expect(ramped).toHaveLength(1);
    expect(ramped[0]).toMatchObject({ role: 'main', weighted: true, ramp: RAMP.sets });
  });

  it('an hour in the gym rounds the main work out with accessories', () => {
    const s = setup({ minutes: 60 });
    const plan = buildWorkout({ all, coach: s.coach!, sessions: [], now: NOW, rng: seeded(1) })!;
    const acc = plan.items.filter((i) => i.role === 'accessory');
    expect(acc.length).toBeGreaterThan(0);
    for (const a of acc) expect(['arms', 'shoulders', 'legs-isolation', 'lunge', 'hinge', 'push-vertical']).toContain(a.family);
  });
});

describe('the guardrails keep the order', () => {
  it("puts a coach's jumbled workout back in block order, and says so", () => {
    const s = setup();
    const x = (id: string) => all.find((e) => e.id === id)!;
    const it_ = (id: string, role: Parameters<typeof item>[5]) => item(id, x(id).name, x(id).demo, '', x(id).family, role, role === 'warmup' || role === 'stretch' ? 1 : 3, role === 'warmup' || role === 'stretch' ? 60 : 8, role === 'warmup' || role === 'stretch' ? 60 : 12);
    const plan: CoachPlan = { mode: 'gym', by: 'coach', at: NOW.toISOString(), title: 't', items: [it_('Plank', 'core'), it_('Arm_Circles', 'warmup'), it_('Dumbbell_Bicep_Curl', 'accessory'), it_('Barbell_Squat', 'main'), it_('Hamstring_Stretch', 'stretch')] };
    const out = validate(plan, { all, profile: s.coach!.profile! });
    expect(out.plan.items.map((i) => i.role)).toEqual(['warmup', 'main', 'accessory', 'core', 'stretch']);
    expect(out.problems.join()).toMatch(/order/);
  });

  it('short on time: accessories go before a main set is cut', () => {
    const s = setup({ minutes: 30 });
    const x = (id: string) => all.find((e) => e.id === id)!;
    const main = (id: string) => ({ ...item(id, x(id).name, x(id).demo, '', x(id).family, 'main', 3, 8, 12), weighted: true });
    const plan: CoachPlan = { mode: 'gym', by: 'coach', at: NOW.toISOString(), title: 't', items: [main('Barbell_Squat'), main('Dumbbell_Bench_Press'), main('Seated_Cable_Rows'), item('Dumbbell_Bicep_Curl', 'Curl', x('Dumbbell_Bicep_Curl').demo, '', 'arms', 'accessory', 3, 10, 15), item('Triceps_Pushdown', 'Pushdown', x('Triceps_Pushdown').demo, '', 'arms', 'accessory', 3, 10, 15)] };
    const out = validate(plan, { all, profile: s.coach!.profile! });
    expect(minutesOf(out.plan.items)).toBeLessThanOrEqual(30 * (1 + TIME_SLACK));
    const mains = out.plan.items.filter((i) => i.role === 'main');
    if (out.plan.items.some((i) => i.role === 'accessory')) expect(mains.every((m) => m.sets === 3)).toBe(true);
  });
});

describe('the time a workout takes', () => {
  it('counts reps, rests, set-up and ramp-up sets', () => {
    const squat = { ...item('Barbell_Squat', 'Squat', 'barbell-squat', '', 'squat', 'main', 3, 8, 12), weighted: true };
    const work = 10 * TIME.weightedRep;
    expect(secondsOf(squat)).toBe(3 * (work + REST.heavy) + TIME.setupWeighted);
    expect(secondsOf({ ...squat, ramp: 2 })).toBe(secondsOf(squat) + 2 * (work + RAMP.rest));
    expect(secondsOf({ ...squat, rest: 60 })).toBeLessThan(secondsOf(squat));
    const stretch = item('Hamstring_Stretch', 'H', 'reach-stretch', '', 'stretch', 'stretch', 1, 45);
    expect(secondsOf(stretch)).toBe(45 + TIME.change);
    expect(secondsOf({ ...squat, skipped: true })).toBe(0);
  });

  it('rests by role when the coach set none', () => {
    expect(restFor({ role: 'main', weighted: true })).toBe(REST.heavy);
    expect(restFor({ role: 'main' })).toBe(REST.main);
    expect(restFor({ role: 'accessory' })).toBe(REST.accessory);
    expect(restFor({ role: 'core' })).toBe(REST.core);
    expect(restFor({ role: 'main', rest: 150 })).toBe(150);
  });
});

describe('the playbook', () => {
  it('writes every topic without holes', () => {
    for (const t of PLAYBOOK) expect(t.text()).not.toMatch(/undefined|NaN|\[object/);
  });
  it('answers by topic, and an empty question gets the session and the list', () => {
    expect(askTraining('')).toMatch(/five blocks[\s\S]*Topics:/);
    expect(askTraining('how should I warm up')).toMatch(/^## The warm-up/);
    expect(askTraining('progression when stuck')).toMatch(/Double progression/);
  });
  it('is a coach tool', () => {
    expect(runTool(initialState(), 'training_guide', JSON.stringify({ topic: 'cool down' }), { all: [], ...ctx }).result).toMatch(/cool-down/i);
  });
});

describe('the server and the phone agree on the tools', () => {
  it('every tool the server offers runs here', () => {
    const py = readFileSync('backend/app/coach.py', 'utf8');
    const names = [...py.matchAll(/_tool\(\s*"(\w+)"/g)].map((m) => m[1]);
    expect(names).toContain('training_guide');
    for (const n of names) expect(runTool(initialState(), n, '{}', { all: [], ...ctx }).result).not.toMatch(/^No tool called/);
    expect(py).toMatch(/"accessory"/);
  });
});

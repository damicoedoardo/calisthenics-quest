import { beforeAll, describe, expect, it } from 'vitest';
import { loadLibrary, type LibraryExercise } from '@/exercises/library';
import { seeded } from '@/lib/random';
import { finishSession, initialState, todaysQuest, type GameState } from '@/lib/game';
import { applySetup, levelsFrom, type SetupAnswers } from './setup';
import { buildWorkout, nextMode } from './generate';
import { minutesOf, validate } from './validate';
import { easierChoices, swapChoices, usable } from './options';
import { changeItem, moveItem, planFromQuest, skipItem } from './plan';
import { currentPlan, setPlan } from './week';
import { addNote, liveNotes } from './notes';
import { coachBrief } from './brief';
import { MAX_NOTES } from '@/balance';

let all: LibraryExercise[];
beforeAll(async () => {
  all = await loadLibrary();
});

const NOW = new Date('2026-10-28T10:00:00Z');
const ids = () => {
  let n = 0;
  return () => `n${++n}`;
};
const answers = (over: Partial<SetupAnswers> = {}): SetupAnswers => ({
  modes: ['gym'],
  goal: 'muscle',
  days: 3,
  minutes: 40,
  gear: ['gym'],
  experience: 'returning',
  pushups: 2,
  pullups: 1,
  lifts: 1,
  run: 1,
  avoid: [],
  ...over,
});
const withSetup = (a: SetupAnswers): GameState => ({ ...initialState(), coach: applySetup(undefined, a, NOW, ids()) });
const build = (s: GameState, seed = 1) => buildWorkout({ all, coach: s.coach!, sessions: s.sessions, now: NOW, rng: seeded(seed) })!;

describe('setup', () => {
  it('turns answers into levels, and "I don\'t know" starts low', () => {
    expect(levelsFrom(answers())).toMatchObject({ push: 3, pull: 2 });
    expect(levelsFrom(answers({ pushups: null, pullups: null, lifts: null, run: null, experience: 'new' }))).toEqual({ push: 1, pull: 1, squat: 1, hinge: 1, core: 1, run: 1 });
  });
  it('keeps your own words as notes', () => {
    const c = applySetup(undefined, answers({ note: 'I like short sessions', avoid: ['other'], avoidText: 'old ankle sprain' }), NOW, ids());
    expect(c.notes.map((n) => n.type)).toEqual(['other', 'pain']);
  });
});

describe('the built-in coach', () => {
  it('builds a gym workout that passes its own checks and fits the minutes', () => {
    const s = withSetup(answers());
    const plan = build(s);
    expect(plan.items[0].role).toBe('warmup');
    expect(plan.items.at(-1)!.role).toBe('stretch');
    expect(plan.items.filter((i) => i.role === 'main')).toHaveLength(3);
    expect(validate(plan, { all, profile: s.coach!.profile! }).problems).toEqual([]);
    expect(minutesOf(plan.items)).toBeLessThanOrEqual(50);
    for (const it of plan.items.filter((i) => i.role === 'main')) expect(it.easier.length + it.swaps.length).toBeGreaterThan(0);
  });

  it('uses only your gear: home with nothing means body weight only, no pull-ups without a bar', () => {
    const s = withSetup(answers({ modes: ['calisthenics'], gear: ['none'] }));
    const plan = build(s);
    for (const it of plan.items) {
      const x = all.find((e) => e.id === it.id);
      if (x) expect(usable(x, ['none'])).toBe(true);
    }
    expect(plan.items.some((i) => i.family === 'pull-vertical')).toBe(false);
  });

  it('spares a sore knee and a dislike note', () => {
    let s = withSetup(answers({ avoid: ['knee'] }));
    s = { ...s, coach: addNote(s.coach!, { type: 'dislike', text: 'hates lunges', by: 'you' }, NOW, ids()) };
    for (let seed = 1; seed < 6; seed++) expect(build(s, seed).items.some((i) => i.family === 'lunge' || /lunge/i.test(i.name))).toBe(false);
  });

  it('builds runs as steps, with walk breaks for a beginner', () => {
    const s = withSetup(answers({ modes: ['running'], run: 0 }));
    const run = build(s).items.find((i) => i.run)!;
    expect(run.run!.some((x) => x.effort === 'walk')).toBe(true);
    expect(run.low).toBe(run.run!.reduce((a, x) => a + x.sec, 0));
  });

  it('a mix takes turns: the mode done longest ago comes next', () => {
    const s = withSetup(answers({ modes: ['gym', 'running'] }));
    expect(nextMode(s.coach!.profile!, [])).toBe('gym');
    const one = { ...s, sessions: [{ ...finishSessionLike(), mode: 'gym' as const }] };
    expect(nextMode(one.coach!.profile!, one.sessions)).toBe('running');
  });
});

function finishSessionLike() {
  return { id: 'x', date: NOW.toISOString(), kind: 'full' as const, day: 'A' as const, xp: 100, breakdown: [], entries: [] };
}

describe('choices', () => {
  it('a pull-up gets easier pull-ups, not some other movement', () => {
    const pull = all.find((x) => x.demo === 'pullup')!;
    const easier = easierChoices(all, pull, ['gym']);
    expect(easier.length).toBeGreaterThan(0);
    expect(easier[0].demo).toBe('negatives');
    expect(swapChoices(all, pull, ['gym']).every((c) => c.family === pull.family)).toBe(true);
  });
});

describe('changing the workout', () => {
  it('swap, easier, move and skip are kept and logged', () => {
    let s = withSetup(answers());
    s = setPlan(s, build(s));
    const main = currentPlan(s.coach)!.items.find((i) => i.role === 'main' && i.easier.length)!;
    s = { ...s, draft: { startedAt: NOW.toISOString(), checkin: 'normal', sets: { [main.id]: [{ reps: 8, rir: '2-3' }] } } };
    const to = main.easier[0];
    s = changeItem(s, main.id, to, 'easier');
    expect(s.draft!.sets[to.id]).toHaveLength(1);
    const second = currentPlan(s.coach)!.items.filter((i) => i.role === 'main')[1];
    const firstMain = currentPlan(s.coach)!.items.findIndex((i) => i.role === 'main');
    s = moveItem(s, second.id, -1);
    expect(currentPlan(s.coach)!.items[firstMain].id).toBe(second.id);
    expect(moveItem(s, currentPlan(s.coach)!.items[firstMain].id, -1)).toBe(s); // never above the warm-up
    const last = currentPlan(s.coach)!.items.filter((i) => i.role === 'main').at(-1)!;
    s = skipItem(s, last.id, true);
    expect(todaysQuest(s).some((q) => q.id === last.id)).toBe(false);
    const done = finishSession(s, NOW, () => 'id1')!;
    expect(done.session.changed).toEqual([{ from: main.id, to: to.id, how: 'easier' }]);
    expect(done.session.skipped).toEqual([last.id]);
    expect(done.session.mode).toBe('gym');
    expect(currentPlan(done.state.coach)).toBeUndefined();
    expect(done.state.coach!.week!.days[0].done).toBe(NOW.toISOString());
  });

  it('the built-in plan can be turned into a plan with choices', () => {
    const plan = planFromQuest(initialState(), all, NOW);
    expect(plan.items[0].role).toBe('warmup');
    expect(plan.items.filter((i) => i.role === 'main').every((i) => i.swaps.length > 0)).toBe(true);
  });
});

describe('memory', () => {
  it('notes are capped, pain notes stay, and old ones fade', () => {
    let c = applySetup(undefined, answers(), NOW, ids());
    const id = ids();
    c = addNote(c, { type: 'pain', text: 'left knee', by: 'you' }, NOW, id);
    for (let i = 0; i < MAX_NOTES + 5; i++) c = addNote(c, { type: 'like', text: `like ${i}`, by: 'coach' }, NOW, id);
    expect(c.notes).toHaveLength(MAX_NOTES);
    expect(c.notes.some((n) => n.type === 'pain')).toBe(true);
    c = addNote(c, { type: 'life', text: 'busy week', by: 'you', until: '2026-10-29T00:00:00Z' }, NOW, id);
    expect(liveNotes(c, new Date('2026-11-01')).some((n) => n.text === 'busy week')).toBe(false);
  });

  it('levels move with how workouts felt', () => {
    let s = withSetup(answers());
    let t = NOW.getTime();
    for (let k = 0; k < 3; k++) {
      t += 2 * 86_400_000;
      const now = new Date(t);
      s = setPlan(s, buildWorkout({ all, coach: s.coach!, sessions: s.sessions, now, rng: seeded(k) })!);
      const sets = Object.fromEntries(todaysQuest(s).map((q) => [q.id, Array.from({ length: q.sets }, () => ({ reps: q.reps, rir: '4+' as const }))]));
      s = finishSession({ ...s, draft: { startedAt: now.toISOString(), checkin: 'normal', sets } }, now, () => `s${k}`)!.state;
    }
    expect(s.coach!.profile!.levels.push.level).toBe(4);
    expect(s.coach!.profile!.levels.push.source).toBe('log');
  });

  it('the brief says who you are and what you did, in plain text', () => {
    let s = withSetup(answers({ note: 'gym is busy after 6pm' }));
    s = setPlan(s, build(s));
    const sets = Object.fromEntries(todaysQuest(s).map((q) => [q.id, [{ reps: q.reps, rir: '2-3' as const }]]));
    s = finishSession({ ...s, draft: { startedAt: NOW.toISOString(), checkin: 'normal', sets } }, NOW, () => 'a')!.state;
    const brief = coachBrief(s, NOW);
    expect(brief).toContain('Goal: muscle');
    expect(brief).toContain('gym is busy after 6pm');
    expect(brief).toContain('Last workouts');
    expect(brief.length).toBeLessThan(8000);
  });
});

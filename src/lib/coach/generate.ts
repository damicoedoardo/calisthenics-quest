import { ACCESSORY_DOSE, ACCESSORY_MOVES, BODY_REPS, COOLDOWN, DOSE, FEW_REPS_RANGE, HOLD_SEC, MAIN_MOVES, RAMP, RUN, WARMUP_SEC } from '@/balance';
import { FEW_REPS, MOVING_STRETCH, NEEDS_LEVEL, STRETCHES, WARMUP_MOVES, isStaple } from './staples';
import type { Family } from '@/exercises/coaching';
import type { LibraryExercise } from '@/exercises/library';
import type { ExerciseId } from '@/sprites/characters/exercise';
import type { Session } from '../game';
import type { SlotRole } from '../program';
import { HOLDS, easierChoices, hasBar, spares, isWeighted, levelIndex, maxLevelFor, patternOf, plainness, swapChoices, usable } from './options';
import { liveNotes } from './notes';
import type { CoachNote, CoachPlan, CoachProfile, CoachState, Mode, PlanItem, RunStep } from './types';
import { validate } from './validate';

/* The built-in coach: builds the next workout from the library with plain rules, from your profile,
   your notes and what you did. It is what runs offline and before an LLM is set up, and the safety
   net when an LLM's plan fails the checks. Same input, same workout (`rng`). */

export interface BuildInput {
  all: LibraryExercise[];
  coach: CoachState;
  sessions: Session[];
  now: Date;
  rng: () => number;
  /** Build this mode instead of the one whose turn it is. */
  mode?: Mode;
  /** Workouts planned before this one but not done yet (earlier days of the week), by mode. */
  after?: Mode[];
  /** Families trained hard the day before: not again today (law 6). */
  rested?: Family[];
}

/** Each day's movement families, per mode: the main moves (the first few that fit the minutes,
    in the order they are done) and the accessories after them. Days A and B alternate. */
const DAYS: Record<Exclude<Mode, 'running'>, [Day, Day]> = {
  gym: [
    { main: ['squat', 'push-horizontal', 'pull-vertical', 'lunge'], accessory: ['arms', 'legs-isolation'] },
    { main: ['hinge', 'push-vertical', 'pull-horizontal', 'lunge'], accessory: ['shoulders', 'arms'] },
  ],
  calisthenics: [
    { main: ['pull-vertical', 'push-horizontal', 'squat', 'push-vertical'], accessory: ['hinge', 'lunge'] },
    { main: ['push-vertical', 'pull-horizontal', 'lunge', 'hinge'], accessory: ['push-horizontal', 'squat'] },
  ],
};

/** Every main family, to fill a day whose own are rested (trained the day before, law 6). */
const FILL: Family[] = ['squat', 'hinge', 'lunge', 'push-horizontal', 'push-vertical', 'pull-horizontal', 'pull-vertical'];

interface Day {
  main: Family[];
  accessory: Family[];
}

const UPPER: Family[] = ['push-horizontal', 'push-vertical', 'pull-horizontal', 'pull-vertical', 'arms', 'shoulders'];

/** The warm-up and stretch every workout has, also when the library isn't loaded. */
export const WARMUP: PlanItem = item('circles', 'Joint circles', 'circles', 'Start with small circles, get bigger.', 'mobility', 'warmup', 1, 90);

/** Whose turn it is: of your modes, the one you did longest ago. */
export function nextMode(profile: CoachProfile, sessions: Session[], after: Mode[] = []): Mode {
  const order = [...sessions.map((s) => s.mode ?? 'gym'), ...after];
  const last = (m: Mode) => order.lastIndexOf(m);
  return [...profile.modes].sort((a, b) => last(a) - last(b))[0] ?? 'gym';
}

export function buildWorkout(input: BuildInput): CoachPlan | null {
  const profile = input.coach.profile;
  if (!profile) return null;
  const mode = input.mode ?? nextMode(profile, input.sessions, input.after);
  const notes = liveNotes(input.coach, input.now);
  const avoid = excluded(profile, notes);
  const plan = mode === 'running' ? running(input, profile, avoid) : strength(input, profile, mode, avoid);
  return validate(plan, { all: input.all, profile, sessions: input.sessions, now: input.now }).plan;
}

export function excluded(profile: CoachProfile, notes: CoachNote[]): (x: LibraryExercise) => boolean {
  const spare = spares(profile);
  // "Hate lunges", or a rule "no burpees, ever": the words of a dislike note, or of a rule that
  // says no, keep matching exercises out.
  const words = notes
    .filter((n) => n.type === 'dislike' || (n.type === 'rule' && /^\s*(no|never|without|skip)\b/i.test(n.text)))
    .flatMap((n) => n.text.toLowerCase().match(/[a-z-]{4,}/g) ?? [])
    .filter((w) => !['hate', 'hates', 'dislike', 'dislikes', 'like', 'please', 'more', 'less', 'with', 'them', 'they', 'doing', 'never', 'ever', 'always', 'without', 'skip'].includes(w))
    .map((w) => w.replace(/s$/, ''));
  return (x) => spare.some((f) => f(x)) || words.some((w) => x.name.toLowerCase().includes(w));
}

function strength(input: BuildInput, profile: CoachProfile, mode: Exclude<Mode, 'running'>, avoid: (x: LibraryExercise) => boolean): CoachPlan {
  const { all, sessions, rng } = input;
  const done = sessions.filter((s) => (s.mode ?? 'gym') === mode).length + (input.after ?? []).filter((m) => m === mode).length;
  const day = done % 2;
  const used = new Set(sessions.slice(-12).flatMap((s) => s.entries.map((e) => e.exerciseId)));
  const gear = mode === 'calisthenics' ? profile.gear.filter((g) => g === 'bar' || g === 'bands' || g === 'none' || g === 'gym') : profile.gear;
  const bodyOnly = mode === 'calisthenics';
  const plan = DAYS[mode][day];
  // No bar: a pull-up day pulls with a table row instead.
  const noBar = (f: Family): Family => (f === 'pull-vertical' && !hasBar(gear) ? 'pull-horizontal' : f);
  const rested = new Set(input.rested ?? []);
  const fresh = (fs: Family[]) => [...new Set(fs.map(noBar))].filter((f) => !rested.has(f));
  const families = fresh([...plan.main, ...(rested.size ? FILL : [])]).slice(0, MAIN_MOVES[profile.minutes]);
  const extras = fresh(plan.accessory).filter((f) => !families.includes(f)).slice(0, ACCESSORY_MOVES[profile.minutes]);

  const picked: LibraryExercise[] = [];
  const pick = (family: Family, role: 'main' | 'accessory' | 'core') => {
    const pattern = patternOf(family) ?? 'core';
    const max = maxLevelFor(profile.levels[pattern].level);
    const ok = all.filter(
      (x) =>
        x.family === family &&
        x.kind === 'strength' &&
        usable(x, gear) &&
        (!bodyOnly || x.equipment === 'body only' || x.equipment === 'bands') &&
        levelIndex(x) <= max &&
        (NEEDS_LEVEL[x.demo] ?? 0) <= profile.levels[pattern].level &&
        !avoid(x) &&
        !picked.some((p) => p.demo === x.demo),
    );
    // Main moves: compound, a weight in the gym. Accessories: the plain isolation staples.
    const score = (x: LibraryExercise) =>
      (used.has(x.id) ? 5 : 0) +
      (isStaple(x.id) ? 8 : 0) +
      (levelIndex(x) === max && role !== 'accessory' ? 2 : 0) +
      (x.mechanic === 'compound' ? (role === 'accessory' ? -1 : 2) : 0) +
      (!bodyOnly && mode === 'gym' && isWeighted(x) ? 2 : 0) -
      plainness(x) * 0.6 +
      rng() * 1.5;
    const best = ok.map((x) => [x, score(x)] as const).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best) picked.push(best);
    return best;
  };

  const mains = families.map((f) => pick(f, 'main')).filter((x): x is LibraryExercise => !!x);
  const accessories = extras.map((f) => pick(f, 'accessory')).filter((x): x is LibraryExercise => !!x);
  const core = pick('core', 'core');
  const main = mains.map((x) => dosed(x, 'main', profile, all, gear));
  // The first heavy lift is never cold: a few light sets of it first.
  const heavy = main.findIndex((it) => it.weighted);
  if (heavy !== -1) main[heavy] = { ...main[heavy], ramp: RAMP.sets };
  const items: PlanItem[] = [
    ...warmupFor(all, profile, [...mains, ...accessories], avoid),
    ...main,
    ...accessories.map((x) => dosed(x, 'accessory', profile, all, gear)),
    ...(core ? [dosed(core, 'core', profile, all, gear)] : []),
    ...cooldownFor(all, [...mains, ...accessories], COOLDOWN.stretches[profile.minutes], avoid),
  ];
  const label = mode === 'gym' ? 'Gym' : 'Calisthenics';
  return { mode, items, by: 'built-in', at: input.now.toISOString(), title: `${label}, day ${day === 0 ? 'A' : 'B'}: ${mains.map((x) => short(x.family)).join(', ')}` };
}

/** Sets and reps for an exercise: a weight follows your goal, your body weight follows your level. */
export function dosed(x: LibraryExercise, role: SlotRole, profile: CoachProfile, all: LibraryExercise[], gear: CoachProfile['gear']): PlanItem {
  const level = profile.levels[patternOf(x.family) ?? 'core'].level;
  const hold = x.force === 'static' || HOLDS.includes(x.demo);
  const dose = DOSE[profile.goal];
  const sets = role === 'core' ? (profile.minutes <= 20 ? 2 : 3) : role === 'accessory' ? ACCESSORY_DOSE.sets : profile.minutes <= 20 ? Math.min(dose.sets, 3) : dose.sets;
  const weighted = isWeighted(x);
  const reps = FEW_REPS.includes(x.demo) ? FEW_REPS_RANGE : BODY_REPS;
  const lift = role === 'accessory' ? ACCESSORY_DOSE : dose;
  const [low, high] = hold ? [HOLD_SEC.low[level - 1], HOLD_SEC.high[level - 1]] : weighted ? [lift.low, lift.high] : [reps.low[level - 1], reps.high[level - 1]];
  return {
    ...item(x.id, x.name, x.demo, x.tips[0] ?? '', x.family, role, sets, low, high, hold ? 'sec' : 'reps'),
    ...(weighted ? { weighted: true } : {}),
    easier: easierChoices(all, x, gear),
    swaps: swapChoices(all, x, gear),
  };
}

/** The warm-up: easy cardio to get warm, circles for the joints the day uses, and one dynamic move
    for the whole body. A short workout keeps it short. Falls back to joint circles. */
export function warmupFor(all: LibraryExercise[], profile: CoachProfile, trained: LibraryExercise[], avoid: (x: LibraryExercise) => boolean): PlanItem[] {
  const ok = (id: string) => {
    const x = all.find((e) => e.id === id);
    return x && usable(x, profile.gear) && !avoid(x) ? x : undefined;
  };
  const first = (ids: readonly string[]) => ids.map(ok).find((x): x is LibraryExercise => !!x);
  const upper = trained.some((x) => UPPER.includes(x.family));
  const lower = trained.some((x) => !UPPER.includes(x.family));
  const short = profile.minutes <= 20;
  const parts: [LibraryExercise | undefined, number][] = [
    [first(WARMUP_MOVES.pulse), short ? WARMUP_SEC.shortPulse : WARMUP_SEC.pulse],
    ...(short ? [] : ([...(upper ? [[first(WARMUP_MOVES.upper), WARMUP_SEC.move]] : []), ...(lower ? [[first(WARMUP_MOVES.lower), WARMUP_SEC.move]] : [])] as [LibraryExercise | undefined, number][])),
    [first(WARMUP_MOVES.whole), WARMUP_SEC.whole],
  ];
  const out = parts.filter((p): p is [LibraryExercise, number] => !!p[0]).map(([x, sec]) => item(x.id, x.name, x.demo, x.tips[0] ?? '', x.family, 'warmup', 1, sec));
  return out.length ? out : [WARMUP];
}

/** The cool-down: a stretch for each of the muscles the workout trained most. */
export function cooldownFor(all: LibraryExercise[], trained: LibraryExercise[], count: number, avoid: (x: LibraryExercise) => boolean): PlanItem[] {
  const tally = new Map<string, number>();
  trained.forEach((x, i) => x.primary.forEach((m) => tally.set(m, (tally.get(m) ?? 0) + (trained.length - i))));
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  const stretches = all.filter((s) => s.kind === 'stretch' && s.equipment === 'body only' && !MOVING_STRETCH.test(s.name) && !avoid(s));
  const rank = (s: LibraryExercise, m: string) => {
    const k = (STRETCHES[m] ?? []).indexOf(s.id);
    return (k === -1 ? 10 : k - 10) + plainness(s) - Number(/stretch/i.test(s.name)) * 3;
  };
  const out: LibraryExercise[] = [];
  for (const m of top) {
    if (out.length >= count) break;
    const x = stretches.filter((s) => s.primary.includes(m) && !out.some((o) => o.demo === s.demo)).sort((a, b) => rank(a, m) - rank(b, m))[0];
    if (x) out.push(x);
  }
  const items = out.map((x) => item(x.id, x.name, x.demo, x.tips[0] ?? '', x.family, 'stretch', 1, COOLDOWN.sec));
  return items.length ? items : [item('toe-touch', 'Toe touch stretch', 'toe-touch', 'Soft knees, let the head hang.', 'stretch', 'stretch', 1, COOLDOWN.sec)];
}

function running(input: BuildInput, profile: CoachProfile, avoid: (x: LibraryExercise) => boolean): CoachPlan {
  const { all, sessions, now } = input;
  const runs = sessions.filter((s) => s.mode === 'running');
  const level = profile.levels.run.level;
  const i = level - 1;
  const kind = (['easy', level >= 2 ? 'interval' : 'easy', 'easy', 'long'] as const)[(runs.length + (input.after ?? []).filter((m) => m === 'running').length) % 4];
  const roomMin = Math.max(10, profile.minutes - 8);
  let steps: RunStep[];
  if (kind === 'interval') {
    steps = [{ effort: 'easy', sec: 300 }];
    for (let r = 0; r < RUN.rounds[i]; r++) steps.push({ effort: 'fast', sec: RUN.fastSec[i] }, { effort: r === RUN.rounds[i] - 1 ? 'easy' : 'walk', sec: RUN.easySec[i] });
    steps.push({ effort: 'easy', sec: 180 });
  } else {
    const min = Math.round(Math.min(RUN.easyMin[i] * (kind === 'long' ? RUN.longFactor : 1), kind === 'long' ? profile.minutes + 15 : roomMin));
    steps = level < RUN.walkBreakBelow ? runWalk(min) : [{ effort: kind === 'long' ? 'steady' : 'easy', sec: min * 60 }];
  }
  // Running grows slowly: this week's running stays within a tenth more than last week's.
  const week = (from: number, to: number) => runs.filter((s) => { const t = now.getTime() - new Date(s.date).getTime(); return t >= from && t < to; }).reduce((a, s) => a + s.entries.reduce((b, e) => b + e.sets.reduce((c, x) => c + x.reps, 0), 0), 0);
  const lastWeek = week(7 * 86_400_000, 14 * 86_400_000), thisWeek = week(0, 7 * 86_400_000);
  const total = steps.reduce((a, s) => a + s.sec, 0);
  if (lastWeek > 0 && kind !== 'interval') {
    const room = Math.max(600, lastWeek * (1 + RUN.weeklyGrowth) - thisWeek);
    if (total > room) steps = level < RUN.walkBreakBelow ? runWalk(Math.round(room / 60)) : [{ ...steps[0], sec: Math.round(room / 60) * 60 }];
  }
  const sec = steps.reduce((a, s) => a + s.sec, 0);
  const id = kind === 'interval' ? 'forma:interval-run' : kind === 'long' ? 'forma:long-run' : level < RUN.walkBreakBelow ? 'forma:run-walk' : 'forma:easy-run';
  const ex = all.find((x) => x.id === id);
  const run: PlanItem = { ...item(id, ex?.name ?? 'Run', 'run', ex?.tips[0] ?? 'Easy pace most days: you can talk while you go.', 'cardio', 'main', 1, sec, sec, 'sec'), run: steps };
  const calf = all.find((x) => x.demo === 'calf-stretch' && x.equipment === 'body only' && !avoid(x));
  const stretch = calf ? item(calf.id, calf.name, calf.demo, calf.tips[0] ?? '', 'stretch', 'stretch', 1, 60) : item('quad-stretch', 'Quad stretch', 'quad-stretch', 'Knees together, hips pushed forward.', 'stretch', 'stretch', 1, 60);
  return { mode: 'running', items: [WARMUP, run, stretch], by: 'built-in', at: now.toISOString(), title: `${ex?.name ?? 'Run'}, ${Math.round(sec / 60)} min` };
}

/** Run a few minutes, walk one, until the time is up. */
export function runWalk(min: number): RunStep[] {
  const steps: RunStep[] = [];
  let left = min * 60;
  while (left > 0) {
    const run = Math.min(RUN.walkEvery * 60, left);
    steps.push({ effort: 'easy', sec: run });
    left -= run;
    if (left > 0) {
      const walk = Math.min(60, left);
      steps.push({ effort: 'walk', sec: walk });
      left -= walk;
    }
  }
  return steps;
}

export function item(id: string, name: string, demo: ExerciseId, cue: string, family: Family, role: SlotRole, sets: number, low: number, high = low, unit: 'reps' | 'sec' = role === 'warmup' || role === 'stretch' ? 'sec' : 'reps'): PlanItem {
  return { id, name, demo, cue, family, role, unit, sets, low, high, easier: [], swaps: [] };
}

const SHORT: Partial<Record<Family, string>> = {
  'push-horizontal': 'push',
  'push-vertical': 'press',
  'pull-horizontal': 'row',
  'pull-vertical': 'pull',
  'legs-isolation': 'legs',
};
const short = (f: Family) => SHORT[f] ?? f;

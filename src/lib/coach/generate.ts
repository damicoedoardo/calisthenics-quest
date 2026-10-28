import { BODY_REPS, DOSE, FEW_REPS_RANGE, HOLD_SEC, MAIN_MOVES, RUN } from '@/balance';
import { FEW_REPS, NEEDS_LEVEL, isStaple } from './staples';
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
}

/** The movement families of each day, per mode. Days alternate; the first few fit the minutes. */
const DAYS: Record<Exclude<Mode, 'running'>, [Family[], Family[]]> = {
  gym: [
    ['squat', 'push-horizontal', 'pull-vertical', 'lunge', 'arms'],
    ['hinge', 'push-vertical', 'pull-horizontal', 'legs-isolation', 'shoulders'],
  ],
  calisthenics: [
    ['push-horizontal', 'pull-vertical', 'squat', 'push-vertical', 'lunge'],
    ['pull-vertical', 'push-horizontal', 'lunge', 'pull-horizontal', 'hinge'],
  ],
};

/** The warm-up and stretch every workout has, also when the library isn't loaded. */
export const WARMUP: PlanItem = item('circles', 'Joint circles', 'circles', 'Start with small circles, get bigger.', 'mobility', 'warmup', 1, 90);

/** Whose turn it is: of your modes, the one you did longest ago. */
export function nextMode(profile: CoachProfile, sessions: Session[]): Mode {
  const last = (m: Mode) => sessions.findLastIndex((s) => (s.mode ?? 'gym') === m);
  return [...profile.modes].sort((a, b) => last(a) - last(b))[0] ?? 'gym';
}

export function buildWorkout(input: BuildInput): CoachPlan | null {
  const profile = input.coach.profile;
  if (!profile) return null;
  const mode = input.mode ?? nextMode(profile, input.sessions);
  const notes = liveNotes(input.coach, input.now);
  const avoid = excluded(profile, notes);
  const plan = mode === 'running' ? running(input, profile, avoid) : strength(input, profile, mode, avoid);
  return validate(plan, { all: input.all, profile }).plan;
}

function excluded(profile: CoachProfile, notes: CoachNote[]): (x: LibraryExercise) => boolean {
  const spare = spares(profile);
  // "No burpees", "hate lunges": the words of a dislike note keep matching exercises out.
  const words = notes
    .filter((n) => n.type === 'dislike')
    .flatMap((n) => n.text.toLowerCase().match(/[a-z-]{4,}/g) ?? [])
    .filter((w) => !['hate', 'hates', 'dislike', 'dislikes', 'like', 'please', 'more', 'less', 'with', 'them', 'they', 'doing', 'never'].includes(w))
    .map((w) => w.replace(/s$/, ''));
  return (x) => spare.some((f) => f(x)) || words.some((w) => x.name.toLowerCase().includes(w));
}

function strength(input: BuildInput, profile: CoachProfile, mode: Exclude<Mode, 'running'>, avoid: (x: LibraryExercise) => boolean): CoachPlan {
  const { all, sessions, rng } = input;
  const done = sessions.filter((s) => (s.mode ?? 'gym') === mode).length;
  const day = done % 2;
  const used = new Set(sessions.slice(-12).flatMap((s) => s.entries.map((e) => e.exerciseId)));
  const gear = mode === 'calisthenics' ? profile.gear.filter((g) => g === 'bar' || g === 'bands' || g === 'none' || g === 'gym') : profile.gear;
  const bodyOnly = mode === 'calisthenics';
  let families = DAYS[mode][day];
  // No bar: a pull-up day pulls with a table row instead.
  if (!hasBar(gear)) families = families.map((f) => (f === 'pull-vertical' ? 'pull-horizontal' : f));
  families = [...new Set(families)];

  const picked: LibraryExercise[] = [];
  const pick = (family: Family, kinds: LibraryExercise['kind'][] = ['strength']) => {
    const pattern = patternOf(family) ?? 'core';
    const max = maxLevelFor(profile.levels[pattern].level);
    const ok = all.filter(
      (x) =>
        x.family === family &&
        kinds.includes(x.kind) &&
        usable(x, gear) &&
        (!bodyOnly || x.equipment === 'body only' || x.equipment === 'bands') &&
        levelIndex(x) <= max &&
        (NEEDS_LEVEL[x.demo] ?? 0) <= profile.levels[pattern].level &&
        !avoid(x) &&
        !picked.some((p) => p.demo === x.demo),
    );
    const score = (x: LibraryExercise) =>
      (used.has(x.id) ? 5 : 0) +
      (isStaple(x.id) ? 8 : 0) +
      (levelIndex(x) === max ? 2 : 0) +
      (x.mechanic === 'compound' ? 2 : 0) +
      (!bodyOnly && mode === 'gym' && isWeighted(x) ? 2 : 0) -
      plainness(x) * 0.6 +
      rng() * 1.5;
    const best = ok.map((x) => [x, score(x)] as const).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (best) picked.push(best);
    return best;
  };

  const mains = families.slice(0, MAIN_MOVES[profile.minutes]).map((f) => pick(f)).filter((x): x is LibraryExercise => !!x);
  const core = pick('core');
  const items: PlanItem[] = [WARMUP, ...mains.map((x) => dosed(x, 'main', profile, all, gear)), ...(core ? [dosed(core, 'core', profile, all, gear)] : []), stretchFor(all, mains, avoid)];
  const label = mode === 'gym' ? 'Gym' : 'Calisthenics';
  return { mode, items, by: 'built-in', at: input.now.toISOString(), title: `${label}, day ${day === 0 ? 'A' : 'B'}: ${mains.map((x) => short(x.family)).join(', ')}` };
}

/** Sets and reps for an exercise: a weight follows your goal, your body weight follows your level. */
function dosed(x: LibraryExercise, role: SlotRole, profile: CoachProfile, all: LibraryExercise[], gear: CoachProfile['gear']): PlanItem {
  const level = profile.levels[patternOf(x.family) ?? 'core'].level;
  const hold = x.force === 'static' || HOLDS.includes(x.demo);
  const dose = DOSE[profile.goal];
  const sets = role === 'core' ? (profile.minutes <= 20 ? 2 : 3) : profile.minutes <= 20 ? Math.min(dose.sets, 3) : dose.sets;
  const weighted = isWeighted(x);
  const reps = FEW_REPS.includes(x.demo) ? FEW_REPS_RANGE : BODY_REPS;
  const [low, high] = hold ? [HOLD_SEC.low[level - 1], HOLD_SEC.high[level - 1]] : weighted ? [dose.low, dose.high] : [reps.low[level - 1], reps.high[level - 1]];
  return {
    ...item(x.id, x.name, x.demo, x.tips[0] ?? '', x.family, role, sets, low, high, hold ? 'sec' : 'reps'),
    ...(weighted ? { weighted: true } : {}),
    easier: easierChoices(all, x, gear),
    swaps: swapChoices(all, x, gear),
  };
}

/** A stretch for what the workout trained most. */
function stretchFor(all: LibraryExercise[], trained: LibraryExercise[], avoid: (x: LibraryExercise) => boolean): PlanItem {
  const muscles = trained.flatMap((x) => x.primary);
  const top = muscles.sort((a, b) => muscles.filter((m) => m === b).length - muscles.filter((m) => m === a).length)[0];
  const x = all
    .filter((s) => s.kind === 'stretch' && s.equipment === 'body only' && !avoid(s) && (!top || s.primary.includes(top)))
    .sort((a, b) => plainness(a) - Number(/stretch/i.test(a.name)) * 3 - (plainness(b) - Number(/stretch/i.test(b.name)) * 3))[0];
  return x ? item(x.id, x.name, x.demo, x.tips[0] ?? '', x.family, 'stretch', 1, 60) : item('toe-touch', 'Toe touch stretch', 'toe-touch', 'Soft knees, let the head hang.', 'stretch', 'stretch', 1, 60);
}

function running(input: BuildInput, profile: CoachProfile, avoid: (x: LibraryExercise) => boolean): CoachPlan {
  const { all, sessions, now } = input;
  const runs = sessions.filter((s) => s.mode === 'running');
  const level = profile.levels.run.level;
  const i = level - 1;
  const kind = (['easy', level >= 2 ? 'interval' : 'easy', 'easy', 'long'] as const)[runs.length % 4];
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
function runWalk(min: number): RunStep[] {
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

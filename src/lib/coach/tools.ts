import type { Family } from '@/exercises/coaching';
import type { LibraryExercise } from '@/exercises/library';
import type { GameState } from '../game';
import type { SlotRole } from '../program';
import { buildWorkout, dosed, excluded, item, runWalk, WARMUP } from './generate';
import { addNote, liveNotes, removeNote } from './notes';
import { HOLDS, isWeighted, usable } from './options';
import { searchExercises } from './search';
import { answersOf, profileFrom } from './setup';
import { setPlan } from './plan';
import { validate } from './validate';
import { PATTERNS, type Area, type CoachPlan, type CoachProfile, type CoachState, type Experience, type Gear, type Goal, type Level, type Minutes, type Mode, type PlanItem, type RunStep } from './types';

/* The coach's tools, run here on the phone: the model asks, the app does it and says what happened
   in a line or two of text the model reads. The model's input is never trusted: every field is
   checked, and what doesn't fit is dropped and said. Only `coach` in the save ever changes. */

export interface ToolContext {
  all: LibraryExercise[];
  now: Date;
  id: () => string;
  rng: () => number;
}

export interface ToolRun {
  state: GameState;
  /** What the model reads back. */
  result: string;
  /** The tool ends the coach's turn: its answer waits for the player (suggest_replies). */
  waits?: boolean;
}

type Input = Record<string, unknown>;

const MODES: Mode[] = ['gym', 'calisthenics', 'running'];
const GOALS: Goal[] = ['health', 'strength', 'muscle', 'endurance', 'skill'];
const GEAR: Gear[] = ['gym', 'dumbbells', 'bar', 'bands', 'none'];
const EXPERIENCE: Experience[] = ['new', 'on-off', 'steady', 'returning'];
const AREAS: Area[] = ['knee', 'back', 'shoulder', 'wrist', 'other'];
const MINUTES: Minutes[] = [20, 30, 40, 60];
const ROLES: SlotRole[] = ['warmup', 'main', 'core', 'stretch'];
const NOTE_TYPES = ['like', 'dislike', 'pain', 'life', 'goal', 'other'] as const;
const RUN_IDS = ['forma:easy-run', 'forma:run-walk', 'forma:interval-run', 'forma:long-run'];

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const int = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : undefined);
const one = <T extends string | number>(v: unknown, of: readonly T[]) => (of.includes(v as T) ? (v as T) : undefined);
const many = <T extends string>(v: unknown, of: readonly T[]) => (Array.isArray(v) ? [...new Set(v.filter((x): x is T => of.includes(x as T)))] : undefined);

/** The input as an object, from the model's JSON text. */
export function parseInput(args: string): Input | null {
  try {
    const v: unknown = JSON.parse(args || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Input) : null;
  } catch {
    return null;
  }
}

const withCoach = (state: GameState, coach: CoachState): GameState => ({ ...state, coach });
const coachOf = (state: GameState): CoachState => state.coach ?? { notes: [] };

/** The exercises this player may do: their gear, no sore spot, no disliked words. */
function pool(state: GameState, all: LibraryExercise[], now: Date): LibraryExercise[] {
  const p = state.coach?.profile;
  if (!p) return all;
  const out = excluded(p, liveNotes(state.coach, now));
  return all.filter((x) => (usable(x, p.gear) || x.demo === 'run') && !out(x));
}

const line = (x: LibraryExercise) => `${x.id} | ${x.name} | ${x.family} | ${x.level} | ${x.equipment}`;

/** A workout as the model reads it: one line per item. */
export function planText(plan: CoachPlan): string {
  const rows = plan.items.map((it) => {
    const dose = it.run ? `${Math.round(it.low / 60)} min run (${it.run.map((s) => `${s.effort} ${Math.round(s.sec / 60) || 1}m`).join(', ')})` : it.role === 'warmup' || it.role === 'stretch' ? `${it.low}${it.unit === 'sec' ? 's' : ''}` : `${it.sets}x${it.low}-${it.high}${it.unit === 'sec' ? 's' : ''}`;
    return `- ${it.id} | ${it.name} | ${it.role} | ${dose}`;
  });
  return [`${plan.mode}: ${plan.title}`, ...rows].join('\n');
}

/** A run of so many minutes, by kind. */
function runSteps(id: string, min: number, level: Level): RunStep[] {
  if (id === 'forma:run-walk') return runWalk(min);
  if (id === 'forma:long-run') return [{ effort: 'steady', sec: min * 60 }];
  if (id === 'forma:interval-run') {
    const steps: RunStep[] = [{ effort: 'easy', sec: 300 }];
    const fast = level >= 4 ? 90 : 60;
    for (let left = (min - 8) * 60; left >= fast + 60; left -= fast + 120) steps.push({ effort: 'fast', sec: fast }, { effort: 'easy', sec: 120 });
    steps.push({ effort: 'easy', sec: 180 });
    return steps;
  }
  return [{ effort: 'easy', sec: min * 60 }];
}

function setWorkout(state: GameState, input: Input, ctx: ToolContext): ToolRun {
  const profile = state.coach?.profile;
  if (!profile) return { state, result: 'No profile yet: call save_profile first.' };
  const byId = new Map(ctx.all.map((x) => [x.id, x]));
  const mode = one(input.mode, MODES) ?? 'gym';
  const skipped: string[] = [];
  const rows = Array.isArray(input.items) ? input.items.slice(0, 14) : [];
  const items: PlanItem[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Input;
    const id = str(r.id, 120);
    const role = one(r.role, ROLES) ?? 'main';
    if (id === 'circles') {
      items.push(WARMUP);
      continue;
    }
    const x = byId.get(id);
    if (!x) {
      skipped.push(`${id || '(no id)'}: not in the library, use find_exercises`);
      continue;
    }
    if (RUN_IDS.includes(x.id)) {
      const min = int(r.minutes, 5, 120) ?? 20;
      const run = runSteps(x.id, min, profile.levels.run.level);
      const sec = run.reduce((a, s) => a + s.sec, 0);
      items.push({ ...item(x.id, x.name, 'run', x.tips[0] ?? '', 'cardio', 'main', 1, sec, sec, 'sec'), run });
      continue;
    }
    if (role === 'warmup' || role === 'stretch') {
      const sec = int(r.low, 20, 300) ?? 60;
      items.push(item(x.id, x.name, x.demo, x.tips[0] ?? '', x.family, role, 1, sec));
      continue;
    }
    // The dose the coach asked for, on top of the app's own (the easier and swap choices, the unit).
    const base = dosed(x, role, profile, ctx.all, profile.gear);
    const hold = base.unit === 'sec' || HOLDS.includes(x.demo);
    const low = int(r.low, 1, hold ? 300 : 50) ?? base.low;
    items.push({ ...base, sets: int(r.sets, 1, 8) ?? base.sets, low, high: Math.max(low, int(r.high, 1, hold ? 300 : 50) ?? base.high), ...(isWeighted(x) ? { weighted: true } : {}) });
  }
  const title = str(input.title, 80) || 'Today, from your coach';
  const checked = validate({ mode, items, by: 'coach', at: ctx.now.toISOString(), title }, { all: ctx.all, profile });
  const problems = [...skipped, ...checked.problems];
  const next = setPlan(state, checked.plan);
  return {
    state: next,
    result: `Saved and shown to the player as cards (easier and swap added to each):\n${planText(checked.plan)}${problems.length ? `\nFixed: ${problems.join('; ')}.` : ''}`,
  };
}

function saveProfile(state: GameState, input: Input, ctx: ToolContext): ToolRun {
  const coach = coachOf(state);
  const at = ctx.now.toISOString();
  const why = str(input.why) || 'from the chat';
  const old = coach.profile;
  const base: CoachProfile = old ?? profileFrom(answersOf(undefined), ctx.now);
  const p: CoachProfile = { ...base, levels: { ...base.levels }, history: [...base.history] };
  const said: string[] = [];
  const set = <K extends 'modes' | 'goal' | 'days' | 'minutes' | 'gear' | 'experience'>(k: K, v: CoachProfile[K] | undefined) => {
    if (v === undefined || (Array.isArray(v) && !v.length)) return;
    if (old && JSON.stringify(old[k]) !== JSON.stringify(v)) p.history.push({ field: k, from: old[k], to: v, why, at });
    p[k] = v;
    said.push(k);
  };
  set('modes', many(input.modes, MODES));
  set('goal', one(input.goal, GOALS));
  set('days', int(input.days, 2, 6));
  set('minutes', one(input.minutes, MINUTES));
  set('gear', many(input.gear, GEAR));
  set('experience', one(input.experience, EXPERIENCE));
  if (input.levels && typeof input.levels === 'object') {
    for (const k of PATTERNS) {
      const l = int((input.levels as Input)[k], 1, 5) as Level | undefined;
      if (!l) continue;
      if (old && old.levels[k].level !== l) p.history.push({ field: `levels.${k}`, from: old.levels[k].level, to: l, why, at });
      p.levels[k] = { level: l, source: old?.levels[k].source === 'log' && old.levels[k].level === l ? 'log' : 'setup', at };
      said.push(`${k} level`);
    }
  }
  const spare = many(input.spare, AREAS);
  if (spare) {
    p.avoid = spare.map((area) => p.avoid.find((a) => a.area === area) ?? { area, since: at });
    said.push('spare');
  }
  if (!old) p.setupAt = at;
  if (!said.length && old) return { state, result: 'Nothing to change.' };
  // A new profile: the workout comes from the coach next (set_workout), so none is built yet.
  return { state: withCoach(state, { ...coach, profile: p, ...(old ? {} : { plan: null }) }), result: `Saved: ${said.join(', ') || 'a new profile with defaults'}.` };
}

/** Run one tool call. Unknown tools and bad input come back as a line the model can act on. */
export function runTool(state: GameState, name: string, args: string, ctx: ToolContext): ToolRun {
  const input = parseInput(args);
  if (!input) return { state, result: 'The input was not valid JSON. Try again.' };
  switch (name) {
    case 'find_exercises': {
      const found = searchExercises(pool(state, ctx.all, ctx.now), str(input.query, 80), { family: input.family as Family | undefined, limit: 10 });
      return { state, result: found.length ? found.map(line).join('\n') : 'Nothing found. Try other words, or no family.' };
    }
    case 'draft_workout': {
      const coach = state.coach;
      if (!coach?.profile) return { state, result: 'No profile yet: call save_profile first.' };
      const plan = buildWorkout({ all: ctx.all, coach, sessions: state.sessions, now: ctx.now, rng: ctx.rng, mode: one(input.mode, MODES) });
      return { state, result: plan ? `${planText(plan)}\n(Not saved: call set_workout to make it the workout, as is or changed.)` : 'Could not build one.' };
    }
    case 'set_workout':
      return setWorkout(state, input, ctx);
    case 'save_profile':
      return saveProfile(state, input, ctx);
    case 'add_note': {
      const text = str(input.text);
      if (!text) return { state, result: 'An empty note: nothing saved.' };
      const days = int(input.days, 1, 365);
      const until = days ? new Date(ctx.now.getTime() + days * 86_400_000).toISOString() : undefined;
      const coach = addNote(coachOf(state), { type: one(input.type, NOTE_TYPES) ?? 'other', text, by: 'coach', ...(until ? { until } : {}) }, ctx.now, ctx.id);
      return { state: withCoach(state, coach), result: 'Noted.' };
    }
    case 'remove_note': {
      const id = str(input.id, 60);
      const coach = coachOf(state);
      if (!coach.notes.some((n) => n.id === id)) return { state, result: `No note ${id}.` };
      return { state: withCoach(state, removeNote(coach, id)), result: 'Forgotten.' };
    }
    case 'suggest_replies': {
      const replies = (Array.isArray(input.replies) ? input.replies : []).map((r) => str(r, 60)).filter(Boolean).slice(0, 4);
      return { state: withCoach(state, { ...coachOf(state), replies }), result: 'Shown.', waits: true };
    }
    default:
      return { state, result: `No tool called ${name}.` };
  }
}

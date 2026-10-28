import type { Family } from '@/exercises/coaching';
import type { LibraryExercise } from '@/exercises/library';
import type { GameState } from '../game';
import type { SlotRole } from '../program';
import { dosed, excluded, item, runWalk, WARMUP } from './generate';
import { buildWeek, currentPlan, daysLeft, moveDay, restDay, setDay, weekdayOf, weekOver, weekText } from './week';
import { dayKey, daysApart } from '../days';
import { REST } from '@/balance';
import { addNote, liveNotes, removeNote } from './notes';
import { HOLDS, isWeighted, patternOf, usable } from './options';
import { searchExercises } from './search';
import { answersOf, profileFrom } from './setup';
import { validate } from './validate';
import { PATTERNS, type Area, type CoachDay, type CoachPlan, type CoachProfile, type CoachState, type CoachWeek, type Experience, type Gear, type Goal, type Level, type Minutes, type Mode, type PlanItem, type RunStep } from './types';

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

/** A workout from the model's items: real library exercises only, dosed and checked. */
function workoutFrom(input: Input, profile: CoachProfile, ctx: ToolContext): { plan: CoachPlan; problems: string[] } {
  const byId = new Map(ctx.all.map((x) => [x.id, x]));
  const mode = one(input.mode, MODES) ?? profile.modes[0] ?? 'gym';
  const skipped: string[] = [];
  const rows = Array.isArray(input.items) ? input.items.slice(0, 14) : [];
  const items: PlanItem[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Input;
    const id = str(r.id, 120);
    const role = one(r.role, ROLES) ?? 'main';
    const rest = int(r.rest, REST.min, REST.max);
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
    items.push({ ...base, sets: int(r.sets, 1, 8) ?? base.sets, low, high: Math.max(low, int(r.high, 1, hold ? 300 : 50) ?? base.high), ...(isWeighted(x) ? { weighted: true } : {}), ...(rest ? { rest } : {}) });
  }
  const title = str(input.title, 80) || 'From your coach';
  const checked = validate({ mode, items, by: 'coach', at: ctx.now.toISOString(), title }, { all: ctx.all, profile });
  return { plan: checked.plan, problems: [...skipped, ...checked.problems] };
}

const NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** A day the model named ("tue", "Tuesday", "today", "2026-10-30") as a date from today to Sunday. */
export function resolveDay(v: unknown, now: Date): string | undefined {
  const t = str(v, 20).toLowerCase();
  if (!t) return undefined;
  for (let d = 0; d < daysLeft(now); d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, 12);
    const key = dayKey(date);
    if (t === key || (d === 0 && t === 'today') || (d === 1 && t === 'tomorrow') || t.slice(0, 3) === NAMES[date.getDay()]) return key;
  }
  return undefined;
}

const fixed = (problems: string[]) => (problems.length ? `\nFixed: ${problems.join('; ')}.` : '');

function setWorkout(state: GameState, input: Input, ctx: ToolContext): ToolRun {
  const profile = state.coach?.profile;
  if (!profile) return { state, result: 'No profile yet: call save_profile first.' };
  const date = resolveDay(input.day, ctx.now);
  if (date && state.coach?.week?.days.some((d) => d.date === date && d.done)) return { state, result: `${date}'s workout is done already: nothing changed.` };
  const { plan, problems } = workoutFrom(input, profile, ctx);
  const next = setDay(state, date, plan, ctx.now);
  return { state: next, result: `Saved on ${date ?? 'the next workout day'} and shown to the player (easier and swap added):\n${planText(plan)}${fixed(problems)}${headsUp(next)}` };
}

/** The rest of this week, from today to Sunday. Workouts already done this week stay. */
function setWeek(state: GameState, input: Input, ctx: ToolContext): ToolRun {
  const coach = state.coach;
  const profile = coach?.profile;
  if (!coach || !profile) return { state, result: 'No profile yet: call save_profile first.' };
  const rows = Array.isArray(input.days) ? input.days.slice(0, 7) : [];
  // The same calendar week: what's done stays, and so does the day it was first planned.
  const same = coach.week && !weekOver(coach.week, ctx.now) ? coach.week : null;
  const done = (same?.days ?? []).filter((d) => d.done);
  const days: CoachDay[] = [...done];
  const notes: string[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') continue;
    const date = resolveDay((raw as Input).day, ctx.now);
    if (!date) {
      notes.push(`a day "${str((raw as Input).day, 20)}" is not between today and Sunday: left out`);
      continue;
    }
    if (days.some((d) => d.date === date)) {
      notes.push(`${date} twice or already done: left out`);
      continue;
    }
    const { plan, problems } = workoutFrom(raw as Input, profile, ctx);
    days.push({ date, plan });
    notes.push(...problems.map((p) => `${date}: ${p}`));
  }
  if (days.length === done.length) return { state, result: `No workout days in it: nothing changed.${fixed(notes)}` };
  days.sort((a, b) => a.date.localeCompare(b.date));
  const week: CoachWeek = { start: same?.start ?? dayKey(ctx.now), days, by: 'coach' };
  const next = { ...state, coach: { ...coach, week } };
  return { state: next, result: `The week is saved and shown to the player:\n${weekText(week, ctx.now).join('\n')}${fixed(notes)}${headsUp(next)}` };
}

/** What a trainer would flag in the week as it now stands: the same muscles on days in a row
    (counting the last workout done), and three or more workout days in a row. Facts for the
    coach to raise, never a block. */
export function weekWarnings(state: GameState): string[] {
  const week = state.coach?.week;
  if (!week) return [];
  const out: string[] = [];
  const main = (plan: CoachPlan) => new Set(plan.items.filter((i) => i.role === 'main' && !i.skipped).map((i) => patternOf(i.family)).filter(Boolean));
  const days = week.days;
  for (let i = 1; i < days.length; i++) {
    const a = days[i - 1],
      b = days[i];
    if (daysApart(new Date(`${a.date}T12:00:00`), new Date(`${b.date}T12:00:00`)) !== 1) continue;
    const shared = [...main(a.plan)].filter((p) => main(b.plan).has(p));
    if (shared.length) out.push(`${weekdayOf(a.date)} and ${weekdayOf(b.date)} are back to back and both train ${shared.join(', ')}`);
    const c = days[i + 1];
    if (c && daysApart(new Date(`${b.date}T12:00:00`), new Date(`${c.date}T12:00:00`)) === 1) out.push(`${weekdayOf(a.date)}, ${weekdayOf(b.date)} and ${weekdayOf(c.date)}: three workout days in a row`);
  }
  return out;
}

const headsUp = (state: GameState) => {
  const w = weekWarnings(state);
  return w.length ? `\nHeads-up (tell the player, and agree on it): ${w.join('; ')}.` : '';
};

function moveWorkout(state: GameState, input: Input, ctx: ToolContext): ToolRun {
  const from = resolveDay(input.from, ctx.now) ?? str(input.from, 20);
  const to = resolveDay(input.to, ctx.now);
  if (!to) return { state, result: `"${str(input.to, 20)}" is not between today and Sunday: nothing changed.` };
  const next = moveDay(state, from, to, ctx.now);
  if (typeof next === 'string') return { state, result: `${next} Nothing changed.` };
  return { state: next, result: `Moved. The week now:\n${weekText(next.coach?.week, ctx.now).join('\n')}${headsUp(next)}` };
}

function makeRestDay(state: GameState, input: Input, ctx: ToolContext): ToolRun {
  const date = resolveDay(input.day, ctx.now) ?? str(input.day, 20);
  const next = restDay(state, date);
  if (typeof next === 'string') return { state, result: `${next} Nothing changed.` };
  const left = next.coach?.week?.days.length ?? 0;
  const want = next.coach?.profile?.days ?? 0;
  return { state: next, result: `${date} is a rest day now. The week:\n${weekText(next.coach?.week, ctx.now).join('\n')}${left < want ? `\n${left} workouts this week, fewer than their ${want}.` : ''}` };
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
  return { state: withCoach(state, { ...coach, profile: p, ...(old ? {} : { week: null }) }), result: `Saved: ${said.join(', ') || 'a new profile with defaults'}.` };
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
    case 'draft_week': {
      const coach = state.coach;
      if (!coach?.profile) return { state, result: 'No profile yet: call save_profile first.' };
      const week = buildWeek({ all: ctx.all, coach, sessions: state.sessions, now: ctx.now, rng: ctx.rng });
      return { state, result: week ? `${week.days.map((d) => `${weekdayOf(d.date)} ${d.date}\n${planText(d.plan)}`).join('\n')}\n(Not saved: call set_week to make it the week, as is or changed.)` : 'Could not build one.' };
    }
    case 'show_week':
      return { state, result: weekText(state.coach?.week, ctx.now).join('\n') + (currentPlan(state.coach) ? `\nNext workout in full:\n${planText(currentPlan(state.coach)!)}` : '') };
    case 'set_week':
      return setWeek(state, input, ctx);
    case 'set_workout':
      return setWorkout(state, input, ctx);
    case 'move_workout':
      return moveWorkout(state, input, ctx);
    case 'rest_day':
      return makeRestDay(state, input, ctx);
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

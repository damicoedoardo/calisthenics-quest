import type { ExerciseId } from '@/sprites/characters/exercise';
import type { Family } from '@/exercises/coaching';
import type { SlotRole } from '../program';

/* The coach's memory, in three layers (docs/handbook/game/coach.md):
   1. the profile: fixed fields with fixed choices, set at setup; a change is written in `history`;
   2. the training log: the sessions in the save, written only by the app;
   3. notes: short typed sentences, the flexible part ("hates burpees", "left knee sore").
   Plus the next workout the coach built, which today's quest plays. All of it lives in the save. */

export type Mode = 'gym' | 'calisthenics' | 'running';
export type Goal = 'strength' | 'muscle' | 'endurance' | 'health' | 'skill';
export type Minutes = 20 | 30 | 40 | 60;
export type Gear = 'gym' | 'dumbbells' | 'bar' | 'bands' | 'none';
export type Experience = 'new' | 'on-off' | 'steady' | 'returning';
/** The movement patterns a level is kept for. */
export type Pattern = 'push' | 'pull' | 'squat' | 'hinge' | 'core' | 'run';
export type Level = 1 | 2 | 3 | 4 | 5;
export type Area = 'knee' | 'back' | 'shoulder' | 'wrist' | 'other';

export const PATTERNS: Pattern[] = ['push', 'pull', 'squat', 'hinge', 'core', 'run'];

export interface PatternLevel {
  level: Level;
  /** Where it came from: the setup answers, or your own workouts. */
  source: 'setup' | 'log';
  at: string;
}

export interface CoachProfile {
  /** One mode, or several for a mix. */
  modes: Mode[];
  goal: Goal;
  /** Workouts a week, 2..6. */
  days: number;
  minutes: Minutes;
  gear: Gear[];
  experience: Experience;
  levels: Record<Pattern, PatternLevel>;
  /** What hurts or must be spared. */
  avoid: { area: Area; text?: string; since: string }[];
  /** Every change after setup, newest last, so any of it can be undone. */
  history: { field: keyof CoachProfile | `levels.${Pattern}`; from: unknown; to: unknown; why: string; at: string }[];
  setupAt: string;
}

export type NoteType = 'like' | 'dislike' | 'pain' | 'life' | 'goal' | 'other';

export interface CoachNote {
  id: string;
  type: NoteType;
  /** One short sentence. */
  text: string;
  at: string;
  /** A note that only holds for a while (a sore knee). Missing: until removed. */
  until?: string;
  by: 'you' | 'coach';
}

/** A piece of a run: so long at an effort. */
export interface RunStep {
  effort: 'walk' | 'easy' | 'steady' | 'fast';
  sec: number;
}

/** Another exercise that can take an item's place. */
export interface Choice {
  id: string;
  name: string;
  demo: ExerciseId;
  cue: string;
  family: Family;
  equipment: string;
  weighted?: boolean;
}

/** One exercise of a built workout: what it is, its dose, and its ways out. */
export interface PlanItem {
  /** Library id (`Barbell_Squat`, `forma:easy-run`), or a built-in plan id. */
  id: string;
  name: string;
  demo: ExerciseId;
  cue: string;
  family: Family;
  role: SlotRole;
  unit: 'reps' | 'sec';
  sets: number;
  low: number;
  high: number;
  weighted?: boolean;
  /** Rest after each set, seconds (the coach's call; missing: the default, `restFor`). */
  rest?: number;
  /** Light ramp-up sets before the first work set, not logged (a first heavy lift). */
  ramp?: number;
  /** A run: its steps, in order. The item's `low` is their total seconds. */
  run?: RunStep[];
  /** Easier moves of the same kind, easiest last. */
  easier: Choice[];
  /** Others that train the same thing. */
  swaps: Choice[];
  /** You changed it: what it was, and how. */
  changed?: { from: string; fromName: string; how: 'easier' | 'swap' };
  skipped?: boolean;
}

/** One workout: built by the coach (or the built-in generator), kept on its day of the week. */
export interface CoachPlan {
  mode: Mode;
  items: PlanItem[];
  by: 'built-in' | 'coach';
  at: string;
  /** One line on what today is about. */
  title: string;
}

/** A tool call the model made: its name and its input as JSON text (OpenAI style). */
export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

/** One message of the chat with the coach, as the LLM reads it (OpenAI style). */
export type ChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

/** One day of the week's plan: its date and its workout; `done` once you trained it. */
export interface CoachDay {
  /** Local date, YYYY-MM-DD. */
  date: string;
  plan: CoachPlan;
  /** When it was done (the session's date). */
  done?: string;
}

/** The week the coach planned: the workout days of a calendar week, Monday to Sunday. The one
    place a workout lives: the next workout is the first day not done yet (`currentPlan`). */
export interface CoachWeek {
  /** The day it was planned (local date): the week is that date's Monday to Sunday, and days
      before `start` aren't part of the plan. */
  start: string;
  days: CoachDay[];
  by: 'built-in' | 'coach';
}

export interface CoachState {
  profile?: CoachProfile;
  notes: CoachNote[];
  /** The planned week: every workout lives here, today's is its first day not done. */
  week?: CoachWeek | null;
  /** The chat with the coach, the recent part only (`trimChat`). */
  chat?: ChatMessage[];
  /** Replies the coach offered to tap, for its last message. */
  replies?: string[];
  /** The last thing the flame brought up on its own (a nudge id, nudge.ts), so it is said once. */
  heard?: string;
}

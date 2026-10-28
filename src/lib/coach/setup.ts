import type { Area, CoachProfile, CoachState, Experience, Gear, Goal, Level, Minutes, Mode, Pattern, PatternLevel } from './types';
import { addNote } from './notes';

/* Setup: the few questions that tell the coach where you start. Every answer is a tap, with "I
   don't know" where it is a guess; "I don't know" starts low, and your own workouts move the level
   after a few weeks (levels.ts). */

export interface SetupAnswers {
  modes: Mode[];
  goal: Goal;
  days: number;
  minutes: Minutes;
  gear: Gear[];
  experience: Experience;
  /** Push-ups in a row: an index into PUSHUP_BANDS, or null for "I don't know". */
  pushups: number | null;
  pullups: number | null;
  /** Squat, bench, deadlift: never / with help / I know my weights. */
  lifts: number | null;
  /** How long you can run: an index into RUN_BANDS. */
  run: number | null;
  avoid: Area[];
  avoidText?: string;
  /** Anything else, in your words: kept as a note for the coach. */
  note?: string;
}

export const PUSHUP_BANDS = ['0', '1-5', '6-15', '16-30', '30+'] as const;
export const PULLUP_BANDS = ['0', '1-3', '4-8', '9-15', '15+'] as const;
export const LIFT_BANDS = ['Never done them', 'With some help', 'Yes, I know my weights'] as const;
export const RUN_BANDS = ['Under 10 min', 'About 20 min', '30 min, easy', '5 km under 30 min', '5 km under 25 min'] as const;

const clamp = (n: number): Level => Math.max(1, Math.min(5, Math.round(n))) as Level;

/** A guess from how long you have trained, for what you didn't say. */
const BY_EXPERIENCE: Record<Experience, Level> = { new: 1, 'on-off': 2, returning: 2, steady: 3 };

export function levelsFrom(a: SetupAnswers): Record<Pattern, Level> {
  const base = BY_EXPERIENCE[a.experience];
  const push = a.pushups === null ? base : clamp(a.pushups + 1);
  const pull = a.pullups === null ? base : clamp(a.pullups + 1);
  // The lifts answer only goes up to 3: past that, the log says.
  const legs = a.lifts === null ? base : clamp(Math.max(a.lifts + 1, a.experience === 'steady' ? 3 : 1));
  return {
    push,
    pull,
    squat: legs,
    hinge: legs,
    core: clamp((push + pull) / 2),
    run: a.run === null ? clamp(base - 1) : clamp(a.run + 1),
  };
}

/** The profile the answers make, ready for the coach. Keeps an old profile's history. */
export function profileFrom(a: SetupAnswers, now: Date, old?: CoachProfile): CoachProfile {
  const at = now.toISOString();
  const levels = Object.fromEntries(Object.entries(levelsFrom(a)).map(([k, level]) => [k, { level, source: 'setup', at } satisfies PatternLevel])) as Record<Pattern, PatternLevel>;
  return {
    modes: a.modes.length ? a.modes : ['gym'],
    goal: a.goal,
    days: Math.max(2, Math.min(6, a.days)),
    minutes: a.minutes,
    gear: a.gear.length ? a.gear : ['none'],
    experience: a.experience,
    levels,
    avoid: [...a.avoid.map((area) => ({ area, since: at, ...(area === 'other' && a.avoidText ? { text: a.avoidText } : {}) }))],
    history: old?.history ?? [],
    setupAt: at,
  };
}

/** Setup done: the profile, your own words as a note, and a fresh workout to come. */
export function applySetup(coach: CoachState | undefined, a: SetupAnswers, now: Date, id: () => string): CoachState {
  let next: CoachState = { notes: coach?.notes ?? [], ...coach, profile: profileFrom(a, now, coach?.profile), week: null };
  const said = a.note?.trim();
  if (said) next = addNote(next, { type: 'other', text: said, by: 'you' }, now, id);
  if (a.avoidText?.trim() && a.avoid.length) next = addNote(next, { type: 'pain', text: a.avoidText.trim(), by: 'you' }, now, id);
  return next;
}

/** The answers an existing profile would give, to start "Redo setup" from where you are. */
export function answersOf(p: CoachProfile | undefined): SetupAnswers {
  if (!p) return { modes: [], goal: 'health', days: 3, minutes: 40, gear: [], experience: 'on-off', pushups: null, pullups: null, lifts: null, run: null, avoid: [] };
  const idx = (pattern: Pattern, max: number) => Math.min(max, p.levels[pattern].level - 1);
  return {
    modes: p.modes,
    goal: p.goal,
    days: p.days,
    minutes: p.minutes,
    gear: p.gear,
    experience: p.experience,
    pushups: idx('push', 4),
    pullups: idx('pull', 4),
    lifts: idx('squat', 2),
    run: idx('run', 4),
    avoid: p.avoid.map((x) => x.area),
    avoidText: p.avoid.find((x) => x.text)?.text,
  };
}

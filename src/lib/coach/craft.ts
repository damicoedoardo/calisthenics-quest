import { ACCESSORY_DOSE, ACCESSORY_MOVES, BODY_REPS, COOLDOWN, DOSE, FEW_REPS_RANGE, HOLD_SEC, MAIN_MOVES, RAMP, REST, RUN, TIME_SLACK, WARMUP_SEC } from '@/balance';
import type { SlotRole } from '../program';
import { LADDER } from './options';

/* The craft of a workout: how a good session is built, as a trainer would build it. These are
   defaults, not laws (laws.ts): the player and the coach may change any of them. Two parts:
   - The blocks, in order (`BLOCKS`): warm-up, main, accessory, core, cool-down. The built-in coach
     builds every workout this way; `validate` notes a workout that doesn't, never forces it.
   - The playbook (`PLAYBOOK`): the trainer's know-how as short topics (the session, the warm-up,
     the main lifts, accessories, core, the cool-down, sets and reps, progression, the week, body
     weight ladders, coming back after a break, time, running). The LLM coach reads it through the
     `training_guide` tool before it plans, so its workouts follow the same rules. Numbers come
     from src/balance, so the playbook and the built-in coach never disagree. */

/** The blocks of a workout, in the order they are done. */
export const BLOCKS: SlotRole[] = ['warmup', 'main', 'accessory', 'core', 'stretch'];

/** The items in block order; within a block, as they were. */
export function inOrder<T extends { role: SlotRole }>(items: T[]): T[] {
  return items.map((it, i) => ({ it, i })).sort((a, b) => BLOCKS.indexOf(a.it.role) - BLOCKS.indexOf(b.it.role) || a.i - b.i).map((r) => r.it);
}

export interface Craft {
  id: string;
  title: string;
  /** Words a question about it might use (lower case; a word's start is enough). */
  words: string[];
  text: () => string;
}

const range = (r: { low: readonly number[]; high: readonly number[] }) => r.low.map((l, i) => `L${i + 1} ${l}-${r.high[i]}`).join(', ');
const min = (s: number) => Math.round(s / 60);
const ladderText = () =>
  (['strict-pullup', 'archer-pushup', 'dips', 'lsit'] as const)
    .map((top) => `${top} ← ${(LADDER[top] ?? []).join(' ← ')}`)
    .join('; ');

export const PLAYBOOK: Craft[] = [
  {
    id: 'session',
    title: 'How a session is built',
    words: ['session', 'structure', 'build', 'order', 'workout', 'plan', 'block', 'template'],
    text: () =>
      [
        'By default a strength workout has five blocks, in this order (roles in set_workout). Only the warm-up is a law; the player may want the rest otherwise:',
        `1. warmup: about ${min(WARMUP_SEC.pulse + 3 * WARMUP_SEC.move)} min. Easy cardio to get warm, then joint circles and dynamic moves for what the day trains.`,
        '2. main: the big compound moves (squat, hinge, push, pull) or the hard skill, freshest first: the heaviest or most technical move opens the work.',
        '3. accessory: lighter moves that round the day out (arms, shoulders, a leg isolation, a lunge), higher reps.',
        '4. core: one move, after the main work (a tired core before heavy squats or deadlifts is a bad idea).',
        '5. stretch (the cool-down): static stretches for what was trained most, easy breathing.',
        `By minutes: main moves ${JSON.stringify(MAIN_MOVES)}, accessories ${JSON.stringify(ACCESSORY_MOVES)}, stretches ${JSON.stringify(COOLDOWN.stretches)}.`,
        'Balance each day: a push with a pull, knees (squat, lunge) with hips (hinge, bridge). Two moves of the same family in one day only when it is the focus.',
      ].join('\n'),
  },
  {
    id: 'warmup',
    title: 'The warm-up',
    words: ['warm', 'warmup', 'warm-up', 'mobility', 'ramp', 'activation', 'pulse', 'cardio'],
    text: () =>
      [
        `- Pulse raiser, about ${min(WARMUP_SEC.pulse)} min: rower, bike, jumping jacks or skipping, easy (you can talk).`,
        `- Dynamic moves, ${WARMUP_SEC.move}-${WARMUP_SEC.whole} s each: arm or shoulder circles on an upper day, hip and knee circles on a lower day, a whole-body one (world's greatest stretch, inchworm, cat-cow).`,
        `- Ramp-up sets: before the first weighted lift, ${RAMP.sets} light sets of it (empty bar or half the weight, few reps). Set "ramp" on that item; they are not logged.`,
        '- No long static stretches before lifting: save them for the cool-down.',
        '- In set_workout: find warm-up moves with find_exercises (family mobility or cardio; "arm circles", "hip circles", "rowing"), role warmup, low = seconds.',
      ].join('\n'),
  },
  {
    id: 'main',
    title: 'The main work',
    words: ['main', 'compound', 'lift', 'heavy', 'big', 'strength', 'squat', 'deadlift', 'bench', 'press', 'pull'],
    text: () =>
      [
        '- Compound moves first, the heaviest or most technical first. One per pattern the day trains.',
        `- Reps by goal (weights): ${Object.entries(DOSE)
          .map(([g, d]) => `${g} ${d.sets}x${d.low}-${d.high}`)
          .join(', ')}.`,
        `- Rest: ${REST.heavy} s or more after a heavy set (up to 3 min for the heaviest), ${REST.main} s for body weight moves.`,
        '- Never to failure: every set ends with 1-3 reps still in the tank. Form before load.',
      ].join('\n'),
  },
  {
    id: 'accessory',
    title: 'Accessories',
    words: ['accessory', 'accessories', 'isolation', 'arms', 'biceps', 'triceps', 'curl', 'raise', 'calf', 'extra'],
    text: () =>
      [
        `- After the main work: ${ACCESSORY_DOSE.sets}x${ACCESSORY_DOSE.low}-${ACCESSORY_DOSE.high}, ${REST.accessory} s rest, controlled, no grinding.`,
        '- Pick what the main moves left out: arms after presses and rows, rear shoulders (face pull, reverse fly) on push days, calves or leg curls on leg days, a lunge on a hinge day.',
        '- Role accessory in set_workout. Drop them first when time is short.',
      ].join('\n'),
  },
  {
    id: 'core',
    title: 'Core',
    words: ['core', 'abs', 'plank', 'hollow', 'crunch', 'stability'],
    text: () =>
      [
        `- One core move near the end, 2-3 sets, ${REST.core} s rest. Holds in seconds: ${range(HOLD_SEC)} by level.`,
        '- Mix the kinds over the week: anti-extension (plank, dead bug, ab wheel), anti-rotation or side (side plank), flexion (leg raise, crunch).',
      ].join('\n'),
  },
  {
    id: 'cooldown',
    title: 'The cool-down',
    words: ['cool', 'cooldown', 'cool-down', 'stretch', 'stretching', 'flexibility', 'recovery'],
    text: () =>
      [
        `- ${COOLDOWN.stretches[30]}-${COOLDOWN.stretches[60]} static stretches for the muscles trained most, about ${COOLDOWN.sec} s each, slow breathing. Role stretch, low = seconds.`,
        '- Gentle: a pull, never pain. Find them with find_exercises (family stretch: "quad stretch", "chest stretch", "hamstring").',
        '- Optional by the evidence: it feels good and helps the habit, but lifting through a full range builds mobility too. Skip it if the player prefers.',
      ].join('\n'),
  },
  {
    id: 'progression',
    title: 'Sets, reps and getting stronger',
    words: ['progress', 'progression', 'overload', 'stronger', 'weight', 'add', 'increase', 'stuck', 'plateau', 'deload', 'reps', 'sets', 'rir', 'failure'],
    text: () =>
      [
        '- Double progression: start at the bottom of the rep range. When every set reaches the top with 2 reps left, add a little weight (about 2.5 kg upper body, 5 kg lower) or take the next harder step, and start at the bottom again.',
        `- Body weight reps by level: ${range(BODY_REPS)}; few-rep moves (pull-ups, dips): ${range(FEW_REPS_RANGE)}.`,
        '- The log in the brief says how sets felt (reps left in the tank): mostly 4+ means go up, mostly 0-1 means hold or step down.',
        '- About 10 hard sets per muscle a week is plenty for most; new or returning players do well on 6-10.',
        '- Stuck for 2-3 weeks, or every set feels very hard: a lighter week (a third fewer sets, same moves), then build again.',
      ].join('\n'),
  },
  {
    id: 'week',
    title: 'The week (splits)',
    words: ['week', 'split', 'days', 'full', 'body', 'upper', 'lower', 'push', 'legs', 'ppl', 'rest', 'frequency'],
    text: () =>
      [
        '- 2-3 days: full body each day, days A and B taking turns (A: squat, push, pull; B: hinge, press, row).',
        '- 4 days: upper, lower, upper, lower.',
        '- 5-6 days: push, pull, legs (then again), or upper/lower plus a full-body or skill day.',
        '- The same muscles about 48 hours apart; a hard day not right after a very hard one; a rest day between where the week has room.',
        '- Running in a mix: easy runs next to strength days are fine; intervals not the day before heavy legs.',
      ].join('\n'),
  },
  {
    id: 'calisthenics',
    title: 'Body weight and skills',
    words: ['calisthenics', 'bodyweight', 'body', 'skill', 'pull-up', 'pullup', 'push-up', 'pushup', 'dip', 'handstand', 'l-sit', 'muscle-up', 'ladder', 'easier', 'harder'],
    text: () =>
      [
        '- Progress by harder versions, not more weight: a ladder of steps (the app adds the easier ones as choices).',
        `- Ladders (hardest ← easier): ${ladderText()}.`,
        '- Skills (handstand, L-sit) and the hardest move first, while fresh. Few-rep moves: many short sets with good form beat one long ugly set.',
        '- Move up a step when every set reaches the top of the range with 2 left.',
      ].join('\n'),
  },
  {
    id: 'returning',
    title: 'Coming back after a break, or new',
    words: ['back', 'return', 'returning', 'break', 'beginner', 'new', 'start', 'again', 'sore', 'soreness', 'restart', 'consistency'],
    text: () =>
      [
        '- The first two weeks: about two thirds of what they used to do, 2-3 sets, the bottom of each range, 3-4 reps left in the tank. Winnable first, hard later.',
        '- Soreness the first week is normal and fades; sharp pain is not (rest it, see a doctor or physio).',
        '- Consistency beats intensity: short and done beats long and skipped. On a bad day the minimum is the warm-up and the first main move.',
      ].join('\n'),
  },
  {
    id: 'time',
    title: 'Fitting the minutes',
    words: ['time', 'minutes', 'long', 'short', 'quick', 'fit', 'hour', 'busy'],
    text: () =>
      [
        `- The app estimates each workout (reps, holds, rests, set-up, warm-up and cool-down) and trims sets past ${Math.round(TIME_SLACK * 100)}% over the player's minutes.`,
        '- Short on time: keep the warm-up and the main moves, cut accessories first, then core, then a set of each main move.',
        '- 20 min: a short warm-up, 2 main moves, a stretch. 40 min: warm-up, 3 main, 1 accessory, core, cool-down. 60 min: 4 main, 2 accessories.',
      ].join('\n'),
  },
  {
    id: 'running',
    title: 'Running',
    words: ['run', 'running', 'jog', 'interval', 'long', 'easy', 'pace', 'cardio', '5k', '10k'],
    text: () =>
      [
        '- Most runs easy (you can talk), one interval day, one long run a week.',
        `- The week's running grows at most ${Math.round(RUN.weeklyGrowth * 100)}% over last week's. Below run level ${RUN.walkBreakBelow}, run-walk.`,
        '- A short walk or easy jog first, calf and hip stretches after.',
      ].join('\n'),
  },
];

const tokens = (s: string) => s.toLowerCase().match(/[a-z0-9-]+/g) ?? [];

/** The playbook's topics that fit a question (an empty one lists them). */
export function askTraining(question: string, max = 3): string {
  const words = tokens(question);
  const index = `Topics: ${PLAYBOOK.map((t) => `${t.id} (${t.title})`).join(', ')}.`;
  if (!words.length) return `${PLAYBOOK[0].text()}\n\n${index}`;
  const scored = PLAYBOOK.map((t) => ({ t, n: words.filter((w) => w === t.id || t.words.some((k) => k.startsWith(w) || w.startsWith(k))).length }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  if (!scored.length) return `Nothing on that in the playbook.\n${index}`;
  return scored
    .slice(0, max)
    .map((r) => `## ${r.t.title}\n${r.t.text()}`)
    .join('\n\n');
}

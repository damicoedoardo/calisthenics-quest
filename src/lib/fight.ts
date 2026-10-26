import { classPath } from './gear';
import type { FinishResult, GameState, QuestExercise } from './game';
import { emberStage, fighterOf, patrolAt, roadState, stopAt, type Move, type Stop } from './road';

/* The fight inside a workout. Training wins it; skill decides how well.
   - Starting a workout walks you into the next stop on the road. Each set you log is a hit, sized
     by your reps against today's target. The foe's HP is your planned workout, so finishing your
     sets is what beats it. Until your last set it stays on its knees at 1 HP.
   - As your rest starts after a set, the foe answers: tap when the red ring meets you. Perfect
     blocks it and charges your next set (x1.5), Good halves it, a miss takes all of it.
   - At 0 HP you fall, and Ember helps you back up at half HP. Stars: 1 for the win, 2 if you never
     fell, 3 if you also guarded at least half the hits perfectly.
   - Shields each take a whole hit: one per rest day before the workout (up to 2), one from Ember's
     Bonfire stage, one for scouting the stop in the dark. */

export type Grade = 'perfect' | 'good' | 'miss';

export interface Blow {
  /** The exercise whose set struck. */
  ex: string;
  reps: number;
  dmg: number;
  charged: boolean;
  /** The foe's answer, one grade per ring. Missing until it's played, and after the last set. */
  guards?: Grade[];
  /** HP lost to that answer. */
  taken?: number;
  /** Shields it used up. */
  shielded?: number;
  /** You fell, and Ember helped you up. */
  down?: boolean;
}

export interface WorkoutFight {
  /** The road stop being fought. */
  g: number;
  /** The stop is a final blow still waiting for its max test: a patrol that doesn't move the road. */
  patrol?: boolean;
  shields: number;
  blows: Blow[];
}

/** What a session keeps of its fight. */
export interface FightResult {
  g: number;
  stars: number;
  patrol?: boolean;
}

export const CHARGE = 1.5;
/** Sets on your class's path hit harder. */
export const CLASS_EDGE = 1.25;
export const MAX_REST_SHIELDS = 2;

/** Full rest days between your last workout and today, up to 2. Your first workout gets one. */
export function restDays(state: GameState, now: Date): number {
  const last = state.sessions[state.sessions.length - 1];
  if (!last) return 1;
  const a = new Date(last.date);
  const b = new Date(now);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  return Math.max(0, Math.min(MAX_REST_SHIELDS, days - 1));
}

/** Opens the fight for a workout that's starting. None once the whole road is won. */
export function startFight(state: GameState, now: Date): WorkoutFight | undefined {
  const road = roadState(state);
  if (!road.next) return undefined;
  const bonfire = emberStage(state.sessions.length).index >= 3 ? 1 : 0;
  const scouted = !road.blockedByTest && state.scouted === road.next.g ? 1 : 0;
  return { g: road.next.g, ...(road.blockedByTest ? { patrol: true } : {}), shields: restDays(state, now) + bonfire + scouted, blows: [] };
}

export function foeOf(f: WorkoutFight): Stop {
  return f.patrol ? patrolAt(f.g) : stopAt(f.g)!;
}

/** What one set at today's target hits for: your weapon and level, so training only. */
export function setPower(state: GameState): number {
  return fighterOf(state).dmg * 3;
}

/** The foe's HP is exactly your planned workout. */
export function foeHp(state: GameState, quest: QuestExercise[]): number {
  return quest.reduce((a, q) => a + q.sets, 0) * setPower(state);
}

export function hitFor(state: GameState, q: QuestExercise, reps: number, charged: boolean): number {
  const ratio = Math.min(1.6, Math.max(0.4, reps / Math.max(1, q.reps)));
  const edge = classPath(state.profile.classId, state.progress) === q.path ? CLASS_EDGE : 1;
  return Math.max(1, Math.round(setPower(state) * ratio * edge * (charged ? CHARGE : 1)));
}

/** Your next hit is charged after a perfect answer, and on the first set once Ember is a Torch. */
export function isCharged(state: GameState, f: WorkoutFight): boolean {
  const last = f.blows[f.blows.length - 1];
  if (!last) return emberStage(state.sessions.length).index >= 2;
  return !!last.guards?.length && last.guards.every((g) => g === 'perfect');
}

/** HP and shields left after every answer so far. */
export function vitals(state: GameState, f: WorkoutFight) {
  const hpMax = fighterOf(state).hp;
  let hp = hpMax;
  for (const b of f.blows) {
    hp -= b.taken ?? 0;
    if (b.down) hp = Math.ceil(hpMax / 2);
  }
  return {
    hpMax,
    hp: Math.max(0, hp),
    shields: f.shields - f.blows.reduce((a, b) => a + (b.shielded ?? 0), 0),
    falls: f.blows.filter((b) => b.down).length,
  };
}

/** The foe's HP left. It stays at 1 until your last set lands. */
export function foeLeft(state: GameState, f: WorkoutFight, quest: QuestExercise[], finished: boolean): number {
  if (finished) return 0;
  return Math.max(1, foeHp(state, quest) - f.blows.reduce((a, b) => a + b.dmg, 0));
}

/** The move the foe answers your k-th set with (from 0). */
export function answerMove(f: WorkoutFight, k: number): Move {
  const moves = foeOf(f).moves;
  return moves[k % moves.length];
}

/** Rings in an answer: one per hit, none while it charges. */
export function ringsOf(m: Move): number {
  return m.kind === 'charge' ? 0 : m.kind === 'multi' ? (m.hits ?? 1) : 1;
}

/** Logs a set as a hit. */
export function strike(state: GameState, f: WorkoutFight, q: QuestExercise, reps: number): WorkoutFight {
  const charged = isCharged(state, f);
  return { ...f, blows: [...f.blows, { ex: q.id, reps, dmg: hitFor(state, q, reps, charged), charged }] };
}

/** Plays the foe's answer to your last set with how you guarded each ring. */
export function answer(state: GameState, f: WorkoutFight, grades: Grade[]): WorkoutFight {
  const k = f.blows.length - 1;
  const last = f.blows[k];
  if (!last || last.guards) return f;
  const m = answerMove(f, k);
  const now = vitals(state, f);
  let shields = now.shields,
    taken = 0,
    shielded = 0;
  for (const g of grades) {
    let dmg = g === 'perfect' ? (m.kind === 'big' ? Math.round(m.dmg * 0.25) : 0) : g === 'good' ? Math.round(m.dmg * 0.5) : m.dmg;
    if (dmg > 0 && shields > 0) {
      shields--;
      shielded++;
      dmg = 0;
    }
    taken += dmg;
  }
  const blow: Blow = { ...last, guards: grades, taken, shielded, ...(now.hp - taken <= 0 ? { down: true } : {}) };
  return { ...f, blows: [...f.blows.slice(0, k), blow] };
}

/** Undoing a set takes its hit back, when it was the last one. */
export function undoBlow(f: WorkoutFight, ex: string): WorkoutFight {
  const last = f.blows[f.blows.length - 1];
  return last && last.ex === ex ? { ...f, blows: f.blows.slice(0, -1) } : f;
}

export function starsOf(f: WorkoutFight): number {
  if (f.blows.some((b) => b.down)) return 1;
  const grades = f.blows.flatMap((b) => b.guards ?? []);
  return grades.filter((g) => g === 'perfect').length * 2 >= grades.length ? 3 : 2;
}

/** Closes the workout's fight: the session keeps the stop and its stars, and the road moves on. */
export function settleFight(res: FinishResult, before: GameState): FinishResult {
  const road = roadState(before);
  if (!road.next) return res;
  // Every finished workout wins its stop, even one that started before fights existed.
  const fought = before.draft?.fight?.g === road.next.g ? before.draft.fight : undefined;
  const fight: FightResult = { g: road.next.g, stars: fought ? starsOf(fought) : 1, ...(road.blockedByTest ? { patrol: true } : {}) };
  const session = { ...res.session, fight };
  return {
    ...res,
    session,
    state: { ...res.state, sessions: [...res.state.sessions.slice(0, -1), session], road: road.blockedByTest ? road.cleared : road.cleared + 1 },
  };
}

import { PATHS, getPath, type PathId, type SkillNode } from './skills';
import { classPath, equippedGear, type ClassId, type Gear } from './gear';
import type { Look } from '@/sprites/engine/figure';

export const XP_FULL_SESSION = 100;
export const XP_MINI_SESSION = 30;
export const XP_UNLOCK = 250;
export const XP_PERFECT_WEEK = 100;
export const XP_RETURN = 50;
export const XP_MAX_TEST = 200;
export const XP_PER_LEVEL = 500;
export const CLASS_BONUS = 0.1;
export const WEEKLY_GOAL = 3;
export const REST_SECONDS = 90;
/** Days that must pass between two max tests for the test to give XP again. */
export const TEST_COOLDOWN_DAYS = 21;
/** A gap this long earns the return bonus. */
export const RETURN_GAP_DAYS = 14;

export type Rir = '4+' | '2-3' | '0-1';
export type Checkin = 'rough' | 'normal' | 'strong';
export type DayType = 'A' | 'B';

export interface SetLog {
  reps: number;
  /** Reps left in the tank when the set ended. */
  rir: Rir;
}

export interface SessionEntry {
  exerciseId: string;
  target: number;
  sets: SetLog[];
}

export interface XpLine {
  label: string;
  xp: number;
}

export interface Session {
  id: string;
  date: string;
  kind: 'full' | 'mini';
  day: DayType;
  xp: number;
  breakdown: XpLine[];
  entries: SessionEntry[];
  /** Node ids beaten in this session. */
  unlocked: string[];
}

export interface MaxTest {
  id: string;
  date: string;
  pushups: number;
  pullups: number;
  lsitSec: number;
  xp: number;
}

export interface Draft {
  startedAt: string;
  checkin: Checkin;
  /** Logged sets by exercise id. */
  sets: Record<string, SetLog[]>;
}

export interface Letter {
  why: string;
  want: string;
  forWho: string;
  remind: string;
}

export interface Profile {
  onboarded: boolean;
  letter: Letter;
  /** What the Hollow says: the player's own inner critic, in their words. */
  voice: string;
  classId?: ClassId;
  /** How the hero looks. Missing on saves from before the look picker: the default boy. */
  look?: Look;
}

export interface GameState {
  version: 2;
  profile: Profile;
  /** Index of the node currently trained on each path; equal to nodes.length when the path is complete. */
  progress: Record<PathId, number>;
  /** Current per-set target (reps or seconds) by node id. */
  reps: Record<string, number>;
  sessions: Session[];
  tests: MaxTest[];
  draft: Draft | null;
  /** Story scenes already played. */
  seenScenes: string[];
  /** Stops cleared on the road through the Fog (src/lib/road.ts). Missing in older saves. */
  road?: number;
}

export function initialState(): GameState {
  return {
    version: 2,
    profile: { onboarded: false, letter: { why: '', want: '', forWho: '', remind: '' }, voice: '' },
    progress: { push: 1, pull: 1, core: 0 },
    reps: {},
    sessions: [],
    tests: [],
    draft: null,
    seenScenes: [],
  };
}

// ---------- time ----------

/** Monday-based week key, e.g. "2026-10-26" for the week starting that Monday (local time). */
export function weekKey(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function previousWeekKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return weekKey(new Date(y, m - 1, d - 7));
}

export function sessionsThisWeek(state: GameState, now: Date): number {
  const key = weekKey(now);
  return state.sessions.filter((s) => weekKey(new Date(s.date)) === key).length;
}

/**
 * Consecutive weeks that hit the weekly goal. The current week counts once it
 * is hit; until then the streak is still alive from last week.
 */
export function weekStreak(state: GameState, now: Date): number {
  const counts = new Map<string, number>();
  for (const s of state.sessions) {
    const k = weekKey(new Date(s.date));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let key = weekKey(now);
  if ((counts.get(key) ?? 0) < WEEKLY_GOAL) key = previousWeekKey(key);
  let streak = 0;
  while ((counts.get(key) ?? 0) >= WEEKLY_GOAL) {
    streak += 1;
    key = previousWeekKey(key);
  }
  return streak;
}

export function streakMultiplier(streak: number): number {
  return 1 + Math.min(streak, 5) * 0.1;
}

export function daysSinceLastSession(state: GameState, now: Date): number | null {
  const last = state.sessions[state.sessions.length - 1];
  if (!last) return null;
  return (now.getTime() - new Date(last.date).getTime()) / 86_400_000;
}

// ---------- levels ----------

const TITLES: [number, string][] = [
  [50, 'Legend'],
  [35, 'Warlord'],
  [20, 'Champion'],
  [10, 'Knight'],
  [5, 'Squire'],
  [1, 'Rookie'],
];

export function totalXp(state: GameState): number {
  return state.sessions.reduce((a, s) => a + s.xp, 0) + state.tests.reduce((a, t) => a + t.xp, 0);
}

export function levelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return {
    level,
    title: TITLES.find(([min]) => level >= min)![1],
    into,
    needed: XP_PER_LEVEL,
    pct: into / XP_PER_LEVEL,
  };
}

// ---------- skills ----------

export function currentNode(state: GameState, path: PathId): SkillNode | null {
  return getPath(path).nodes[state.progress[path]] ?? null;
}

export function repsFor(state: GameState, node: SkillNode): number {
  return state.reps[node.id] ?? node.startReps;
}

export function gearOf(state: GameState) {
  return equippedGear(state.profile.classId, state.progress);
}

// ---------- today's quest ----------

/** Sessions alternate: A leads with Push, B leads with Pull. Core is in both. */
export function dayType(state: GameState): DayType {
  return state.sessions.length % 2 === 0 ? 'A' : 'B';
}

export type BlockRole = 'main' | 'core' | 'support';

export interface QuestExercise {
  id: string;
  role: BlockRole;
  path: PathId;
  name: string;
  cue: string;
  unit: 'reps' | 'sec';
  sets: number;
  reps: number;
  node: SkillNode;
  /** Only the current node of a path can be beaten. */
  canUnlock: boolean;
}

function block(state: GameState, path: PathId, role: BlockRole): QuestExercise | null {
  const nodes = getPath(path).nodes;
  const at = state.progress[path];
  // Support work is the node below the current one: solid volume, no unlock.
  const index = role === 'support' ? Math.max(0, Math.min(at, nodes.length) - 1) : at;
  const node = nodes[index];
  if (!node) return null;
  return {
    id: node.id,
    role,
    path,
    name: node.name,
    cue: node.cue,
    unit: node.unit,
    sets: node.sets,
    reps: repsFor(state, node),
    node,
    canUnlock: role !== 'support' && index === at,
  };
}

export function todaysQuest(state: GameState, checkin: Checkin = state.draft?.checkin ?? 'normal'): QuestExercise[] {
  const day = dayType(state);
  const main: PathId = day === 'A' ? 'push' : 'pull';
  const other: PathId = day === 'A' ? 'pull' : 'push';
  // A fully beaten path hands the lead to the other one.
  const lead = block(state, main, 'main') ?? block(state, other, 'main');
  if (checkin === 'rough') return lead ? [{ ...lead, sets: Math.min(lead.sets, 3) }] : [];
  const list = [lead, block(state, 'core', 'core'), block(state, other, 'support')].filter((b): b is QuestExercise => !!b);
  return list.filter((b, i) => list.findIndex((o) => o.id === b.id) === i);
}

/** Session XP with the current streak, for the "+XP" preview on Today. */
export function previewXp(state: GameState, checkin: Checkin, now: Date): number {
  const base = checkin === 'rough' ? XP_MINI_SESSION : XP_FULL_SESSION;
  return Math.round(base * streakMultiplier(weekStreak(state, now)));
}

export interface FinishResult {
  state: GameState;
  session: Session;
  levelBefore: number;
  levelAfter: number;
  newGear: Gear[];
}

/**
 * Close the current draft as a session: award XP, beat nodes whose unlock
 * target was hit, and raise targets for exercises done cleanly.
 */
export function finishSession(state: GameState, now: Date, idGen: () => string = defaultId): FinishResult | null {
  const draft = state.draft;
  if (!draft) return null;
  const quest = todaysQuest(state, draft.checkin);
  const entries: SessionEntry[] = quest
    .map((q) => ({ exerciseId: q.id, target: q.reps, sets: (draft.sets[q.id] ?? []).slice(0, q.sets) }))
    .filter((e) => e.sets.length > 0);
  if (entries.length === 0) return null;

  const totalSets = quest.reduce((a, q) => a + q.sets, 0);
  const doneSets = entries.reduce((a, e) => a + e.sets.length, 0);
  const kind: Session['kind'] = draft.checkin !== 'rough' && doneSets * 2 >= totalSets ? 'full' : 'mini';

  const progress = { ...state.progress };
  const reps = { ...state.reps };
  const unlocked: string[] = [];

  for (const q of quest) {
    const entry = entries.find((e) => e.exerciseId === q.id);
    if (!entry) continue;
    const node = q.node;
    const atTarget = entry.sets.filter((s) => s.reps >= node.unlockReps).length;
    if (q.canUnlock && atTarget >= node.unlockSets) {
      unlocked.push(node.id);
      progress[q.path] += 1;
      continue;
    }
    // Every set done at target with reps to spare: ask for a little more next time.
    const clean = entry.sets.length >= q.sets && entry.sets.every((s) => s.reps >= q.reps && s.rir !== '0-1');
    if (clean) {
      const step = q.unit === 'sec' ? 2 : 1;
      reps[q.id] = Math.min(q.reps + step, node.unlockReps);
    }
  }

  const breakdown: XpLine[] = [];
  const streak = weekStreak(state, now);
  const base = kind === 'full' ? XP_FULL_SESSION : XP_MINI_SESSION;
  breakdown.push({ label: kind === 'full' ? 'Quest complete' : 'Minimum quest', xp: base });
  const streakXp = Math.round(base * (streakMultiplier(streak) - 1));
  if (streakXp > 0) breakdown.push({ label: `Streak ×${streakMultiplier(streak).toFixed(1)}`, xp: streakXp });
  const bonusPath = classPath(state.profile.classId, state.progress);
  const lead = quest[0];
  if (bonusPath && lead && lead.path === bonusPath && entries.some((e) => e.exerciseId === lead.id)) {
    breakdown.push({ label: 'Class bonus', xp: Math.round(base * CLASS_BONUS) });
  }
  const gap = daysSinceLastSession(state, now);
  if (gap !== null && gap >= RETURN_GAP_DAYS) breakdown.push({ label: 'Welcome back', xp: XP_RETURN });
  if (sessionsThisWeek(state, now) + 1 === WEEKLY_GOAL) breakdown.push({ label: 'Perfect week', xp: XP_PERFECT_WEEK });
  for (const id of unlocked) breakdown.push({ label: `${nodeName(id)} beaten`, xp: XP_UNLOCK });
  const xp = breakdown.reduce((a, l) => a + l.xp, 0);

  const before = levelInfo(totalXp(state)).level;
  const gearBefore = gearOf(state);
  const session: Session = { id: idGen(), date: now.toISOString(), kind, day: dayType(state), xp, breakdown, entries, unlocked };
  const next: GameState = { ...state, progress, reps, sessions: [...state.sessions, session], draft: null };
  const gearAfter = gearOf(next);
  const newGear = (['weapon', 'armor', 'shield'] as const).filter((s) => gearAfter[s].tier > gearBefore[s].tier).map((s) => gearAfter[s]);
  return { state: next, session, levelBefore: before, levelAfter: levelInfo(totalXp(next)).level, newGear };
}

export function nodeName(id: string): string {
  return PATHS.flatMap((p) => p.nodes).find((n) => n.id === id)?.name ?? 'Skill';
}

export function logMaxTest(
  state: GameState,
  values: { pushups: number; pullups: number; lsitSec: number },
  now: Date,
  idGen: () => string = defaultId,
): { state: GameState; test: MaxTest } {
  const last = state.tests[state.tests.length - 1];
  const daysSince = last ? (now.getTime() - new Date(last.date).getTime()) / 86_400_000 : Infinity;
  const test: MaxTest = { id: idGen(), date: now.toISOString(), ...values, xp: daysSince >= TEST_COOLDOWN_DAYS ? XP_MAX_TEST : 0 };
  return { state: { ...state, tests: [...state.tests, test] }, test };
}

export function nextTestDate(state: GameState): Date | null {
  const last = state.tests[state.tests.length - 1];
  if (!last) return null;
  return new Date(new Date(last.date).getTime() + TEST_COOLDOWN_DAYS * 86_400_000);
}

// ---------- placement ----------

/**
 * Starting nodes from a rough self-estimate. Guesses land one step low on
 * purpose so day one feels winnable.
 */
export function placement(pushups: number, pullups: number, kneeRaises: number): Record<PathId, number> {
  const push = pushups < 8 ? 0 : pushups < 30 ? 1 : 2;
  const pull = pullups === 0 ? 1 : pullups < 6 ? 1 : pullups < 10 ? 2 : 3;
  const core = kneeRaises < 15 ? 0 : 1;
  return { push, pull, core };
}

// ---------- migration ----------

interface V1Session {
  id: string;
  date: string;
  kind: 'full' | 'mini';
  xp: number;
  entries: { exerciseId: string; setsDone: number; reps: number }[];
  unlocked: string[];
}

/** Bring older saves forward. Unknown shapes fall back to a fresh state. */
export function migrate(raw: unknown): GameState {
  const fresh = initialState();
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Record<string, unknown>;
  if (r.version === 2) {
    const s = r as unknown as GameState;
    return { ...fresh, ...s, profile: { ...fresh.profile, ...s.profile, letter: { ...fresh.profile.letter, ...s.profile?.letter } } };
  }
  if (r.version === 1) {
    const sessions: Session[] = ((r.sessions as V1Session[]) ?? []).map((s, i) => ({
      id: s.id,
      date: s.date,
      kind: s.kind,
      day: i % 2 === 0 ? 'A' : 'B',
      xp: s.xp,
      breakdown: [{ label: 'Quest', xp: s.xp }],
      entries: s.entries.map((e) => ({
        exerciseId: e.exerciseId,
        target: e.reps,
        sets: Array.from({ length: e.setsDone }, () => ({ reps: e.reps, rir: '2-3' as Rir })),
      })),
      unlocked: s.unlocked,
    }));
    return {
      ...fresh,
      progress: (r.progress as GameState['progress']) ?? fresh.progress,
      reps: (r.reps as GameState['reps']) ?? {},
      sessions,
      tests: (r.tests as MaxTest[]) ?? [],
    };
  }
  return fresh;
}

function defaultId(): string {
  return Math.random().toString(36).slice(2, 10);
}

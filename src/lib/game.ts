import { BONUS, PATHS, STARTER_GEAR, getPath, type Gear, type GearSlot, type PathId, type SkillNode } from './skills';

export const XP_FULL_SESSION = 100;
export const XP_MINI_SESSION = 30;
export const XP_UNLOCK = 150;
export const XP_MAX_TEST = 200;
export const XP_PER_LEVEL = 500;
export const WEEKLY_GOAL = 3;
/** Days that must pass between two max tests for the test to give XP again. */
export const TEST_COOLDOWN_DAYS = 21;

export interface SessionEntry {
  exerciseId: string;
  setsDone: number;
  reps: number;
}

export interface Session {
  id: string;
  date: string;
  kind: 'full' | 'mini';
  xp: number;
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
  /** Sets done so far, by exercise id. */
  done: Record<string, number>;
}

export interface GameState {
  version: 1;
  /** Index of the node currently trained on each path; equal to nodes.length when the path is complete. */
  progress: Record<PathId, number>;
  /** Current per-set reps (or seconds) by node id. */
  reps: Record<string, number>;
  /** Week key of the last automatic +1 for a node, so it happens at most once a week. */
  lastBump: Record<string, string>;
  sessions: Session[];
  tests: MaxTest[];
  draft: Draft | null;
}

export function initialState(): GameState {
  return {
    version: 1,
    // Push-ups and assisted pull-ups are within reach already, so start there.
    progress: { push: 1, pull: 1, core: 0 },
    reps: {},
    lastBump: {},
    sessions: [],
    tests: [],
    draft: null,
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

// ---------- levels ----------

const TITLES = ['Rookie', 'Squire', 'Fighter', 'Warrior', 'Knight', 'Champion', 'Hero', 'Legend'];

export function totalXp(state: GameState): number {
  return state.sessions.reduce((a, s) => a + s.xp, 0) + state.tests.reduce((a, t) => a + t.xp, 0);
}

export function levelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return {
    level,
    title: TITLES[Math.min(Math.floor((level - 1) / 2), TITLES.length - 1)],
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

export function equippedGear(state: GameState): Record<GearSlot, Gear> {
  const gear = { ...STARTER_GEAR };
  for (const path of PATHS) {
    const beaten = state.progress[path.id];
    if (beaten > 0) gear[path.slot] = path.nodes[beaten - 1].reward;
  }
  return gear;
}

export function isComplete(state: GameState, path: PathId): boolean {
  return state.progress[path] >= getPath(path).nodes.length;
}

// ---------- today's quest ----------

export interface QuestExercise {
  id: string;
  name: string;
  cue: string;
  unit: 'reps' | 'sec';
  sets: number;
  reps: number;
  path?: PathId;
  node?: SkillNode;
}

export function todaysQuest(state: GameState): QuestExercise[] {
  const list: QuestExercise[] = [];
  for (const path of PATHS) {
    const node = currentNode(state, path.id);
    if (!node) continue;
    list.push({
      id: node.id,
      name: node.name,
      cue: node.cue,
      unit: node.unit,
      sets: node.sets,
      reps: repsFor(state, node),
      path: path.id,
      node,
    });
  }
  list.push({ id: BONUS.id, name: BONUS.name, cue: BONUS.cue, unit: 'reps', sets: BONUS.sets, reps: state.reps[BONUS.id] ?? BONUS.reps });
  return list;
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
 * target was hit, and nudge reps up once a week for exercises fully done.
 */
export function finishSession(state: GameState, now: Date, idGen: () => string = defaultId): FinishResult | null {
  const draft = state.draft;
  if (!draft) return null;
  const quest = todaysQuest(state);
  const entries: SessionEntry[] = quest
    .map((q) => ({ exerciseId: q.id, setsDone: Math.min(draft.done[q.id] ?? 0, q.sets), reps: q.reps }))
    .filter((e) => e.setsDone > 0);
  if (entries.length === 0) return null;

  const totalSets = quest.reduce((a, q) => a + q.sets, 0);
  const doneSets = entries.reduce((a, e) => a + e.setsDone, 0);
  const kind: Session['kind'] = doneSets * 2 >= totalSets ? 'full' : 'mini';

  const progress = { ...state.progress };
  const reps = { ...state.reps };
  const lastBump = { ...state.lastBump };
  const unlocked: string[] = [];
  const newGear: Gear[] = [];
  const week = weekKey(now);

  for (const q of quest) {
    const entry = entries.find((e) => e.exerciseId === q.id);
    if (!entry) continue;
    const node = q.node;
    if (node && q.path && entry.setsDone >= node.unlockSets && entry.reps >= node.unlockReps) {
      unlocked.push(node.id);
      newGear.push(node.reward);
      progress[q.path] += 1;
      continue;
    }
    // All sets done: next week asks for a little more, never past the unlock target.
    if (entry.setsDone >= q.sets && lastBump[q.id] !== week) {
      const step = q.unit === 'sec' ? 2 : 1;
      const cap = node ? node.unlockReps : q.reps + step;
      reps[q.id] = Math.min(q.reps + step, cap);
      lastBump[q.id] = week;
    }
  }

  const before = levelInfo(totalXp(state)).level;
  const streak = weekStreak(state, now);
  const base = kind === 'full' ? XP_FULL_SESSION : XP_MINI_SESSION;
  const xp = Math.round(base * streakMultiplier(streak)) + unlocked.length * XP_UNLOCK;

  const session: Session = { id: idGen(), date: now.toISOString(), kind, xp, entries, unlocked };
  const next: GameState = { ...state, progress, reps, lastBump, sessions: [...state.sessions, session], draft: null };
  return { state: next, session, levelBefore: before, levelAfter: levelInfo(totalXp(next)).level, newGear };
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

function defaultId(): string {
  return Math.random().toString(36).slice(2, 10);
}

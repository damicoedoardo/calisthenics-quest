import { PLAN, cueOf, type DayType, type Kit, type Slot, type SlotRole } from './program';
import { makeGear, tiersAt, type ClassId, type Gear, type GearSlot, type Tier } from './gear';
import { tierOf } from '@/game/dungeon/items';
import type { Build } from './stats';
import type { Look } from '@/sprites/engine/figure';
import type { FogProgress } from './fog';
import type { FogGear } from './fog-gear';
import type { AnswerId } from '@/story/types';

export const XP_FULL_SESSION = 100;
export const XP_MINI_SESSION = 30;
export const XP_PERFECT_WEEK = 100;
export const XP_RETURN = 50;
export const XP_PER_LEVEL = 500;
export const WEEKLY_GOAL = 3;
export const REST_SECONDS = 90;
/** A gap this long earns the return bonus. */
export const RETURN_GAP_DAYS = 14;
/** Strength comes with time, not just sessions: an exercise's goal goes up at most this often a week. */
export const MAX_RAISES_PER_WEEK = 2;

export type Rir = '4+' | '2-3' | '0-1';
export type Checkin = 'rough' | 'normal' | 'strong';
export type { DayType, Kit } from './program';

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
  /** Exercise ids whose goal went up after this session. Missing on older saves. */
  raised?: string[];
  /** Weighted exercises that reached the top of their range: add a little weight, start again. */
  heavier?: string[];
  /** A set beat the best set of the same exercise last time (one more rep, a longer hold). */
  better?: boolean;
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
  /** The name the player gave the flame. Missing until it asks. */
  flame?: string;
  /** What the built-in plan trains with. Missing means the gym. */
  kit?: Kit;
}

/** A page of the Book of Days: one for every day the app was opened. */
export interface DayPage {
  /** Local date, "2026-10-26". */
  day: string;
  /** What the flame said that day. */
  line: string;
  /** The day's words for the road. */
  quote: { text: string; by: string };
  /** The player kept the quote. */
  kept?: boolean;
  /** Sat by the fire on a rest day. */
  fire?: boolean;
}

export interface GameState {
  version: 3;
  profile: Profile;
  /** Current per-set target (reps or seconds) by exercise id. */
  reps: Record<string, number>;
  sessions: Session[];
  /** Stat points put into the champion (src/lib/stats.ts). Missing means none spent. */
  build?: Build;
  draft: Draft | null;
  /** Story scenes already played. */
  seenScenes: string[];
  /** How many scenes played at the last story moment (a day and a workout count). */
  sceneMark?: { at: string; count: number };
  /** Runs in the Fog: zones cleared and best results. */
  fog?: FogProgress;
  /** What you wear into the Fog, and the vault that keeps items safe (src/lib/fog-gear.ts). */
  fogGear?: FogGear;
  /** What the player answered in the story: heart moments, villager stories. */
  answers?: Partial<Record<AnswerId, string>>;
  /** The Book of Days, oldest first. */
  days?: DayPage[];
}

export function initialState(): GameState {
  return {
    version: 3,
    profile: { onboarded: false, letter: { why: '', want: '', forWho: '', remind: '' }, voice: '' },
    reps: {},
    sessions: [],
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
  return state.sessions.reduce((a, s) => a + s.xp, 0);
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

// ---------- today's quest ----------

export function repsFor(state: GameState, slot: Slot): number {
  return state.reps[slot.id] ?? slot.low;
}

/** What the hero looks like they wear: the starter kit's look (`fogGear.kit`, the gear Mira's old
    forge had made by the time it closed), or what you wear into the Fog when that looks finer. The
    charm shows as the shield slot's piece. */
export function gearOf(state: GameState): Record<GearSlot, Gear> {
  const kit = state.fogGear?.kit ?? KIT_LOOK,
    worn = state.fogGear?.worn ?? {},
    tier = (slot: GearSlot): Tier => {
      const it = worn[slot === 'shield' ? 'charm' : slot];
      return Math.max(kit[slot], it ? tierOf(it) : 0) as Tier;
    };
  return { weapon: makeGear('weapon', tier('weapon'), state.profile.classId), armor: makeGear('armor', tier('armor'), state.profile.classId), shield: makeGear('shield', tier('shield'), state.profile.classId) };
}

/** A new hero's look: a plain weapon and armor, no shield. */
const KIT_LOOK: Record<GearSlot, Tier> = { weapon: 1, armor: 1, shield: 0 };

/** Sessions alternate between the plan's two days. */
export function dayType(state: GameState): DayType {
  return state.sessions.length % 2 === 0 ? 'A' : 'B';
}

export interface QuestExercise {
  id: string;
  role: SlotRole;
  name: string;
  cue: string;
  unit: 'reps' | 'sec';
  sets: number;
  reps: number;
  slot: Slot;
}

/** Warm-ups and stretches are one tap, not sets to log. */
export const isTap = (q: Pick<QuestExercise, 'role'>) => q.role === 'warmup' || q.role === 'stretch';

function exercise(state: GameState, slot: Slot): QuestExercise {
  return { id: slot.id, role: slot.role, name: slot.name, cue: cueOf(slot.id), unit: slot.unit, sets: slot.sets, reps: repsFor(state, slot), slot };
}

/**
 * Today's workout from the built-in plan. Every day opens with the warm-up and ends with the stretch;
 * a Rough day keeps those and one exercise of at most 3 sets.
 */
export function todaysQuest(state: GameState, checkin: Checkin = state.draft?.checkin ?? 'normal'): QuestExercise[] {
  const day = PLAN[state.profile.kit ?? 'gym'][dayType(state)];
  const list = day.map((s) => exercise(state, s));
  if (checkin !== 'rough') return list;
  const lead = list.find((q) => !isTap(q));
  return list.filter((q) => isTap(q) || q === lead).map((q) => (q === lead ? { ...q, sets: Math.min(q.sets, 3) } : q));
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

/** The best set of an exercise in the last session that did it. */
function lastBest(state: GameState, id: string): number | null {
  const last = state.sessions.findLast((s) => s.entries.some((e) => e.exerciseId === id));
  const entry = last?.entries.find((e) => e.exerciseId === id);
  return entry ? Math.max(...entry.sets.map((x) => x.reps)) : null;
}

/**
 * Close the current draft as a session: award XP, raise targets for exercises done cleanly, and
 * note whether a set beat last time.
 */
export function finishSession(state: GameState, now: Date, idGen: () => string = defaultId): FinishResult | null {
  const draft = state.draft;
  if (!draft) return null;
  const quest = todaysQuest(state, draft.checkin);
  const entries: SessionEntry[] = quest
    .map((q) => ({ exerciseId: q.id, target: q.reps, sets: (draft.sets[q.id] ?? []).slice(0, q.sets) }))
    .filter((e) => e.sets.length > 0);
  if (!entries.some((e) => !isTap(quest.find((q) => q.id === e.exerciseId)!))) return null;

  const totalSets = quest.reduce((a, q) => a + q.sets, 0);
  const doneSets = entries.reduce((a, e) => a + e.sets.length, 0);
  const kind: Session['kind'] = draft.checkin !== 'rough' && doneSets * 2 >= totalSets ? 'full' : 'mini';

  const reps = { ...state.reps };
  const raised: string[] = [];
  const heavier: string[] = [];
  let better = false;
  const week = weekKey(now);
  const raisesThisWeek = (id: string) => state.sessions.filter((s) => weekKey(new Date(s.date)) === week && s.raised?.includes(id)).length;
  const raisedLastTime = (id: string) => !!state.sessions.findLast((s) => s.entries.some((e) => e.exerciseId === id))?.raised?.includes(id);

  for (const q of quest) {
    const entry = entries.find((e) => e.exerciseId === q.id);
    if (!entry || isTap(q)) continue;
    const best = lastBest(state, q.id);
    if (best !== null && entry.sets.some((x) => x.reps > best)) better = true;
    // Every set done at target with reps to spare: ask for a little more next time. At most twice a
    // week, and a hold only every other time: a second held comes slower than a rep.
    const clean = entry.sets.length >= q.sets && entry.sets.every((x) => x.reps >= q.reps && x.rir !== '0-1');
    if (!clean || raisesThisWeek(q.id) >= MAX_RAISES_PER_WEEK || (q.unit === 'sec' && raisedLastTime(q.id))) continue;
    const step = q.unit === 'sec' ? 5 : 1;
    if (q.reps < q.slot.high) {
      reps[q.id] = Math.min(q.reps + step, q.slot.high);
      raised.push(q.id);
    } else if (q.slot.weighted) {
      // the top of the range, clean: a little more weight, back to the bottom
      reps[q.id] = q.slot.low;
      heavier.push(q.id);
    }
  }

  const breakdown: XpLine[] = [];
  const streak = weekStreak(state, now);
  const base = kind === 'full' ? XP_FULL_SESSION : XP_MINI_SESSION;
  breakdown.push({ label: kind === 'full' ? 'Quest complete' : 'Minimum quest', xp: base });
  const streakXp = Math.round(base * (streakMultiplier(streak) - 1));
  if (streakXp > 0) breakdown.push({ label: `Streak ×${streakMultiplier(streak).toFixed(1)}`, xp: streakXp });
  const gap = daysSinceLastSession(state, now);
  if (gap !== null && gap >= RETURN_GAP_DAYS) breakdown.push({ label: 'Welcome back', xp: XP_RETURN });
  if (sessionsThisWeek(state, now) + 1 === WEEKLY_GOAL) breakdown.push({ label: 'Perfect week', xp: XP_PERFECT_WEEK });
  const xp = breakdown.reduce((a, l) => a + l.xp, 0);

  const before = levelInfo(totalXp(state)).level;
  const gearBefore = gearOf(state);
  const session: Session = { id: idGen(), date: now.toISOString(), kind, day: dayType(state), xp, breakdown, entries, raised, heavier, better };
  const next: GameState = { ...state, reps, sessions: [...state.sessions, session], draft: null };
  const gearAfter = gearOf(next);
  const newGear = (['weapon', 'armor', 'shield'] as const).filter((s) => gearAfter[s].tier > gearBefore[s].tier).map((s) => gearAfter[s]);
  return { state: next, session, levelBefore: before, levelAfter: levelInfo(totalXp(next)).level, newGear };
}

/**
 * A workout left open on an earlier day (the app was closed mid-quest) is saved on the day it was
 * done, so its sets still count and don't get mixed into today's workout. Half a day of grace, so a
 * late workout that runs past midnight isn't cut short.
 */
export function closeStaleDraft(state: GameState, now: Date): GameState {
  const draft = state.draft;
  if (!draft) return state;
  const started = new Date(draft.startedAt);
  const stale = started.toDateString() !== now.toDateString() && now.getTime() - started.getTime() > 12 * 3_600_000;
  if (!stale) return state;
  return finishSession(state, started)?.state ?? { ...state, draft: null };
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

interface V2Session extends Omit<Session, 'better' | 'heavier'> {
  unlocked?: string[];
}

/** A session from before the move to any workout: it keeps its date, XP and sets. */
function fromV2(s: V2Session): Session {
  const { unlocked: _unlocked, ...rest } = s;
  return rest;
}

/**
 * Bring older saves forward. Version 3 dropped the calisthenics skill tree and the max tests:
 * sessions, story, Fog and the Book of Days carry over, the old skill levels and tests don't.
 * Unknown shapes fall back to a fresh state.
 */
export function migrate(raw: unknown): GameState {
  const fresh = initialState();
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Record<string, unknown>;
  const profileOf = (p: Partial<Profile> | undefined): Profile => ({ ...fresh.profile, ...p, letter: { ...fresh.profile.letter, ...p?.letter } });
  if (r.version === 3) {
    const s = r as unknown as GameState;
    // Mira's forge used to make new gear every few workouts. It doesn't any more: the gear it had
    // made by then stays as the hero's look (the starter kit), and finer gear comes from the Fog.
    const fogGear = s.fogGear?.kit ? s.fogGear : { worn: {}, vault: [], ...s.fogGear, kit: tiersAt((s.sessions ?? []).length) };
    return { ...fresh, ...s, profile: profileOf(s.profile), fogGear };
  }
  if (r.version === 2) {
    const { progress: _progress, tests: _tests, reps: _reps, ...s } = r as unknown as GameState & { progress?: unknown; tests?: unknown };
    return {
      ...fresh,
      ...s,
      version: 3,
      // the old targets were for skill-tree moves; the new plan starts fresh
      reps: {},
      sessions: ((s.sessions ?? []) as V2Session[]).map(fromV2),
      draft: null,
      profile: profileOf(s.profile),
    };
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
    }));
    return { ...fresh, sessions };
  }
  return fresh;
}

function defaultId(): string {
  return Math.random().toString(36).slice(2, 10);
}

import { migrate, type GameState } from './game';

/* Cloud backup rules (pure). The save lives on the phone; signing in keeps a copy on FORMA's
   server (backend/, docs/handbook/backend/api.md). Every write names the cloud rev it was based
   on, so a phone that missed a newer save is told (409) instead of overwriting it. These rules
   decide what to do on sign-in and after such a clash. */

/** The cloud copy as the api returns it. */
export interface CloudCopy {
  rev: number;
  workouts: number;
  updated_at: string;
  data?: unknown;
}

export type SyncPlan =
  /** Send this phone's save, written over the cloud's `baseRev` (null: there is none yet). */
  | { kind: 'upload'; baseRev: number | null }
  /** Take the cloud's save onto this phone. */
  | { kind: 'use-cloud' }
  /** Both have progress the other hasn't seen: the player picks. */
  | { kind: 'ask'; cloud: CloudCopy };

/** A phone with no workouts has nothing to lose. */
export const isFresh = (s: GameState) => s.sessions.length === 0;

/**
 * What to do when the phone and the cloud meet (at sign-in, and after a 409).
 * `lastRev` is the cloud rev this phone last wrote or took, null if never.
 */
export function plan(local: GameState, cloud: CloudCopy | null, lastRev: number | null): SyncPlan {
  if (!cloud) return { kind: 'upload', baseRev: null };
  // The phone carries on from the cloud's latest: its changes go on top.
  if (lastRev === cloud.rev) return { kind: 'upload', baseRev: cloud.rev };
  if (isFresh(local)) return { kind: 'use-cloud' };
  // The cloud has nothing the phone lacks (an empty cloud save).
  if (cloud.workouts === 0) return { kind: 'upload', baseRev: cloud.rev };
  return { kind: 'ask', cloud };
}

/** The cloud's save as a game state, or null when it isn't one. */
export function cloudState(cloud: CloudCopy): GameState | null {
  const d = cloud.data as { version?: unknown; sessions?: unknown } | null | undefined;
  if (!d || typeof d.version !== 'number' || !Array.isArray(d.sessions)) return null;
  try {
    return migrate(d);
  } catch {
    return null;
  }
}

/** "12 workouts, 27 Oct": one side of the which-to-keep question. */
export function describe(workouts: number, iso?: string): string {
  const n = `${workouts} workout${workouts === 1 ? '' : 's'}`;
  if (!iso) return n;
  return `${n}, ${new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

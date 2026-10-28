'use client';

import { useCallback, useEffect } from 'react';
import { loadLibrary } from '@/exercises/library';
import type { GameState } from '@/lib/game';
import { seeded } from '@/lib/random';
import { buildWorkout } from '@/lib/coach/generate';
import { planFromQuest, setPlan } from '@/lib/coach/plan';
import type { Mode } from '@/lib/coach/types';

type Update = (fn: (s: GameState) => GameState) => void;

const busy = (s: GameState) => !!s.draft && Object.values(s.draft.sets).some((l) => l.length > 0);
/** Same save, same workout: the seed is the workouts done and the day of setup. */
const seedOf = (s: GameState) => s.sessions.length * 7919 + new Date(s.coach?.profile?.setupAt ?? 0).getTime() / 1000;

/** Keeps a next workout ready once the coach is set up: after setup, and after every workout. */
export function useCoachPlan(state: GameState, update: Update) {
  const want = !!state.coach?.profile && !state.coach.plan && !busy(state);
  useEffect(() => {
    if (!want) return;
    let gone = false;
    loadLibrary().then((all) => {
      if (gone) return;
      update((s) => {
        if (!s.coach?.profile || s.coach.plan || busy(s)) return s;
        const plan = buildWorkout({ all, coach: s.coach, sessions: s.sessions, now: new Date(), rng: seeded(seedOf(s)) });
        return plan ? setPlan(s, plan) : s;
      });
    });
    return () => {
      gone = true;
    };
  }, [want, update]);
}

/** Build the next workout again, maybe as another mode. A new seed, so it is a fresh pick. */
export function useRebuild(update: Update) {
  return useCallback(
    (mode?: Mode) =>
      loadLibrary().then((all) =>
        update((s) => {
          if (!s.coach?.profile || busy(s)) return s;
          const plan = buildWorkout({ all, coach: s.coach, sessions: s.sessions, now: new Date(), rng: seeded(Date.now()), mode });
          return plan ? setPlan(s, plan) : s;
        }),
      ),
    [update],
  );
}

/** Before changing the built-in plan's workout: turn it into a plan with choices. */
export function ensurePlan(update: Update): Promise<void> {
  return loadLibrary().then((all) => update((s) => (s.coach?.plan ? s : setPlan(s, planFromQuest(s, all, new Date())))));
}

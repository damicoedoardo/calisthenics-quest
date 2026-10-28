'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadLibrary } from '@/exercises/library';
import type { GameState } from '@/lib/game';
import { seeded } from '@/lib/random';
import { planFromQuest } from '@/lib/coach/plan';
import { buildWeek, currentPlan, setPlan, weekOver } from '@/lib/coach/week';
import { coachTurn, type Ask } from '@/lib/coach/chat';
import { CoachError, askCoach } from '@/lib/coach-client';

type Update = (fn: (s: GameState) => GameState) => void;

const busy = (s: GameState) => !!s.draft && Object.values(s.draft.sets).some((l) => l.length > 0);
/** Same save, same workout: the seed is the workouts done and the day of setup. */
const seedOf = (s: GameState) => s.sessions.length * 7919 + new Date(s.coach?.profile?.setupAt ?? 0).getTime() / 1000;

/** Keeps a week ready once the coach is set up: after setup, and when the week is done or over.
    The built-in coach plans it; ask the flame to change any of it. */
export function useCoachPlan(state: GameState, update: Update) {
  const coach = state.coach;
  const want = !!coach?.profile && !busy(state) && weekOver(coach.week, new Date());
  useEffect(() => {
    if (!want) return;
    let gone = false;
    loadLibrary().then((all) => {
      if (gone) return;
      update((s) => {
        const c = s.coach;
        if (!c?.profile || busy(s)) return s;
        const now = new Date();
        if (!weekOver(c.week, now)) return s;
        const week = buildWeek({ all, coach: c, sessions: s.sessions, now, rng: seeded(seedOf(s)) });
        return week ? { ...s, coach: { ...c, week } } : s;
      });
    });
    return () => {
      gone = true;
    };
  }, [want, update]);
}

/** Before changing the built-in plan's workout: turn it into a plan with choices. */
export function ensurePlan(update: Update): Promise<void> {
  return loadLibrary().then((all) => update((s) => (currentPlan(s.coach) ? s : setPlan(s, planFromQuest(s, all, new Date())))));
}

/** The chat with the coach: send a line (or nothing, for the coach to start), and whether it is
    thinking. Tools change the save as they run; a word it can't say comes back as `error`. */
export function useCoachChat(state: GameState, update: Update, ask: Ask = askCoach) {
  const ref = useRef(state);
  ref.current = state;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const send = useCallback(
    async (text?: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        const all = await loadLibrary();
        let n = 0;
        await coachTurn({
          text,
          get: () => ref.current,
          // The save changes at once here too, so the next round reads what the last one wrote.
          set: (fn) => {
            ref.current = fn(ref.current);
            update(fn);
          },
          ask,
          ctx: () => ({ all, now: new Date(), id: () => `${Date.now().toString(36)}${(n++).toString(36)}`, rng: seeded(Date.now()) }),
        });
      } catch (e) {
        setError(e instanceof CoachError ? e.message : 'Something went wrong. Try again?');
      } finally {
        setBusy(false);
      }
    },
    [busy, update, ask],
  );
  return { send, busy, error };
}

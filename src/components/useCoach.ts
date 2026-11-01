'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { loadLibrary } from '@/exercises/library';
import type { GameState } from '@/lib/game';
import { seeded } from '@/lib/random';
import { planFromQuest } from '@/lib/coach/plan';
import { aiPlanDue, currentPlan, needsPlan, planAhead, setPlan } from '@/lib/coach/week';
import { coachTurn, planAsk, type Ask } from '@/lib/coach/chat';
import { CoachError, askCoach } from '@/lib/coach-client';

type Update = (fn: (s: GameState) => GameState) => void;

const busy = (s: GameState) => !!s.draft && Object.values(s.draft.sets).some((l) => l.length > 0);
/** Same save, same workout: the seed is the workouts done and the day of setup. */
const seedOf = (s: GameState) => s.sessions.length * 7919 + new Date(s.coach?.profile?.setupAt ?? 0).getTime() / 1000;

/** Keeps two weeks ready once the coach is set up: this week and the next. After setup, on a new
    Monday, and when next week isn't planned yet. The built-in coach plans it; ask the flame to
    change any of it. */
export function useCoachPlan(state: GameState, update: Update) {
  const coach = state.coach;
  const want = !!coach?.profile && !busy(state) && needsPlan(coach.week, new Date());
  useEffect(() => {
    if (!want) return;
    let gone = false;
    loadLibrary().then((all) => {
      if (gone) return;
      update((s) => {
        const c = s.coach;
        if (!c?.profile || busy(s)) return s;
        const now = new Date();
        if (!needsPlan(c.week, now)) return s;
        const week = planAhead({ all, coach: c, sessions: s.sessions, now, rng: seeded(seedOf(s)) });
        return week ? { ...s, coach: { ...c, week } } : s;
      });
    });
    return () => {
      gone = true;
    };
  }, [want, update]);
}

/** The coach plans a week on its own, from the log, when one is due (`aiPlanDue`): next week as
    soon as this week's last workout is done. In the background, once per week; its words land in
    the chat and on the flame's card. `on`: signed in, on the real save. A failed try is tried
    again the next time the app opens. */
export function useCoachAutoPlan(state: GameState, update: Update, on: boolean, ask: Ask = askCoach) {
  const ref = useRef(state);
  ref.current = state;
  const tried = useRef<string | null>(null);
  const due = on && !busy(state) ? aiPlanDue(state.coach, new Date()) : null;
  useEffect(() => {
    if (!due || tried.current === due.id) return;
    tried.current = due.id;
    let n = 0;
    loadLibrary()
      .then((all) =>
        coachTurn({
          text: planAsk(due.which),
          get: () => ref.current,
          set: (fn) => {
            ref.current = fn(ref.current);
            update(fn);
          },
          ask,
          ctx: () => ({ all, now: new Date(), id: () => `${Date.now().toString(36)}${(n++).toString(36)}`, rng: seeded(Date.now()) }),
        }),
      )
      .then(() => update((s) => (s.coach ? { ...s, coach: { ...s.coach, autoPlan: due.id } } : s)))
      .catch(() => {
        // Offline or the server said no: the draft stays, and it is tried again next time.
      });
    // Runs when a new week falls due, not on every save change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [due?.id, update, ask]);
}

/** Before changing the built-in plan's workout: turn it into a plan with choices. */
export function ensurePlan(update: Update): Promise<void> {
  return loadLibrary().then((all) => update((s) => (currentPlan(s.coach) ? s : setPlan(s, planFromQuest(s, all, new Date())))));
}

/** The chat with the coach: send a line (or nothing, for the coach to start, or to try again), whether
    it is thinking, and what it did so far this turn (`steps`, from `since`). Tools change the save
    as they run; a word it can't say comes back as `error`. */
export function useCoachChat(state: GameState, update: Update, ask: Ask = askCoach) {
  const ref = useRef(state);
  ref.current = state;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [since, setSince] = useState(0);
  const send = useCallback(
    async (text?: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      setSteps([]);
      setSince(Date.now());
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
          // The same step twice in a row (three searches) shows once.
          onStep: (label) => setSteps((s) => (s[s.length - 1] === label ? s : [...s, label])),
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
  return { send, busy, error, steps, since };
}

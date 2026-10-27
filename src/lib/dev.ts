'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GameState, Session } from './game';
import { NO_FOG, ZONES } from './fog';
import { pendingScenes } from '@/story/engine';
import { dayKey } from './days';

/* Developer mode: shortcuts for trying the app without training for real or replaying the
   opening. It is always on in previews and on localhost. On the live app it is on too while
   there are no other players (Edoardo's call); it can be turned off from its panel, and seven taps
   on the FORMA name turn it back on. */

const LIVE_HOST = 'forma-nu-red.vercel.app';
const KEY = 'forma-dev';

export function useDevMode() {
  const [dev, setDev] = useState(false);
  const [live, setLive] = useState(true);

  useEffect(() => {
    const onLive = window.location.hostname === LIVE_HOST;
    setLive(onLive);
    let off = false;
    try {
      off = localStorage.getItem(KEY) === '0';
    } catch {
      // Storage blocked: dev mode just stays on.
    }
    setDev(!onLive || !off);
  }, []);

  const toggle = useCallback(
    (on: boolean) => {
      try {
        localStorage.setItem(KEY, on ? '1' : '0');
      } catch {
        // Not saved; it still applies for this visit.
      }
      setDev(on || !live);
    },
    [live],
  );

  /** On previews dev mode can't be turned off. */
  return { dev, live, toggle };
}

/**
 * `?fast` on a preview or localhost: text appears at once and camera moves are quick, so scripts
 * (and impatient developers) can play through the story in a hurry. Never on the live app.
 */
export function fastStory(): boolean {
  if (typeof window === 'undefined' || window.location.hostname === LIVE_HOST) return false;
  return new URLSearchParams(window.location.search).has('fast');
}

/** Story scenes that are due right now, marked as seen so they don't play. */
function skipDueScenes(state: GameState, now: Date): GameState {
  const due = pendingScenes(state, now).map((s) => s.id);
  return due.length ? { ...state, seenScenes: [...state.seenScenes, ...due] } : state;
}

/** A hero who just finished the opening: no letter to write, no placement, no fight. */
export function skipIntro(state: GameState, now: Date): GameState {
  return skipDueScenes(
    {
      ...state,
      profile: {
        ...state.profile,
        onboarded: true,
        voice: state.profile.voice || 'You always quit.',
        letter: state.profile.letter.why
          ? state.profile.letter
          : { why: 'I want to feel strong again', want: 'do ten pull-ups', forWho: 'me', remind: 'I already did this once' },
      },
    },
    now,
  );
}

/**
 * Pretend `n` workouts were done. They land after the last real one and end now, at most
 * two days apart, so the newest is always today.
 */
export function addFakeWorkouts(state: GameState, n: number, now: Date, skipStory: boolean): GameState {
  const last = state.sessions[state.sessions.length - 1];
  const end = now.getTime();
  const earliest = last ? new Date(last.date).getTime() + 60_000 : -Infinity;
  const start = Math.min(end, Math.max(earliest, end - 2 * 86_400_000 * (n - 1)));
  const step = n > 1 ? (end - start) / (n - 1) : 0;
  const added: Session[] = Array.from({ length: n }, (_, i) => ({
    id: `dev-${end}-${i}`,
    date: new Date(start + step * i).toISOString(),
    kind: 'full',
    day: (state.sessions.length + i) % 2 === 0 ? 'A' : 'B',
    xp: 100,
    breakdown: [{ label: 'Dev workout', xp: 100 }],
    entries: [],
    unlocked: [],
  }));
  const next = { ...state, sessions: [...state.sessions, ...added] };
  return skipStory ? skipDueScenes(next, now) : next;
}

/**
 * Move every workout back in time so the last one was `daysAgo` days ago: 1 makes today a rest
 * day, 8 makes you someone coming back after a long time.
 */
export function lastWorkoutAgo(state: GameState, daysAgo: number, now: Date): GameState {
  const last = state.sessions[state.sessions.length - 1];
  if (!last) return state;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 18).getTime();
  const shift = new Date(last.date).getTime() - target;
  return { ...state, sessions: state.sessions.map((s) => ({ ...s, date: new Date(new Date(s.date).getTime() - shift).toISOString() })) };
}

/** Train `n` days in a row ending today, after the last real workout (for the smoky flame). */
export function trainDaysInRow(state: GameState, n: number, now: Date): GameState {
  let s = lastWorkoutAgo(state, n, now);
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, Math.min(now.getHours(), 20));
    // The story scenes the run of days unlocks stay, so the last day can show the smoky flame.
    s = addFakeWorkouts(s, 1, day, i > 0);
  }
  return s;
}

/** Forget today's page of the Book of Days, so its line and quote are picked again. */
export function newDayPage(state: GameState, now: Date): GameState {
  const key = dayKey(now);
  return { ...state, days: (state.days ?? []).filter((d) => d.day !== key) };
}

/** Beat the boss of the next zone without playing it. */
export function clearNextZone(state: GameState): GameState {
  const fog = state.fog ?? NO_FOG;
  return { ...state, fog: { ...fog, cleared: Math.min(ZONES.length, fog.cleared + 1) } };
}

export function resetFog(state: GameState): GameState {
  return { ...state, fog: NO_FOG };
}

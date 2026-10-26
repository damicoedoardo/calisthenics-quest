'use client';

import { useCallback, useEffect, useState } from 'react';
import type { GameState, Session } from './game';
import { NO_FOG, ZONES } from './fog';
import { pendingScenes } from './story';

/* Developer mode: shortcuts for trying the app without training for real or replaying the
   opening. It is always on in previews and on localhost. On the live app it stays hidden until
   unlocked by tapping the FORMA name seven times. */

const LIVE_HOST = 'forma-nu-red.vercel.app';
const KEY = 'forma-dev';

export function useDevMode() {
  const [dev, setDev] = useState(false);
  const [live, setLive] = useState(true);

  useEffect(() => {
    const onLive = window.location.hostname === LIVE_HOST;
    setLive(onLive);
    let unlocked = false;
    try {
      unlocked = localStorage.getItem(KEY) === '1';
    } catch {
      // Storage blocked: dev mode just stays off on the live app.
    }
    setDev(!onLive || unlocked);
  }, []);

  const toggle = useCallback(
    (on: boolean) => {
      try {
        if (on) localStorage.setItem(KEY, '1');
        else localStorage.removeItem(KEY);
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
          : { why: 'I want to feel strong again', want: 'ten pull-ups', forWho: 'me', remind: 'I already did this once' },
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

/** Beat the boss of the next zone without playing it. */
export function clearNextZone(state: GameState): GameState {
  const fog = state.fog ?? NO_FOG;
  return { ...state, fog: { ...fog, cleared: Math.min(ZONES.length, fog.cleared + 1) } };
}

export function resetFog(state: GameState): GameState {
  return { ...state, fog: NO_FOG };
}

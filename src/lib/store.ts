'use client';

import { useCallback, useEffect, useState } from 'react';
import { initialState, migrate, type GameState } from './game';

const KEY = 'forma-state-v1';
/** A separate save for trying things (/lab/night opens the app with ?sandbox): the real save is never read or written. */
export const SANDBOX_KEY = 'forma-sandbox-v1';

/** True when this page was opened as a sandbox. */
export function inSandbox(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('sandbox');
}

/** The developer's own save, used while developer mode is on (src/lib/dev.ts): the real save is never read or written. */
export const DEV_SAVE_KEY = 'forma-dev-save-v1';
/** '1' while developer mode is on on this phone. */
const DEV_ON_KEY = 'forma-dev-on';

/** Developer mode is on: the app plays the developer save. */
export function devSaveOn(): boolean {
  if (typeof window === 'undefined' || inSandbox()) return false;
  try {
    return localStorage.getItem(DEV_ON_KEY) === '1';
  } catch {
    return false;
  }
}

/** A save that never reaches the cloud, friends, parties or play stats: the sandbox or the developer save. */
export const offRecord = () => inSandbox() || devSaveOn();

/**
 * Turn developer mode on or off on this phone, then reload onto the other save. The first time it
 * is turned on, the developer save starts as a copy of the real one; after that it is kept.
 */
export function switchDevSave(on: boolean) {
  try {
    if (on && !localStorage.getItem(DEV_SAVE_KEY)) {
      const real = localStorage.getItem(KEY);
      if (real) localStorage.setItem(DEV_SAVE_KEY, real);
    }
    if (on) localStorage.setItem(DEV_ON_KEY, '1');
    else localStorage.removeItem(DEV_ON_KEY);
  } catch {
    // Storage blocked: nothing to switch.
  }
  window.location.reload();
}

/** Start the developer save over as a copy of the real save (or empty), then reload. */
export function resetDevSave(fromReal: boolean) {
  try {
    const real = localStorage.getItem(KEY);
    if (fromReal && real) localStorage.setItem(DEV_SAVE_KEY, real);
    else localStorage.removeItem(DEV_SAVE_KEY);
  } catch {
    // Storage blocked.
  }
  window.location.reload();
}

const key = () => (inSandbox() ? SANDBOX_KEY : devSaveOn() ? DEV_SAVE_KEY : KEY);

/** Start over from scratch: drop the save this page plays (the real one, or the sandbox or
    developer save), then reload onto the opening. Settings and sign-in stay. */
export function wipeSave() {
  try {
    localStorage.removeItem(key());
  } catch {
    // Storage blocked: there was no save to drop.
  }
  window.location.reload();
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(key());
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    // Private mode or corrupt data: start fresh rather than crash.
  }
  return initialState();
}

function save(state: GameState) {
  try {
    localStorage.setItem(key(), JSON.stringify(state));
  } catch {
    // Storage full or blocked; the in-memory state still works for this visit.
  }
}

/** Game state persisted on this device. `ready` is false until loaded on the client. */
export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
    // Ask the browser not to evict our data under storage pressure.
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  const update = useCallback((fn: (s: GameState) => GameState) => {
    setState((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  return { state, ready, update };
}

export function exportState(state: GameState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImport(raw: string): GameState | null {
  try {
    const parsed = JSON.parse(raw) as { version?: number; sessions?: unknown };
    if (![1, 2, 3].includes(parsed?.version ?? 0) || !Array.isArray(parsed.sessions)) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

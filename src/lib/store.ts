'use client';

import { useCallback, useEffect, useState } from 'react';
import { initialState, migrate, type GameState } from './game';

const KEY = 'forma-state-v1';

function load(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrate(JSON.parse(raw));
  } catch {
    // Private mode or corrupt data: start fresh rather than crash.
  }
  return initialState();
}

function save(state: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
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
    const parsed = JSON.parse(raw) as { version?: number; progress?: unknown; sessions?: unknown };
    if ((parsed?.version !== 1 && parsed?.version !== 2) || !parsed.progress || !Array.isArray(parsed.sessions)) return null;
    return migrate(parsed);
  } catch {
    return null;
  }
}

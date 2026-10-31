'use client';

import { useSyncExternalStore } from 'react';

/* Gym mode (You > Settings): once a workout starts, it drops the pixel look for a plain, modern
   one, so the game stays out of the way at the gym. The rest of the app keeps its look. The look is
   CSS: page.tsx wraps the workout in a `gym` class that swaps the colors, the font and the pixel
   edges (globals.css). Kept on this phone only, like the music setting. */

const KEY = 'forma-gym-mode';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setGymMode(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {}
  listeners.forEach((fn) => fn());
}

/** Is gym mode on? Off on the server and in a first paint. */
export function useGymMode(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    read,
    () => false,
  );
}

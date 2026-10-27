'use client';

import { useSyncExternalStore } from 'react';

/** Played with a mouse or trackpad and a keyboard: the Fog shows its keys then. Laptops of any size,
    including a short window that gets the sideways layout (unlike the `desk:` variant). */
const KEYS_QUERY = '(hover: hover) and (pointer: fine)';

function subscribe(on: () => void) {
  const q = window.matchMedia?.(KEYS_QUERY);
  q?.addEventListener('change', on);
  return () => q?.removeEventListener('change', on);
}

/** True on a computer: the run's buttons show their keys and the tips talk about keys, not thumbs. */
export function useKeyboardPlay(): boolean {
  return useSyncExternalStore(subscribe, () => !!window.matchMedia?.(KEYS_QUERY).matches, () => false);
}

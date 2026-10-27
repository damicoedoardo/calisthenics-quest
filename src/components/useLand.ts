'use client';

import { useSyncExternalStore } from 'react';

/** A phone held sideways: the same query as the `land:` variant in tailwind.config.ts. */
export const LAND_QUERY = '(orientation: landscape) and (max-height: 600px)';

const query = () => (typeof window === 'undefined' ? null : window.matchMedia?.(LAND_QUERY) ?? null);

function subscribe(on: () => void) {
  const q = query();
  q?.addEventListener('change', on);
  return () => q?.removeEventListener('change', on);
}

/** True while the phone is held sideways. The tabs use it to lay out a screen of their own then. */
export function useLand(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !!query()?.matches,
    () => false,
  );
}

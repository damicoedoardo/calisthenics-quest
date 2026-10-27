'use client';

import { createContext, useContext, useSyncExternalStore } from 'react';

/** A phone held sideways: the same query as the `land:` variant and the overlays' sideways classes. */
const SIDEWAYS = '(orientation: landscape) and (max-height: 600px)';

const noSubscribe = () => () => {};

function subscribe(onChange: () => void) {
  const q = window.matchMedia?.(SIDEWAYS);
  q?.addEventListener('change', onChange);
  return () => q?.removeEventListener('change', onChange);
}

/** Whether the phone is held sideways (always false in the server render). */
export function useSideways(): boolean {
  return useSyncExternalStore(subscribe, () => !!window.matchMedia?.(SIDEWAYS).matches, () => false);
}

/**
 * Inside it, held sideways, every <Sprite> is drawn at a whole multiple of its frame (64 becomes
 * 128 or 192, never 140), so its pixels come out square and even. The story's scenes use it;
 * upright, and anywhere outside it, sizes stay as given.
 */
export const PixelSnap = createContext(false);

/** The size a sprite is drawn at: `size`, or held sideways inside <PixelSnap>, the nearest whole multiple of `frame`. */
export function useSnappedSize(size: number, frame: number | undefined): number {
  const snap = useContext(PixelSnap),
    // Only sprites inside <PixelSnap> listen for the phone turning.
    sideways = useSyncExternalStore(snap ? subscribe : noSubscribe, () => snap && !!window.matchMedia?.(SIDEWAYS).matches, () => false);
  if (!sideways || !frame) return size;
  return Math.max(1, Math.round(size / frame)) * frame;
}

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { normalizeLook } from '@/sprites/characters/hero';
import type { Look } from '@/sprites/engine/figure';

/* The player's look: one value shared by every hero sprite on screen (you, the Echo, the Best Self
   and the Hollow). The editor to change it is in LookEditor.tsx. */

const LookContext = createContext<Look>(normalizeLook());

export function LookProvider({ look, children }: { look?: Partial<Look> | null; children: ReactNode }) {
  return <LookContext.Provider value={normalizeLook(look)}>{children}</LookContext.Provider>;
}

/** The look heroes are drawn with, from the nearest LookProvider. */
export const useLook = () => useContext(LookContext);

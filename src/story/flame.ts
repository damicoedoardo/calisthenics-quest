import type { FlameStage as FlameStageId } from '@/sprites/characters/ember';
import type { HeroVariant } from '@/sprites/characters/hero';

/* Your flame: it grows with your workouts. Each stage changes how it looks (src/sprites/characters/ember.ts
   draws every stage) and what it does for you. */

export type { FlameStageId };

export interface FlameStage {
  id: FlameStageId;
  /** Workouts it takes. */
  at: number;
  name: string;
  /** What it does for you, shown on the Play tab. */
  gives: string;
}

export const FLAME_STAGES: FlameStage[] = [
  { id: 'spark', at: 0, name: 'Spark', gives: 'A flame circles you in the Fog after your first workout.' },
  { id: 'candle', at: 6, name: 'Candle', gives: 'Two flames circle you in the Fog.' },
  { id: 'torch', at: 15, name: 'Little fairy', gives: 'Three flames, and it holds your rest timer during workouts.' },
  { id: 'bonfire', at: 30, name: 'Fairy', gives: 'Four flames, and it throws fireballs in the Fog.' },
  { id: 'fairy', at: 50, name: 'Fire fairy', gives: "It flies beside you and heals you a little when you're low." },
];

/** The name used until the player gives one, and if they skip. */
export const DEFAULT_FLAME_NAME = 'Ember';

export function flameStage(workouts: number): FlameStage {
  return [...FLAME_STAGES].reverse().find((s) => workouts >= s.at) ?? FLAME_STAGES[0];
}

export const stageIndex = (id: FlameStageId) => FLAME_STAGES.findIndex((s) => s.id === id);

/** In the finale your flame fuses with you: from then on your hero burns with it. */
export const fused = (seenScenes: string[]) => seenScenes.includes('finale');

/** How your hero is drawn outside story scenes: on fire, once the flame lives in you. */
export const heroVariant = (state: { seenScenes: string[] }): HeroVariant => (fused(state.seenScenes) ? 'kindled' : 'normal');

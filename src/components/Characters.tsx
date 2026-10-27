import { Hero } from './Hero';
import { Sprite } from './Sprite';
import { useLook } from './Look';
import { makeGear, uniformGear, type ClassId, type Gear, type GearSlot } from '@/lib/gear';
import type { FlameFace, FlameStage } from '@/sprites/characters/ember';

/* The story's cast as components. The art for each lives in src/sprites. */

export function Wanderer({ size = 64 }: { size?: number }) {
  return <Sprite id="wanderer" size={size} />;
}

interface EmberProps {
  size?: number;
  dim?: boolean;
  /** How grown the flame is; the candle is the classic look. */
  stage?: FlameStage;
  mood?: FlameFace;
}

/** Your flame: it grows with your workouts and shows how it feels. */
export function Ember({ size = 48, dim = false, stage = 'candle', mood = 'happy' }: EmberProps) {
  return <Sprite id="ember" size={size} opts={{ stage, mood }} className={`animate-flicker ${dim ? 'opacity-50' : ''}`} />;
}

/** The flame's true form: a kid made of fire, with the player's hair as flame. */
export function Kindled({ size = 64, wave = false }: { size?: number; wave?: boolean }) {
  const { style } = useLook();
  return <Sprite id="kindled" size={size} action={wave ? 'attack' : 'idle'} opts={{ hair: style === 'long' || style === 'pony' ? 'long' : 'short' }} />;
}

const SHADOW_GEAR = { ...uniformGear(undefined, 0), weapon: makeGear('weapon', 1, undefined) };

interface HollowProps {
  size?: number;
  bounce?: boolean;
  /** The Hollow wears your shape: pass your gear and class to mirror them. */
  gear?: Record<GearSlot, Gear>;
  classId?: ClassId;
  action?: number;
}

/** The Hollow: your own shape, emptied out. The voice that says you're not enough. */
export function Hollow({ size = 64, bounce = true, gear = SHADOW_GEAR, classId, action }: HollowProps) {
  return <Hero gear={gear} classId={classId} size={size} variant="hollow" bounce={bounce} action={action} />;
}

/** The Book of Days: blank pages the player writes by training. */
export function Book({ size = 64 }: { size?: number }) {
  return <Sprite id="book" size={size} className="animate-float" />;
}

export type EnemyId = 'slime' | 'mirror' | 'golem' | 'hollow' | 'summit' | 'knight';

/** Each chapter's enemy as you meet it as the Fog's boss (the slime, Tomorrow, has no other form). */
export function Enemy({ id, size = 72 }: { id: EnemyId; size?: number }) {
  switch (id) {
    case 'mirror':
      return <Sprite id="mirrorBoss" size={size} label="The Mirror" />;
    case 'knight':
      return <Sprite id="knightBoss" opts={{ stage: 0 }} size={size} label="The Perfect Knight" />;
    case 'golem':
      return <Sprite id="plateauBoss" opts={{ stage: 0 }} size={size} label="The Plateau" />;
    case 'hollow':
      return <Sprite id="hollowBoss" size={size} label="The Hollow" />;
    case 'summit':
      return <Sprite id="summitBoss" size={size} label="The Summit" />;
    default:
      return <Sprite id={id} size={size} />;
  }
}

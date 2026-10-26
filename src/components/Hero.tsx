'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import type { HeroVariant } from '@/sprites/characters/hero';
import type { Look } from '@/sprites/engine/figure';
import { Sprite } from './Sprite';

interface HeroProps {
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  size?: number;
  /** Idle breathing loop. Off holds the first frame. */
  bounce?: boolean;
  /** "echo" paints the ghost of who you were; "best" adds the Best Self's cape; "hollow" is your shadow. */
  variant?: HeroVariant;
  look?: Look;
  /** Change this number to play the class attack once (swing, shot or cast). */
  action?: number;
}

/** Your hero. The art lives in src/sprites; this only decides when to attack. */
export function Hero({ gear, classId, size = 160, bounce = true, variant = 'normal', look, action = 0 }: HeroProps) {
  const acting = useAction(action);
  return (
    <Sprite
      key={acting.key}
      id="hero"
      opts={{ gear, classId, variant, look }}
      action={acting.on ? 'attack' : 'idle'}
      size={size}
      playing={acting.on || bounce}
      onEnd={acting.done}
      // The Hollow faces you, so it is drawn mirrored.
      flip={variant === 'hollow'}
    />
  );
}

/** Plays a one-shot animation each time `action` changes after mount. */
export function useAction(action: number) {
  const [on, setOn] = useState(false);
  const first = useRef(action);
  useEffect(() => {
    if (action !== first.current) setOn(true);
  }, [action]);
  return { on, key: on ? `act-${action}` : 'idle', done: () => setOn(false) };
}

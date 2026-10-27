'use client';

import { useEffect, useRef, useState } from 'react';
import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import type { HeroVariant } from '@/sprites/characters/hero';
import type { Look } from '@/sprites/engine/figure';
import { useLook } from './Look';
import { PlusGlow } from './PlusGlow';
import { Sprite } from './Sprite';

interface HeroProps {
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  size?: number;
  /** Idle breathing loop. Off holds the first frame. */
  bounce?: boolean;
  /** "echo" paints the ghost of who you were; "best" adds the Best Self's cape; "hollow" is your shadow. */
  variant?: HeroVariant;
  /** Defaults to the player's look (see LookProvider). */
  look?: Look;
  /** Change this number to play the class attack once (swing, shot or cast). */
  action?: number;
}

/** Your hero. The art lives in src/sprites; this only decides when to attack. */
export function Hero({ gear, classId, size = 160, bounce = true, variant = 'normal', look, action = 0 }: HeroProps) {
  const acting = useAction(action);
  const yours = useLook();
  // The best-forged thing worn lights the hero from +4 (a new look every few pluses).
  const top = Object.values(gear).reduce<Gear | null>((b, g) => (g.item && (g.plus ?? 0) > (b?.plus ?? 0) ? g : b), null);
  const sprite = (
    <Sprite
      key={acting.key}
      id="hero"
      opts={{ gear, classId, variant, look: look ?? yours }}
      action={acting.on ? 'attack' : 'idle'}
      size={size}
      playing={acting.on || bounce}
      onEnd={acting.done}
      // The Hollow faces you, so it is drawn mirrored.
      flip={variant === 'hollow'}
    />
  );
  if (!top?.item || (top.plus ?? 0) < 4 || variant !== 'normal') return sprite;
  return (
    <span className="relative inline-block align-top" style={{ width: size, height: size }}>
      <PlusGlow item={{ plus: top.plus, rarity: top.item.rarity }} round="rounded-full" behind />
      <span className="relative">{sprite}</span>
    </span>
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

'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import { heroSheet, type HeroVariant } from '@/lib/sprite64/cast';
import { SpriteSheet, useSheet } from './SpriteSheet';

interface HeroProps {
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  size?: number;
  /** Idle breathing loop. Off holds the first frame. */
  bounce?: boolean;
  /** "echo" paints the ghost of who you were; "best" adds the Best Self's cape; "hollow" is your shadow. */
  variant?: HeroVariant;
  /** Change this number to play the class attack once (swing, shot or cast). */
  action?: number;
}

const LOOKS: Record<HeroVariant, CSSProperties | undefined> = {
  normal: undefined,
  best: undefined,
  echo: { opacity: 0.88, filter: 'drop-shadow(0 0 6px rgba(251,191,36,.55))' },
  hollow: { filter: 'drop-shadow(0 0 6px rgba(124,58,237,.6))' },
};

/** Your hero as a 64x64 sprite, in the same style as the specialist cards. */
export function Hero({ gear, classId, size = 160, bounce = true, variant = 'normal', action = 0 }: HeroProps) {
  const acting = useAction(action);
  const idle = useSheet(() => heroSheet({ gear, classId, variant }));
  const attack = useSheet(() => (acting.on ? heroSheet({ gear, classId, variant, mode: 'action' }) : ''));
  const label =
    variant === 'echo'
      ? 'The Echo, the ghost of who you were'
      : variant === 'hollow'
        ? 'The Hollow, your shadow'
        : `Hero with ${gear.weapon.name}, ${gear.armor.name} and ${gear.shield.name}`;

  return (
    <div className="relative" style={{ width: size, height: size, ...LOOKS[variant] }}>
      <div className="absolute bottom-[2%] left-1/2 h-[4%] w-[44%] -translate-x-1/2 rounded-[50%] bg-black/35" aria-hidden />
      <SpriteSheet
        key={acting.key}
        src={acting.on ? attack : idle}
        size={size}
        playing={bounce}
        once={acting.on}
        onEnd={acting.done}
        // The Hollow faces you, so it is drawn mirrored.
        flip={variant === 'hollow'}
        label={label}
        className="relative"
      />
    </div>
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

'use client';

import { useSyncExternalStore, type CSSProperties } from 'react';

const noSubscribe = () => () => {};

/**
 * Builds a sprite sheet in the browser only. The server render gets '' and the client fills in
 * right after hydration, so the two never disagree. `build` must return the same string for the
 * same inputs (the sheet builders cache theirs).
 */
export function useSheet(build: () => string): string {
  return useSyncExternalStore(noSubscribe, build, () => '');
}

interface SpriteSheetProps {
  /** A 4-frame horizontal sheet, each frame square. */
  src: string;
  size: number;
  /** Loop the 4 frames. Off shows frame 0. */
  playing?: boolean;
  /** Play the 4 frames once, then call onEnd. */
  once?: boolean;
  onEnd?: () => void;
  flip?: boolean;
  label: string;
  className?: string;
  style?: CSSProperties;
}

/** Shows a 4-frame 64x64 sprite sheet at `size` pixels, crisp when scaled up. */
export function SpriteSheet({ src, size, playing = true, once = false, onEnd, flip = false, label, className = '', style }: SpriteSheetProps) {
  const anim = once ? 'animate-sprite-once' : playing ? 'animate-sprite' : '';
  return (
    <div
      role="img"
      aria-label={label}
      className={`${anim} bg-no-repeat ${className}`}
      onAnimationEnd={once ? onEnd : undefined}
      style={
        {
          '--s': `${size}px`,
          width: size,
          height: size,
          backgroundImage: src ? `url(${src})` : undefined,
          backgroundSize: `${size * 4}px ${size}px`,
          // Below 1:1 a smooth downscale reads better than dropped pixels.
          imageRendering: size >= 64 ? 'pixelated' : 'auto',
          transform: flip ? 'scaleX(-1)' : undefined,
          ...style,
        } as CSSProperties
      }
    />
  );
}

'use client';

import { useSyncExternalStore, type CSSProperties } from 'react';
import type { SpriteAction } from '@/sprites/clips';
import { labelFor, presentationFor, sheetFor, type Sheet, type SpriteId, type SpriteOpts } from '@/sprites/registry';

const noSubscribe = () => () => {};

/** The sheet for a sprite's action, or null during the server render. */
export function useSheet<I extends SpriteId>(id: I, action: SpriteAction, opts?: Partial<SpriteOpts<I>>): Sheet | null {
  return useSyncExternalStore<Sheet | null>(noSubscribe, () => sheetFor(id, action, opts), () => null);
}

interface SpriteProps<I extends SpriteId> {
  id: I;
  opts?: Partial<SpriteOpts<I>>;
  action?: SpriteAction;
  /** Width in CSS pixels; height follows the frame's shape. */
  size?: number;
  /** Off holds the first frame. */
  playing?: boolean;
  /** Called when a clip that doesn't loop finishes. */
  onEnd?: () => void;
  flip?: boolean;
  label?: string;
  className?: string;
}

/**
 * Any sprite from the registry, animated with CSS steps(). The sheet is built in the browser, so
 * the server render is an empty box of the right size that fills in right after hydration.
 */
export function Sprite<I extends SpriteId>({ id, opts, action = 'idle', size = 64, playing = true, onEnd, flip = false, label, className = '' }: SpriteProps<I>) {
  const sheet = useSheet(id, action, opts);
  const look = presentationFor(id, opts);
  const w = size,
    h = sheet ? (size * sheet.h) / sheet.w : size,
    animate = playing && !!sheet && sheet.frames > 1;

  return (
    <div className={`relative ${className}`} style={{ width: w, height: h, opacity: look.opacity, filter: look.filter }}>
      {look.shadow && <div className="absolute bottom-[2%] left-1/2 h-[4%] w-[44%] -translate-x-1/2 rounded-[50%] bg-black/35" aria-hidden />}
      <div
        role="img"
        aria-label={label ?? labelFor(id, opts)}
        className="relative bg-no-repeat"
        onAnimationEnd={onEnd}
        style={
          sheet
            ? ({
                '--fw': `${w}px`,
                '--n': String(sheet.frames),
                '--y': `${-sheet.row * h}px`,
                width: w,
                height: h,
                backgroundImage: `url(${sheet.src})`,
                backgroundSize: `${sheet.columns * w}px ${sheet.rows * h}px`,
                backgroundPosition: `0 ${-sheet.row * h}px`,
                // Scaling up stays crisp; below 1:1 a smooth downscale reads better than dropped pixels.
                imageRendering: w >= sheet.w ? 'pixelated' : 'auto',
                animation: animate ? `sprite ${sheet.frames * sheet.ms}ms steps(${sheet.frames}) ${sheet.loop ? 'infinite' : '1'}` : undefined,
                transform: flip ? 'scaleX(-1)' : undefined,
              } as CSSProperties)
            : { width: w, height: h }
        }
      />
    </div>
  );
}

'use client';

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { PLACES, type PlaceId } from '@/story/places';
import { PLACE_H, PLACE_W, placeBlinks, placeImage, type PlaceCanvas } from '@/sprites/places';
import { useSideways } from './sideways';

const noSubscribe = () => () => {};

/** Held sideways, about this many rows of the picture fill the box's height. */
const ROWS_SIDEWAYS = 125;
/** The row kept in the middle of the box: just above the horizon, so sky, land and ground all show. */
const MIDDLE_ROW = 100;

/**
 * How a backdrop fills a short, wide box: drawn wider (places are code, so there is more of the
 * place to the sides) and scaled by a whole number, so every pixel is the same square. The props'
 * stage sits around `stage` (a fraction of the box's width), where the person speaking stands.
 */
function sidewaysFit(box: { w: number; h: number }, stage: number) {
  const k = Math.max(1, Math.round(box.h / ROWS_SIDEWAYS)),
    // A little wider than the box, rounded to an even width so a few pixels of resizing reuse it.
    w = Math.max(PLACE_W, 2 * Math.ceil((box.w / k + 2) / 2)),
    x = Math.round((box.w - w * k) / 2),
    y = Math.round(Math.min(0, Math.max(box.h - PLACE_H * k, box.h / 2 - MIDDLE_ROW * k))),
    canvas: PlaceCanvas = { w, st: Math.round((stage * box.w - x) / k - PLACE_W / 2) };
  return { canvas, style: { backgroundSize: `${w * k}px ${PLACE_H * k}px`, backgroundPosition: `${x}px ${y}px`, backgroundRepeat: 'no-repeat' } };
}

/**
 * A story place's backdrop, filling its box. Drawn in the browser, so the server render is empty.
 * A scene passes `stage` (where the person speaking stands, as a fraction of the box's width when
 * held sideways); then, held sideways, the picture is drawn to fit the box at a whole-number scale
 * instead of being cropped from the tall upright one. Upright it always covers the box from the bottom.
 */
export function PlaceBackdrop({ id, className = '', stage }: { id: PlaceId; className?: string; stage?: number }) {
  const spec = PLACES[id],
    blinks = placeBlinks(spec),
    sideways = useSideways() && stage !== undefined,
    ref = useRef<HTMLDivElement>(null),
    [box, setBox] = useState<{ w: number; h: number } | null>(null);

  // Held sideways, the picture follows the box's size (offsetWidth: its layout, not the camera's transform).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!sideways || !el) return;
    const measure = () => setBox((b) => (b && b.w === el.offsetWidth && b.h === el.offsetHeight ? b : { w: el.offsetWidth, h: el.offsetHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sideways]);

  const fit = sideways && box && box.w > 0 && box.h > 0 ? sidewaysFit(box, stage ?? 0.5) : null,
    key = fit ? `${fit.canvas.w}|${fit.canvas.st}` : '',
    src = useSyncExternalStore(noSubscribe, () => placeImage(spec, false, fit?.canvas), () => null),
    lit = useSyncExternalStore(noSubscribe, () => (blinks ? placeImage(spec, true, fit?.canvas) : null), () => null);
  // Until a sideways box is measured, show nothing rather than the cropped upright picture.
  const pending = sideways && !fit,
    look = (url: string): CSSProperties => ({ backgroundImage: `url(${url})`, imageRendering: 'pixelated', ...fit?.style });

  return (
    <div ref={ref} role="img" aria-label={spec.name} data-fit={key || undefined} className={`relative bg-cover bg-bottom ${className}`} style={src && !pending ? look(src) : undefined}>
      {/* The same picture with its far lights on, flashed over the top (Vela's lamp: twice, then dark). */}
      {lit && !pending && <div aria-hidden className="absolute inset-0 animate-beacon bg-cover bg-bottom" style={look(lit)} />}
    </div>
  );
}

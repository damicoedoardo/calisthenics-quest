'use client';

import { useSyncExternalStore } from 'react';
import { PLACES, type PlaceId } from '@/story/places';
import { placeBlinks, placeImage } from '@/sprites/places';

const noSubscribe = () => () => {};

/** A story place's backdrop, filling its box. Drawn in the browser, so the server render is empty. */
export function PlaceBackdrop({ id, className = '' }: { id: PlaceId; className?: string }) {
  const spec = PLACES[id],
    blinks = placeBlinks(spec),
    src = useSyncExternalStore(noSubscribe, () => placeImage(spec), () => null),
    lit = useSyncExternalStore(noSubscribe, () => (blinks ? placeImage(spec, true) : null), () => null);
  return (
    <div
      role="img"
      aria-label={spec.name}
      className={`relative bg-cover bg-bottom ${className}`}
      style={src ? { backgroundImage: `url(${src})`, imageRendering: 'pixelated' } : undefined}
    >
      {/* The same picture with its far lights on, flashed over the top (Vela's lamp: twice, then dark). */}
      {lit && <div aria-hidden className="absolute inset-0 animate-beacon bg-cover bg-bottom" style={{ backgroundImage: `url(${lit})`, imageRendering: 'pixelated' }} />}
    </div>
  );
}

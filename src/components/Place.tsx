'use client';

import { useSyncExternalStore } from 'react';
import { PLACES, type PlaceId } from '@/story/places';
import { placeImage } from '@/sprites/places';

const noSubscribe = () => () => {};

/** A story place's backdrop, filling its box. Drawn in the browser, so the server render is empty. */
export function PlaceBackdrop({ id, className = '' }: { id: PlaceId; className?: string }) {
  const src = useSyncExternalStore(noSubscribe, () => placeImage(PLACES[id]), () => null);
  return (
    <div
      role="img"
      aria-label={PLACES[id].name}
      className={`bg-cover bg-bottom ${className}`}
      style={src ? { backgroundImage: `url(${src})`, imageRendering: 'pixelated' } : undefined}
    />
  );
}

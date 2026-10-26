'use client';

import { useMemo } from 'react';

export type WeatherKind = 'rain' | 'ash' | 'snow' | 'embers' | 'fog';

const LOOK: Record<Exclude<WeatherKind, 'fog'>, { count: number; dur: [number, number]; delay: number; className: string }> = {
  rain: { count: 40, dur: [0.7, 0.6], delay: 2, className: 'h-3 w-px animate-rain bg-sky-300/40' },
  ash: { count: 28, dur: [7, 6], delay: 9, className: 'h-1 w-1 animate-ash bg-slate-400/40' },
  snow: { count: 34, dur: [9, 7], delay: 12, className: 'h-1 w-1 animate-snow rounded-full bg-slate-100/70' },
  embers: { count: 22, dur: [6, 5], delay: 8, className: 'h-1 w-1 animate-rise bg-orange-400/80' },
};

/**
 * Rain, falling ash, snow, rising embers or drifting fog over the whole screen. `behind` keeps it
 * inside its (positioned) parent, under whatever comes after it.
 */
export function Weather({ kind, behind = false }: { kind: WeatherKind; behind?: boolean }) {
  const layer = behind ? 'pointer-events-none absolute inset-0 overflow-hidden' : 'pointer-events-none fixed inset-0 z-[60] overflow-hidden';
  const look = kind === 'fog' ? null : LOOK[kind];
  const drops = useMemo(
    () =>
      look
        ? Array.from({ length: look.count }).map(() => ({
            left: Math.random() * 100,
            top: kind === 'embers' ? 60 + Math.random() * 40 : 0,
            delay: Math.random() * look.delay,
            dur: look.dur[0] + Math.random() * look.dur[1],
          }))
        : [],
    [kind, look],
  );
  if (kind === 'fog')
    return (
      <div className={layer} aria-hidden>
        <div className="absolute -inset-x-1/4 top-[35%] h-1/3 animate-drift bg-gradient-to-b from-transparent via-slate-300/15 to-transparent blur-xl" />
        <div className="absolute -inset-x-1/4 top-[60%] h-1/4 animate-drift bg-gradient-to-b from-transparent via-emerald-200/10 to-transparent blur-xl [animation-delay:-7s]" />
      </div>
    );
  return (
    <div className={layer} aria-hidden>
      {drops.map((d, i) => (
        <span
          key={i}
          className={`absolute ${look!.className}`}
          style={{ left: `${d.left}%`, top: `${d.top}%`, animationDelay: `-${d.delay}s`, animationDuration: `${d.dur}s` }}
        />
      ))}
    </div>
  );
}

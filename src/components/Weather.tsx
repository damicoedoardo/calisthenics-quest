'use client';

import { useMemo } from 'react';

/** Rain or falling ash over the whole screen, behind nothing and in front of everything. */
export function Weather({ kind }: { kind: 'rain' | 'ash' }) {
  const drops = useMemo(
    () =>
      Array.from({ length: kind === 'rain' ? 40 : 28 }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * (kind === 'rain' ? 2 : 9),
        dur: kind === 'rain' ? 0.7 + Math.random() * 0.6 : 7 + Math.random() * 6,
      })),
    [kind],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {drops.map((d, i) => (
        <span
          key={i}
          className={kind === 'rain' ? 'absolute top-0 h-3 w-px animate-rain bg-sky-300/40' : 'absolute top-0 h-1 w-1 animate-ash bg-slate-400/40'}
          style={{ left: `${d.left}%`, animationDelay: `-${d.delay}s`, animationDuration: `${d.dur}s` }}
        />
      ))}
    </div>
  );
}

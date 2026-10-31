'use client';

import { useEffect, useState } from 'react';
import { INK, MUSCLE_NAME, WORKS, scene, type AnatomyId, type View } from '@/sprites/anatomy/body';

/** One rep, in seconds. */
const REP = 3.2;

/** The anatomy demo (sprites/anatomy/body.ts): the body doing one rep on a loop, the worked
    muscles colored in, an arrow lit for the way it moves. Still under reduced motion and for holds. */
export function AnatomyDemo({ exercise, view, label, className }: { exercise: AnatomyId; view: View; label: string; className?: string }) {
  const [t, setT] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (query.matches) {
      setStill(true);
      return;
    }
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      // About 30 frames a second is smooth enough and spares the phone.
      if (now - last > 32) {
        last = now;
        setT(((now - start) / 1000 / REP) % 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const s = scene(exercise, view, t, { still });
  return (
    <svg viewBox={s.viewBox} role="img" aria-label={label} className={className} style={{ background: INK.ground }}>
      {s.shapes.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill ?? 'none'}
          stroke={p.stroke}
          strokeWidth={p.width}
          strokeLinejoin="round"
          strokeLinecap={p.round ? 'round' : undefined}
          fillOpacity={p.opacity}
        />
      ))}
    </svg>
  );
}

/** Which muscles the move works, as colored dots. */
export function MuscleKey({ exercise }: { exercise: AnatomyId }) {
  const { main, help } = WORKS[exercise];
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-300">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: INK.work }} />
        {main.map((m) => MUSCLE_NAME[m]).join(', ')}
      </span>
      {help.length > 0 && (
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: INK.help }} />
          {help.map((m) => MUSCLE_NAME[m]).join(', ')}
        </span>
      )}
    </div>
  );
}

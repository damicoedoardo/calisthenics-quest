'use client';

import { useState } from 'react';
import { Gem, Lock } from 'lucide-react';
import { Sprite } from './Sprite';
import { ZONES } from '@/lib/fog';

/** What you won in the Fog's story: one keepsake per boss. At the end of the Play tab, a reminder
    of the road so far. `land`: a small card. */
export function Keepsakes({ cleared, land }: { cleared: number; land?: boolean }) {
  if (land)
    return (
      <section className="flex h-full flex-col rounded-2xl bg-ink-800 p-3">
        <h2 className="flex items-center gap-2 font-pixel text-[9px] text-gold-300">
          <Gem size={12} /> Keepsakes · {Math.min(cleared, ZONES.length)}/{ZONES.length}
        </h2>
        <ul className="mt-2 grid flex-1 grid-cols-3 place-items-center gap-1">
          {ZONES.map((z) => {
            const won = z.id < cleared;
            return (
              <li key={z.id}>
                <Sprite id="keepsake" opts={{ zone: z.id }} size={28} label={won ? z.keepsake.name : 'A keepsake not won yet'} className={won ? '' : 'opacity-40 brightness-0 invert-[.35]'} />
              </li>
            );
          })}
        </ul>
      </section>
    );
  return <KeepsakeShelf cleared={cleared} />;
}

/** Upright: a shelf of six, the last one won picked; tap one to read what it is. */
function KeepsakeShelf({ cleared }: { cleared: number }) {
  const won = Math.min(cleared, ZONES.length);
  const [picked, setPicked] = useState(Math.max(0, won - 1));
  const z = ZONES[picked];
  const has = z.id < cleared;
  return (
    <section className="rounded-2xl bg-ink-800 p-3">
      <h2 className="flex items-center gap-2 font-pixel text-[9px] text-gold-300">
        <Gem size={12} /> Keepsakes <span className="text-slate-500">{won}/{ZONES.length}</span>
      </h2>
      <ul className="mt-3 grid grid-cols-6 gap-1.5">
        {ZONES.map((k) => {
          const mine = k.id < cleared;
          return (
            <li key={k.id}>
              <button
                onClick={() => setPicked(k.id)}
                aria-pressed={picked === k.id}
                aria-label={mine ? k.keepsake.name : 'A keepsake not won yet'}
                className={`flex aspect-square w-full items-center justify-center rounded-lg bg-ink-900 ${picked === k.id ? 'ring-2 ring-gold-400/70' : mine ? 'ring-1 ring-gold-400/20' : ''}`}
              >
                {/* Still in the fog: only its shape shows. */}
                <Sprite id="keepsake" opts={{ zone: k.id }} size={32} label="" className={mine ? '' : 'opacity-40 brightness-0 invert-[.35]'} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2.5 min-h-[2.5rem]">
        {has ? (
          <>
            <p className="text-sm font-semibold leading-tight text-slate-100">{z.keepsake.name}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{z.keepsake.text}</p>
          </>
        ) : (
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            {/* Only the next boss has a name; the ones after it are still in the fog. */}
            <Lock size={12} /> {z.id === cleared ? `Beat ${z.bossName}` : '???'}
          </p>
        )}
      </div>
    </section>
  );
}

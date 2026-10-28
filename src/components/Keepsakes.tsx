'use client';

import { Gem, Lock } from 'lucide-react';
import { Sprite } from './Sprite';
import { ZONES } from '@/lib/fog';

/** What you won in the Fog's story: one keepsake per boss. At the end of the Today tab, a reminder
    of the road so far. `land`: Today held sideways, a small card at the end of its top strip. */
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
  return (
    <section className="rounded-2xl bg-ink-800 p-4">
      <h2 className="flex items-center gap-2 font-pixel text-[10px] text-gold-300">
        <Gem size={14} /> Keepsakes
      </h2>
      <p className="mt-1 text-xs text-slate-500">One for every boss you beat in the Fog&apos;s story.</p>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {ZONES.map((z) => {
          const won = z.id < cleared;
          return (
            <li key={z.id} className={`rounded-xl p-3 ${won ? 'bg-ink-900 ring-1 ring-gold-400/25' : 'bg-ink-900/50'}`}>
              {won ? (
                <>
                  <div className="flex items-center gap-2">
                    <Sprite id="keepsake" opts={{ zone: z.id }} size={36} label={z.keepsake.name} className="shrink-0" />
                    <p className="text-sm font-semibold leading-tight text-slate-100">{z.keepsake.name}</p>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{z.keepsake.text}</p>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Still in the fog: only its shape shows. */}
                  <Sprite id="keepsake" opts={{ zone: z.id }} size={36} label="A keepsake not won yet" className="shrink-0 opacity-40 brightness-0 invert-[.35]" />
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    {/* Only the next boss has a name; the ones after it are still in the fog. */}
                    <Lock size={12} /> {z.id === cleared ? z.bossName : '???'}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { Sprite } from '@/components/Sprite';
import { uniformGear, type ClassId } from '@/lib/gear';
import { ELEMENT_NAMES, SP_CARDS, SP_ELEMENTS, type SpElement, type SpNo } from '@/game/dungeon/content';
import { STARTER_LOOKS } from '@/sprites/characters/hero';

/* SP gallery: all sixteen SPs, as a boy and as a girl, with their element and who they are.
   Not linked from the app; open /lab/sp. Looks live in src/sprites/characters/spLooks.ts. */

const CLASSES: { id: ClassId; label: string }[] = [
  { id: 'warrior', label: 'Warrior' },
  { id: 'archer', label: 'Archer' },
  { id: 'mage', label: 'Mage' },
  { id: 'monk', label: 'Monk' },
];
const NOS: SpNo[] = [1, 2, 3, 4];
const TINT: Record<SpElement, string> = {
  fire: 'text-orange-300',
  water: 'text-sky-300',
  light: 'text-amber-200',
  shadow: 'text-violet-300',
};

/** The class's own weapon, so each SP is shown the way it fights. */
const gearFor = (cls: ClassId) => ({ ...uniformGear(cls, 0), weapon: uniformGear(cls, 1).weapon });

export default function SpLab() {
  const [only, setOnly] = useState<SpElement | null>(null);
  const [playing, setPlaying] = useState(true);
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
      <header className="flex items-center gap-3">
        <Link href="/lab" aria-label="Back to the Sprite Lab" className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-slate-300">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-pixel text-sm text-gold-300">The sixteen SPs</h1>
          <p className="text-xs text-slate-500">Four per class, one of each element. Boy and girl.</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setOnly(null)}
          className={`rounded-lg px-3 py-1.5 text-xs ${only ? 'bg-ink-800 text-slate-300' : 'bg-gold-400 text-ink-950'}`}
        >
          All
        </button>
        {SP_ELEMENTS.map((el) => (
          <button
            key={el}
            onClick={() => setOnly(only === el ? null : el)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${only === el ? 'bg-gold-400 text-ink-950' : 'bg-ink-800 text-slate-300'}`}
          >
            <Sprite id="elementIcon" opts={{ name: el }} size={14} label="" />
            {ELEMENT_NAMES[el]}
          </button>
        ))}
        <button
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? 'Pause' : 'Play'}
          className="ml-auto grid h-8 w-8 place-items-center rounded-lg bg-ink-800 text-slate-300"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>

      {CLASSES.map(({ id, label }) => (
        <section key={id} className="rounded-2xl bg-ink-900 p-3 pixel-border">
          <h2 className="mb-2 font-pixel text-[10px] text-gold-300">{label}</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {NOS.map((n) => {
              const card = SP_CARDS[id][n - 1];
              if (only && card.element !== only) return null;
              return (
                <div key={n} className="rounded-xl bg-ink-950 p-2">
                  <div className="flex justify-center gap-1">
                    {(['m', 'f'] as const).map((sex) => (
                      <Sprite
                        key={sex}
                        id="hero"
                        opts={{ gear: gearFor(id), classId: id, look: STARTER_LOOKS[sex], sp: n }}
                        size={112}
                        playing={playing}
                      />
                    ))}
                  </div>
                  <div className={`mt-1 flex items-center gap-1.5 font-pixel text-[10px] ${TINT[card.element]}`}>
                    <Sprite id="elementIcon" opts={{ name: card.element }} size={14} label="" />
                    {card.name}
                    <span className="ml-auto text-[9px] text-slate-500">{ELEMENT_NAMES[card.element]}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{card.about}</p>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, X } from 'lucide-react';
import { Sprite } from '@/components/Sprite';
import { useLook } from '@/components/Look';
import { gearOf, type GameState } from '@/lib/game';
import { CATEGORIES, EQUIPMENT, loadLibrary, type LibraryExercise } from '@/exercises/library';
import { STARTER_LOOKS } from '@/sprites/characters/hero';
import type { Look } from '@/sprites/engine/figure';

/** The whole exercise catalog: search, filter, and open one for its demo and how-to. */
export function ExerciseLibrary({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [all, setAll] = useState<LibraryExercise[] | null>(null);
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<string>('any');
  const [category, setCategory] = useState<string>('any');
  const [demoOnly, setDemoOnly] = useState(true);
  const [open, setOpen] = useState<LibraryExercise | null>(null);
  const mine = useLook();

  useEffect(() => {
    loadLibrary().then(setAll);
  }, []);

  const shown = useMemo(() => {
    if (!all) return [];
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter(
      (x) =>
        (!demoOnly || x.demo) &&
        (equipment === 'any' || x.equipment === equipment || (equipment === 'other' && !(EQUIPMENT as readonly string[]).includes(x.equipment))) &&
        (category === 'any' || x.category === category) &&
        words.every((w) => `${x.name} ${x.primary.join(' ')} ${x.equipment}`.toLowerCase().includes(w)),
    );
  }, [all, query, equipment, category, demoOnly]);

  if (open) return <Detail state={state} x={open} onBack={() => setOpen(null)} />;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink-950">
      <header className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <h1 className="font-pixel text-xs text-gold-300">Exercise library</h1>
        <button onClick={onClose} className="p-2 text-slate-400" aria-label="Close the library">
          <X size={20} />
        </button>
      </header>
      <div className="space-y-2 px-4 pb-3">
        <label className="flex items-center gap-2 rounded-xl bg-ink-800 px-3 py-2 ring-1 ring-ink-700 focus-within:ring-sky-400/60">
          <Search size={16} className="text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: squat, chest, dumbbell…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
        </label>
        <div className="flex gap-2 text-xs">
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-ink-800 px-2 py-1.5 ring-1 ring-ink-700" aria-label="Equipment">
            <option value="any">Any equipment</option>
            {EQUIPMENT.map((e) => (
              <option key={e} value={e}>
                {cap(e)}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-ink-800 px-2 py-1.5 ring-1 ring-ink-700" aria-label="Kind">
            <option value="any">Any kind</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {cap(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between text-xs">
          <button
            onClick={() => setDemoOnly(!demoOnly)}
            className={`rounded-full px-3 py-1 ring-1 ${demoOnly ? 'bg-gold-400 text-ink-950 ring-gold-400' : 'bg-ink-800 text-slate-300 ring-ink-700'}`}
            aria-pressed={demoOnly}
          >
            With pixel demo
          </button>
          <span className="text-slate-400">{all ? `${shown.length} of ${all.length}` : 'Loading…'}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {shown.map((x) => (
          <li key={x.id}>
            <button onClick={() => setOpen(x)} className="flex w-full items-center gap-3 rounded-xl bg-ink-800 p-2 text-left active:bg-ink-700">
              {x.demo ? (
                <Sprite id="exercise" opts={{ exercise: x.demo, gear: gearOf(state), look: mine }} size={56} playing={false} label={`${x.name}, demo`} className="shrink-0 rounded-lg bg-ink-950" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink-900 font-pixel text-[10px] text-slate-600" aria-hidden>
                  {x.name[0]}
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{x.name}</span>
                <span className="block truncate text-xs text-slate-400">
                  {cap(x.equipment)} · {x.level} · {x.primary.join(', ')}
                </span>
              </span>
            </button>
          </li>
        ))}
        {all && shown.length === 0 && <li className="py-8 text-center text-sm text-slate-400">Nothing matches. Try fewer words or another filter.</li>}
      </ul>
    </div>
  );
}

/** One exercise: the demo for a boy and a girl (yours in place of the matching one), then the how-to. */
function Detail({ state, x, onBack }: { state: GameState; x: LibraryExercise; onBack: () => void }) {
  const mine = useLook();
  const looks: { label: string; look: Look }[] = (['m', 'f'] as const).map((sex) => ({
    label: sex === mine.sex ? 'You' : sex === 'm' ? 'Boy' : 'Girl',
    look: sex === mine.sex ? mine : STARTER_LOOKS[sex],
  }));
  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-ink-950 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="sticky top-0 -mx-4 flex items-center gap-2 bg-ink-950 px-2 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <button onClick={onBack} className="p-2 text-slate-400" aria-label="Back to the library">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-pixel text-xs leading-relaxed text-gold-300">{x.name}</h1>
      </header>
      {x.demo ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {looks.map(({ label, look }) => (
            <figure key={label} className="rounded-2xl bg-ink-900 p-1.5 ring-1 ring-ink-700">
              <Sprite id="exercise" opts={{ exercise: x.demo!, gear: gearOf(state), classId: state.profile.classId, look }} size={136} label={`${x.name}, ${label}`} className="mx-auto max-w-full" />
              <figcaption className="pb-1 text-center text-[11px] text-slate-400">{label}</figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-xl bg-ink-900 p-4 text-center text-xs text-slate-400">No pixel demo for this one yet.</p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Fact label="Equipment" value={cap(x.equipment)} />
        <Fact label="Level" value={cap(x.level)} />
        <Fact label="Works" value={cap(x.primary.join(', ') || '–')} />
        <Fact label="Helps" value={cap(x.secondary.join(', ') || '–')} />
      </dl>
      <h2 className="mt-5 font-pixel text-[10px] text-slate-300">How to</h2>
      {x.steps.length === 0 && <p className="mt-2 text-sm text-slate-400">No written steps for this one yet.</p>}
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-300">
        {x.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="mt-6 text-[11px] text-slate-500">
        {x.source === 'catalog' ? 'From free-exercise-db, an open public-domain catalog.' : 'From the FORMA program.'}
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-800 p-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-200">{value}</dd>
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

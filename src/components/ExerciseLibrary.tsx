'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useLook } from '@/components/Look';
import { gearOf, type GameState } from '@/lib/game';
import { EQUIPMENT, FAMILIES, KINDS, findExercises, loadLibrary, type LibraryExercise } from '@/exercises/library';
import type { Family, Kind } from '@/exercises/coaching';
import { ExerciseDetail, FAMILY_LABEL, KIND_LABEL, cap } from './ExerciseDetail';
import { stillFor } from '@/sprites/registry';
import type { Look } from '@/sprites/engine/figure';

/** The whole exercise catalog: search, filter, and open one for its demo, how-to, tips and mistakes. */
const LEVEL_BARS: Record<string, number> = { beginner: 1, intermediate: 2, expert: 3 };

export function ExerciseLibrary({ state, start, onClose }: { state: GameState; start?: string | null; onClose: () => void }) {
  const [all, setAll] = useState<LibraryExercise[] | null>(null);
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState<string>('any');
  const [kind, setKind] = useState<Kind | 'any'>('any');
  const [family, setFamily] = useState<Family | 'any'>('any');
  const [open, setOpen] = useState<LibraryExercise | null>(null);
  const mine = useLook();

  useEffect(() => {
    loadLibrary().then((list) => {
      setAll(list);
      const first = start ? list.find((x) => x.id === start) : undefined;
      if (first) setOpen(first);
    });
  }, [start]);

  const shown = useMemo(() => {
    if (!all) return [];
    return findExercises(all, { text: query, kind: kind === 'any' ? undefined : kind, family: family === 'any' ? undefined : family }).filter(
      (x) => equipment === 'any' || x.equipment === equipment || (equipment === 'other' && !(EQUIPMENT as readonly string[]).includes(x.equipment)),
    );
  }, [all, query, equipment, kind, family]);

  if (open) return <ExerciseDetail state={state} x={open} onBack={() => setOpen(null)} />;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-ink-950">
      <header className="land-safe-x flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))] [@media(orientation:landscape)_and_(max-height:600px)]:pb-1 [@media(orientation:landscape)_and_(max-height:600px)]:pt-[max(0.5rem,env(safe-area-inset-top))]">
        <h1 className="font-pixel text-xs text-gold-300">Exercise library</h1>
        <button onClick={onClose} className="p-2 text-slate-400" aria-label="Close the library">
          <X size={20} />
        </button>
      </header>
      {/* Held sideways: search and filters on one line, the list in two columns. */}
      <div className="land-safe-x space-y-2 px-4 pb-3 [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-[minmax(0,4fr)_minmax(0,4fr)_minmax(0,3fr)] [@media(orientation:landscape)_and_(max-height:600px)]:gap-2 [@media(orientation:landscape)_and_(max-height:600px)]:space-y-0 [@media(orientation:landscape)_and_(max-height:600px)]:pb-2">
        <label className="flex items-center gap-2 rounded-xl bg-ink-800 px-3 py-2 ring-1 ring-ink-700 focus-within:ring-sky-400/60">
          <Search size={16} className="text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search: squat, chest, dumbbell, stretch…"
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
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind | 'any')} className="min-w-0 flex-1 rounded-lg bg-ink-800 px-2 py-1.5 ring-1 ring-ink-700" aria-label="Kind">
            <option value="any">Any kind</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <select value={family} onChange={(e) => setFamily(e.target.value as Family | 'any')} className="min-w-0 flex-1 rounded-lg bg-ink-800 px-2 py-1.5 ring-1 ring-ink-700" aria-label="Movement">
            <option value="any">Any movement</option>
            {FAMILIES.map((f) => (
              <option key={f} value={f}>
                {FAMILY_LABEL[f]}
              </option>
            ))}
          </select>
          <span className="shrink-0 text-slate-400">{all ? `${shown.length} of ${all.length}` : 'Loading…'}</span>
        </div>
      </div>
      <ul className="land-safe-x flex-1 space-y-1.5 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:600px)]:content-start [@media(orientation:landscape)_and_(max-height:600px)]:gap-1.5 [@media(orientation:landscape)_and_(max-height:600px)]:space-y-0">
        {shown.map((x) => (
          <li key={x.id}>
            <button onClick={() => setOpen(x)} className="flex w-full items-center gap-3 rounded-xl bg-ink-800 p-2 text-left active:bg-ink-700">
              <Still x={x} state={state} look={mine} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{x.name}</span>
                <span className="block truncate text-xs text-slate-400">
                  {cap(x.equipment)} · {x.primary.join(', ')}
                </span>
              </span>
              {/* How hard, as one to three bars. */}
              <span className="flex shrink-0 items-end gap-0.5 pr-1" title={`${KIND_LABEL[x.kind]}, ${x.level}`} aria-label={`${KIND_LABEL[x.kind]}, ${x.level}`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={`w-1.5 ${['h-2', 'h-3', 'h-4'][i]} ${i < LEVEL_BARS[x.level] ? 'bg-gold-400' : 'bg-ink-600'}`} />
                ))}
              </span>
            </button>
          </li>
        ))}
        {all && shown.length === 0 && <li className="py-8 [@media(orientation:landscape)_and_(max-height:600px)]:col-span-2 text-center text-sm text-slate-400">Nothing matches. Try fewer words or another filter.</li>}
      </ul>
    </div>
  );
}

/** A list row's demo: one still frame, drawn only once the row scrolls into view. */
function Still({ x, state, look }: { x: LibraryExercise; state: GameState; look: Look }) {
  const box = useRef<HTMLSpanElement>(null);
  const [src, setSrc] = useState('');
  const gear = gearOf(state);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        setSrc(stillFor('exercise', 'idle', { exercise: x.demo, kit: x.kit, gear, look }));
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [x.demo, x.kit, gear, look]);
  return (
    <span ref={box} className="block h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-950">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt={`${x.name}, demo`} width={56} height={56} className="h-full w-full" style={{ imageRendering: 'pixelated' }} />}
    </span>
  );
}

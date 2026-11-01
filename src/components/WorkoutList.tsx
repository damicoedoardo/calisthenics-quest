'use client';

import { useState } from 'react';
import { Feather, Shuffle, TrendingDown } from 'lucide-react';
import { gearOf, type GameState } from '@/lib/game';
import { ROLE_COLOR, ROLE_LABEL } from '@/lib/program';
import { changeItem } from '@/lib/coach/plan';
import { restFor } from '@/lib/coach/time';
import type { PlanItem } from '@/lib/coach/types';
import { EXERCISES } from '@/sprites/characters/exercise';
import { doseOf } from './CoachPanel';
import { ExerciseSheet } from './ExerciseDetail';
import { useLook } from './Look';
import { Sprite } from './Sprite';
import { Choices } from './Workout';

/* One workout, shown the same on Today and on the Train tab: the warm-up and the cool-down folded
   into one row each (tap to open), every exercise with a still of you doing it (tap for how to do
   it), its dose, and on a day still to do an Easier and a Swap. A skipped one (or one left out on a
   rough day) is dimmed. */

type Update = (fn: (s: GameState) => GameState) => void;
type Fold = 'warmup' | 'stretch';
type Row = { kind: 'fold'; role: Fold; items: PlanItem[]; open: boolean } | { kind: 'item'; it: PlanItem };

const folds = (role: PlanItem['role']): role is Fold => role === 'warmup' || role === 'stretch';

/** The workout as rows: each run of warm-up or cool-down moves under one row, its moves shown only when open. */
export function workoutRows(items: PlanItem[], opened: Partial<Record<Fold, boolean>>): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < items.length; ) {
    const role = items[i].role;
    if (!folds(role)) {
      rows.push({ kind: 'item', it: items[i++] });
      continue;
    }
    let j = i;
    while (j < items.length && items[j].role === role) j++;
    const group = items.slice(i, j);
    const open = !!opened[role];
    rows.push({ kind: 'fold', role, items: group, open });
    if (open) for (const it of group) rows.push({ kind: 'item', it });
    i = j;
  }
  return rows;
}

interface Props {
  state: GameState;
  update: Update;
  items: PlanItem[];
  /** A day still to do: Easier and Swap on each main exercise. The date picks the day; none means the next workout. */
  changeable?: boolean;
  date?: string;
  /** A workout under way: the sets done so far show in place of the dose. */
  progress?: Record<string, number>;
  /** Held sideways on Today: the exercises side by side as tiles, in one row. */
  tiles?: boolean;
  /** The line above the list: which day (Today, Tomorrow, Sat), the workout's name, and its time on the right. */
  when?: string;
  title?: string;
  time?: string;
  /** Why the workout was changed after it was planned ("Lighter: ..."), under the title. */
  why?: string;
}

export function WorkoutList({ state, update, items, changeable, date, progress, tiles, when, title, time, why }: Props) {
  const [opened, setOpened] = useState<Partial<Record<Fold, boolean>>>({});
  const [howTo, setHowTo] = useState<PlanItem | null>(null);
  const [change, setChange] = useState<{ id: string; kind: 'easier' | 'swap' } | null>(null);
  const look = useLook();
  const hero = { gear: gearOf(state), classId: state.profile.classId, look };
  const rows = workoutRows(items, opened);
  const toggle = (role: Fold) => setOpened((o) => ({ ...o, [role]: !o[role] }));
  const picked = items.find((i) => i.id === change?.id);

  const dose = (it: PlanItem) => {
    if (progress) return `${Math.min(progress[it.id] ?? 0, it.sets)}/${it.sets}`;
    return doseOf(it, it.run ? undefined : state.reps[it.id]);
  };
  const rest = (it: PlanItem) => (progress || folds(it.role) || it.run ? '' : ` · rest ${restFor(it)}s${it.ramp ? ` · ${it.ramp} light first` : ''}`);
  const canChange = (it: PlanItem) => !!changeable && !progress && !it.skipped && !folds(it.role) && !it.run && (it.easier.length > 0 || it.swaps.length > 0);

  const still = (it: PlanItem, size: number, className: string) =>
    (EXERCISES as string[]).includes(it.demo) ? (
      <Sprite id="exercise" opts={{ exercise: it.demo, ...hero }} size={size} playing={false} label={`${it.name}, demo`} className={className} />
    ) : (
      <span className={className} style={{ width: size, height: size }} />
    );

  const changes = (it: PlanItem, small?: boolean) =>
    canChange(it) && (
      <span className={`flex shrink-0 gap-1 ${small ? 'justify-center pt-1' : ''}`}>
        {it.easier.length > 0 && (
          <button onClick={() => setChange({ id: it.id, kind: 'easier' })} aria-label={`Easier than ${it.name}`} className={`grid place-items-center rounded-md bg-ink-700 ${small ? 'h-6 w-6' : 'h-7 w-7'}`}>
            <TrendingDown size={small ? 12 : 14} className="text-sky-300" />
          </button>
        )}
        {it.swaps.length > 0 && (
          <button onClick={() => setChange({ id: it.id, kind: 'swap' })} aria-label={`Swap ${it.name}`} className={`grid place-items-center rounded-md bg-ink-700 ${small ? 'h-6 w-6' : 'h-7 w-7'}`}>
            <Shuffle size={small ? 12 : 14} className="text-gold-300" />
          </button>
        )}
      </span>
    );

  const tag = (it: PlanItem) => (
    <>
      {ROLE_LABEL[it.role]}
      {it.changed && <span className="ml-1 normal-case tracking-normal text-sky-300">{it.changed.how === 'easier' ? 'easier' : 'swapped'}</span>}
    </>
  );

  return (
    <>
      {tiles ? (
        <ul className="flex min-h-0 min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rows.map((r) =>
            r.kind === 'fold' ? (
              <li key={r.role} className="flex min-h-0 w-14 shrink-0">
                <FoldRow role={r.role} count={r.items.length} open={r.open} onToggle={() => toggle(r.role)} tiles />
              </li>
            ) : (
              <li key={r.it.id} className={`flex min-h-0 min-w-[4rem] flex-1 basis-0 flex-col rounded-xl bg-ink-900 p-1.5 ${r.it.skipped ? 'opacity-40' : ''}`}>
                <button onClick={() => setHowTo(r.it)} aria-label={`How to do ${r.it.name}`} className="flex min-h-0 w-full flex-1 flex-col text-center active:scale-[.98]">
                  <span className="relative flex min-h-0 w-full flex-1 items-end justify-center overflow-hidden rounded-lg bg-ink-950">
                    {still(r.it, 64, 'shrink-0')}
                    <span className="absolute left-1 top-1 rounded bg-ink-950/85 px-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[r.it.role] }}>
                      {ROLE_LABEL[r.it.role]}
                    </span>
                  </span>
                  <span className={`mt-1 line-clamp-2 shrink-0 text-xs leading-tight text-slate-100 ${r.it.skipped ? 'line-through' : ''}`}>{r.it.name}</span>
                  <span className="shrink-0 font-mono text-xs text-slate-300">{dose(r.it)}</span>
                </button>
                {changes(r.it, true)}
              </li>
            ),
          )}
        </ul>
      ) : (
        <>
        {title && (
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="min-w-0 font-pixel text-[9px] leading-relaxed text-gold-300">
              {when && <span className="text-slate-400">{when} · </span>}
              {title}
            </h3>
            {time && <p className="shrink-0 font-mono text-[11px] text-slate-400">{time}</p>}
          </div>
        )}
        {why && <p className="mt-1 flex items-center gap-1.5 text-xs text-sky-300"><Feather size={12} className="shrink-0" />{why}</p>}
        <ul className={`space-y-1.5 ${title ? 'mt-3' : ''}`}>
          {rows.map((r) =>
            r.kind === 'fold' ? (
              <li key={r.role}>
                <FoldRow role={r.role} count={r.items.length} open={r.open} onToggle={() => toggle(r.role)} />
              </li>
            ) : (
              <li key={r.it.id} className={`flex items-center gap-2 rounded-xl bg-ink-900 py-1 pl-1 pr-2 ${r.it.skipped ? 'opacity-40' : ''}`}>
                <button onClick={() => setHowTo(r.it)} aria-label={`How to do ${r.it.name}`} className="flex min-w-0 flex-1 items-center gap-3 text-left active:scale-[.98]">
                  {/* A still of you doing it: the demo's first frame, at 1:1 so it stays crisp. */}
                  {still(r.it, 48, 'shrink-0 rounded-lg bg-ink-950')}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[r.it.role] }}>
                      {tag(r.it)}
                    </span>
                    <span className={`mt-0.5 block text-sm leading-snug text-slate-100 ${r.it.skipped ? 'line-through' : ''}`}>{r.it.name}</span>
                    <span className="block font-mono text-[11px] text-slate-400">
                      {dose(r.it)}
                      {rest(r.it)}
                    </span>
                  </span>
                </button>
                {changes(r.it)}
              </li>
            ),
          )}
        </ul>
        </>
      )}
      {change && picked && (
        <Choices
          title={change.kind === 'easier' ? `Easier than ${picked.name}` : `Instead of ${picked.name}`}
          hint={change.kind === 'easier' ? 'The same movement, a step down.' : 'Trains the same thing.'}
          list={change.kind === 'easier' ? picked.easier : picked.swaps}
          state={state}
          onPick={(c) => {
            update((s) => changeItem(s, picked.id, c, change.kind, date));
            setChange(null);
          }}
          onClose={() => setChange(null)}
        />
      )}
      {howTo && <ExerciseSheet state={state} id={howTo.id} demo={howTo.demo} onClose={() => setHowTo(null)} />}
    </>
  );
}

/** The warm-up or the cool-down as one quiet row: its name, how many moves, and a chevron to open it. */
function FoldRow({ role, count, open, onToggle, tiles }: { role: Fold; count: number; open: boolean; onToggle: () => void; tiles?: boolean }) {
  const moves = `${count} ${count === 1 ? 'move' : 'moves'}`;
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${ROLE_LABEL[role]}, ${moves}. ${open ? 'Hide' : 'Show'}`}
      className={
        tiles
          ? 'flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl bg-ink-900/60 px-1 text-center active:scale-[.98]'
          : 'flex w-full items-center gap-3 rounded-xl bg-ink-900/60 px-3 py-2 text-left active:scale-[.98]'
      }
    >
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[role] }}>
        {ROLE_LABEL[role]}
      </span>
      <span className={`font-mono text-[11px] text-slate-500 ${tiles ? '' : 'flex-1'}`}>{moves}</span>
      <Sprite id="uiIcon" opts={{ name: 'chevron' }} size={10} label="" className={`shrink-0 transition-transform motion-reduce:transition-none ${tiles ? (open ? 'rotate-180' : '') : open ? '-rotate-90' : 'rotate-90'}`} />
    </button>
  );
}

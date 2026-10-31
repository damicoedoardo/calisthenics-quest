'use client';

import { useState, type ReactNode } from 'react';
import { Palette, Swords } from 'lucide-react';
import { Hero } from './Hero';
import { useLook } from './Look';
import { LookEditor } from './LookEditor';
import { useModal } from './useModal';
import { StatPoints } from './StatPoints';
import { FlamePowers } from './FlamePowers';
import { FogGearCard } from './FogGearCard';
import { SpCard } from './SpCard';
import { LootGuide, Purse } from './Purse';
import type { LootId } from '@/lib/loot';
import { useLand } from './useLand';
import { getClass } from '@/lib/gear';
import { gearOf, levelInfo, totalXp, type GameState } from '@/lib/game';
import { heroVariant } from '@/story/flame';
import { pointsFree } from '@/lib/stats';
import { spTrial, spWorn } from '@/lib/sp';

/** The Hero tab's three parts, the same upright and sideways: what you wear with the vault and
    Mira's forge, your champion's stats and flame, your class and its SPs. */
export type HeroPart = 'gear' | 'stats' | 'class';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onChangeClass: () => void;
  part: HeroPart;
  onPart: (p: HeroPart) => void;
}

/** Your hero: you on a stage, and three parts under it. Everything about your character lives
    here and only here; the You page (tap your hero at the top) holds the rest. */
export function HeroTab({ state, update, onChangeClass, part, onPart }: Props) {
  const gear = gearOf(state);
  const cls = getClass(state.profile.classId);
  const [editingLook, setEditingLook] = useState(false);
  const [guide, setGuide] = useState<LootId | null>(null);
  const land = useLand();
  const look = useLook();
  const PARTS = [
    { id: 'gear', label: 'Gear', dot: false },
    { id: 'stats', label: 'Stats', dot: pointsFree(state) > 0 },
    // Named for the SPs only once the first is given, so they stay a surprise.
    { id: 'class', label: spTrial(state) ? 'Class & SP' : 'Class', dot: false },
  ] as const;

  const lookEditor = editingLook && (
    <Overlay label="Your look" onClose={() => setEditingLook(false)}>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-6 pt-4 land:min-h-0 land:max-w-3xl land:pl-[max(env(safe-area-inset-left),1rem)] land:pr-[max(env(safe-area-inset-right),1rem)] land:pb-4 land:pt-2">
        <h2 className="mb-4 font-pixel text-xs text-gold-300">Your look</h2>
        <div className="flex-1">
          <LookEditor look={look} onChange={(l) => update((s) => ({ ...s, profile: { ...s.profile, look: l } }))} gear={gear} classId={state.profile.classId} />
        </div>
        {/* Pinned to the bottom, so Done is in reach without scrolling past every choice. */}
        <div className="sticky bottom-0 z-10 -mx-4 mt-3 bg-ink-950 px-4 pb-1 pt-3 land:mt-2">
          <button
            onClick={() => setEditingLook(false)}
            className="w-full rounded-2xl land:py-3 bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
          >
            Done
          </button>
        </div>
      </div>
    </Overlay>
  );

  const tabs = (
    <div role="tablist" aria-label="Your hero" className={`grid shrink-0 grid-cols-3 gap-1 rounded-xl bg-ink-900 p-1`}>
      {PARTS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={part === t.id}
          onClick={() => onPart(t.id)}
          className={`relative rounded-lg py-2 text-xs font-semibold transition active:scale-95 ${part === t.id ? 'bg-gold-400 text-ink-950' : 'text-slate-300'}`}
        >
          {t.label}
          {t.dot && <span aria-hidden className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold-300 ring-2 ring-ink-900" />}
        </button>
      ))}
    </div>
  );

  const classCard = (
    <section className={land ? '' : 'rounded-2xl bg-ink-800 p-4'}>
      <p className="font-pixel text-[10px] text-gold-300">{cls ? cls.name : 'No class yet'}</p>
      {cls ? (
        <>
          <p className="mt-1 text-sm text-slate-200">{cls.pitch}</p>
          <p className="mt-1 text-xs text-slate-400">
            Leans to {cls.lean} in the Fog, and fights with a {cls.weapon}.
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs text-slate-400">Pick a class to choose how you fight in the Fog.</p>
      )}
      <button onClick={onChangeClass} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-600 py-2.5 text-sm font-semibold">
        <Swords size={15} /> {cls ? 'Change class' : 'Choose a class'}
      </button>
    </section>
  );

  const body =
    part === 'gear' ? (
      <FogGearCard state={state} update={update} land={land} />
    ) : part === 'stats' ? (
      <>
        <StatPoints state={state} update={update} land={land} />
        <FlamePowers state={state} land={land} />
      </>
    ) : (
      <div className="space-y-3">
        {classCard}
        <SpCard state={state} update={update} land={land} />
      </div>
    );

  // What you have to spend; tap one for where it comes from and where it goes.
  const purse = <Purse state={state} onOpen={setGuide} land={land} />;
  const lootGuide = guide && (
    <LootGuide
      state={state}
      focus={guide}
      now={new Date()}
      onClose={() => setGuide(null)}
      onGo={(to) => {
        setGuide(null);
        onPart(to);
      }}
    />
  );

  const changeLook = (
    <button onClick={() => setEditingLook(true)} className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-ink-900/70 px-4 py-2 text-xs font-semibold text-slate-300">
      <Palette size={13} className="shrink-0" /> Change look
    </button>
  );

  // Sideways: the parts as tabs along the top. Gear takes the whole width (its three columns:
  // what you wear, the vault, the tapped item and the forge); the others sit beside you on a stage.
  if (land)
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex-1">{tabs}</div>
          <div className="w-40 shrink-0"><LevelBar state={state} /></div>
          <div className="w-80">{purse}</div>
        </div>
        <div className="flex min-h-0 flex-1 gap-3">
          {part !== 'gear' && (
            <section className="flex w-44 shrink-0 flex-col items-center rounded-2xl bg-gradient-to-b from-ink-700 to-ink-800 px-2.5 pb-2.5 pt-3 min-[800px]:w-52">
              <p className="font-pixel text-[9px] text-slate-400">{cls ? cls.name : 'Adventurer'}</p>
              <div className="grid min-h-0 flex-1 place-items-center">
                <Hero gear={gear} classId={state.profile.classId} size={112} variant={heroVariant(state)} sp={spWorn(state)} />
              </div>
              {changeLook}
            </section>
          )}
          <div role="tabpanel" className={`min-h-0 min-w-0 flex-1 ${part === 'gear' ? '' : 'overflow-y-auto rounded-2xl bg-ink-800 p-3'}`}>
            {body}
          </div>
        </div>
        {lookEditor}
        {lootGuide}
      </div>
    );

  return (
    <div className="space-y-4">
      <section className="relative flex flex-col items-center rounded-2xl bg-gradient-to-b from-ink-700 to-ink-800 pb-4 pt-4">
        <p className="font-pixel text-[10px] text-slate-400">{cls ? cls.name : 'Adventurer'}</p>
        <Hero gear={gear} classId={state.profile.classId} size={112} variant={heroVariant(state)} sp={spWorn(state)} />
        {/* The look, as a small button in the stage's corner. */}
        <button onClick={() => setEditingLook(true)} aria-label="Change look" className="absolute right-3 top-3 rounded-lg bg-ink-900/70 p-2 text-slate-300">
          <Palette size={16} />
        </button>
        <div className="mt-2 w-full px-3"><LevelBar state={state} /></div>
        <div className="mt-3 w-full px-3">{purse}</div>
      </section>

      {tabs}

      <div role="tabpanel" className="space-y-4">
        {body}
      </div>

      {lookEditor}
      {lootGuide}
    </div>
  );
}

/** Your level and how far into it you are: the XP bar that used to sit in the top bar. */
function LevelBar({ state }: { state: GameState }) {
  const lvl = levelInfo(totalXp(state));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-xs text-slate-400">
          Lv {lvl.level} · <span className="text-slate-200">{lvl.title}</span>
        </p>
        <p className="shrink-0 font-mono text-[11px] text-slate-500">
          {lvl.into} / {lvl.needed} XP
        </p>
      </div>
      <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm bg-ink-700">
        <div className="h-full bg-gradient-to-r from-gold-500 to-gold-300 transition-all duration-700 motion-reduce:transition-none" style={{ width: `${lvl.pct * 100}%` }} />
      </div>
    </div>
  );
}

/** A full-screen sheet over the Hero tab (the look editor): a dialog, closed with Escape too. */
function Overlay({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const box = useModal<HTMLDivElement>(onClose);
  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={label} className="safe-top safe-bottom fixed inset-0 z-40 !mt-0 overflow-y-auto bg-ink-950 outline-none">
      {children}
    </div>
  );
}

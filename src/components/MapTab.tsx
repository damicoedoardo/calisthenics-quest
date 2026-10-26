'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Eye, Lock, Play, Shield, Skull, Star, Swords, X } from 'lucide-react';
import { Ember } from './Characters';
import { Battle, Foe } from './Battle';
import { stopLabel } from './WorkoutFight';
import { CHAPTERS, storyState } from '@/lib/story';
import { gearOf, type GameState, type Session } from '@/lib/game';
import { chapterStops, emberStage, EMBER_STAGES, roadState, starsByStop, statusOf, type Move, type RoadState, type Stop, type StopStatus } from '@/lib/road';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  /** Go to Today to start the workout that fights the next stop. */
  onTrain: () => void;
}

/** Horizontal offset of each stop, so the road winds up the screen. */
const WIND = [50, 72, 58, 30, 22, 44, 68, 78, 56, 32];

const KIND_LABEL: Record<Stop['kind'], string> = { guardian: 'Guardian', fight: 'Fight', elite: 'Elite', boss: 'Boss' };

/** The Map: the chapter's road through the Fog. Every workout is the fight at the next stop. */
export function MapTab({ state, update, onTrain }: Props) {
  const story = storyState(state);
  const road = roadState(state);
  const ember = emberStage(state.sessions.length);
  const chapterIx = Math.min(story.index, CHAPTERS.length - 1);
  const chapter = CHAPTERS[chapterIx];
  const stops = chapterStops(chapterIx);
  const blows = stops.filter((s) => s.kind === 'boss');
  const [open, setOpen] = useState<Stop | null>(null);
  const [scouting, setScouting] = useState<Stop | null>(null);
  const stars = starsByStop(state);
  const totalStars = stops.reduce((a, s) => a + (stars.get(s.g) ?? 0), 0);
  const gear = gearOf(state);
  const frontier = useRef<HTMLDivElement>(null);

  useEffect(() => {
    frontier.current?.scrollIntoView({ block: 'center' });
  }, []);

  const cleared = stops.filter((s) => s.g < road.cleared).length;
  // Ember stands by the stop your next workout fights.
  const emberAt = Math.min(cleared, stops.length - 1);

  return (
    <div className="space-y-4">
      {/* Ember */}
      <section className="flex items-center gap-4 rounded-2xl bg-ink-800 p-4 pixel-border">
        <div className="grid h-20 w-20 shrink-0 place-items-end justify-center">
          <Ember size={ember.size} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[10px] text-slate-400">Ember</p>
          <p className="mt-1 font-pixel text-sm text-gold-300">{ember.stage.name}</p>
          <p className="mt-1 text-xs text-slate-300">{ember.stage.perk}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-sm bg-ink-700">
            <div className="h-full bg-gradient-to-r from-orange-500 to-gold-300" style={{ width: `${ember.pct * 100}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {ember.next ? `${ember.toNext} session${ember.toNext === 1 ? '' : 's'} to ${ember.next.name}` : 'Full light'} · {state.sessions.length} total
          </p>
        </div>
      </section>

      <div className="flex gap-1" aria-label="Ember stages">
        {EMBER_STAGES.map((s, i) => (
          <div key={s.name} className="flex-1 text-center">
            <div className={`h-1.5 rounded-sm ${i <= ember.index ? 'bg-orange-400' : 'bg-ink-700'}`} />
            <p className={`mt-1 text-[10px] ${i === ember.index ? 'text-gold-300' : 'text-slate-500'}`}>{s.name}</p>
          </div>
        ))}
      </div>

      {/* Chapter header */}
      <section className="rounded-2xl bg-ink-800 p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-pixel text-[10px] text-slate-400">Chapter {chapter.n}</p>
          <p className="flex items-center gap-1 text-xs text-slate-400">
            {cleared}/{stops.length} won · <Star size={11} className="fill-gold-400 text-gold-400" /> {totalStars}/{stops.length * 3}
          </p>
        </div>
        <h2 className="mt-1 font-pixel text-sm text-gold-300">{chapter.name}</h2>
        <p className="mt-2 text-sm text-slate-300">
          Every workout is the fight at the next stop: each set is a hit, and finishing your sets wins it. Guard well for stars.{' '}
          {chapter.enemy} takes {blows.length} blows, one per week.
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <span>Blows on {chapter.enemy}:</span>
          {blows.map((b) => (
            <span key={b.g} className={`h-3 w-3 ${b.g < road.cleared ? 'bg-orange-500' : 'border-2 border-slate-600'}`} />
          ))}
        </div>
      </section>

      {/* The road, boss at the top, camp at the bottom */}
      <section className="relative overflow-hidden rounded-2xl bg-[#14110f] pb-4 pt-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(249,115,22,.10),transparent_60%)]" aria-hidden />

        <div className="relative">
          {[...stops].reverse().map((stop, ri) => {
            const st = statusOf(stop, road);
            const idx = stops.length - 1 - ri;
            const x = WIND[idx % WIND.length];
            const isFrontier = idx === emberAt;
            return (
              <div key={stop.g} ref={isFrontier ? frontier : undefined} className="relative h-[92px]">
                {/* path segment down to the next stop */}
                <Segment from={x} to={WIND[(idx - 1 + WIND.length) % WIND.length]} lit={st === 'cleared' || st === 'next'} last={idx === 0} />
                {st === 'fog' && <Fog />}
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%` }}>
                  <StopNode
                    stop={stop}
                    status={st}
                    stars={stars.get(stop.g) ?? 0}
                    patrol={st === 'next' && road.blockedByTest}
                    gear={gear}
                    classId={state.profile.classId}
                    onOpen={() => setOpen(stop)}
                  />
                </div>
                {isFrontier && (
                  <div className="absolute top-1/2 -translate-y-[85%]" style={{ left: `calc(${x}% ${x > 50 ? '- 92px' : '+ 46px'})` }}>
                    <Ember size={Math.round(ember.size * 0.7)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="relative mt-1 flex flex-col items-center">
          <p className="font-pixel text-[9px] text-slate-400">CAMP</p>
          {road.cleared === 0 && <p className="mt-2 px-6 text-center text-xs text-slate-400">Your first workout is your first fight.</p>}
        </div>
      </section>

      {road.blockedByTest && (
        <p className="rounded-xl bg-ink-800 p-3 text-sm text-slate-300">
          The final blow needs your max test. Log it on the Hero tab. Until then, your workouts fight a patrol.
        </p>
      )}

      <PreviewTools state={state} update={update} />

      {open && (
        <StopSheet
          stop={open}
          road={road}
          scouted={state.scouted === open.g}
          state={state}
          onClose={() => setOpen(null)}
          onTrain={() => {
            setOpen(null);
            onTrain();
          }}
          onScout={() => {
            setScouting(open);
            setOpen(null);
          }}
        />
      )}

      {scouting && (
        <Battle
          state={state}
          stop={scouting}
          dark
          onClose={() => setScouting(null)}
          onWin={() => {
            update((s) => ({ ...s, scouted: scouting.g }));
            setScouting(null);
          }}
        />
      )}
    </div>
  );
}

function moveText(m: Move): string {
  if (m.kind === 'attack') return `hits for ${m.dmg}`;
  if (m.kind === 'multi') return `${m.hits} quick hits of ${m.dmg}`;
  if (m.kind === 'charge') return 'charges up';
  return `a BIG hit for ${m.dmg}`;
}

interface SheetProps {
  stop: Stop;
  road: RoadState;
  scouted: boolean;
  state: GameState;
  onClose: () => void;
  onTrain: () => void;
  onScout: () => void;
}

/** A stop up close: what it is, how it fights, and what you can do about it. */
function StopSheet({ stop, road, scouted, state, onClose, onTrain, onScout }: SheetProps) {
  const status = statusOf(stop, road);
  const patrol = status === 'next' && road.blockedByTest;
  const gear = gearOf(state);
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
      <div className="mx-auto w-full max-w-md animate-pop rounded-t-3xl bg-ink-900 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pixel-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className={status === 'fog' ? 'brightness-0 opacity-50' : ''}>
            <Foe sprite={stop.sprite} size={88} gear={gear} classId={state.profile.classId} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[9px] text-slate-400">{stopLabel(stop, patrol)}</p>
            <p className="mt-1 font-pixel text-xs text-red-300">{status === 'fog' ? 'Hidden in the Fog' : stop.name}</p>
            {stop.line && status !== 'fog' && <p className="mt-2 text-sm italic text-slate-300">{stop.line}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-slate-500">
            <X size={18} />
          </button>
        </div>

        {status === 'fog' ? (
          <p className="mt-4 text-sm text-slate-300">Win the stops before it and the Fog will show you what waits here.</p>
        ) : status === 'cleared' ? (
          <p className="mt-4 text-sm text-slate-300">Won. Ember remembers this one.</p>
        ) : (
          <>
            <p className="mt-4 text-sm text-slate-300">
              {patrol
                ? 'The final blow waits for your max test (Hero tab). Until then, your workouts fight a patrol here.'
                : 'Your next workout is this fight. Each set you log is a hit, and finishing your sets beats it.'}{' '}
              After each set it answers: it {stop.moves.map(moveText).join(', then ')}.
            </p>
            <button
              onClick={onTrain}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none"
            >
              <Play size={14} className="fill-ink-950" /> Go to today&apos;s workout
            </button>
            {road.canScout ? (
              <button onClick={onScout} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-800 py-3.5 text-sm text-slate-200">
                <Eye size={15} /> Scout it in the dark
              </button>
            ) : null}
            <p className="mt-2 text-center text-xs text-slate-500">
              {scouted ? (
                <span className="inline-flex items-center gap-1 text-sky-300">
                  <Shield size={12} /> Scouted: one extra shield when you fight it.
                </span>
              ) : road.canScout ? (
                'A harder fight right now, all skill. Win it for one extra shield in your workout.'
              ) : state.sessions.length === 0 ? (
                'Scouting opens after your first workout.'
              ) : null}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

interface NodeProps {
  stop: Stop;
  status: StopStatus;
  stars: number;
  patrol: boolean;
  gear: ReturnType<typeof gearOf>;
  classId?: GameState['profile']['classId'];
  onOpen: () => void;
}

function StopNode({ stop, status, stars, patrol, gear, classId, onOpen }: NodeProps) {
  const ring =
    status === 'cleared'
      ? 'bg-emerald-900/70 ring-2 ring-emerald-400'
      : status === 'next'
        ? 'bg-amber-900/60 ring-2 ring-gold-400 animate-pulse'
        : 'bg-ink-900 ring-2 ring-ink-700';

  return (
    <button onClick={onOpen} aria-label={status === 'fog' ? `Hidden ${KIND_LABEL[stop.kind]}` : stop.name} className="flex w-[120px] flex-col items-center gap-1 active:scale-95">
      <span className={`relative grid h-14 w-14 place-items-center rounded-xl ${ring}`}>
        {status === 'fog' ? (
          <span className="brightness-0 opacity-50">
            <Foe sprite={stop.sprite} size={40} gear={gear} classId={classId} />
          </span>
        ) : (
          <Foe sprite={stop.sprite} size={44} gear={gear} classId={classId} />
        )}
        {status === 'cleared' && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-ink-950">
            <Check size={12} />
          </span>
        )}
        {status === 'fog' && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink-700 text-slate-400">
            <Lock size={11} />
          </span>
        )}
        {stop.kind === 'boss' && status !== 'fog' && (
          <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-ink-950">
            <Skull size={12} />
          </span>
        )}
      </span>
      <span className={`text-center text-[10px] leading-tight ${status === 'fog' ? 'text-slate-600' : 'text-slate-200'}`}>
        {status === 'fog' ? KIND_LABEL[stop.kind] : stop.name}
      </span>
      {status === 'cleared' ? (
        <span className="flex gap-0.5" aria-label={`${stars} of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <Star key={n} size={10} className={n <= stars ? 'fill-gold-400 text-gold-400' : 'text-ink-600'} />
          ))}
        </span>
      ) : status === 'next' ? (
        <span className="whitespace-nowrap rounded bg-gold-400 px-1.5 py-0.5 font-pixel text-[8px] text-ink-950">
          <Swords size={9} className="mr-1 inline" />
          {patrol ? 'Patrol' : 'Next fight'}
        </span>
      ) : (
        <span className="font-pixel text-[8px] text-slate-500">Fog</span>
      )}
    </button>
  );
}

function Segment({ from, to, lit, last }: { from: number; to: number; lit: boolean; last: boolean }) {
  // From this stop's centre down to the next stop's centre (92px lower); the first stop runs to camp.
  return (
    <svg className="pointer-events-none absolute left-0 top-1/2 h-[92px] w-full" viewBox="0 0 100 92" preserveAspectRatio="none" aria-hidden>
      <path
        d={`M ${from} 0 C ${from} 46, ${last ? 50 : to} 46, ${last ? 50 : to} 92`}
        fill="none"
        stroke={lit ? '#f59e0b' : '#30375a'}
        strokeWidth={lit ? 2.2 : 1.6}
        strokeDasharray={lit ? undefined : '3 3'}
        vectorEffect="non-scaling-stroke"
        style={{ strokeWidth: lit ? 4 : 3 }}
      />
    </svg>
  );
}

function Fog() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -inset-x-8 -inset-y-4 bg-[radial-gradient(closest-side,rgba(148,163,184,.30),rgba(148,163,184,.08)_70%,transparent)] blur-md"
        style={{ animation: 'fogdrift 7s ease-in-out infinite' }}
      />
    </div>
  );
}

/** Preview builds only: fake workouts so the road can be tried without training for real. */
function PreviewTools({ state, update }: Omit<Props, 'onTrain'>) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(window.location.hostname !== 'forma-nu-red.vercel.app');
  }, []);
  if (!show) return null;
  const addSession = () =>
    update((s) => {
      const road = roadState(s);
      const session: Session = {
        id: `preview-${Date.now()}`,
        date: new Date().toISOString(),
        kind: 'full',
        day: s.sessions.length % 2 === 0 ? 'A' : 'B',
        xp: 100,
        breakdown: [{ label: 'Preview session', xp: 100 }],
        entries: [],
        unlocked: [],
        ...(road.next ? { fight: { g: road.next.g, stars: 2, ...(road.blockedByTest ? { patrol: true } : {}) } } : {}),
      };
      return { ...s, sessions: [...s.sessions, session], road: road.next && !road.blockedByTest ? road.cleared + 1 : road.cleared };
    });
  return (
    <div className="rounded-xl border border-dashed border-sky-400/40 p-3">
      <p className="font-pixel text-[9px] text-sky-300">Preview only</p>
      <p className="mt-1 text-xs text-slate-400">Pretend you won a workout fight, to try the road. {state.sessions.length} sessions logged.</p>
      <div className="mt-2 flex gap-2">
        <button onClick={addSession} className="flex-1 rounded-lg bg-sky-500/20 py-2.5 text-sm text-sky-200">
          + 1 fake workout
        </button>
        <button onClick={() => update((s) => ({ ...s, road: 0, scouted: undefined }))} className="rounded-lg bg-ink-800 px-3 py-2.5 text-sm text-slate-300">
          Reset road
        </button>
      </div>
    </div>
  );
}

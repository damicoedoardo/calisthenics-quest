'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Lock, Skull, Swords } from 'lucide-react';
import { Ember } from './Characters';
import { Battle, Foe } from './Battle';
import { CHAPTERS, storyState } from '@/lib/story';
import { gearOf, type GameState, type Session } from '@/lib/game';
import { chapterStops, emberStage, EMBER_STAGES, roadState, statusOf, type Stop, type StopStatus } from '@/lib/road';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
}

/** Horizontal offset of each stop, so the road winds up the screen. */
const WIND = [50, 72, 58, 30, 22, 44, 68, 78, 56, 32];

const KIND_LABEL: Record<Stop['kind'], string> = { guardian: 'Guardian', fight: 'Fight', elite: 'Elite', boss: 'Boss' };

/** The Map: the chapter's road through the Fog. Sessions light it, fights clear it. */
export function MapTab({ state, update }: Props) {
  const story = storyState(state);
  const road = roadState(state);
  const ember = emberStage(state.sessions.length);
  const chapterIx = Math.min(story.index, CHAPTERS.length - 1);
  const chapter = CHAPTERS[chapterIx];
  const stops = chapterStops(chapterIx);
  const blows = stops.filter((s) => s.kind === 'boss');
  const [fight, setFight] = useState<{ stop: Stop; dark: boolean } | null>(null);
  const gear = gearOf(state);
  const frontier = useRef<HTMLDivElement>(null);

  useEffect(() => {
    frontier.current?.scrollIntoView({ block: 'center' });
  }, []);

  const lit = stops.filter((s) => s.g < road.lit).length;
  const cleared = stops.filter((s) => s.g < road.cleared).length;
  // Ember stands where the light ends.
  const emberAt = Math.min(Math.max(lit - 1, 0), stops.length - 1);

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
          <p className="text-xs text-slate-400">
            {cleared}/{stops.length} cleared · {lit} lit
          </p>
        </div>
        <h2 className="mt-1 font-pixel text-sm text-gold-300">{chapter.name}</h2>
        <p className="mt-2 text-sm text-slate-300">
          Every workout lights one more stop. Win the fight at each stop to move on. {chapter.enemy} takes {blows.length} blows, one per week.
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
                <Segment from={x} to={WIND[(idx - 1 + WIND.length) % WIND.length]} lit={st === 'cleared' || st === 'next' || st === 'lit'} last={idx === 0} />
                {st === 'fog' && <Fog />}
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%` }}>
                  <StopNode stop={stop} status={st} gear={gear} classId={state.profile.classId} onPlay={() => setFight({ stop, dark: st === 'dark' })} />
                </div>
                {isFrontier && lit > 0 && (
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
          {lit === 0 && <p className="mt-2 px-6 text-center text-xs text-slate-400">Do your first session to light the first stop.</p>}
        </div>
      </section>

      {road.blockedByTest && (
        <p className="rounded-xl bg-ink-800 p-3 text-sm text-slate-300">The final blow needs your max test. Log it on the Hero tab, then come back.</p>
      )}

      <PreviewTools state={state} update={update} />

      {fight && (
        <Battle
          state={state}
          stop={fight.stop}
          dark={fight.dark}
          onClose={() => setFight(null)}
          onWin={() => {
            update((s) => ({ ...s, road: Math.max(s.road ?? 0, fight.stop.g + 1) }));
            setFight(null);
          }}
        />
      )}
    </div>
  );
}

function StopNode({ stop, status, gear, classId, onPlay }: { stop: Stop; status: StopStatus; gear: ReturnType<typeof gearOf>; classId?: GameState['profile']['classId'] }  & { onPlay: () => void }) {
  const playable = status === 'next' || status === 'dark';
  const ring =
    status === 'cleared'
      ? 'bg-emerald-900/70 ring-2 ring-emerald-400'
      : status === 'next'
        ? 'bg-amber-900/60 ring-2 ring-gold-400 animate-pulse'
        : status === 'lit'
          ? 'bg-amber-950/60 ring-2 ring-gold-500/60'
          : status === 'dark'
            ? 'bg-[#1d1018] ring-2 ring-dashed ring-red-400/70'
            : 'bg-ink-900 ring-2 ring-ink-700';
  const tag =
    status === 'cleared' ? 'Cleared' : status === 'next' ? 'Play' : status === 'lit' ? 'Lit' : status === 'dark' ? 'In the dark' : 'Fog';

  const body = (
    <span className="flex w-[120px] flex-col items-center gap-1">
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
      <span
        className={`rounded px-1.5 py-0.5 font-pixel text-[8px] ${
          status === 'next'
            ? 'bg-gold-400 text-ink-950'
            : status === 'dark'
              ? 'bg-red-500/80 text-ink-950'
              : status === 'cleared'
                ? 'text-emerald-300'
                : 'text-slate-500'
        }`}
      >
        {playable && <Swords size={9} className="mr-1 inline" />}
        {tag}
      </span>
    </span>
  );

  return playable ? (
    <button onClick={onPlay} aria-label={`Fight ${stop.name}`} className="active:scale-95">
      {body}
    </button>
  ) : (
    body
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

/** Preview builds only: fake sessions so the road can be tried without training for real. */
function PreviewTools({ state, update }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(window.location.hostname !== 'forma-nu-red.vercel.app');
  }, []);
  if (!show) return null;
  const addSession = () =>
    update((s) => {
      const session: Session = {
        id: `preview-${Date.now()}`,
        date: new Date().toISOString(),
        kind: 'full',
        day: s.sessions.length % 2 === 0 ? 'A' : 'B',
        xp: 100,
        breakdown: [{ label: 'Preview session', xp: 100 }],
        entries: [],
        unlocked: [],
      };
      return { ...s, sessions: [...s.sessions, session] };
    });
  return (
    <div className="rounded-xl border border-dashed border-sky-400/40 p-3">
      <p className="font-pixel text-[9px] text-sky-300">Preview only</p>
      <p className="mt-1 text-xs text-slate-400">Pretend you trained, to try the road. {state.sessions.length} sessions logged.</p>
      <div className="mt-2 flex gap-2">
        <button onClick={addSession} className="flex-1 rounded-lg bg-sky-500/20 py-2.5 text-sm text-sky-200">
          + 1 fake session
        </button>
        <button onClick={() => update((s) => ({ ...s, road: 0 }))} className="rounded-lg bg-ink-800 px-3 py-2.5 text-sm text-slate-300">
          Reset road
        </button>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Sprite } from './Sprite';
import { Enemy } from './Characters';
import { PlaceBackdrop } from './Place';
import type { GameState } from '@/lib/game';
import { ZONES, zoneStatus, type Zone } from '@/lib/fog';
import { CHAPTERS } from '@/story/chapters';

/* The road through the Fog as a row of worlds: one big card in the middle, its neighbours peeking
   in at the sides. Swipe (scroll snap), the arrows or the dots change world. Each world is its
   chapter's place, with its boss in front; a shut world is dark, fogged and locked. Off-centre
   cards turn and shrink a little as they scroll, and the picture drifts behind the card. */

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
// Runs before paint in the browser, so the row opens on the right world without a jump.
const useBeforePaint = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function useCalm() {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const q = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!q) return;
    const on = () => setCalm(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return calm;
}

/** `land`: the Play tab held sideways. The picker fills the height it is given and each world is a
    wide card, its picture on the left and its words and Play on the right. */
export function WorldPicker({ state, onPlay, land = false }: { state: GameState; onPlay: (zone: Zone) => void; land?: boolean }) {
  const calm = useCalm();
  const statuses = ZONES.map((z) => zoneStatus(state, z));
  // The newest world you can play: where the row opens.
  const newest = Math.max(0, statuses.map((s) => s.state !== 'locked').lastIndexOf(true));
  const [active, setActive] = useState(newest);
  const box = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLDivElement | null)[]>([]);
  const arts = useRef<(HTMLDivElement | null)[]>([]);
  const frame = useRef(0);
  const activeRef = useRef(active);

  /** Turn, shrink and dim each card by how far it sits from the middle; move its picture a bit. */
  const paint = useCallback(() => {
    frame.current = 0;
    const el = box.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0,
      bestDist = Infinity;
    cards.current.forEach((card, i) => {
      if (!card) return;
      const o = (card.offsetLeft + card.offsetWidth / 2 - mid) / card.offsetWidth,
        a = Math.min(1, Math.abs(o));
      if (Math.abs(o) < bestDist) {
        bestDist = Math.abs(o);
        best = i;
      }
      card.style.opacity = String(1 - a * 0.45);
      card.style.transform = calm ? '' : `perspective(900px) rotateY(${clamp(o, -1, 1) * -12}deg) scale(${1 - a * 0.08})`;
      const art = arts.current[i];
      if (art) art.style.transform = calm ? 'scale(1.15)' : `translateX(${clamp(o, -1.5, 1.5) * -22}px) scale(1.15)`;
    });
    if (best !== activeRef.current) {
      activeRef.current = best;
      setActive(best);
    }
  }, [calm]);

  const onScroll = () => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  };

  const go = (i: number) => {
    const el = box.current,
      card = cards.current[i];
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2, behavior: calm ? 'auto' : 'smooth' });
  };

  // Open on the newest open world.
  useBeforePaint(() => {
    const el = box.current,
      card = cards.current[newest];
    if (el && card) el.scrollLeft = card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2;
    paint();
    // Only when the newest world changes (a boss falls, a chapter opens).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest]);

  useEffect(() => {
    paint();
    window.addEventListener('resize', paint);
    return () => {
      window.removeEventListener('resize', paint);
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [paint]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && active > 0) go(active - 1);
    else if (e.key === 'ArrowRight' && active < ZONES.length - 1) go(active + 1);
    else return;
    e.preventDefault();
  };

  const title = <p className="font-pixel text-[10px] text-slate-400">The road through the Fog</p>;
  // The gap before the first card and after the last, so they too can sit in the middle.
  const edge = land ? 'calc(9% - 0.75rem)' : 'calc(14% - 0.75rem)';
  return (
    <section className={land ? 'flex h-full flex-col' : 'space-y-2'} aria-roledescription="carousel" aria-label="The road through the Fog">
      {!land && title}

      <div
        ref={box}
        onScroll={onScroll}
        onKeyDown={onKey}
        tabIndex={0}
        className={`relative -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${land ? 'min-h-0 flex-1 py-1' : 'py-3'}`}
      >
        <div aria-hidden className="shrink-0" style={{ width: edge }} />
        {ZONES.map((z, i) => (
          <WorldCard
            key={z.id}
            zone={z}
            index={i}
            state={state}
            active={i === active}
            cardRef={(el) => (cards.current[i] = el)}
            artRef={(el) => (arts.current[i] = el)}
            onPick={() => go(i)}
            onPlay={() => onPlay(z)}
            land={land}
          />
        ))}
        <div aria-hidden className="shrink-0" style={{ width: edge }} />
      </div>

      {/* Sideways the title sits on the left of the arrows and dots. */}
      <Wrap on={land} className="mt-1.5 flex shrink-0 items-center justify-between gap-3">
      {land && title}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => go(active - 1)}
          disabled={active === 0}
          aria-label="Previous world"
          className="grid h-9 w-9 place-items-center rounded-full bg-ink-800 text-slate-200 active:scale-95 disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5">
          {ZONES.map((z, i) => {
            const st = statuses[i].state;
            return (
              <button key={z.id} onClick={() => go(i)} aria-label={`Go to ${z.name}`} aria-current={i === active} className="grid h-6 place-items-center px-0.5">
                <span
                  className={`block h-2 rounded-sm transition-all motion-reduce:transition-none ${i === active ? 'w-5' : 'w-2'} ${
                    st === 'locked' ? 'bg-ink-600' : st === 'cleared' ? 'bg-emerald-500' : 'bg-gold-400'
                  } ${i === active ? '' : 'opacity-70'}`}
                />
              </button>
            );
          })}
        </div>
        <button
          onClick={() => go(active + 1)}
          disabled={active === ZONES.length - 1}
          aria-label="Next world"
          className="grid h-9 w-9 place-items-center rounded-full bg-ink-800 text-slate-200 active:scale-95 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      </Wrap>
    </section>
  );
}

interface CardProps {
  zone: Zone;
  index: number;
  state: GameState;
  active: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
  artRef: (el: HTMLDivElement | null) => void;
  onPick: () => void;
  onPlay: () => void;
  land: boolean;
}

function WorldCard({ zone: z, index, state, active, cardRef, artRef, onPick, onPlay, land }: CardProps) {
  const st = zoneStatus(state, z);
  const best = state.fog?.best[z.id];
  const locked = st.state === 'locked',
    cleared = st.state === 'cleared';
  const chapter = CHAPTERS[index];

  return (
    <div
      ref={cardRef}
      onClick={active ? undefined : onPick}
      aria-roledescription="slide"
      aria-label={`World ${index + 1} of ${ZONES.length}: ${z.name}`}
      className={`flex shrink-0 snap-center snap-always overflow-hidden ${land ? 'w-[82%] flex-row' : 'w-[72%] flex-col'} rounded-2xl pixel-border will-change-transform ${locked ? 'bg-ink-900' : 'bg-ink-800'} ${active ? '' : 'cursor-pointer'}`}
    >
      {/* The world itself: its place, its boss in front; fog, dark and a padlock while it is shut. */}
      <div className={`relative overflow-hidden ${land ? 'w-[54%] shrink-0' : 'h-52'}`}>
        <div ref={artRef} className="absolute inset-0" style={{ transform: 'scale(1.15)' }}>
          <PlaceBackdrop id={chapter.place} className={`h-full w-full ${locked ? 'brightness-[.5] grayscale-[.5]' : ''}`} />
        </div>
        {locked && <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ink-950/80 via-indigo-950/30 to-indigo-950/10" />}

        {/* The boss in front of its world; while the world is shut, only its shadow with a cold rim. */}
        <div
          aria-hidden
          className={`absolute left-1/2 -translate-x-1/2 ${locked ? 'bottom-3 opacity-90' : 'bottom-2'}`}
          style={locked ? { filter: 'brightness(0) drop-shadow(0 0 1px #c7d2fe) drop-shadow(0 0 8px rgba(129,140,248,.7))' } : undefined}
        >
          <Enemy id={chapter.enemySprite} size={locked ? 84 : 96} />
        </div>

        {locked && (
          <>
            <div aria-hidden className="absolute -left-20 bottom-8 animate-drift opacity-25 [animation-delay:-4s] motion-reduce:animate-none">
              <Sprite id="fogBank" size={240} flip label="" />
            </div>
            <div aria-hidden className="absolute -left-10 -bottom-3 animate-drift opacity-45 motion-reduce:animate-none">
              <Sprite id="fogBank" size={220} label="" />
            </div>
            <div aria-hidden className="absolute -right-14 -bottom-5 animate-drift opacity-55 [animation-delay:-9s] motion-reduce:animate-none">
              <Sprite id="fogBank" size={200} flip label="" />
            </div>
          </>
        )}
        <div
          aria-hidden
          className={`absolute ${land ? 'inset-y-0 right-0 w-10 bg-gradient-to-l' : 'inset-x-0 bottom-0 h-12 bg-gradient-to-t'} ${locked ? 'from-ink-900' : 'from-ink-800'} to-transparent`}
        />

        {locked && (
          <div className="absolute inset-x-0 top-6 flex justify-center">
            <div className="animate-float drop-shadow-[0_0_10px_rgba(251,191,36,.35)] motion-reduce:animate-none">
              <Sprite id="worldLock" size={80} label="Locked" />
            </div>
          </div>
        )}

        {cleared && (
          <span className="absolute right-2 top-2 flex items-center gap-1.5 rounded-lg bg-ink-950/80 py-1 pl-1 pr-2 font-pixel text-[8px] text-emerald-300">
            <Sprite id="uiIcon" opts={{ name: 'check' }} size={20} label="" />
            Cleared
          </span>
        )}
        <span className="absolute left-2 top-2 rounded-lg bg-ink-950/80 px-2 py-1 font-pixel text-[8px] text-slate-300">World {index + 1}</span>
      </div>

      <div className={`flex flex-1 flex-col ${land ? 'min-w-0 py-3 pl-2 pr-3' : 'px-4 pb-4 pt-1'}`}>
        {/* Sideways the words scroll if they must; Play stays at the bottom, always in sight. */}
        <Wrap on={land} className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2">
          <Sprite id="zoneIcon" opts={{ zone: z.id }} size={24} label="" className={`shrink-0 ${locked ? 'opacity-50 brightness-50 grayscale' : ''}`} />
          <div className="min-w-0">
            <h3 className={`font-pixel text-[11px] leading-snug ${locked ? 'text-slate-400' : 'text-gold-300'}`}>{z.name}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Chapter {z.chapter}
              {chapter.name !== z.name && `: ${chapter.name}`}
            </p>
          </div>
        </div>
        {!locked && (
          <p className="mt-2 text-xs text-slate-300">
            {best ? (best.won ? `Cleared in ${clock(best.seconds)}` : `Best: ${clock(best.seconds)}, level ${best.level}`) : `Ten floors down, then ${z.bossName}.`}
          </p>
        )}
        {st.state === 'open' && !best && z.firstTry && <p className="mt-1 text-[11px] text-gold-300">{z.firstTry}</p>}
        {st.state === 'open' && !best?.won && <p className="mt-1 text-[11px] text-sky-300">{z.hint}</p>}
        </Wrap>

        <div className={land ? 'shrink-0 pt-2' : 'mt-auto pt-3'}>
          {locked ? (
            <div className="flex items-center gap-2 rounded-xl bg-ink-950 px-3 py-2.5 text-xs text-slate-300">
              <Sprite id="uiIcon" opts={{ name: 'lock' }} size={16} label="Locked" className="shrink-0" />
              <span>{st.why}</span>
            </div>
          ) : (
            <button
              onClick={active ? onPlay : undefined}
              tabIndex={active ? 0 : -1}
              className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 font-pixel text-[10px] text-ink-950 active:scale-95 ${land ? 'py-2.5' : 'py-3'}`}
            >
              <Sprite id="uiIcon" opts={{ name: 'play' }} size={14} label="" />
              {cleared ? 'Again' : 'Play'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** A box only when `on`; otherwise its children as they are, so the upright layout is untouched. */
function Wrap({ on, className, children }: { on: boolean; className: string; children: ReactNode }) {
  return on ? <div className={className}>{children}</div> : <>{children}</>;
}

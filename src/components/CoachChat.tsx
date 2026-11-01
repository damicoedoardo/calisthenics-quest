'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, MessageCircle, Play, RotateCcw, SendHorizontal, X } from 'lucide-react';
import type { Checkin, GameState } from '@/lib/game';
import { minutesOf } from '@/lib/coach/time';
import { shownChat } from '@/lib/coach/chat';
import { dayLabel, daysIn, nextDay, restKept, todayIs, weekdayOf, weekOf, weekSlots } from '@/lib/coach/week';
import { dayKey } from '@/lib/days';
import { fireLine, updateTodayPage } from '@/story/daily';
import { SitByFire } from './SitByFire';
import { Sprite } from './Sprite';
import { freshNudge, hearNudge, type Nudge } from '@/lib/coach/nudge';
import { cloudConfigured, maybeSignedIn, supabase, useCloudStatus } from '@/lib/cloud-client';
import { flameStage } from '@/story/flame';
import { Ember } from './Characters';
import { PlaceBackdrop } from './Place';
import { CoachKnows, doseOf } from './CoachPanel';
import { MiniDemo } from './Workout';
import { WorkoutList } from './WorkoutList';
import { useCoachChat } from './useCoach';

/* The coach is your flame. On the Train tab: what it says (it brings things up on its own, nudge.ts)
   and the week it planned: a chip per day and that day's workout as cards, each with its pixel demo
   (tap for how to do it) and an easier and a swap. Tap "Talk" and the chat opens at the camp fire, in the
   story's dialogue boxes: the flame asks, you tap a reply or type, and it builds and changes your
   workouts as you talk. */

type Update = (fn: (s: GameState) => GameState) => void;

const nameOf = (s: GameState) => s.profile.flame?.trim() || 'Ember';

/** What the flame says on the card: something new it brings up, else its last words, else a hello. */
function lastWords(state: GameState, nudge: Nudge | undefined): string {
  if (nudge) return nudge.text;
  const said = shownChat(state.coach?.chat).filter((l) => l.who === 'coach');
  const last = said[said.length - 1];
  if (last && last.who === 'coach') return last.text;
  return state.coach?.profile ? 'Want to change something in your week? Just tell me.' : "Hey, it's me. Let's plan your training together. Tell me where you're at, and I'll plan every week for you.";
}

export function CoachScreen({ state, update, onStart }: { state: GameState; update: Update; onStart: (c: Checkin) => void }) {
  const [chat, setChat] = useState(false);
  const [knows, setKnows] = useState(false);
  const stage = flameStage(state.sessions.length).id;
  const nudge = freshNudge(state, new Date());
  const open = () => {
    // What the flame brought up is said in the chat too; an empty chat opens with it from the coach.
    if (nudge) update((s) => hearNudge(s, nudge, !!s.coach?.chat?.length));
    setChat(true);
  };
  return (
    <div className="space-y-4 land:grid land:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] land:items-start land:gap-3 land:space-y-0">
      <section className="rounded-2xl bg-ink-800 p-3 pixel-border">
        <div className="flex items-end gap-3">
          <div className="grid h-20 w-16 shrink-0 place-items-end justify-center">
            <Ember size={64} stage={stage} mood={nudge ? 'bright' : 'happy'} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-pixel text-[10px] text-gold-300">
              {nameOf(state)}
              {nudge && <span aria-label="New" className="h-1.5 w-1.5 rounded-full bg-gold-300" />}
            </p>
            <p className="mt-1.5 line-clamp-4 text-sm leading-snug text-slate-100">{lastWords(state, nudge)}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={open} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 active:shadow-none">
            <MessageCircle size={14} /> {!state.coach?.profile ? "Let's start" : nudge ? 'Answer' : 'Talk'}
          </button>
          {state.coach?.profile && (
            <button onClick={() => setKnows((k) => !k)} aria-expanded={knows} className="rounded-xl bg-ink-700 px-3 text-xs font-semibold text-slate-200">
              What I know
            </button>
          )}
        </div>
        {knows && (
          <div className="mt-3">
            <CoachKnows state={state} update={update} />
          </div>
        )}
      </section>

      {state.coach?.profile ? (
        <WeekBoard state={state} update={update} onStart={onStart} />
      ) : (
        <p className="rounded-2xl border border-dashed border-ink-600 p-4 text-center text-sm text-slate-400">Your week shows here once we&apos;ve planned it together. Tap &quot;Let&apos;s start&quot; and tell {nameOf(state)} where you&apos;re at.</p>
      )}
      {chat && <CoachChat state={state} update={update} onClose={() => setChat(false)} />}
    </div>
  );
}

/** The plan's two weeks, this one and next: a switch between them, a chip for each of the week's
    seven days (workouts and rest days; done and kept ticked, the next workout lit), and the chosen
    day: its workout as cards, or the rest day to keep. */
function WeekBoard({ state, update, onStart }: { state: GameState; update: Update; onStart: (c: Checkin) => void }) {
  const now = new Date();
  const today = dayKey(now);
  const week = state.coach?.week;
  const next = nextDay(week);
  const [picked, setPicked] = useState<string | null>(null);
  const [shown, setShown] = useState<0 | 1 | null>(null);
  const [fire, setFire] = useState(false);
  const inProgress = !!state.draft && Object.values(state.draft.sets).some((s) => s.length > 0);
  if (!week) return <p className="rounded-2xl bg-ink-800 p-3 text-sm text-slate-400">Getting your week ready…</p>;
  // What today is comes from `todayIs`, the same Today reads. It opens on the workout to do today
  // (a missed one too); once today's is done, on the next one, so you see what's coming (next
  // week's, when this week's are all done); on a rest day, on today.
  const todays = todayIs(state, now);
  const ahead = todays.kind !== 'rest' && next ? next : undefined;
  const which: 0 | 1 = shown ?? (picked ? weekOf(week, picked) : ahead ? weekOf(week, ahead.date) : 0);
  const slots = weekSlots(week, which);
  const todaySlot = slots.find((s) => s.date === today);
  const aheadSlot = ahead ? slots.find((s) => s.day === ahead) : undefined;
  const slot = slots.find((s) => s.date === picked) ?? aheadSlot ?? todaySlot ?? slots.find((s) => s.day && !s.day.done) ?? slots[0];
  const canStart = inProgress || todays.kind === 'workout';
  const day = slot.day;
  const shownDays = daysIn(week, which);
  const show = (w: 0 | 1) => {
    setShown(w);
    setPicked(null);
  };
  return (
    <section className="rounded-2xl bg-ink-800 p-3">
      <div className="flex items-center justify-between gap-2">
        {/* This week or next: the plan always holds both, so next week can be seen and changed early. */}
        <div role="tablist" aria-label="Week" className="flex gap-1 rounded-lg bg-ink-900 p-0.5">
          {(['This week', 'Next week'] as const).map((label, i) => (
            <button
              key={label}
              role="tab"
              aria-selected={which === i}
              onClick={() => show(i as 0 | 1)}
              className={`rounded-md px-2 py-1 font-pixel text-[8px] ${which === i ? 'bg-ink-800 text-gold-300' : 'text-slate-500 active:text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="font-mono text-[11px] text-slate-400">
          {which === 1 && !week.ahead ? 'planning…' : `${shownDays.filter((d) => d.done).length} of ${shownDays.length} done`}
        </p>
      </div>
      {/* A chip a day, Monday to Sunday: its date and what it is (a dumbbell to train, a flame to
          rest, a tick once done or kept). Today has a dot under it; the next workout is lit. */}
      <ul className="mt-2 grid grid-cols-7 gap-1">
        {slots.map((s) => {
          const on = s === slot;
          const done = s.day ? !!s.day.done : !s.before && restKept(state, s.date);
          const lit = !!s.day && s.day === next;
          const icon = done ? 'check' : s.day ? 'tabTrain' : s.before ? null : 'flame';
          return (
            <li key={s.date}>
              <button
                onClick={() => setPicked(s.date)}
                aria-pressed={on}
                aria-label={`${weekdayOf(s.date)}${s.date === today ? ', today' : ''}: ${s.day ? s.day.plan.title : s.before ? 'before the plan' : 'rest day'}${done ? ', done' : lit ? ', next' : ''}`}
                className={`relative flex w-full flex-col items-center rounded-lg pb-2 pt-1.5 ${on ? 'ring-1 ring-gold-400' : ''} ${lit ? 'bg-gold-400/15' : s.day ? 'bg-ink-900' : s.before ? 'bg-ink-900/30' : 'bg-ink-900/60'} ${s.before ? 'text-slate-600' : lit ? 'text-gold-300' : 'text-slate-300'}`}
              >
                <span className="font-pixel text-[7px]">{weekdayOf(s.date)}</span>
                <span className="mt-1 font-mono text-sm leading-none">{Number(s.date.slice(8))}</span>
                <span className={`mt-1.5 grid h-3 place-items-center ${done ? '' : s.day ? '' : 'opacity-60'}`}>
                  {icon && <Sprite id="uiIcon" opts={{ name: icon }} size={12} label="" className={done ? '' : lit ? '' : s.day ? 'opacity-70 grayscale' : ''} />}
                </span>
                {s.date === today && <span aria-hidden className="absolute bottom-0.5 h-1 w-1 rounded-full bg-gold-300" />}
              </button>
            </li>
          );
        })}
      </ul>
      {day ? (
        <>
          <div className="mt-3">
            <WorkoutList
              state={state}
              update={update}
              items={day.plan.items}
              changeable={!day.done}
              date={day.date}
              progress={inProgress && day === next ? Object.fromEntries(Object.entries(state.draft!.sets).map(([k, v]) => [k, v.length])) : undefined}
              when={dayLabel(day.date, now)}
              title={day.plan.title}
              time={day.done ? 'done' : `about ${minutesOf(day.plan.items)} min`}
            />
          </div>
          {day === next && !canStart ? (
            <p className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-ink-900 py-3 text-xs text-slate-400">
              <Sprite id="uiIcon" opts={{ name: 'lock' }} size={12} label="" />{' '}
              {day.date > today
                ? `Opens ${dayLabel(day.date, now) === 'Tomorrow' ? 'tomorrow' : `on ${weekdayOf(day.date)}`}. ${todays.kind === 'done' ? 'Today is done.' : 'Today, rest.'}`
                : 'Opens tomorrow. Today is done.'}
            </p>
          ) : day === next ? (
            <button
              onClick={() => onStart(inProgress ? state.draft!.checkin : 'normal')}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3 font-pixel text-[10px] text-ink-950 shadow-[0_3px_0_#047857] active:translate-y-0.5 active:shadow-none"
            >
              <Play size={14} /> {inProgress ? 'Back to it' : 'Start'}
            </button>
          ) : (
            !day.done && next && <p className="mt-3 text-center text-xs text-slate-400">Comes after {weekdayOf(next.date)}&apos;s workout.</p>
          )}
        </>
      ) : slot.before ? (
        <p className="mt-2 rounded-xl bg-ink-900 p-3 text-sm text-slate-400">
          <span className="text-slate-500">{dayLabel(slot.date, now)} · </span>Before this week&apos;s plan. Weeks run Monday to Sunday; the next one starts on Monday.
        </p>
      ) : (
        <div className="mt-2 rounded-xl bg-gradient-to-b from-[#1d1527] to-ink-900 p-3 ring-1 ring-orange-300/20">
          <p className="text-sm font-semibold text-orange-200">
            <span className="text-slate-400">{dayLabel(slot.date, now)} · </span>Rest day
          </p>
          <p className="mt-1 text-sm text-slate-300">Resting is part of the plan: it&apos;s when you get stronger. Keep the day by sitting by the fire for a minute. It counts, and your Fog runs that day start Rested.</p>
          {restKept(state, slot.date) ? (
            <p className="mt-2 text-xs text-emerald-300">Kept ✓</p>
          ) : slot.date === today ? (
            <button onClick={() => setFire(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-800 py-3 text-sm text-orange-200 ring-1 ring-orange-300/25 active:scale-[.98]">
              <Sprite id="uiIcon" opts={{ name: 'flame' }} size={18} label="" /> Sit by the fire · 1 minute
            </button>
          ) : slot.date < today ? (
            <p className="mt-2 text-xs text-slate-500">Not kept.</p>
          ) : null}
        </div>
      )}
      {fire && (
        <SitByFire
          name={nameOf(state)}
          stage={flameStage(state.sessions.length).id}
          line={fireLine(state, now)}
          onDone={(sat) => {
            if (sat) update((s) => updateTodayPage(s, new Date(), { fire: true }));
            setFire(false);
          }}
        />
      )}
    </section>
  );
}

/** Signed in? The cloud sync says so; in a sandbox it is off, so ask the stored session too. */
function useSignedIn(): boolean {
  const cloud = useCloudStatus();
  const [stored, setStored] = useState(false);
  useEffect(() => {
    if (!cloudConfigured || cloud.signedIn || !maybeSignedIn()) return;
    let gone = false;
    void supabase()
      .then((c) => c.auth.getSession())
      .then(({ data }) => !gone && setStored(!!data.session));
    return () => {
      gone = true;
    };
  }, [cloud.signedIn]);
  return cloudConfigured && (cloud.signedIn || stored);
}

/** The chat, at the camp fire: the flame above, its words and yours in dialogue boxes below. */
function CoachChat({ state, update, onClose }: { state: GameState; update: Update; onClose: () => void }) {
  const { send, busy, error, steps, since } = useCoachChat(state, update);
  const canTalk = useSignedIn();
  const [text, setText] = useState('');
  // The box grows with what you write, up to a good part of the screen, then scrolls.
  const box = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);
  const end = useRef<HTMLDivElement>(null);
  const lines = shownChat(state.coach?.chat);
  const week = state.coach?.week;
  const lastWorkout = lines.findLast((l) => l.who === 'workout')?.key;
  const replies = busy ? [] : (state.coach?.replies ?? []);
  const name = nameOf(state);
  const stage = flameStage(state.sessions.length).id;

  // An empty chat: the flame speaks first.
  const started = useRef(false);
  useEffect(() => {
    if (canTalk && !started.current && !(state.coach?.chat ?? []).length) {
      started.current = true;
      void send();
    }
  }, [canTalk, send, state.coach?.chat]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [lines.length, busy, error, steps.length]);

  const say = (t: string) => {
    const v = t.trim();
    if (!v || busy) return;
    setText('');
    void send(v);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950" role="dialog" aria-modal="true" aria-label={`Talk with ${name}`}>
      <div className="relative h-[30%] shrink-0 overflow-hidden land:h-[34%]">
        <PlaceBackdrop id="ashlands-camp" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink-950 to-transparent" />
        <div className="absolute inset-x-0 bottom-1 flex justify-center">
          {busy && <div aria-hidden className="absolute bottom-0 h-24 w-40 rounded-full bg-orange-400/25 blur-2xl motion-safe:animate-pulse" />}
          <div className={busy ? 'motion-safe:animate-flicker' : ''}>
            <Ember size={96} stage={stage} mood={busy ? 'bright' : 'happy'} />
          </div>
        </div>
        <div className="safe-top land-safe-x absolute inset-x-0 top-0 flex justify-end px-4">
          <button onClick={onClose} aria-label="Close" className="mt-2 grid h-10 w-10 place-items-center rounded-lg bg-ink-900/80">
            <X size={18} />
          </button>
        </div>
      </div>

      <main className="land-safe-x mx-auto w-full max-w-md flex-1 overflow-y-auto px-4 pt-3 land:max-w-2xl" aria-live="polite">
        <ul className="space-y-2.5">
          {!canTalk && (
            <li className="rounded-xl bg-ink-800/95 p-3 pixel-border">
              <p className="mb-1.5 font-pixel text-[10px] text-gold-300">{name}</p>
              <p className="text-[15px] leading-snug text-slate-100">
                To talk with me, you need to be signed in, with signal.
              </p>
            </li>
          )}
          {lines.map((l) =>
            l.who === 'coach' ? (
              <li key={l.key} className="animate-fadein rounded-xl bg-ink-800/95 p-3 pixel-border">
                <p className="mb-1.5 font-pixel text-[10px] text-gold-300">{name}</p>
                <p className="whitespace-pre-line text-[15px] leading-snug text-slate-100">{l.text}</p>
              </li>
            ) : l.who === 'you' ? (
              <li key={l.key} className="ml-10 animate-fadein rounded-xl bg-sky-900/50 p-3 text-right">
                <p className="whitespace-pre-line text-[15px] leading-snug text-sky-50">{l.text}</p>
              </li>
            ) : (
              <li key={l.key} className="animate-fadein rounded-xl bg-emerald-900/30 p-2.5 ring-1 ring-emerald-700/50">
                {l.key === lastWorkout && week ? (
                  <>
                    <p className="font-pixel text-[9px] text-emerald-200">Your week</p>
                    <ul className="mt-2 space-y-2">
                      {week.days.map((d) => (
                        <li key={d.date} className={d.done ? 'opacity-50' : ''}>
                          <p className="text-[11px] text-slate-300">
                            <span className="font-semibold text-emerald-200">{dayLabel(d.date, new Date())}</span> · {d.plan.title}
                            {d.done && ' ✓'}
                          </p>
                          <ul className="mt-1 flex gap-1.5 overflow-x-auto pb-1">
                            {d.plan.items
                              .filter((it) => it.role !== 'warmup' && it.role !== 'stretch')
                              .map((it) => (
                                <li key={it.id} className="flex w-[64px] shrink-0 flex-col items-center text-center">
                                  <MiniDemo state={state} exercise={it.demo} name={it.name} size={44} />
                                  <span className="mt-0.5 line-clamp-2 text-[9px] leading-tight text-slate-200">{it.name}</span>
                                  <span className="font-mono text-[9px] text-slate-400">{doseOf(it)}</span>
                                </li>
                              ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[11px] text-emerald-200/80">On the Train tab: tap a card for how to do it, or make it easier.</p>
                  </>
                ) : (
                  <p className="text-xs text-emerald-200/80">Week changed.</p>
                )}
              </li>
            ),
          )}
          {busy && <Working name={name} steps={steps} since={since} />}
          {error && !busy && (
            <li className="rounded-xl bg-ink-800/95 p-3 pixel-border">
              <p className="mb-1.5 font-pixel text-[10px] text-gold-300">{name}</p>
              <p className="text-[15px] leading-snug text-slate-100">{error}</p>
              <button onClick={() => void send()} className="mt-2 flex items-center gap-1.5 rounded-lg bg-ink-700 px-3 py-1.5 text-xs font-semibold text-gold-300 active:scale-95">
                <RotateCcw size={13} /> Try again
              </button>
            </li>
          )}
        </ul>
        <div ref={end} className="h-3" />
      </main>

      <footer className="safe-bottom land-safe-x mx-auto w-full max-w-md px-4 pt-2 land:max-w-2xl">
        {canTalk && replies.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {replies.map((r) => (
              <button key={r} onClick={() => say(r)} className="rounded-full bg-ink-800 px-3 py-2 text-sm text-gold-300 ring-1 ring-gold-400/60 active:scale-95">
                {r}
              </button>
            ))}
          </div>
        )}
        {canTalk && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              say(text);
            }}
            className="flex items-end gap-2"
          >
            <div className="relative min-w-0 flex-1">
              <textarea
                ref={box}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  // Enter sends on a keyboard; on a phone it's a new line, and the button sends.
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
                    e.preventDefault();
                    say(text);
                  }
                }}
                rows={1}
                maxLength={1000}
                placeholder={busy ? `${name} is working… you can type` : `Tell ${name}…`}
                aria-label={`Message to ${name}`}
                className="block max-h-[40dvh] min-h-[44px] w-full resize-none overflow-y-auto rounded-xl bg-ink-800 px-3 py-2.5 text-[15px] leading-snug text-slate-100 transition-[height] duration-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-400 motion-reduce:transition-none"
              />
              {text.length > 800 && <span className="pointer-events-none absolute bottom-1 right-2 font-mono text-[10px] text-slate-500">{text.length}/1000</span>}
            </div>
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-400 text-ink-950 disabled:opacity-30">
              <SendHorizontal size={18} />
            </button>
          </form>
        )}
      </footer>
    </div>
  );
}

/** The flame at work: what it did so far this turn, ticked off, and what it's on now. */
function Working({ name, steps, since }: { name: string; steps: string[]; since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const sec = Math.max(0, Math.round((now - since) / 1000));
  return (
    <li className="animate-fadein rounded-xl bg-ink-800/95 p-3 pixel-border" role="status" aria-live="polite">
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="font-pixel text-[10px] text-gold-300">{name}</p>
        {sec >= 3 && <span className="font-mono text-[10px] text-slate-500">{sec}s</span>}
      </div>
      <ul className="space-y-1">
        {steps.map((s, i) => (
          <li key={`${s}${i}`} className="flex items-center gap-1.5 text-xs text-emerald-300/90 animate-fadein">
            <Check size={12} /> {s}
          </li>
        ))}
        <li className="flex items-center gap-2 text-sm text-slate-200">
          <span className="flex items-end gap-1" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 bg-gold-400 motion-safe:animate-bob" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
          {steps.length ? 'Working on it' : 'Thinking'}
          {sec >= 15 ? ': a whole week takes a moment' : '…'}
        </li>
      </ul>
    </li>
  );
}

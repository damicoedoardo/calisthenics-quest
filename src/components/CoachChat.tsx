'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Play, SendHorizontal, Shuffle, TrendingDown, X } from 'lucide-react';
import type { Checkin, GameState } from '@/lib/game';
import { ROLE_COLOR, ROLE_LABEL } from '@/lib/program';
import { changeItem } from '@/lib/coach/plan';
import { minutesOf } from '@/lib/coach/validate';
import { shownChat } from '@/lib/coach/chat';
import type { PlanItem } from '@/lib/coach/types';
import { cloudConfigured, maybeSignedIn, supabase, useCloudStatus } from '@/lib/cloud-client';
import { flameStage } from '@/story/flame';
import { Ember } from './Characters';
import { PlaceBackdrop } from './Place';
import { CoachKnows, doseOf } from './CoachPanel';
import { CoachSetup } from './CoachSetup';
import { Choices, MiniDemo } from './Workout';
import { useCoachChat } from './useCoach';

/* The coach is your flame. On the Train tab: its last words and today's workout as cards, each with
   its pixel demo and an easier and a swap. Tap "Talk" and the chat opens at the camp fire, in the
   story's dialogue boxes: the flame asks, you tap a reply or type, and it builds and changes your
   workouts as you talk. */

type Update = (fn: (s: GameState) => GameState) => void;

const nameOf = (s: GameState) => s.profile.flame?.trim() || 'Ember';

/** What the flame says on the card: its last words, or a hello. */
function lastWords(state: GameState): string {
  const said = shownChat(state.coach?.chat).filter((l) => l.who === 'coach');
  const last = said[said.length - 1];
  if (last && last.who === 'coach') return last.text;
  return state.coach?.profile ? 'Want to change something about today? Just tell me.' : "Hey, it's me. Let's plan your training together. Tell me where you're at, and I'll build every workout for you.";
}

export function CoachScreen({ state, update, onStart }: { state: GameState; update: Update; onStart: (c: Checkin) => void }) {
  const [chat, setChat] = useState(false);
  const [knows, setKnows] = useState(false);
  const plan = state.coach?.plan;
  const stage = flameStage(state.sessions.length).id;
  const inProgress = !!state.draft && Object.values(state.draft.sets).some((s) => s.length > 0);
  return (
    <div className="space-y-4 land:grid land:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] land:items-start land:gap-3 land:space-y-0">
      <section className="rounded-2xl bg-ink-800 p-3 pixel-border">
        <div className="flex items-end gap-3">
          <div className="grid h-20 w-16 shrink-0 place-items-end justify-center">
            <Ember size={64} stage={stage} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[10px] text-gold-300">{nameOf(state)}</p>
            <p className="mt-1.5 line-clamp-4 text-sm leading-snug text-slate-100">{lastWords(state)}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setChat(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 active:shadow-none">
            <MessageCircle size={14} /> {state.coach?.profile ? 'Talk' : "Let's start"}
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

      {state.coach?.profile && (
        <section className="rounded-2xl bg-ink-800 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-pixel text-[10px] text-gold-300">Today's workout</h2>
            {plan && <span className="text-xs text-slate-400">about {minutesOf(plan.items)} min</span>}
          </div>
          {plan ? (
            <>
              <p className="mt-1.5 text-sm font-semibold text-slate-100">{plan.title}</p>
              <WorkoutCards state={state} update={update} items={plan.items} />
              <button
                onClick={() => onStart(inProgress ? state.draft!.checkin : 'normal')}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3 font-pixel text-[10px] text-ink-950 shadow-[0_3px_0_#047857] active:translate-y-0.5 active:shadow-none"
              >
                <Play size={14} /> {inProgress ? 'Back to it' : 'Start'}
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Getting your workout ready…</p>
          )}
        </section>
      )}
      {chat && <CoachChat state={state} update={update} onClose={() => setChat(false)} />}
    </div>
  );
}

/** The workout as cards: the demo, the dose, and easier and swap right there. */
export function WorkoutCards({ state, update, items }: { state: GameState; update: Update; items: PlanItem[] }) {
  const [open, setOpen] = useState<{ id: string; kind: 'easier' | 'swap' } | null>(null);
  const opened = items.find((i) => i.id === open?.id);
  return (
    <>
      <ul className="mt-2 grid grid-cols-2 gap-2 min-[560px]:grid-cols-3">
        {items.map((it) => {
          const end = it.role === 'warmup' || it.role === 'stretch';
          return (
            <li key={it.id} className={`flex flex-col rounded-xl bg-ink-900 p-2 ${it.skipped ? 'opacity-40' : ''}`}>
              <div className="flex justify-center">
                <MiniDemo state={state} exercise={it.demo} name={it.name} size={end ? 48 : 64} />
              </div>
              <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[it.role] }}>
                {ROLE_LABEL[it.role]}
                {it.changed && <span className="ml-1 normal-case tracking-normal text-sky-300">{it.changed.how === 'easier' ? 'easier' : 'swapped'}</span>}
              </p>
              <p className="line-clamp-2 text-xs font-semibold leading-tight text-slate-100">{it.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">{doseOf(it, it.run ? undefined : state.reps[it.id])}</p>
              {!end && !it.run && (it.easier.length > 0 || it.swaps.length > 0) && (
                <div className="mt-auto flex gap-1 pt-2">
                  {it.easier.length > 0 && (
                    <button onClick={() => setOpen({ id: it.id, kind: 'easier' })} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-ink-700 py-1.5 text-[10px] font-semibold text-slate-200">
                      <TrendingDown size={11} className="text-sky-300" /> Easier
                    </button>
                  )}
                  {it.swaps.length > 0 && (
                    <button onClick={() => setOpen({ id: it.id, kind: 'swap' })} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-ink-700 py-1.5 text-[10px] font-semibold text-slate-200">
                      <Shuffle size={11} className="text-gold-300" /> Swap
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {open && opened && (
        <Choices
          title={open.kind === 'easier' ? `Easier than ${opened.name}` : `Instead of ${opened.name}`}
          hint={open.kind === 'easier' ? 'The same movement, a step down.' : 'Trains the same thing.'}
          list={open.kind === 'easier' ? opened.easier : opened.swaps}
          state={state}
          onPick={(c) => {
            update((s) => changeItem(s, opened.id, c, open.kind));
            setOpen(null);
          }}
          onClose={() => setOpen(null)}
        />
      )}
    </>
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
  const { send, busy, error } = useCoachChat(state, update);
  const canTalk = useSignedIn();
  const [text, setText] = useState('');
  const [taps, setTaps] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const lines = shownChat(state.coach?.chat);
  const plan = state.coach?.plan;
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
  }, [lines.length, busy, error]);

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
          <Ember size={96} stage={stage} mood={busy ? 'bright' : 'happy'} />
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
                To talk with me, sign in first: Hero tab, then Settings. It backs up your save too. Or answer a few quick taps and I'll start from those.
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
                {l.key === lastWorkout && plan ? (
                  <>
                    <p className="font-pixel text-[9px] text-emerald-200">{plan.title}</p>
                    <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {plan.items.map((it) => (
                        <li key={it.id} className="flex w-[76px] shrink-0 flex-col items-center text-center">
                          <MiniDemo state={state} exercise={it.demo} name={it.name} size={52} />
                          <span className="mt-1 line-clamp-2 text-[10px] leading-tight text-slate-200">{it.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{doseOf(it)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[11px] text-emerald-200/80">On the Train tab, each one has Easier and Swap.</p>
                  </>
                ) : (
                  <p className="text-xs text-emerald-200/80">Workout changed.</p>
                )}
              </li>
            ),
          )}
          {busy && (
            <li className="rounded-xl bg-ink-800/95 p-3 pixel-border">
              <p className="mb-1.5 font-pixel text-[10px] text-gold-300">{name}</p>
              <p className="text-lg leading-none text-slate-300">
                <span className="animate-blink">• • •</span>
              </p>
            </li>
          )}
          {error && (
            <li className="rounded-xl bg-ink-800/95 p-3 pixel-border">
              <p className="mb-1.5 font-pixel text-[10px] text-gold-300">{name}</p>
              <p className="text-[15px] leading-snug text-slate-100">{error}</p>
            </li>
          )}
        </ul>
        <div ref={end} className="h-3" />
      </main>

      <footer className="safe-bottom land-safe-x mx-auto w-full max-w-md px-4 pt-2 land:max-w-2xl">
        {(replies.length > 0 || !canTalk) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {canTalk
              ? replies.map((r) => (
                  <button key={r} onClick={() => say(r)} className="rounded-full bg-ink-800 px-3 py-2 text-sm text-gold-300 ring-1 ring-gold-400/60 active:scale-95">
                    {r}
                  </button>
                ))
              : (
                  <button onClick={() => setTaps(true)} className="rounded-full bg-ink-800 px-3 py-2 text-sm text-gold-300 ring-1 ring-gold-400/60 active:scale-95">
                    Quick taps instead
                  </button>
                )}
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
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  say(text);
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder={`Tell ${name}…`}
              aria-label={`Message to ${name}`}
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl bg-ink-800 px-3 py-2.5 text-[15px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-gold-400"
            />
            <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-400 text-ink-950 disabled:opacity-30">
              <SendHorizontal size={18} />
            </button>
          </form>
        )}
      </footer>
      {taps && <CoachSetup state={state} update={update} onClose={() => setTaps(false)} />}
    </div>
  );
}

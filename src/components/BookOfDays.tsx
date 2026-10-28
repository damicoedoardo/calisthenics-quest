'use client';

import { useState } from 'react';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { useModal } from './useModal';
import { Book } from './Characters';
import { Sprite } from './Sprite';
import type { DayKind } from '@/sprites/characters/icons';
import { dayKey, daysApart } from '@/lib/days';
import type { DayPage, GameState } from '@/lib/game';
import { ALL_SCENES, storyWords } from '@/story/engine';
import { marginNote } from '@/story/daily';
import type { AnswerId } from '@/story/types';

const HEARTS: Extract<AnswerId, `heart${number}`>[] = ['heart1', 'heart2', 'heart3', 'heart4', 'heart5', 'heart6'];

/** The question each heart moment asked, straight from its scene. */
function heartPrompt(id: AnswerId): string {
  for (const { scene } of ALL_SCENES) if (scene.ask?.kind === 'choice' && scene.ask.id === id) return scene.ask.prompt;
  return '';
}

/** What a day held: a workout, a rest day, or just a visit. */
function whatHappened(page: DayPage, state: GameState): DayKind {
  const date = new Date(`${page.day}T12:00:00`);
  const that = state.sessions.filter((s) => dayKey(new Date(s.date)) === page.day);
  if (that.length) return that.some((s) => s.kind === 'full') ? 'Workout' : 'Short workout';
  const restDay = state.sessions.some((s) => {
    const d = daysApart(new Date(s.date), date);
    return d === 1 || d === 2;
  });
  if (page.fire) return 'Sat by the fire';
  return restDay ? 'Rest day' : 'A visit';
}

const dateLabel = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** Every day the app was opened, newest first. Days you didn't open it aren't marked; they just aren't here. */
export function BookOfDays({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [kept, setKept] = useState(false);
  const box = useModal<HTMLDivElement>(onClose);
  const words = storyWords(state);
  const pages = [...(state.days ?? [])].reverse().filter((p) => !kept || p.kept);
  const hearts = HEARTS.filter((id) => words[id].trim());

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label="Book of Days" className="fixed inset-0 z-50 !mt-0 overflow-y-auto bg-ink-950 outline-none">
      {/* Held sideways: wider, with the pages in two columns. */}
      <div className="safe-top safe-bottom land-safe-x mx-auto max-w-md space-y-4 px-4 pb-16 [@media(orientation:landscape)_and_(max-height:600px)]:max-w-4xl [@media(orientation:landscape)_and_(max-height:600px)]:pb-8">
        <header className="flex items-center gap-3 pt-2">
          <button onClick={onClose} aria-label="Back" className="rounded-lg bg-ink-800 p-2 text-slate-300">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-pixel text-sm text-gold-300">Book of Days</h1>
            <p className="text-xs text-slate-500">
              {state.days?.length ?? 0} {state.days?.length === 1 ? 'page' : 'pages'}
            </p>
          </div>
          <Book size={44} />
        </header>

        {(words.why.trim() || hearts.length > 0) && (
          <section className="rounded-2xl bg-ink-800 p-4">
            <p className="font-pixel text-[9px] text-slate-500">IN YOUR OWN WORDS</p>
            <div className="mt-2 space-y-3">
              {words.why.trim() && (
                <div>
                  <p className="text-xs text-slate-500">Why you started</p>
                  <p className="text-sm text-slate-100">&ldquo;{words.why}&rdquo;</p>
                </div>
              )}
              {hearts.map((id) => (
                <div key={id}>
                  <p className="text-xs text-slate-500">{heartPrompt(id)}</p>
                  <p className="text-sm text-slate-100">&ldquo;{words[id]}&rdquo;</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex gap-1.5">
          {[false, true].map((k) => (
            <button key={String(k)} onClick={() => setKept(k)} className={`rounded-lg px-2.5 py-1.5 text-xs ${kept === k ? 'bg-gold-400 font-semibold text-ink-950' : 'bg-ink-800 text-slate-300'}`}>
              {k ? 'Kept words' : 'Every page'}
            </button>
          ))}
        </div>

        {pages.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{kept ? 'Tap Keep under a quote on Today to keep it here.' : 'Your first page is today.'}</p>}

        <ol className="space-y-3 [@media(orientation:landscape)_and_(max-height:600px)]:grid [@media(orientation:landscape)_and_(max-height:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:600px)]:gap-3 [@media(orientation:landscape)_and_(max-height:600px)]:space-y-0">
          {pages.map((p) => (
            <li key={p.day} className="rounded-2xl bg-ink-900 p-4 ring-1 ring-ink-700">
              <div className="flex items-center justify-between">
                <p className="font-pixel text-[10px] text-gold-300">{dateLabel(p.day)}</p>
                {/* What the day was, as its icon. */}
                <Sprite id="dayIcon" opts={{ kind: whatHappened(p, state) }} size={24} label={whatHappened(p, state)} />
              </div>
              {/* A note in your own hand, like the margins the Wanderer shows you on the mountain. */}
              {marginNote(state, p) && <p className="mt-1 -rotate-1 font-mono text-xs text-amber-200/80">{marginNote(state, p)}</p>}
              <p className="mt-2 text-sm italic text-slate-300">
                <span className="not-italic text-orange-300">{state.profile.flame ?? 'A spark'}:</span> &ldquo;{p.line}&rdquo;
              </p>
              <div className="mt-2 flex items-start gap-2 border-t border-ink-700 pt-2">
                <p className="flex-1 text-sm text-slate-200">
                  &ldquo;{p.quote.text}&rdquo; <span className="text-xs text-slate-500">{p.quote.by}</span>
                </p>
                {p.kept && <Bookmark size={14} className="mt-0.5 shrink-0 fill-gold-400 text-gold-400" aria-label="Kept" />}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

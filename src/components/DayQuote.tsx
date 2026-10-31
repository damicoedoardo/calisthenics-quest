'use client';

import { useState } from 'react';
import { BookOfDays } from './BookOfDays';
import { Sprite } from './Sprite';
import type { GameState } from '@/lib/game';
import { todayPage, updateTodayPage } from '@/story/daily';

/* The quote of the day and the Book of Days, on the You page (they left Today to keep it to the workout). */

/** Words for the road: one quote a day, to keep if it lands, and the Book of Days beside it. */
export function DayQuote({ state, update }: { state: GameState; update: (fn: (s: GameState) => GameState) => void }) {
  const now = new Date();
  const [open, setOpen] = useState(false);
  const page = todayPage(state, now);
  if (!page) return null;
  const pages = state.days?.length ?? 0;
  // Two icons: keep these words, and the Book of Days with its page count.
  const keep = (
    <button
      onClick={() => update((s) => updateTodayPage(s, new Date(), { kept: !page.kept }))}
      aria-pressed={!!page.kept}
      aria-label={page.kept ? 'Kept in the Book of Days' : 'Keep these words'}
      className={`shrink-0 rounded-lg p-2 ${page.kept ? 'bg-gold-400/15' : 'bg-ink-800'}`}
    >
      <Sprite id="uiIcon" opts={{ name: page.kept ? 'bookmarkKept' : 'bookmark' }} size={16} label="" />
    </button>
  );
  const book = (
    <button onClick={() => setOpen(true)} aria-label={`Book of Days, ${pages} ${pages === 1 ? 'page' : 'pages'}`} className="relative shrink-0 rounded-lg bg-ink-800 p-2">
      <Sprite id="uiIcon" opts={{ name: 'book' }} size={16} label="" />
      <span className="absolute -right-1 -top-1 rounded bg-ink-700 px-1 font-mono text-[9px] text-slate-300">{pages}</span>
    </button>
  );
  return (
    <section className="flex items-start gap-3 rounded-2xl bg-ink-900 p-3 ring-1 ring-ink-700">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-slate-100">&ldquo;{page.quote.text}&rdquo;</p>
        <p className="mt-1 text-[11px] text-slate-500">{page.quote.by}</p>
      </div>
      {keep}
      {book}
      {open && <BookOfDays state={state} onClose={() => setOpen(false)} />}
    </section>
  );
}

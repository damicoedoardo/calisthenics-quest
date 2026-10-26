'use client';

import { useEffect, useState } from 'react';
import { Bookmark, BookOpen, ChevronRight, Flame, Heart, Play, X } from 'lucide-react';
import { BookOfDays } from './BookOfDays';
import { Ember, Enemy, Hollow } from './Characters';
import { SitByFire } from './SitByFire';
import {
  WEEKLY_GOAL,
  dayType,
  previewXp,
  sessionsThisWeek,
  todaysQuest,
  weekStreak,
  type Checkin,
  type GameState,
} from '@/lib/game';
import { getPath } from '@/lib/skills';
import { daysSinceTraining, isRestDay } from '@/lib/days';
import { storyState, storyWords } from '@/story/engine';
import { flameStage } from '@/story/flame';
import { fireLine, flameLine, flameMood, isRested, restTruth, todayPage, updateTodayPage } from '@/story/daily';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onStart: (checkin: Checkin) => void;
  onReplayOpening: () => void;
}

const CHECKINS: { id: Checkin; label: string; note: string }[] = [
  { id: 'rough', label: 'Rough', note: 'Small still counts. Main exercise only, about 15 minutes.' },
  { id: 'normal', label: 'Normal', note: 'The full quest, about 40 minutes.' },
  { id: 'strong', label: 'Strong', note: 'Full quest. If the last set flies, add a rep.' },
];

const ROLE_LABEL = { main: 'Main', core: 'Core', support: 'Support' } as const;

export function TodayTab({ state, update, onStart, onReplayOpening }: Props) {
  const now = new Date();
  const [overlay, setOverlay] = useState<'fire' | 'book' | null>(null);
  const [checkin, setCheckin] = useState<Checkin>(state.draft?.checkin ?? 'normal');
  const quest = todaysQuest(state, checkin);
  const story = storyState(state);
  const week = sessionsThisWeek(state, now);
  const streak = weekStreak(state, now);
  const day = dayType(state);
  const inProgress = !!state.draft && Object.values(state.draft.sets).some((s) => s.length > 0);

  return (
    <div className="space-y-4">
      <InstallHint />

      {!state.profile.voice && (
        <button onClick={onReplayOpening} className="flex w-full items-center gap-3 rounded-2xl bg-[#140f1f] p-4 text-left ring-1 ring-red-400/30 active:scale-[.98]">
          <Hollow size={44} bounce={false} />
          <span className="min-w-0 flex-1">
            <span className="block font-pixel text-[10px] text-red-300">New: the opening</span>
            <span className="mt-1 block text-sm text-slate-300">The story now starts with the voice in your head. About 5 minutes, sound on.</span>
          </span>
        </button>
      )}

      {story.chapter ? (
        <section className="rounded-2xl bg-ink-800 p-4 pixel-border">
          <p className="font-pixel text-[10px] text-slate-400">Chapter {story.chapter.n}</p>
          <h2 className="mt-1 font-pixel text-sm leading-relaxed text-gold-300">{story.chapter.name}</h2>
          <div className="mt-3 flex items-center gap-4">
            <div className={story.heartsLeft === 0 ? 'opacity-40 grayscale' : ''}>
              <Enemy id={story.chapter.enemySprite} size={64} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-300">
                vs <span className="font-semibold text-slate-100">{story.chapter.enemy}</span>
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {Array.from({ length: story.hearts }).map((_, i) => (
                  <Heart key={i} size={14} className={i < story.heartsLeft ? 'fill-red-500 text-red-500' : 'text-ink-600'} />
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {story.awaitingTest
                  ? 'Take your max test on the Hero tab to finish this chapter.'
                  : `Every session takes a heart. ${story.heartsLeft} to go.`}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-ink-800 p-4 text-center pixel-border">
          <p className="font-pixel text-xs text-gold-300">The road is yours</p>
          <p className="mt-2 text-sm text-slate-300">You reached the Summit. Keep training: your gear and skills keep growing.</p>
        </section>
      )}

      <FlameCard state={state} now={now} week={week} streak={streak} />

      {isRestDay(state, now) && <RestCard state={state} now={now} onSit={() => setOverlay('fire')} />}

      <QuoteCard state={state} now={now} update={update} onOpenBook={() => setOverlay('book')} />

      {!inProgress && (
        <section>
          <p className="mb-2 font-pixel text-[10px] text-slate-400">How do you feel today?</p>
          <div className="grid grid-cols-3 gap-2">
            {CHECKINS.map((c) => (
              <button
                key={c.id}
                onClick={() => setCheckin(c.id)}
                className={`rounded-xl py-3 text-sm font-semibold transition active:scale-95 ${
                  checkin === c.id ? 'bg-gold-400 text-ink-950' : 'bg-ink-800 text-slate-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">{CHECKINS.find((c) => c.id === checkin)!.note}</p>
        </section>
      )}

      <section className="rounded-2xl bg-ink-800 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-pixel text-[10px] text-gold-300">{checkin === 'rough' && !inProgress ? 'Minimum quest' : `Day ${day} quest`}</h3>
          <p className="text-xs text-slate-400">+{previewXp(state, inProgress ? state.draft!.checkin : checkin, now)} XP</p>
        </div>
        <ul className="mt-3 space-y-2">
          {(inProgress ? todaysQuest(state) : quest).map((q) => {
            const path = getPath(q.path);
            const done = state.draft?.sets[q.id]?.length ?? 0;
            return (
              <li key={q.id} className="flex items-center gap-3 rounded-xl bg-ink-900 px-3 py-2.5">
                <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: path.color }}>
                  {ROLE_LABEL[q.role]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{q.name}</span>
                <span className="font-mono text-sm text-slate-300">
                  {inProgress ? `${Math.min(done, q.sets)}/${q.sets}` : `${q.sets}×${q.reps}${q.unit === 'sec' ? 's' : ''}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <button
        onClick={() => onStart(inProgress ? state.draft!.checkin : checkin)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] transition active:translate-y-1 active:shadow-none"
      >
        <Play size={16} className="fill-ink-950" />
        {inProgress ? 'Continue quest' : 'Start quest'}
      </button>

      {overlay === 'fire' && (
        <SitByFire
          name={storyWords(state).flame}
          stage={flameStage(state.sessions.length).id}
          line={fireLine(state, now)}
          onDone={(sat) => {
            if (sat) update((s) => updateTodayPage(s, new Date(), { fire: true }));
            setOverlay(null);
          }}
        />
      )}
      {overlay === 'book' && <BookOfDays state={state} onClose={() => setOverlay(null)} />}
    </div>
  );
}

/** Your flame: its name, how grown it is, its mood today and what it has to say. */
function FlameCard({ state, now, week, streak }: { state: GameState; now: Date; week: number; streak: number }) {
  const stage = flameStage(state.sessions.length);
  const name = storyWords(state).flame;
  return (
    <section className="rounded-2xl bg-ink-800 p-4">
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <Ember size={stage.id === 'spark' ? 120 : 76} stage={stage.id} mood={flameMood(state, now)} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[10px] text-orange-300">
            {name} <span className="text-slate-500">· {stage.name}</span>
          </p>
          <p className="mt-1.5 text-sm leading-snug text-slate-200">&ldquo;{flameLine(state, now)}&rdquo;</p>
        </div>
      </div>
      <div className="mt-3 flex gap-1.5">
        {Array.from({ length: WEEKLY_GOAL }).map((_, i) => (
          <div key={i} className={`h-2.5 flex-1 rounded-sm ${i < week ? 'bg-gold-400' : 'bg-ink-600'}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {Math.min(week, WEEKLY_GOAL)}/{WEEKLY_GOAL} this week{streak > 0 ? ` · ${streak}-week streak` : ''}
      </p>
    </section>
  );
}

/** On a rest day Today turns calm: one truth about rest, and a minute by the fire. */
function RestCard({ state, now, onSit }: { state: GameState; now: Date; onSit: () => void }) {
  const sat = !!todayPage(state, now)?.fire;
  const fullDayOff = (daysSinceTraining(state, now) ?? 0) >= 2;
  return (
    <section className="rounded-2xl bg-gradient-to-b from-[#1d1527] to-ink-900 p-4 ring-1 ring-orange-300/20">
      <p className="font-pixel text-[10px] text-orange-300">Rest day</p>
      <p className="mt-2 text-sm leading-snug text-slate-200">{restTruth(now)}</p>
      {sat ? (
        <p className="mt-3 text-xs text-slate-400">You sat by the fire today. Your Fog runs today start Rested.</p>
      ) : (
        <>
          <button onClick={onSit} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-800 py-3 text-sm text-orange-200 ring-1 ring-orange-300/25 active:scale-[.98]">
            <Flame size={16} /> Sit by the fire · 1 minute
          </button>
          <p className="mt-2 text-xs text-slate-500">
            {fullDayOff ? 'A full day of air: your Fog runs today start Rested.' : 'It counts as rest: your Fog runs today start Rested.'}
          </p>
        </>
      )}
    </section>
  );
}

/** Words for the road: one quote a day, to keep if it lands. */
function QuoteCard({ state, now, update, onOpenBook }: { state: GameState; now: Date; update: Props['update']; onOpenBook: () => void }) {
  const page = todayPage(state, now);
  if (!page) return null;
  const pages = state.days?.length ?? 0;
  return (
    <section className="rounded-2xl bg-ink-900 p-4 ring-1 ring-ink-700">
      <p className="font-pixel text-[9px] text-slate-500">WORDS FOR THE ROAD</p>
      <p className="mt-2 text-[15px] leading-snug text-slate-100">&ldquo;{page.quote.text}&rdquo;</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{page.quote.by}</p>
        <button
          onClick={() => update((s) => updateTodayPage(s, new Date(), { kept: !page.kept }))}
          aria-pressed={!!page.kept}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs ${page.kept ? 'bg-gold-400/15 text-gold-300' : 'bg-ink-800 text-slate-300'}`}
        >
          <Bookmark size={13} className={page.kept ? 'fill-gold-400 text-gold-400' : ''} /> {page.kept ? 'Kept' : 'Keep'}
        </button>
      </div>
      <button onClick={onOpenBook} className="mt-3 flex w-full items-center gap-2 border-t border-ink-700 pt-3 text-left text-xs text-slate-400">
        <BookOpen size={14} />
        <span className="flex-1">Book of Days · {pages} {pages === 1 ? 'page' : 'pages'}</span>
        <ChevronRight size={14} />
      </button>
    </section>
  );
}

const HINT_KEY = 'forma-install-hint-dismissed';

/** iPhones can clear data for sites that are not installed, so nudge once toward the home screen. */
function InstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
      setShow(!standalone && localStorage.getItem(HINT_KEY) !== '1');
    } catch {
      setShow(false);
    }
  }, []);
  if (!show) return null;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-sky-950/60 p-3 text-sm ring-1 ring-sky-500/30">
      <p className="flex-1 text-sky-100">
        Install FORMA so your progress is safe: {ios ? 'tap Share, then Add to Home Screen.' : 'open the browser menu, then Install app.'}
      </p>
      <button
        aria-label="Dismiss"
        onClick={() => {
          try {
            localStorage.setItem(HINT_KEY, '1');
          } catch {}
          setShow(false);
        }}
        className="text-sky-300"
      >
        <X size={18} />
      </button>
    </div>
  );
}

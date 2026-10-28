'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { BookOfDays } from './BookOfDays';
import { Keepsakes } from './Keepsakes';
import { Ember, Enemy, Hollow } from './Characters';
import { SitByFire } from './SitByFire';
import { Sprite } from './Sprite';
import { useLook } from './Look';
import { useLand } from './useLand';
import {
  WEEKLY_GOAL,
  dayType,
  gearOf,
  previewXp,
  sessionsThisWeek,
  todaysQuest,
  weekStreak,
  type Checkin,
  type GameState,
} from '@/lib/game';
import { ROLE_COLOR, ROLE_LABEL } from '@/lib/program';
import { EXERCISES, type ExerciseId } from '@/sprites/characters/exercise';
import { dayKey, daysApart, daysSinceTraining, isRestDay, trainedToday } from '@/lib/days';
import { storyState, storyWords } from '@/story/engine';
import { flameStage } from '@/story/flame';
import { currentPlan, dayLabel, nextDay, nextMonday, restToday, weekdayOf } from '@/lib/coach/week';
import { ExerciseSheet } from './ExerciseDetail';
import { LootGuide, NextLoot, type LootGo } from './Purse';
import type { LootId } from '@/lib/loot';
import { fireLine, flameLine, flameMood, restTruth, todayPage, updateTodayPage } from '@/story/daily';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  onStart: (checkin: Checkin) => void;
  onReplayOpening: () => void;
  /** Developer mode (/lab/night): open with the Book of Days showing. */
  openBook?: boolean;
  /** No plan yet: go and plan the week with the flame. */
  onTrain: () => void;
  /** From the loot guide: open that part of the Hero tab. */
  onHero?: (part: LootGo) => void;
}

const CHECKINS: { id: Checkin; label: string; note: string; minutes: number }[] = [
  { id: 'rough', label: 'Rough', note: 'Small still counts. Main exercise only, about 15 minutes.', minutes: 15 },
  { id: 'normal', label: 'Normal', note: 'The full quest, about 40 minutes.', minutes: 40 },
  { id: 'strong', label: 'Strong', note: 'Full quest. If the last set flies, add a rep.', minutes: 40 },
];


export function TodayTab({ state, update, onStart, onReplayOpening, openBook, onTrain, onHero }: Props) {
  const now = new Date();
  const [overlay, setOverlay] = useState<'fire' | 'book' | null>(openBook ? 'book' : null);
  // An exercise tapped in the quest: how to do it.
  const [howTo, setHowTo] = useState<{ id: string; demo: ExerciseId } | null>(null);
  // A loot chip tapped: what training gives, and where each goes.
  const [guide, setGuide] = useState<LootId | null>(null);
  useEffect(() => {
    if (openBook) setOverlay('book');
  }, [openBook]);
  const [checkin, setCheckin] = useState<Checkin>(state.draft?.checkin ?? 'normal');
  const quest = todaysQuest(state, checkin);
  const story = storyState(state);
  const week = sessionsThisWeek(state, now);
  const streak = weekStreak(state, now);
  const day = dayType(state);
  const inProgress = !!state.draft && Object.values(state.draft.sets).some((s) => s.length > 0);
  // After today's workout the quest below is the next one, not one still owed today.
  const doneToday = !inProgress && trainedToday(state, now);
  // The week is the one place a workout comes from: none planned (or all done), no quest.
  const plan = currentPlan(state.coach);
  const noPlan = !plan && !inProgress;
  const restDay = isRestDay(state, now) || restToday(state.coach, now);
  // A planned rest day: the quest below is the next workout, for its own day.
  const ahead = !inProgress && !doneToday && restToday(state.coach, now) && plan ? nextDay(state.coach?.week) : undefined;
  const aheadNote = ahead ? `Today is a rest day. This is your next workout, for ${dayLabel(ahead.date, now).toLowerCase() === 'tomorrow' ? 'tomorrow' : weekdayOf(ahead.date)}.` : null;
  // You, in your gear and look, for the exercise stills in the quest list.
  const look = useLook();
  const hero = { gear: gearOf(state), classId: state.profile.classId, look };

  const land = useLand();
  const overlays = (
    <>
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
      {howTo && <ExerciseSheet state={state} id={howTo.id} demo={howTo.demo} onClose={() => setHowTo(null)} />}
      {guide && (
        <LootGuide
          state={state}
          focus={guide}
          now={now}
          onClose={() => setGuide(null)}
          onGo={
            onHero &&
            ((to) => {
              setGuide(null);
              onHero(to);
            })
          }
        />
      )}
    </>
  );
  const items = inProgress ? todaysQuest(state) : quest;
  const startLabel = inProgress ? 'Continue quest' : doneToday ? 'Start the next quest' : 'Start quest';
  const questTitle = checkin === 'rough' && !inProgress ? 'Minimum quest' : (plan?.title ?? `Day ${day} quest`);
  const xp = previewXp(state, inProgress ? state.draft!.checkin : checkin, now);
  const reps = (q: (typeof items)[number]) => {
    const done = state.draft?.sets[q.id]?.length ?? 0;
    return inProgress ? `${Math.min(done, q.sets)}/${q.sets}` : q.run ? `${Math.round(q.reps / 60)} min` : `${q.sets > 1 ? `${q.sets}×` : ''}${q.reps}${q.unit === 'sec' ? 's' : ''}`;
  };

  if (land)
    return (
      <LandToday
        state={state}
        now={now}
        week={week}
        streak={streak}
        hero={hero}
        story={story}
        items={items}
        noPlan={noPlan ? <NoPlan state={state} now={now} onTrain={onTrain} land /> : null}
        restDay={restDay}
        aheadNote={aheadNote}
        onHowTo={(q) => setHowTo({ id: q.id, demo: q.demo })}
        reps={reps}
        loot={<NextLoot state={state} checkin={inProgress ? state.draft!.checkin : checkin} now={now} onOpen={setGuide} land />}
        title={questTitle}
        xp={xp}
        checkin={checkin}
        onCheckin={inProgress ? undefined : setCheckin}
        doneToday={doneToday}
        startLabel={startLabel}
        onStart={() => onStart(inProgress ? state.draft!.checkin : checkin)}
        onReplayOpening={onReplayOpening}
        onSit={() => setOverlay('fire')}
        onOpenBook={() => setOverlay('book')}
        update={update}
        overlays={overlays}
      />
    );

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
        <section className="flex items-center gap-3 rounded-2xl bg-ink-800 p-3 pixel-border">
          <div className={`shrink-0 ${story.heartsLeft === 0 ? 'opacity-40 grayscale' : ''}`}>
            <Enemy id={story.chapter.enemySprite} size={56} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[8px] text-slate-500">
              Ch.{story.chapter.n} · {story.chapter.enemy}
            </p>
            <h2 className="mt-1.5 font-pixel text-[11px] leading-snug text-gold-300">{story.chapter.name}</h2>
            {/* Every session takes a heart. */}
            <div className="mt-1.5 flex flex-wrap items-center" aria-label={`${story.heartsLeft} hearts left: every session takes one`}>
              {Array.from({ length: story.hearts }).map((_, i) => (
                <Sprite key={i} id="uiIcon" opts={{ name: i < story.heartsLeft ? 'heart' : 'heartEmpty' }} size={14} label="" />
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-ink-800 p-4 text-center pixel-border">
          <p className="font-pixel text-xs text-gold-300">The road is yours</p>
          <p className="mt-2 text-sm text-slate-300">You reached the Summit. Keep training: your gear and your champion keep growing.</p>
        </section>
      )}

      <FlameCard state={state} now={now} week={week} streak={streak} />

      {restDay && <RestCard state={state} now={now} onSit={() => setOverlay('fire')} />}

      <QuoteCard state={state} now={now} update={update} onOpenBook={() => setOverlay('book')} />

      {noPlan ? (
        <NoPlan state={state} now={now} onTrain={onTrain} />
      ) : (
        <>
      {!inProgress && (
        <section>
          {doneToday && (
            <div className="mb-3 flex items-center gap-2 text-xs text-emerald-300">
              <Sprite id="uiIcon" opts={{ name: 'check' }} size={14} label="" /> Done for today. The next one is ready.
            </div>
          )}
          {aheadNote && <p className="mb-3 text-xs text-orange-200">{aheadNote}</p>}
          <div className="flex items-center gap-3">
            <p className="shrink-0 font-pixel text-[8px] leading-relaxed text-slate-500">
              I FEEL
            </p>
            <div className="grid flex-1 grid-cols-3 gap-1 rounded-xl bg-ink-900 p-1">
              {CHECKINS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCheckin(c.id)}
                  aria-pressed={checkin === c.id}
                  title={c.note}
                  className={`rounded-lg py-2 text-xs font-semibold transition active:scale-95 ${checkin === c.id ? 'bg-gold-400 text-ink-950' : 'text-slate-400'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-ink-800 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-pixel text-[9px] leading-relaxed text-gold-300">{questTitle}</h3>
          <p className="shrink-0 pl-2 font-mono text-[11px] text-slate-400">
            {!inProgress && `${CHECKINS.find((c) => c.id === checkin)!.minutes} min · `}+{xp} XP
          </p>
        </div>
        <ul className="mt-3 space-y-1.5">
          {items.map((q) => {
            return (
              <li key={q.id}>
                <button onClick={() => setHowTo({ id: q.id, demo: q.demo })} aria-label={`How to do ${q.name}`} className="flex w-full items-center gap-3 rounded-xl bg-ink-900 py-1 pl-1 pr-3 text-left active:scale-[.98]">
                {/* A still of you doing it: the demo's first frame, at 1:1 so it stays crisp. */}
                {(EXERCISES as string[]).includes(q.demo) ? (
                  <Sprite id="exercise" opts={{ exercise: q.demo, ...hero }} size={48} playing={false} label={`${q.name}, demo`} className="shrink-0 rounded-lg bg-ink-950" />
                ) : (
                  <span className="h-12 w-12 shrink-0" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[q.role] }}>
                    {ROLE_LABEL[q.role]}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-slate-100">{q.name}</span>
                </span>
                <span className="shrink-0 font-mono text-sm text-slate-300">{reps(q)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <NextLoot state={state} checkin={inProgress ? state.draft!.checkin : checkin} now={now} onOpen={setGuide} />

      <button
        onClick={() => onStart(inProgress ? state.draft!.checkin : checkin)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gold-400 py-4 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] transition active:translate-y-1 active:shadow-none"
      >
        <Sprite id="uiIcon" opts={{ name: 'play' }} size={14} label="" />
        {startLabel}
      </button>

        </>
      )}

      {/* The story so far: one keepsake per Fog boss beaten. */}
      <Keepsakes cleared={state.fog?.cleared ?? 0} />

      {overlays}
    </div>
  );
}

/** Your flame: its name, how grown it is, its mood today and what it has to say. */
function FlameCard({ state, now, week, streak, land }: { state: GameState; now: Date; week: number; streak: number; land?: boolean }) {
  const stage = flameStage(state.sessions.length);
  // Until it has a name (after the first workout) it's just a spark.
  const name = state.profile.flame;
  // Sideways it is one cell of the strip along the top: smaller, and as tall as its neighbours.
  const big = stage.id === 'spark' ? 120 : 76;
  return (
    <section className={land ? 'flex h-full flex-col rounded-2xl bg-ink-800 p-3' : 'rounded-2xl bg-ink-800 p-4'}>
      <div className={land ? 'flex flex-1 items-center gap-3' : 'flex items-center gap-3'}>
        <div className={land ? 'relative h-14 w-14 shrink-0' : 'relative h-20 w-20 shrink-0'}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <Ember size={land ? Math.round(big * 0.72) : big} stage={stage.id} mood={flameMood(state, now)} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className={land ? 'font-pixel text-[9px] text-orange-300' : 'font-pixel text-[10px] text-orange-300'}>
            {name ? (
              <>
                {name} <span className="text-slate-500">· {stage.name}</span>
              </>
            ) : (
              'A spark'
            )}
          </p>
          <p className={land ? 'mt-1 text-xs leading-snug text-slate-200 [@media(max-height:370px)]:text-[11px] [@media(max-height:370px)]:leading-tight' : 'mt-1.5 text-sm leading-snug text-slate-200'}>&ldquo;{flameLine(state, now)}&rdquo;</p>
        </div>
      </div>
      {land ? (
        <>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: WEEKLY_GOAL }).map((_, i) => (
              <div key={i} className={`pixel-notch h-2 flex-1 ${i < week ? 'bg-gold-400 shadow-[inset_0_-3px_0_#b45309]' : 'bg-ink-600 shadow-[inset_0_-3px_0_#1c2033]'}`} />
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {Math.min(week, WEEKLY_GOAL)}/{WEEKLY_GOAL} this week{streak > 0 ? ` · ${streak}-week streak` : ''}
          </p>
        </>
      ) : (
        <div className="mt-3 flex items-center gap-3" aria-label={`${Math.min(week, WEEKLY_GOAL)} of ${WEEKLY_GOAL} this week${streak > 0 ? `, a ${streak}-week streak` : ''}`}>
          <div className="flex flex-1 gap-1.5">
            {Array.from({ length: WEEKLY_GOAL }).map((_, i) => (
              <div key={i} className={`pixel-notch h-3 flex-1 ${i < week ? 'bg-gold-400 shadow-[inset_0_-3px_0_#b45309]' : 'bg-ink-600 shadow-[inset_0_-3px_0_#1c2033]'}`} />
            ))}
          </div>
          <span className="shrink-0 font-pixel text-[9px] text-slate-400">
            {Math.min(week, WEEKLY_GOAL)}/{WEEKLY_GOAL}
          </span>
          {streak > 0 && (
            <span className="flex shrink-0 items-center gap-1 font-pixel text-[9px] text-orange-300" title={`${streak}-week streak`}>
              <Sprite id="uiIcon" opts={{ name: 'flame' }} size={12} label="" />
              {streak}W
            </span>
          )}
        </div>
      )}
    </section>
  );
}

/** On a rest day Today turns calm: one truth about rest, and a minute by the fire. */
function RestCard({ state, now, onSit, land }: { state: GameState; now: Date; onSit: () => void; land?: boolean }) {
  const sat = !!todayPage(state, now)?.fire;
  const fullDayOff = (daysSinceTraining(state, now) ?? 0) >= 2;
  return (
    <section className={`rounded-2xl bg-gradient-to-b from-[#1d1527] to-ink-900 ring-1 ring-orange-300/20 ${land ? 'flex h-full flex-col overflow-y-auto p-3' : 'p-4'}`}>
      <p className={land ? 'font-pixel text-[9px] text-orange-300' : 'font-pixel text-[10px] text-orange-300'}>Rest day</p>
      <p className={land ? 'mt-1.5 text-xs leading-snug text-slate-200' : 'mt-2 text-sm leading-snug text-slate-200'}>{restTruth(now)}</p>
      {sat ? (
        <p className={land ? 'mt-auto pt-2 text-[11px] text-slate-400' : 'mt-3 text-xs text-slate-400'}>You sat by the fire today. Your Fog runs today start Rested.</p>
      ) : (
        <>
          <button onClick={onSit} className={`flex w-full items-center justify-center gap-2 rounded-xl bg-ink-800 text-orange-200 ring-1 ring-orange-300/25 active:scale-[.98] ${land ? 'mt-auto py-2 text-xs' : 'mt-3 py-3 text-sm'}`}>
            <Sprite id="uiIcon" opts={{ name: 'flame' }} size={18} label="" /> Sit by the fire · 1 minute
          </button>
          <p className={land ? 'mt-1.5 text-[11px] text-slate-500' : 'mt-2 text-xs text-slate-500'}>
            {fullDayOff ? 'A full day of air: your Fog runs today start Rested.' : 'It counts as rest: your Fog runs today start Rested.'}
          </p>
        </>
      )}
    </section>
  );
}

/** Words for the road: one quote a day, to keep if it lands. */
function QuoteCard({ state, now, update, onOpenBook, land }: { state: GameState; now: Date; update: Props['update']; onOpenBook: () => void; land?: boolean }) {
  const page = todayPage(state, now);
  if (!page) return null;
  const pages = state.days?.length ?? 0;
  // Two icons: keep these words, and the Book of Days with its page count.
  const keep = (
    <button
      onClick={() => update((s) => updateTodayPage(s, new Date(), { kept: !page.kept }))}
      aria-pressed={!!page.kept}
      aria-label={page.kept ? 'Kept in the Book of Days' : 'Keep these words'}
      className={`shrink-0 rounded-lg ${land ? 'p-1.5' : 'p-2'} ${page.kept ? 'bg-gold-400/15' : 'bg-ink-800'}`}
    >
      <Sprite id="uiIcon" opts={{ name: page.kept ? 'bookmarkKept' : 'bookmark' }} size={16} label="" />
    </button>
  );
  const book = (
    <button onClick={onOpenBook} aria-label={`Book of Days, ${pages} ${pages === 1 ? 'page' : 'pages'}`} className={`relative shrink-0 rounded-lg bg-ink-800 ${land ? 'p-1.5' : 'p-2'}`}>
      <Sprite id="uiIcon" opts={{ name: 'book' }} size={16} label="" />
      <span className="absolute -right-1 -top-1 rounded bg-ink-700 px-1 font-mono text-[9px] text-slate-300">{pages}</span>
    </button>
  );
  // Sideways, a cell of the strip: Keep beside the title, the quote takes the middle.
  if (land)
    return (
      <section className="flex h-full flex-col rounded-2xl bg-ink-900 p-3 ring-1 ring-ink-700">
        <p className="min-h-0 flex-1 overflow-y-auto text-xs leading-snug text-slate-100 [@media(max-height:370px)]:mt-1 [@media(max-height:370px)]:text-[11px] [@media(max-height:370px)]:leading-tight">
          &ldquo;{page.quote.text}&rdquo; <span className="text-slate-400">{page.quote.by}</span>
        </p>
        <div className="mt-1.5 flex items-center justify-end gap-2 [@media(max-height:370px)]:mt-1">
          {keep}
          {book}
        </div>
      </section>
    );
  return (
    <section className="flex items-start gap-3 rounded-2xl bg-ink-900 p-3 ring-1 ring-ink-700">
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-slate-100">&ldquo;{page.quote.text}&rdquo;</p>
        <p className="mt-1 text-[11px] text-slate-500">{page.quote.by}</p>
      </div>
      {keep}
      {book}
    </section>
  );
}

const HINT_KEY = 'forma-install-hint-dismissed';

/** iPhones can clear data for sites that are not installed, so nudge once toward the home screen. */
function InstallHint({ land }: { land?: boolean }) {
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
  // iPads say they are Macs; a Mac with a touch screen is an iPad.
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return (
    <div className={`flex items-start gap-3 rounded-2xl bg-sky-950/60 p-3 ring-1 ring-sky-500/30 ${land ? 'h-full w-60 shrink-0 overflow-y-auto text-xs' : 'text-sm'}`}>
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
        className="-m-2 p-2 text-sky-300"
      >
        <Sprite id="uiIcon" opts={{ name: 'close' }} size={18} label="" />
      </button>
    </div>
  );
}

interface LandProps {
  state: GameState;
  now: Date;
  week: number;
  streak: number;
  hero: { gear: ReturnType<typeof gearOf>; classId: GameState['profile']['classId']; look: ReturnType<typeof useLook> };
  story: ReturnType<typeof storyState>;
  items: ReturnType<typeof todaysQuest>;
  reps: (q: ReturnType<typeof todaysQuest>[number]) => string;
  /** Shown in place of the quest board when no workout is planned. */
  noPlan: ReactNode;
  restDay: boolean;
  aheadNote: string | null;
  /** An exercise tapped: open how to do it. */
  onHowTo: (q: ReturnType<typeof todaysQuest>[number]) => void;
  title: string;
  /** What this workout gives, as chips. */
  loot: ReactNode;
  xp: number;
  checkin: Checkin;
  /** Left out while a quest is under way: the check-in is set then. */
  onCheckin?: (c: Checkin) => void;
  doneToday: boolean;
  startLabel: string;
  onStart: () => void;
  onReplayOpening: () => void;
  onSit: () => void;
  onOpenBook: () => void;
  update: Props['update'];
  overlays: ReactNode;
}

/**
 * Today held sideways, one screen with no scrolling: a strip along the top (the chapter's enemy,
 * the flame, a rest day, the quote) and below it the quest board, the exercises side by side and
 * Start as a big button at the end of the row.
 */
function LandToday(p: LandProps) {
  const { state, now, story } = p;
  return (
    <div className="flex h-full flex-col gap-3">
      {/* A little room inside the row, so the cards' pixel borders aren't clipped by its scroll. */}
      <div className="-m-1 flex h-[7.75rem] shrink-0 gap-3 [@media(max-height:370px)]:h-[7.25rem] overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <InstallHint land />
        {!state.profile.voice && (
          <button onClick={p.onReplayOpening} className="flex h-full w-60 shrink-0 items-center gap-3 rounded-2xl bg-[#140f1f] p-3 text-left ring-1 ring-red-400/30 active:scale-[.98]">
            <Hollow size={44} bounce={false} />
            <span className="min-w-0 flex-1">
              <span className="block font-pixel text-[9px] text-red-300">New: the opening</span>
              <span className="mt-1 block text-xs text-slate-300">The story now starts with the voice in your head. About 5 minutes, sound on.</span>
            </span>
          </button>
        )}
        <div className="min-w-[14rem] flex-1 basis-0">
          {story.chapter ? (
            <section className="flex h-full flex-col rounded-2xl bg-ink-800 p-3 pixel-border">
              <div className="flex min-h-0 flex-1 items-center gap-3">
                <div className={`shrink-0 ${story.heartsLeft === 0 ? 'opacity-40 grayscale' : ''}`}>
                  <Enemy id={story.chapter.enemySprite} size={48} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-pixel text-[8px] leading-relaxed text-slate-500">
                    Ch.{story.chapter.n} · {story.chapter.enemy}
                  </p>
                  <h2 className="mt-1 font-pixel text-[10px] leading-snug text-gold-300">{story.chapter.name}</h2>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap" aria-label={`${story.heartsLeft} hearts left: every session takes one`}>
                {Array.from({ length: story.hearts }).map((_, i) => (
                  <Sprite key={i} id="uiIcon" opts={{ name: i < story.heartsLeft ? 'heart' : 'heartEmpty' }} size={12} label="" />
                ))}
              </div>
            </section>
          ) : (
            <section className="flex h-full flex-col justify-center rounded-2xl bg-ink-800 p-3 text-center pixel-border">
              <p className="font-pixel text-[10px] text-gold-300">The road is yours</p>
              <p className="mt-2 text-xs text-slate-300">You reached the Summit. Keep training: your gear and your champion keep growing.</p>
            </section>
          )}
        </div>
        <div className="min-w-[15rem] flex-[1.4] basis-0">
          <FlameCard state={state} now={now} week={p.week} streak={p.streak} land />
        </div>
        {p.restDay && (
          <div className="min-w-[14rem] flex-1 basis-0">
            <RestCard state={state} now={now} onSit={p.onSit} land />
          </div>
        )}
        {todayPage(state, now) && (
          <div className="min-w-[14rem] flex-1 basis-0">
            <QuoteCard state={state} now={now} update={p.update} onOpenBook={p.onOpenBook} land />
          </div>
        )}
        <div className="w-40 shrink-0">
          <Keepsakes cleared={state.fog?.cleared ?? 0} land />
        </div>
      </div>

      {p.noPlan ?? (
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-ink-800 p-3">
        <div className="flex items-baseline gap-3">
          <h3 className="shrink-0 font-pixel text-[10px] text-gold-300">{p.title}</h3>
          <p className="shrink-0 font-mono text-[11px] text-slate-400">
            {p.onCheckin && `${CHECKINS.find((c) => c.id === p.checkin)!.minutes} min · `}+{p.xp} XP
          </p>
          {p.doneToday && <p className="min-w-0 flex-1 truncate text-xs text-emerald-300">Done for today. The next one is ready.</p>}
          {p.aheadNote && <p className="min-w-0 flex-1 truncate text-xs text-orange-200">{p.aheadNote}</p>}
        </div>

        <div className="mt-2 flex min-h-0 flex-1 gap-3">
          {/* The exercises side by side; the dark box takes what height there is, the figure stands on its floor. */}
          <ul className="grid min-w-0 flex-1 auto-cols-[minmax(4rem,1fr)] grid-flow-col gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {p.items.map((q) => (
              <li key={q.id} className="flex min-h-0">
                <button onClick={() => p.onHowTo(q)} aria-label={`How to do ${q.name}`} className="flex min-h-0 w-full flex-col rounded-xl bg-ink-900 p-1.5 text-center active:scale-[.98]">
                <span className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden rounded-lg bg-ink-950">
                  {(EXERCISES as string[]).includes(q.demo) && (
                    <Sprite id="exercise" opts={{ exercise: q.demo, ...p.hero }} size={64} playing={false} label={`${q.name}, demo`} className="shrink-0" />
                  )}
                  <span className="absolute left-1 top-1 rounded bg-ink-950/85 px-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[q.role] }}>
                    {ROLE_LABEL[q.role]}
                  </span>
                </span>
                <span className="mt-1 line-clamp-2 shrink-0 text-xs leading-tight text-slate-100">{q.name}</span>
                <span className="shrink-0 font-mono text-xs text-slate-300">{p.reps(q)}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex w-40 shrink-0 flex-col min-[800px]:w-44">
            {p.onCheckin && (
              <>
                <p className="font-pixel text-[7px] text-slate-500">I FEEL</p>
                <div className="mb-2 mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-ink-900 p-1">
                  {CHECKINS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => p.onCheckin?.(c.id)}
                      aria-pressed={p.checkin === c.id}
                      className={`rounded-lg py-1.5 text-[11px] font-semibold transition active:scale-95 ${p.checkin === c.id ? 'bg-gold-400 text-ink-950' : 'text-slate-300'}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="mb-2">{p.loot}</div>
            <button
              onClick={p.onStart}
              className="flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-2xl bg-gold-400 px-3 font-pixel text-[10px] leading-relaxed text-ink-950 shadow-[0_4px_0_#b45309] transition active:translate-y-1 active:shadow-none"
            >
              <Sprite id="uiIcon" opts={{ name: 'play' }} size={14} label="" className="shrink-0" />
              {p.startLabel}
            </button>
          </div>
        </div>
      </section>
      )}

      {p.overlays}
    </div>
  );
}

/** No workout to do: no week planned yet (plan it with the flame), or every workout of the week done. */
function NoPlan({ state, now, onTrain, land }: { state: GameState; now: Date; onTrain: () => void; land?: boolean }) {
  const name = storyWords(state).flame;
  const week = state.coach?.week;
  const ends = week ? nextMonday(week) : null;
  return (
    <section className={`rounded-2xl bg-ink-800 text-center pixel-border ${land ? 'flex min-h-0 flex-1 flex-col items-center justify-center p-3' : 'p-5'}`}>
      <Ember size={48} stage={flameStage(state.sessions.length).id} />
      {week && ends ? (
        <>
          <p className="mt-2 font-pixel text-[10px] text-gold-300">Every workout this week is done</p>
          <p className="mt-2 text-sm text-slate-300">Keep your rest days: they count too. Your next week starts {daysApart(now, ends) <= 1 ? 'tomorrow' : weekdayOf(dayKey(ends))}.</p>
        </>
      ) : (
        <>
          <p className="mt-2 font-pixel text-[10px] text-gold-300">No plan yet</p>
          <p className="mt-2 text-sm text-slate-300">Talk to {name} and plan your week together. Your workouts show here once it&apos;s ready.</p>
          <button onClick={onTrain} className="mt-4 w-full rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 active:shadow-none">
            Talk to {name}
          </button>
        </>
      )}
    </section>
  );
}

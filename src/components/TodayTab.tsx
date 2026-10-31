'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { BookOfDays } from './BookOfDays';
import { Ember, Hollow } from './Characters';
import { SitByFire } from './SitByFire';
import { Sprite } from './Sprite';
import { UiIcon, useGymMode } from './Gym';
import { useLook } from './Look';
import { useLand } from './useLand';
import {
  WEEKLY_GOAL,
  dayType,
  gearOf,
  sessionsThisWeek,
  todaysQuest,
  weekStreak,
  type Checkin,
  type GameState,
} from '@/lib/game';
import { ROLE_COLOR, ROLE_LABEL } from '@/lib/program';
import { EXERCISES, type ExerciseId } from '@/sprites/characters/exercise';
import { dayKey, daysApart, daysSinceTraining } from '@/lib/days';
import { storyWords } from '@/story/engine';
import { flameStage } from '@/story/flame';
import { currentPlan, dayLabel, nextDay, nextMonday, todayIs, weekdayOf } from '@/lib/coach/week';
import { ExerciseSheet } from './ExerciseDetail';
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
}

const CHECKINS: { id: Checkin; label: string; note: string; minutes: number }[] = [
  { id: 'rough', label: 'Rough', note: 'Small still counts. Main exercise only, about 15 minutes.', minutes: 15 },
  { id: 'normal', label: 'Normal', note: 'The full quest, about 40 minutes.', minutes: 40 },
  { id: 'strong', label: 'Strong', note: 'Full quest. If the last set flies, add a rep.', minutes: 40 },
];


export function TodayTab({ state, update, onStart, onReplayOpening, openBook, onTrain }: Props) {
  const now = new Date();
  const [overlay, setOverlay] = useState<'fire' | 'book' | null>(openBook ? 'book' : null);
  // An exercise tapped in the quest: how to do it.
  const [howTo, setHowTo] = useState<{ id: string; demo: ExerciseId } | null>(null);
  // The warm-up and the stretch start folded, so the main work gets the room.
  const [unfolded, setUnfolded] = useState<Partial<Record<FoldRole, boolean>>>({});
  const toggle = (role: FoldRole) => setUnfolded((u) => ({ ...u, [role]: !u[role] }));
  useEffect(() => {
    if (openBook) setOverlay('book');
  }, [openBook]);
  const [checkin, setCheckin] = useState<Checkin>(state.draft?.checkin ?? 'normal');
  const quest = todaysQuest(state, checkin);
  const week = sessionsThisWeek(state, now);
  const streak = weekStreak(state, now);
  const day = dayType(state);
  const inProgress = !!state.draft && Object.values(state.draft.sets).some((s) => s.length > 0);
  // What today is comes from one place (`todayIs`), the same the Train tab and the Start button read.
  const today = todayIs(state, now);
  // After today's workout Today says so and stops there: the next one is on the Train tab.
  const doneToday = !inProgress && today.kind === 'done';
  // The week is the one place a workout comes from: none planned (or all done), no quest.
  const plan = currentPlan(state.coach);
  const noPlan = !plan && !inProgress;
  const restDay = !inProgress && today.kind === 'rest';
  // Not its day yet (a rest day): the quest below is the next workout, to see, not to start.
  const ahead = restDay && plan ? today.next : undefined;
  const aheadDay = ahead ? (dayLabel(ahead.date, now) === 'Tomorrow' ? 'tomorrow' : weekdayOf(ahead.date)) : '';
  const aheadNote = ahead ? `Today is a rest day. This is your next workout, for ${aheadDay}.` : null;
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
    </>
  );
  const items = inProgress ? todaysQuest(state) : quest;
  // Gym mode says workout, not quest.
  const gym = useGymMode();
  const word = gym ? 'workout' : 'quest';
  const startLabel = inProgress ? `Continue ${word}` : ahead ? `Opens ${aheadDay === 'tomorrow' ? 'tomorrow' : `on ${aheadDay}`}` : `Start ${word}`;
  const questTitle = checkin === 'rough' && !inProgress ? (gym ? 'Short workout' : 'Minimum quest') : (plan?.title ?? `Day ${day} ${word}`);
  const rows = foldRows(items, unfolded);
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
        rows={rows}
        onToggle={toggle}
        instead={doneToday ? <DoneToday state={state} now={now} onTrain={onTrain} land /> : noPlan ? <NoPlan state={state} now={now} onTrain={onTrain} land /> : null}
        restDay={restDay}
        aheadNote={aheadNote}
        onHowTo={(q) => setHowTo({ id: q.id, demo: q.demo })}
        reps={reps}
        title={questTitle}
        checkin={checkin}
        onCheckin={inProgress ? undefined : setCheckin}
        startLabel={startLabel}
        locked={!!ahead}
        onStart={() => onStart(inProgress ? state.draft!.checkin : checkin)}
        onReplayOpening={onReplayOpening}
        onSit={() => setOverlay('fire')}
        overlays={overlays}
      />
    );

  return (
    <div className="space-y-4">
      <InstallHint />

      {!state.profile.voice && (
        <button onClick={onReplayOpening} className="gym-hide flex w-full items-center gap-3 rounded-2xl bg-[#140f1f] p-4 text-left ring-1 ring-red-400/30 active:scale-[.98]">
          <Hollow size={44} bounce={false} />
          <span className="min-w-0 flex-1">
            <span className="block font-pixel text-[10px] text-red-300">New: the opening</span>
            <span className="mt-1 block text-sm text-slate-300">The story now starts with the voice in your head. About 5 minutes, sound on.</span>
          </span>
        </button>
      )}

      <FlameCard state={state} now={now} week={week} streak={streak} />

      {restDay && <RestCard state={state} now={now} onSit={() => setOverlay('fire')} />}

      {doneToday ? (
        <DoneToday state={state} now={now} onTrain={onTrain} />
      ) : noPlan ? (
        <NoPlan state={state} now={now} onTrain={onTrain} />
      ) : (
        <>
      {aheadNote && !inProgress && <p className="text-xs text-orange-200">{aheadNote}</p>}

      <section className="rounded-2xl bg-ink-800 p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="font-pixel text-[9px] leading-relaxed text-gold-300">{questTitle}</h3>
          {!inProgress && <p className="shrink-0 pl-2 font-mono text-[11px] text-slate-400">{CHECKINS.find((c) => c.id === checkin)!.minutes} min</p>}
        </div>
        <ul className="mt-3 space-y-1.5">
          {rows.map((r) =>
            r.kind === 'fold' ? (
              <li key={r.role}>
                <FoldRow role={r.role} items={r.items} open={r.open} onToggle={() => toggle(r.role)} />
              </li>
            ) : (
              <li key={r.q.id}>
                <button onClick={() => setHowTo({ id: r.q.id, demo: r.q.demo })} aria-label={`How to do ${r.q.name}`} className="flex w-full items-center gap-3 rounded-xl bg-ink-900 py-1 pl-1 pr-3 text-left active:scale-[.98]">
                {/* A still of you doing it: the demo's first frame, at 1:1 so it stays crisp. */}
                {(EXERCISES as string[]).includes(r.q.demo) ? (
                  <Sprite id="exercise" opts={{ exercise: r.q.demo, ...hero }} size={48} playing={false} label={`${r.q.name}, demo`} className="shrink-0 rounded-lg bg-ink-950" />
                ) : (
                  <span className="h-12 w-12 shrink-0" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[r.q.role] }}>
                    {ROLE_LABEL[r.q.role]}
                  </span>
                  <span className="mt-0.5 block text-sm leading-snug text-slate-100">{r.q.name}</span>
                </span>
                <span className="shrink-0 font-mono text-sm text-slate-300">{reps(r.q)}</span>
                </button>
              </li>
            ),
          )}
        </ul>
      </section>

      <button
        onClick={() => onStart(inProgress ? state.draft!.checkin : checkin)}
        disabled={!!ahead}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-pixel text-xs transition ${ahead ? 'bg-ink-700 text-slate-400' : 'bg-gold-400 text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none'}`}
      >
        <UiIcon name={ahead ? 'lock' : 'play'} size={14} />
        {startLabel}
      </button>
      {!inProgress && !ahead && <RoughDay checkin={checkin} onCheckin={setCheckin} />}

        </>
      )}

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
      {/* In gym mode only the week shows (gym-hide), under a plain label (gym-only). */}
      <p className="gym-only text-sm font-semibold text-slate-100">This week</p>
      <div className={land ? 'gym-hide flex flex-1 items-center gap-3' : 'gym-hide flex items-center gap-3'}>
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
              <UiIcon name="flame" size={12} />
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
            <UiIcon name="flame" size={18} /> Sit by the fire · 1 minute
          </button>
          <p className={land ? 'mt-1.5 text-[11px] text-slate-500' : 'mt-2 text-xs text-slate-500'}>
            {fullDayOff ? 'A full day of air: your Fog runs today start Rested.' : 'It counts as rest: your Fog runs today start Rested.'}
          </p>
        </>
      )}
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
        <UiIcon name="close" size={18} />
      </button>
    </div>
  );
}

type Quest = ReturnType<typeof todaysQuest>;
type FoldRole = 'warmup' | 'stretch';
/** A row of the quest list: a folding header for the warm-up or the stretch, or one exercise. */
type QuestRow = { kind: 'fold'; role: FoldRole; items: Quest; open: boolean } | { kind: 'item'; q: Quest[number] };

/** The quest as rows: each run of warm-up or stretch moves under one header, shown only when unfolded. */
function foldRows(items: Quest, unfolded: Partial<Record<FoldRole, boolean>>): QuestRow[] {
  const rows: QuestRow[] = [];
  for (let i = 0; i < items.length; ) {
    const role = items[i].role;
    if (role !== 'warmup' && role !== 'stretch') {
      rows.push({ kind: 'item', q: items[i++] });
      continue;
    }
    let j = i;
    while (j < items.length && items[j].role === role) j++;
    const group = items.slice(i, j);
    const open = !!unfolded[role];
    rows.push({ kind: 'fold', role, items: group, open });
    if (open) for (const q of group) rows.push({ kind: 'item', q });
    i = j;
  }
  return rows;
}

/** The warm-up or the stretch as one quiet row: its name, how many moves, and a chevron to open it. */
function FoldRow({ role, items, open, onToggle, land }: { role: FoldRole; items: Quest; open: boolean; onToggle: () => void; land?: boolean }) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${ROLE_LABEL[role]}, ${items.length} ${items.length === 1 ? 'move' : 'moves'}. ${open ? 'Hide' : 'Show'}`}
      className={
        land
          ? 'flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl bg-ink-900/60 px-1 text-center active:scale-[.98]'
          : 'flex w-full items-center gap-3 rounded-xl bg-ink-900/60 px-3 py-2 text-left active:scale-[.98]'
      }
    >
      <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[role] }}>
        {ROLE_LABEL[role]}
      </span>
      <span className={`font-mono text-[11px] text-slate-500 ${land ? '' : 'flex-1'}`}>
        {items.length} {items.length === 1 ? 'move' : 'moves'}
      </span>
      <UiIcon name="chevron" size={10} className={`shrink-0 transition-transform motion-reduce:transition-none ${land ? (open ? 'rotate-180' : '') : open ? '-rotate-90' : 'rotate-90'}`} />
    </button>
  );
}

interface LandProps {
  state: GameState;
  now: Date;
  week: number;
  streak: number;
  hero: { gear: ReturnType<typeof gearOf>; classId: GameState['profile']['classId']; look: ReturnType<typeof useLook> };
  /** The quest's rows: the warm-up and the stretch folded unless opened. */
  rows: QuestRow[];
  onToggle: (role: FoldRole) => void;
  reps: (q: ReturnType<typeof todaysQuest>[number]) => string;
  /** Shown in place of the quest board: today's workout done, or none planned. */
  instead: ReactNode;
  restDay: boolean;
  aheadNote: string | null;
  /** An exercise tapped: open how to do it. */
  onHowTo: (q: ReturnType<typeof todaysQuest>[number]) => void;
  title: string;
  checkin: Checkin;
  /** Left out while a quest is under way: the check-in is set then. */
  onCheckin?: (c: Checkin) => void;
  startLabel: string;
  /** Not the workout's day yet: Start shows when it opens, and can't be pressed. */
  locked: boolean;
  onStart: () => void;
  onReplayOpening: () => void;
  onSit: () => void;
  overlays: ReactNode;
}

/**
 * Today held sideways, one screen with no scrolling: a strip along the top (the chapter's enemy,
 * the flame, a rest day, the quote) and below it the quest board, the exercises side by side and
 * Start as a big button at the end of the row.
 */
function LandToday(p: LandProps) {
  const { state, now } = p;
  return (
    <div className="flex h-full flex-col gap-3">
      {/* A little room inside the row, so the cards' pixel borders aren't clipped by its scroll. */}
      <div className="-m-1 flex h-[7.75rem] shrink-0 gap-3 [@media(max-height:370px)]:h-[7.25rem] overflow-x-auto p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <InstallHint land />
        {!state.profile.voice && (
          <button onClick={p.onReplayOpening} className="gym-hide flex h-full w-60 shrink-0 items-center gap-3 rounded-2xl bg-[#140f1f] p-3 text-left ring-1 ring-red-400/30 active:scale-[.98]">
            <Hollow size={44} bounce={false} />
            <span className="min-w-0 flex-1">
              <span className="block font-pixel text-[9px] text-red-300">New: the opening</span>
              <span className="mt-1 block text-xs text-slate-300">The story now starts with the voice in your head. About 5 minutes, sound on.</span>
            </span>
          </button>
        )}
        <div className="min-w-[15rem] flex-[1.4] basis-0">
          <FlameCard state={state} now={now} week={p.week} streak={p.streak} land />
        </div>
        {p.restDay && (
          <div className="min-w-[14rem] flex-1 basis-0">
            <RestCard state={state} now={now} onSit={p.onSit} land />
          </div>
        )}
      </div>

      {p.instead ?? (
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-ink-800 p-3">
        <div className="flex items-baseline gap-3">
          <h3 className="shrink-0 font-pixel text-[10px] text-gold-300">{p.title}</h3>
          {p.onCheckin && <p className="shrink-0 font-mono text-[11px] text-slate-400">{CHECKINS.find((c) => c.id === p.checkin)!.minutes} min</p>}
          {p.aheadNote && <p className="min-w-0 flex-1 truncate text-xs text-orange-200">{p.aheadNote}</p>}
        </div>

        <div className="mt-2 flex min-h-0 flex-1 gap-3">
          {/* The exercises side by side; the dark box takes what height there is, the figure stands on its floor. */}
          <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {p.rows.map((r) =>
              r.kind === 'fold' ? (
                <li key={r.role} className="flex min-h-0 w-14 shrink-0">
                  <FoldRow role={r.role} items={r.items} open={r.open} onToggle={() => p.onToggle(r.role)} land />
                </li>
              ) : (
              <li key={r.q.id} className="flex min-h-0 min-w-[4rem] flex-1 basis-0">
                <button onClick={() => p.onHowTo(r.q)} aria-label={`How to do ${r.q.name}`} className="flex min-h-0 w-full flex-col rounded-xl bg-ink-900 p-1.5 text-center active:scale-[.98]">
                <span className="relative flex min-h-0 flex-1 items-end justify-center overflow-hidden rounded-lg bg-ink-950">
                  {(EXERCISES as string[]).includes(r.q.demo) && (
                    <Sprite id="exercise" opts={{ exercise: r.q.demo, ...p.hero }} size={64} playing={false} label={`${r.q.name}, demo`} className="shrink-0" />
                  )}
                  <span className="absolute left-1 top-1 rounded bg-ink-950/85 px-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: ROLE_COLOR[r.q.role] }}>
                    {ROLE_LABEL[r.q.role]}
                  </span>
                </span>
                <span className="mt-1 line-clamp-2 shrink-0 text-xs leading-tight text-slate-100">{r.q.name}</span>
                <span className="shrink-0 font-mono text-xs text-slate-300">{p.reps(r.q)}</span>
                </button>
              </li>
              ),
            )}
          </ul>

          <div className="flex w-40 shrink-0 flex-col min-[800px]:w-44">
            <button
              onClick={p.onStart}
              disabled={p.locked}
              className={`flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-2xl px-3 font-pixel text-[10px] leading-relaxed transition ${p.locked ? 'bg-ink-700 text-slate-400' : 'bg-gold-400 text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none'}`}
            >
              <UiIcon name={p.locked ? 'lock' : 'play'} size={14} className="shrink-0" />
              {p.startLabel}
            </button>
            {p.onCheckin && !p.locked && <RoughDay checkin={p.checkin} onCheckin={p.onCheckin} land />}
          </div>
        </div>
      </section>
      )}

      {p.overlays}
    </div>
  );
}

/** "I feel" as one quiet link under Start: a rough day does the main exercise only. Normal is the default. */
function RoughDay({ checkin, onCheckin, land }: { checkin: Checkin; onCheckin: (c: Checkin) => void; land?: boolean }) {
  const rough = checkin === 'rough';
  return (
    <button
      onClick={() => onCheckin(rough ? 'normal' : 'rough')}
      aria-pressed={rough}
      className={`mx-auto block text-center text-xs active:opacity-70 ${land ? 'mt-1.5 w-full' : 'mt-1'} ${rough ? 'text-orange-200' : 'text-slate-500'}`}
    >
      {rough ? (land ? 'Rough day: main only · Undo' : 'Rough day: the main exercise only, about 15 min · Undo') : 'Rough day? Do less'}
    </button>
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

/**
 * Today's workout is done, so Today says so and stops there: done for the day, two counts (workouts
 * in all, this week), and a quiet line on what's next, which the Train tab shows in full.
 */
function DoneToday({ state, now, onTrain, land }: { state: GameState; now: Date; onTrain: () => void; land?: boolean }) {
  const total = state.sessions.length;
  const week = sessionsThisWeek(state, now);
  const coachWeek = state.coach?.week;
  const next = nextDay(coachWeek);
  const ends = coachWeek ? nextMonday(coachWeek) : null;
  const cells = [
    { n: String(total), label: total === 1 ? 'workout' : 'workouts' },
    { n: `${Math.min(week, WEEKLY_GOAL)}/${WEEKLY_GOAL}`, label: 'this week' },
  ];
  const nextWords = next
    ? `Next: ${dayLabel(next.date, now)} · ${next.plan.title}`
    : coachWeek && ends
      ? `Next week starts ${daysApart(now, ends) <= 1 ? 'tomorrow' : weekdayOf(dayKey(ends))}`
      : `Plan your next week with ${storyWords(state).flame}`;
  return (
    <section className={`rounded-2xl bg-ink-800 text-center ${land ? 'flex min-h-0 flex-1 flex-col items-center justify-center p-3' : 'px-5 py-6'}`}>
      <p className={`font-pixel text-emerald-300 ${land ? 'text-[11px]' : 'text-sm'}`}>Done for today</p>
      <p className={`text-slate-300 ${land ? 'mt-1.5 text-xs' : 'mt-2 text-sm'}`}>You earned it. Enjoy the rest of your day.</p>
      <div className={`mx-auto grid w-full max-w-[16rem] grid-cols-2 gap-2 ${land ? 'mt-3' : 'mt-5'}`}>
        {cells.map((c) => (
          <div key={c.label} className="rounded-xl bg-ink-900 py-2.5">
            <p className={`font-pixel text-gold-300 ${land ? 'text-xs' : 'text-sm'}`}>{c.n}</p>
            <p className="mt-1 text-[10px] text-slate-400">{c.label}</p>
          </div>
        ))}
      </div>
      <button onClick={onTrain} className={`mx-auto flex max-w-full items-center justify-center gap-1 text-xs text-slate-400 active:text-slate-200 ${land ? 'mt-3' : 'mt-5'}`}>
        <span className="min-w-0 truncate">{nextWords}</span>
        <UiIcon name="chevron" size={10} className="shrink-0" />
      </button>
    </section>
  );
}

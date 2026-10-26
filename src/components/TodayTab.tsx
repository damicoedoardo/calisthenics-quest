'use client';

import { useEffect, useState } from 'react';
import { Map as MapIcon, Play, Shield, X } from 'lucide-react';
import { Ember, Hollow } from './Characters';
import { Foe } from './Battle';
import { stopLabel } from './WorkoutFight';
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
import { getPath } from '@/lib/skills';
import { storyState } from '@/lib/story';
import { chapterStops, patrolAt, roadState } from '@/lib/road';
import { restDays, startFight } from '@/lib/fight';

interface Props {
  state: GameState;
  onStart: (checkin: Checkin) => void;
  onReplayOpening: () => void;
  onOpenMap: () => void;
}

const CHECKINS: { id: Checkin; label: string; note: string }[] = [
  { id: 'rough', label: 'Rough', note: 'Small still counts. Main exercise only, about 15 minutes.' },
  { id: 'normal', label: 'Normal', note: 'The full quest, about 40 minutes.' },
  { id: 'strong', label: 'Strong', note: 'Full quest. If the last set flies, add a rep.' },
];

const ROLE_LABEL = { main: 'Main', core: 'Core', support: 'Support' } as const;

function emberLine(week: number, streak: number): string {
  if (week >= WEEKLY_GOAL) return streak > 1 ? `Week won. ${streak} in a row. I'm basically a bonfire.` : "Week won! Look at me, I'm a real flame.";
  if (week === 2) return 'Two pages this week. One more and the week is ours.';
  if (week === 1) return "One down. I'm warming up.";
  return 'New week. Three pages to write. Want to start one?';
}

export function TodayTab({ state, onStart, onReplayOpening, onOpenMap }: Props) {
  const now = new Date();
  const [checkin, setCheckin] = useState<Checkin>(state.draft?.checkin ?? 'normal');
  const quest = todaysQuest(state, checkin);
  const story = storyState(state);
  const road = roadState(state);
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

      {story.chapter && road.next ? (
        <NextFight state={state} now={now} onOpenMap={onOpenMap} />      ) : (
        <section className="rounded-2xl bg-ink-800 p-4 text-center pixel-border">
          <p className="font-pixel text-xs text-gold-300">The road is yours</p>
          <p className="mt-2 text-sm text-slate-300">You reached the Summit. Keep training: your gear and skills keep growing.</p>
        </section>
      )}

      <section className="flex items-center gap-3 rounded-2xl bg-ink-800 p-4">
        <div className="grid w-16 shrink-0 place-items-center">
          <Ember size={30 + Math.min(streak, 5) * 7} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-200">&ldquo;{emberLine(week, streak)}&rdquo;</p>
          <div className="mt-2 flex gap-1.5">
            {Array.from({ length: WEEKLY_GOAL }).map((_, i) => (
              <div key={i} className={`h-2.5 flex-1 rounded-sm ${i < week ? 'bg-gold-400' : 'bg-ink-600'}`} />
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {Math.min(week, WEEKLY_GOAL)}/{WEEKLY_GOAL} this week{streak > 0 ? ` · ${streak}-week streak` : ''}
          </p>
        </div>
      </section>

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
    </div>
  );
}

/** The fight your next workout walks into, with the chapter's road and Ember's shields. */
function NextFight({ state, now, onOpenMap }: { state: GameState; now: Date; onOpenMap: () => void }) {
  const road = roadState(state);
  const story = storyState(state);
  const stop = road.blockedByTest ? patrolAt(road.next!.g) : road.next!;
  const stops = chapterStops(stop.chapter);
  const fight = state.draft?.fight ?? startFight(state, now);
  const shields = fight?.shields ?? 0;
  const rest = restDays(state, now);
  const scouted = state.scouted === stop.g && !road.blockedByTest;
  const gear = gearOf(state);
  return (
    <button onClick={onOpenMap} className="block w-full rounded-2xl bg-ink-800 p-4 text-left pixel-border active:scale-[.99]">
      <div className="flex items-baseline justify-between">
        <p className="font-pixel text-[10px] text-slate-400">
          Chapter {story.chapter?.n} · {story.chapter?.name}
        </p>
        <MapIcon size={16} className="shrink-0 text-slate-500" />
      </div>
      <div className="mt-3 flex items-center gap-4">
        <Foe sprite={stop.sprite} size={72} gear={gear} classId={state.profile.classId} />
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[9px] text-red-300">{stopLabel(stop, road.blockedByTest)}</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{stop.name}</p>
          <p className="mt-1 text-xs text-slate-400">
            {road.blockedByTest
              ? 'The final blow waits for your max test (Hero tab). Until then, your workout fights a patrol.'
              : 'Your workout is the fight: every set you log is a hit. Finish your sets to win.'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-1" aria-label="The chapter's road">
        {stops.map((s) => (
          <div
            key={s.g}
            className={`h-2.5 flex-1 rounded-sm ${s.g < road.cleared ? 'bg-emerald-400' : s.g === stop.g ? 'bg-gold-400' : s.kind === 'boss' ? 'bg-red-900' : 'bg-ink-600'}`}
          />
        ))}
      </div>
      {shields > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-sky-300">
          <Shield size={13} />
          {shields} shield{shields === 1 ? '' : 's'} ready
          <span className="text-slate-500">
            ({[rest > 0 && (state.sessions.length ? `${rest} rest day${rest === 1 ? '' : 's'}` : 'fresh start'), scouted && 'scouted', shields > rest + (scouted ? 1 : 0) && 'Bonfire'].filter(Boolean).join(', ')})
          </span>
        </p>
      )}
    </button>
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

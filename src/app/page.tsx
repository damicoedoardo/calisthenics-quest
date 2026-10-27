'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Gamepad2, Map, Shield, Swords } from 'lucide-react';
import { TodayTab } from '@/components/TodayTab';
import { SkillsTab } from '@/components/SkillsTab';
import { HeroTab } from '@/components/HeroTab';
import { PlayTab } from '@/components/PlayTab';
import { FogRun, type RunStart } from '@/components/FogRun';
import { Hero } from '@/components/Hero';
import { Prologue } from '@/components/Prologue';
import { Workout } from '@/components/Workout';
import { AfterSession } from '@/components/AfterSession';
import { ScenePlayer, type SceneResult } from '@/components/ScenePlayer';
import { ClassPicker } from '@/components/ClassPicker';
import { DevButton, DevPanel } from '@/components/DevPanel';
import { LookProvider } from '@/components/Look';
import { closeStaleDraft, finishSession, gearOf, levelInfo, totalXp, type Checkin, type FinishResult } from '@/lib/game';
import { sawScene, scenesToPlay, storyState, type StoryState } from '@/story/engine';
import { withTodayPage } from '@/story/daily';
import type { Scene } from '@/story/types';
import { inSandbox, useGameState } from '@/lib/store';
import { recordRun, ZONES, type Zone } from '@/lib/fog';
import { skipIntro, useDevMode } from '@/lib/dev';

type Tab = 'today' | 'skills' | 'play' | 'hero';

const TABS: { id: Tab; label: string; Icon: typeof Swords }[] = [
  { id: 'today', label: 'Today', Icon: Swords },
  { id: 'skills', label: 'Skills', Icon: Map },
  { id: 'play', label: 'Play', Icon: Gamepad2 },
  { id: 'hero', label: 'Hero', Icon: Shield },
];

export default function Home() {
  const game = useGameState();
  // Every hero sprite below draws with the player's look.
  return (
    <LookProvider look={game.state.profile.look}>
      <Game {...game} />
    </LookProvider>
  );
}

function Game({ state, ready, update }: ReturnType<typeof useGameState>) {
  const [tab, setTab] = useState<Tab>('today');
  const [training, setTraining] = useState(false);
  const [after, setAfter] = useState<{ result: FinishResult; before: StoryState; after: StoryState } | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [picker, setPicker] = useState<'story' | 'manual' | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [run, setRun] = useState<Zone | null>(null);
  // Bumped when something may have unlocked a scene outside a session (a max test).
  const [storyTick, setStoryTick] = useState(0);
  const [devOpen, setDevOpen] = useState(false);
  // /lab/night opens the app on a sandbox save at a given spot: ?tab=, ?run=<zone>&at=, ?workout, ?book.
  const [sandbox, setSandbox] = useState(false);
  const [runStart, setRunStart] = useState<RunStart | undefined>();
  const [openBook, setOpenBook] = useState(false);
  const jumped = useRef(false);
  useEffect(() => {
    if (!ready || jumped.current) return;
    jumped.current = true;
    if (!inSandbox()) return;
    setSandbox(true);
    const q = new URLSearchParams(window.location.search);
    const t = q.get('tab');
    if (t === 'today' || t === 'skills' || t === 'play' || t === 'hero') setTab(t);
    const zone = ZONES.find((z) => String(z.id) === q.get('run'));
    if (zone) {
      const at = q.get('at');
      setRunStart(at === 'mid' || at === 'boss' || at === 'win' ? at : undefined);
      setRun(zone);
    }
    if (q.has('workout')) {
      update((s) => ({ ...s, draft: s.draft ?? { startedAt: new Date().toISOString(), checkin: 'normal', sets: {} } }));
      setTraining(true);
    }
    if (q.has('book')) setOpenBook(true);
  }, [ready, update]);
  // Anything that takes the screen (a scene, a run, a workout) closes the panel for good.
  const busy = !!(run || training || after || scene || picker);
  useEffect(() => {
    if (busy) setDevOpen(false);
  }, [busy]);
  const { dev, live, toggle: setDev } = useDevMode();
  // While a screen is open over the tabs, the tabs underneath are out of reach: no keyboard focus
  // and nothing for a screen reader to wander into. (React 18 has no inert prop, so it's set here.)
  const root = useRef<HTMLDivElement>(null);
  const covered = busy || (dev && devOpen);
  // Only on a change, so it never undoes the inert an overlay inside a tab set (useModal).
  const applied = useRef(false);
  useEffect(() => {
    if (!root.current || applied.current === covered) return;
    applied.current = covered;
    root.current.querySelectorAll(':scope > header, :scope > main, :scope > nav').forEach((el) => el.toggleAttribute('inert', covered));
  });
  // Seven quick taps on the FORMA name unlock developer mode on the live app.
  const taps = useRef<number[]>([]);
  const tapName = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 7 && !dev) setDev(true);
  };
  const lvl = levelInfo(totalXp(state));
  const gear = gearOf(state);

  // Play the next story scene whenever the player is back on the main screen.
  useEffect(() => {
    if (!ready || !state.profile.onboarded || replaying || training || after || scene || picker || run) return;
    const next = scenesToPlay(state, new Date())[0];
    if (next) setScene(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.profile.onboarded, state.sessions.length, state.tests.length, replaying, training, after, scene, picker, run, storyTick]);

  // A page in the Book of Days for every day the app is opened (and today's line follows the day).
  const today = new Date().toDateString();
  // A quest left open on an earlier day is saved on that day first, so it isn't mixed into today's.
  useEffect(() => {
    if (!ready || !state.profile.onboarded || training) return;
    update((s) => withTodayPage(closeStaleDraft(s, new Date()), new Date()));
  }, [ready, state.profile.onboarded, state.sessions.length, today, training, update]);

  const endScene = useCallback(
    (r: SceneResult) => {
      if (!scene) return;
      update((s) => ({
        ...sawScene(s, scene.id, new Date()),
        profile: r.flame ? { ...s.profile, flame: r.flame } : s.profile,
        answers: r.answer ? { ...s.answers, [r.answer.id]: r.answer.value } : s.answers,
      }));
      if (r.pickClass) setPicker('story');
      setScene(null);
    },
    [scene, update],
  );

  const start = (checkin: Checkin) => {
    update((s) => {
      const hasSets = !!s.draft && Object.values(s.draft.sets).some((l) => l.length > 0);
      if (hasSets) return s;
      return { ...s, draft: { startedAt: new Date().toISOString(), checkin, sets: {} } };
    });
    setTraining(true);
  };

  const finish = () => {
    const res = finishSession(state, new Date());
    if (!res) return;
    const before = storyState(state);
    update(() => res.state);
    setAfter({ result: res, before, after: storyState(res.state) });
    setTraining(false);
    setTab('today');
  };

  if (!ready) return <div className="min-h-dvh bg-ink-950" />;

  if (!state.profile.onboarded || replaying) {
    return (
      <Prologue
        state={state}
        onExit={replaying ? () => setReplaying(false) : undefined}
        onSkip={dev && !replaying ? () => update((s) => skipIntro(s, new Date())) : undefined}
        onLook={(look) => update((s) => ({ ...s, profile: { ...s.profile, look } }))}
        onFinish={({ letter, voice, progress }) => {
          update((s) => ({ ...s, profile: { ...s.profile, onboarded: true, letter, voice }, progress: progress ?? s.progress }));
          setReplaying(false);
        }}
      />
    );
  }

  return (
    <div ref={root} className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="safe-top sticky top-0 z-20 bg-ink-950/90 px-4 pb-3 backdrop-blur">
        {sandbox && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-dashed border-sky-400/60 px-3 py-1.5 text-[11px] text-sky-300">
            <span>Sandbox: your real save is untouched</span>
            <a href="/lab/night" className="shrink-0 underline">
              Back to tonight
            </a>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-ink-800">
            <Hero gear={gear} classId={state.profile.classId} size={42} bounce={false} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <p onClick={tapName} className="font-pixel text-sm tracking-widest text-gold-400">
                  FORMA
                </p>
                {dev && <DevButton onClick={() => setDevOpen(true)} />}
              </div>
              <p className="text-xs text-slate-400">
                Lv {lvl.level} · <span className="text-slate-200">{lvl.title}</span>
              </p>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm bg-ink-700">
              <div className="h-full bg-gradient-to-r from-gold-500 to-gold-300 transition-all duration-700" style={{ width: `${lvl.pct * 100}%` }} />
            </div>
            <p className="mt-1 text-right font-mono text-[11px] text-slate-500">
              {lvl.into} / {lvl.needed} XP
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-2">
        {tab === 'today' ? (
          <TodayTab state={state} update={update} onStart={start} onReplayOpening={() => setReplaying(true)} openBook={openBook} />
        ) : tab === 'skills' ? (
          <SkillsTab state={state} />
        ) : tab === 'play' ? (
          <PlayTab state={state} onPlay={setRun} />
        ) : (
          <HeroTab
            state={state}
            update={update}
            onChangeClass={() => setPicker('manual')}
            onTestLogged={() => setStoryTick((t) => t + 1)}
            onReplayOpening={() => setReplaying(true)}
          />
        )}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-ink-700 bg-ink-900/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => {
                setTab(id);
                window.scrollTo({ top: 0 });
              }}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${tab === id ? 'text-gold-400' : 'text-slate-500'}`}
            >
              <Icon size={22} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {dev && devOpen && !busy && (
        <DevPanel state={state} update={update} onPlayScene={setScene} onTurnOff={live ? () => setDev(false) : undefined} onClose={() => setDevOpen(false)} />
      )}
      {run && (
        <FogRun
          state={state}
          zone={run}
          dev={dev}
          startAt={runStart}
          onEnd={(r) => update((s) => recordRun(s, r))}
          onLeave={() => {
            setRun(null);
            setRunStart(undefined);
          }}
        />
      )}
      {training && <Workout state={state} update={update} onClose={() => setTraining(false)} onFinish={finish} />}
      {after && <AfterSession result={after.result} before={after.before} after={after.after} onClose={() => setAfter(null)} />}
      {scene && <ScenePlayer key={scene.id} scene={scene} state={state} onDone={endScene} />}
      {picker && (
        <ClassPicker
          progress={state.progress}
          current={state.profile.classId}
          onPick={(id) => {
            update((s) => ({ ...s, profile: { ...s.profile, classId: id } }));
            setPicker(null);
          }}
          onCancel={() => setPicker(null)}
        />
      )}
    </div>
  );
}

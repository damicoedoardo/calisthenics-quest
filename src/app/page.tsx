'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TodayTab } from '@/components/TodayTab';
import { TrainTab } from '@/components/TrainTab';
import { HeroTab } from '@/components/HeroTab';
import { PlayTab } from '@/components/PlayTab';
import { FogRun, type RunStart } from '@/components/FogRun';
import { Hero } from '@/components/Hero';
import { Prologue } from '@/components/Prologue';
import { Opening, openingDue } from '@/components/Opening';
import { useMenuTrack } from '@/components/Sound';
import { Workout } from '@/components/Workout';
import { AfterSession } from '@/components/AfterSession';
import { ScenePlayer, type SceneResult } from '@/components/ScenePlayer';
import { ClassPicker } from '@/components/ClassPicker';
import { DevButton, DevPanel } from '@/components/DevPanel';
import { Sprite } from '@/components/Sprite';
import { LookProvider } from '@/components/Look';
import { CloudChoice, useCloudSync } from '@/components/Cloud';
import { useFriendsBeat } from '@/components/Friends';
import { SignInGate, signInDue } from '@/components/SignInGate';
import { useCloudStatus } from '@/lib/cloud-client';
import { BringHero, InstallGate } from '@/components/InstallGate';
import { closeStaleDraft, finishSession, gearOf, levelInfo, totalXp, type Checkin, type FinishResult } from '@/lib/game';
import { sawScene, scenesToPlay, storyState, type StoryState } from '@/story/engine';
import { withTodayPage } from '@/story/daily';
import { heroVariant } from '@/story/flame';
import type { Scene } from '@/story/types';
import { inSandbox, useGameState } from '@/lib/store';
import { recordRun, ZONES, type Zone } from '@/lib/fog';
import { settleGear } from '@/lib/fog-gear';
import { skipIntro, useDevMode } from '@/lib/dev';
import { mustInstall, needsCarry } from '@/lib/install';
import { useInstall } from '@/lib/install-client';

type Tab = 'today' | 'train' | 'play' | 'hero';

// Each tab's pixel icon (src/sprites/characters/icons.ts): crossed swords, a dumbbell, a game pad, a shield.
const TABS: { id: Tab; label: string; icon: 'tabToday' | 'tabTrain' | 'tabPlay' | 'tabHero' }[] = [
  { id: 'today', label: 'Today', icon: 'tabToday' },
  { id: 'train', label: 'Train', icon: 'tabTrain' },
  { id: 'play', label: 'Play', icon: 'tabPlay' },
  { id: 'hero', label: 'Hero', icon: 'tabHero' },
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
  const [devOpen, setDevOpen] = useState(false);
  // /lab/night opens the app on a sandbox save at a given spot: ?tab=, ?run=<zone>&at=, ?workout, ?book.
  const [sandbox, setSandbox] = useState(false);
  const [runStart, setRunStart] = useState<RunStart | undefined>();
  const [openBook, setOpenBook] = useState(false);
  // The few seconds when the app opens (once per open, not in the sandbox or before the prologue).
  const [opening, setOpening] = useState(false);
  const jumped = useRef(false);
  // The cloud backup, when signed in. Never before the save has loaded, never in the sandbox.
  const cloud = useCloudSync(state, update, !ready || inSandbox());
  // Shows you online to your friends while the app is open, and in the Fog during a run.
  useFriendsBeat(state, run?.name ?? null, !ready || inSandbox());
  // After the install step, an account once (SignInGate); developer mode may play on without.
  const { signedIn } = useCloudStatus();
  const [skipSignIn, setSkipSignIn] = useState(false);
  useEffect(() => {
    if (!ready || jumped.current) return;
    jumped.current = true;
    if (!inSandbox()) return;
    setSandbox(true);
    const q = new URLSearchParams(window.location.search);
    const t = q.get('tab');
    if (t === 'today' || t === 'train' || t === 'play' || t === 'hero') setTab(t);
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
  // Before the first paint, so the tabs never flash ahead of it.
  useLayoutEffect(() => {
    if (ready && state.profile.onboarded && !inSandbox() && openingDue()) setOpening(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  // Anything that takes the screen (a scene, a run, a workout) closes the panel for good.
  const busy = !!(run || training || after || scene || picker);
  // After the prologue, a phone in a browser tab installs FORMA before playing on. Never in the
  // sandbox (unless ?gate= asks for the screen), never once installed or on a computer.
  const inst = useInstall();
  const gated = inst.known && !inst.standalone && !inst.skipped && mustInstall(inst.platform) && (inst.forced || !inSandbox());
  // The menus' music, on the tabs only: the opening, story, workouts and runs have their own.
  const askSignIn = !gated && !skipSignIn && !inSandbox() && signInDue(signedIn);
  useMenuTrack(ready && state.profile.onboarded && !opening && !replaying && !busy && !gated && !askSignIn);
  useEffect(() => {
    if (busy) setDevOpen(false);
  }, [busy]);
  const { dev, live, toggle: setDev } = useDevMode();
  // While a screen is open over the tabs, the tabs underneath are out of reach: no keyboard focus
  // and nothing for a screen reader to wander into. (React 18 has no inert prop, so it's set here.)
  const root = useRef<HTMLDivElement>(null);
  // Sideways the tab scrolls inside main (when it scrolls at all), not the page.
  const main = useRef<HTMLElement>(null);
  const covered = busy || opening || (dev && devOpen);
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
    if (!ready || !state.profile.onboarded || opening || replaying || training || after || scene || picker || run) return;
    const next = scenesToPlay(state, new Date())[0];
    if (next) setScene(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.profile.onboarded, state.sessions.length, opening, replaying, training, after, scene, picker, run]);

  // A page in the Book of Days for every day the app is opened (and today's line follows the day).
  const today = new Date().toDateString();
  // A quest left open on an earlier day is saved on that day first, so it isn't mixed into today's.
  useEffect(() => {
    if (!ready || !state.profile.onboarded || training) return;
    update((s) => withTodayPage(closeStaleDraft(s, new Date()), new Date()));
  // After a Fog run too, so the page keeps what the flame said about it.
  }, [ready, state.profile.onboarded, state.sessions.length, state.fog?.runs, today, training, update]);

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
        onFinish={({ letter, voice, kit }) => {
          update((s) => ({ ...s, profile: { ...s.profile, onboarded: true, letter, voice, kit: kit ?? s.profile.kit } }));
          setReplaying(false);
        }}
        // On iPhones each browser and the installed app keep their own saves: a hero copied in
        // one comes in here.
        bring={!replaying && needsCarry(inst.platform) ? <BringHero startOpen={inst.standalone} onBring={(s) => update(() => s)} /> : undefined}
      />
    );
  }

  if (gated)
    return (
      <InstallGate
        state={state}
        platform={inst.platform}
        canPrompt={inst.canPrompt}
        installed={inst.installed}
        onInstall={inst.install}
        onSkip={dev ? inst.skip : undefined}
      />
    );

  if (askSignIn && !opening) return <SignInGate onSkip={dev ? () => setSkipSignIn(true) : undefined} />;

  return (
    // Held sideways (the `land` screen), the tab bar becomes a rail down the left, the header shrinks
    // to one line, and the tab fills exactly the rest of the screen (each tab lays out a screen of
    // its own then, see useLand). On a computer (`desk`) the rail is wider, with the tab names beside
    // their icons, and the column sits in the middle of the rest.
    <div ref={root} className="mx-auto flex min-h-dvh max-w-md flex-col land:ml-[calc(4.5rem+env(safe-area-inset-left))] land:mr-0 land:h-dvh land:min-h-0 land:max-w-none land:pr-[env(safe-area-inset-right)] desk:ml-56 desk:mr-0 desk:max-w-none">
      <header className="safe-top sticky top-0 z-20 bg-ink-950/90 px-4 pb-3 backdrop-blur land:flex land:items-center land:gap-3 land:!pt-2 land:pb-2 desk:mx-auto desk:w-full desk:max-w-2xl desk:px-6 desk:pt-5">
        {sandbox && (
          // Sideways it is a small tag at the end of the header line.
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-dashed border-sky-400/60 px-3 py-1.5 text-[11px] text-sky-300 land:order-last land:mb-0 land:shrink-0 land:px-2 land:py-1">
            <span className="land:hidden">Sandbox: your real save is untouched</span>
            <span className="hidden land:inline">Sandbox</span>
            <a href="/lab/night" className="shrink-0 underline">
              Back to tonight
            </a>
          </div>
        )}
        <div className="flex items-center gap-3 land:min-w-0 land:flex-1">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-ink-800 land:hidden desk:hidden">
            <Hero gear={gear} classId={state.profile.classId} size={42} bounce={false} variant={heroVariant(state)} />
          </div>
          <div className="min-w-0 flex-1 land:flex land:items-center land:gap-4">
            <div className="flex items-baseline justify-between land:shrink-0 land:items-center land:gap-4">
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
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-sm bg-ink-700 land:mt-0 land:flex-1">
              <div className="h-full bg-gradient-to-r from-gold-500 to-gold-300 transition-all duration-700" style={{ width: `${lvl.pct * 100}%` }} />
            </div>
            <p className="mt-1 text-right font-mono text-[11px] text-slate-500 land:mt-0 land:shrink-0">
              {lvl.into} / {lvl.needed} XP
            </p>
          </div>
        </div>
      </header>

      <main ref={main} className="flex-1 px-4 pb-28 pt-2 land:min-h-0 land:overflow-y-auto land:pb-3 desk:mx-auto desk:w-full desk:max-w-2xl desk:px-6 desk:pb-12">
        {tab === 'today' ? (
          <TodayTab state={state} update={update} onStart={start} onReplayOpening={() => setReplaying(true)} openBook={openBook} />
        ) : tab === 'train' ? (
          <TrainTab state={state} update={update} />
        ) : tab === 'play' ? (
          <PlayTab state={state} onPlay={setRun} update={update} />
        ) : (
          <HeroTab
            state={state}
            update={update}
            onChangeClass={() => setPicker('manual')}
            onReplayOpening={() => setReplaying(true)}
          />
        )}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-ink-700 bg-ink-900/95 backdrop-blur land:right-auto land:top-0 land:flex land:w-[calc(4.5rem+env(safe-area-inset-left))] land:flex-col land:items-center land:justify-center land:gap-3 land:border-r land:border-t-0 land:pl-[env(safe-area-inset-left)] desk:right-auto desk:top-0 desk:flex desk:w-56 desk:flex-col desk:gap-6 desk:border-r desk:border-t-0 desk:px-3 desk:py-6">
        {/* Sideways, the hero from the header sits at the top of the rail; on a computer, bigger. */}
        <div aria-hidden className="hidden h-11 w-11 place-items-center rounded-xl bg-ink-800 land:grid desk:mx-auto desk:grid desk:h-28 desk:w-28">
          <span className="desk:hidden">
            <Hero gear={gear} classId={state.profile.classId} size={38} bounce={false} variant={heroVariant(state)} />
          </span>
          <span className="hidden desk:block">
            <Hero gear={gear} classId={state.profile.classId} size={96} bounce={false} variant={heroVariant(state)} />
          </span>
        </div>
        <div className="mx-auto grid max-w-md grid-cols-4 land:mx-0 land:w-full land:grid-cols-1 land:gap-1 desk:mx-0 desk:w-full desk:grid-cols-1 desk:gap-1">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => {
                setTab(id);
                window.scrollTo({ top: 0 });
                main.current?.scrollTo({ top: 0 });
              }}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium land:mx-2 land:rounded-xl land:py-2 desk:flex-row desk:gap-3 desk:rounded-xl desk:px-4 desk:py-3 desk:text-sm desk:hover:bg-ink-800/60 ${tab === id ? 'text-gold-400 land:bg-ink-800 land:ring-1 land:ring-gold-400/30 desk:bg-ink-800 desk:ring-1 desk:ring-gold-400/30' : 'text-slate-500 desk:hover:text-slate-300'}`}
            >
              {/* Full color on the open tab; faded and grey on the others. */}
              <span className="grid h-[22px] place-items-center">
                <Sprite id="uiIcon" opts={{ name: icon }} size={22} label="" className={tab === id ? '' : 'opacity-70 grayscale'} />
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {dev && devOpen && !busy && (
        <DevPanel state={state} update={update} onPlayScene={setScene} onPlayOpening={() => setOpening(true)} onTurnOff={live ? () => setDev(false) : undefined} onClose={() => setDevOpen(false)} />
      )}
      {run && (
        <FogRun
          state={state}
          zone={run}
          dev={dev}
          startAt={runStart}
          onEnd={(r) => update((s) => settleGear(recordRun(s, r), r).state)}
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
          workouts={state.sessions.length}
          current={state.profile.classId}
          onPick={(id) => {
            update((s) => ({ ...s, profile: { ...s.profile, classId: id } }));
            setPicker(null);
          }}
          onCancel={() => setPicker(null)}
        />
      )}
      <CloudChoice phone={state} onChoose={cloud.choose} />
      {opening && <Opening state={state} onDone={() => setOpening(false)} />}
    </div>
  );
}

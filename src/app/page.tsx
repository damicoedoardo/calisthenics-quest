'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TodayTab } from '@/components/TodayTab';
import { startsToday } from '@/lib/coach/week';
import { TrainTab } from '@/components/TrainTab';
import { HeroTab, type HeroPart } from '@/components/HeroTab';
import { PlayTab } from '@/components/PlayTab';
import { FriendsTab, type FriendsView } from '@/components/FriendsTab';
import { SharePage, useFeed } from '@/components/Feed';
import { workoutCard, type WorkoutCard } from '@/lib/feed';
import { YouPage } from '@/components/YouPage';
import { StorySoFar } from '@/components/StorySoFar';
import { FogRun, type RunStart } from '@/components/FogRun';
import { Hero } from '@/components/Hero';
import { Prologue } from '@/components/Prologue';
import { Opening, openingDue } from '@/components/Opening';
import { useMenuTrack } from '@/components/Sound';
import { Workout } from '@/components/Workout';
import { AfterSession } from '@/components/AfterSession';
import { useCoachPlan } from '@/components/useCoach';
import { ScenePlayer, type SceneResult } from '@/components/ScenePlayer';
import { giveSp, spAfterRun, spWorn } from '@/lib/sp';
import { changeClass, classCost, coins } from '@/lib/sweat';
import { ClassPicker } from '@/components/ClassPicker';
import { DevButton, DevPanel, type DevGo } from '@/components/DevPanel';
import { Sprite } from '@/components/Sprite';
import { LookProvider } from '@/components/Look';
import { useCloudSync } from '@/components/Cloud';
import { onlineCount, useFriends, useFriendsBeat } from '@/components/Friends';
import { CheerToast, useCheers } from '@/components/Cheers';
import { trainingLabel } from '@/lib/cheers';
import { SignInGate, signInDue } from '@/components/SignInGate';
import { PartyButton, PartyInviteCard, PartyLobby, usePartyPoll } from '@/components/Party';
import { others, startToJoin } from '@/lib/party';
import { partyMe, setLobbyOpen, usePartyView } from '@/lib/party-client';
import type { FriendCard } from '@/lib/friends';
import { cloudConfigured, maybeSignedIn, useCloudStatus } from '@/lib/cloud-client';
import { BringHero, InstallGate } from '@/components/InstallGate';
import { closeStaleDraft, finishSession, gearOf, isTap, todaysQuest, levelInfo, totalXp, type Checkin, type FinishResult } from '@/lib/game';
import { endedScene, putOff, scenesToPlay, storyState, waitingCount, type SceneMode, type StoryState } from '@/story/engine';
import { withTodayPage } from '@/story/daily';
import { heroVariant } from '@/story/flame';
import type { Scene } from '@/story/types';
import { inSandbox, offRecord, useGameState } from '@/lib/store';
import { recordRun, ROAD_ZONES, ZONES, zoneByCode, type Zone } from '@/lib/fog';
import { wonRoad } from '@/lib/road';
import { settleGear } from '@/lib/fog-gear';
import { skipIntro, useDevMode } from '@/lib/dev';
import { useAnalytics } from '@/lib/analytics-client';
import { mustInstall, needsCarry } from '@/lib/install';
import { useInstall } from '@/lib/install-client';
import { freshNudge } from '@/lib/coach/nudge';

type Tab = 'today' | 'train' | 'play' | 'friends' | 'hero';

// Each tab's pixel icon (src/sprites/characters/icons.ts): crossed swords, a dumbbell, a game pad, two friends, a shield.
const TABS: { id: Tab; label: string; icon: 'tabToday' | 'tabTrain' | 'tabPlay' | 'tabFriends' | 'tabHero' }[] = [
  { id: 'today', label: 'Today', icon: 'tabToday' },
  { id: 'train', label: 'Train', icon: 'tabTrain' },
  { id: 'play', label: 'Play', icon: 'tabPlay' },
  { id: 'friends', label: 'Friends', icon: 'tabFriends' },
  { id: 'hero', label: 'Hero', icon: 'tabHero' },
];

/** /lab/night's party run: two friends to fight beside. */
const LAB_FRIENDS: FriendCard[] = [
  { id: 'lab-a', name: 'Ana', class_id: 'archer', level: 6, look: { sex: 'f', gear: { weapon: 3, armor: 2, shield: 1 } }, trained_at: null, online: true, playing: null, seen_at: '' },
  { id: 'lab-b', name: 'Ben', class_id: 'mage', level: 4, look: { sex: 'm', hair: 'black', gear: { weapon: 2, armor: 1, shield: 0 } }, trained_at: null, online: true, playing: null, seen_at: '' },
];

/** The party start this phone last walked into, so a start is played once. */
const PLAYED_KEY = 'forma-party-played-v1';

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
  // The Hero tab's open part, kept here so the Fog's ready strip can open Hero > Gear.
  const [heroPart, setHeroPart] = useState<HeroPart>('gear');
  // The You page, opened by tapping your hero at the top.
  const [you, setYou] = useState(false);
  const [training, setTraining] = useState(false);
  const [after, setAfter] = useState<{ result: FinishResult; before: StoryState; after: StoryState; card: WorkoutCard } | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  // How the scene was opened: its moment came, or from Story so far (put off, or watched again).
  const [sceneMode, setSceneMode] = useState<SceneMode>('due');
  // Story so far (the Play tab): every scene reached, to watch again.
  const [storyOpen, setStoryOpen] = useState(false);
  // A short note after Later (and the first skip): where the scene waits.
  const [storyNote, setStoryNote] = useState<string | null>(null);
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
  // The cloud backup, when signed in. Never before the save has loaded, never in the sandbox or
  // on the developer save.
  useCloudSync(state, update, !ready || offRecord());
  // Shows you online to your friends while the app is open, in the Fog during a run, and
  // training during a workout (so they can cheer you on).
  useFriendsBeat(state, run?.name ?? null, training ? trainingLabel(state) : null, !ready || offRecord());
  // Your friends: the Friends tab, and how many are online on its tab button.
  const friends = useFriends(update, !ready || offRecord(), sandbox, tab === 'friends');
  const online = onlineCount(friends);
  // The Feed on the Friends tab: workouts you and your friends share.
  const [friendsView, setFriendsView] = useState<FriendsView>('friends');
  const feed = useFeed(!ready || offRecord(), sandbox, tab === 'friends' && friendsView === 'feed');
  // The workout just finished, to share with friends from the screen after it.
  const [sharing, setSharing] = useState<WorkoutCard | null>(null);
  // Cheers from friends: looked for every few seconds during a workout.
  const cheers = useCheers(!ready || offRecord(), training, sandbox);
  // After the install step, an account: a hard rule, no playing on without one (SignInGate).
  const { signedIn } = useCloudStatus();
  const [welcomed, setWelcomed] = useState(false);
  // Parties: kept fresh while signed in; a start the leader made opens the run here too.
  usePartyPoll(signedIn, !ready || offRecord());
  const { party } = usePartyView();
  const [partyRun, setPartyRun] = useState<{ seed: number; friends: FriendCard[] } | null>(null);
  useEffect(() => {
    if (!ready || jumped.current) return;
    jumped.current = true;
    if (!inSandbox()) return;
    setSandbox(true);
    const q = new URLSearchParams(window.location.search);
    const t = q.get('tab');
    if (t === 'today' || t === 'train' || t === 'play' || t === 'friends' || t === 'hero') setTab(t);
    const part = q.get('hero');
    if (part === 'gear' || part === 'stats' || part === 'class') setHeroPart(part);
    // The old jump to the Fog's Together: now the Friends tab.
    if (q.get('fog') === 'together') setTab('friends');
    // ?tab=friends&feed: the Feed, with two sample posts.
    if (q.has('feed')) setFriendsView('feed');
    if (q.has('you')) setYou(true);
    // ?run=road1: an Ember Road run (try it with &party).
    const zone = ZONES.find((z) => String(z.id) === q.get('run')) ?? ROAD_ZONES.find((z) => `road${z.road}` === q.get('run'));
    if (zone) {
      const at = q.get('at');
      setRunStart(at === 'mid' || at === 'boss' || at === 'win' || at === 'sp' || at === 'skills' ? at : undefined);
      // ?party: a practice party run with two made-up friends, to see it without a backend.
      if (q.has('party')) setPartyRun({ seed: 7, friends: LAB_FRIENDS });
      setRun(zone);
    }
    if (q.has('workout')) {
      update((s) => ({ ...s, draft: s.draft ?? { startedAt: new Date().toISOString(), checkin: 'normal', sets: {} } }));
      setTraining(true);
    }
    if (q.has('book')) setOpenBook(true);
    // ?dev: the developer panel open on top.
    if (q.has('dev')) setDevOpen(true);
  }, [ready, update]);
  // Before the first paint, so the tabs never flash ahead of it.
  useLayoutEffect(() => {
    if (!ready || !state.profile.onboarded) return;
    // The phone closed the app mid-workout: open straight back on it, still today's.
    if (closeStaleDraft(state, new Date()).draft?.open) {
      setTraining(true);
      return;
    }
    if (!inSandbox() && openingDue()) setOpening(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  // Anything that takes the screen (a scene, a run, a workout) closes the panel for good.
  const busy = !!(run || training || after || scene || picker);
  // After the prologue, a phone in a browser tab installs FORMA before playing on. Never in the
  // sandbox (unless ?gate= asks for the screen), never once installed or on a computer.
  const inst = useInstall();
  const gated = inst.known && !inst.standalone && !inst.skipped && mustInstall(inst.platform) && (inst.forced || !inSandbox());
  // The menus' music, on the tabs only: the opening, story, workouts and runs have their own.
  const askSignIn = !gated && !inSandbox() && signInDue(signedIn);
  useMenuTrack(ready && state.profile.onboarded && !opening && !replaying && !busy && !gated && !askSignIn);
  useEffect(() => {
    if (busy) setDevOpen(false);
  }, [busy]);
  useEffect(() => {
    if (busy || !party) return;
    let played: string | null = null;
    try {
      played = localStorage.getItem(PLAYED_KEY);
    } catch {
      // Storage blocked: a start may be offered twice, which is harmless.
    }
    const go = startToJoin(party, played, new Date());
    const zone = go && zoneByCode(go.zone);
    if (!go || !zone) return;
    try {
      localStorage.setItem(PLAYED_KEY, go.at);
    } catch {
      // As above.
    }
    setLobbyOpen(false);
    setPartyRun({ seed: go.seed, friends: others(party, partyMe() ?? '') });
    setRun(zone);
  }, [party, busy]);
  const { dev, allowed: devAllowed, on: devOn, setOn: setDevOn } = useDevMode();
  // Play stats for balancing and to see who comes back (off until PostHog is set up).
  useAnalytics(state, ready, signedIn, dev);
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
  const lvl = levelInfo(totalXp(state));
  const gear = gearOf(state);

  // Play the next story scene whenever the player is back on the main screen.
  useEffect(() => {
    if (!ready || !state.profile.onboarded || opening || replaying || training || after || scene || picker || run) return;
    const next = scenesToPlay(state, new Date())[0];
    if (next) {
      setSceneMode('due');
      setScene(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.profile.onboarded, state.sessions.length, state.road, opening, replaying, training, after, scene, picker, run]);

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
      const now = new Date();
      if (r.later) {
        // Not now: this scene and any other due at this moment wait in Story so far.
        const ids = sceneMode === 'due' ? [scene.id, ...scenesToPlay(state, now).map((x) => x.id)] : [scene.id];
        update((s) => putOff(s, ids, now));
        setStoryNote(ids.length > 1 ? 'These scenes wait for you in Play › Story so far.' : 'It waits for you in Play › Story so far.');
      } else {
        update((s) => {
          const next = {
            ...endedScene(s, scene.id, sceneMode, r, now),
            profile: r.flame ? { ...s.profile, flame: r.flame } : s.profile,
            answers: r.answer ? { ...s.answers, [r.answer.id]: r.answer.value } : s.answers,
            // The first skip says where skipped scenes go.
            skipNoteSeen: s.skipNoteSeen || !!r.skipped,
          };
          return r.sp ? giveSp(next, r.sp) : next;
        });
        if (r.skipped && !state.skipNoteSeen) setStoryNote('Skipped. Watch it any time in Play › Story so far.');
        if (r.pickClass) setPicker('story');
      }
      setScene(null);
      setSceneMode('due');
    },
    [scene, sceneMode, state, update],
  );

  useCoachPlan(state, update);

  // A workout starts on its own day, never ahead of it (one under way always carries on). `force`:
  // the developer menu's jump straight into a workout.
  const start = (checkin: Checkin, force = false) => {
    const going = !!state.draft && Object.values(state.draft.sets).some((l) => l.length > 0);
    if (!going && !force && !startsToday(state.coach, new Date())) return;
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
    // The post friends would see, from the workout as it was (its start and its one-tap parts).
    const taps = new Set(todaysQuest(state, state.draft?.checkin).filter(isTap).map((q) => q.id));
    const card = workoutCard(res.session, { title: trainingLabel(state), startedAt: state.draft?.startedAt, taps });
    update(() => res.state);
    setAfter({ result: res, before, after: storyState(res.state), card });
    setTraining(false);
    setTab('today');
  };

  // The dev panel's Go tab: a tab, a part of one, or a screen.
  const devGo = (to: DevGo) => {
    if (to === 'you') return setYou(true);
    if (to === 'workout') return start('normal', true);
    const hero = to === 'gear' || to === 'stats' || to === 'class';
    if (hero) setHeroPart(to);
    setTab(hero ? 'hero' : to === 'fog' ? 'play' : to === 'together' ? 'friends' : to);
    window.scrollTo({ top: 0 });
    main.current?.scrollTo({ top: 0 });
  };

  // Not signed in, a new player's opening first asks to sign in to a hero they already have, on
  // every open and wherever it was left (Edoardo 2026-10-28: played on the laptop, the phone made
  // him redo the opening). "Continue" or "New game" hides it until the app is opened again.
  const welcome = !welcomed && !replaying && !signedIn && !maybeSignedIn() && cloudConfigured && !inSandbox() && !offRecord();

  if (!ready) return <div className="min-h-dvh bg-ink-950" />;

  // A new player's opening pauses after the first dungeon for the install step; the installed app
  // picks it up at the class pick.
  if (!state.profile.onboarded && !replaying && state.profile.opening === 'class' && gated && !welcome)
    return (
      <InstallGate
        state={state}
        platform={inst.platform}
        canPrompt={inst.canPrompt}
        installed={inst.installed}
        onInstall={inst.install}
        onSkip={dev ? inst.skip : undefined}
        midway
      />
    );

  if (!state.profile.onboarded || replaying) {
    return (
      <Prologue
        // Back from the install step (or a hero brought over from Safari): start again where it paused.
        key={state.profile.opening ?? 'start'}
        state={state}
        onExit={replaying ? () => setReplaying(false) : undefined}
        onSkip={dev && !replaying ? () => update((s) => skipIntro(s, new Date())) : undefined}
        dev={dev}
        askLogin={welcome}
        onResume={() => setWelcomed(true)}
        onLook={(look) => update((s) => ({ ...s, profile: { ...s.profile, look } }))}
        onPause={({ voice }) => update((s) => ({ ...s, profile: { ...s.profile, voice, opening: 'class' } }))}
        onFinish={({ letter, voice, kit, name, classId }) => {
          update((s) => ({ ...s, profile: { ...s.profile, onboarded: true, opening: undefined, letter, voice, kit: kit ?? s.profile.kit, name: name ?? s.profile.name, classId: classId ?? s.profile.classId } }));
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

  if (askSignIn && !opening) return <SignInGate />;

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
        {devOn && (
          // The developer save: everything here stays off the real hero. Sideways, a small tag.
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-dashed border-sky-400/60 px-3 py-1.5 text-[11px] text-sky-300 land:order-last land:mb-0 land:shrink-0 land:px-2 land:py-1">
            <span className="land:hidden">Developer save: your hero is untouched</span>
            <span className="hidden land:inline">Dev save</span>
            <button onClick={() => setDevOn(false)} className="shrink-0 underline">
              Turn off
            </button>
          </div>
        )}
        <div className="flex items-center gap-3 land:min-w-0 land:flex-1">
          <button onClick={() => setYou(true)} aria-label="You: your letter, quest log and settings" className="grid h-12 w-12 place-items-center rounded-xl bg-ink-800 active:scale-95 land:hidden desk:hidden">
            <Hero gear={gear} classId={state.profile.classId} size={42} bounce={false} variant={heroVariant(state)} sp={spWorn(state)} />
          </button>
          <div className="min-w-0 flex-1 land:flex land:items-center land:gap-4">
            <div className="flex items-baseline justify-between land:shrink-0 land:items-center land:gap-4">
              <div className="flex items-center gap-2">
                <p className="font-pixel text-sm tracking-widest text-gold-400">
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
          <TodayTab state={state} update={update} onStart={start} onReplayOpening={() => setReplaying(true)} openBook={openBook}
            onTrain={() => setTab('train')}
            onHero={(part) => {
              setHeroPart(part);
              setTab('hero');
              window.scrollTo({ top: 0 });
              main.current?.scrollTo({ top: 0 });
            }}
          />
        ) : tab === 'train' ? (
          <TrainTab state={state} update={update} onStart={start} />
        ) : tab === 'play' ? (
          <PlayTab
            state={state}
            onPlay={setRun}
            onStory={() => setStoryOpen(true)}
            onGear={() => {
              setHeroPart('gear');
              setTab('hero');
              window.scrollTo({ top: 0 });
              main.current?.scrollTo({ top: 0 });
            }}
          />
        ) : tab === 'friends' ? (
          <FriendsTab state={state} update={update} friends={friends} feed={feed} view={friendsView} setView={setFriendsView} />
        ) : (
          <HeroTab state={state} update={update} onChangeClass={() => setPicker('manual')} part={heroPart} onPart={setHeroPart} />
        )}
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-ink-700 bg-ink-900/95 backdrop-blur land:right-auto land:top-0 land:flex land:w-[calc(4.5rem+env(safe-area-inset-left))] land:flex-col land:items-center land:justify-center land:gap-2 land:border-r land:border-t-0 land:pl-[env(safe-area-inset-left)] desk:right-auto desk:top-0 desk:flex desk:w-56 desk:flex-col desk:gap-6 desk:border-r desk:border-t-0 desk:px-3 desk:py-6">
        {/* Sideways, the hero from the header sits at the top of the rail; on a computer, bigger. */}
        <button onClick={() => setYou(true)} aria-label="You: your letter, quest log and settings" className="hidden h-10 w-10 place-items-center rounded-xl bg-ink-800 active:scale-95 land:grid desk:mx-auto desk:grid desk:h-28 desk:w-28">
          <span className="desk:hidden">
            <Hero gear={gear} classId={state.profile.classId} size={38} bounce={false} variant={heroVariant(state)} sp={spWorn(state)} />
          </span>
          <span className="hidden desk:block">
            <Hero gear={gear} classId={state.profile.classId} size={96} bounce={false} variant={heroVariant(state)} sp={spWorn(state)} />
          </span>
        </button>
        <div className="mx-auto grid max-w-md grid-cols-5 land:mx-0 land:w-full land:grid-cols-1 land:gap-1 desk:mx-0 desk:w-full desk:grid-cols-1 desk:gap-1">
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => {
                setTab(id);
                window.scrollTo({ top: 0 });
                main.current?.scrollTo({ top: 0 });
              }}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium land:mx-2 land:gap-0.5 land:rounded-xl land:py-1 desk:flex-row desk:gap-3 desk:rounded-xl desk:px-4 desk:py-3 desk:text-sm desk:hover:bg-ink-800/60 ${tab === id ? 'text-gold-400 land:bg-ink-800 land:ring-1 land:ring-gold-400/30 desk:bg-ink-800 desk:ring-1 desk:ring-gold-400/30' : 'text-slate-500 desk:hover:text-slate-300'}`}
            >
              {/* Full color on the open tab; faded and grey on the others. */}
              <span className="relative grid h-[22px] place-items-center">
                <Sprite id="uiIcon" opts={{ name: icon }} size={22} label="" className={tab === id ? '' : 'opacity-70 grayscale'} />
                {/* The flame has something to say. */}
                {id === 'train' && tab !== 'train' && state && freshNudge(state, new Date()) && <span aria-label="New from your flame" className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-gold-300 ring-2 ring-ink-900" />}
                {/* Story scenes put off or skipped wait in Story so far. */}
                {id === 'play' && waitingCount(state) > 0 && <span aria-label="Story scenes waiting" className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-gold-300 ring-2 ring-ink-900" />}
                {/* How many friends are online. */}
                {id === 'friends' && online === 0 && feed.fresh > 0 && <span aria-label="New in the feed" className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-orange-400 ring-2 ring-ink-900" />}
                {id === 'friends' && online > 0 && <span aria-label={`${online} online`} className="absolute -right-2.5 -top-1 min-w-[1rem] rounded-full bg-emerald-500 px-1 text-center font-mono text-[9px] font-bold leading-4 text-ink-950 ring-2 ring-ink-900">{online}</span>}
              </span>
              {label}
            </button>
          ))}
        </div>
      </nav>

      {dev && devOpen && !busy && (
        <DevPanel
          state={state}
          update={update}
          onPlayScene={setScene}
          onPlayOpening={() => setOpening(true)}
          onReplayPrologue={() => setReplaying(true)}
          onGo={devGo}
          onRun={(zone, at) => {
            setRunStart(at);
            setRun(ZONES[zone]);
          }}
          onTurnOff={devOn ? () => setDevOn(false) : undefined}
          onClose={() => setDevOpen(false)}
        />
      )}
      {run && (
        <FogRun
          state={state}
          zone={run}
          dev={dev}
          startAt={runStart}
          party={partyRun ?? undefined}
          // A run Together keeps its loot but never moves the story: only Story runs clear zones. An
          // Ember Road boss beaten together moves the road on.
          onEnd={(r) =>
            update((s) => {
              const moved = partyRun ? (run.road && r.won ? wonRoad(s, run.road, partyRun.friends.map((f) => f.name)) : s) : recordRun(s, r);
              return spAfterRun(settleGear(moved, r).state, r);
            })
          }
          onLeave={() => {
            setRun(null);
            setRunStart(undefined);
            setPartyRun(null);
          }}
        />
      )}
      {!busy && (
        <>
          <PartyInviteCard />
          <PartyButton />
          <PartyLobby state={state} />
        </>
      )}
      {training && <Workout state={state} update={update} onClose={() => setTraining(false)} onFinish={finish} />}
      <CheerToast cheer={cheers.cheer} friends={friends.list?.friends ?? []} onDone={cheers.next} />
      {after && (
        <AfterSession
          result={after.result}
          before={after.before}
          after={after.after}
          onClose={() => setAfter(null)}
          onShare={feed.shown && feed.signedIn ? () => setSharing(after.card) : undefined}
          onFelt={(felt, comment) => update((s) => ({ ...s, sessions: s.sessions.map((x) => (x.id === after.result.session.id ? { ...x, felt, ...(comment ? { comment } : {}) } : x)) }))}
        />
      )}
      {sharing && (
        <SharePage
          state={state}
          card={sharing}
          feed={feed}
          onClose={() => setSharing(null)}
          onShared={() => {
            setSharing(null);
            setAfter(null);
            setTab('friends');
            setFriendsView('feed');
          }}
        />
      )}
      {scene && <ScenePlayer key={scene.id} scene={scene} state={state} mode={sceneMode} onDone={endScene} />}
      {storyOpen && !busy && (
        <StorySoFar
          state={state}
          onPlay={(s, mode) => {
            setSceneMode(mode);
            setScene(s);
          }}
          onOpening={() => setReplaying(true)}
          onClose={() => setStoryOpen(false)}
        />
      )}
      {storyNote && !busy && <StoryNote text={storyNote} onClose={() => setStoryNote(null)} />}
      {picker && (
        <ClassPicker
          workouts={state.sessions.length}
          current={state.profile.classId}
          cost={classCost(state)}
          coins={coins(state)}
          onPick={(id) => {
            update((s) => changeClass(s, id));
            setPicker(null);
          }}
          onCancel={() => setPicker(null)}
        />
      )}
      {you && !busy && <YouPage state={state} update={update} onReplayOpening={() => setReplaying(true)} onClose={() => setYou(false)} devSwitch={devAllowed ? { on: devOn, set: setDevOn } : undefined} />}
      {opening && <Opening state={state} onDone={() => setOpening(false)} />}
    </div>
  );
}

/** Says where a scene put off or skipped waits; goes by itself after a few seconds, or on a tap. */
function StoryNote({ text, onClose }: { text: string; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(t);
    // A new note starts its own few seconds.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <button
      onClick={onClose}
      role="status"
      className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-sm animate-fadein rounded-xl bg-ink-800 px-4 py-3 text-left text-sm text-slate-200 shadow-lg ring-1 ring-gold-400/50 land:bottom-4"
    >
      {text}
    </button>
  );
}

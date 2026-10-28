'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, Coins, Compass, Copy, Download, Film, Gem, Music, Shield, Sparkles, Swords, Upload, User, X } from 'lucide-react';
import { Sprite } from './Sprite';
import { ItemTile } from './ItemCard';
import type { RunStart } from './FogRun';
import { initialState, type GameState } from '@/lib/game';
import { CLASSES } from '@/lib/gear';
import { pointsEarned, pointsFree, resetBuild, spendEvenly } from '@/lib/stats';
import { ZONES } from '@/lib/fog';
import { embersOf, matsOf } from '@/lib/forge';
import { coins } from '@/lib/sweat';
import { giveSp, spOwned, spWorn } from '@/lib/sp';
import { exportState, inSandbox, parseImport } from '@/lib/store';
import {
  addFakeWorkouts,
  emptyVault,
  emptyWallet,
  giveAllSp,
  giveCoins,
  giveEmbers,
  giveMaterials,
  giveSpAwake,
  giveStatPoints,
  jumpToChapter,
  lastWorkoutAgo,
  makeItem,
  newDayPage,
  resetFog,
  setBossesBeaten,
  setWornPlus,
  takeAllOff,
  takeSp,
  toVault,
  trainDaysInRow,
  wearNew,
  type ItemOrder,
} from '@/lib/dev';
import { ALL_SCENES, storyState } from '@/story/engine';
import { CHAPTERS } from '@/story/chapters';
import type { Scene } from '@/story/types';
import { MAT_IDS, MATS, MAX_PLUS } from '@/balance';
import { ITEM_SLOTS, nameOf, RARITY, SLOT_NAME, type Rarity } from '@/game/dungeon/items';
import { midBoss } from '@/game/dungeon/engine';
import { SP_NOS, spDef } from '@/game/dungeon/content';

/** Places in the app the Go tab opens. */
export type DevGo = 'today' | 'train' | 'fog' | 'together' | 'gear' | 'stats' | 'class' | 'you' | 'workout';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  /** Play any story scene now. */
  onPlayScene: (scene: Scene) => void;
  /** Play the app's opening again. */
  onPlayOpening: () => void;
  /** Play the prologue again (the fall, the letter). */
  onReplayPrologue: () => void;
  /** Open a tab or screen of the app. */
  onGo: (to: DevGo) => void;
  /** Start a Fog run on this save, at a spot. */
  onRun: (zone: number, at?: RunStart) => void;
  /** On the live app dev mode can be turned off again; previews always have it. */
  onTurnOff?: () => void;
  onClose: () => void;
}

/** The wrench that opens the panel. It sits in the header, so it never covers a button. */
export function DevButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="Developer mode"
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-sky-400/60 text-sky-300"
    >
      <Sprite id="uiIcon" opts={{ name: 'wrench' }} size={22} label="" />
    </button>
  );
}

const TABS = [
  { id: 'go', label: 'Go', icon: Compass },
  { id: 'wallet', label: 'Wallet', icon: Coins },
  { id: 'gear', label: 'Gear', icon: Gem },
  { id: 'hero', label: 'Hero', icon: User },
  { id: 'story', label: 'Story', icon: BookOpen },
  { id: 'fog', label: 'Fog', icon: Swords },
  { id: 'save', label: 'Save', icon: Shield },
] as const;
type DevTab = (typeof TABS)[number]['id'];

/** The open tab is remembered on this phone, so the panel opens where you left it. */
const TAB_KEY = 'forma-dev-tab';

const chip = 'rounded-lg bg-ink-700 px-3 py-2 text-sm text-slate-200 active:scale-95 disabled:opacity-40';
const on = 'bg-sky-500/30 text-sky-100 ring-1 ring-sky-400';

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-4 break-inside-avoid first:mt-0">
      <p className="text-xs text-slate-400">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  );
}

function Chips({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

/** A link to a lab page, or a button that opens a place in the app. */
function Row({ icon, label, note, href, onClick }: { icon: ReactNode; label: string; note?: string; href?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="shrink-0 text-sky-300">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-slate-200">{label}</span>
        {note && <span className="block text-[11px] text-slate-500">{note}</span>}
      </span>
    </>
  );
  const cls = 'flex w-full items-center gap-3 rounded-xl bg-ink-950 px-3 py-2.5 text-left active:scale-[.99]';
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

/** Developer mode: everything a developer needs, in tabs. Normal players never see it. */
export function DevPanel(props: Props) {
  const { onClose } = props;
  const [tab, setTab] = useState<DevTab>('go');
  useEffect(() => {
    try {
      const t = localStorage.getItem(TAB_KEY);
      if (TABS.some((x) => x.id === t)) setTab(t as DevTab);
    } catch {
      // Storage blocked: it opens on Go.
    }
  }, []);
  const pick = (t: DevTab) => {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      // Not remembered; fine.
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end bg-ink-950/70" onClick={() => onClose()}>
      {/* Held sideways: a wider sheet, the tab's sections in two columns. */}
      <div
        role="dialog"
        aria-label="Developer mode"
        className="safe-bottom mx-auto flex h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-ink-900 ring-1 ring-sky-400/30 [@media(orientation:landscape)_and_(max-height:600px)]:h-[94dvh] [@media(orientation:landscape)_and_(max-height:600px)]:max-w-3xl [@media(orientation:landscape)_and_(max-height:600px)]:pl-[max(env(safe-area-inset-left),0px)] [@media(orientation:landscape)_and_(max-height:600px)]:pr-[max(env(safe-area-inset-right),0px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="font-pixel text-[10px] text-sky-300">Developer mode{inSandbox() ? ' · sandbox' : ''}</p>
          <button aria-label="Close" onClick={() => onClose()} className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-slate-300">
            <X size={16} />
          </button>
        </div>
        <div role="tablist" className="mt-3 flex gap-1 overflow-x-auto border-b border-ink-700 px-3 pb-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => pick(id)}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] ${tab === id ? on : 'text-slate-400'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="[@media(orientation:landscape)_and_(max-height:600px)]:columns-2 [@media(orientation:landscape)_and_(max-height:600px)]:gap-6">
            {tab === 'go' ? (
              <GoPane {...props} />
            ) : tab === 'wallet' ? (
              <WalletPane {...props} />
            ) : tab === 'gear' ? (
              <GearPane {...props} />
            ) : tab === 'hero' ? (
              <HeroPane {...props} />
            ) : tab === 'story' ? (
              <StoryPane {...props} />
            ) : tab === 'fog' ? (
              <FogPane {...props} />
            ) : (
              <SavePane {...props} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoPane({ onGo, onClose }: Props) {
  const go = (to: DevGo) => {
    onClose();
    onGo(to);
  };
  const places: [DevGo, string][] = [
    ['today', 'Today'],
    ['train', 'Train'],
    ['fog', 'Fog: Story'],
    ['together', 'Fog: Together'],
    ['gear', 'Hero > Gear'],
    ['stats', 'Hero > Stats'],
    ['class', 'Hero > Class'],
    ['you', 'You page'],
    ['workout', 'A workout'],
  ];
  return (
    <>
      <Section title="In the app">
        <div className="grid grid-cols-3 gap-2">
          {places.map(([to, label]) => (
            <button key={to} onClick={() => go(to)} className={`${chip} px-1 text-xs`}>
              {label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Labs (made-up saves; yours is never touched)">
        <Row icon={<Sparkles size={16} />} label="What's new tonight" note="One tap to try each recent change, on a sandbox save" href="/lab/night" />
        <Row icon={<Film size={16} />} label="Story Lab" note="Any scene, any flame name and letter, every place" href="/lab/story" />
        <Row icon={<Sparkles size={16} />} label="Sprite Lab" note="Every sprite, item and look" href="/lab" />
        <Row icon={<Swords size={16} />} label="The sixteen SPs" note="Each class's four, boy and girl, idle, walk, attack" href="/lab/sp" />
        <Row icon={<Compass size={16} />} label="The world picker" note="The Play tab's worlds on made-up saves" href="/lab/worlds" />
        <Row icon={<Music size={16} />} label="Music Lab" note="Every theme and sting" href="/lab/music" />
      </Section>
    </>
  );
}

function WalletPane({ state, update }: Props) {
  const mats = matsOf(state);
  return (
    <>
      <Section title={`Embers: ${embersOf(state)}`}>
        <Chips>
          {[100, 1000, 10000].map((n) => (
            <button key={n} onClick={() => update((s) => giveEmbers(s, n))} className={chip}>
              + {n}
            </button>
          ))}
        </Chips>
      </Section>
      <Section title={`Sweat coins: ${coins(state)}`}>
        <Chips>
          {[1, 5, 20].map((n) => (
            <button key={n} onClick={() => update((s) => giveCoins(s, n))} className={chip}>
              + {n}
            </button>
          ))}
        </Chips>
      </Section>
      <Section title="Co-op materials">
        {MAT_IDS.map((id) => (
          <div key={id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-sm" style={{ color: MATS[id].color }}>
              {MATS[id].name}: {mats[id] ?? 0}
            </span>
            {[1, 10, 100].map((n) => (
              <button key={n} onClick={() => update((s) => giveMaterials(s, { [id]: n }))} className={`${chip} px-2 py-1.5 text-xs`}>
                +{n}
              </button>
            ))}
          </div>
        ))}
      </Section>
      <Section title="All at once">
        <Chips>
          <button
            onClick={() => update((s) => giveMaterials(giveCoins(giveEmbers(s, 10000), 50), Object.fromEntries(MAT_IDS.map((id) => [id, 500]))))}
            className={chip}
          >
            Rich: plenty of everything
          </button>
          <button onClick={() => update(emptyWallet)} className={chip}>
            Empty the wallet
          </button>
        </Chips>
      </Section>
    </>
  );
}

function GearPane({ state, update }: Props) {
  const [order, setOrder] = useState<ItemOrder>({ slot: 'weapon', rarity: 'legendary', plus: 0, zone: 0 });
  const [seed, setSeed] = useState(() => Date.now() % 2 ** 31);
  const [wornPlus, setWornPlus_] = useState(10);
  const item = useMemo(() => makeItem(state, order, seed), [state, order, seed]);
  const set = (o: Partial<ItemOrder>) => setOrder((x) => ({ ...x, ...o }));
  // A new id (and new rolls) for each item made, so two of them never share one.
  const made = (fn: (s: GameState) => GameState) => {
    update(fn);
    setSeed((x) => (x + 1) % 2 ** 31);
  };
  const g = state.fogGear;
  const worn = ITEM_SLOTS.map((slot) => g?.worn[slot]).filter((x) => !!x);

  return (
    <>
      <Section title="Make an item (for your class, wearable now)">
        <Chips>
          {ITEM_SLOTS.map((slot) => (
            <button key={slot} onClick={() => set({ slot })} className={`${chip} ${order.slot === slot ? on : ''}`}>
              {SLOT_NAME[slot]}
            </button>
          ))}
        </Chips>
        <Chips>
          {(Object.keys(RARITY) as Rarity[]).map((r) => (
            <button key={r} onClick={() => set({ rarity: r })} className={`${chip} ${order.rarity === r ? on : ''}`} style={{ color: RARITY[r].color }}>
              {RARITY[r].name}
            </button>
          ))}
        </Chips>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="shrink-0">Zone</span>
          {ZONES.map((z) => (
            <button key={z.id} onClick={() => set({ zone: z.id })} className={`${chip} px-2.5 py-1.5 text-xs ${order.zone === z.id ? on : ''}`}>
              {z.id + 1}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-xs text-slate-400">
          <span className="w-10 shrink-0">+{order.plus}</span>
          <input type="range" min={0} max={MAX_PLUS} value={order.plus} onChange={(e) => set({ plus: Number(e.target.value) })} className="flex-1" aria-label="Plus" />
        </label>
        <div className="flex items-center gap-3 rounded-xl bg-ink-950 p-2">
          <ItemTile item={item} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm" style={{ color: RARITY[item.rarity].color }}>
              {nameOf(item)}
            </p>
            <button onClick={() => setSeed((x) => (x + 1) % 2 ** 31)} className="text-[11px] text-sky-300 underline">
              Roll again
            </button>
          </div>
        </div>
        <Chips>
          <button onClick={() => made((s) => wearNew(s, item))} className={chip}>
            Wear it
          </button>
          <button onClick={() => made((s) => toVault(s, item))} className={chip}>
            To the vault
          </button>
        </Chips>
      </Section>
      <Section title={`Worn: ${worn.length ? worn.map((x) => nameOf(x!)).join(', ') : 'nothing'}`}>
        <label className="flex items-center gap-3 text-xs text-slate-400">
          <span className="w-10 shrink-0">+{wornPlus}</span>
          <input type="range" min={0} max={MAX_PLUS} value={wornPlus} onChange={(e) => setWornPlus_(Number(e.target.value))} className="flex-1" aria-label="Plus for what you wear" />
        </label>
        <Chips>
          <button onClick={() => update((s) => setWornPlus(s, wornPlus))} disabled={!worn.length} className={chip}>
            All worn to +{wornPlus}
          </button>
          <button onClick={() => update(takeAllOff)} disabled={!worn.length} className={chip}>
            Take all off
          </button>
        </Chips>
      </Section>
      <Section title={`Vault: ${g?.vault.length ?? 0} items`}>
        <Chips>
          <button onClick={() => update(emptyVault)} disabled={!g?.vault.length} className={chip}>
            Empty the vault
          </button>
        </Chips>
      </Section>
    </>
  );
}

function HeroPane({ state, update }: Props) {
  const cls = state.profile.classId;
  const owned = spOwned(state),
    worn = spWorn(state);
  return (
    <>
      <Section title="Class (free here, no coins)">
        <div className="grid grid-cols-4 gap-2">
          {CLASSES.map((c) => (
            <button
              key={c.id}
              onClick={() => update((s) => ({ ...s, profile: { ...s.profile, classId: c.id } }))}
              className={`rounded-lg py-2 text-xs ${cls === c.id ? on : 'bg-ink-700 text-slate-300'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </Section>
      <Section title={`SP: ${owned.length ? `${owned.length} owned, ${worn ? `wearing ${spDef(cls, worn).name}` : 'none worn'}` : state.sp ? 'the first one, still sealed' : 'none yet'}`}>
        <div className="grid grid-cols-2 gap-2">
          {SP_NOS.map((n) => (
            <button key={n} onClick={() => update((s) => giveSpAwake(s, n))} className={`${chip} px-2 text-xs ${worn === n ? on : ''}`}>
              {n}. {spDef(cls, n).name}
            </button>
          ))}
        </div>
        <Chips>
          <button onClick={() => update((s) => giveAllSp(s, worn || 1))} className={chip}>
            All four
          </button>
          <button onClick={() => update((s) => giveSp(takeSp(s), 1))} className={chip}>
            The first, sealed
          </button>
          <button onClick={() => update(takeSp)} disabled={!state.sp} className={chip}>
            None
          </button>
        </Chips>
      </Section>
      <Section title={`Stat points: ${pointsFree(state)} free of ${pointsEarned(state).total}${state.devPoints ? ` (${state.devPoints} given here)` : ''}`}>
        <Chips>
          {[1, 10, 50].map((n) => (
            <button key={n} onClick={() => update((s) => giveStatPoints(s, n))} className={chip}>
              + {n}
            </button>
          ))}
          <button onClick={() => update((s) => giveStatPoints(s, -(s.devPoints ?? 0)))} disabled={!state.devPoints} className={chip}>
            None given
          </button>
        </Chips>
        <Chips>
          <button onClick={() => update(spendEvenly)} disabled={pointsFree(state) === 0} className={chip}>
            Spread them evenly
          </button>
          <button onClick={() => update(resetBuild)} className={chip}>
            Take all back
          </button>
        </Chips>
      </Section>
    </>
  );
}

function StoryPane({ state, update, onPlayScene, onPlayOpening, onReplayPrologue, onClose }: Props) {
  const [sceneId, setSceneId] = useState(ALL_SCENES[0].scene.id);
  const [flame, setFlame] = useState(state.profile.flame ?? '');
  const [skipStory, setSkipStory] = useState(true);
  const story = storyState(state);
  const workouts = (n: number) => update((s) => addFakeWorkouts(s, n, new Date(), skipStory));

  return (
    <>
      <Section title={story.finished ? `The story is done · ${state.sessions.length} workouts` : `Chapter ${story.index + 1} of ${CHAPTERS.length}: ${story.chapter?.name} · ${story.heartsLeft} hearts left · ${state.sessions.length} workouts`}>
        <div className="grid grid-cols-7 gap-1.5">
          {CHAPTERS.map((c) => (
            <button key={c.n} onClick={() => update((s) => jumpToChapter(s, c.n, new Date(), skipStory))} className={`${chip} px-0 ${story.index + 1 === c.n ? on : ''}`}>
              {c.n}
            </button>
          ))}
          <button onClick={() => update((s) => jumpToChapter(s, CHAPTERS.length + 1, new Date(), skipStory))} className={`${chip} px-0 text-xs ${story.finished ? on : ''}`}>
            End
          </button>
        </div>
        <p className="text-[11px] text-slate-500">A chapter jump adds workouts, or takes the newest away, to stand where it starts.</p>
        <Chips>
          {[1, 5, 10].map((n) => (
            <button key={n} onClick={() => workouts(n)} className={chip}>
              + {n} workout{n > 1 ? 's' : ''}
            </button>
          ))}
          <button onClick={() => update((s) => ({ ...s, sessions: [], draft: null }))} className={chip}>
            Clear all
          </button>
        </Chips>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input type="checkbox" checked={skipStory} onChange={(e) => setSkipStory(e.target.checked)} />
          Skip the story scenes they unlock
        </label>
      </Section>
      <Section title="Scenes">
        <div className="flex gap-2">
          <select aria-label="Scene to play" value={sceneId} onChange={(e) => setSceneId(e.target.value)} className="min-w-0 flex-1 rounded-lg bg-ink-700 px-2 text-sm text-slate-200">
            {ALL_SCENES.map(({ scene, chapter }) => (
              <option key={scene.id} value={scene.id}>
                {chapter ? `${chapter} · ` : ''}
                {scene.id}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const s = ALL_SCENES.find((p) => p.scene.id === sceneId);
              if (!s) return;
              onClose();
              onPlayScene(s.scene);
            }}
            className={chip}
          >
            Play
          </button>
        </div>
        <Chips>
          <button
            onClick={() => {
              onClose();
              onReplayPrologue();
            }}
            className={chip}
          >
            The prologue
          </button>
          <button
            onClick={() => {
              onClose();
              onPlayOpening();
            }}
            className={chip}
          >
            The app opening
          </button>
        </Chips>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update((s) => ({ ...s, profile: { ...s.profile, flame: flame.trim() || undefined } }));
          }}
        >
          <input
            value={flame}
            maxLength={16}
            onChange={(e) => setFlame(e.target.value)}
            placeholder="Flame name"
            aria-label="Flame name"
            className="min-w-0 flex-1 rounded-lg bg-ink-700 px-3 text-sm text-slate-200 outline-none"
          />
          <button className={chip}>Name it</button>
        </form>
      </Section>
      <Section title="Days">
        <Chips>
          <button onClick={() => update((s) => lastWorkoutAgo(s, 1, new Date()))} className={chip}>
            Rest day today
          </button>
          <button onClick={() => update((s) => trainDaysInRow(s, 4, new Date()))} className={chip}>
            4 days in a row
          </button>
          <button onClick={() => update((s) => lastWorkoutAgo(s, 9, new Date()))} className={chip}>
            Away 9 days
          </button>
          <button onClick={() => update((s) => newDayPage(s, new Date()))} className={chip}>
            New day page
          </button>
        </Chips>
      </Section>
    </>
  );
}

function FogPane({ state, update, onRun, onClose }: Props) {
  const cleared = state.fog?.cleared ?? 0;
  const run = (zone: number, at?: RunStart) => {
    onClose();
    onRun(zone, at);
  };
  const spots: [RunStart | undefined, string][] = [
    [undefined, 'Start'],
    ['mid', 'Mid'],
    ['boss', 'Boss'],
    ['win', 'Recap'],
  ];
  return (
    <>
      <Section title={`Bosses beaten: ${cleared} of ${ZONES.length}`}>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: ZONES.length + 1 }, (_, n) => (
            <button key={n} onClick={() => update((s) => setBossesBeaten(s, n))} className={`${chip} px-0 ${cleared === n ? on : ''}`}>
              {n}
            </button>
          ))}
        </div>
        <Chips>
          <button onClick={() => update(resetFog)} className={chip}>
            Reset the Fog (records too)
          </button>
        </Chips>
      </Section>
      <Section title="Start a run here, on this save (any zone, open or not)">
        {ZONES.map((z) => (
          <div key={z.id} className="break-inside-avoid rounded-xl bg-ink-950 p-2.5">
            <p className="text-sm text-slate-100">
              {z.id + 1}. {z.name}
            </p>
            <p className="text-[11px] text-slate-500">
              Mid-boss: {midBoss(z).name} · Boss: {z.bossName}
            </p>
            <div className="mt-2 grid grid-cols-5 gap-1">
              {spots.map(([at, label]) => (
                <button key={label} onClick={() => run(z.id, at)} className={`${chip} px-0 py-1.5 text-[11px]`}>
                  {label}
                </button>
              ))}
              <button onClick={() => run(z.id, 'sp')} disabled={!spWorn(state)} className={`${chip} px-0 py-1.5 text-[11px]`} title="At the mid-boss with the SP's final full">
                SP
              </button>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-slate-500">Mid: the mid-boss. SP: there with your SP&apos;s final full. In a run, the pause menu has more: next floor, skip to the boss, win this run, the bot.</p>
      </Section>
    </>
  );
}

function SavePane({ state, update, onTurnOff, onClose }: Props) {
  const [msg, setMsg] = useState('');
  const [paste, setPaste] = useState('');
  const [load, setLoad] = useState(false);
  const [wipe, setWipe] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportState(state));
      setMsg('Save copied.');
    } catch {
      setMsg("Couldn't copy here; use Download.");
    }
  };
  const download = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `forma-dev-${new Date().toISOString().slice(0, 16).replace(':', '')}.json`;
    a.click();
    // Revoking right away can cancel the download on some phones.
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };
  const parsed = paste.trim() ? parseImport(paste) : null;

  return (
    <>
      <Section title={`This save: ${state.sessions.length} workouts${inSandbox() ? ' (the sandbox; your real save is untouched)' : ''}`}>
        <Chips>
          <button onClick={copy} className={`${chip} inline-flex items-center gap-1.5`}>
            <Copy size={14} /> Copy
          </button>
          <button onClick={download} className={`${chip} inline-flex items-center gap-1.5`}>
            <Download size={14} /> Download
          </button>
        </Chips>
        {msg && <p className="text-xs text-sky-300">{msg}</p>}
      </Section>
      <Section title="Load a save">
        <textarea
          value={paste}
          onChange={(e) => {
            setPaste(e.target.value);
            setLoad(false);
          }}
          placeholder="Paste a save here"
          aria-label="Save to load"
          rows={3}
          className="w-full rounded-lg bg-ink-700 p-2 font-mono text-[11px] text-slate-200 outline-none"
        />
        {paste.trim() && !parsed && <p className="text-xs text-red-300">That isn&apos;t a FORMA save.</p>}
        <button
          disabled={!parsed}
          onClick={() => {
            if (!parsed) return;
            if (!load) return setLoad(true);
            update(() => parsed);
            setPaste('');
            setLoad(false);
            setMsg('Save loaded.');
          }}
          className={`${chip} inline-flex items-center gap-1.5`}
        >
          <Upload size={14} /> {load ? `Tap again: replace this save (${parsed?.sessions.length} workouts)` : 'Load it'}
        </button>
      </Section>
      <Section title="Start over">
        <button
          onClick={() => {
            if (!wipe) return setWipe(true);
            update(() => initialState());
            setWipe(false);
            onClose();
          }}
          className="w-full rounded-lg bg-red-500/15 py-2.5 text-sm text-red-300"
        >
          {wipe ? 'Tap again to wipe this save' : 'Start over as a new player'}
        </button>
        {onTurnOff && (
          <button
            onClick={() => {
              onClose();
              onTurnOff();
            }}
            className="w-full py-2 text-xs text-slate-500"
          >
            Turn off developer mode
          </button>
        )}
      </Section>
    </>
  );
}

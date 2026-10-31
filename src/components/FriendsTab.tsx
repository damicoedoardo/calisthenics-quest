'use client';

import type { GameState } from '@/lib/game';
import { ROAD_BANNER, ROAD_CHAPTERS } from '@/story/road';
import { ROAD_LENGTH, roadAt, startRoad } from '@/lib/road';
import { FriendsCard, type Friends } from './Friends';
import { PixelTabs } from './PixelTabs';
import { Camp } from './Camp';
import { FeedView, type Feed } from './Feed';
import { useLand } from './useLand';
import { Sprite } from './Sprite';

type Update = (fn: (s: GameState) => GameState) => void;

/* The Friends tab: everything you do with other people. The camp (friends online by the fire,
   your party on four spots in front, `Camp`), every friend (online first, each with Cheer or Party;
   your code and Add fold behind one button), and the Ember Road. Runs
   together never move your own story, which is the Play tab's. */

export type FriendsView = 'friends' | 'feed';

export function FriendsTab({ state, update, friends, feed, view, setView }: { state: GameState; update: Update; friends: Friends; feed: Feed; view: FriendsView; setView: (v: FriendsView) => void }) {
  const land = useLand();
  return (
    <div className="space-y-4 land:space-y-3">
      {feed.shown && (
        <PixelTabs
          label="Friends or feed"
          className="mx-auto max-w-xs"
          tabs={[
            { id: 'friends', label: 'Friends' },
            { id: 'feed', label: 'Feed', dot: feed.fresh > 0 },
          ]}
          value={view}
          onChange={setView}
        />
      )}
      {view === 'feed' && feed.shown ? (
        <div className="mx-auto max-w-lg">
          <FeedView feed={feed} />
        </div>
      ) : (
        <FriendsLists state={state} update={update} friends={friends} land={land} />
      )}
    </div>
  );
}

function FriendsLists({ state, update, friends, land }: { state: GameState; update: Update; friends: Friends; land: boolean }) {
  return (
    <div className={land ? 'grid grid-cols-2 items-start gap-3' : 'space-y-4'}>
      <div className="space-y-4 land:space-y-3">
        <Camp state={state} friends={friends} />
        {!land && <FriendsCard state={state} update={update} friends={friends} />}
        <RoadCard state={state} update={update} />
      </div>
      {land && (
        <div className="space-y-4">
          <FriendsCard state={state} update={update} friends={friends} />
        </div>
      )}
      {friends.demo && <p className="px-1 text-[11px] text-slate-500 land:col-span-2">Sandbox: sample friends. Your real friends show on your own save, signed in.</p>}
    </div>
  );
}

/** The Ember Road, the story walked with friends: set out, then each chapter, its boss and what it
    waits for (src/lib/road.ts). Its scenes play on their own, like the main story's. */
function RoadCard({ state, update }: { state: GameState; update: Update }) {
  const at = roadAt(state);
  const plural = (n: number) => `${n} workout${n === 1 ? '' : 's'}`;
  return (
    <section className="self-start rounded-2xl bg-ink-800 p-4 pixel-border">
      <h2 className="flex items-center gap-2 font-pixel text-[10px] text-orange-300">
        <Sprite id="uiIcon" opts={{ name: 'flame' }} size={14} label="" /> The Ember Road
      </h2>
      {!at.started ? (
        <>
          <p className="mt-2 text-xs text-slate-300">
            A story for your party: three chapters, each ending in a boss you beat together.
          </p>
          <button onClick={() => update(startRoad)} className="mt-3 w-full rounded-xl bg-orange-400 py-3 font-pixel text-[9px] text-ink-950 shadow-[0_3px_0_#c2410c] active:translate-y-0.5 active:shadow-none">
            Set out on the road
          </button>
        </>
      ) : (
        <ol className="mt-2 space-y-2">
          {ROAD_CHAPTERS.map((c) => {
            const won = at.beaten >= c.n,
              here = !won && at.open >= c.n;
            return (
              <li key={c.n} className={`flex gap-2 text-xs ${won || here ? 'text-slate-200' : 'text-slate-500'}`}>
                <span className="mt-0.5 shrink-0"><Sprite id="uiIcon" opts={{ name: won ? 'check' : here ? 'tabToday' : 'lock' }} size={14} label="" /></span>
                <span>
                  <span className="font-semibold">
                    {c.n}. {c.name}
                  </span>
                  {won ? (
                    <> · you keep {c.fog.keepsake.name}</>
                  ) : here ? (
                    <> · beat {c.fog.bossName}: pick {c.fog.name} in the lobby</>
                  ) : at.open === c.n - 1 && at.beaten >= at.open && at.nextIn > 0 ? (
                    <> · opens in {plural(at.nextIn)}</>
                  ) : (
                    <> · after {ROAD_CHAPTERS[c.n - 2].fog.bossName}</>
                  )}
                </span>
              </li>
            );
          })}
          <li className={`flex gap-2 text-xs ${at.done ? 'text-gold-300' : 'text-slate-500'}`}>
            <span className="mt-0.5 shrink-0"><Sprite id="uiIcon" opts={{ name: at.done ? 'check' : 'lock' }} size={14} label="" /></span>
            <span>
              <span className="font-semibold">The Hearth at the Road&apos;s End</span>
              {at.done ? (
                <> · you keep {ROAD_BANNER.name}</>
              ) : at.beaten >= ROAD_LENGTH ? (
                <> · {at.nextIn > 0 ? `in ${plural(at.nextIn)}` : 'waiting for you'}</>
              ) : null}
            </span>
          </li>
        </ol>
      )}
      {at.done && <RoadBanner state={state} />}
    </section>
  );
}

/** The Road Banner, kept at the road's end: your name and every friend who beat a road boss with you. */
function RoadBanner({ state }: { state: GameState }) {
  const names = [state.profile.name || 'You', ...(state.road?.walked ?? [])];
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl bg-ink-900/60 p-3 ring-1 ring-gold-400/30">
      <Sprite id="roadBanner" size={56} />
      <div className="min-w-0">
        <p className="font-pixel text-[10px] text-gold-300">{ROAD_BANNER.name}</p>
        <p className="mt-1 text-[11px] text-slate-400">{ROAD_BANNER.text}</p>
        <p className="mt-1.5 text-xs text-orange-200">{names.join(' · ')}</p>
      </div>
    </div>
  );
}


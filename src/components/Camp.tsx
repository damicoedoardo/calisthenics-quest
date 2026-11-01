'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { gearOf } from '@/lib/game';
import { getClass } from '@/lib/gear';
import { statusOf, type FriendCard } from '@/lib/friends';
import { inviteToParty, setLobbyOpen, usePartyView } from '@/lib/party-client';
import { heroVariant } from '@/story/flame';
import { spWorn } from '@/lib/sp';
import { Hero } from './Hero';
import { PlaceBackdrop } from './Place';
import { Sprite } from './Sprite';
import { CheerPage, Doing, FriendHero, type Friends } from './Friends';
import { openProfile } from './Profile';

/* The camp at the top of the Friends tab: a night camp with its fire. Friends who are online stand
   at the back (a bubble says if they train or fight; tap one to cheer them on or ask them into your
   party), and your party stands in front on four spots, you on the first. A free spot is a "+":
   tap it (or anyone in the party) for the party's lobby. A still picture, not a place to walk. */

/** How many friends stand at the camp; the rest are in the list under it. */
const AT_CAMP = 4;
/** Where the friends at the back stand, as a share of the width: around the fire (it burns on the left of the picture). */
const BACK = [0.1, 0.45, 0.65, 0.85];

export function Camp({ state, friends }: { state: GameState; friends: Friends }) {
  const { party } = usePartyView();
  const online = (friends.list?.friends ?? []).filter((f) => f.online || f.playing).slice(0, AT_CAMP);
  const [picked, setPicked] = useState<FriendCard | null>(null);
  const [cheering, setCheering] = useState<FriendCard | null>(null);
  const members = party?.members ?? [];
  const spots = Array.from({ length: 4 }, (_, i) => (party ? members[i] ?? null : i === 0 ? 'me' : null));

  const invite = async (f: FriendCard) => {
    setPicked(null);
    try {
      await inviteToParty(f.id);
      setLobbyOpen(true);
    } catch (e) {
      friends.setMsg(e instanceof Error ? e.message : "Couldn't invite them right now.");
    }
  };

  return (
    <section className="relative h-64 overflow-hidden rounded-2xl pixel-border land:h-full land:min-h-[15rem]" aria-label="The camp">
      <div aria-hidden className="absolute inset-0">
        <PlaceBackdrop id="ashlands-camp" className="h-full w-full" />
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950/90 to-transparent" />

      <p className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-ink-950/70 px-2 py-1 font-pixel text-[8px] text-slate-200">
        <span className="h-2 w-2 bg-emerald-400" aria-hidden />
        {online.length ? `${(friends.list?.friends ?? []).filter((f) => f.online || f.playing).length} online` : 'Nobody online'}
      </p>

      {/* Friends online, at the back of the fire. */}
      {online.map((f, i) => (
        <button
          key={f.id}
          onClick={() => setPicked(picked?.id === f.id ? null : f)}
          aria-label={`${f.name || 'A hero'}, ${statusOf(f, friends.now)}`}
          className="absolute bottom-[38%] flex -translate-x-1/2 flex-col items-center active:scale-95"
          style={{ left: `${BACK[i] * 100}%` }}
        >
          <span className="relative">
            <FriendHero f={f} size={48} />
            <Doing f={f} />
          </span>
          <span className={`-mt-1 max-w-[4.5rem] truncate rounded bg-ink-950/80 px-1 font-pixel text-[7px] leading-relaxed ${picked?.id === f.id ? 'text-gold-300' : 'text-slate-200'}`}>{f.name || 'Hero'}</span>
        </button>
      ))}

      {/* Your party, in front: four spots, you on the first. */}
      <div className="absolute inset-x-3 bottom-2 grid grid-cols-4 gap-2">
        {spots.map((m, i) => (
          <button
            key={i}
            onClick={() => setLobbyOpen(true)}
            aria-label={m === null ? 'A free spot: start a party or invite a friend' : m === 'me' ? 'You: start a party' : `${m.name || 'A hero'}, in your party`}
            className="flex flex-col items-center active:scale-95"
          >
            <span className="relative flex h-14 items-end justify-center">
              {m === 'me' ? (
                <Hero gear={gearOf(state)} classId={state.profile.classId} size={56} bounce={false} variant={heroVariant(state)} sp={spWorn(state)} />
              ) : m ? (
                <FriendHero f={m} size={56} />
              ) : (
                <span className="mb-2 grid h-9 w-9 place-items-center rounded-lg border-2 border-dashed border-slate-500/70 bg-ink-950/50">
                  <Sprite id="uiIcon" opts={{ name: 'addFriend' }} size={14} label="" />
                </span>
              )}
            </span>
            {/* The spot itself: a flat stone in the firelight. */}
            <span aria-hidden className={`-mt-1 h-2 w-12 rounded-[50%] ${m ? 'bg-orange-300/30' : 'bg-ink-950/60'}`} />
          </button>
        ))}
      </div>
      <p className="pointer-events-none absolute bottom-[4.9rem] right-3 rounded bg-ink-950/70 px-1.5 py-0.5 font-pixel text-[7px] text-gold-300">
        {party ? `Your party · ${members.length}/4` : 'Tap + for a party'}
      </p>

      {/* A friend tapped: what you can do with them. */}
      {picked && (
        <div className="absolute inset-x-3 top-12 z-10 flex items-center gap-2 rounded-xl bg-ink-900/95 p-2 pixel-border">
          {/* Their name opens their profile. */}
          <button
            onClick={() => {
              openProfile(picked);
              setPicked(null);
            }}
            aria-label={`${picked.name || 'A hero'}'s profile`}
            className="min-w-0 flex-1 text-left"
          >
            <p className="flex items-center gap-1 truncate font-pixel text-[9px] text-gold-300">
              {picked.name || 'A hero'} <ChevronRight size={12} className="shrink-0 text-slate-400" aria-hidden />
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-400">
              {getClass(picked.class_id ?? undefined)?.name ?? 'Hero'} · Lv {picked.level} · {statusOf(picked, friends.now)}
            </p>
          </button>
          {picked.training ? (
            <button
              onClick={() => {
                setCheering(picked);
                setPicked(null);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-orange-400 px-2.5 py-2 font-pixel text-[8px] text-ink-950 shadow-[0_3px_0_#c2410c] active:translate-y-0.5 active:shadow-none"
            >
              <Sprite id="uiIcon" opts={{ name: 'cheer' }} size={12} label="" /> Cheer
            </button>
          ) : (
            <button
              onClick={() => invite(picked)}
              className="flex items-center gap-1.5 rounded-lg bg-gold-400 px-2.5 py-2 font-pixel text-[8px] text-ink-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 active:shadow-none"
            >
              <Sprite id="uiIcon" opts={{ name: 'tabToday' }} size={12} label="" /> Party
            </button>
          )}
          <button onClick={() => setPicked(null)} aria-label="Close" className="p-1.5">
            <Sprite id="uiIcon" opts={{ name: 'close' }} size={12} label="" />
          </button>
        </div>
      )}

      {cheering && (
        <CheerPage
          f={cheering}
          demo={friends.demo}
          onClose={() => setCheering(null)}
          done={(m) => {
            friends.setMsg(m);
            setCheering(null);
          }}
        />
      )}
    </section>
  );
}

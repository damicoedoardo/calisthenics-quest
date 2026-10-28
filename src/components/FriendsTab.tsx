'use client';

import { BookLock, Check, Flame, Lock, Shield, Sparkles, Swords, Users } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { statusOf, type FriendCard } from '@/lib/friends';
import { ROAD_BANNER, ROAD_CHAPTERS } from '@/story/road';
import { ROAD_LENGTH, roadAt, startRoad } from '@/lib/road';
import { inviteToParty, setLobbyOpen, usePartyView } from '@/lib/party-client';
import { FriendHero, FriendsCard, type Friends } from './Friends';
import { useLand } from './useLand';

type Update = (fn: (s: GameState) => GameState) => void;

/* The Friends tab: everything you do with other people. Who is online now (tap one to ask them
   into your party), your party, the Ember Road, and every friend with your friend code. Runs
   together never move your own story, which is the Play tab's. */

/** Together's rules, short: who plays, what carries over, what it never touches, what drops only here. */
const TOGETHER_FACTS: { icon: typeof Users; text: string; blue?: boolean }[] = [
  { icon: Users, text: 'Up to 4, online' },
  { icon: Shield, text: 'Same hero and gear' },
  { icon: BookLock, text: 'Your story stays put' },
  { icon: Sparkles, text: '+6 materials drop here', blue: true },
];

/** Friends online now, or in the Fog, as heroes in a row: tap one to invite them to your party. */
function OnlineNow({ friends }: { friends: Friends }) {
  const online = (friends.list?.friends ?? []).filter((f) => f.online || f.playing);
  const invite = async (f: FriendCard) => {
    try {
      await inviteToParty(f.id);
      setLobbyOpen(true);
    } catch (e) {
      friends.setMsg(e instanceof Error ? e.message : "Couldn't invite them right now.");
    }
  };
  return (
    <section className="rounded-2xl bg-ink-800 p-3">
      <h2 className="flex items-center gap-2 font-pixel text-[9px] text-emerald-300">
        <span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden /> Online <span className="text-slate-500">{online.length}</span>
      </h2>
      {online.length ? (
        <ul className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {online.map((f) => (
            <li key={f.id} className="shrink-0">
              <button onClick={() => invite(f)} aria-label={`${f.name || 'A hero'}, ${statusOf(f, friends.now)}. Invite to your party`} className="flex w-[5.5rem] flex-col items-center rounded-xl bg-ink-900 px-1 pb-2 pt-1 active:scale-95">
                <span className="relative">
                  <FriendHero f={f} size={56} />
                  <span className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-ink-900 ${f.playing ? 'bg-gold-300' : 'bg-emerald-400'}`} aria-hidden />
                </span>
                <span className="mt-0.5 w-full truncate text-center text-xs font-semibold text-slate-100">{f.name || 'A hero'}</span>
                <span className={`w-full truncate text-center text-[10px] ${f.playing ? 'text-gold-300' : 'text-emerald-300'}`}>{f.playing ? 'In the Fog' : 'Online'}</span>
                <span className="mt-1 flex items-center gap-1 rounded-md bg-ink-700 px-1.5 py-0.5 text-[10px] text-slate-200">
                  <Swords size={11} aria-hidden /> Invite
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500">Nobody online right now.</p>
      )}
    </section>
  );
}

/** Your party: back to its lobby, or start one; the rules of playing together, short. */
function PartyCard() {
  const { party } = usePartyView();
  return (
    <section className="rounded-2xl bg-ink-800 p-3">
      <button
        onClick={() => setLobbyOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 active:shadow-none"
      >
        <Swords size={15} /> {party ? `Back to your party · ${party.members.length}` : 'Start a party'}
      </button>
      <ul className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px] leading-snug">
        {TOGETHER_FACTS.map((f) => (
          <li key={f.text} className={`flex items-center gap-2 rounded-lg bg-ink-900 px-2 py-1.5 ${f.blue ? 'text-sky-300' : 'text-slate-300'}`}>
            <f.icon size={14} className="shrink-0" aria-hidden /> {f.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FriendsTab({ state, update, friends }: { state: GameState; update: Update; friends: Friends }) {
  const land = useLand();
  return (
    <div className={land ? 'grid grid-cols-2 items-start gap-3' : 'space-y-4'}>
      <div className="space-y-4 land:space-y-3">
        <OnlineNow friends={friends} />
        <PartyCard />
        <RoadCard state={state} update={update} />
      </div>
      <div className="space-y-4">
        <FriendsCard state={state} update={update} friends={friends} />
        {friends.demo && <p className="px-1 text-[11px] text-slate-500">Sandbox: sample friends. Your real friends show on your own save, signed in.</p>}
      </div>
    </div>
  );
}

/** The Ember Road, the story walked with friends: set out, then each chapter, its boss and what it
    waits for (src/lib/road.ts). Its scenes play on their own, like the main story's. */
function RoadCard({ state, update }: { state: GameState; update: Update }) {
  const at = roadAt(state);
  const plural = (n: number) => `${n} workout${n === 1 ? '' : 's'}`;
  return (
    <section className="self-start rounded-2xl bg-ink-800 p-4 ring-1 ring-orange-500/30">
      <p className="flex items-center gap-2 font-pixel text-[10px] text-orange-300">
        <Flame size={14} /> The Ember Road
      </p>
      {!at.started ? (
        <>
          <p className="mt-2 text-xs text-slate-300">
            A story for your party: three chapters and a finale, about two months. Each ends in a boss you beat together.
          </p>
          <button onClick={() => update(startRoad)} className="mt-3 w-full rounded-xl bg-orange-400 py-2.5 text-sm font-semibold text-ink-950">
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
                <span className="mt-0.5 shrink-0">{won ? <Check size={14} className="text-emerald-400" /> : here ? <Swords size={14} className="text-orange-300" /> : <Lock size={14} />}</span>
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
            <span className="mt-0.5 shrink-0">{at.done ? <Check size={14} className="text-gold-300" /> : <Lock size={14} />}</span>
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
    </section>
  );
}


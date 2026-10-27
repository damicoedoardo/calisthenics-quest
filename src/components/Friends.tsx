'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Flame, Gift as GiftIcon, Share2, Swords, UserPlus, Users, X } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { getClass, makeGear, type GearSlot } from '@/lib/gear';
import { codeInUrl, friendTrainedToday, inviteLink, myCard, showCode, statusOf, type FriendCard, type FriendsList } from '@/lib/friends';
import { acceptFriend, addFriend, claimGifts, getFriends, giveGift, removeFriend, sendCard } from '@/lib/friends-client';
import { inviteToParty, setLobbyOpen } from '@/lib/party-client';
import { giveMats, matsOf, takeGifts } from '@/lib/forge';
import { GIFTS, MAT_IDS, MATS, type MatId } from '@/balance';
import { cloudConfigured, useCloudStatus } from '@/lib/cloud-client';
import { normalizeLook } from '@/sprites/characters/hero';
import type { Look } from '@/sprites/engine/figure';
import { Hero } from './Hero';

/* Friends on screen: the heartbeat that shows you online to your friends (useFriendsBeat, in
   page.tsx) and the Friends card on the Hero tab. Rules and types in lib/friends.ts. */

/** How often the app says "still here" while it is open; the server counts 75 s as online. */
const BEAT_MS = 30_000;
/** How often the open card refreshes your friends. */
const REFRESH_MS = 20_000;
/** An invite link opened before sign-in waits here until you're signed in. */
const INVITE_KEY = 'forma-friend-invite-v1';

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

/** While signed in and the app is open: send your card now, every BEAT_MS, and when a run starts or ends. */
export function useFriendsBeat(state: GameState, playing: string | null, off: boolean) {
  const { signedIn } = useCloudStatus();
  const latest = useRef(state);
  latest.current = state;

  // An invite link (?friend=CODE): keep the code and tidy the address bar.
  useEffect(() => {
    const code = codeInUrl(window.location.href);
    if (!code) return;
    try {
      localStorage.setItem(INVITE_KEY, code);
    } catch {
      // Storage blocked: the code can still be typed by hand.
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('friend');
    window.history.replaceState(null, '', url.toString());
  }, []);

  useEffect(() => {
    if (off || !cloudConfigured || !signedIn) return;
    const beat = () => {
      if (visible()) void sendCard(myCard(latest.current, playing)).catch(() => {});
    };
    beat();
    const t = window.setInterval(beat, BEAT_MS);
    document.addEventListener('visibilitychange', beat);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', beat);
    };
  }, [off, signedIn, playing]);
}

function takeInvite(): string | null {
  try {
    const code = localStorage.getItem(INVITE_KEY);
    localStorage.removeItem(INVITE_KEY);
    return code;
  } catch {
    return null;
  }
}

/** A friend's hero, small, in their own look and gear. */
export function FriendHero({ f, size = 44 }: { f: FriendCard; size?: number }) {
  const cls = f.class_id ?? undefined;
  const tiers = f.look?.gear ?? {};
  const gear = Object.fromEntries((['weapon', 'armor', 'shield'] as GearSlot[]).map((s) => [s, makeGear(s, tiers[s] ?? (s === 'shield' ? 0 : 1), cls)])) as Record<GearSlot, ReturnType<typeof makeGear>>;
  return <Hero gear={gear} classId={cls} size={size} bounce={false} look={normalizeLook((f.look ?? undefined) as Partial<Look> | undefined)} />;
}

export function Row({ f, now, children, as: Tag = 'li' }: { f: FriendCard; now: Date; children?: React.ReactNode; as?: 'li' | 'div' }) {
  const cls = getClass(f.class_id ?? undefined);
  const dot = f.playing ? 'bg-gold-300' : f.online ? 'bg-emerald-400' : 'bg-slate-600';
  return (
    <Tag className="flex items-center gap-3 py-2">
      <div className="relative shrink-0">
        <FriendHero f={f} />
        <span className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-ink-800 ${dot}`} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-100">
          {f.name || 'A hero'}
          {friendTrainedToday(f, now) && (
            <span className="flex items-center gap-0.5 text-[10px] font-normal text-orange-300">
              <Flame size={12} /> trained today
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">
          {cls ? `${cls.name}, level ${f.level}` : `Level ${f.level}`} · {statusOf(f, now)}
        </p>
      </div>
      {children}
    </Tag>
  );
}

type Update = (fn: (s: GameState) => GameState) => void;

/** Give a friend co-op materials for Mira's forge: pick one you have and how many (up to
    GIFTS.perDay a day each friend). */
function GiveMats({ f, state, update, done }: { f: FriendCard; state: GameState; update: Update; done: (msg: string) => void }) {
  const have = matsOf(state),
    mine = MAT_IDS.filter((id) => (have[id] ?? 0) > 0);
  const [mat, setMat] = useState<MatId | null>(mine[0] ?? null);
  const [n, setN] = useState(1);
  if (!mat) return <p className="pb-2 text-[11px] text-slate-500">You have no forge materials to give yet. They drop when you play with friends.</p>;
  const most = Math.min(have[mat] ?? 0, GIFTS.perDay);
  return (
    <div className="mb-2 space-y-2 rounded-xl bg-ink-900/60 p-2.5">
      <div className="flex flex-wrap gap-1.5">
        {mine.map((id) => (
          <button key={id} onClick={() => { setMat(id); setN(1); }} className={`rounded-lg px-2 py-1 text-[11px] ${id === mat ? 'bg-ink-600 text-slate-100' : 'bg-ink-800 text-slate-400'}`} style={id === mat ? { boxShadow: `0 0 0 1px ${MATS[id].color}` } : undefined}>
            <span style={{ color: MATS[id].color }}>{MATS[id].name}</span> {have[id]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button aria-label="One less" onClick={() => setN(Math.max(1, n - 1))} className="rounded-lg bg-ink-700 px-2.5 py-1 text-sm">−</button>
        <span className="w-6 text-center font-mono text-sm">{n}</span>
        <button aria-label="One more" onClick={() => setN(Math.min(most, n + 1))} className="rounded-lg bg-ink-700 px-2.5 py-1 text-sm">+</button>
        <button
          onClick={async () => {
            try {
              const r = await giveGift(f.id, mat, n);
              update((s) => giveMats(s, mat, n));
              done(`Gave ${f.name || 'them'} ${n} ${MATS[mat].name.toLowerCase()}. ${r.left_today ? `You can give them ${r.left_today} more today.` : "That's all for today."}`);
            } catch (e) {
              done(e instanceof Error ? e.message : "Couldn't give it right now.");
            }
          }}
          className="ml-auto flex items-center gap-1 rounded-lg bg-gold-400 px-3 py-1.5 text-xs font-semibold text-ink-950"
        >
          <GiftIcon size={13} /> Give
        </button>
      </div>
    </div>
  );
}

/** Hero tab: your friend code, adding friends, and who is online, in the Fog, or trained today.
    Friends can invite each other to a party and give each other forge materials. */
export function FriendsCard({ state, update, sandbox }: { state: GameState; update: Update; sandbox: boolean }) {
  const [giving, setGiving] = useState<string | null>(null);
  const { signedIn } = useCloudStatus();
  const [list, setList] = useState<FriendsList | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [now, setNow] = useState(() => new Date());
  const on = cloudConfigured && !sandbox && signedIn;

  const refresh = useCallback(async () => {
    try {
      setList(await getFriends());
      setNow(new Date());
      // What friends gave you comes home with each refresh.
      {
        const { gifts } = await claimGifts();
        if (gifts.length) {
          update((s) => takeGifts(s, gifts));
          const who = [...new Set(gifts.map((g) => g.from_name || 'A friend'))].join(' and ');
          setMsg(`${who} gave you ${gifts.map((g) => `${g.n} ${(MATS[g.mat as MatId]?.name ?? g.mat).toLowerCase()}`).join(', ')} for Mira's forge.`);
        }
      }
    } catch {
      // Offline or a hiccup: keep what's on screen, try again on the next refresh.
    }
  }, []);

  const add = useCallback(
    async (c: string) => {
      try {
        const r = await addFriend(c);
        setMsg(r.status === 'friends' ? `You and ${r.name || 'your friend'} are friends now.` : `Asked ${r.name || 'them'}. They'll see it next time they open FORMA.`);
        setCode('');
        await refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Couldn't add them right now.");
      }
    },
    [refresh],
  );

  useEffect(() => {
    if (!on) return;
    void refresh();
    const invite = takeInvite();
    if (invite) void add(invite);
    const t = window.setInterval(() => visible() && void refresh(), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [on, refresh, add]);

  if (!cloudConfigured || sandbox) return null;

  return (
    <section className="rounded-2xl bg-ink-800 p-4">
      <h2 className="flex items-center gap-2 font-pixel text-[10px] text-gold-300">
        <Users size={14} /> Friends
      </h2>
      {!signedIn ? (
        <p className="mt-2 text-xs text-slate-400">Sign in (in Settings, below) to add friends and see when they train and play.</p>
      ) : !list ? (
        <p className="mt-2 text-xs text-slate-500">Loading…</p>
      ) : (
        <div className="mt-3 space-y-3">
          {/* Heroes from before the name step: asked here once, kept in the save. */}
          {!state.profile.name && (
            <form
              className="space-y-2 rounded-xl bg-ink-900/60 p-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const n = name.trim();
                if (!n) return;
                update((s) => ({ ...s, profile: { ...s.profile, name: n } }));
                try {
                  await sendCard({ name: n });
                  await refresh();
                } catch {
                  setMsg("Couldn't save your name right now.");
                }
              }}
            >
              <p className="text-xs text-slate-300">What should your friends call you?</p>
              <div className="flex gap-2">
                <input
                  value={name}
                  maxLength={24}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  aria-label="Your name for friends"
                  className="min-w-0 flex-1 rounded-xl bg-ink-900 px-3 text-sm text-slate-100 placeholder:text-slate-500"
                />
                <button type="submit" className="rounded-xl bg-ink-600 px-3 py-2.5 text-sm font-semibold">
                  Save
                </button>
              </div>
            </form>
          )}

          <div className="flex items-center justify-between gap-2 rounded-xl bg-ink-900/60 p-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Your friend code</p>
              <p className="font-mono text-lg font-semibold tracking-widest text-gold-300">{showCode(list.me.code)}</p>
            </div>
            <button
              onClick={async () => {
                const link = inviteLink(window.location.origin, list.me.code);
                const text = `Train with me in FORMA. My friend code is ${showCode(list.me.code)}.`;
                try {
                  if (navigator.share) await navigator.share({ title: 'FORMA', text, url: link });
                  else {
                    await navigator.clipboard.writeText(`${text} ${link}`);
                    setMsg('Invite link copied.');
                  }
                } catch {
                  // Closed the share sheet, or the clipboard is blocked: the code is on screen.
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-ink-600 px-3 py-2.5 text-sm font-semibold"
            >
              <Share2 size={15} /> Invite
            </button>
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) void add(code.trim());
            }}
          >
            <input
              value={code}
              maxLength={12}
              onChange={(e) => setCode(e.target.value)}
              placeholder="A friend's code"
              aria-label="A friend's code"
              autoCapitalize="characters"
              className="min-w-0 flex-1 rounded-xl bg-ink-900 px-3 font-mono text-sm uppercase text-slate-100 placeholder:font-sans placeholder:normal-case placeholder:text-slate-500"
            />
            <button type="submit" className="flex items-center gap-1 rounded-xl bg-ink-600 px-3 py-2.5 text-sm font-semibold">
              <UserPlus size={15} /> Add
            </button>
          </form>
          {msg && <p className="text-xs text-sky-300">{msg}</p>}

          {list.asks_in.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Want to be friends</p>
              <ul className="divide-y divide-ink-700">
                {list.asks_in.map((f) => (
                  <Row key={f.id} f={f} now={now}>
                    <button aria-label={`Accept ${f.name}`} onClick={async () => { await acceptFriend(f.id).catch(() => {}); await refresh(); }} className="rounded-lg bg-emerald-700 p-2">
                      <Check size={16} />
                    </button>
                    <button aria-label={`Decline ${f.name}`} onClick={async () => { await removeFriend(f.id).catch(() => {}); await refresh(); }} className="rounded-lg bg-ink-600 p-2">
                      <X size={16} />
                    </button>
                  </Row>
                ))}
              </ul>
            </div>
          )}

          {list.friends.length > 0 ? (
            <ul className="divide-y divide-ink-700">
              {list.friends.map((f) => (
                <li key={f.id}>
                  <Row as="div" f={f} now={now}>
                    <button
                      aria-label={`Invite ${f.name || 'them'} to your party`}
                      onClick={async () => {
                        try {
                          await inviteToParty(f.id);
                          setLobbyOpen(true);
                        } catch (e) {
                          setMsg(e instanceof Error ? e.message : "Couldn't invite them right now.");
                        }
                      }}
                      className="flex items-center gap-1 rounded-lg bg-ink-600 px-2.5 py-2 text-xs font-semibold"
                    >
                      <Swords size={14} /> Party
                    </button>
                    <button aria-label={`Give ${f.name || 'them'} forge materials`} onClick={() => setGiving(giving === f.id ? null : f.id)} className={`rounded-lg p-2 ${giving === f.id ? 'bg-gold-400 text-ink-950' : 'bg-ink-600 text-gold-200'}`}>
                      <GiftIcon size={16} />
                    </button>
                  </Row>
                  {giving === f.id && (
                    <GiveMats
                      f={f}
                      state={state}
                      update={update}
                      done={(m) => {
                        setMsg(m);
                        setGiving(null);
                      }}
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No friends yet. Send your code to someone you'd like to train with.</p>
          )}

          {list.asks_out.length > 0 && (
            <p className="text-xs text-slate-500">Waiting for {list.asks_out.map((f) => f.name || 'a hero').join(', ')} to say yes.</p>
          )}
        </div>
      )}
    </section>
  );
}

'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Camera, MapPin, Trash2, X } from 'lucide-react';
import { getClass } from '@/lib/gear';
import { friendTrainedToday, PROFILE_LIMIT, statsNow, statusOf, type FriendCard, type Profile } from '@/lib/friends';
import { WEEKLY_GOAL, type GameState } from '@/lib/game';
import { inviteToParty, setLobbyOpen } from '@/lib/party-client';
import { profilePhotoUrl, saveProfile, savePhoto } from '@/lib/friends-client';
import { cleanLine } from '@/lib/feed';
import { shrinkPhoto } from '@/lib/feed-client';
import { CheerPage, Doing, FriendHero, GiveMats, type Friends } from './Friends';
import { PostCard, type Feed } from './Feed';
import { Sprite } from './Sprite';
import { useModal } from './useModal';

/* Profiles: what a player tells friends about themselves, all optional: a photo, where they live,
   a line about them, and how they train (sent from the save). You fill yours in on the You page (`ProfileEdit`); a friend's opens when you
   tap them in the camp, the friends list or the feed (`ProfilePage`). Only accepted friends see a
   profile (backend/app/routes/friends.py). */

/** A player's photo, square. `version` is the profile's `photo` (when it changed); a "data:" link
    is shown as it is (a photo just picked, or a sample in the sandbox). */
export function ProfilePhoto({ id, version, size, className = '' }: { id: string; version: string; size: number; className?: string }) {
  const direct = version.startsWith('data:');
  const [src, setSrc] = useState<string | null>(direct ? version : null);
  useEffect(() => {
    if (direct) return setSrc(version);
    let live = true;
    profilePhotoUrl(id, version)
      .then((u) => live && setSrc(u))
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
  }, [id, version, direct]);
  return (
    <span className={`block shrink-0 overflow-hidden rounded-2xl bg-ink-700 ${className}`} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a blob link, not a page asset */}
      {src && <img src={src} alt="" width={size} height={size} className="h-full w-full object-cover" />}
    </span>
  );
}

/* One profile open at a time, from anywhere (the camp, the friends list, a feed post): they call
   `openProfile`, and `ProfileHost` (in the Friends tab) shows it with what it needs. */
let openNow: FriendCard | null = null;
const listeners = new Set<() => void>();
export function openProfile(f: FriendCard | null) {
  openNow = f;
  listeners.forEach((l) => l());
}
function useOpenProfile() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => openNow,
    () => null,
  );
}

type Update = (fn: (s: GameState) => GameState) => void;

/** Shows the open profile, with the actions and posts it needs. */
export function ProfileHost({ state, update, friends, feed }: { state: GameState; update: Update; friends: Friends; feed: Feed }) {
  const f = useOpenProfile();
  // Closes when you leave the tab.
  useEffect(() => () => openProfile(null), []);
  if (!f) return null;
  // The freshest copy of them, if the list has it.
  const fresh = friends.list?.friends.find((x) => x.id === f.id) ?? f;
  return <ProfilePage f={fresh} now={friends.now} state={state} update={update} friends={friends} feed={feed} onClose={() => openProfile(null)} />;
}

/** How many of their posts the profile shows. */
const POSTS_SHOWN = 3;

/** A friend's profile: their photo (or their hero, big), name, class and level, what they are
    doing, where they live and their line, how they train, what you can do with them (cheer while
    they train, else party; give forge materials), and their latest posts. */
export function ProfilePage({ f, now, state, update, friends, feed, onClose }: { f: FriendCard; now: Date; state: GameState; update: Update; friends: Friends; feed: Feed; onClose: () => void }) {
  const box = useModal<HTMLDivElement>(onClose);
  const [cheering, setCheering] = useState(false);
  const [giving, setGiving] = useState(false);
  const [msg, setMsg] = useState('');
  const cls = getClass(f.class_id ?? undefined);
  const name = f.name || 'A hero';
  const stats = f.stats ? statsNow(f.stats, now) : null;
  const posts = (feed.posts ?? []).filter((p) => p.author.id === f.id).slice(0, POSTS_SHOWN);

  const party = async () => {
    try {
      if (!friends.demo) await inviteToParty(f.id);
      onClose();
      setLobbyOpen(true);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't invite them right now.");
    }
  };

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label={name} className="safe-top safe-bottom fixed inset-0 z-50 !mt-0 overflow-y-auto bg-ink-950 text-left outline-none">
      <div className="mx-auto max-w-md px-4 pb-8">
        <header className="flex items-center justify-between py-2">
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-lg bg-ink-800">
            <X size={18} />
          </button>
          <span className="w-10" />
        </header>

        <div className="mt-2 flex flex-col items-center text-center">
          {f.photo ? (
            <div className="relative">
              <ProfilePhoto id={f.id} version={f.photo} size={160} className="pixel-border" />
              {/* Their hero stands at the photo's corner. */}
              <span className="absolute -bottom-3 -right-8">
                <FriendHero f={f} size={72} />
              </span>
            </div>
          ) : (
            <div className="relative">
              <FriendHero f={f} size={128} />
              <Doing f={f} />
            </div>
          )}
          <div className="mt-5 flex items-center gap-1.5 font-pixel text-xs text-gold-300">
            {name}
            {friendTrainedToday(f, now) && <Sprite id="uiIcon" opts={{ name: 'flame' }} size={13} label="Trained today" />}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {cls ? `${cls.name} · ` : ''}Lv {f.level}
            {f.place && (
              <>
                {' · '}
                <MapPin size={12} className="-mt-0.5 inline text-gold-300" aria-label="Lives in" /> {f.place}
              </>
            )}
          </p>
          <p className={`mt-1 text-xs ${f.training ? 'text-orange-300' : f.playing ? 'text-gold-300' : f.online ? 'text-emerald-300' : 'text-slate-500'}`}>{statusOf(f, now)}</p>
          {f.about && <p className="mt-3 whitespace-pre-line text-sm text-slate-300">{f.about}</p>}
        </div>

        {/* What you can do with them: the same buttons as their row in the list. */}
        <div className="mt-5 flex gap-2">
          {f.training ? (
            <button onClick={() => setCheering(true)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-400 py-3 font-pixel text-[9px] text-ink-950 shadow-[0_3px_0_#c2410c] active:translate-y-0.5 active:shadow-none">
              <Sprite id="uiIcon" opts={{ name: 'cheer' }} size={14} label="" /> Cheer
            </button>
          ) : (
            <button onClick={() => void party()} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-400 py-3 font-pixel text-[9px] text-ink-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 active:shadow-none">
              <Sprite id="uiIcon" opts={{ name: 'tabToday' }} size={14} label="" /> Party
            </button>
          )}
          <button onClick={() => setGiving(!giving)} aria-expanded={giving} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-3 font-pixel text-[9px] shadow-[0_3px_0_#1c2033] active:translate-y-0.5 active:shadow-none ${giving ? 'bg-ink-600 text-slate-100' : 'bg-ink-700 text-slate-200'}`}>
            <Sprite id="uiIcon" opts={{ name: 'gift' }} size={14} label="" /> Gift
          </button>
        </div>
        {giving && (
          <div className="mt-2">
            <GiveMats
              f={f}
              state={state}
              update={update}
              done={(m) => {
                setMsg(m);
                setGiving(false);
              }}
            />
          </div>
        )}
        {msg && <p className="mt-2 text-xs text-sky-300">{msg}</p>}

        {/* How they train, from their save. */}
        {stats && (
          <section className="mt-4 rounded-2xl bg-ink-800 p-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Count label="Workouts" value={stats.workouts} />
              <Count label="This week" value={`${Math.min(stats.week, WEEKLY_GOAL)}/${WEEKLY_GOAL}`} />
              <Count label="Streak" value={stats.streak ? `${stats.streak} wk` : '-'} />
            </div>
            {stats.top.length > 0 && (
              <p className="mt-3 border-t border-ink-700 pt-3 text-xs text-slate-400">
                Does most: <span className="text-slate-200">{stats.top.join(', ')}</span>
              </p>
            )}
          </section>
        )}

        {posts.length > 0 && (
          <section className="mt-4 space-y-3">
            <h2 className="font-pixel text-[10px] text-gold-300">Latest posts</h2>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} feed={feed} now={now} />
            ))}
          </section>
        )}
      </div>

      {cheering && (
        <CheerPage
          f={f}
          demo={friends.demo}
          onClose={() => setCheering(false)}
          done={(m) => {
            setMsg(m);
            setCheering(false);
          }}
        />
      )}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="font-pixel text-sm text-slate-100">{value}</p>
      <p className="mt-1 font-pixel text-[7px] uppercase leading-relaxed text-slate-500">{label}</p>
    </div>
  );
}

/** Your profile on the You page: a photo, where you live and a line, each one optional. Only your
    friends see it. Needs sign-in, like friends. */
export function ProfileEdit({ friends }: { friends: Friends }) {
  const me = friends.list?.me;
  // What the server has (or, in the sandbox, what was saved on this screen).
  const [saved, setSaved] = useState<Profile | null>(null);
  const has: Profile = saved ?? { place: me?.place ?? '', about: me?.about ?? '', photo: me?.photo ?? null };
  const [place, setPlace] = useState(has.place);
  const [about, setAbout] = useState(has.about);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  // The list can arrive after the page opens: fill the boxes once it does.
  const loaded = !!me;
  useEffect(() => {
    if (!loaded || saved) return;
    setPlace(me?.place ?? '');
    setAbout(me?.about ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  if (!friends.shown) return null;
  if (!friends.signedIn)
    return (
      <section className="rounded-2xl bg-ink-800 p-4">
        <h2 className="font-pixel text-[10px] text-gold-300">Your profile</h2>
        <p className="mt-2 text-xs text-slate-400">Sign in (Your save, below) to add a photo and a few words for your friends.</p>
      </section>
    );

  const changed = cleanLine(place, PROFILE_LIMIT.place) !== has.place || cleanLine(about, PROFILE_LIMIT.about) !== has.about;

  const run = async (job: () => Promise<Profile>, done: string) => {
    setBusy(true);
    setMsg('');
    try {
      const p = await job();
      setSaved(p);
      setMsg(done);
      if (!friends.demo) void friends.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Couldn't save it right now.");
    } finally {
      setBusy(false);
    }
  };

  const pick = (file: File | undefined) => {
    if (!file) return;
    void run(async () => {
      const { base64, preview } = await shrinkPhoto(file, { edge: PROFILE_LIMIT.photoEdge, bytes: PROFILE_LIMIT.photoBytes, square: true });
      if (friends.demo) return { ...has, photo: preview };
      const p = await savePhoto(base64);
      // Show the picked photo at once; the server's copy is the same picture.
      return { ...p, photo: p.photo ? preview : null };
    }, 'Photo saved.');
  };

  const words = () =>
    run(async () => {
      const next = { place: cleanLine(place, PROFILE_LIMIT.place), about: cleanLine(about, PROFILE_LIMIT.about) };
      setPlace(next.place);
      setAbout(next.about);
      if (friends.demo) return { ...has, ...next };
      return { ...(await saveProfile(next.place, next.about)), photo: has.photo };
    }, 'Saved.');

  return (
    <section className="rounded-2xl bg-ink-800 p-4">
      <h2 className="font-pixel text-[10px] text-gold-300">Your profile</h2>
      <p className="mt-1 text-xs text-slate-500">Only your friends see it. Leave out anything you like.</p>
      <div className="mt-3 flex items-center gap-3">
        <label className="relative cursor-pointer" aria-label={has.photo ? 'Change your photo' : 'Add a photo'}>
          {has.photo ? (
            <ProfilePhoto id={me?.id ?? 'me'} version={has.photo} size={72} />
          ) : (
            <span className="grid h-[72px] w-[72px] place-items-center rounded-2xl border-2 border-dashed border-ink-600 text-slate-500">
              <Camera size={22} />
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-slate-300">{has.photo ? 'Tap the photo to change it.' : 'Add a photo'}</span>
          {has.photo && (
            <button disabled={busy} onClick={() => void run(async () => (friends.demo ? { ...has, photo: null } : savePhoto(null)), 'Photo removed.')} className="flex items-center gap-1.5 self-start text-xs text-slate-500">
              <Trash2 size={13} /> Remove
            </button>
          )}
        </div>
      </div>
      <form
        className="mt-3 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed && !busy) void words();
        }}
      >
        <label className="flex items-center gap-2 rounded-xl bg-ink-900 px-3">
          <MapPin size={15} className="shrink-0 text-slate-500" aria-hidden />
          <span className="sr-only">Where you live</span>
          <input value={place} maxLength={PROFILE_LIMIT.place} onChange={(e) => setPlace(e.target.value)} placeholder="Where you live" className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none" />
        </label>
        <label className="block">
          <span className="sr-only">A few words about you</span>
          <textarea value={about} rows={2} maxLength={PROFILE_LIMIT.about} onChange={(e) => setAbout(e.target.value)} placeholder="A few words about you" className="w-full resize-none rounded-xl bg-ink-900 px-3 py-2.5 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none" />
        </label>
        {changed && (
          <button type="submit" disabled={busy} className="w-full rounded-xl bg-gold-400 py-2.5 text-sm font-semibold text-ink-950 disabled:opacity-40">
            Save
          </button>
        )}
      </form>
      {msg && <p className="mt-2 text-xs text-sky-300">{msg}</p>}
    </section>
  );
}

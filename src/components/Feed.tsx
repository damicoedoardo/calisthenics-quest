'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Flame, ImagePlus, MessageCircle, Megaphone, Send, Trash2, X } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { gearOf } from '@/lib/game';
import { ago, myCard, type FriendCard } from '@/lib/friends';
import { FEED_LIMIT, cleanLine, newPosts, workoutLine, type Post, type WorkoutCard } from '@/lib/feed';
import { commentPost, deleteComment, deletePost, flamePost, getFeed, photoUrl, sharePost, shrinkPhoto } from '@/lib/feed-client';
import { cloudConfigured, useCloudStatus } from '@/lib/cloud-client';
import { spWorn } from '@/lib/sp';
import { heroVariant } from '@/story/flame';
import { FriendHero } from './Friends';
import { ProfilePage } from './Profile';
import { Hero } from './Hero';
import { useModal } from './useModal';

/* The feed on screen: finished workouts you and your friends share (Feed on the Friends tab), and
   the page to share one after a workout (SharePage). Rules and types in lib/feed.ts. */

/** How often the open feed refreshes, and how often the dot on its button looks otherwise. */
const OPEN_MS = 30_000;
const SHUT_MS = 120_000;
/** When you last opened the feed, for the dot on its button. */
const SEEN_KEY = 'forma-feed-seen-v1';

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

/** Two sample posts for the sandbox (/lab/night), so the feed can be seen without signing in. */
function demoPosts(): Post[] {
  const now = Date.now();
  const card = (id: string, name: string, class_id: FriendCard['class_id'], look: FriendCard['look']): FriendCard => ({ id, name, class_id, level: 8, look, trained_at: null, online: true, playing: null, seen_at: new Date(now).toISOString() });
  return [
    {
      id: 'demo-1',
      author: card('demo-a', 'Ana', 'archer', { sex: 'f', gear: { weapon: 3, armor: 2, shield: 1 } }),
      at: new Date(now - 40 * 60_000).toISOString(),
      workout: { title: 'Pull day', minutes: 42, sets: 14, exercises: ['Pull-up', 'Barbell row', 'Face pull', 'Plank'], mini: false },
      text: 'First time 5 pull-ups in a row!',
      photo: false,
      cheered_by: ['Ben'],
      flames: 2,
      flamed: false,
      comments: [{ id: 'c1', author: 'demo-b', name: 'Ben', text: 'Beast. Next week 6.', at: new Date(now - 20 * 60_000).toISOString(), mine: false }],
      mine: false,
    },
    {
      id: 'demo-2',
      author: card('demo-b', 'Ben', 'mage', { sex: 'm', hair: 'black', gear: { weapon: 2, armor: 1, shield: 0 } }),
      at: new Date(now - 26 * 3600_000).toISOString(),
      workout: { title: 'Legs', minutes: 35, sets: 12, exercises: ['Barbell squat', 'Lunge', 'Calf raise'], mini: false },
      text: '',
      photo: false,
      cheered_by: [],
      flames: 1,
      flamed: true,
      comments: [],
      mine: false,
    },
  ];
}

/** The feed, kept fresh while signed in: every OPEN_MS while `open`, every SHUT_MS otherwise (for
    the dot on the Feed button). `off`: a save that never reaches friends; `demo`: the sandbox. */
export function useFeed(off: boolean, demo: boolean, open: boolean) {
  const { signedIn } = useCloudStatus();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [more, setMore] = useState(false);
  const [seen, setSeen] = useState<string | null>(null);
  // Photos this phone already has (just shared, or the sandbox): shown without asking the server.
  const local = useRef(new Map<string, string>());
  const on = cloudConfigured && !off && signedIn;

  useEffect(() => setSeen(readSeen()), []);
  useEffect(() => {
    if (demo) setPosts((p) => p ?? demoPosts());
  }, [demo]);

  const refresh = useCallback(async () => {
    if (!visible()) return;
    try {
      const r = await getFeed();
      setPosts(r.posts);
      setMore(r.more);
    } catch {
      // Offline or a hiccup: keep what's on screen.
    }
  }, []);

  useEffect(() => {
    if (!on || demo) return;
    void refresh();
    const t = window.setInterval(() => void refresh(), open ? OPEN_MS : SHUT_MS);
    return () => window.clearInterval(t);
  }, [on, demo, open, refresh]);

  // Opened: everything on it counts as seen.
  useEffect(() => {
    if (!open || !posts) return;
    const at = new Date().toISOString();
    setSeen(at);
    try {
      localStorage.setItem(SEEN_KEY, at);
    } catch {
      // Storage blocked: the dot just shows again next time.
    }
  }, [open, posts]);

  const loadMore = useCallback(async () => {
    const last = posts?.at(-1);
    if (!last) return;
    try {
      const r = await getFeed(last.at);
      setPosts((p) => [...(p ?? []), ...r.posts.filter((x) => !p?.some((y) => y.id === x.id))]);
      setMore(r.more);
    } catch {
      // Try again with the button.
    }
  }, [posts]);

  const put = useCallback((p: Post) => setPosts((list) => (list?.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...(list ?? [])])), []);
  const drop = useCallback((id: string) => setPosts((list) => list?.filter((x) => x.id !== id) ?? null), []);

  return { posts, more, loadMore, refresh, put, drop, local: local.current, demo, shown: demo || (cloudConfigured && !off), signedIn: demo || signedIn, fresh: open ? 0 : newPosts(posts ?? [], seen) };
}

export type Feed = ReturnType<typeof useFeed>;

/** The Feed: every shared workout, yours and your friends', newest first. */
export function FeedView({ feed }: { feed: Feed }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  if (!feed.signedIn) return <p className="rounded-2xl bg-ink-800 p-4 text-xs text-slate-400">Sign in (tap your hero at the top, then Settings) to see your friends&apos; workouts.</p>;
  if (!feed.posts) return <p className="px-1 text-xs text-slate-500">Loading…</p>;
  if (!feed.posts.length)
    return (
      <section className="rounded-2xl bg-ink-800 p-4 text-center">
        <Camera size={22} className="mx-auto text-slate-500" />
        <p className="mt-2 text-sm text-slate-300">Nothing shared yet.</p>
        <p className="mt-1 text-xs text-slate-500">Finish a workout and tap Share with friends. Your friends&apos; workouts show here too.</p>
      </section>
    );
  return (
    <div className="space-y-3">
      {feed.posts.map((p) => (
        <PostCard key={p.id} post={p} feed={feed} now={now} />
      ))}
      {feed.more && (
        <button onClick={() => void feed.loadMore()} className="w-full rounded-xl bg-ink-800 py-2.5 text-xs font-semibold text-slate-300">
          Older posts
        </button>
      )}
    </div>
  );
}

const isCard = (a: Post['author']): a is FriendCard => 'look' in a;

/** One shared workout: who, when, the workout, their line and photo, flames and comments. */
function PostCard({ post, feed, now }: { post: Post; feed: Feed; now: Date }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState(false);
  const name = post.author.name || 'A hero';
  const author = isCard(post.author) ? post.author : null;

  const flame = async () => {
    const on = !post.flamed;
    // Shown at once; the server's count comes back after.
    feed.put({ ...post, flamed: on, flames: post.flames + (on ? 1 : -1) });
    if (feed.demo) return;
    try {
      const r = await flamePost(post.id);
      feed.put({ ...post, flamed: r.flamed, flames: r.flames });
    } catch {
      feed.put(post);
    }
  };

  const comment = async () => {
    const line = cleanLine(text, FEED_LIMIT.comment);
    if (!line || busy) return;
    setBusy(true);
    setError('');
    try {
      if (feed.demo) feed.put({ ...post, comments: [...post.comments, { id: `c${Date.now()}`, author: 'me', name: 'You', text: line, at: new Date().toISOString(), mine: true }] });
      else feed.put(await commentPost(post.id, line));
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send it right now.");
    } finally {
      setBusy(false);
    }
  };

  const unsay = async (id: string) => {
    feed.put({ ...post, comments: post.comments.filter((c) => c.id !== id) });
    if (!feed.demo) await deleteComment(id).catch(() => feed.put(post));
  };

  const remove = async () => {
    try {
      if (!feed.demo) await deletePost(post.id);
      feed.drop(post.id);
    } catch {
      setError("Couldn't delete it right now.");
      setSure(false);
    }
  };

  return (
    <article className="rounded-2xl bg-ink-800 p-3.5">
      <header className="flex items-center gap-3">
        {/* A friend's hero and name open their profile. */}
        <button disabled={!author || post.mine} onClick={() => setViewing(true)} aria-label={post.mine ? undefined : `${name}'s profile`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="shrink-0">{author ? <FriendHero f={author} size={40} /> : <span className="block h-10 w-10" />}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-100">{post.mine ? 'You' : name}</span>
            <span className="block text-[11px] text-slate-500">{ago(new Date(post.at), now)}</span>
          </span>
        </button>
        {viewing && author && <ProfilePage f={author} now={now} onClose={() => setViewing(false)} />}
        {post.mine &&
          (sure ? (
            <span className="flex items-center gap-1.5 text-xs">
              <button onClick={() => void remove()} className="rounded-lg bg-rose-700 px-2.5 py-1.5 font-semibold">
                Delete
              </button>
              <button onClick={() => setSure(false)} className="rounded-lg bg-ink-600 px-2.5 py-1.5">
                Keep
              </button>
            </span>
          ) : (
            <button aria-label="Delete this post" onClick={() => setSure(true)} className="rounded-lg p-2 text-slate-500">
              <Trash2 size={15} />
            </button>
          ))}
      </header>

      <div className="mt-3 rounded-xl bg-ink-900/70 p-3">
        <p className="font-pixel text-[10px] text-gold-300">{post.workout.title}</p>
        <p className="mt-1 text-xs text-slate-400">{workoutLine(post.workout)}</p>
        {post.workout.exercises.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1">
            {post.workout.exercises.map((x, i) => (
              <li key={i} className="rounded-md bg-ink-700 px-1.5 py-0.5 text-[11px] text-slate-300">
                {x}
              </li>
            ))}
          </ul>
        )}
      </div>

      {post.text && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-100">{post.text}</p>}
      {post.photo && <PostPhoto id={post.id} local={feed.local.get(post.id)} />}
      {post.cheered_by.length > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-orange-300">
          <Megaphone size={12} /> Cheered on by {post.cheered_by.join(', ')}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-ink-700 pt-2.5">
        <button aria-pressed={post.flamed} aria-label={post.flamed ? 'Take your flame back' : 'Give a flame'} onClick={() => void flame()} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${post.flamed ? 'bg-orange-500/20 text-orange-300' : 'bg-ink-700 text-slate-300'}`}>
          <Flame size={14} className={post.flamed ? 'fill-orange-400' : ''} /> {post.flames || ''}
        </button>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <MessageCircle size={14} /> {post.comments.length || ''}
        </span>
      </div>

      {post.comments.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {post.comments.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <p className="min-w-0 flex-1 break-words text-slate-200">
                <span className="font-semibold text-slate-100">{c.mine ? 'You' : c.name || 'A friend'}</span> {c.text}
              </p>
              {(c.mine || post.mine) && (
                <button aria-label="Delete this comment" onClick={() => void unsay(c.id)} className="shrink-0 p-1 text-slate-500">
                  <X size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void comment();
        }}
      >
        <input
          value={text}
          maxLength={FEED_LIMIT.comment}
          onChange={(e) => setText(e.target.value)}
          placeholder={post.mine ? 'Add a comment' : `Say something to ${name}`}
          aria-label={`Comment on ${post.mine ? 'your' : `${name}'s`} workout`}
          className="min-w-0 flex-1 rounded-lg bg-ink-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <button type="submit" disabled={busy || !cleanLine(text, FEED_LIMIT.comment)} aria-label="Send comment" className="rounded-lg bg-ink-600 px-3 text-slate-100 disabled:opacity-40">
          <Send size={15} />
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
    </article>
  );
}

/** A post's photo, fetched with sign-in once it is near the screen. */
function PostPhoto({ id, local }: { id: string; local?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(local ?? null);
  useEffect(() => {
    if (src) return;
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (seen) => {
        if (!seen.some((x) => x.isIntersecting)) return;
        io.disconnect();
        void photoUrl(id)
          .then(setSrc)
          .catch(() => {});
      },
      { rootMargin: '400px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id, src]);
  return (
    <div ref={box} className="mt-3 overflow-hidden rounded-xl bg-ink-900">
      {/* eslint-disable-next-line @next/next/no-img-element -- a private photo, fetched with sign-in into a blob link */}
      {src ? <img src={src} alt="Workout photo" className="max-h-[28rem] w-full object-cover" /> : <div className="aspect-[4/3] w-full motion-safe:animate-pulse" />}
    </div>
  );
}

/** After a workout: share it with your friends, with a line and a photo if you like. */
export function SharePage({ state, card, feed, onClose, onShared }: { state: GameState; card: WorkoutCard; feed: Feed; onClose: () => void; onShared: () => void }) {
  const box = useModal<HTMLDivElement>(onClose);
  const file = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<{ base64: string; preview: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setError('');
    try {
      setPhoto(await shrinkPhoto(f));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that photo.");
    }
  };

  const share = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const line = cleanLine(text, FEED_LIMIT.text);
    try {
      const post: Post = feed.demo
        ? { id: `demo-${Date.now()}`, author: { ...myCard(state, null), id: 'me', name: state.profile.name || 'You', online: true, seen_at: new Date().toISOString() }, at: new Date().toISOString(), workout: card, text: line, photo: !!photo, cheered_by: [], flames: 0, flamed: false, comments: [], mine: true }
        : await sharePost(card, line, photo?.base64 ?? null);
      if (photo) feed.local.set(post.id, photo.preview);
      feed.put(post);
      onShared();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't share it right now.");
      setBusy(false);
    }
  };

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label="Share your workout" className="safe-top safe-bottom fixed inset-0 z-[60] !mt-0 overflow-y-auto bg-ink-950 outline-none">
      <div className="mx-auto max-w-md px-4 pb-6">
        <header className="flex items-center justify-between py-2">
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-lg bg-ink-800">
            <X size={18} />
          </button>
          <p className="font-pixel text-[10px] text-gold-300">Share with friends</p>
          <span className="w-10" />
        </header>

        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-ink-800 p-3">
          <Hero gear={gearOf(state)} classId={state.profile.classId} size={64} bounce={false} variant={heroVariant(state)} sp={spWorn(state)} />
          <div className="min-w-0">
            <p className="font-pixel text-[10px] text-gold-300">{card.title}</p>
            <p className="mt-1 text-xs text-slate-400">{workoutLine(card)}</p>
            <p className="mt-1 truncate text-[11px] text-slate-500">{card.exercises.join(', ')}</p>
          </div>
        </div>

        <textarea
          value={text}
          rows={3}
          maxLength={FEED_LIMIT.text}
          onChange={(e) => setText(e.target.value)}
          placeholder="How did it go? (optional)"
          aria-label="A line about your workout"
          className="mt-4 w-full resize-none rounded-xl bg-ink-800 p-3 text-base text-slate-100 placeholder:text-slate-500"
        />

        <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        {photo ? (
          <div className="relative mt-3 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- a local preview */}
            <img src={photo.preview} alt="Your photo" className="max-h-80 w-full object-cover" />
            <button aria-label="Remove the photo" onClick={() => setPhoto(null)} className="absolute right-2 top-2 rounded-lg bg-ink-950/80 p-2">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => file.current?.click()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-600 py-4 text-sm text-slate-300">
            <ImagePlus size={18} /> Add a photo (optional)
          </button>
        )}

        <p className="mt-3 text-[11px] text-slate-500">Only your friends see it. You can delete it any time.</p>
        {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        <button onClick={() => void share()} disabled={busy} className="mt-4 w-full rounded-2xl bg-gold-400 py-3.5 font-pixel text-xs text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:opacity-50">
          {busy ? 'Sharing…' : 'Share'}
        </button>
      </div>
    </div>
  );
}

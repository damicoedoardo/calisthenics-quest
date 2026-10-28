'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, LogOut, Mail, Trash2 } from 'lucide-react';
import { useModal } from './useModal';
import type { GameState } from '@/lib/game';
import { cloudState, describe, plan, type CloudCopy } from '@/lib/cloud';
import {
  cloudConfigured,
  deleteCloud,
  getCloud,
  googleSignIn,
  lastRev,
  maybeSignedIn,
  Offline,
  putCloud,
  rememberRev,
  setCloudStatus,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  supabase,
  useCloudStatus,
} from '@/lib/cloud-client';

/* The cloud backup on screen: the sync that runs while signed in (useCloudSync, in page.tsx) and
   the card in Hero > Settings (CloudSave). */

/** How long after a change the save goes up, so a burst of taps is one upload. */
const PUSH_AFTER_MS = 3000;

/** Keeps the cloud copy in step with this phone while signed in. Off in the sandbox, on the developer save, and when not set up. */
export function useCloudSync(state: GameState, update: (fn: (s: GameState) => GameState) => void, off: boolean) {
  const user = useRef<string | null>(null);
  const latest = useRef(state);
  latest.current = state;
  // The save as last sent or taken, so an unchanged save is never sent again.
  const synced = useRef<string | null>(null);
  const busy = useRef(false);

  // meet and push call each other (a clash on push means meeting the cloud again), so they live in refs.
  const meet = useRef(async (_known?: CloudCopy | null) => {});
  const push = useRef(async (_baseRev: number | null) => {});

  meet.current = async (known?: CloudCopy | null) => {
    const id = user.current;
    if (!id) return;
    const cloud = known !== undefined ? known : await getCloud();
    const p = plan(latest.current, cloud, lastRev(id));
    if (p.kind === 'use-cloud') {
      const s = cloud && cloudState(cloud);
      if (!cloud || !s) return;
      synced.current = JSON.stringify(s);
      rememberRev(id, cloud.rev);
      update(() => s);
      setCloudStatus({ phase: 'saved', savedAt: cloud.updated_at, workouts: cloud.workouts });
    } else if (JSON.stringify(latest.current) !== synced.current || p.baseRev !== lastRev(id)) {
      await push.current(p.baseRev);
    } else {
      setCloudStatus({ phase: 'saved', savedAt: cloud?.updated_at, workouts: cloud?.workouts });
    }
  };

  push.current = async (baseRev: number | null) => {
    const id = user.current;
    if (!id) return;
    const s = latest.current;
    const body = JSON.stringify(s);
    setCloudStatus({ phase: 'saving' });
    const r = await putCloud(s, baseRev);
    if (r.ok) {
      synced.current = body;
      rememberRev(id, r.copy.rev);
      setCloudStatus({ phase: 'saved', savedAt: r.copy.updated_at, workouts: r.copy.workouts });
    } else {
      await meet.current(r.current);
    }
  };

  /** Runs one sync step at a time, and turns failures into the status line. */
  const run = useCallback(async (step: () => Promise<void>) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await step();
    } catch (e) {
      setCloudStatus({ phase: e instanceof Offline ? 'offline' : 'error' });
    } finally {
      busy.current = false;
    }
  }, []);

  // Sign-in state: only loads Supabase when this phone may be signed in, or once someone signs in.
  useEffect(() => {
    if (off || !cloudConfigured) return;
    let stop = () => {};
    const start = async () => {
      const auth = (await supabase()).auth;
      const { data } = auth.onAuthStateChange((_event, session) => {
        const id = session?.user.id ?? null;
        const was = user.current;
        user.current = id;
        setCloudStatus({ signedIn: !!id, email: session?.user.email ?? null });
        if (id && id !== was) {
          synced.current = null;
          void run(() => meet.current());
        }
        if (!id) {
          setCloudStatus({ phase: 'idle', savedAt: undefined });
        }
      });
      stop = () => data.subscription.unsubscribe();
    };
    if (maybeSignedIn()) void start();
    const onStart = () => void start();
    window.addEventListener('forma-cloud-start', onStart, { once: true });
    return () => {
      stop();
      window.removeEventListener('forma-cloud-start', onStart);
    };
  }, [off, run]);

  // Every change goes up a few seconds later; offline, it waits for the signal.
  useEffect(() => {
    if (off || !user.current) return;
    const body = JSON.stringify(state);
    if (body === synced.current) return;
    const t = window.setTimeout(() => {
      const id = user.current;
      if (id) void run(() => push.current(lastRev(id)));
    }, PUSH_AFTER_MS);
    return () => window.clearTimeout(t);
  }, [state, off, run]);

  useEffect(() => {
    if (off) return;
    const retry = () => {
      if (user.current && JSON.stringify(latest.current) !== synced.current) void run(() => meet.current());
    };
    // Back to the front: look for a newer save from another device. To the back: send what's waiting now.
    const flip = () => {
      if (!user.current) return;
      if (document.visibilityState === 'visible') void run(() => meet.current());
      else if (JSON.stringify(latest.current) !== synced.current) {
        const id = user.current;
        void run(() => push.current(lastRev(id)));
      }
    };
    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', flip);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', flip);
    };
  }, [off, run]);
}

const PHASE: Record<string, string> = {
  saving: 'Saving…',
  offline: 'Offline: it saves when you are back online.',
  error: "Couldn't reach the backup. It tries again on the next change.",
};

/** Hero > Settings: sign in to keep a copy of the hero in the cloud. Hidden until the backend is set up. */
export function CloudSave({ sandbox }: { sandbox: boolean }) {
  const st = useCloudStatus();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  if (!cloudConfigured) return null;
  if (sandbox) return <p className="mt-4 text-xs text-slate-500">Cloud backup is off in the sandbox and on the developer save; your real save keeps its own.</p>;

  const begin = () => window.dispatchEvent(new Event('forma-cloud-start'));

  if (!st.signedIn) {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs text-slate-400">Sign in to keep your hero safe in the cloud, and to bring it to a new phone.</p>
        {googleSignIn && (
          <button
            onClick={async () => {
              begin();
              const err = await signInWithGoogle();
              if (err) setMsg(err);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-600 py-3 text-sm font-semibold"
          >
            <Cloud size={16} /> Sign in with Google
          </button>
        )}
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email.includes('@')) return setMsg('That email looks off.');
            begin();
            const err = await signInWithEmail(email.trim());
            setMsg(err ?? 'Check your email for the sign-in link.');
          }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={googleSignIn ? 'or your email' : 'your email'}
            aria-label="Email for a sign-in link"
            className="min-w-0 flex-1 rounded-xl bg-ink-900 px-3 text-sm text-slate-100 placeholder:text-slate-500"
          />
          <button type="submit" className="flex items-center gap-1 rounded-xl bg-ink-600 px-3 py-3 text-sm font-semibold">
            <Mail size={16} /> Link
          </button>
        </form>
        {msg && <p className="text-xs text-sky-300">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      <p className="flex items-center gap-2 text-xs text-slate-300">
        {st.phase === 'offline' || st.phase === 'error' ? <CloudOff size={14} className="text-amber-300" /> : <Cloud size={14} className="text-emerald-400" />}
        {st.email ? `Signed in as ${st.email}` : 'Signed in'}
      </p>
      <p className="text-xs text-slate-400">
        {PHASE[st.phase] ?? (st.savedAt ? `Backed up: ${describe(st.workouts ?? 0, st.savedAt)}.` : 'Backing up…')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => void signOut()} className="flex items-center justify-center gap-2 rounded-xl bg-ink-600 py-3 text-sm font-semibold">
          <LogOut size={16} /> Sign out
        </button>
        <button
          onClick={async () => {
            try {
              await deleteCloud();
              await signOut();
              setMsg('Cloud copy removed and signed out. This phone keeps its save.');
            } catch {
              setMsg("Couldn't remove it right now.");
            }
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-ink-600 py-3 text-sm font-semibold"
        >
          <Trash2 size={16} /> Remove copy
        </button>
      </div>
      {msg && <p className="text-xs text-sky-300">{msg}</p>}
    </div>
  );
}

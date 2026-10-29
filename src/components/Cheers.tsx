'use client';

import { useCallback, useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import type { Cheer } from '@/lib/cheers';
import type { FriendCard } from '@/lib/friends';
import { takeCheers } from '@/lib/friends-client';
import { cloudConfigured, useCloudStatus } from '@/lib/cloud-client';
import { FriendHero } from './Friends';

/* Cheers from friends on screen: picked up every few seconds during a workout, every minute
   otherwise, and shown one at a time at the top, over the workout too. Sending is on the
   Friends tab (CheerPicker in Friends.tsx); the rules in lib/cheers.ts. */

/** How often to look for cheers during a workout, and the rest of the time. */
const FAST_MS = 8_000;
const SLOW_MS = 60_000;
/** How long one cheer stays up (a tap closes it sooner). */
const SHOW_MS = 6_000;

const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';

/** The cheers waiting to be shown. `fast` during a workout; `demo` (the sandbox) sends one sample
    cheer a few seconds into a workout, with no network. */
export function useCheers(off: boolean, fast: boolean, demo: boolean) {
  const { signedIn } = useCloudStatus();
  const [queue, setQueue] = useState<Cheer[]>([]);
  const on = cloudConfigured && !off && signedIn;

  const look = useCallback(async () => {
    if (!visible()) return;
    try {
      const { cheers } = await takeCheers();
      if (cheers.length) setQueue((q) => [...q, ...cheers]);
    } catch {
      // Offline or a hiccup: they wait on the server for the next look.
    }
  }, []);

  useEffect(() => {
    if (!on) return;
    void look();
    const t = window.setInterval(() => void look(), fast ? FAST_MS : SLOW_MS);
    document.addEventListener('visibilitychange', look);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', look);
    };
  }, [on, fast, look]);

  useEffect(() => {
    if (!demo || !fast) return;
    const t = window.setTimeout(
      () =>
        setQueue((q) => [
          ...q,
          {
            id: 'demo',
            from: 'demo-a',
            from_name: 'Ana',
            text: 'One more set!',
            at: new Date().toISOString(),
          },
        ]),
      4_000,
    );
    return () => window.clearTimeout(t);
  }, [demo, fast]);

  const next = useCallback(() => setQueue((q) => q.slice(1)), []);
  return { cheer: queue[0] ?? null, next };
}

/** One cheer at the top of the screen: the friend's hero, their name and their line. */
export function CheerToast({ cheer, friends, onDone }: { cheer: Cheer | null; friends: FriendCard[]; onDone: () => void }) {
  useEffect(() => {
    if (!cheer) return;
    const t = window.setTimeout(onDone, SHOW_MS);
    return () => window.clearTimeout(t);
  }, [cheer, onDone]);
  if (!cheer) return null;
  const f = friends.find((x) => x.id === cheer.from);
  const name = cheer.from_name || f?.name || 'A friend';
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center px-4 safe-top">
      <button
        key={cheer.id}
        onClick={onDone}
        aria-label={`${name} cheers you on: ${cheer.text}. Tap to close.`}
        className="pointer-events-auto mt-2 flex w-full max-w-sm items-center gap-3 rounded-2xl bg-ink-800 p-2.5 pr-4 text-left shadow-xl ring-1 ring-orange-400/60 motion-safe:animate-fadein"
      >
        <span className="shrink-0">{f ? <FriendHero f={f} size={40} /> : <Megaphone size={22} className="m-2 text-orange-300" />}</span>
        <span className="min-w-0">
          <span className="block text-[10px] uppercase tracking-wider text-orange-300">{name} cheers you on</span>
          <span className="block break-words text-sm font-semibold text-slate-50">{cheer.text}</span>
        </span>
      </button>
    </div>
  );
}

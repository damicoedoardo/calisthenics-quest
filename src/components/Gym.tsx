'use client';

import { useSyncExternalStore } from 'react';
import { ChevronRight, Dumbbell, Flame, Gamepad2, Lock, Play, Sun, UserRound, Users, X, type LucideIcon } from 'lucide-react';
import { Sprite } from './Sprite';

/* Gym mode (You > Settings): the training screens (the header, the tab bar, Today, Train and the
   workout) drop the pixel look for a plain, modern one, so the game stays out of the way at the gym.
   The look is CSS: a `gym` class on those screens swaps the colors, the font and the pixel edges
   (globals.css). Kept on this phone only, like the music setting. */

const KEY = 'forma-gym-mode';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setGymMode(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {}
  listeners.forEach((fn) => fn());
}

/** Is gym mode on? Off on the server and in a first paint. */
export function useGymMode(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    read,
    () => false,
  );
}

type IconName = 'play' | 'lock' | 'chevron' | 'close' | 'flame' | 'tabToday' | 'tabTrain' | 'tabPlay' | 'tabFriends' | 'tabHero';

const PLAIN: Record<IconName, LucideIcon> = {
  play: Play,
  lock: Lock,
  chevron: ChevronRight,
  close: X,
  flame: Flame,
  tabToday: Sun,
  tabTrain: Dumbbell,
  tabPlay: Gamepad2,
  tabFriends: Users,
  tabHero: UserRound,
};

/** A UI icon: the pixel one, or in gym mode a plain line icon of the same size. */
export function UiIcon({ name, size, className = '' }: { name: IconName; size: number; className?: string }) {
  const gym = useGymMode();
  if (!gym) return <Sprite id="uiIcon" opts={{ name }} size={size} label="" className={className} />;
  const Icon = PLAIN[name];
  return <Icon size={size} strokeWidth={2} aria-hidden className={className.replace(/\bgrayscale\b/, '')} />;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { cloudConfigured, maybeSignedIn, supabase, useCloudStatus } from './cloud-client';
import { devSaveOn, inSandbox, switchDevSave } from './store';
import type { GameState, Session } from './game';
import { NO_FOG, ZONES } from './fog';
import { NO_GEAR, type FogGear } from './fog-gear';
import { addMats, embersOf } from './forge';
import { coinsEarned } from './sweat';
import { seeded } from './random';
import { ALL_SCENES, chapterStart, pendingScenes } from '@/story/engine';
import { CHAPTERS } from '@/story/chapters';
import { dayKey } from './days';
import { rollItem, type Item, type ItemSlot, type Rarity } from '@/game/dungeon/items';
import type { SpNo } from '@/game/dungeon/content';
import { SP_TRIAL, type MatId } from '@/balance';

/* Developer mode: shortcuts for trying the app without training for real or replaying the
   opening. Only the developer's account has it (Edoardo's call, 2026-10-28): signed in with an
   email whose fingerprint is in DEV_EMAILS, or on localhost. It is off until switched on (You >
   Settings), and while it is on the app plays a separate developer save (src/lib/store.ts), so the
   real hero is never touched; switching it off goes back to the real save as it was. */

/** SHA-256 of each developer's email, trimmed and lower-cased: the repo is public, the addresses stay out of it.
    Edoardo's own, then two test accounts of his (for trying friends and parties with two windows). */
export const DEV_EMAILS = [
  'ca4d1083bd88ad457c76dbfa9d8b88cce00c3a376c32d1e705559f821b162de9',
  'e2cbbfdb4f16402b1413541976100b5a1315cef0443b31c94e726a7a16e6998c',
  '85f57681d3010ffe2708fee1539109a2960e18dc57a25094766a456863a54485',
];

const LIVE_HOSTS = ['formaquest.app', 'www.formaquest.app', 'forma-nu-red.vercel.app'];
const onLocalhost = () => ['localhost', '127.0.0.1'].includes(window.location.hostname);

/** Whether this email belongs to a developer. */
export async function isDeveloper(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(email.trim().toLowerCase()));
  const hex = Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
  return DEV_EMAILS.includes(hex);
}

/** The signed-in account's email, read from the stored Supabase session (null: signed out). */
async function sessionEmail(): Promise<string | null> {
  if (!cloudConfigured || !maybeSignedIn()) return null;
  try {
    const { data } = await (await supabase()).auth.getSession();
    return data.session?.user.email ?? null;
  } catch {
    return null;
  }
}

/**
 * `allowed`: this phone may use developer mode (the developer's account, or localhost). `dev`:
 * the tools show: allowed, and on (the developer save) or in a lab sandbox. `on`: the developer
 * save is in use. `setOn` switches it and reloads the app onto the other save.
 */
export function useDevMode() {
  const { email } = useCloudStatus();
  const [allowed, setAllowed] = useState(false);
  const [on, setOnState] = useState(false);

  useEffect(() => {
    let live = true;
    setOnState(devSaveOn());
    (async () => {
      const ok = onLocalhost() || (await isDeveloper(email ?? (await sessionEmail())));
      if (!live) return;
      setAllowed(ok);
      // Signed out, or someone else's account: back to the real save.
      if (!ok && devSaveOn() && !maybeSignedIn()) switchDevSave(false);
    })();
    return () => {
      live = false;
    };
  }, [email]);

  const setOn = useCallback((next: boolean) => switchDevSave(next), []);

  return { allowed, on, dev: allowed && (on || inSandbox()), setOn };
}

/**
 * `?fast` on a preview or localhost: text appears at once and camera moves are quick, so scripts
 * (and impatient developers) can play through the story in a hurry. Never on the live app.
 */
export function fastStory(): boolean {
  if (typeof window === 'undefined' || LIVE_HOSTS.includes(window.location.hostname)) return false;
  return new URLSearchParams(window.location.search).has('fast');
}

/** Story scenes that are due right now, marked as seen so they don't play. */
export function skipDueScenes(state: GameState, now: Date): GameState {
  const due = pendingScenes(state, now).map((s) => s.id);
  return due.length ? { ...state, seenScenes: [...state.seenScenes, ...due] } : state;
}

/** A hero who just finished the opening: no letter to write, no placement, no fight. */
export function skipIntro(state: GameState, now: Date): GameState {
  return skipDueScenes(
    {
      ...state,
      profile: {
        ...state.profile,
        onboarded: true,
        voice: state.profile.voice || 'You always quit.',
        letter: state.profile.letter.why
          ? state.profile.letter
          : { why: 'I want to feel strong again', want: 'do ten pull-ups', forWho: 'me', remind: 'I already did this once' },
      },
    },
    now,
  );
}

/**
 * Pretend `n` workouts were done. They land after the last real one and end now, at most
 * two days apart, so the newest is always today.
 */
export function addFakeWorkouts(state: GameState, n: number, now: Date, skipStory: boolean): GameState {
  const last = state.sessions[state.sessions.length - 1];
  const end = now.getTime();
  const earliest = last ? new Date(last.date).getTime() + 60_000 : -Infinity;
  const start = Math.min(end, Math.max(earliest, end - 2 * 86_400_000 * (n - 1)));
  const step = n > 1 ? (end - start) / (n - 1) : 0;
  const added: Session[] = Array.from({ length: n }, (_, i) => ({
    id: `dev-${end}-${i}`,
    date: new Date(start + step * i).toISOString(),
    kind: 'full',
    day: (state.sessions.length + i) % 2 === 0 ? 'A' : 'B',
    xp: 100,
    breakdown: [{ label: 'Dev workout', xp: 100 }],
    entries: [],
  }));
  const next = { ...state, sessions: [...state.sessions, ...added] };
  return skipStory ? skipDueScenes(next, now) : next;
}

/**
 * Move every workout back in time so the last one was `daysAgo` days ago: 1 makes today a rest
 * day, 8 makes you someone coming back after a long time.
 */
export function lastWorkoutAgo(state: GameState, daysAgo: number, now: Date): GameState {
  const last = state.sessions[state.sessions.length - 1];
  if (!last) return state;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 18).getTime();
  const shift = new Date(last.date).getTime() - target;
  return { ...state, sessions: state.sessions.map((s) => ({ ...s, date: new Date(new Date(s.date).getTime() - shift).toISOString() })) };
}

/** Train `n` days in a row ending today, after the last real workout (for the smoky flame). */
export function trainDaysInRow(state: GameState, n: number, now: Date): GameState {
  let s = lastWorkoutAgo(state, n, now);
  for (let i = n - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, Math.min(now.getHours(), 20));
    // The story scenes the run of days unlocks stay, so the last day can show the smoky flame.
    s = addFakeWorkouts(s, 1, day, i > 0);
  }
  return s;
}

/** Forget today's page of the Book of Days, so its line and quote are picked again. */
export function newDayPage(state: GameState, now: Date): GameState {
  const key = dayKey(now);
  return { ...state, days: (state.days ?? []).filter((d) => d.day !== key) };
}

/** Beat the boss of the next zone without playing it. */
export function clearNextZone(state: GameState): GameState {
  return setBossesBeaten(state, (state.fog ?? NO_FOG).cleared + 1);
}

export function resetFog(state: GameState): GameState {
  return { ...state, fog: NO_FOG };
}

/** Beat the first `n` Fog bosses (0 to 6), and no more. */
export function setBossesBeaten(state: GameState, n: number): GameState {
  // The story moves with them: a boss beaten here falls now, so its next chapter begins now.
  const fog = state.fog ?? NO_FOG,
    cleared = Math.max(0, Math.min(ZONES.length, n)),
    at = fog.clearedAt ?? [];
  return { ...state, fog: { ...fog, cleared, clearedAt: Array.from({ length: cleared }, (_, i) => at[i] ?? state.sessions.length) } };
}

/**
 * Stand at the start of story chapter `n` (1 to 6; 7 is past the end): the bosses before it beaten
 * (and no more), and workouts added, or the newest taken away, until the count is where that
 * chapter is planned to begin. Going back forgets the later chapters' scenes, so they play again.
 */
export function jumpToChapter(state: GameState, n: number, now: Date, skipStory: boolean): GameState {
  const beaten = Math.min(n - 1, CHAPTERS.length);
  const target = n > CHAPTERS.length ? chapterStart(CHAPTERS.length) + CHAPTERS[CHAPTERS.length - 1].workouts : chapterStart(n);
  const fog = state.fog ?? NO_FOG;
  const bosses = (s: GameState): GameState => ({ ...s, fog: { ...fog, cleared: beaten, clearedAt: Array.from({ length: beaten }, (_, i) => chapterStart(i + 2)) } });
  const have = state.sessions.length;
  if (have < target) return addFakeWorkouts(bosses(state), target - have, now, skipStory);
  const later = new Set(ALL_SCENES.filter((p) => p.chapter >= n).map((p) => p.scene.id));
  const back = bosses({ ...state, sessions: state.sessions.slice(0, target), draft: null, seenScenes: state.seenScenes.filter((id) => !later.has(id)) });
  return skipStory ? skipDueScenes(back, now) : back;
}

// ---------- the wallet ----------

const gearOf = (s: GameState): FogGear => s.fogGear ?? NO_GEAR;

/** Embers for Mira's forge, as if melted down (a negative `n` takes them away). */
export function giveEmbers(state: GameState, n: number): GameState {
  const g = gearOf(state),
    e = g.embers ?? { found: 0, spent: 0 };
  return { ...state, fogGear: { ...g, embers: { ...e, found: e.found + n } } };
}

/** Sweat coins: workouts earn them, so a gift is spending less than nothing. */
export function giveCoins(state: GameState, n: number): GameState {
  return { ...state, sweat: { ...state.sweat, spent: (state.sweat?.spent ?? 0) - n } };
}

/** Co-op materials, as if found on a run with friends. */
export function giveMaterials(state: GameState, more: Partial<Record<MatId, number>>): GameState {
  const g = gearOf(state);
  return { ...state, fogGear: { ...g, mats: addMats(g.mats ?? {}, more) } };
}

/** No embers, coins, materials or given points left. */
export function emptyWallet(state: GameState): GameState {
  const g = gearOf(state),
    e = g.embers ?? { found: 0, spent: 0 },
    { devPoints: _p, ...rest } = state;
  return {
    ...rest,
    sweat: { ...state.sweat, spent: coinsEarned(state) },
    fogGear: { ...g, mats: {}, embers: { ...e, found: e.found - embersOf(state) } },
  };
}

/** Stat points on top of the earned ones (never below none). */
export function giveStatPoints(state: GameState, n: number): GameState {
  return { ...state, devPoints: Math.max(0, (state.devPoints ?? 0) + n) };
}

// ---------- gear ----------

export interface ItemOrder {
  slot: ItemSlot;
  rarity: Rarity;
  /** Forged this far, 0 to 15. */
  plus: number;
  /** The zone it drops in (0 to 5), from its last floor: sets how strong it is. */
  zone: number;
}

/** A new item made to order for the hero's class, wearable now (no stat asked). */
export function makeItem(state: GameState, order: ItemOrder, seed: number): Item {
  const rnd = seeded(seed),
    at = { zone: order.zone, workouts: ZONES[order.zone].workouts, floor: 9, cls: state.profile.classId };
  // The slot is rolled with the rest, so roll until it lands (a few tries at most).
  let it = rollItem(rnd, at, order.rarity);
  for (let i = 0; i < 200 && it.slot !== order.slot; i++) it = rollItem(rnd, at, order.rarity);
  return { ...it, slot: order.slot, plus: order.plus || undefined, need: null };
}

/** Put an item on; what was worn in its slot goes to the vault (a starter weapon is dropped). */
export function wearNew(state: GameState, it: Item): GameState {
  const g = gearOf(state),
    old = g.worn[it.slot];
  return { ...state, fogGear: { ...g, worn: { ...g.worn, [it.slot]: it }, vault: old && !old.starter ? [...g.vault, old] : g.vault } };
}

/** Put an item in the vault, even past its size. */
export function toVault(state: GameState, it: Item): GameState {
  const g = gearOf(state);
  return { ...state, fogGear: { ...g, vault: [...g.vault, it] } };
}

/** Everything worn forged to `plus`. */
export function setWornPlus(state: GameState, plus: number): GameState {
  const g = gearOf(state),
    worn = Object.fromEntries(Object.entries(g.worn).map(([slot, it]) => [slot, it && { ...it, plus: plus || undefined }])) as FogGear['worn'];
  return { ...state, fogGear: { ...g, worn } };
}

export function emptyVault(state: GameState): GameState {
  return { ...state, fogGear: { ...gearOf(state), vault: [] } };
}

/** Take everything off (the run hands out the starter weapon again). */
export function takeAllOff(state: GameState): GameState {
  return { ...state, fogGear: { ...gearOf(state), worn: {} } };
}

// ---------- SP ----------

/** Own SP `n` of your class, awake, and wear it: its trial counts as done. */
export function giveSpAwake(state: GameState, n: SpNo): GameState {
  const sp = state.sp ?? { givenAt: state.sessions.length - SP_TRIAL.workouts },
    // The first SP wakes after its trial: the workouts and the floor.
    first = n === 1 ? { givenAt: Math.min(sp.givenAt, state.sessions.length - SP_TRIAL.workouts), floor: true } : {},
    more = n > 1 && !sp.more?.includes(n) ? [...(sp.more ?? []), n] : sp.more;
  const { off: _off, ...rest } = sp;
  return { ...state, sp: { ...rest, ...first, ...(more ? { more } : {}), worn: n } };
}

/** Every SP of your class, awake, wearing `n`. */
export function giveAllSp(state: GameState, n: SpNo = 1): GameState {
  return giveSpAwake(([2, 3, 4, 1] as SpNo[]).reduce(giveSpAwake, state), n);
}

/** No SP at all, as before the Wanderer's gift. */
export function takeSp(state: GameState): GameState {
  const { sp: _sp, ...rest } = state;
  return rest;
}

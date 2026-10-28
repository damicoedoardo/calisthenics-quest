'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { PostHog } from 'posthog-js';
import type { GameState } from './game';
import { eventsBetween, heroContext, openEvent, type AnalyticsEvent } from './analytics';
import { offRecord } from './store';
import { supabase } from './cloud-client';

/* The sending side of the play stats (what to send lives in analytics.ts). Off until
   NEXT_PUBLIC_POSTHOG_KEY is set, on localhost, in the sandbox, and when the player turns it off on
   the You page. PostHog loads only once there is something to send. No autocapture, no session
   recordings, no surveys: only the events analytics.ts names. */

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '';
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const OFF_KEY = 'forma-analytics';
const LIVE_HOSTS = ['formaquest.app', 'www.formaquest.app', 'forma-nu-red.vercel.app'];

/** Where this copy of the app runs: the live app, a Vercel preview, or a computer. */
function where(): 'live' | 'preview' | 'local' {
  const h = window.location.hostname;
  if (LIVE_HOSTS.includes(h)) return 'live';
  return h.endsWith('.vercel.app') ? 'preview' : 'local';
}

// ---------- the player's choice (You page) ----------

let shared = true;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  try {
    shared = localStorage.getItem(OFF_KEY) !== '0';
  } catch {
    // Storage blocked: the default stands.
  }
}

/** Whether play stats are sent from this phone. */
export function useStatsShared(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => shared,
    () => true,
  );
}

export function setStatsShared(on: boolean) {
  shared = on;
  try {
    localStorage.setItem(OFF_KEY, on ? '1' : '0');
  } catch {
    // Not saved; it still applies for this visit.
  }
  void client?.then((ph) => (on ? ph.opt_in_capturing() : ph.opt_out_capturing()));
  for (const l of listeners) l();
}

/** True when this phone may send play stats at all. */
export const statsConfigured = !!KEY;
const canSend = () => !!KEY && typeof window !== 'undefined' && shared && !offRecord() && where() !== 'local';

// ---------- PostHog ----------

let client: Promise<PostHog> | null = null;

function posthog(): Promise<PostHog> {
  client ??= import('posthog-js').then(({ default: ph }) => {
    ph.init(KEY, {
      api_host: HOST,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      disable_surveys: true,
      persistence: 'localStorage',
      person_profiles: 'identified_only',
    });
    ph.register({ app: 'forma', env: where(), build: process.env.NEXT_PUBLIC_BUILD_ID ?? null });
    return ph;
  });
  return client;
}

/** Away this long, and coming back counts as opening the app again. */
const RESUME_AFTER_MS = 30 * 60_000;

let latest: GameState | null = null;
let dev = false;

/** Sends one event, with where the hero stands in the game. */
export function track(e: AnalyticsEvent) {
  if (!canSend()) return;
  const context = latest ? heroContext(latest, new Date()) : {};
  void posthog()
    .then((ph) => ph.capture(e.name, { ...context, dev, ...e.props }))
    .catch(() => {});
}

/**
 * Sends the events each change to the save stands for, the app_opened event once the save has
 * loaded, and ties this phone to the account while signed in (the account id only, never the email).
 */
export function useAnalytics(state: GameState, ready: boolean, signedIn: boolean, devMode: boolean) {
  const prev = useRef<GameState | null>(null);
  dev = devMode;

  useEffect(() => {
    if (!ready) return;
    const before = prev.current;
    prev.current = state;
    latest = state;
    if (!before) return track(openEvent(state, new Date()));
    for (const e of eventsBetween(before, state)) track(e);
  }, [state, ready]);

  // A phone app is rarely closed: coming back after a while counts as an open too.
  useEffect(() => {
    let hiddenAt = 0;
    const onShow = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > RESUME_AFTER_MS && latest) {
        const e = openEvent(latest, new Date());
        track({ ...e, props: { ...e.props, resumed: true } });
      }
    };
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, []);

  useEffect(() => {
    if (!signedIn || !canSend()) return;
    void supabase()
      .then((sb) => sb.auth.getUser())
      .then(({ data }) => data.user && posthog().then((ph) => ph.identify(data.user!.id)))
      .catch(() => {});
  }, [signedIn]);
}

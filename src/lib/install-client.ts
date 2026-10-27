'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { PLATFORMS, platformOf, type Platform } from './install';

/* The browser side of installing: is FORMA running as an installed app, which guide this browser
   gets, and Android's install prompt. The rules are in install.ts. */

/** Chrome's install prompt event (not in TypeScript's DOM types). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Chrome offers its install prompt once, soon after the page loads, so it is caught here as soon
// as this file is loaded, long before the install screen shows.
let deferred: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    changed();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    changed();
  });
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** True when FORMA was opened from the home screen (or as an installed desktop app). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!nav.standalone || ['standalone', 'fullscreen', 'minimal-ui'].some((m) => window.matchMedia(`(display-mode: ${m})`).matches);
}

/** `?gate=<platform>` shows that platform's install screen anywhere, even in the sandbox (the
    /lab/night jumps use it to show every guide on one phone). */
export function forcedPlatform(): Platform | null {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search).get('gate');
  return PLATFORMS.find((x) => x === p) ?? null;
}

const SKIP_KEY = 'forma-install-skip';

/** Where FORMA is running and what the install screen needs. `known` is false until it has looked. */
export function useInstall() {
  const [info, setInfo] = useState<{ known: boolean; standalone: boolean; platform: Platform; forced: boolean; skipped: boolean }>({
    known: false,
    standalone: false,
    platform: 'desktop',
    forced: false,
    skipped: false,
  });
  useEffect(() => {
    const forced = forcedPlatform();
    let skipped = false;
    try {
      skipped = localStorage.getItem(SKIP_KEY) === '1';
    } catch {
      // Storage blocked: not skipped.
    }
    const read = () =>
      setInfo({
        known: true,
        standalone: !forced && isStandalone(),
        platform: forced ?? platformOf(navigator.userAgent, navigator.maxTouchPoints),
        forced: !!forced,
        skipped: !forced && skipped,
      });
    read();
    // An installed desktop app can be opened in a tab and back; follow it.
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener?.('change', read);
    return () => mq.removeEventListener?.('change', read);
  }, []);

  const prompt = useSyncExternalStore(subscribe, () => deferred, () => null);
  const done = useSyncExternalStore(subscribe, () => installed, () => false);

  /** Shows Chrome's install prompt. True when the player said yes. */
  const install = useCallback(async () => {
    const e = deferred;
    if (!e) return false;
    deferred = null;
    changed();
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === 'accepted') {
      installed = true;
      changed();
    }
    return outcome === 'accepted';
  }, []);

  /** Developer mode: play on in the browser on this phone. */
  const skip = useCallback(() => {
    try {
      localStorage.setItem(SKIP_KEY, '1');
    } catch {
      // Not saved; it still applies for this visit.
    }
    setInfo((i) => ({ ...i, skipped: true }));
  }, []);

  return { ...info, canPrompt: !!prompt, installed: done, install, skip };
}

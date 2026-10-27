'use client';

import { useEffect } from 'react';

/** Every file this page has loaded so far: its scripts, styles, fonts and images. */
function loadedFiles(): string[] {
  const urls = performance.getEntriesByType('resource').map((e) => e.name);
  document.querySelectorAll<HTMLScriptElement>('script[src]').forEach((s) => urls.push(s.src));
  document.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet][href]').forEach((l) => urls.push(l.href));
  return [...new Set(urls)];
}

/** Registers the offline service worker in production builds, and keeps an installed app up to date. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    // A worker was already in charge when the page opened, so a change of worker is a new deploy.
    const hadWorker = !!sw.controller;
    let reg: ServiceWorkerRegistration | undefined;
    sw.register('/sw.js')
      .then((r) => (reg = r))
      .catch(() => {});

    // On the first visit the page loads before the worker exists, so hand it what was loaded:
    // once it is ready, again the moment it takes over the page (from then on it sees every
    // request itself), and once more a little later for anything that was mid-flight.
    const sendFiles = () => {
      void sw.ready.then((r) => r.active?.postMessage({ type: 'cache', urls: loadedFiles(), build: process.env.NEXT_PUBLIC_BUILD_ID })).catch(() => {});
    };
    sendFiles();
    if (!hadWorker) sw.addEventListener('controllerchange', sendFiles, { once: true });
    const late = window.setTimeout(sendFiles, 15000);

    // An installed app is rarely reloaded: it's brought back to the front, still running the
    // version it opened with. Each time it comes back, ask the server for this page again and compare
    // its scripts with ours (their names change with every deploy that changes the code).
    let shownAt = Date.now();
    let checkedAt = 0;
    let touched = false;
    let updateWaiting = false;
    const onTouch = () => (touched = true);
    // Reload into the new version right away if the player has only just brought the app back
    // and not touched anything; otherwise wait until it's hidden, so a workout or a run in
    // progress is never cut off.
    const newVersion = () => {
      if (!touched && Date.now() - shownAt < 10000) window.location.reload();
      else updateWaiting = true;
    };
    const checkDeploy = async () => {
      if (Date.now() - checkedAt < 5 * 60_000) return;
      checkedAt = Date.now();
      void reg?.update().catch(() => {});
      try {
        const html = await (await fetch(window.location.pathname, { cache: 'no-store' })).text();
        const theirs = [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((m) => m[1]);
        const ours = new Set([...document.querySelectorAll<HTMLScriptElement>('script[src]')].map((sc) => new URL(sc.src).pathname));
        if (theirs.length && theirs.some((src) => !ours.has(src))) newVersion();
      } catch {
        // Offline: nothing to compare with, keep the version we have.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'hidden') {
        // Report what this visit loaded (a run's code, say), so the worker counts it as this build's.
        sendFiles();
        // Out of sight is the safe moment to switch to the new version.
        if (updateWaiting) window.location.reload();
        return;
      }
      shownAt = Date.now();
      touched = false;
      void checkDeploy();
    };
    // A new service worker takes over at once (skipWaiting + claim); treat it like a new deploy.
    const onNewWorker = () => {
      if (hadWorker) newVersion();
    };
    sw.addEventListener('controllerchange', onNewWorker);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pointerdown', onTouch, { capture: true });
    return () => {
      window.clearTimeout(late);
      sw.removeEventListener('controllerchange', sendFiles);
      sw.removeEventListener('controllerchange', onNewWorker);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pointerdown', onTouch, { capture: true });
    };
  }, []);
  return null;
}

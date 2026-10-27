---
type: reference
title: Installable and offline
description: How FORMA installs to the home screen and works with no signal — public/sw.js, the ServiceWorker component, the manifest, icons, and the iOS splash screens.
tags: [app, pwa, offline, service-worker]
timestamp: 2026-10-27
---

# Installable and offline

FORMA is a PWA: add it to the home screen and it opens full screen and works in a gym with no
signal.

| Piece | Where |
|---|---|
| Service worker | `public/sw.js`. Pages network-first (a fresh deploy wins), static assets and Google Fonts cache-first. Bump `CACHE` when the caching rules change |
| Registration and updates | `src/components/ServiceWorker.tsx`, production builds only. On the first visit it sends the worker every file the page already loaded, tagged with the build id, so the app can start offline after a single visit; old builds' files are pruned |
| Build id | `NEXT_PUBLIC_BUILD_ID` in `next.config.ts` (the Vercel commit sha). `next.config.ts` also serves `/sw.js` with no-cache |
| Manifest | `src/app/manifest.ts` |
| Icons | `src/app/icon.svg`, `src/app/apple-icon.png`, `public/icon-*.png` (brand kit in the project's design files) |
| iOS splash screens | `public/splash/*.png`, one per iPhone size, drawn by `scripts/splash.cjs`; sizes in `src/app/splash-sizes.json`, wired in `src/app/layout.tsx` |

`public/data/exercises.json` is the exercise library as data for tools outside the app (not used
by the app itself, which bundles the library), see [../game/exercise-library.md](../game/exercise-library.md).

The game must keep working offline: the Fog's code is fetched while the Play tab is idle
(`PlayTab.tsx`) so a run can start with no network, and music is synthesized (no audio files).

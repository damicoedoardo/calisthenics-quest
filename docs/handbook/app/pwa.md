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
| Manifest | `src/app/manifest.ts`. `orientation: 'any'`: the installed app turns with the phone (the tabs have a sideways layout, see [screens.md](screens.md)) |
| Icons | `src/app/icon.svg`, `src/app/apple-icon.png`, `public/icon-*.png` (brand kit in the project's design files) |
| iOS splash screens | `public/splash/*.png`, one per iPhone size, drawn by `scripts/splash.cjs`; sizes in `src/app/splash-sizes.json`, wired in `src/app/layout.tsx`. Portrait only: opened sideways, no image matches and iOS shows none |

## Install before playing

After the prologue, a phone that runs FORMA in a browser tab has to install it before the game goes
on: `InstallGate` (`src/components/InstallGate.tsx`) takes the screen until FORMA is opened from the
home screen. A computer is not asked (its browser keeps the save). The opening itself always plays
in the browser.

| Piece | Where |
|---|---|
| Rules (pure, tested) | `src/lib/install.ts`: `platformOf(ua, touchPoints)` picks the guide (`ios-safari`, `ios-chrome` for Chrome or Edge on iPhone, `ios-other` for Firefox and apps' own browsers, `android`, `desktop`), `mustInstall`, `needsCarry`, and the hero code (`heroCode`, `readHeroCode`) |
| Browser side | `src/lib/install-client.ts`: `isStandalone()` (display-mode or `navigator.standalone`), `useInstall()`, and Chrome's `beforeinstallprompt`, caught as soon as the file loads |
| The guide | `InstallGate`: a numbered card per step with a pixel phone showing where to tap (sprite `installStep`, `src/sprites/characters/install.ts`). iPhone: copy your hero, Share (or ⋯ then Share), Add to Home Screen, open it. Android: the Install button when Chrome offers its prompt, otherwise ⋮ then Install app |
| Carrying the save on iPhones | A home-screen app on iOS has its own storage, apart from Safari's. The gate's "Copy my hero" puts the whole save on the clipboard as one line (`FORMA-HERO:` + base64 JSON); the installed app's first screen shows `BringHero` ("Paste my hero", via `Prologue`'s `bring` prop), which reads it back (or takes a pasted code if the clipboard can't be read). Android browsers share storage with what they install, so nothing is carried |

Never in `?sandbox`, unless `?gate=<platform>` asks for one guide (the `/lab/night` jumps). In
developer mode the gate has "Play here without installing", saved as `forma-install-skip` in
`localStorage`. To change the steps or their words, edit the `steps` list in `InstallGate`; to
move where a picture rings the button, its case in `install.ts` under `src/sprites/characters/`.

`public/data/exercises.json` is the exercise library as data for tools outside the app (not used
by the app itself, which bundles the library), see [../game/exercise-library.md](../game/exercise-library.md).

The game must keep working offline: the Fog's code is fetched while the Play tab is idle
(`PlayTab.tsx`) so a run can start with no network, and music is synthesized (no audio files).

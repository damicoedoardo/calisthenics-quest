---
type: conceptual
title: System map
description: One-page tour of the FORMA code — a client-only Next.js PWA with pure rules in lib/, content as data in story/ and sprites/, a Phaser game loaded on demand, and thin components.
tags: [architecture, overview, layers]
timestamp: 2026-10-27
---

# System map

FORMA is a Next.js 16 (App Router) app that runs entirely in the browser. There is no backend,
no API route and no database: one page (`src/app/page.tsx`) holds the whole app, the save is in
`localStorage`, and Vercel serves the static build. Stack: TypeScript (strict), React 18,
Tailwind 3, Phaser 3 for the Fog, Vitest for tests, pnpm.

```
src/
├── app/            Next.js routes: / (the app), /lab (sprite lab), /lab/story, /lab/music, /lab/night;
│                   layout (fonts, splash, service worker), manifest, icons, globals.css
├── components/     React screens and widgets. They play data and call rules; they own no rules or art
├── lib/            Pure rules and engines, no React (except store.ts and dev.ts hooks):
│                   game.ts (save shape, XP, quests, progression), program.ts (the built-in plan),
│                   stats.ts (stat points), gear.ts (classes, gear tiers), fog.ts (Fog rules), days.ts (calendar days),
│                   music.ts + music-zones.ts (chiptune engine and tracks), random.ts (seeded RNG),
│                   store.ts (load/save), dev.ts (developer mode)
├── story/          The six-month story as data, plus its engine (which scene is due, how a line reads)
├── sprites/        All pixel art as code: figure engine, palette, clips, registry, one file per character
├── game/           The Fog's game: rules.ts (shared numbers, sheet names), sheets.ts, calm.ts,
│                   dungeon/ (content data, pure engine, bot, Phaser scene, themes, props)
└── sim/            The season simulator: months of play in a second, for tests and balance
scripts/            Node tools: Fog simulator and balance, iOS splash drawing, TS loader for Node,
                    the handbook check
public/             sw.js (offline service worker), app icons, iOS splash screens
docs/handbook/      This handbook
```

## Layers and import direction

```
app/ ─► components/ ─► lib/ ◄─► story/
                       game/ ─► lib/, story/, sprites/
                       sprites/ ─► lib/gear (and types from lib/fog, game/dungeon)
```

`components/` may import anything. Below it, nothing imports a component or React, with two
known exceptions: the hooks in `lib/store.ts` and `lib/dev.ts`, and a type (`EnemyId`) that
`story/types.ts` takes from `components/Characters.tsx`. `lib/` and `story/` lean on each other
(the Fog's zones are written in the chapter files; the story reads the save), and `sprites/` reads
gear and a few ids, so keep those imports to types and pure functions.

- **Rules are pure.** `lib/`, `story/engine.ts`, `game/dungeon/engine.ts` and `sim/` take state and a
  `Date` (or a seed) and return new state. No React, no DOM, no `Math.random` where a replay matters
  (use `seeded` from `lib/random.ts`). That is what lets the simulators and snapshot tests run
  them headless.
- **Content is data.** Story lines, scenes, places, monsters, bosses, zones, music and sprites are
  data files. Components only play them, so changing content never means touching a component.
- **Art is code.** Components never draw art: they render `<Sprite id="..." />`. See
  [../game/sprites.md](../game/sprites.md).
- **Phaser loads only for a run.** `components/FogRun.tsx` and `PlayTab.tsx` `import()` the scene
  on demand; nothing else may import `game/dungeon/scene.ts` (types only).
- **One save, one writer.** Every change goes through `update(fn)` from `useGameState`. See
  [game-state.md](game-state.md).

## How the app runs

`page.tsx` loads the save, wraps everything in `LookProvider` (the player's look for every hero
sprite) and picks what is on screen: the opening until `profile.onboarded`, then the four tabs,
with full-screen layers over them (workout, after-session, scene, class picker, Fog run, dev
panel). Whenever the player is back on the tabs it asks `scenesToPlay` for the next due story
scene. See [../app/screens.md](../app/screens.md).

## Where things are deployed

Vercel project "forma" auto-deploys every branch push as a preview and `main` as production.
See [../dev/workflow.md](../dev/workflow.md) for the daily deploy limit.

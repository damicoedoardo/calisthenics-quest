---
name: updating-handbook
description: Use BEFORE every push in this repo — check whether docs/handbook/ pages covering the touched paths need updating (routing table inside; the pre-push hook and CI enforce it). Also use when asked to "update the handbook/wiki", add a handbook page, or document a part of the code. Owns the handbook's format rules and the path→page routing table.
---

# Updating the handbook

`docs/handbook/` is the map of FORMA that every agent reads before working. It stays useful only
if every change that makes a page false also fixes the page, in the same branch, before the push.
`scripts/handbook.mjs` enforces it: the git pre-push hook and CI run `lint` and `check`.

## Before every push

1. See what the branch touched: `git diff --name-only origin/main...HEAD`
2. Look up every touched path in the routing table below.
3. For each mapped page: read it; if your change makes any sentence false or incomplete (a file
   moved, a rule changed, a new screen, a new command, a new "how to change X"), fix the page and
   bump its `timestamp` to today.
4. If a page's `timestamp` is older than about a month, check the whole page against the code
   while you are there.
5. Run `pnpm handbook:lint && pnpm handbook:check` — both must say OK.
6. Nothing on the page changed? (a bug fix, a tweak of numbers the page doesn't state) Add a line
   `Handbook: none (<why>)` to your commit message instead. Use it honestly: it skips the check
   for the whole branch.

## Routing table (touched path → pages to check)

Paths are globs from the repo root; pages are under `docs/handbook/`. The check reads this table,
so keep every path and page in backticks, one row per line. `pnpm handbook:lint` fails when a
file in `src/`, `scripts/`, `public/`, `backend/`, `caddy/`, `.github/`, `.githooks/`, `.claude/` or a root config has
no row: give a new folder its row (and a page if no page fits).

| You touched | Check / update |
|---|---|
| `src/app/page.tsx`, `src/components/**`, `src/app/globals.css`, `tailwind.config.ts`, `postcss.config.js` | `app/screens.md` |
| `src/lib/game*.ts`, `src/lib/program.ts`, `src/lib/stats*.ts`, `src/lib/gear.ts`, `src/lib/days.ts` | `game/training.md`, `architecture/game-state.md` |
| `src/lib/store.ts` | `architecture/game-state.md` |
| `src/balance/**` | `game/balance.md` |
| `src/lib/fog*.ts`, `src/game/*.ts`, `src/components/FogRun.tsx`, `src/components/PlayTab.tsx` | `game/fog.md` |
| `src/game/dungeon/**` | `game/dungeon.md` |
| `src/lib/forge*.ts`, `src/components/FogGearCard.tsx` | `game/forge.md` |
| `src/story/**`, `src/components/{ScenePlayer,Dialogue,Place,Weather,BookOfDays,SitByFire}.tsx` | `game/story.md` |
| `src/sprites/**`, `src/components/{Sprite,Hero,Characters,Look,LookEditor}.tsx` | `game/sprites.md` |
| `src/exercises/**`, `scripts/import-exercises.mjs`, `scripts/export-exercises.mjs`, `src/components/ExerciseLibrary.tsx` | `game/exercise-library.md` |
| `src/lib/music*.ts`, `src/components/Sound.tsx`, `src/app/lab/music/**` | `game/sound.md` |
| `src/lib/dev*.ts`, `src/components/DevPanel.tsx`, `src/app/lab/**` | `app/dev-mode-and-labs.md` |
| `src/lib/install*.ts`, `src/components/InstallGate.tsx` | `app/pwa.md` |
| `public/**`, `src/components/ServiceWorker.tsx`, `src/app/layout.tsx`, `src/app/manifest.ts`, `src/app/*.{png,svg,json}`, `scripts/splash.cjs`, `next.config.ts` | `app/pwa.md` |
| `src/lib/random.ts`, `src/sim/**`, `scripts/fog-*`, `scripts/ts-hooks.mjs`, `vitest.config.ts` | `dev/testing.md` |
| `package.json`, `tsconfig.json`, `vercel.json`, `.github/**` | `dev/workflow.md` |
| `scripts/handbook.mjs`, `.githooks/**`, `.claude/**`, `.github/workflows/handbook.yml` | `dev/handbook.md` |
| `README.md` | `product/overview.md` |
| `backend/**`, `.github/workflows/backend.yml` | `backend/api.md` |
| `src/lib/cloud*.ts`, `src/components/Cloud.tsx` | `backend/cloud-sync.md` |
| `src/lib/friends*.ts`, `src/components/Friends.tsx`, `backend/app/*friends*.py`, `backend/app/routes/friends.py`, `backend/app/*gifts*.py`, `backend/app/routes/gifts.py` | `backend/friends.md` |
| `docker-compose*.yml`, `caddy/**`, `.env.example`, `scripts/deploy/**`, `.github/workflows/deploy-backend.yml` | `backend/server.md` |

Also update `product/overview.md` for any change a player would notice (a new tab, a new feature,
a change of direction), and `architecture/system-map.md` for a new top-level folder or a new
import between layers.

## Page format

Every page starts with:

    ---
    type: conceptual | reference | landing
    title: Short name
    description: One line — agents scan these without reading the page.
    tags: [area, subarea]
    timestamp: YYYY-MM-DD   # bump when you verify or edit the page
    ---

- One concept per file; the path is its identity. About one to three screens; split rather than grow.
- An `index.md` per folder, `type: landing`, navigation only.
- Relative links between pages; code paths in backticks from the repo root.
- Write what IS, in plain words. Where code is half-moved or messy, say so.
- The "how to change things" tables (I want to... → Edit) are the most used part: keep them.

## Link, never restate

These stay the authority; link to them, don't copy them into pages: `AGENTS.md` (conventions),
the code's own constants (don't copy numbers that change often), this skill (routing and format).

## Adding a page

1. Create it in the right folder with the frontmatter above.
2. Link it from that folder's `index.md` (and `docs/handbook/index.md` for a new folder).
3. Add or extend a routing row above so future changes find it.
4. `pnpm handbook:lint`.

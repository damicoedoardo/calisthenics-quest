---
type: reference
title: Workflow
description: Commands, branches and PRs, Vercel previews and production, the free plan's 100 deploys a day, and who says ship.
tags: [dev, workflow, git, vercel]
timestamp: 2026-10-27
---

# Workflow

## Commands (pnpm)

| Command | What |
|---|---|
| `pnpm install` | Install; also turns on the repo's git hooks (`prepare`) |
| `pnpm dev` | http://localhost:3000 (developer mode on) |
| `pnpm test` | Vitest: rules, story, sprites, Fog replays. `pnpm test -u` accepts snapshot changes you meant |
| `pnpm exec tsc --noEmit; echo $?` | Typecheck. Read the exit code: piping into `tail` hides it |
| `pnpm build` | Production build (also typechecks) |
| `pnpm sim`, `pnpm fog:sim`, `pnpm fog:tune`, `pnpm fog:balance` | Simulators, see [testing.md](testing.md) |
| `pnpm balance` | Rewrite the balance sheet `src/balance/sheet.md`, see [../game/balance.md](../game/balance.md) |
| `pnpm exercises:db` | Writes the exercise library to `public/data/exercises.json`, see [../game/exercise-library.md](../game/exercise-library.md) |
| `pnpm handbook:lint`, `pnpm handbook:check` | The handbook guard, see [handbook.md](handbook.md) |

## Branches and merging

- Work on a branch, never on `main`. Cloud sessions are already on their own branch.
- Open a PR into `main`. **Merging to `main` is production and needs Edoardo's explicit go.**
  The main app thread of the project owns merges; other threads feed it.
- Before pushing: tests pass, typecheck is clean, and the handbook is updated (the pre-push hook
  checks the last one).

## Vercel

Project "forma" deploys every pushed branch as a preview
(`forma-git-<branch>-edoardo-damicos-projects.vercel.app`) and `main` to
https://formaquest.app (the domain is on Vercel, which also holds its DNS) and
https://forma-nu-red.vercel.app.

**The team is on Vercel Pro since 2026-10-27; the free plan's 100 deployments a day ran out twice.** So: commit locally as much
as you like, push a branch once when it is ready, and batch fixes into one push.

## CI (GitHub Actions)

| Workflow | When | What |
|---|---|---|
| `handbook.yml` | every PR | the handbook guard ([handbook.md](handbook.md)) |
| `backend.yml` | PRs touching `backend/` | backend lint and tests ([../backend/api.md](../backend/api.md)) |
| `deploy-backend.yml` | `backend/` lands on `main` | tests, then the api image to GHCR; the server picks it up ([../backend/server.md](../backend/server.md)) |

The web app's tests (`pnpm test`) run locally before a push, not in CI.

## Showing work

Send Edoardo a preview link to the real app (with a `/lab/night` jump when useful), not a
standalone mockup. Don't change things he didn't ask for.

# FORMA

A training app played like a pixel-art RPG: real workouts earn, the Fog game spends. Installable
PWA, offline, no backend; the save lives on the phone. Next.js 16 (App Router), React 18,
TypeScript (strict), Tailwind 3, Phaser 3, Vitest, pnpm. Live at https://forma-nu-red.vercel.app.

## Handbook (read first, update before pushing)

`docs/handbook/` is the map of this codebase for agents and people: what the app is, how the code
is laid out, how each part works, and which file to edit for each kind of change. Start at
`docs/handbook/index.md`.

- **Read** the pages for the area you are about to touch before changing it. Deep context lives
  there, not in this file.
- **Search** before deciding something doesn't exist: `rg -i <word> docs/handbook src`.
- **Update before every push (mandatory)**: if your change makes a handbook sentence false or
  incomplete, fix the page in the same branch and bump its `timestamp`. Use the
  `updating-handbook` skill (`.claude/skills/updating-handbook/SKILL.md`): it owns the
  path→page routing table and the page format. Run `pnpm handbook:lint && pnpm handbook:check`.
  The pre-push hook and CI refuse a branch that skips this. If nothing on the pages changed, say
  so with a `Handbook: none (<why>)` line in a commit message.

## Repository structure

```
src/app/         Next.js routes: / (the whole app), /lab, /lab/story, /lab/music, /lab/night
src/components/  React screens; they play data and call rules, no rules or art of their own
src/lib/         Pure rules: save shape and XP (game.ts), skills, gear, Fog rules, days, music, store
src/story/       The six-month story as data, and its engine
src/sprites/     All pixel art as code, by sprite id
src/game/        The Fog: shared numbers, sprite sheets, dungeon/ (content, pure engine, bot, Phaser scene)
src/sim/         The season simulator
scripts/         Fog simulators, splash drawing, the handbook check
public/          Service worker, icons, iOS splash screens
docs/handbook/   The handbook
```

## Conventions

- **Rules are pure** and take `now: Date` or a seed; anything a replay or simulator runs uses
  `seeded()` (`src/lib/random.ts`) or an `rng` argument. No React or DOM below `src/components/`.
- **Content is data** (story, monsters, zones, music, sprites). Components only play it.
- **Art is code**: draw with `<Sprite id="..." />`, never in a component.
- **One save**: every change goes through `update(fn)` from `useGameState`. New save fields are
  optional or come with a `migrate()` step; a live save must always load.
- **Phaser only in a run**: `src/game/dungeon/scene.ts` is loaded with `import()`; import types only.
- TypeScript strict, no `any`. Path alias `@/` is `src/`.
- Comments and UI copy in plain, short words. Story words follow the rules in
  `docs/handbook/game/story.md` (no body talk, no numbers about the body).
- Icons: `lucide-react` or the pixel icons in `src/sprites/characters/icons.ts`. Colors and fonts
  from `tailwind.config.ts`. Respect `prefers-reduced-motion`.
- Change only what was asked. Don't remove or redesign things nobody asked about.

## Before pushing

```bash
pnpm test                          # rules, story, sprite fingerprints, Fog replays
pnpm exec tsc --noEmit; echo $?    # typecheck (read the exit code)
pnpm handbook:lint && pnpm handbook:check
```

Snapshot changes you meant: `pnpm test -u`, and say why in the PR.

## Git and deploys

- Never commit to `main`. Work on a branch, open a PR. **Merging to `main` is a production deploy
  and needs Edoardo's explicit go.**
- Vercel deploys every pushed branch, and the free plan allows **100 deploys a day**. Commit
  locally, push once when ready, batch fixes into one push.
- Show work as a Vercel preview of the real app (with a `/lab/night` jump when useful), not a
  standalone mockup.

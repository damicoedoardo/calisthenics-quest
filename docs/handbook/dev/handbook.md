---
type: reference
title: Keeping the handbook true
description: The rule that every push updates the handbook, and how it is enforced — the updating-handbook skill's routing table, scripts/handbook.mjs lint and check, the pre-push hook, CI, and the "Handbook: none" escape.
tags: [dev, handbook, docs, ci]
timestamp: 2026-10-27
---

# Keeping the handbook true

**Rule: a branch that changes code also updates the handbook pages about that code, before it
is pushed.** Same idea as Minlit's handbook, with one step more: here it is checked on every push.

## The pieces

| Piece | What it does |
|---|---|
| `AGENTS.md` / `CLAUDE.md` | Tell every agent to read the handbook first and update it before pushing |
| `.claude/skills/updating-handbook/SKILL.md` | The how-to and the **routing table**: which pages cover which paths |
| `scripts/handbook.mjs lint` | Frontmatter, `index.md` in every folder, every page linked from an index, no broken links, every routed page exists, and **every file in the code has a row** in the routing table |
| `scripts/handbook.mjs check [base]` | For every file the branch touched since `base` (default `origin/main`), at least one of its routed pages was touched too |
| `.githooks/pre-push` | Runs lint and check before every `git push`; a failure stops the push |
| `.github/workflows/handbook.yml` | Runs the same on every pull request into `main` |

## Turning the hook on

`pnpm install` runs `prepare`, which sets `git config core.hooksPath .githooks`. Cloud agent
sessions get it from the SessionStart hook in `.claude/settings.json`. Check with
`git config core.hooksPath` (prints `.githooks`).

## When the check fails

It prints each touched file with the pages that cover it. Read them, fix what your change made
false, bump `timestamp`, commit, push again. If truly nothing on those pages changed, add
`Handbook: none (<why>)` on its own line in a commit message. CI shows the same result on the PR,
so a skipped page is visible to the reviewer.

`git push --no-verify` skips the hook, but CI still fails the PR. Don't.

## Adding a folder or file the table doesn't know

`lint` covers `src/`, `scripts/`, `public/`, `backend/`, `caddy/`, `.github/`, `.githooks/`,
`.claude/`, root config files (`.ts`, `.js`, `.json`, `.yml`) and `.env.example` (`COVERED` in
`scripts/handbook.mjs`). A file there with no row fails with "no row in the routing table". Add a row to the skill's table pointing at the
closest page, or write a new page (see the skill's "Adding a page"). A folder's old README moves
into its page and leaves a one-line pointer (as `src/sprites/README.md` and `src/exercises/README.md` do).

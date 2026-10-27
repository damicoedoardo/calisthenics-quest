---
type: landing
title: FORMA Handbook
description: The map of the FORMA codebase — the single entry point for every AI agent and engineer before they touch the code.
tags: [handbook, navigation]
timestamp: 2026-10-27
---

# FORMA Handbook

`docs/handbook/` is the map of FORMA: what the app is, how the code is laid out, how each part
works, and where to change what. It follows the same format as Minlit's handbook: one concept per
file, an `index.md` per folder, and relative links between pages.

**Every agent reads this before working**, and **every change updates it before pushing**. The
pre-push hook and CI refuse a branch whose code changed under a page that didn't (see
[dev/handbook.md](dev/handbook.md)). That is what keeps the repo clean: the map is never older
than the code.

## First read

1. [Product overview](product/overview.md): what FORMA is, the four tabs, where it's heading
2. [System map](architecture/system-map.md): the one-page tour of the code and its layers
3. [Game state](architecture/game-state.md): the one save everything reads and writes
4. [Workflow](dev/workflow.md): commands, branches, previews, the Vercel deploy limit
5. Then the part you're working on, below

## Page map

- [Product](product/index.md): what FORMA is and who it's for
- [Architecture](architecture/index.md): the layers, the save, the rules between them
- [App](app/index.md): the screens and how they hand off, the installable offline app, developer mode and the labs
- [Game](game/index.md): training rules, story, the Fog, sprites, music
- [Dev](dev/index.md): workflow, tests and simulators, keeping this handbook true

## Conventions

The handbook explains what the code is and why. For how we work, the authority is
[`AGENTS.md`](../../AGENTS.md) (read by Claude through `CLAUDE.md`). Link to it; don't copy it here.

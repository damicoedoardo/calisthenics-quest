---
type: reference
title: Exercise library
description: The 887-exercise library (free-exercise-db plus FORMA's own) as a searchable database for a coach — fields, kinds and movement families, findExercises, the JSON export, pixel demos, tips and common mistakes, and where to edit what.
tags: [game, exercises, library, coach, data]
timestamp: 2026-10-28
---

# Exercise library

Code: `src/exercises/`. Shown in the app from the Train tab ("Exercise library",
`src/components/ExerciseLibrary.tsx`): search, filters for equipment, kind (stretch, mobility...)
and movement, and per exercise the boy and girl demo, how-to steps, "Do it well" tips and common
mistakes. Held sideways, the search and filters share one line, the list has two columns, and an
exercise shows its demos and facts beside the how-to.
The exercise page is `ExerciseDetail.tsx`; tapping any workout card on Today or the Train tab
opens it too (`ExerciseSheet`: the card's exercise by id, else the plainest one with its demo).

891 exercises: the open catalog [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(public domain) plus the FORMA program's own moves and four runs for the coach (`RUNS` in `library.ts`). Every one has a pixel demo (boy and girl) and
coaching. Built so a coach (a person, a script, or an LLM) can find exercises and put sessions
together.

## Where it lives

| File | What |
| --- | --- |
| `src/exercises/catalog.json` | The catalog as imported. Refresh: `node scripts/import-exercises.mjs` |
| `src/exercises/classify.ts` | Which pixel demo and gear show each catalog exercise (name rules, then overrides) |
| `src/exercises/coaching.ts` | Per movement: family, region, kind, form tips, common mistakes |
| `src/exercises/library.ts` | `loadLibrary()` joins it all; `findExercises()` and `exerciseById()` search it |
| `src/exercises/export.ts` | The JSON export; `pnpm exercises:db` writes `public/data/exercises.json` |

In the app, the same file is served at `/data/exercises.json`.

## Fields of an exercise

| Field | Values |
| --- | --- |
| `id` | Catalog id (`Barbell_Squat`) or `forma:<id>` for FORMA's own |
| `name` | Display name |
| `kind` | What it's for in a session: `strength`, `power`, `plyometric`, `cardio`, `stretch`, `mobility` |
| `family` | Movement pattern: `squat`, `hinge`, `lunge`, `push-horizontal`, `push-vertical`, `pull-horizontal`, `pull-vertical`, `arms`, `shoulders`, `legs-isolation`, `core`, `carry`, `power`, `plyometric`, `cardio`, `stretch`, `mobility` |
| `region` | `upper`, `lower`, `core`, `full` |
| `level` | `beginner`, `intermediate`, `expert` |
| `equipment` | What you need: `body only`, `dumbbell`, `barbell`, `kettlebells`, `cable`, `machine`, `bands`, `medicine ball`, `exercise ball`, `foam roll`, `e-z curl bar`, `other` |
| `kit` | The gear the demo shows |
| `category` | The catalog's own grouping (`strength`, `stretching`, `plyometrics`, `cardio`, `powerlifting`, `olympic weightlifting`, `strongman`) |
| `force`, `mechanic` | `push` / `pull` / `static`; `compound` / `isolation` (may be null) |
| `primary`, `secondary` | Muscles: abdominals, abductors, adductors, biceps, calves, chest, forearms, glutes, hamstrings, lats, lower back, middle back, neck, quadriceps, shoulders, traps, triceps |
| `steps` | How to do it (a few catalog entries have none) |
| `tips`, `mistakes` | Form tips and common mistakes, shared by every exercise with the same demo |
| `demo` | The pixel demo id (`src/sprites/characters/exercise.ts`, see [sprites.md](sprites.md)) |

## Building a session

- Warm-up: `kind` `mobility` (plus easy `cardio`).
- Main work: pick by `family` so the session is balanced, e.g. a `squat` or `lunge`, a `hinge`, a
  push and a pull, then `core`. Filter by `equipment` the person has and `level`.
- Cool-down: `kind` `stretch` for the `primary` muscles that were trained.

```ts
const all = await loadLibrary();
findExercises(all, { family: 'hinge', equipment: ['body only', 'dumbbell'], maxLevel: 'beginner' });
findExercises(all, { kind: 'stretch', muscles: ['hamstrings'] });
```

## How to change things

| I want to... | Edit |
| --- | --- |
| Refresh the catalog from free-exercise-db | `node scripts/import-exercises.mjs`, then `pnpm exercises:db` |
| Change which demo or gear an exercise shows | a rule in `RULES` or an entry in `OVERRIDES` (`src/exercises/classify.ts`); program moves are in `PROGRAM` |
| Change a movement's tips, mistakes, family, region or kind | its entry in `COACHING` (`src/exercises/coaching.ts`) |
| Add a movement (a new pixel demo) | `MOVES` and `frame` in `src/sprites/characters/moves.ts`, its `COACHING` entry, then a rule in `classify.ts` |
| Add an exercise the catalog lacks | `OWN` in `src/exercises/library.ts` |
| Add a field to the database | `LibraryExercise` (`library.ts`), `exportLibrary` (`export.ts`), the table above |

After any of these run `pnpm exercises:db`: `src/exercises/library.test.ts` fails when
`public/data/exercises.json` is out of date. It also checks every exercise has a real demo and
coaching, and that `findExercises` filters the way a coach asks.

Known limits: tips and mistakes are per movement, so close variants share them (a lying hamstring
stretch gets the seated one's tips). Demos are sorted by name rules, so a few odd catalog names
may show a near movement.

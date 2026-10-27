# Exercise library

887 exercises: the open catalog [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(public domain) plus the FORMA program's own moves. Every one has a pixel demo (boy and girl) and
coaching. Built so a coach (a person, a script, or an LLM) can find exercises and put sessions
together.

## Where it lives

| File | What |
| --- | --- |
| `catalog.json` | The catalog as imported. Refresh: `node scripts/import-exercises.mjs` |
| `classify.ts` | Which pixel demo and gear show each catalog exercise (name rules, then overrides) |
| `coaching.ts` | Per movement: family, region, kind, form tips, common mistakes |
| `library.ts` | `loadLibrary()` joins it all; `findExercises()` and `exerciseById()` search it |
| `export.ts` | The JSON export; `pnpm exercises:db` writes `public/data/exercises.json` |

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
| `demo` | The pixel demo id (`src/sprites/characters/exercise.ts`) |

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

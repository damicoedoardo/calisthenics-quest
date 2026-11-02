---
type: reference
title: Exercise library
description: The 887-exercise library (free-exercise-db plus FORMA's own) as a searchable database for a coach — fields, kinds and movement families, findExercises, the JSON export, pixel demos, tips and common mistakes, YouTube how-to videos, and where to edit what.
tags: [game, exercises, library, coach, data]
timestamp: 2026-11-01
---

# Exercise library

Code: `src/exercises/`. Shown in the app from the Train tab ("Exercise library",
`src/components/ExerciseLibrary.tsx`): search, filters for equipment, kind (stretch, mobility...)
and movement. The exercise page is kept to what helps you do it (Edoardo 2026-11-01: just the
video and the do's and don'ts): the how-to video (below), or your pixel demo for an exercise with no
video; then "Do it well" tips and "Avoid" (common mistakes); the catalog's long steps folded under
"Step by step". Muscles, equipment and level stay in the library's list rows and filters. Held
sideways, the search and filters share one line, the list has two columns, and an exercise shows
the video beside the rest.
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
| `src/exercises/videos.ts` | `VIDEOS`: a hand-picked YouTube how-to video per exercise id; `videoOf` (hand pick, else the finder's), `videoSearchUrl` |
| `scripts/find-videos.mjs`, `scripts/find-videos-channels.mjs`, `src/exercises/videos.found.json` | The video finders (search; channel lists with an API key) and what they found |
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

## How-to videos

When the exercise has a pick in `VIDEOS` (`src/exercises/videos.ts`), the exercise page shows
the YouTube player itself (from `youtube-nocookie.com`, no autoplay): one tap plays it in the
card. An "Open on YouTube" link sits under it. An exercise without a pick shows "Find a how-to
video on YouTube", a YouTube search for its name.

A link straight to one card: `/?exercise=<library id>` (for example `/?exercise=Goblet_Squat`)
opens the Train tab with the library on that exercise (`page.tsx` picks the tab, `TrainTab`
passes `start` to `ExerciseLibrary`).

The picks cover every exercise the coach plans with (the `STAPLES`, warm-up moves and cool-down
stretches in `src/lib/coach/staples.ts`, and FORMA's own moves): 145 of 146. The one gap is
`All_Fours_Quad_Stretch`. The other ~745 catalog exercises get the video `scripts/find-videos.mjs`
found (`src/exercises/videos.found.json`; a hand pick always wins): it reads YouTube's public
search page, no key, 8 lookups at a time (`--jobs N`), and takes a Bodybuilding.com clip of that name first, then an OPEX /
"(Exercise Library)" demo, then the first short plain video (under 4 minutes) whose title shares
the exercise's main words. Run it with `node scripts/find-videos.mjs` on a machine that can reach
YouTube (the cloud machine can't); it keeps what it found before and only looks up the rest. `scripts/find-videos-channels.mjs` is the quick way when YouTube throttles the search: with a
YouTube Data API key (`YOUTUBE_API_KEY` in the environment or the git-ignored `.env.local`, never
committed) it reads every upload of the Bodybuilding.com and OPEX channels (1 quota unit per 50
videos), or with yt-dlp when there is no key, and matches names locally; a match needs the name's words in the title and the title's
words in the name. The first full run (2026-11-01) found 718 of the 746, about two thirds of them Bodybuilding.com clips; 22 wrong matches were removed by hand. An exercise it missed still gets the search. Each pick was chosen by
hand from web search results for that move. Prefer a short, clean demo with no talk: about half
are the Bodybuilding.com clips (the catalog came from that site, so names match) or the OPEX and
"(Exercise Library)" demos; the rest (machines, bands, cardio, warm-up circles, stretches) are
short plain tutorials, not Shorts. The cloud
machine can't reach YouTube, so titles were not re-checked against the live video. A removed
video shows YouTube's own "unavailable" box, and the YouTube link still works.
`src/exercises/videos.test.ts` checks each pick is a real library id with a well-formed video id,
and that every planned exercise has one.

## How to change things

| I want to... | Edit |
| --- | --- |
| Refresh the catalog from free-exercise-db | `node scripts/import-exercises.mjs`, then `pnpm exercises:db` |
| Change which demo or gear an exercise shows | a rule in `RULES` or an entry in `OVERRIDES` (`src/exercises/classify.ts`); program moves are in `PROGRAM` |
| Change a movement's tips, mistakes, family, region or kind | its entry in `COACHING` (`src/exercises/coaching.ts`) |
| Add a movement (a new pixel demo) | `MOVES` and `frame` in `src/sprites/characters/moves.ts`, its `COACHING` entry, then a rule in `classify.ts` |
| Add or change an exercise's how-to video | its entry in `VIDEOS` (`src/exercises/videos.ts`): library id, the `v=` id from the watch link, the title |
| Add an exercise the catalog lacks | `OWN` in `src/exercises/library.ts` |
| Add a field to the database | `LibraryExercise` (`library.ts`), `exportLibrary` (`export.ts`), the table above |

After any of these run `pnpm exercises:db`: `src/exercises/library.test.ts` fails when
`public/data/exercises.json` is out of date. It also checks every exercise has a real demo and
coaching, and that `findExercises` filters the way a coach asks.

Known limits: tips and mistakes are per movement, so close variants share them (a lying hamstring
stretch gets the seated one's tips). Demos are sorted by name rules, so a few odd catalog names
may show a near movement.

---
type: reference
title: The coach (workout planner)
description: The coach in src/lib/coach — your flame as an LLM coach you chat with (the week it plans, the one place every workout lives; the chat loop, its tools run on the phone, the fuzzy exercise search, the server relay), the laws (the nine rules always true, laws.ts) and the player's own rules, the craft of a workout as defaults (warm-up, main, accessory, core, cool-down; the training playbook the coach reads; the time estimate), the three-layer memory (profile, training log, notes), the flame speaking first (nudges), the built-in coach that builds workouts for gym, calisthenics, running or a mix, easier and swap choices, the guardrails every workout passes, and the screens that play it.
tags: [game, training, coach, planner, memory, llm]
timestamp: 2026-11-01
---

# The coach

The coach is your flame (Ember, or the name you gave it). You chat with it: it asks where you
start and what you want, plans your **week** of workouts, and changes it when you say so. It
pushes back, kindly, when what you say doesn't add up, and it speaks first when there is
something to say. It is an LLM (on
the server, [../backend/api.md](../backend/api.md)) that works through tools here on the phone:
it may only pick exercises from the library, and every workout it makes passes the same checks as
the **built-in coach**, the plain-rules builder that runs offline, before setup and as its
starting draft. The rule for both: **the coach chooses, the code keeps the facts and the
numbers.** Three strengths of rule: the **laws** (a few, in code, always true), **your rules**
(what you asked for every week), and **defaults** (everything else, a good trainer's habits). XP, stat points and story never depend on what the coach planned.

Code: `src/lib/coach/` (pure, tested in `coach.test.ts`, `chat.test.ts`, `craft.test.ts`, `laws.test.ts` and `week.test.ts`). Numbers:
`src/balance/coach.ts`. Screens: `CoachChat.tsx` (the Train tab's coach and the chat),
the workout's overview and choices in `Workout.tsx`, `useCoach.ts`
(keeps a week ready, runs the chat). How to do each exercise: `ExerciseDetail.tsx`.

## The week: the one place a workout lives (`week.ts`)

`coach.week` (`CoachWeek`): **two calendar weeks**, this one and the next, Monday to Sunday.
`start` is the day it was planned (days before it aren't part of the plan), `by` (built-in or
coach), its workout days of both weeks (`CoachDay`: a date, a `CoachPlan`, `done` once trained),
and `ahead` once next week's days are planned. Why two (Edoardo 2026-11-01): at the end of a week
you should already see, and plan, the next one. `weekOf(week, date)` says which week a day is in
(0 or 1), `daysIn(week, which)` its days, `weekSlots(week, which)` its seven slots, `lastDay` next
week's Sunday. **Every reader goes through it**: `currentPlan(coach)` is the first day not done,
whatever its date and week (a missed day moves along, it isn't lost; with this week all done it
is next week's first). Today's quest (`todaysQuest`), the workout screen, the Train tab and the
coach all read it; every change is written to a day (`setDay`, `setPlan` for the next one), any
day from today to next week's Sunday (`openDate`).

- **Planned**: `buildWeek` spreads your days a week from today to Sunday (`WEEK_SPREAD`; late in
  the week fewer fit, one every other day, `weekDates`), each day's
  workout built knowing the days before it (modes and A/B days take turns); `buildNextWeek` does
  the same for next week, after this week's days. `useCoachPlan` calls `planAhead` whenever
  `needsPlan` (no week, the week is over, or next week isn't planned yet; an old save without
  `ahead` gets its next week on load). On a new Monday (`weekOver`), last week's next week becomes
  this week exactly as it was planned and shown (`start` is that Monday; nothing is re-planned
  behind your back, and a workout missed last week isn't carried over). Then a new next week is
  drafted behind it. After a week or more away the plan starts fresh from today.
- **Shown**: screens show one week (`shownWeek`): this week, or next week the moment this
  week's last workout is done (it is already drafted, so it is there at once). The flame says so
  (the `weekdone:<Monday>` nudge) and the Train tab puts a "Week done" card over it: Looks good, or
  Change it (opens the chat). Today's done card says "Week done · your next week is ready". Missed
  workouts: the week turns over on Monday as usual. The coach replaces a week with `set_week` (`week` "this" or
  "next") or one day with `set_workout`.
- **What today is** (`todayIs(state, now)`): the one answer every screen reads, so Today and
  Train never disagree. `workout`: the next workout's day has come (a missed one is caught up);
  `done`: you trained today, and the next waits for another day (one workout a day); `rest`:
  nothing to start today (`next` is the workout ahead); `none`: no week yet. Today's quest, rest
  card and lock, the Train tab's opening day and Start, `start` in `page.tsx` (`startsToday`) and
  the flame's rest lines (`isRestToday`; before any week, the day or two after a workout) all come
  from it.
- **Done**: `finishSession` marks the next day done (`markDone`) and moves levels.
- **Old saves** had one `coach.plan`; `migrate` turns it into a week of one day (`fromLegacy`).

## Following how it goes (`feedback.ts`)

Edoardo 2026-11-01: the coach should plan from how you really train, and it should be the AI that
decides, not fixed rules ("more dynamic"). So the code only keeps the facts and hands them over;
nothing changes a plan on its own.

- **What the log keeps** (on each session): every set's reps (and kg) and how it felt (Easy 4+,
  Just right 2-3, Very hard 0-1) against the target, the sets done of those planned (`of` on an
  entry), exercises not started (`left`), how the workout felt and your word after it, a rough
  day (`checkin`), and how long it really took (`minutes`, from the workout's clock) next to the
  estimate (`planned`).
- **The brief** carries the last workouts in a line each (`8h/8h/6h of 8 (3 of 4 sets)`, the
  minutes, not started, a rough day) and "How training is going" (`goingLines`: how many were
  heavy and in a row, how many felt easy, how many ended unfinished, the pace next to the
  estimate, `paceOf`, and planned workouts still waiting, `waiting`). Facts only.
- **The `workout_log` tool** (`workoutLog`): the last workouts in full, every exercise and set, or
  only those with one exercise (`exercise`). The rules on the server tell the coach to read it
  before planning or changing a week and to decide from it, like a trainer: more where it was
  easy, less or an easier move where it was very hard or not finished, a lighter week when worn
  out, fewer moves when workouts run long, fewer days when workouts wait, and to say in a line
  what it saw and changed.
- The built-in coach's next-week draft doesn't read it (plain rules); talking to the flame, or
  Change it on the Week done card, has the coach redo it from the log.

## Rest days

Every day of the week without a workout is a rest day, and it is part of the plan: you keep it by
sitting by the fire that day (the day's page, `restKept`; Today's rest card or the Train tab).
A kept rest day shows ✓ in the week, the brief tells the coach which were kept, and that day's
Fog runs start Rested (`isRested`). A week runs to its Sunday even when every workout is done
(`weekOver`), so its rest days still come. No XP or story heart for a rest day yet.

## Rests

Each item may carry `rest` (seconds after a set), set by the coach in the chat (clamped to
`REST.min`-`REST.max`); without one, `restFor` (`time.ts`) rests by role: a weighted main lift
`REST.heavy`, another main move `REST.main`, an accessory `REST.accessory`, core `REST.core`. The
rest screen counts that down, and the time estimate uses the same rule.

## Laws, your rules, defaults (`laws.ts`)

Ember may plan anything you ask except what breaks a law. Why so few: the research behind this
(design doc "FORMA coach: few laws, everything else yours") found that products keep training
rules in code, rules only in a prompt get broken (most by cheap models), and only a few training
rules are both well supported and about safety; the rest are habits, kept as defaults.

- **The nine laws** (`LAW_LIST`, numbers in `LAWS` and `MAX_SETS_PER_FAMILY`, `TIME_SLACK`):
  1 a warm-up first (`warmupSec`), 2 never to failure (by design: no target asks for it), 3
  nothing on a sore spot, 4 at most `MAX_SETS_PER_FAMILY` hard sets of a family in a workout, 5 at
  most `weekSets` in a week, 6 no family (main or accessory work; core may be daily) two days
  running and at most `maxDays` workout days, 7 a comeback (`comingBack`: `comebackDays` off) drops
  `comebackCut` of the sets for `comebackWeek` days, 8 no run more than `runSpike` longer than the
  longest of `runWindowDays` (`longestRun`), 9 about your minutes.
- **Workout laws** (1, 3, 4, 7, 8, 9) are fixed by `validate` on every workout, and said.
  **Week laws** (5, 6: `weekBreaks`) are checked before `set_week`, `set_workout` or
  `move_workout` saves: a change that adds a break is **not saved**, and the coach reads the
  breaks with their fixes ("Not saved: … (law 6)"), tells you which law and why, and offers a
  lawful plan. The built-in week keeps them too: the day after a workout trains other families
  (`rested` in `buildWorkout`, filled from `FILL`).
- **Your rules**: a note of type `rule` ("deadlift on Mondays", "push pull legs", "no stretching"),
  saved by the coach with `add_note` when you say something should always or never happen. They
  come first in the brief ("Their rules"), are never dropped for room, can be forgotten in "What I
  know", and a rule that starts with no/never/without/skip keeps matching exercises out (like a
  dislike, `excluded`). A law beats a rule.
- **Defaults**: everything else, below. `validate` only notes where a workout leaves one ("note:
  the usual order…", "note: no cool-down"), fine if you asked.

## The craft of a workout (`craft.ts`)

How a trainer builds a session, as data, so the built-in coach and the LLM build alike. These are
defaults: only the warm-up is a law.

- **Five blocks, in order** (`BLOCKS`; roles in `SlotRole`): `warmup` (about 5 minutes: easy
  cardio, circles for the day's joints, a dynamic whole-body move), `main` (the compound moves or
  the hard skill, freshest first), `accessory` (lighter moves the main work left out, 10-15 reps),
  `core` (one move), `stretch` (the cool-down: static stretches for what was trained most; shown
  as "Cool-down"; optional by the evidence). `validate` notes a different order, never forces it.
- **Ramp-up sets** (`ramp` on an item): light sets before the first weighted lift, not logged; the
  workout screen says so on its first set, the cards show "2 light first".
- **The playbook** (`PLAYBOOK`, `askTraining`): the trainer's know-how in short topics (the
  session, warm-up, main work, accessories, core, cool-down, progression, splits, body weight
  ladders, coming back after a break, fitting the minutes, running), numbers read from
  `src/balance`. The LLM reads it with the `training_guide` tool before it plans, and every answer
  ends with the laws (a topic "laws" gives only them); the rules on the server say the same in
  short.

## The time a workout takes (`time.ts`)

`minutesOf(items)` is the "about N min" on the Train tab, the workout overview, the nudges and the
guardrail. Per exercise (`secondsOf`): each set's work (reps at `TIME.rep` seconds, `TIME.weightedRep`
with a weight, or the hold) plus its rest (`restFor`), set-up (`TIME.setup`, `TIME.setupWeighted`),
ramp-up sets; a warm-up or stretch part is its seconds plus `TIME.change`. Skipped items don't count.

## The chat (`chat.ts`, `tools.ts`)

- **One turn** (`coachTurn`): your words go into `coach.chat`; the phone sends the coach brief and
  the chat to `POST /coach` (`coach-client.ts`); the model answers, maybe calling tools; the phone
  runs them (`runTool`), adds their results, and asks again, at most `MAX_ROUNDS` times, until the
  model answers in words. An empty chat starts with `OPENER` (never shown), so the flame speaks first.
- **The chat in the save**: OpenAI style messages, the last `CHAT_KEEP` (`trimChat`, always from
  something you said). Older talk lives on as notes and the log.
- **Tools** (the list and the rules are on the server, `backend/app/coach.py`; they run here):
  `find_exercises` (the fuzzy search below, only what your gear and sore spots allow),
  `workout_log` (past workouts in full, above), `draft_week` (the built-in coach's week, this or `week` "next", a start to change), `training_guide` (the playbook, above), `show_week` (both weeks, and the next
  workout in full), `set_week` (one week, `week` "this" from today or "next": every workout day, a weekday,
  today/tomorrow or a date; workouts done and the other week stay), days anywhere from today to next
  week's Sunday (`resolveDay`: a weekday is the first one coming, "next tue" is next week's), `move_workout` (a day's workout to another
  day, across the two weeks too; onto a workout day the two swap, `moveDay`), `rest_day` (a day's workout off the week,
  `restDay`), `set_workout` (one day, a rest day to come gets a workout, else the next; ids, roles,
  sets, reps or seconds, rest, run minutes; the app fills names, demos, easier and swap, builds run
  steps, and runs `validate`, then says what it fixed), `save_profile` (setup, or one change with `why`,
  written to `history`), `add_note` / `remove_note`, `game_guide` (how the game works, below), and `suggest_replies` (the taps under its
  message; it ends the turn). Every input is checked again; bad values are dropped and said.
- **Search** (`search.ts`): words in any order, typos and plurals forgiven ("pushups", "dumbell
  row"), everyday words mapped to the library's ("abs", "chest", "legs"); staples first.
- **Agreed changes**: the plan changes only by talking. `set_week`, `set_workout` and
  `move_workout` return a heads-up from `weekWarnings` (the same muscles on days in a row, three
  days in a row); the rules on the server tell the coach to check a change against the brief, push
  back when it isn't wise, and change the plan only once the two agree.
- **Who it is**: the brief names the flame and the player, its form now and only the next one
  (`flameStage`, the same stages the story draws; the later forms are the story's to show) and where the story is (chapter, lesson, the enemy's hearts left,
  `storyState`), so it speaks from there. Its voice: an old fire, a little spooky and a little
  superior (it teases excuses, never the person), deeply on your side, and plainly kind when you
  hurt; the nudges speak the same way. The rules (short, one question at a time, no body
  talk, not a doctor, honest: push back on what isn't wise or doesn't match the log, and suggest
  better) are fixed on the server.
- **It speaks first** (`nudge.ts`): `coachNudge` picks one thing worth saying from the save (a
  missed day, a new week, a rest day to keep, the chapter's enemy one workout from beaten, a workout done, today's
  workout). Until heard it shows on the flame's card with a dot on the Train tab; opening the chat
  says it there (`hearNudge`, kept in `coach.heard`), or an empty chat opens on it from the coach.
- **Sign-in**: the app can't be used without an account (`SignInGate`), so the chat always can
  talk; setup happens only in the chat (the quick taps are gone).

## The game guide (`guide.ts`)

Players ask the coach how the game works ("what are embers for?", "can I lose my +10 sword?",
"how do I beat Tomorrow?"). It answers from the game guide, its only source on the game, through
the `game_guide` tool, and the rules on the server tell it never to guess and never to spoil.

- **Topics as data** (`GUIDE`): one per part of the game (the loop, XP, stat points, crits and
  bonuses, items, falling and the vault, the forge to +5 and past it, sweat coins, classes, the
  Fog, chapters, rest days, friends, the flame, SPs, one per zone, and the player's purse). Each
  has `words` a question might use, `text(state, now)` built from `src/balance` and the rules in
  `src/lib` (never a number typed in), so a balance change is in the guide the moment it lands,
  and the player's own numbers (embers, points, level, materials).
- **No spoilers** (`opens`): a topic can be ahead of the player. The SP topic opens once the
  Wanderer gave the first (`state.sp`) and lists only the SPs owned; a zone's topic (its boss and
  the rule that beats it, `hint`) once the zone is open; the flame topic names only the next form;
  the story topic only the chapter you're in. `askGuide` hands the coach the best few topics
  reached; when the best fit is still ahead it says only "Ahead", so the coach can't tell what
  it never sees. An empty question lists the topics reached (`guideIndex`).
- **Kept in sync** (`guide.test.ts`): every file in `src/balance/` is in some topic's `from` or in
  `BEHIND_THE_SCENES` with a reason; every reached topic writes without holes; a new player's
  guide never names a later zone, boss, chapter, SP or flame form; numbers match the balance.

## Memory: three layers

All of it lives in the save (`state.coach`, optional: saves without it play the built-in plan).

| Layer | Where | Who writes it |
|---|---|---|
| **Profile**: modes, goal, days, minutes, gear, experience, a level 1-5 per pattern (push, pull, squat, hinge, core, run), what to spare, and `history` of every change | `coach.profile` (`CoachProfile` in `types.ts`) | setup (the chat or the taps); levels move with your workouts (`levels.ts`); the coach changes a named field with a reason (`save_profile`) |
| **Training log**: sessions with sets (reps or seconds, reps in the tank, optional kg and km), each entry's name and family, the mode, who planned it, what you skipped or changed, how it felt | `state.sessions` | only the app |
| **Notes**: short typed sentences (`rule`, `like`, `dislike`, `pain`, `life`, `goal`, `other`), dated, optionally until a date, at most `MAX_NOTES` (a pain note or a rule is never dropped for room) | `coach.notes` (`notes.ts`) | you at setup; the coach in the chat |

Plus `coach.week`: the planned week (above). Today's quest (`todaysQuest` in `game.ts`) plays its
next day when there is one, else the built-in plan. `finishSession` writes the plan's mode, changes
and skips on the session, marks the day done, and moves levels (`shiftLevels`).

**Levels**: setup sets them from tap answers ("I don't know" starts low, `setup.ts`); after
`LEVEL_SHIFT.window` workouts of a pattern since it last moved, most sets easy (4+ left) moves it
up one, most very hard (0-1) down one. A level from your workouts shows a ✓ on the Train tab.

**The coach brief** (`brief.ts`): one plain-text page built from the save on every call — profile,
the flame's form and the story, notes with ids, the week day by day, the last 10 workouts in a line each (each set's reps and feel, the target, sets done of planned, minutes), how training is going (above), days since each pattern, this week's count.
This is what the LLM reads; it never reads or writes the save itself, only through the tools.

## Building a workout (`generate.ts`)

`buildWorkout({ all, coach, sessions, now, rng })`, seeded, same input same workout.

- **Mode**: the one asked for, else of your modes the one done longest ago (`nextMode`): a mix
  takes turns.
- **Gym and calisthenics**: the five blocks. Warm-up (`warmupFor`: `WARMUP_MOVES` in
  `staples.ts`, a rower or jumping jacks, circles for an upper and a lower day, a dynamic move;
  `WARMUP_SEC`), the day's main families (`DAYS[mode][A|B].main`, `MAIN_MOVES[minutes]` of them;
  the first weighted one gets `RAMP.sets` ramp-up sets), its accessories (`DAYS...accessory`,
  `ACCESSORY_MOVES[minutes]`, `ACCESSORY_DOSE`, isolation preferred), one core move, and the
  cool-down (`cooldownFor`: `COOLDOWN.stretches[minutes]` static stretches, `STRETCHES` per muscle,
  never a moving one, `MOVING_STRETCH`). Calisthenics uses body weight and bands only; no bar turns
  pull-ups into rows.
- **Picking an exercise**: from the library, in the family, with your gear (`usable`), at most the
  library level your pattern level reaches (`maxLevelFor`), not on a sore spot (`spares`) or a
  dislike note's words, and hard body-weight moves only from their level (`NEEDS_LEVEL`). Then it
  prefers the **staples** (`staples.ts`: the well-known moves of each family; the catalog is full
  of odd variations), what you did lately (so targets keep rising), compound moves, and weights in
  gym mode.
- **Dose**: weights by goal (`DOSE`), body weight by level (`BODY_REPS`, `FEW_REPS_RANGE` for
  pull-ups and dips), holds in seconds (`HOLD_SEC`).
- **Running**: easy, intervals, easy, long in turn; minutes and intervals by run level (`RUN`),
  run-walk below `RUN.walkBreakBelow`; a week's running grows at most `RUN.weeklyGrowth` over the
  last. A run is one item with `run` steps (walk, easy, steady, fast + seconds); the library has
  four run entries (`forma:easy-run`, `run-walk`, `interval-run`, `long-run`).

## Easier and swap (`options.ts`)

Every main and core item carries up to `CHOICES.easier` easier moves (the hand-made `LADDER` by
demo first, e.g. pull-up → negatives → band pull-up → table row, then the same family a level
down) and `CHOICES.swaps` swaps (same family and region, no harder, one per demo). Found by code,
so each is a real exercise with a demo and with your gear. `plan.ts` applies a change
(`changeItem` on the next day or a later one, `moveItem`, `skipItem`): logged sets move with a swapped exercise, the item keeps
`changed` (what it was), a swap keeps the old one as a choice. The built-in plan becomes a plan
too when a workout opens (`planFromQuest`), so it can be changed the same way.

## The guardrails (`validate.ts`)

Every workout, whoever built it: only library exercises (or the built-in warm-ups and stretches),
only your gear, and the workout laws above: a warm-up first of at least `LAWS.warmupSec` (added or
lengthened), nothing a sore spot spares, at most `MAX_SETS_PER_FAMILY` sets of a family and
`MAX_SETS` in all, a comeback's lighter sets, no sudden long run, and about your minutes
(`TIME_SLACK` over at most, by `minutesOf`). The order of the blocks and a cool-down are only noted. Short on time it trims like a trainer:
accessory and core sets down to two, then the accessories go, then core, then a set of the main
moves from the last; the warm-up and cool-down stay. It returns the fixed plan and the `problems`, which
an LLM gets back to do better.

## Screens

- **Train tab** (`CoachScreen` in `CoachChat.tsx`): the flame with what it brings up or its last
  words, "Let's start", "Talk" or "Answer", and "What I know" (`CoachKnows`: profile, levels, notes,
  each note can be forgotten; to change the profile, tell the flame). Under it the week (`WeekBoard`):
  "This week" with "N of M done", then a chip for each day, Monday to Sunday: its weekday, its date and an icon (a dumbbell for a workout, a flame for a rest day, a tick once done or kept, nothing before the plan; the next workout lit gold, a dot under today), and the chosen day's workout (from `todayIs`: it opens on the workout to do today, a missed one too, on the next workout once today's is done, else on today) as `WorkoutList`, the same list Today shows (see [../app/screens.md](../app/screens.md)): warm-up and cool-down folded, still, dose and rest, Easier
  and Swap (days still to do), and Start on the next day once its day has come (`startsToday`: on its date or after it, to catch up a missed one, never ahead, and not on a day you already trained; `start` in `page.tsx` checks it too, the developer menu's Workout jump skips it); a rest day says why rest counts and, on the
  day, offers a minute by the fire. Before the first week: only a line that says to talk to the flame. Tap an exercise (here or on Today) for how to
  do it (`ExerciseSheet`: both demos, facts, steps, tips, mistakes). Sideways the two sit side by side.
- **The chat** (`CoachChat`): the camp fire at the top with the flame, the talk below in the
  story's dialogue boxes, the taps it offers, and a box to type that grows with what you write (up
  to 40% of the screen, then scrolls; a count past 800 of 1000). Enter sends on a keyboard, on a
  phone it's a new line. While the flame works it glows and flickers, and its box (`Working`) ticks
  off each tool it ran this turn (`STEP_LABEL` in `chat.ts`, heard through `onStep`), with the
  seconds so far; a failed turn offers "Try again". A week or day it just set shows in
  the chat as the week, a strip of demos per day.
- **Workout** (`Workout.tsx`): no pausing. Closing it after a set asks first ("Leave, don't
  count it"): leaving throws the sets away and the workout starts over next time. An overview before the first set (move up and down, Easier, Swap,
  Skip; the list button brings it back), "Too hard? Easier" and "Swap" under the demo, and a run
  view: a bar of the steps, a big clock for the step you're on, a buzz at each change, distance at
  the end. The run's start is saved (`draft.runAt`), so the clock keeps going through a phone lock.
- **After a workout** (`AfterSession.tsx`): the workout's time next to the planned minutes, "How did
  it feel?" (easy, just right, hard) and a word for the coach, saved on the session.

## How to change things

| I want to... | Edit |
|---|---|
| Change sets, reps, run minutes, caps, which days of the week train, rests | `src/balance/coach.ts` |
| Change how long a workout says it takes | `TIME`, `REST` in `src/balance/coach.ts`; the rule in `time.ts` |
| Change the warm-up or the cool-down | `WARMUP_SEC`, `COOLDOWN` in `src/balance/coach.ts`; `WARMUP_MOVES`, `STRETCHES` in `staples.ts` |
| Change a law, or add one | `LAWS` in `src/balance/coach.ts`; the check in `laws.ts` (`LAW_LIST`, `weekBreaks`) or `validate.ts`; a persona in `laws.test.ts` |
| Teach the coach more about training | a topic in `PLAYBOOK` (`craft.ts`), and the short blueprint in `SYSTEM` (`backend/app/coach.py`) |
| Change what the coach reads about past workouts | `goingLines`, `workoutLog` in `src/lib/coach/feedback.ts`; how it should use it in `SYSTEM` (`backend/app/coach.py`) |
| Add something the flame brings up | `coachNudge` in `src/lib/coach/nudge.ts`, with a test |
| Change which families a day trains (main and accessory) | `DAYS` in `src/lib/coach/generate.ts` |
| Prefer other exercises | `STAPLES` in `src/lib/coach/staples.ts` |
| Change an easier ladder | `LADDER` in `src/lib/coach/options.ts` |
| Change what a sore spot spares | `SPARE` in `src/lib/coach/options.ts` |
| Add something the coach asks at setup | `SYSTEM` in `backend/app/coach.py`, and `save_profile` (`TOOLS`, `tools.ts`) |
| Add a guardrail | `validate.ts`, with a test |
| Change how the coach talks (its voice) | "Your voice" in `SYSTEM` in `backend/app/coach.py` (a server deploy), the one line in `coachBrief`, and the nudge lines |
| Give the coach a tool | `TOOLS` in `backend/app/coach.py` and a case in `runTool` (`tools.ts`), with tests on both sides |
| Change the model | `litellm-config.yaml` on the server ([../backend/server.md](../backend/server.md)) |
| Teach the search a word | `SAME` in `src/lib/coach/search.ts` |
| Teach the coach a part of the game | a topic in `GUIDE` (`src/lib/coach/guide.ts`), numbers read from `src/balance`, `opens` if it is a surprise |
| Keep something a surprise | `opens` on its topic, and its names in the spoiler test (`guide.test.ts`) |

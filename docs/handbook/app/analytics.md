---
type: reference
title: Play stats (PostHog)
description: What the app sends to PostHog for balancing and retention, how events are read off save changes (eventsBetween), what is never sent, the env vars that turn it on, and how to add an event.
tags: [app, analytics, posthog, balance, retention]
timestamp: 2026-11-01
---

# Play stats (PostHog)

FORMA sends play stats to its own PostHog project, so balance can be tuned on real players (not
only the bot) and we can see who comes back, when, and where they stop. It is separate from
minlit's PostHog: its own organization "FORMA" on PostHog's EU cloud (eu.posthog.com, project
324817), with its own key and free allowance. Never change minlit's organization or project.

## Where it lives

- `src/lib/analytics.ts`: pure rules. `eventsBetween(before, after)` reads events off a change to
  the save; `heroContext(state, now)` is sent with every event; `openEvent`, `runStartEvent`,
  `runEndEvent` build the events a save change can't show.
- `src/lib/analytics-client.ts`: the sending side. `useAnalytics(state, ready, signedIn, dev)` in
  `src/app/page.tsx` sends what `eventsBetween` finds on each change, and `app_opened` on load
  and on coming back after 30 minutes away. `track(event)` sends one event. PostHog loads with
  `import()` only when there is something to send.
- `src/components/FogRun.tsx`: sends `fog_run_start` and `fog_run_end` (the end is read with the
  save from before the run).
- The You page's Settings has "Share play stats" (stored in `localStorage` `forma-analytics`).

## Turning it on

Set `NEXT_PUBLIC_POSTHOG_KEY` (the project's public key, `phc_...`; it is meant to be in the
browser, so it is fine in Vercel env, never in the repo) and, for a US project,
`NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com` (EU is the default). Without the key nothing
loads and the Settings switch is hidden. It never sends on localhost, in the sandbox or on the developer save. Every event
has `env` (`live`, `preview`) and `dev` (developer mode on), so dashboards can filter both out.

No autocapture, page views, session recordings or surveys. A signed-in phone is tied to its
account by the Supabase user id (`identify`), never the email.

## Never sent

The letter, the Hollow's voice, the hero's and flame's names, workout comments, coach chat text,
the words of story answers, the email. Only counts, ids and values from fixed lists. A test in
`src/lib/analytics.test.ts` checks the letter never shows up.

## The events

Every event carries the hero context: `workouts`, `hero_level`, `chapter`, `story_done`, `class`,
`sp`, `zones_cleared`, `fog_runs`, `power` (`powerScore`), `days_opened`, `days_since_start`,
`days_since_workout`, `coach_on`.

| Event | When | Main properties |
|---|---|---|
| `app_opened` | load, or back after 30 min | `days_since_open`, `mid_workout`, `resumed` |
| `onboarded` | the prologue ends | `kit`, `look` |
| `class_picked` | class set or changed | `class`, `from` |
| `workout_done` | a workout is saved | `n`, `kind`, `day`, `mode`, `planned_by`, `xp`, `sets`, `skipped`, `changed`, `raised`, `better`, `gap_days` |
| `workout_felt` | the after-workout question | `felt` |
| `save_jumped` | a restore, cloud copy or dev jump changes the workout count | `from`, `to` |
| `scene_seen`, `chapter_started`, `story_finished` | story moves (a chapter starts when the boss before it falls, so it comes with `zone_cleared`) | `scene`, `chapter` |
| `fog_run_start` | a run starts (each try) | `zone` (from 1), `party`, `bot`, `start_at`, build |
| `fog_run_end` | a run ends | `won`, `why` (`boss`, `hp`, `limit`, `left`), `floor`, `room`, `kills`, `run_level`, `seconds`, `first_clear`, `bag`, build |
| `zone_cleared` | a zone's boss falls for the first time | `zone`, `runs` |
| `sp_given`, `sp_worn` | SPs | `sp` |
| `stat_points` | points put in or taken back | `stat`, `change`, `now` |
| `item_worn`, `item_forged`, `forge_missed`, `item_rerolled` | gear | `slot`, `rarity`, `level`, `plus` |
| `coach_setup`, `coach_message`, `coach_week` | coach use: set up, messages sent, a new week planned | `count`, `by`, `days` |
| `quote_kept`, `sat_by_fire` | Today and rest days | |

"Build" is the worn weapon, armor and charm (`*_rarity`, `*_level`, `*_plus`; `starter` for the
kit) and the points per stat (`pts_health` ... `pts_move`; crit left the stats on 2026-10-28, so older events also have `pts_crit`).

## Adding an event

If the save shows it, add it to `eventsBetween` (and a test); the screens need no change. If it
doesn't (something that happens and leaves no trace in the save), build it in `analytics.ts` and
call `track()` where it happens. Keep names `noun_verb` in the past, properties flat, and nothing
the player typed.

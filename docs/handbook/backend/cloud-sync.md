---
type: reference
title: Cloud backup in the app
description: The app side of login and save backup — sign-in required after the opening (`SignInGate`: email link or code; Google behind a flag), the card on the You page's Settings (tap your hero at the top), the sync hook that uploads the save a few seconds after each change, the plan() rules for phone vs cloud, and the which-save-to-keep question. Hidden until the NEXT_PUBLIC_ env vars are set.
tags: [backend, app, sync, login, supabase]
timestamp: 2026-10-28
---

# Cloud backup in the app

Sign-in is required, after the opening and the install step (`SignInGate`, Edoardo's calls
2026-10-27 and 2026-10-28: an account backs the hero up from day one, is who you are to friends,
and is how the coach talks to you; there is no skip, offline or in developer mode). The app
still plays offline-first: the save in `localStorage` is the real one, and the cloud keeps a copy
so a new phone (or a wiped one) can get the hero back.

The gate shows when the backend is set up, this phone isn't signed in (`signInDue`), and not in
the sandbox. On an installed iPhone app the email's link opens Safari, which has its own storage,
so the gate also takes the **code from the email** (`verifyEmailCode`, Supabase `verifyOtp`); the
email shows the code: Supabase sends through Resend (custom SMTP: smtp.resend.com, sender
login@formaquest.app, domain verified in Resend with its DNS on Vercel), and both the "Magic link or
OTP" and "Confirm sign up" templates are `supabase/templates/magic-link.html` (subject "Your FORMA
code: {{ .Token }}"). It is a note from Edoardo with the code only (no link) and the game's pixel
art, served from `public/email/` (drawn from the sprites by `node scripts/email-art.mjs`). Change
the file and paste it into both in the dashboard once the images are live.
Signing in on a fresh installed app takes the hero from the cloud (`plan()` → use-cloud). A brand-new phone's first screen asks **New game** or **I already have a hero** (`Prologue`'s `askLogin`, Edoardo 2026-10-28, after a friend couldn't get back in): the second signs in at once and takes the cloud hero the same way.

## Files

| File | What it holds |
|---|---|
| `src/lib/cloud.ts` | Pure rules: `plan(local, cloud, lastRev)` decides upload, use the cloud copy, or ask; `cloudState` migrates a cloud copy; `describe` writes "12 workouts, 27 Oct". Tests in `cloud.test.ts` |
| `src/lib/cloud-client.ts` | The browser side: `cloudConfigured`, the lazy Supabase client, sign-in and sign-out, the api calls (`api()` for any signed-in call; `getCloud`, `putCloud`, `deleteCloud`), the last rev seen per user, and the status store (`useCloudStatus`) |
| `src/components/Cloud.tsx` | `useCloudSync` (run from `page.tsx`), `CloudChoice` (the which-save modal), `CloudSave` (the card in the You page's Settings) |

## Turning it on

It shows only when all three are set at build time (Vercel env vars):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`. Without them
the card is not drawn and no Supabase code is loaded. It is always off in `?sandbox` and on the developer save (`offRecord()`).

Sign-in is by email link. The Google button shows only with `NEXT_PUBLIC_GOOGLE_SIGNIN=1`, set
once the Google provider is turned on in the Supabase `forma` project (it isn't yet).

## How a sync goes

1. Supabase loads only if this phone may be signed in (a token in `localStorage` or a sign-in
   code in the URL) or when the player taps a sign-in button.
2. On sign-in, the app fetches the cloud copy and runs `plan()`, in this order:
   no cloud copy → upload; cloud is on the rev this phone last saw → upload on it; this phone is
   fresh (no workouts) → take the cloud copy; the cloud has no workouts → upload on its rev;
   otherwise → **ask** which one to keep.
3. While signed in, every change uploads 3 s later (unchanged saves are skipped), on the last rev
   seen. A 409 means another phone saved: the app meets the cloud copy again with the same rules.
4. Offline, the status says so and it uploads when the phone is back online.

"Remove copy" deletes the cloud copy and signs out; the phone's save stays. The api side is in
[api.md](api.md).

## Starting over

The You page's Settings ends with **Start over from scratch** (`src/components/StartOver.tsx`,
Edoardo 2026-10-28: friends who picked a random name or skipped the story want a clean start). It
asks once, then shows a six-letter code (`startOverCode` in `src/lib/restart.ts`, no letters that
read alike) to type back. Then it holds every upload (`holdCloudWrites`), deletes the cloud copy
(`deleteCloud`), forgets the last rev, drops this page's save (`wipeSave` in `store.ts`) and reloads
onto the opening. The account, friends and settings stay. With no connection it stops before
touching anything, since a cloud copy left behind would come back on the fresh phone (`plan()` →
use-cloud). Signed out (rare: sign-in is required) it waits for a sign-in. In the sandbox and on
the developer save it only drops that save.

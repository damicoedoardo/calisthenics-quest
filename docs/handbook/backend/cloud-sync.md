---
type: reference
title: Cloud backup in the app
description: The app side of login and save backup — sign-in asked once after the opening (`SignInGate`: email link or code; Google behind a flag), the card in Hero > Settings, the sync hook that uploads the save a few seconds after each change, the plan() rules for phone vs cloud, and the which-save-to-keep question. Hidden until the NEXT_PUBLIC_ env vars are set.
tags: [backend, app, sync, login, supabase]
timestamp: 2026-10-27
---

# Cloud backup in the app

Sign-in is asked for once, after the opening and the install step (`SignInGate`, Edoardo's call
2026-10-27: an account backs the hero up from day one and is who you are to friends). The app
still plays offline-first: the save in `localStorage` is the real one, and the cloud keeps a copy
so a new phone (or a wiped one) can get the hero back.

The gate shows when the backend is set up, this phone isn't signed in (`signInDue`), and not in
the sandbox. On an installed iPhone app the email's link opens Safari, which has its own storage,
so the gate also takes the **code from the email** (`verifyEmailCode`, Supabase `verifyOtp`); the
email template must show `{{ .Token }}` (`supabase/templates/magic-link.html`, custom SMTP needed).
Signing in on a fresh installed app takes the hero from the cloud (`plan()` → use-cloud).

## Files

| File | What it holds |
|---|---|
| `src/lib/cloud.ts` | Pure rules: `plan(local, cloud, lastRev)` decides upload, use the cloud copy, or ask; `cloudState` migrates a cloud copy; `describe` writes "12 workouts, 27 Oct". Tests in `cloud.test.ts` |
| `src/lib/cloud-client.ts` | The browser side: `cloudConfigured`, the lazy Supabase client, sign-in and sign-out, the api calls (`api()` for any signed-in call; `getCloud`, `putCloud`, `deleteCloud`), the last rev seen per user, and the status store (`useCloudStatus`) |
| `src/components/Cloud.tsx` | `useCloudSync` (run from `page.tsx`), `CloudChoice` (the which-save modal), `CloudSave` (the card in Hero > Settings) |

## Turning it on

It shows only when all three are set at build time (Vercel env vars):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`. Without them
the card is not drawn and no Supabase code is loaded. It is always off in `?sandbox`.

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

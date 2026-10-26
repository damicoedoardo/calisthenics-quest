# FORMA

Calisthenics, played like a game. Train three skill paths (Push, Pull, Core), earn XP, keep a weekly streak and forge new gear for your pixel hero as you unlock harder skills.

Installable as an app: open the site on your phone, then **Share → Add to Home Screen** (iOS) or **Install app** (Android/Chrome). Works offline at the gym; progress is stored on the device (use Hero → Backup to save it).

## How the game works

- **Today's quest**: the current skill on each path plus a leg exercise. Tap a set when it's done. Stop every set with 2-3 reps left.
- **Full vs mini quest**: half the sets or more is a full quest (100 XP), anything less is a mini quest (30 XP). Bad days still count.
- **Weekly quest**: 3 sessions a week. Each week in a row adds +10% XP (max +50%).
- **Progression**: when every set of an exercise is done, it asks for one more rep (or 2 more seconds) next week. Hit the unlock target to beat the skill, earn +150 XP and new gear.
- **Max test**: every 3 weeks, go all out on push-ups, pull-ups and L-sit for +200 XP.

## Development

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # game logic tests
pnpm build
```

Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel. Game rules live in `src/lib/game.ts`, skill trees in `src/lib/skills.ts`.

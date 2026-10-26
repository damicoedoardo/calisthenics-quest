# FORMA

Calisthenics, played like a game. Train three skill paths (Push, Pull, Core), earn XP, keep a weekly streak and forge new gear for your pixel hero as you unlock harder skills.

Installable as an app: open the site on your phone, then **Share → Add to Home Screen** (iOS) or **Install app** (Android/Chrome). Works offline at the gym; progress is stored on the device (use Hero → Backup to save it).

## How the game works

- **The story**: you wake in the Ashlands next to the sword you put down. A hooded Wanderer walks with you; on day one you write a letter to your future self. Five chapters open as you keep showing up (sessions, not strength), and the ending reads your letter back to you. Rules and scenes live in `src/lib/story.ts`.
- **Today's quest**: a check-in (Rough, Normal, Strong), then Day A (Push + Core) or Day B (Pull + Core), plus one support exercise from the other path. Rough means a 15-minute minimum quest that still counts.
- **Logging a set**: one tap on how many reps were left in the tank (4+, 2-3, 0-1), then a 90-second rest timer. Every set done at target with reps to spare raises the target by one rep (or 2 seconds) next time.
- **Classes**: Warrior (Push), Archer (Pull), Monk (Core), Mage (whichever path is behind). The class path forges your weapon and gives +10% XP.
- **XP**: full quest 100, minimum 30, streak +10% per perfect week in a row (max +50%), class +10%, perfect week +100, skill beaten +250, welcome back after 2+ weeks +50, max test +200 every 3 weeks.
- **Chapters**: every session takes one heart off the chapter enemy. Chapters 2 and 5 also need a max test.
- **The Fog (Play tab)**: the game between workouts, a Survivors-like run. Drag anywhere to move; your hero attacks on its own in the class's style (Warrior slashes, Archer shoots, Mage casts homing orbs, Monk sends shockwaves). Fog creatures come in waves and leave light; each level lets you pick 1 of 3 skills. After 4 minutes the Hollow walks out, speaking your own inner critic. Losing costs nothing and runs are free to replay. Real training is the only way to get stronger: Push skills raise Strike (damage), Pull raises Reach (attack speed, pickup range), Core raises Hold (HP, armor), workouts call Ember's flames to circle you, and training in the last two days starts a run with a free skill. A zone opens when the boss before it falls and you have done enough workouts (6, 15, 30, 50). Rules live in `src/lib/fog.ts`; the run itself is a Phaser scene in `src/game/run.ts`, loaded only when a run starts.

## Development

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # game logic tests
pnpm build
```

Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel. Game rules live in `src/lib/game.ts`, skill trees in `src/lib/skills.ts`, the Fog in `src/lib/fog.ts` and `src/game/run.ts` (Phaser 3).

**Developer mode** is on in every preview and on localhost (on the live app, tap the FORMA name 7 times). It adds "Skip the intro" on the title screen, a wrench button with fake workouts, class and skill-tree switches, Fog boss clears and a save wipe, and "Skip to the boss" / "Win this run" in a Fog run's pause menu. Helpers live in `src/lib/dev.ts`.

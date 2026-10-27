# FORMA

Calisthenics, played like a game. Train three skill paths (Push, Pull, Core), earn XP, keep a weekly streak and forge new gear for your pixel hero as you unlock harder skills.

Installable as an app: open the site on your phone, then **Share → Add to Home Screen** (iOS) or **Install app** (Android/Chrome). Works offline at the gym; progress is stored on the device (use Hero → Backup to save it).

## How the game works

- **The story**: you wake in the Ashlands next to the sword you put down. A hooded Wanderer walks with you; on day one you write a letter to your future self. Five chapters open as you keep showing up (sessions, not strength), and the ending reads your letter back to you. The story is data in `src/story/` (see its README).
- **Today's quest**: a check-in (Rough, Normal, Strong), then Day A (Push + Core) or Day B (Pull + Core), plus one support exercise from the other path. Rough means a 15-minute minimum quest that still counts.
- **Logging a set**: one tap on how many reps were left in the tank (4+, 2-3, 0-1), then a 90-second rest timer. Every set done at target with reps to spare raises the target by one rep (or 2 seconds) next time.
- **Classes**: Warrior (Push), Archer (Pull), Monk (Core), Mage (whichever path is behind). The class path forges your weapon and gives +10% XP.
- **XP**: full quest 100, minimum 30, streak +10% per perfect week in a row (max +50%), class +10%, perfect week +100, skill beaten +250, welcome back after 2+ weeks +50, max test +200 every 3 weeks.
- **Chapters**: every session takes one heart off the chapter enemy. Chapters 2 and 5 also need a max test.
- **The Fog (Play tab)**: the game between workouts, a dungeon crawl. Drag anywhere to move and dodge through shots; your hero attacks on its own in the class's style (Warrior slashes, Archer shoots, Mage casts homing orbs, Monk sends shockwaves). Each zone is a dungeon of ten floors with its own monsters and ground (a lake, a village, a plateau, the fog, the mountain), the Warden of the Ashes halfway down, and a boss at the bottom that fights by its chapter's lesson: Tomorrow heals while you wait, the Mirror's reflections hurt you when you hit them and only the real Mirror shoots, the Perfect Knight loses one plate per hit however small, the Plateau never shows its HP until it shatters, the Hollow can't be beaten but you can stand in its light and take its hand, and the Summit is an endless climb with your friends where any height is a win. Music and sound effects are synthesized in `src/lib/music.ts` (no audio files). Losing costs nothing and runs are free to replay. Real training is the only way to get stronger: Push skills raise Strike (damage), Pull raises Reach (attack speed, pickup range), Core raises Hold (HP, armor), workouts call Ember's flames to circle you, and training in the last two days starts a run with a free skill. A zone opens when the boss before it falls and its chapter has started. Rules live in `src/lib/fog.ts`; the game is a pure engine in `src/game/dungeon/engine.ts` playing the data in `content.ts` (each zone's dungeon in `ZONE_DUNGEONS`; see `src/game/dungeon/README.md`), drawn by a Phaser scene loaded only when a run starts; `scripts/fog-sim.mjs` balances it with a bot.

## Development

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # game logic tests
pnpm build
```

Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel. Game rules live in `src/lib/game.ts`, skill trees in `src/lib/skills.ts`, the Fog in `src/lib/fog.ts` and `src/game/dungeon/` (Phaser 3).

**Developer mode** is on in every preview and on localhost (on the live app, tap the FORMA name 7 times). It adds "Skip the intro" on the title screen, a wrench button with fake workouts, class and skill-tree switches, Fog boss clears and a save wipe, and "Skip to the boss" / "Win this run" in a Fog run's pause menu. Helpers live in `src/lib/dev.ts`.

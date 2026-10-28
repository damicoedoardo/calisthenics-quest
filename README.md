# FORMA

Any workout, played like a game. Train at the gym or at home, earn XP and stat points, keep a weekly streak and forge new gear for your pixel hero as you keep showing up.

Installable as an app: open the site on your phone, then **Share → Add to Home Screen** (iOS) or **Install app** (Android/Chrome). Works offline at the gym; the save lives on the phone and is backed up to your account (sign-in is needed to play).

## How the game works

Training earns, play spends: real workouts always win and make you stronger; the Fog, the game between workouts, is where you can lose. Every number below lives in `src/balance/` (see [docs/handbook/game/balance.md](docs/handbook/game/balance.md)); the in-app coach explains them to players from its game guide (`src/lib/coach/guide.ts`).

- **The opening**: you wake in the Ashlands next to the sword you put down, walk a first short dungeon, fall to the Hollow, and a hooded Wanderer gives you a class. On day one you write a letter to your future self.
- **The story**: six chapters, about five to six months at three workouts a week. Chapters move with workouts, not strength: every workout takes one heart off the chapter's enemy, and the ending reads your letter back to you. The story is data in `src/story/` (see [docs/handbook/game/story.md](docs/handbook/game/story.md)).
- **The coach**: your flame (Ember, or the name you gave it) is an AI coach you chat with on the Train tab. It gets to know you, plans your week (gym, calisthenics, running or a mix) from the exercise library, changes it when you ask, and answers questions about the game without spoilers. Every exercise has an easier version and a swap. Days without a workout are rest days, kept by sitting by the fire. See [docs/handbook/game/coach.md](docs/handbook/game/coach.md).
- **A workout**: a check-in (Rough, Normal, Strong; Rough is a minimum quest that still counts), then the day's exercises. Each set is logged with the reps left in the tank (4+, 2-3, 0-1), then a rest timer. Sets at target with reps to spare raise the target next time; a set that beats last time is noted. Leaving a workout half way throws it away.
- **What a workout gives** (the purse on the Hero tab): XP (full 100, minimum 30, +100 for the week's third, +10% per perfect week in a row up to +50%, +50 for coming back after two weeks; a level is 500 XP), stat points (3 full, 1 short, +2 for a week at the goal, +1 for beating last time), embers for Mira's forge (10 full, 4 short) and a sweat coin.
- **Stats** (Hero tab): Health, Armor, Damage, Haste (attack speed) and Speed (walk speed). Points spent since your last workout come back free; starting over costs a sweat coin. Crit comes from what you wear.
- **Classes**: Warrior, Archer, Monk and Mage only change how you fight in the Fog: an attack style, an ability, and a small lean to two stats. Changing class costs sweat coins (the first change is free). Later the Wanderer hands over SPs, forms that change your look, weapon and moves.
- **Gear**: only from the Fog. A weapon, armor and a charm, in four rarities; deeper floors give stronger items, and each asks for a hero level and stat points before you can wear it. A fall loses only what you found that run and still carry; what you wear and what you brought always comes home. Mira's forge takes an item from +1 to +15: up to +5 with embers alone, past that with materials that only drop in co-op runs, and from +7 a step can miss (never below a safe mark, nothing breaks).
- **The Fog (Play tab)**: a dungeon crawl played sideways (or with keys on a computer). Move and dodge; your hero attacks on its own in the class's style. Each zone is ten floors with its own monsters and ground, a mid-boss on floor five, and a boss at the bottom that fights by its chapter's lesson. A zone opens when the boss before it falls and its chapter has started. Runs are free to replay. Workouts call your flame's fires to circle you, training in the last two days and resting each start a run with a free skill, and once a chapter's hearts are gone its boss gets weaker. Rules live in `src/lib/fog.ts`; the game is a pure engine in `src/game/dungeon/engine.ts` playing the data in `content.ts` (see [docs/handbook/game/dungeon.md](docs/handbook/game/dungeon.md)), drawn by a Phaser scene loaded only when a run starts; `pnpm fog:sim` balances it with a bot. Music and sound effects are synthesized in `src/lib/music.ts` (no audio files).
- **Friends**: add friends, make a party of two to four and play a run together with voice, bring a fallen friend back up, send each other forge materials, and walk the Ember Road, a story told with friends.

## Development

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm test     # game logic tests
pnpm build
```

Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel. Game rules live in `src/lib/game.ts`, the built-in plan in `src/lib/program.ts` (backs the rules and the simulators), the coach in `src/lib/coach/`, stat points in `src/lib/stats.ts`, the Fog in `src/lib/fog.ts` and `src/game/dungeon/` (Phaser 3).

**Developer mode** is only for the developer's account (or localhost), switched on in You > Settings: it plays a separate developer save and adds a wrench panel with fake workouts, wallet, gear, story and Fog switches, and "Skip to the boss" / "Win this run" in a Fog run's pause menu. See [docs/handbook/app/dev-mode-and-labs.md](docs/handbook/app/dev-mode-and-labs.md); helpers live in `src/lib/dev.ts`.

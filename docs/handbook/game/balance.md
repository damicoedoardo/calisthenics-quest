---
type: conceptual
title: Balance (design for balance)
description: The rule every feature follows so FORMA stays tunable — every balance number named in src/balance/ with its goal, the balance sheet (pnpm balance) that shows what they add up to, the map of numbers not moved yet, and the balance changelog.
tags: [game, balance, rules, changelog]
timestamp: 2026-10-29
---

# Balance

Balance is how strong, how fast, how rare and how costly things are: XP, stat points, items,
drops, the forge, monsters, bosses. FORMA is built so anyone (Edoardo, an agent) can find any
of these numbers, change it, see what it does, and later see when and why it changed.

## The rule (design for balance)

Every feature follows this. The short form is in [`AGENTS.md`](../../../AGENTS.md); the step by
step for agents is the `designing-for-balance` skill (`.claude/skills/designing-for-balance/SKILL.md`).

1. **Every balance number has a name and a home.** A number that sets how strong, fast, rare or
   costly something is lives in `src/balance/`, never inline in a formula. Layout, art and
   animation timing are not balance. (Monsters, bosses and their shot patterns are content as
   much as numbers and stay as data in `src/game/dungeon/content.ts`.)
2. **Every number says what it does**: one `/** */` line, what it controls, which way is harder,
   and its goal when it has one.
3. **Every feature names its goal** as something measurable ("a rare takes about two weeks of
   training to wear") and adds a line for it to the balance sheet.
4. **Measure before and after.** `pnpm balance` for the sheet, and `pnpm sim` then
   `pnpm fog:sim` for anything in a run. The sheet's diff goes in the pull request.
5. **Write it down.** A change to a balance number adds a row to the changelog below, and its
   commit message starts with `Balance:`.
6. **Rules stay pure and seeded** (see [`AGENTS.md`](../../../AGENTS.md)): that is what lets the
   simulators play the same game the phone does.
7. **The coach can explain it.** A number players meet (what something costs, gives or asks) is
   read by a topic of the coach's game guide (`src/lib/coach/guide.ts`, see
   [coach.md](coach.md#the-game-guide-guidets)), never typed into it, so a change shows there by
   itself. A new mechanic gets a topic (with `opens` if it is a surprise); a new balance file
   needs a topic or a reason in `BEHIND_THE_SCENES` (`guide.test.ts` checks).

## Where the numbers are (`src/balance/`)

Plain data, no imports, no logic (`items.ts` and `dungeon.ts` hold the Fog's numbers); code reads it from `@/balance`. The rules that use the numbers
stay in `src/lib/` and `src/game/` (older names such as `XP_FULL_SESSION`, `EMBERS`, `DIALS` or `BAG` are
kept there as aliases, so callers didn't change).

| File | Holds | Used by |
|---|---|---|
| `src/balance/training.ts` | XP per workout, perfect week, comeback, XP per level, streak bonus, `WEEKLY_GOAL`, how often goals rise, how long the story lasts (`STORY_MONTHS`) | `src/lib/game.ts` |
| `src/balance/stats.ts` | stat points per workout, starting points, what a point is worth, base stats, falloff, armor per point, crit (`CRIT`: everyone's chance, what a crit does), pickup reach, class lean | `src/lib/stats.ts` |
| `src/balance/economy.ts` | embers per workout, forge prices, melt values, vault size, sweat coins (`SWEAT`: a coin a workout, what a start-over and a class change cost) | `src/lib/forge.ts`, `src/lib/fog-gear.ts` |
| `src/balance/items.ts` | item power, base damage/HP/armor per level, each class weapon's crit (`WEAPON_CRIT`), bonus sizes and which slot rolls which (`BONUS_POOL`), the caps on Evade and Life steal, the hero level items ask (`LEVEL_NEED`), rarity sizes and weights, how luck and depth lean rarer, when an item can be worn (`WEAR_AFTER`, in workouts after its zone opens), the starter kit, drop chances and luck, the bag | `src/game/dungeon/items.ts`, `src/game/dungeon/engine.ts` |
| `src/balance/power.ts` | the target split of power growth (training / gear / upgrades) and its slack | the balance sheet |
| `src/balance/dungeon.ts` | `DIALS`, elites, run levels, what the bot should win in a zone (`ZONE_WINS`), how human the bot plays (`HUMAN`), the gear it walks in with (`SEASONED`), the ways of spending points the sim plays (`BUILD_PROFILES`, fair within `BUILD_FAIR`) | `src/game/dungeon/content.ts`, `src/lib/fog.ts` |
| `src/balance/upgrades.ts` | Mira's forge +1 to +15 (`STEPS`: embers, materials, odds, strength), misses (`FORGE_RISK`), safe marks, co-op material drops and gifts, the look bands | `src/lib/forge.ts`, `src/lib/fog-gear.ts`, `src/game/dungeon/items.ts`, `engine.ts`, `PlusGlow.tsx` |
| `src/balance/skills.ts` | the run skills a level-up offers (`RUN_SKILL`): each one's size per level, its timer and how many levels it has. Run-only, so measured by `fog:sheet`, not `powerScore` | `src/game/rules.ts`, `src/game/dungeon/engine.ts`, `src/lib/fog.ts` (`UPGRADES`: names, words, card kind) |
| `src/balance/classes.ts` | the classes: base attacks (`ATTACK`), bodies (`CLASS_BODY`), abilities (`ABILITY`: clocks and sizes), the monk's calm (`CALM`), the two stats each leans to (`CLASS_LEAN`, `SECOND_LEAN`), how fair they must be (`CLASS_FAIR`), and the SPs (`SP_TRIAL`, `SP_GIFTS`, `SP_SKILL`, `SP_FINAL`, `SURGE`, `SP_PASSIVE`, and each SP weapon's basic attack `SP_WEAPON` with `cut`) | `src/game/rules.ts`, `src/game/dungeon/content.ts`, `engine.ts`, `src/lib/stats.ts`, `src/lib/sp.ts` |
| `src/balance/coach.ts` | the coach's dose: sets and reps by goal (`DOSE`), body-weight reps and holds by level, moves per minutes, set length, caps per family and per workout, running (`RUN`), choices per exercise, notes kept, when a level moves (`LEVEL_SHIFT`). Real-world dose only: a workout's XP and points don't depend on it | `src/lib/coach/` |
| `src/balance/index.ts` | exports them all | |

The move is staged so it doesn't collide with work in flight. **Not moved yet** (find them here
until they are):

| Area | Where it lives now | Hidden in formulas |
|---|---|---|
| The hero's base (every class) | `DODGE` in `content.ts`; `HERO_HP`, `HERO_SPEED` in `src/game/rules.ts` | |
| Boss edge (boss weaker, free skills after a chapter's hearts are gone) | `EDGE` in `src/lib/fog.ts` | |
| The flame's helpers | `FLAME_AT` in `fog.ts`; `FLAME`, `FIREBALL`, `FAIRY` in `rules.ts` | |
| Floor layout, cleared-room speed | `LAYOUT`, `ROOM_ODDS`, `CLEAR_RUN` in `content.ts` | |
| Item comparison weights (which item the bot and the bag call better) | `WORTH` in `items.ts` | |
| Zone toughness (monster HP and damage per zone), chapter length | each chapter's `fog` block and `workouts` in `src/story/chapters/`; `pnpm fog:tune` prints new toughness toward `ZONE_WINS`, and the story's length is checked against `STORY_MONTHS` | |
| Co-op | `src/game/dungeon/engine.ts` (XP to every standing hero, drops each their own) | no scaling yet: a party meets one hero's monsters |

## Power: one scale for everything

Classes, gear, rarity and upgrades all add strength in different ways, so they are compared on
one number: `powerScore(cls, build, worn)` in `src/game/power.ts`. It uses the engine's own
formulas: damage a second against one foe (crits at their average) times what you can take (HP
over the share of damage that gets through), square-rooted, with a warrior with no points in the starter kit at 100.
Doubling both halves doubles it. It leaves out what only happens inside a run (run skills,
chest items, the flame's fire, class abilities, the dodge, walk speed, hitting many foes), so it compares
builds and gear; the Fog simulator's win rates compare whole classes.

The sheet's "Power by workouts" plays a model player (3 full workouts a week, points spread,
embers spent on upgrades, middle-roll rares from the deepest floor it can wear) and splits the
gain into training, gear and upgrades, then puts the four classes side by side. This is the
curve to tune against: decide how strong a player should be after N workouts and how much of it
comes from each source, then set the numbers to match, instead of tuning each one alone.

**The target** (`POWER_SPLIT` in `src/balance/power.ts`, Edoardo's pick): 40% of the growth from
training (stat points), 40% from gear, 20% from upgrades, each within `POWER_SPLIT_SLACK`. The
sheet's Goals table averages the split over each zone's opening and six workouts later and flags
it when it drifts. The levers: `POINT_WORTH` (training), `ITEM_POWER` (gear), `STEPS` in `upgrades.ts`
(upgrades). Move one, run `pnpm balance`, and keep total power about where it was
(the "Power" column) so the zones don't need retuning.

## The balance sheet

`src/balance/sheet.md` shows what the numbers add up to, played through the real rules (the
season simulator's players, `statPower`, the forge's prices): the goals and whether each is on
target, level, points, embers and vault over six months for three kinds of player, what points in
a stat give, the forge's costs from +1 to +15 (embers and materials a try, odds, average tries,
weeks of training, item strength), co-op material odds and what two bots find in a co-op run, weapons by zone, floor and rarity with what
they ask and when an even build can wear them, drop chances and rarity by source and depth, and
run levels. `src/balance/sheet.test.ts` writes it.

- `pnpm balance` rewrites the sheet. Commit it with the change.
- `pnpm test` fails while the sheet is out of date, so a pull request that changes a number shows
  the sheet's before and after in its diff.
- A new feature with a goal adds its section or goal row in `sheet.test.ts`.

The Fog's win rates are measured by `pnpm fog:sim` and tuned by `pnpm fog:tune`
([../dev/testing.md](../dev/testing.md)). They are too slow for `pnpm test` (a run takes seconds,
not milliseconds), so they have their own sheet: `pnpm fog:sheet` (about two minutes) writes
`src/balance/fog-sheet.md`, each class's win rate against the four's (fair within `CLASS_FAIR`)
and every zone's against its goal. Run it and commit it with any change to classes, zones or
dials.

## How to change things

| I want to... | Edit, then |
|---|---|
| Change XP, levels, the streak | `src/balance/training.ts`, then `pnpm balance` |
| Change stat points or what a point is worth | `src/balance/stats.ts`, then `pnpm balance`, `pnpm sim`, `pnpm fog:sim` |
| Change embers, reroll price, melt values, the vault | `src/balance/economy.ts`, then `pnpm balance` |
| Change the forge's steps, odds, safe marks, co-op materials | `src/balance/upgrades.ts`, then `pnpm balance` |
| Change how strong, rare or demanding items are, or how often they drop | `src/balance/items.ts`, then `pnpm balance` and `pnpm fog:tune` |
| Change a class (body, attack, ability, leans) | `src/balance/classes.ts`, then `pnpm balance` and `pnpm fog:sheet` (all four within `CLASS_FAIR`) |
| Change the dungeon's dials, elites, run levels | `src/balance/dungeon.ts`, then `pnpm sim` and `pnpm fog:sim` |
| Add a feature with numbers | a file (or entry) in `src/balance/`, export it from `index.ts`, a goal row in `sheet.test.ts` |
| Change something not moved yet | where the table above says, and move it into `src/balance/` if you're there anyway |
| See how strong a player is at N workouts, and from what | "Power by workouts" in `src/balance/sheet.md`; the formula in `src/game/power.ts` |
| See what changed and why | the changelog below, then `git log -- src/balance` |

## Changelog

Newest first. One row per balance change: what, why, and what the sheet (or `fog:sim`) said
before and after.

| Date | Change | Why | Before → after | PR |
|---|---|---|---|---|
| 2026-10-29 | The Ember Road's chapters 2 and 3 get their own worlds (`content.ts`): the Quiet Miles (Unsent 26 HP, the Silent Bell 1000 HP, `BELL`, the Distance 850 HP, `DISTANCE`, `LANTERN`) and the Long Bridge (Loner 30 HP, `LONER`, the Tollkeeper 760 HP, `TOLL`, the One Who Walks Alone 40 plates +`ALONE.more` a friend). New `ROAD_TOUGH` (`src/balance/dungeon.ts`): chapter 2 runs at 1.1x its story zone | Edoardo: chapters 2 and 3 like chapter 1, and the Road Banner | `ROAD=n fog:sim steady 40`, open/later. Chapter 2 (Mirror Lake's for comparison): 2 bots 41%/86% (48%/87%), 4 bots 55%/91% (63%/93%), solo 18%/52% (21%/55%); before `ROAD_TOUGH` 2 bots 63%/90%. Chapter 3 (the Village's): 2 bots 22%/86% (24%/86%), 4 bots 29%/92%, solo 9%/63%; Loners first blocked too much (2 bots 11%/68%) → smaller shield, slower turn, and auto-aim picks a shielded Loner last | Ember Road 2 PR |
| 2026-10-29 | New `PARTY.more` (`src/balance/dungeon.ts`): each friend adds 0.9x monster HP, 0.5x monsters per room, 0.3x the damage of every hit on a hero, 1x boss HP (not the Knight's plates). The simulator plays parties (`PARTY=2` to 4) | Edoardo: monsters should scale with the number of players. Before, a party walked through: zone 1 a day after it opens, 68% solo, 100% with 2 bots; 99% with 3 on the day it opens | `fog:sim steady 30-40`, zone 1 open/later: 2 bots 67%/100% → 4%/89%; 4 bots 3%/97%; zone 3 open/later 2 bots 38%/83%, 4 bots 42% open. Solo unchanged (replays the same). Co-op line on the sheet: 1.7 ember thread, 0.7 bond shard, 0.3 warden coal, 0.3 heartstone → 2.7 ember thread, 0.3 bond shard (more monsters; the weak test bots fall before the Warden more often) | Ember Road PR |
| 2026-10-29 | The Ember Road's chapter 1 gets its own world (`content.ts`): the Grinder, the Bellows (850 HP, `BELLOWS`), the Lull (1100 HP, `LULL`), its monster mix | Edoardo: make the Ember Road like the solo worlds | `ROAD=1 fog:sim steady 80` zone 1 later, solo: 81% at first (an easy mid-boss) → 79% after the Bellows retune (monk 35% → 70% once its pull stopped dragging fighters onto it); the Ashlands solo 68%. With 2 bots the road is the Ashlands' match: 1%/89% against 4%/89% | Ember Road PR |
| 2026-10-29 | Run skills' corner cases: Stand your ground now adds armor inside the 60% cap (it was a multiplier on top: standing still with capped armor took 22% of a hit); Cold air no longer slows the mid-boss | Edoardo asked whether the new skills can be abused. Each new skill was also played as the bot's first pick every time (48 runs a class): none beats the normal mix (21%/65%); the best, Keen eye, 20%/63% | `fog:sheet` unchanged, 21%/65%, all fair | #97 |
| 2026-10-29 | Run skills: numbers moved into `RUN_SKILL` (`src/balance/skills.ts`). Pull removed; eight added (Falling star, Cold air, Keen eye, Giant slayer, Last breath, Momentum, Stand your ground, Wider choice), 17 in all. `RUN_LEVELS` base 5 → 4, perLevel 4 → 3 | Edoardo asked for more skills to pick (and dropped revive, heal over time and life steal). With 17 the strongest picks come up less often: at the old pace `fog:sheet` fell to 16%/61%; a level-up a little sooner makes up for it | `fog:sheet` open/later (on top of #96's monsters) 23%/67% → 21%/65%, all four fair; zone 4 later back on target (50% → 52%), zone 6 open 16% (off by 1 at 48 runs) | #95 |
| 2026-10-29 | Two monster attacks changed (`MONSTERS`, `BOSSES` in `content.ts`): the golem's 5-shot fan becomes a lobbed boulder (a `mine`: n 6, r 50, dmg 12), and its ring of 14 starts slow and speeds up (`ramp`, speed 95 → 100); Tomorrow's ring of 12 drifts (`wiggle`) | Edoardo asked for better world 1 monsters: the Ash Golem throws a boulder you step out from under and stomps a slow shockwave; Tomorrow's Zs drift | No retune needed. `fog:sim steady 120`: zone 4 six workouts in 53% → 58%, zone 5 unchanged. `fog:sheet` class averages 23/67%, fair; zone 4 later shows 50% there (48 runs a class, 2 points under its band; 120 runs say 58%) | world 1 monsters PR |
| 2026-10-28 | `LEVEL_NEED.slack` 2 → 0: an item asks for the level a weekly-goal player has the very workout it becomes wearable (`WEAR_AFTER`), not two workouts earlier | Edoardo won zone 1 at 0 workouts after wearing a zone 1 legendary armor at level 1: a level spans three or four workouts, so with slack 2 every zone 1 item from floors 1-3 asked for level 1 | A zone 1 legendary now asks level 2 (4 workouts). Bot at 0 workouts, archer, zone 1 (240 runs): 1.3%; with that legendary armor 0.8%, rested 3.3%, no bow crit 0%, crit x3 4.6%, damage-first picks 2.5%: none of these is what won it, his dodging is (a top dodger wins about 11%, row below). `fog:sheet` open/later 25/69% → 21/67%, all fair; zone 6 open 17% at 48 runs (off by 1), 23% at 96 runs, left. Also: the boss's drop no longer overfills a full bag (it lands on the floor) | this thread's PR |
| 2026-10-28 | A fall keeps what you wear: `FLAME_GUARD_DAYS` (the flame keeping one item) and `FALL_KEEP` (+10 gear slipping home) removed; `SAFE_POINTS` now only for forge misses | Edoardo: with upgrades, losing worn gear makes no sense; a fall loses only the bag | `pnpm balance` and `fog:sheet` unchanged (25%/69%, every zone on target, all four classes fair): the bot already walks in with kept gear (`SEASONED`), so the sim now matches the rule | this thread's PR |
| 2026-10-28 | Armor asks only for a hero level, no Armor points (older armor's need cleared by `armorAsksNoPoints` in `migrate`); weapons still ask for their class's stat | Edoardo, from the build sim: one-stat builds should be playable, not a trap | `BUILDS=even,glass,tank,quick fog:sim steady 24`: open 37/17/38/9% → 30/25/29/14%, all fair; later 82/39/76/28% → 76/55/68/45% (quick 16 points under the average: the bot gains nothing from walk speed, so it measures Speed builds low; +50% worth per Speed point didn't move it). `fog:sheet` unchanged at 25%/69%, every zone on target | this thread's PR |
| 2026-10-28 | Crit leaves the stats for loot: five stat points (`POINT_WORTH` x1.12 and `ARMOR_PER_POINT` 0.0036 → 0.00347, so 84 points a stat gives about what 70 did, plus crit's old share), `CRIT` (5% for everyone, x2), `WEAPON_CRIT` (sword 4%/+20%, bow 6%/+20%, staff 3%/+15%, wand 5%/+25%); archer leans Haste (was Crit); Pickup bonus gone, new bonuses `crit`, `critDmg`, `slayer`, `leech` (`LEECH_CAP` 4%/s), `evade` (`MAX_EVADE` 25%), `power`, rolled from each slot's `BONUS_POOL`; items ask for a hero level (`LEVEL_NEED`, slack 2 workouts); `ITEM_POWER` 1.76 → 1.68; zones hp/dmg 1 1.4 → 1.51, 2 1.63/2.35 → 1.82/2.63, 3 2.82/2.93 → 3.09/3.21, 4 3.19/4.26 → 3.46/4.62, 6 3.48/10.03 → 3.58/10.31 (`fog:tune`, run on Edoardo's Mac too: same numbers, 53 s against 206 s here); the sim plays build profiles (`BUILD_PROFILES`, `BUILD_FAIR`) | Edoardo: crit felt off with no weapon touching it; Diablo-like item stats; the hero level as a wear requirement; rebalance it all together | Split 40/42/18 → 40/37/23 (on target); power at 64 workouts 331 → 343; archer +21% → +24% on the power scale. Before the retune the new gear made zones easy (zone 2 open/later 48/85%, zone 3 41/86%); after, `fog:sheet` 25%/69%, every zone on target, all four classes fair. Builds (`BUILDS=even,glass,tank,quick fog:sim steady 24`, before the retune): open 37/17/38/9%, later 82/39/76/28%: putting everything in attack or walk speed loses badly (they can't wear armor, which asks for Armor points), left for Edoardo to decide | this thread's PR |
| 2026-10-28 | New `ROAD` in `src/balance/training.ts`: an Ember Road chapter opens 9 of your workouts after the one before (from setting out), once its boss fell to your party; the finale 9 after the last | Edoardo: a co-op story that takes at least a couple of months of workouts to finish | New goal row on the sheet: finale 27 workouts after setting out, 2.1 months at 3 a week (goal 2 to 2.5). Nothing else moves | this thread's PR |
| 2026-10-28 | New `PARTY` in `src/balance/dungeon.ts`: revive a friend by standing within 46 px for 2.5 s (back at 30% HP), anyone down gets up at 30% on the stairs, heals and guards cover friends within 160 px at the same share of their HP | Edoardo: a multiplayer pass (the party passes doors together, SP moves that help the group) | Solo runs unchanged (replays and fog-sheet the same). The co-op line on the sheet: 2.3 ember thread, 0.3 warden coal → 2 ember thread, 0.3 bond shard per hero (the party now moves together) | this thread's PR |
| 2026-10-28 | New `TUTORIAL` (`src/balance/dungeon.ts`): the opening's first dungeon, 3 floors of 2 rooms, 2-3 slimes a wave (a wisp from floor 2), monsters at 0.6 hp / 0.5 dmg, HP stops at 1, the Hollow at 100 HP taking 1 a hit, its line at 5 s, the loss at 14 s | Edoardo: a new player's first dungeon, simple and always won to the bottom, then a loss to the Hollow | Only runs with `tutorial` read it: sheet and replays unchanged. The bot gets to the bottom in about 1 minute (seeds 1-5: 46-59 s, then the 14 s fight) | this thread's PR |
| 2026-10-28 | Coach weeks: `WEEK_SPREAD` (which days of the week hold a workout, by workouts a week) and `REST` (core rests 60 s; a coach may set 30-240 s per exercise) in `src/balance/coach.ts` | Edoardo: plan week by week, and rests are part of the workout, set by the coach | No change to the sheet: what a workout earns doesn't depend on its days or rests | this thread's PR |
| 2026-10-28 | The bot uses each SP move when it helps (`SP_USE` in `bot.ts`, was one rule for all); Harpoon drops the monster at lance reach (new `pull` 95) instead of on you; lance `cd` 0.8 → 1.15 (`dmg` 1); daggers `cut` 0.3 → 0.38; shadow sword `arc` and `cut` 1.2 → 1.6 | Edoardo: play every SP to see if one is stronger, e.g. the warrior that cuts shots | All 16 SPs, 96 runs a point (win rate over zones 1-6, open and later): before, the spread ran from Riptide Lancer +20 points over the average (once Harpoon stopped hurting it) to Silent Fang -12 and Hexedge -10. Switching `cut` off drops a warrior SP from about 55% to 2-9%, so cutting shots is what keeps close fighters alive. After: Riptide Lancer 53%, Silent Fang 53%, Hexedge 51%, every SP within 10 points of the average, monks the highest (59-62%) but slowest (11-14 min a win). fog-sheet open/later 31/67 all fair; zone 4 opening day 46% → 48% (one point over, noise at 48 runs) | this thread's PR |
| 2026-10-28 | New `src/balance/coach.ts` for the coach's workouts (sets, reps, run minutes, caps) | Edoardo: a coach that builds gym, calisthenics, running or mixed workouts | No change to the sheet: what a workout earns doesn't depend on what it holds | this thread's PR |
| 2026-10-28 | The SPs become jobs with their own weapons: new moves (`SP_SKILL`, `SP_FINAL`) and a basic attack per weapon (`SP_WEAPON`: `cd`, `dmg` times the class's `ATTACK`, `reach`, `arc`, `pierce`, `blast`, `back`, `heal`, and the new `cut`, how wide a swing knocks shots down); zone 4 hp/dmg 3.29/4.39 → 3.19/4.26 | Edoardo: each SP a different job with its own weapon and moves, none stronger | First pass (32 runs, open/later): Blaze Reaver 61/88, Silent Fang 64/93, Hexedge 20/57, Voidpalm 74/98; swings cutting shots over their whole arc gave fists, claws and daggers 55-95%. After (`SP=n pnpm fog:sim`, 48 runs, SP 1-4): archer 24/70, 26/67, 27/63, 26/63; mage 31/66, 37/69, 38/73, 32/58; warrior 33/66, 35/66, 26/63, 29/67; monk 34/75, 41/78, 41/75, 37/76; fog-sheet 30/69 all four, every zone on target (zone 4 later 52% → 60%) | this thread's PR |
| 2026-10-28 | Four SPs per class: `SP_GIFTS` (2nd, 3rd, 4th after 2, 4, 5 chapters), and `SP_SKILL`, `SP_FINAL`, `SP_PASSIVE` for the twelve new SPs. Cut on the way: Dawn Paladin (Second Wind heal 0.3 to 0.1 under 25%, Sun Guard 9 to 14 s), Lotus Sage (Stillwater heal 0.25 to 0.08), Leaf Warden (Harvest 1.5% to 0.5%), Tiger Fist (Pounce 6 to 8 s); raised Sun Fist, Stone Warden, Sand Oracle, Void Seer | Edoardo: four SPs per class, none stronger, each fighting its own way | `SP=2..4 pnpm fog:sim steady 48`, first pass: Dawn Paladin +29/+24 points over the warrior's first SP, Lotus Sage +17/+12, Sun Fist -7/-16. After (opens/later, archer, mage, warrior, monk): SP 2 29/69, 34/68, 23/61, 41/78; SP 3 33/64, 30/70, 31/70, 41/79; SP 4 33/72, 26/62, 37/75, 31/66; first SPs 27/63, 34/69, 30/64, 34/76, all fair; fog-sheet unchanged | #53 |
| 2026-10-28 | SP passives (`SP_PASSIVE`: Embers 20% a hit, 0.1x slash every 0.5 s for 2 s; Tailwind +40% move for 1.5 s after a dodge; Split Star an extra orb every 4th attack; Flow 0.4% HP on a hit, once a second); Pin Shot 1.8x every 7 s → 2.4x every 6 s, Arrow Rain 3x → 4.5x; archer body hp 1.05 → 1.12, armor 0 → 0.03; zones harder: hp/dmg zone 2 1.48/2.14 → 1.63/2.35, 3 2.78/2.89 → 2.82/2.93, 4 3.13/4.18 → 3.29/4.39, 5 3.45/6.85 → 3.59/7.13, 6 3.37/9.7 → 3.48/10.03 | Edoardo: cooler SP moves and a NosTale passive each, the monk healing a bit on hits; "the SP can be stronger, but the game harder so it takes the same time" | `fog:sheet` (48 runs) open/later 34%/68% → 37%/72% with the passives (Flow at 6% of damage dealt: monk 76/99) → 31%/68% after the archer and zone changes, every zone on target; classes archer 27/63, mage 34/69, warrior 30/64, monk 34/76, fair | this thread's PR |
| 2026-10-28 | The first SP (`SP_TRIAL` 3 + 2 workouts; `SP_SKILL` warrior 1x r100, archer 5 arrows 1.8x, mage 1.3x r90, monk 0.7x r120 every 9 s; `SP_FINAL` 4x / 3x every monster / 3x r260 / 2x + 10% heal; `SURGE` full at 300); on top of the real-player bot, zone 3 hp/dmg 2.64/2.74 → 2.78/2.89, zone 4 2.95/3.94 → 3.13/4.18; the kept gear (`seasonedKit`) only wears the class's own weapons; sweat coins (`SWEAT`: 1 a workout, start over 1, class 3, first change free) | Edoardo: an SP with 2 moves and a final after 3 workouts; changing class or points paid in sweat | `fog:sheet` (48 runs) open/later all four 28%/64% before the SP → 36%/73% with it (zone 3 later 82%, zone 4 opening 53%: off) → 34%/68% after the retune, every zone on target; classes archer 27/59, mage 35/67, warrior 36/68, monk 38/77, fair. Single cells move about ±7 points between runs of 48 | this thread's PR |
| 2026-10-28 | Starter kit: a plain weapon only (`STARTER.armorHealth` 6 and `armorArmor` 0.015 gone; an empty armor slot stays empty); a weapon is worn only by its own class | Edoardo: a run with no weapon gives just a basic weapon, and weapons belong to a class | Split 42/39/19 → 40/42/18 (on target); `fog:sheet` (48 runs) open/later all four 32%/71% → 31%/69%, class averages archer 32/73, mage 38/67, warrior 32/66, monk 22/70, fair | this thread's PR |
| 2026-10-28 | The bot plays like a real player: it walks in with what a player keeps (`SEASONED`: the best wearable of 24 finds from this zone and the one before, forged with workout and melt embers; `src/sim/seasoned.ts`) and searches every room before the stairs (`HUMAN.explore` 1, was 60%). Zone 1's opening day aims at `ZONE_WINS.first` 2% (was "no easier than 48%"). All zones retuned: hp/dmg zone 1 1.0 → 1.4, 2 1.18/1.7 → 1.48/2.14, 3 1.89/1.96 → 2.64/2.74, 4 2.07/2.76 → 2.95/3.94, 5 2.33/4.63 → 3.45/6.85, 6 2.17/6.24 → 3.37/9.7 | Edoardo cleared all of zone 1 with 0 workouts: the bot played in the starter kit and undervalued people, who keep their best finds, forge them, dodge and search the whole dungeon. He wants zone 1 untrained "super tough, not impossible, maybe 1%" | With the kept gear, before the retune: zone 1 opening day 36%, zones 2-6 opening day 74-91%. After: zone 1 at 0 workouts 2% (a top dodger about 11%), six workouts on 54%; every zone on target; class averages 28/64%, fair. The bot takes about 4-5 hits a minute in zone 1, Edoardo 4 | real player PR |
| 2026-10-28 | Shots slower and harder: `DIALS.speed` 1.5 → 0.95 (most shots now slower than your 150 walk), `fire` 3 → 2, new `shot` 1.5 (shot damage); the bot plays like a person (`HUMAN`: reaction 0.28-0.5 s per shot, sees 92% of shots in a calm room and fewer when busy or fast, decides 10 times a second, thumb up to 0.3 rad off, misses 1 dodge in 4) in place of a fixed 0.25 s and 75% of shots; warrior body HP 1.1 → 1.0, armor 0.1 → 0.04, damage 1.04 → 0.85; all six zones' hp/dmg x0.74-0.83 (`fog:tune`); monsters swell 0.35 s before a volley (look only); the run recap shows hits taken a minute | Edoardo: playing zone 1 by hand was much harder than the bot said; shots too fast to step out of, as RotMG lets you | Old shots with the human bot: zone 1 six workouts in 74% → 22%. After the retune, `fog:sheet` class averages (open / later) 32/71%, all fair; every zone on target (zone 1 15/75%, zone 5 later 84% → 74%); the bot takes about 5 hits a minute in zone 1 six workouts in | human bot PR |
| 2026-10-27 | Zone 2 hp/dmg 1.61/2.33 → 1.48/2.14; the Fog sheet counts zone 1's opening day (the very first run, 0 workouts) as on target when it is no easier than `ZONE_WINS.open` | Zone 2 was hard six workouts in; losing the first run is meant | Zone 2 (open / later) 21/48% → 29/70%. Left as is: zone 4 (43/60%, both on target; its slope is the stat growth over six workouts there, a global change to move), zone 5 later on 84% (two points over: it is 18 workouts on, past the chapter's hearts, so the boss is weaker; 1.05x and 1.08x gave 20/83% and 14/77%) | zone retune PR |
| 2026-10-27 | Item requirements: `NEED`'s formula and the rarity `need` factors replaced by `WEAR_AFTER` (workouts after the zone opens: common/magic 0/2/4, rare 2/4/7, legendary 4/7/11 for floors 1-3/4-7/8-10), turned into points from `POINTS`, `STARTING_POINTS`, `WEEKLY_GOAL` | Edoardo: know how much training an item takes; a zone's best item was out of reach before the next zone (zone 4's floor 10 legendary needed 56 workouts, zone 5 opens at 50) | Every zone's floor 10 legendary wearable 11 workouts in, 1-3 before the next zone; first floors now ask an even build's points (were half); model power at 37 workouts 230 → 220, at 64 338 → 324; split 39/41/20 → 41/39/19; `fog:sheet` class averages 28% / 70%, fair; zone 1 opening day 18% → 11% (flagged) | items PR |
| 2026-10-27 | Pace: `STORY_MONTHS` (5-6) and `ZONE_WINS` (33% / 67% ± 15) set as goals; zone 4 hp/dmg 2.57/3.43 → 2.63/3.51, zone 5 2.7/5.38 → 2.92/5.81, zone 6 2.54/7.29 → 2.69/7.73 | Edoardo: the main story is done in 5-6 months; zones 4-6 were too easy on opening day | Story 78 workouts = 6.0 months (on target); `fog:sheet` opening day zones 4-6 51/39/44% → 43/27/31%, later 64/92/91% → 60/84/80%; class averages 29-32% / 68-73%, fair. Still flagged: zone 2 later 48%, zone 5 later 84% | pace PR |
| 2026-10-27 | Classes: their numbers moved into `src/balance/classes.ts`; each leans to a second stat (`SECOND_LEAN`, 2 points: warrior Armor, archer Speed, monk Armor, mage Damage); warrior body HP 1.22 → 1.1, armor 0.18 → 0.1, damage 1.08 → 1.04; archer damage 1.13 → 1.22, Volley every 7 → 6 s, 1.5 → 1.8x | Edoardo: every class its own feel, but fair | `fog:sheet` class averages (open / later) warrior 52/88, monk 35/76, mage 34/74, archer 24/69 (24 runs) → warrior 34/71, monk 41/75, mage 32/74, archer 33/75 (48 runs), all within 10 points; power-scale gap warrior +30% / mage -22% → +16% / -19%; split 38/41/20 → 39/41/20 | classes PR |
| 2026-10-27 | The monk's Stillness fills by fighting (`CALM`: +1 a hit landed, +2 a hit taken, ready at 44) instead of every 14 s | Edoardo: hiding and waiting must not heal | About one Stillness every 15-20 s of fighting, as before; `CLASSES=monk fog:sim steady 48` average (open / later) 33/74 → 36/78 | #45 |
| 2026-10-27 | Stats: Reach out; Armor (its own stat, no longer from Health), Speed (walk) and Crit in; `POINT_WORTH` x4/3 on top of #42's (health 1.8, damage 0.0117, haste 0.00972, armor 0.0036; walk 0.0044, crit 0.0026); `powerScore` counts crits; item needs spread over 6 stats; archer leans Crit | Edoardo: loot comes to you, so Reach did nothing worth a point; six stats feel fuller but stay finite | 70 points a stat now = what 100 a stat gave (+79% damage, +64% attack speed, +103 HP, 21% blocked), plus +25% walk and 20% crit; split 39/41/20 → 38/41/20, power at 37 workouts 235 → 234, at 64 345 → 348; fog:sim in the PR | #44 |
| 2026-10-27 | Target split 40/40/20 set; `POINT_WORTH` x1.35, `ITEM_POWER` 2.2 → 1.76 | Training should earn more of a player's power (Edoardo's pick) | Split 28/48/24 → 39/41/20; power at 37 workouts 246 → 235, at 64 366 → 345; `fog:sim steady 24` zone win rates (open / later) 20/78, 26/51, 32/55, 50/51, 32/93, 32/85 → 20/81, 25/43, 21/70, 51/55, 40/98, 33/91 | #42 |
| 2026-10-27 | `powerScore` and "Power by workouts" on the sheet (no number changed) | One scale to compare training, gear, upgrades and classes | Training ~27%, gear ~45-60%, upgrades up to ~30% of the gain; warrior +27%, mage -21% before abilities | #42 |
| 2026-10-27 | Mira's forge goes to +15: `STEPS` (embers 55 to 140 a step from +6, co-op materials from +6, odds 90% down to 30% from +7), `FORGE_RISK`, `SAFE_POINTS`, `FALL_KEEP`, co-op `MAT_DROPS`, `GIFTS`; `FORGE.upgradeStep` replaced by `STEPS` | Edoardo: NosTale-style +15 with co-op-only materials and a new look per band | +0 to +5 unchanged (5.0 weeks); +15 about 62 weeks of embers for one item; a zone 1 co-op run finds about 2-3 threads and half a shard a hero; solo replays identical | forge +15 PR |
| 2026-10-27 | `BANDS` looks swapped: the shine grows with the plus (new `aura`, `rays`; +13 rays, +15 "Radiant"), and the ring of fire moves to legendaries | Edoardo: the shine should come from forging, the +15 fire should be the legendary's | Looks only, no number in a fight changes; sheet and replays identical | forge looks swap PR |
| 2026-10-27 | Item, rarity, requirement, drop, bag, dungeon dial, elite and run-level numbers moved into `src/balance/`; weapons, drops and run levels added to the sheet | Every number findable; hidden numbers in `rollItem`, `rollRarity` and `kill` named | No change in play: replays identical | #39 |
| 2026-10-27 | Training, stat points and economy numbers moved into `src/balance/`; balance sheet added | Make every number findable and every change visible | No change in play: replays and the sheet's numbers are the same | #39 |

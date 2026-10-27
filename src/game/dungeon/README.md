# The Fog's dungeon

```
content.ts   what a dungeon is made of, as data: ground, doors, chest items, monsters and how they
             shoot, each zone's dungeon and mid-boss, the bosses, the classes' abilities
engine.ts    plays it: a pure step function (60 a second, seeded), no Phaser
bot.ts       a player for balance tests (scripts/fog-sim.mjs) and the autopilot
scene.ts     draws a run with Phaser and turns events into sound and sparks
themes.ts    each zone's colors (floor, stone, torches, water)
props.ts     pillars, barrels, chests, shrine and torches as text rows
../rules.ts  numbers shared with the hero (attack, HP, skills) and the sprite sheet names
../sheets.ts which sprite sheets a run draws with
```

## How to change things

| I want to... | Edit |
|---|---|
| Tune a monster (HP, speed, how it shoots) | its entry in `MONSTERS` (`content.ts`) |
| Change who lives in a zone, and how deep they show up | the zone's entry in `ZONE_DUNGEONS` (`content.ts`) |
| Add a monster | `MonsterKind` and `MONSTERS` (and a `MEET` line) in `content.ts`; its sprite in `src/sprites/characters/` and `SPRITES`; a `SheetKey` in `../rules.ts`, its sheet in `../sheets.ts`, and its look in `DUNGEON_LOOKS` (`scene.ts`) |
| Add a chest item | `RelicId`, `RELICS` and `RELIC_BOT` in `content.ts`; what it does where engine.ts reads `relic(run, ...)`; its icon in `RELIC_ICONS` (`src/sprites/characters/icons.ts`) |
| Change a mid-boss | its entry in `MIDS` and its numbers (`DIM`, `CREW`, `SAND`, `SWAP`, `GALE`) in `content.ts`; its rule in `stepMid` (`engine.ts`) |
| Change how a boss fights | its entry in `BOSSES` (`content.ts`) and its branch in `steerBoss` (`engine.ts`) |
| Change a boss's art | `BOSS_ART` in `scene.ts`, and its sheets in `../sheets.ts` |
| Add a zone | the chapter's `fog` in `src/story/chapters/`, then an entry in `ZONE_DUNGEONS` and `MIDS` (`content.ts`), `THEMES` (`themes.ts`) and `ZONE_MUSIC` (`src/lib/music-zones.ts`) |
| Balance | the `DIALS` in `content.ts`; measure with `pnpm sim`, then `pnpm fog:sim` |

`pnpm test` replays a whole bot run in every zone (`engine.test.ts`): a refactor keeps those
replays exactly as they were, and a balance change moves them on purpose (`pnpm test -u`).

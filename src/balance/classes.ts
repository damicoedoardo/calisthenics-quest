/* The classes in the Fog. Most class numbers still live in src/game/dungeon/content.ts
   (CLASS_BODY, ABILITIES) and src/game/rules.ts (ATTACK); they move here class by class.
   Goal: each class plays its own way, and the bot's win rate for every class sits within 10
   points of the four's average. */

/** The monk's Stillness charges from fighting, not from a clock, so hiding and waiting heals
    nothing. Goal: about one Stillness every 15 to 20 seconds of fighting, as the old 14-second
    clock gave, and the monk's win rate about where it was. */
export const CALM = {
  /** Calm for each hit the monk lands on a foe. */
  hit: 1,
  /** Calm for each hit the monk takes. */
  taken: 2,
  /** Calm it takes to breathe (Stillness is ready). Higher = fewer heals. */
  full: 44,
} as const;

/* The skills you pick when you level up in a Fog run: what each level of each one does, and how
   many levels it has. Plain data, no imports: the names, words and kinds are in src/lib/fog.ts
   (UPGRADES), the rules in src/game/rules.ts and src/game/dungeon/engine.ts.
   They last only that run, so they are measured by the Fog simulator (`pnpm fog:sheet`),
   not by powerScore. Stronger: a bigger number per level, or more levels (`max`). */

export const RUN_SKILL = {
  /** Heavy hands: damage per level. */
  power: { dmg: 0.25, max: 5 },
  /** Quick hands: attack speed per level. */
  haste: { rate: 0.18, max: 5 },
  /** One more: one more shot or swing per level. */
  multi: { max: 3 },
  /** The flame's fire: one more fire circling you per level. */
  flame: { max: 3 },
  /** Spark: every `every` s, lightning jumps between `jumps` + level foes, `dmg` and `dmgPer` a level after the first. */
  spark: { every: 2, jumps: 2, dmg: 14, dmgPer: 6, max: 4 },
  /** Ash nova: every `every` s, a burst `r` wide (`rPer` more a level) for `dmg` (`dmgPer` more a level). */
  nova: { every: 3, r: 90, rPer: 20, dmg: 10, dmgPer: 5, max: 4 },
  /** Swift feet: walk speed per level. */
  swift: { move: 0.12, max: 3 },
  /** Second breath: max HP per level, and a full heal. */
  vital: { hp: 25, max: 4 },
  /** Falling star: every `every` s a star falls on the foe nearest you (in range), hitting all
      within `r` for `dmg` (`dmgPer` more a level), as hard as your damage. Goal: a slow, heavy
      hit you see coming, a third timer next to Spark and Ash nova. Took Pull's place (Edoardo,
      2026-10-29): Pull did little, since a cleared room's light comes to you anyway. */
  star: { every: 4, r: 58, dmg: 34, dmgPer: 16, max: 3 },
  /** Stand firm: less damage taken per level (armor; all armor stops at 60%). */
  guard: { armor: 0.1, max: 3 },

  /* Added 2026-10-29 (Edoardo's picks). Each one pushes a different way to play. */
  /** Cold air: monsters within `r` of you walk `slow` slower per level (not the boss or the mid-boss). Goal: more
      time to step out of the way, as useful to the melee classes as to the ranged. */
  frost: { r: 120, slow: 0.15, max: 3 },
  /** Keen eye: crit chance per level, on top of what you wear. Goal: makes crit gear a choice in a run. */
  keen: { crit: 0.12, max: 3 },
  /** Giant slayer: more damage per level to elites, golems, mid-bosses and bosses. */
  giant: { dmg: 0.3, max: 3 },
  /** Last breath: a monster you bring down bursts, hitting all within `r` for `dmg` (`dmgPer` more a
      level), as hard as your damage. Its burst can bring down the next: kills chain through a pack. */
  blast: { r: 64, dmg: 18, dmgPer: 10, max: 3 },
  /** Momentum: each kill adds a stack for `secs` s (a new kill renews them all), up to `stacks`;
      each stack makes you attack `rate` faster per level. Goal: rewards rushing a room. */
  rush: { rate: 0.06, stacks: 5, secs: 4, max: 3 },
  /** Stand your ground: after `after` s standing still, `less` more armor per level until you move,
      inside the same 60% armor cap (so it can't stack into near-immunity). Goal: rewards planting
      your feet; the opposite of Momentum. */
  stand: { after: 1, less: 0.15, max: 3 },
  /** Wider choice: one more card at every level-up after this one. One level. */
  wide: { cards: 1, max: 1 },
} as const;

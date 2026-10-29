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
} as const;

/* The target power curve (see "Power" in docs/handbook/game/balance.md). Power is `powerScore` in
   src/game/power.ts; the sheet measures a model player against these. */

/** Where a player's power gain since their first workout should come from. Decided by Edoardo
    2026-10-27: training earns most of it, loot stays worth chasing, the forge is a steady bonus. */
export const POWER_SPLIT = { training: 0.4, gear: 0.4, upgrades: 0.2 } as const;

/** How far a share may drift (either way) before the sheet calls it off target. */
export const POWER_SPLIT_SLACK = 0.07;

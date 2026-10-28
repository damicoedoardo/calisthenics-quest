import type { ClassId } from '@/lib/gear';
import { statPower, type Build } from '@/lib/stats';
import type { Power } from '@/lib/fog';
import { ATTACK, HERO_HP, armorOf, attackOf } from './rules';
import { CRIT_HIT, MAX_EVADE, SLAYER_SHARE } from '@/balance';
import { CLASS_BODY } from './dungeon/content';
import { itemTotals, starterKit, type Item, type ItemSlot } from './dungeon/items';

/* One number for how strong a hero is, so training, gear, upgrades and classes can be compared on
   the same scale (docs/handbook/game/balance.md, "Power"). It follows the engine's own formulas
   (applyGear and rules.ts): how fast you kill one foe (crits and slayer counted at their average),
   times how much damage you take before you fall (evade counted as hits that never land). Life
   steal and ability power only show inside a run, so the simulator measures them. Walk speed (the Speed stat, `move`) helps you dodge but
   has no place on this scale: the simulator measures it. It leaves out what only happens inside a run (run skills, chest items, the flame's fire,
   the class ability, the dodge) and how many foes a hit reaches, so it compares builds and gear,
   not classes' whole fights: the simulator does that. */

export interface PowerScore {
  /** Damage a second against one foe. */
  dps: number;
  /** HP over the share of damage that gets through. */
  ehp: number;
  /** sqrt(dps * ehp), scaled so a warrior with no points in the starter kit is 100. Doubling both
      doubles it; doubling one gives x1.41. */
  score: number;
}

/** What a hero with these points, this class and this gear brings into a run. */
export function powerScore(cls: ClassId, build: Build, worn: Partial<Record<ItemSlot, Item>> = {}): PowerScore {
  const { dps, ehp } = raw(cls, build, worn);
  return { dps, ehp, score: (100 * Math.sqrt(dps * ehp)) / reference() };
}

function raw(cls: ClassId, build: Build, worn: Partial<Record<ItemSlot, Item>>) {
  const kit = starterKit(cls),
    t = itemTotals([worn.weapon ?? kit.weapon, worn.armor, worn.charm]),
    p = statPower(build, cls),
    kind = attackOf(cls),
    body = CLASS_BODY[kind];
  const hit = ATTACK[kind].dmg * (1 + p.damage + (t.damage ?? 0)) * body.dmg,
    perSecond = ((1 + p.speed + (t.speed ?? 0)) * body.haste) / ATTACK[kind].cd,
    hp = (HERO_HP + p.health + (t.health ?? 0)) * body.hp,
    armor = armorOf({ ...p, armor: p.armor + body.armor + (t.armor ?? 0) } as Power, {});
  const crit = Math.min(1, p.crit + (t.crit ?? 0)),
    critHit = CRIT_HIT + (t.critDmg ?? 0),
    slayer = 1 + SLAYER_SHARE * (t.slayer ?? 0),
    evade = Math.min(MAX_EVADE, t.evade ?? 0);
  return { dps: hit * perSecond * (1 + crit * (critHit - 1)) * slayer, ehp: hp / (1 - armor) / (1 - evade) };
}

let ref = 0;
/** A warrior with no points in the starter kit: 100. */
function reference(): number {
  if (!ref) {
    const r = raw('warrior', {}, {});
    ref = Math.sqrt(r.dps * r.ehp);
  }
  return ref;
}

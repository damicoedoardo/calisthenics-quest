import type { GameState } from '../game';
import { heroLevel, WEEKLY_GOAL } from '../game';
import { getClass, CLASSES, type ClassId } from '../gear';
import { STATS, pointsFree, type StatId } from '../stats';
import { coins } from '../sweat';
import { embersOf, matsOf } from '../forge';
import { vaultSize } from '../fog-gear';
import { EDGE, FLAME_AT, UPGRADES, ZONES, zoneStatus, MID_FLOOR } from '../fog';
import { spOwned, spTrial } from '../sp';
import { workoutsToLevel } from '../loot';
import { storyState } from '@/story/engine';
import { CHAPTERS } from '@/story/chapters';
import { FLAME_STAGES, flameStage } from '@/story/flame';
import { ABILITIES, abilityOf, SP_MOVES, SP_PASSIVES, spDef } from '@/game/dungeon/content';
import { RARITY } from '@/game/dungeon/items';
import {
  BAG,
  CLASS_LEAN,
  CLASS_LEAN_POINTS,
  CRIT,
  EMBERS,
  FALLOFF,
  FORGE,
  FORGE_RISK,
  GIFTS,
  MATS,
  MAT_IDS,
  MAX_ARMOR,
  MAX_EVADE,
  MAX_PLUS,
  MELT,
  PARTY,
  POINTS,
  RARITY_SIZE,
  ROAD,
  SAFE_POINTS,
  SECOND_LEAN,
  SECOND_LEAN_POINTS,
  SP_TRIAL,
  STARTING_POINTS,
  STEPS,
  SWEAT,
  VAULT,
  XP,
} from '@/balance';

/* The game guide: how FORMA works, as data the coach reads when a player asks ("what are embers
   for?", "why can't I wear this?"). It is the coach's only source on the game, so it can't guess.
   Two rules:
   - Every number comes from src/balance (or the rules in src/lib), never typed in here, so a
     balance change is in the guide the moment it lands. `from` names the balance files a topic
     explains; a test fails when a balance file is in no topic (or in BEHIND_THE_SCENES).
   - No spoilers: a topic can be ahead of the player (`opens`). The guide hands the coach only the
     topics the save has reached; one still ahead comes back as "ahead", with nothing of what it
     says, so the coach can't tell what it never sees. */

/** The files in src/balance, by name. */
export type BalanceFile = 'training' | 'stats' | 'economy' | 'items' | 'dungeon' | 'upgrades' | 'power' | 'classes' | 'coach';

/** Balance files no topic explains, and why: the player never meets these numbers as such. */
export const BEHIND_THE_SCENES: Partial<Record<BalanceFile, string>> = {
  power: 'the power split the sheet measures; players see its parts (points, gear, the forge)',
  coach: "the coach's own dosing rules; the coach uses them through its tools",
};

export interface GuideTopic {
  id: string;
  title: string;
  /** Words a question about it might use (lower case; a word's start is enough). */
  words: string[];
  /** The balance files its numbers come from. */
  from: BalanceFile[];
  /** When the player has reached it; left out, from the start. */
  opens?: (state: GameState, now: Date) => boolean;
  /** What the coach reads: short plain lines, the player's own numbers where they help. */
  text: (state: GameState, now: Date) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const statName = (id: StatId) => STATS.find((s) => s.id === id)?.name ?? id;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** A class in a line: its weapon, ability and leans. */
function classLine(id: ClassId): string {
  const c = getClass(id)!;
  const a = ABILITIES[abilityOf(id)];
  return `${c.name} (${c.weapon}): "${c.pitch}" Ability ${a.name}: ${a.text} Leans to ${statName(CLASS_LEAN[id])} (as if +${CLASS_LEAN_POINTS} points) and ${statName(SECOND_LEAN[id])} (+${SECOND_LEAN_POINTS}).`;
}

/** Words that say nothing about what is asked. */
const STOP = new Set(['the', 'an', 'and', 'or', 'is', 'are', 'do', 'does', 'me', 'my', 'you', 'your', 'to', 'of', 'in', 'on', 'for', 'what', 'how', 'why', 'when', 'can', 'it', 'this', 'that', 'with', 'get', 'forma', 'app', 'about', 'tell', 'work', 'works']);

function tokens(t: string): string[] {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9+\- ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

const zoneOpen = (state: GameState, i: number) => zoneStatus(state, ZONES[i]).state !== 'locked';

export const GUIDE: GuideTopic[] = [
  {
    id: 'loop',
    title: 'How FORMA works',
    words: ['game', 'loop', 'play', 'basics', 'overview', 'earn', 'spend', 'training', 'stronger', 'power', 'grow', 'better'],
    from: ['training'],
    text: () =>
      [
        'Training earns, play spends. Real workouts always win: they give XP (your hero level), stat points, embers, sweat coins, and move the story on.',
        'The Fog (Play tab) is the game between workouts: a dungeon crawl where you can lose. What you find there and how you spend what training gave you is what makes you strong in it.',
        'Only real training makes you stronger; a run never takes away points, level or story.',
        `The weekly goal is ${WEEKLY_GOAL} workouts. The Today tab shows what the next workout gives; the purse on the Hero tab shows what you have (tap it for the loot guide).`,
      ].join('\n'),
  },
  {
    id: 'xp',
    title: 'XP and hero level',
    words: ['xp', 'level', 'experience', 'streak', 'comeback', 'perfect', 'week'],
    from: ['training'],
    text: (s, now) =>
      [
        `A full workout gives ${XP.full} XP, a short one (the Rough check-in) ${XP.mini}. The workout that hits the weekly goal (${WEEKLY_GOAL}) gives ${XP.perfectWeek} more.`,
        `Each perfect week in a row adds ${pct(XP.streakStep)} to a workout's XP, up to +${pct(XP.streakStep * XP.streakMax)}. Coming back after ${XP.comebackDays}+ days away gives ${XP.comeback} more: coming back is a win.`,
        `Every level costs ${XP.perLevel} XP. Your level lets you wear better items from the Fog (each item asks for one).`,
        `The player now: level ${heroLevel(s)}, about ${plural(workoutsToLevel(s, now), 'workout')} to the next.`,
      ].join('\n'),
  },
  {
    id: 'points',
    title: 'Stat points and the stats',
    words: ['stat', 'point', 'health', 'hp', 'armor', 'damage', 'haste', 'speed', 'walk', 'attack', 'build', 'respec', 'reset', 'spend'],
    from: ['stats'],
    text: (s) =>
      [
        `Workouts earn stat points: ${POINTS.full} for a full workout, ${POINTS.mini} for a short one, ${POINTS.week} more for each week at the goal, ${POINTS.better} more when a set beats last time. Every hero starts with ${STARTING_POINTS}.`,
        `Spend them on the Hero tab (Stats). The stats: ${STATS.map((x) => `${x.name} (${x.text.toLowerCase()})`).join(', ')}. Crit is not a stat: it comes from what you wear.`,
        `Each point in the same stat is worth a little less (the ${FALLOFF}th is worth half the first), so spreading pays. Armor blocks at most ${pct(MAX_ARMOR)} of a hit.`,
        `Points spent since your last workout come back free with the minus. Taking all of them back to start over costs ${plural(SWEAT.respec, 'sweat coin')}.`,
        `The player now: ${plural(pointsFree(s), 'point')} waiting to be spent.`,
      ].join('\n'),
  },
  {
    id: 'crit',
    title: 'Crits, evade and item bonuses',
    words: ['crit', 'critical', 'evade', 'dodge', 'bonus', 'life', 'steal', 'leech', 'slayer'],
    from: ['stats', 'items'],
    text: () =>
      [
        `Every hero has ${pct(CRIT.base)} crit chance and a crit does x${CRIT.hit} damage. Weapons add their own crit (the bow the most), and item bonuses add crit chance and crit damage.`,
        'Item bonuses can also give damage, attack speed, HP, armor, move speed, heal on kill, a faster ability, slayer (more to elites and bosses), life steal, evade and ability power.',
        `Evade (a hit misses you) never goes above ${pct(MAX_EVADE)}: you still have to dodge. The dodge itself is a button (Space on a keyboard).`,
      ].join('\n'),
  },
  {
    id: 'items',
    title: 'Items, rarity and wearing them',
    words: ['item', 'gear', 'loot', 'rarity', 'common', 'magic', 'rare', 'legendary', 'weapon', 'armor', 'charm', 'wear', 'drop', 'bag', 'equip', 'cant'],
    from: ['items'],
    text: () =>
      [
        'Gear only comes from the Fog. Three slots: a weapon (made for one class), armor, and a charm anyone can wear.',
        `Rarity: ${(Object.keys(RARITY) as (keyof typeof RARITY)[]).map((r) => `${RARITY[r].name} (${RARITY_SIZE[r].bonuses[0] === RARITY_SIZE[r].bonuses[1] ? RARITY_SIZE[r].bonuses[0] : RARITY_SIZE[r].bonuses.join('-')} bonuses)`).join(', ')}. Elites, golems, chests and bosses drop more and rarer; deeper floors lean rarer too.`,
        "An item's level is its zone and floor: deeper beats color, so a deep rare can beat a shallow legendary. Each card shows a green up or red down arrow against what you wear.",
        'An item asks for a hero level and stat points before you can wear it: both come only from workouts, so the card says how far away it is.',
        `The bag holds ${BAG} items in a run.`,
      ].join('\n'),
  },
  {
    id: 'fall',
    title: 'Falling in a run, the vault',
    words: ['fall', 'die', 'death', 'lose', 'lost', 'vault', 'keep', 'safe', 'stairs', 'home', 'permadeath'],
    from: ['economy'],
    text: (s) =>
      [
        'A fall only loses the items you found that run and still carry in the bag. What you wear, and anything you brought from home, always comes back. Points, level and story are never lost.',
        'A win, or walking out by the stairs, puts the bag in the vault at home.',
        `The vault holds ${VAULT.start} items, one more every ${VAULT.every} workouts, up to ${VAULT.max}. What a full vault can't take is melted into embers. The player's vault now: ${vaultSize(s.sessions.length)} slots.`,
        'Runs are free: play again as often as you like.',
      ].join('\n'),
  },
  {
    id: 'forge',
    title: "Embers and Mira's forge (+1 to +5)",
    words: ['ember', 'forge', 'mira', 'upgrade', 'plus', 'reroll', 'melt', 'salvage'],
    from: ['economy', 'upgrades'],
    text: (s) =>
      [
        `Embers: ${EMBERS.full} for a full workout, ${EMBERS.mini} for a short one. Melting an item down gives more (${MELT.common} for a common up to ${MELT.legendary} for a legendary, more for each plus).`,
        `Mira's forge (Hero tab, Gear) takes an item up one plus at a time, up to +${MAX_PLUS}. +1 to +5 cost embers only (${STEPS.slice(0, 5).map((x) => x.embers).join(', ')}) and always hold: training alone gets you there. Each plus makes the item about ${pct(STEPS[0].boost)} stronger.`,
        `Reroll changes one bonus for ${FORGE.reroll} embers. The starter kit can't be forged or melted.`,
        'A forged item glows more as it climbs; legendaries burn red instead.',
        `The player now: ${embersOf(s)} embers.`,
      ].join('\n'),
  },
  {
    id: 'forge-high',
    title: 'The forge past +5, co-op materials',
    words: ['material', 'mats', 'thread', 'shard', 'coal', 'heartstone', 'heart', 'miss', 'slip', 'odds', 'chance', 'coop', 'co-op', 'gift', 'pity'],
    from: ['upgrades'],
    text: (s) => {
      const first = (m: (typeof MAT_IDS)[number]) => STEPS.findIndex((x) => (x.mats[m] ?? 0) > 0) + 1;
      const miss = STEPS.findIndex((x) => x.odds < 1) + 1;
      const have = matsOf(s);
      return [
        `From +6 a step also asks for co-op materials, which only drop when you play with friends (or a friend gives them, up to ${GIFTS.perDay} a day). ${MAT_IDS.map((m) => `${MATS[m].name}: from ${MATS[m].from}, needed from +${first(m)}`).join('. ')}.`,
        `From +${miss} a step can miss (the chance falls to ${pct(STEPS[MAX_PLUS - 1].odds)} at +${MAX_PLUS}). The embers and materials are spent either way; a miss may slip the item one plus, but never below a safe mark it reached (+${SAFE_POINTS.join(', +')}). Nothing ever breaks.`,
        `Each miss adds ${pct(FORGE_RISK.pity)} to the next try on that step, and having trained in the last ${FORGE_RISK.restedDays} days adds ${pct(FORGE_RISK.rested)}.`,
        `The player now: ${MAT_IDS.map((m) => `${have[m] ?? 0} ${MATS[m].name}`).join(', ')}.`,
      ].join('\n');
    },
  },
  {
    id: 'coins',
    title: 'Sweat coins',
    words: ['coin', 'sweat', 'class', 'change', 'respec', 'reset'],
    from: ['economy'],
    text: (s) =>
      [
        `Every workout earns ${plural(SWEAT.perWorkout, 'sweat coin')}. They pay for changing who you are: starting your stat points over costs ${SWEAT.respec}, changing class ${SWEAT.classChange}.`,
        `The class pick in the opening is free, and so is the first ${SWEAT.freeChanges === 1 ? 'change' : `${SWEAT.freeChanges} changes`} after it.`,
        `The player now: ${plural(coins(s), 'coin')}.`,
      ].join('\n'),
  },
  {
    id: 'classes',
    title: 'The four classes',
    words: ['class', 'classes', 'best', 'strongest', 'pick', 'warrior', 'archer', 'monk', 'mage', 'sword', 'bow', 'staff', 'wand', 'ability', 'charge', 'volley', 'blink', 'stillness'],
    from: ['classes'],
    text: (s) =>
      [
        'A class only changes how you fight in the Fog. None is stronger than another.',
        ...CLASSES.map((c) => classLine(c.id)),
        `The player's class: ${getClass(s.profile.classId)?.name ?? 'not picked yet'}. Changing it is on the Hero tab (Class), for sweat coins.`,
      ].join('\n'),
  },
  {
    id: 'fog',
    title: 'The Fog: zones, floors and runs',
    words: ['fog', 'run', 'dungeon', 'zone', 'floor', 'boss', 'mid', 'warden', 'skill', 'flame', 'fire', 'rested', 'fresh', 'sideways', 'keys', 'map'],
    from: ['dungeon', 'stats'],
    text: (s) => {
      const open = ZONES.filter((_, i) => zoneOpen(s, i)).length;
      return [
        `Each zone is a dungeon of ten floors: rooms to clear down to the stairs, a mid-boss on floor ${MID_FLOOR}, and the zone's boss at the bottom. A zone opens when the boss before it falls and its story chapter has begun. The player has ${plural(open, 'zone')} open.`,
        'Your hero attacks on its own in the class style; you move, dodge and use the ability. The phone is held sideways for a run; on a computer it plays with keys.',
        `In a run, monsters drop light; each level-up there offers three skills to pick (${UPGRADES.map((u) => u.name.replace('{flame}', s.profile.flame?.trim() || 'Ember')).join(', ')}). They last only that run.`,
        `Workouts call the flame's fires to circle you (at ${FLAME_AT.join(', ')} workouts). Training in the last two days starts a run with a free skill; resting (a day off, or a minute by the fire) gives one more.`,
        `Once a chapter's hearts are all gone and its boss still stands, that boss fights with ${pct(EDGE.bossHp)} of its HP, and each workout since starts a run with one more free skill (up to ${EDGE.picks}).`,
      ].join('\n');
    },
  },
  {
    id: 'story',
    title: 'Chapters and hearts',
    words: ['story', 'chapter', 'heart', 'enemy', 'month', 'next', 'end', 'finale'],
    from: ['training'],
    text: (s) => {
      const st = storyState(s);
      return [
        'The story moves with workouts, not strength: every workout takes one heart off the chapter\'s enemy, and when its hearts are gone the next chapter opens.',
        st.chapter ? `The player is in chapter ${st.chapter.n} of ${CHAPTERS.length}, ${st.chapter.name}: ${plural(st.heartsLeft, 'heart')} left.` : 'The player has finished the story.',
        'Never tell what happens later in the story: that is theirs to find.',
      ].join('\n');
    },
  },
  {
    id: 'rest',
    title: 'Rest days',
    words: ['rest', 'fire', 'sit', 'day', 'off', 'recover'],
    from: ['upgrades'],
    text: () =>
      [
        "Every day of the week without a workout is a rest day, and it is part of the plan: you keep it by sitting by the fire that day (the day's page, Today, or the Train tab).",
        `Rested, your Fog runs that day start with a free skill. Having trained in the last ${FORGE_RISK.restedDays} days also helps the forge (+${pct(FORGE_RISK.rested)} on a try).`,
      ].join('\n'),
  },
  {
    id: 'coop',
    title: 'Playing with friends',
    words: ['friend', 'party', 'together', 'coop', 'co-op', 'multiplayer', 'revive', 'road', 'voice'],
    from: ['dungeon', 'training'],
    text: () =>
      [
        'The Friends tab: add friends, see who is online, make a party of 2 to 4 and play a Fog run together (with voice).',
        `A friend who falls can be brought back: stand next to them for ${PARTY.revive.secs} s and they're up with ${pct(PARTY.revive.hp)} of their HP. Down the stairs, anyone still down gets up.`,
        'Moves that heal or guard also cover friends standing close.',
        'Only co-op runs drop the materials the forge needs past +5.',
        `The Ember Road is a story you walk with friends: each of its chapters opens ${ROAD.gap} of your workouts after the one before, once your party beat the boss before it.`,
      ].join('\n'),
  },
  {
    id: 'flame',
    title: 'Your flame',
    words: ['flame', 'ember', 'spark', 'candle', 'torch', 'grow', 'form', 'coach'],
    from: [],
    text: (s) => {
      const now = flameStage(s.sessions.length);
      const next = FLAME_STAGES.find((f) => f.at > s.sessions.length);
      // Only the form after this one: the later ones are the story's to show.
      return [
        `The flame grows with workouts. Now: ${now.name}. ${now.gives}`,
        next ? `Next: ${next.name} at ${next.at} workouts (${next.at - s.sessions.length} to go). ${next.gives} Don't tell what comes after it.` : 'It has reached its last form.',
      ].join('\n');
    },
  },
  {
    id: 'sp',
    title: 'SPs (specialist forms)',
    words: ['sp', 'specialist', 'card', 'form', 'transform', 'final', 'passive', 'trial', 'wanderer'],
    from: ['classes'],
    opens: (s) => !!s.sp,
    text: (s) => {
      const t = spTrial(s)!;
      const own = spOwned(s);
      const lines = ['An SP is a form your training wakes in you: its own look, weapon and basic attack, its own move (a second button), a final that fills as you fight, and a passive that is always on. None is stronger than another.'];
      if (!own.includes(1)) lines.push(`The first SP is sealed until its trial is done: ${SP_TRIAL.workouts} more workouts (${t.workouts} done) and a run that reaches the mid-boss floor (${t.floor ? 'done' : 'not yet'}).`);
      for (const n of own) {
        const d = spDef(s.profile.classId, n);
        lines.push(`${d.name}: ${d.about} Move ${SP_MOVES[d.skill].name}: ${SP_MOVES[d.skill].text} Final ${SP_MOVES[d.final].name}: ${SP_MOVES[d.final].text} Passive ${SP_PASSIVES[d.passive].name}: ${SP_PASSIVES[d.passive].text}`);
      }
      lines.push('Wear or take off an SP on the Hero tab (Class). Only talk about the SPs listed here.');
      return lines.join('\n');
    },
  },
  // One topic per zone: its boss and the rule that beats it, once the zone is open.
  ...ZONES.map(
    (z, i): GuideTopic => ({
      id: `zone-${i + 1}`,
      title: `Zone ${i + 1}: ${z.name}`,
      words: [...tokens(z.name), ...tokens(z.bossName), z.name.toLowerCase(), z.bossName.toLowerCase(), 'boss', `zone ${i + 1}`],
      from: [],
      opens: (s) => zoneOpen(s, i),
      text: (s) => `${z.name}, the zone of chapter ${z.chapter}. Its boss: ${z.bossName}. ${z.hint}${zoneStatus(s, z).state === 'cleared' ? ' The player has beaten it.' : ''}`,
    }),
  ),
  {
    id: 'you',
    title: 'What the player has now',
    words: ['purse', 'wallet', 'inventory', 'currently', 'have'],
    from: [],
    text: (s, now) =>
      `Level ${heroLevel(s)} (${plural(workoutsToLevel(s, now), 'workout')} to the next), ${plural(pointsFree(s), 'stat point')} to spend, ${embersOf(s)} embers, ${plural(coins(s), 'sweat coin')}, ${plural(s.sessions.length, 'workout')} done, class ${getClass(s.profile.classId)?.name ?? 'none yet'}.`,
  },
];

const AHEAD = 'Ahead: the player has not reached this yet. Don\'t explain it or guess what it is; say warmly that they will find out on the way.';


/** How well a topic fits the question's words: a word that starts one of the topic's words (or
    the other way round, for plurals: "embers", "crits") counts. */
function score(topic: GuideTopic, words: string[], said: string): number {
  const own = [...topic.words, ...tokens(topic.title)];
  let n = 0;
  for (const w of words) if (own.some((o) => o === w || (w.length > 2 && (o.startsWith(w) || w.startsWith(o))))) n += 1;
  // A zone or boss named in full ("the perfect knight") beats the loose words.
  for (const o of topic.words) if (o.includes(' ') && said.includes(o)) n += 3;
  return n;
}

const isOpen = (t: GuideTopic, state: GameState, now: Date) => !t.opens || t.opens(state, now);

/** The topics the player has reached, as an index. */
export function guideIndex(state: GameState, now: Date): string {
  return `Topics: ${GUIDE.filter((t) => isOpen(t, state, now)).map((t) => t.title).join('; ')}.`;
}

/** What the guide says about a question: the best few topics the player has reached, in full.
    A topic still ahead is named only as ahead, and only when it fits best. */
export function askGuide(state: GameState, question: string, now: Date, max = 3): string {
  const words = tokens(question);
  if (!words.length) return guideIndex(state, now);
  const said = question.toLowerCase();
  const ranked = GUIDE.map((t) => ({ t, n: score(t, words, said) }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  if (!ranked.length) return `Nothing in the guide on that. Say you're not sure rather than guess.\n${guideIndex(state, now)}`;
  const top = ranked[0].n;
  const best = ranked.filter((r) => r.n === top);
  // The best fit is something still ahead (and nothing reached fits as well): say only that.
  if (best.every((r) => !isOpen(r.t, state, now))) return AHEAD;
  return ranked
    .filter((r) => isOpen(r.t, state, now))
    .slice(0, max)
    .map((r) => `## ${r.t.title}\n${r.t.text(state, now)}`)
    .join('\n\n');
}

'use client';

import { useSyncExternalStore } from 'react';
import { getStat, type Build } from '@/lib/stats';
import { bandOf, betterBy, boostAt, BONUSES, foundAt, levelShort, type BonusId, looksOf, nameOf, otherClass, RARITY, SLOT_NAME, shortOf, type Item, type Rarity } from '@/game/dungeon/items';
import { getClass, type ClassId } from '@/lib/gear';
import { BANDS } from '@/balance';
import { PlusGlow } from './PlusGlow';
import { Sprite } from './Sprite';

/* An item's art in a frame of its rarity's color, and its card. The art is the item's own
   (src/sprites/characters/items.ts): rares shine, legendaries burn and a forged item shines more
   with each plus (PlusGlow), all still if the phone asks for less motion. */

const MOTION = '(prefers-reduced-motion: reduce)';
function subscribe(fn: () => void) {
  const q = window.matchMedia?.(MOTION);
  q?.addEventListener('change', fn);
  return () => q?.removeEventListener('change', fn);
}
/** True when the phone asks for less motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => !!window.matchMedia?.(MOTION).matches, () => true);
}

/** The backdrop and edge of each rarity: plain, blue, gold, a burning orange. */
const FRAME: Record<Rarity, { edge: string; back: string; glow?: string }> = {
  common: { edge: '#475569', back: 'radial-gradient(circle at 50% 40%, #1e2330 0%, #0b0d14 75%)' },
  magic: { edge: RARITY.magic.color, back: 'radial-gradient(circle at 50% 40%, rgba(96,165,250,.28) 0%, #0b0d14 72%)' },
  rare: { edge: RARITY.rare.color, back: 'radial-gradient(circle at 50% 40%, rgba(250,204,21,.26) 0%, #0b0d14 72%)', glow: '0 0 6px rgba(250,204,21,.35)' },
  legendary: { edge: RARITY.legendary.color, back: 'radial-gradient(circle at 50% 40%, rgba(251,146,60,.5) 0%, rgba(124,45,18,.35) 45%, #0b0d14 80%)', glow: '0 0 12px 2px rgba(251,146,60,.55)' },
};

/** The art's size for a tile: a multiple of 16 so its pixels stay even on a 2x screen. The art has
    a margin for its glow, so it can be a little bigger than the tile. */
const artSize = (size: number) => Math.max(16, Math.round((size * 1.2) / 16) * 16);

/** An item's art in a tile edged and lit in its rarity's color. */
export function ItemTile({ item, size = 40, dim = false, than }: { item: Item; size?: number; dim?: boolean; than?: Item | 'none' }) {
  const f = FRAME[item.rarity],
    still = useReducedMotion(),
    art = artSize(size);
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-lg ${dim ? 'opacity-50 grayscale' : ''}`} style={{ width: size, height: size, background: f.back, boxShadow: `0 0 0 2px ${f.edge}${f.glow ? `, ${f.glow}` : ''}` }}>
      <PlusGlow item={item} />
      <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Sprite id="item" opts={looksOf(item)} size={art} playing={!still} label="" />
      </span>
      {than && <UpDown pct={betterBy(item, than === 'none' ? undefined : than)} />}
      {item.plus ? <span className="absolute -bottom-1 -right-1 rounded bg-ink-950/90 px-0.5 font-mono text-[8px] leading-tight text-gold-300">+{item.plus}</span> : null}
    </span>
  );
}

/** A small green up or red down arrow in a tile's corner: better or worse than what you wear. */
function UpDown({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) return null;
  const up = pct > 0;
  return (
    <span className={`absolute -left-1 -top-1 rounded px-0.5 font-mono text-[9px] font-bold leading-tight ${up ? 'bg-emerald-400 text-ink-950' : 'bg-red-500/90 text-white'}`} aria-label={up ? 'Better than yours' : 'Weaker than yours'}>
      {up ? '▲' : '▼'}
    </span>
  );
}

/** What an item asks of your points, and whether you have it ("Needs Damage 24 · you have 18"). */
export function needLine(item: Item, build: Build): { text: string; ok: boolean } | null {
  if (!item.need) return null;
  const have = build[item.need.stat] ?? 0,
    ok = shortOf(item, build) === 0;
  return { text: `Needs ${getStat(item.need.stat).name} ${item.need.n}${ok ? '' : ` · you have ${have}`}`, ok };
}

/** The hero level an item asks for, and whether you have it ("Needs level 9 · you're level 7"). */
export function levelLine(item: Item, level: number): { text: string; ok: boolean } | null {
  if (!item.needLevel) return null;
  const ok = levelShort(item, level) === 0;
  return { text: `Needs level ${item.needLevel}${ok ? '' : ` · you're level ${level}`}`, ok };
}

/** An item on one card: its art on a stage lit in its rarity's color, the name in that color,
    where it was found, what it gives, how it compares with what you wear (`than`: that item, or
    'none' when the slot is empty), what it asks (a hero level, points in a stat). */
export function ItemCard({ item, build, level, cls, than, children }: { item: Item; build: Build; level: number; cls?: ClassId; than?: Item | 'none'; children?: React.ReactNode }) {
  const need = needLine(item, build),
    needLv = levelLine(item, level),
    other = otherClass(item, cls),
    at = foundAt(item),
    pct = than ? betterBy(item, than === 'none' ? undefined : than) : null,
    f = FRAME[item.rarity],
    still = useReducedMotion(),
    color = RARITY[item.rarity].color,
    legend = item.rarity === 'legendary';
  return (
    <div className="overflow-hidden rounded-xl bg-ink-800 text-left ring-1" style={{ ['--tw-ring-color' as string]: item.rarity === 'common' ? '#334155' : `${color}80` }}>
      <div className="relative grid h-28 place-items-center overflow-hidden" style={{ background: f.back }}>
        {/* The plus's shine (rays from +13) and a legendary's fire. */}
        <PlusGlow item={item} round="rounded-none" rays />
        <Sprite id="item" opts={looksOf(item)} size={128} playing={!still} label={`${RARITY[item.rarity].name} ${SLOT_NAME[item.slot].toLowerCase()}`} className="relative" />
        <span className="absolute left-2 top-2 rounded px-1.5 py-0.5 font-pixel text-[7px] uppercase tracking-wide text-ink-950" style={{ background: item.rarity === 'common' ? '#94a3b8' : color }}>
          {RARITY[item.rarity].name}
        </span>
        {item.plus ? (
          <span className="absolute right-2 top-2 rounded bg-ink-950/80 px-1.5 py-0.5 text-right font-mono text-[10px] text-gold-300">
            +{item.plus}
            {bandOf(item.plus) > 0 && <span className="block font-pixel text-[6px] uppercase tracking-wide text-orange-200">{BANDS[bandOf(item.plus)].name}</span>}
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className={`font-semibold leading-tight ${legend ? 'text-base' : 'text-sm'}`} style={{ color, textShadow: legend ? '0 0 8px rgba(251,146,60,.6)' : item.rarity === 'rare' ? '0 0 6px rgba(250,204,21,.35)' : undefined }}>
          {nameOf(item)}
        </p>
        <p className="text-[10px] text-slate-500">
          {RARITY[item.rarity].name} {SLOT_NAME[item.slot].toLowerCase()}
          {at && ` · item level ${at.level} · zone ${at.zone}, floor ${at.floor}`}
        </p>
        {pct !== null && (
          <p className={`mt-2 inline-block rounded-md px-2 py-1 text-xs font-semibold ${pct > 0 ? 'bg-emerald-500/15 text-emerald-300' : pct < 0 ? 'bg-red-500/15 text-red-300' : 'bg-ink-700 text-slate-300'}`}>
            {pct > 0 ? `▲ ${pct}% stronger than yours` : pct < 0 ? `▼ ${-pct}% weaker than yours` : 'About the same as yours'}
          </p>
        )}
        {/* What it gives: the base lines, then its bonuses in its rarity's color; the number on the right. */}
        <ul className="mt-3 divide-y divide-ink-700/70 rounded-lg bg-ink-900/70 px-3 text-[13px]">
          {[...item.base.map((b) => ({ b, bonus: false })), ...item.bonuses.map((b) => ({ b, bonus: true }))].map(({ b, bonus }, i) => {
            const { label, value } = splitLine(b.id, BONUSES[b.id].show(b.v * boostAt(item.plus ?? 0)));
            return (
              <li key={i} className="flex items-center justify-between gap-3 py-1.5">
                <span className="flex min-w-0 items-center gap-2 text-slate-300">
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: bonus ? color : '#94a3b8' }} />
                  <span className="truncate">{label}</span>
                </span>
                <span className="shrink-0 font-pixel text-[10px]" style={{ color: bonus ? color : '#e2e8f0' }}>
                  {value}
                </span>
              </li>
            );
          })}
        </ul>
        {/* What it asks: a chip each, red while you are short. */}
        {(other || needLv || need) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {other && <Need ok={false} text={`${getClass(other)?.name ?? other} only`} />}
            {needLv && <Need ok={needLv.ok} text={needLv.text} />}
            {need && <Need ok={need.ok} text={need.text} />}
          </div>
        )}
        {children && <div className="mt-3 flex gap-2">{children}</div>}
      </div>
    </div>
  );
}

/** Words after a bonus's number where its name alone doesn't say it. */
const UNIT: Partial<Record<BonusId, string>> = { health: ' HP', heal: ' HP', armor: ' hurt', cooldown: ' faster' };

/** A line of what an item gives, as the bonus's name and its number ("+12% damage" → "Damage", "+12%"). */
function splitLine(id: BonusId, line: string): { label: string; value: string } {
  const m = line.match(/[+-]?\d[\d.,]*%?/);
  return { label: BONUSES[id].name, value: m ? m[0] + (UNIT[id] ?? '') : line };
}

/** One thing an item asks for, as a chip: green once you have it, red while you don't. */
function Need({ ok, text }: { ok: boolean; text: string }) {
  return <span className={`rounded-md px-2 py-1 text-[11px] ${ok ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/15 text-red-300 ring-1 ring-red-400/40'}`}>{ok ? '✓ ' : ''}{text}</span>;
}

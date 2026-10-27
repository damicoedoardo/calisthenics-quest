'use client';

import { useSyncExternalStore } from 'react';
import { getStat, type Build } from '@/lib/stats';
import { itemLines, looksOf, nameOf, RARITY, SLOT_NAME, shortOf, type Item, type Rarity } from '@/game/dungeon/items';
import { Sprite } from './Sprite';

/* An item's art in a frame of its rarity's color, and its card. The art is the item's own
   (src/sprites/characters/items.ts): rares shine, legendaries glow and sparkle, still if the phone
   asks for less motion. */

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
export function ItemTile({ item, size = 40, dim = false }: { item: Item; size?: number; dim?: boolean }) {
  const f = FRAME[item.rarity],
    still = useReducedMotion(),
    art = artSize(size);
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-lg ${dim ? 'opacity-50 grayscale' : ''}`} style={{ width: size, height: size, background: f.back, boxShadow: `0 0 0 2px ${f.edge}${f.glow ? `, ${f.glow}` : ''}` }}>
      {item.rarity === 'legendary' && <span aria-hidden className="absolute inset-0 rounded-lg motion-safe:animate-pulse" style={{ boxShadow: 'inset 0 0 10px rgba(253,186,116,.55)' }} />}
      <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <Sprite id="item" opts={looksOf(item)} size={art} playing={!still} label="" />
      </span>
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

/** An item on one card: its art on a stage lit in its rarity's color, the name in that color,
    what it gives, what it asks. */
export function ItemCard({ item, build, children }: { item: Item; build: Build; children?: React.ReactNode }) {
  const need = needLine(item, build),
    f = FRAME[item.rarity],
    still = useReducedMotion(),
    color = RARITY[item.rarity].color,
    legend = item.rarity === 'legendary';
  return (
    <div className="overflow-hidden rounded-xl bg-ink-800 text-left ring-1" style={{ ['--tw-ring-color' as string]: item.rarity === 'common' ? '#334155' : `${color}80` }}>
      <div className="relative grid h-28 place-items-center overflow-hidden" style={{ background: f.back }}>
        {legend && (
          // slow light rays behind a legendary
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 opacity-40 motion-safe:animate-[spin_18s_linear_infinite]"
            style={{ background: 'repeating-conic-gradient(rgba(253,186,116,.35) 0deg 10deg, transparent 10deg 30deg)', maskImage: 'radial-gradient(circle, #000 20%, transparent 65%)', WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 65%)' }}
          />
        )}
        <Sprite id="item" opts={looksOf(item)} size={128} playing={!still} label={`${RARITY[item.rarity].name} ${SLOT_NAME[item.slot].toLowerCase()}`} className="relative" />
        <span className="absolute left-2 top-2 rounded px-1.5 py-0.5 font-pixel text-[7px] uppercase tracking-wide text-ink-950" style={{ background: item.rarity === 'common' ? '#94a3b8' : color }}>
          {RARITY[item.rarity].name}
        </span>
        {item.plus ? <span className="absolute right-2 top-2 rounded bg-ink-950/80 px-1.5 py-0.5 font-mono text-[10px] text-gold-300">+{item.plus}</span> : null}
      </div>
      <div className="p-3">
        <p className={`font-semibold leading-tight ${legend ? 'text-base' : 'text-sm'}`} style={{ color, textShadow: legend ? '0 0 8px rgba(251,146,60,.6)' : item.rarity === 'rare' ? '0 0 6px rgba(250,204,21,.35)' : undefined }}>
          {nameOf(item)}
        </p>
        <p className="text-[10px] text-slate-500">
          {RARITY[item.rarity].name} {SLOT_NAME[item.slot].toLowerCase()}
        </p>
        <ul className="mt-1 space-y-0.5 text-xs text-slate-300">
          {itemLines(item).map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        {need && <p className={`mt-1 text-xs ${need.ok ? 'text-slate-500' : 'text-red-300'}`}>{need.text}</p>}
        {children && <div className="mt-3 flex gap-2">{children}</div>}
      </div>
    </div>
  );
}

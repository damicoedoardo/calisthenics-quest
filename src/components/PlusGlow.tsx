'use client';

import { bandOf, glowOf, type Item } from '@/game/dungeon/items';
import { BANDS } from '@/balance';
import { useReducedMotion } from './ItemCard';

/* How an item forged at Mira's looks for its plus, like NosTale's SP: a new look every few steps
   (BANDS in src/balance/upgrades.ts). +4 a warm glow, +7 an aura in its rarity's color, +10 sparks,
   +13 flames around it, +15 its own red fire. It sits over a `relative` box and fills it; still if
   the phone asks for less motion. */

/** Where each spark starts, across the bottom, and when (s). */
const SPARKS = [
  [12, 0],
  [30, 0.5],
  [50, 0.2],
  [68, 0.8],
  [86, 0.35],
  [40, 1.1],
  [76, 1.4],
] as const;

/** `behind`: a round light behind a figure (the hero) instead of a lit frame. */
export function PlusGlow({ item, round = 'rounded-lg', behind = false }: { item: Pick<Item, 'plus' | 'rarity'>; round?: string; behind?: boolean }) {
  const still = useReducedMotion(),
    plus = item.plus ?? 0,
    band = bandOf(plus),
    color = glowOf(item);
  if (!band || !color) return null;
  const b = BANDS[band],
    ring = band >= 5 ? '#ef4444, #fbbf24, #ef4444, #f97316, #ef4444' : '#fb923c, #fde68a, #fb923c, transparent, #fb923c';
  return (
    <span aria-hidden className={`pointer-events-none absolute inset-0 ${round}`}>
      {/* The glow: soft from +4, brighter and breathing from +7. */}
      <span
        className={`absolute inset-0 ${round} ${band >= 2 && !still ? 'animate-pulse' : ''}`}
        style={behind ? { background: `radial-gradient(circle at 50% 58%, ${color}${band >= 2 ? '88' : '55'} 0%, ${color}22 ${30 + band * 6}%, transparent 68%)` } : { boxShadow: `0 0 ${4 + band * 3}px ${band}px ${color}${band >= 2 ? 'aa' : '66'}, inset 0 0 ${4 + band * 2}px ${color}55` }}
      />
      {/* Flames around it from +13: a turning ring of fire at the edge. */}
      {b.blaze && (
        <span
          className={`absolute -inset-1 ${round} opacity-70 ${still ? '' : band >= 5 ? 'animate-[spin_2.5s_linear_infinite]' : 'animate-[spin_5s_linear_infinite]'}`}
          style={{ background: `conic-gradient(${ring})`, WebkitMask: 'radial-gradient(closest-side, transparent 78%, #000 92%)', mask: 'radial-gradient(closest-side, transparent 78%, #000 92%)' }}
        />
      )}
      {/* Sparks rising from +10. */}
      {b.sparks && !still && (
        <span className={`absolute inset-0 overflow-hidden ${round}`}>
          {SPARKS.slice(0, band >= 4 ? 7 : 4).map(([x, d], i) => (
            <span key={i} className="absolute bottom-0 h-1 w-1 animate-spark rounded-full" style={{ left: `${x}%`, background: i % 2 ? '#ffffff' : color, animationDelay: `${d}s`, animationDuration: band >= 5 ? '1.1s' : undefined }} />
          ))}
        </span>
      )}
    </span>
  );
}

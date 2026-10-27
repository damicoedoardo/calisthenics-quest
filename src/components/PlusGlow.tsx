'use client';

import { bandOf, glowOf, type Item } from '@/game/dungeon/items';
import { BANDS } from '@/balance';
import { useReducedMotion } from './ItemCard';

/* The light on an item, over a `relative` box that it fills; still if the phone asks for less motion.
   Two kinds (Edoardo's call): the shine comes from forging at Mira's, a new look every few pluses
   like NosTale's SP (BANDS in src/balance/upgrades.ts: +4 a warm glow, +7 its rarity's color, +10
   sparks, +13 light rays, +15 the full radiance), and a legendary burns, a turning ring of red
   fire with sparks, whatever its plus. */

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

function Sparks({ n, color, fast, round }: { n: number; color: string; fast: boolean; round: string }) {
  return (
    <span className={`absolute inset-0 overflow-hidden ${round}`}>
      {SPARKS.slice(0, n).map(([x, d], i) => (
        <span key={i} className="absolute bottom-0 h-1 w-1 animate-spark rounded-full" style={{ left: `${x}%`, background: i % 2 ? '#ffffff' : color, animationDelay: `${d}s`, animationDuration: fast ? '1.1s' : undefined }} />
      ))}
    </span>
  );
}

/** A legendary's fire: a ring of red and gold turning at its edge, and sparks rising. */
export function LegendFire({ round = 'rounded-lg' }: { round?: string }) {
  const still = useReducedMotion();
  return (
    <span aria-hidden className={`pointer-events-none absolute inset-0 ${round}`}>
      <span
        className={`absolute -inset-1 ${round} opacity-75 ${still ? '' : 'animate-[spin_2.5s_linear_infinite]'}`}
        style={{ background: 'conic-gradient(#ef4444, #fbbf24, #ef4444, #f97316, #ef4444)', WebkitMask: 'radial-gradient(closest-side, transparent 78%, #000 92%)', mask: 'radial-gradient(closest-side, transparent 78%, #000 92%)' }}
      />
      {!still && <Sparks n={7} color="#ef4444" fast round={round} />}
    </span>
  );
}

/** A forged item's shine for its plus, and a legendary's fire on top. `rays`: light turning behind
    it (on a card's stage, from +13). */
export function PlusGlow({ item, round = 'rounded-lg', rays = false }: { item: Pick<Item, 'plus' | 'rarity'>; round?: string; rays?: boolean }) {
  const still = useReducedMotion(),
    band = bandOf(item.plus ?? 0),
    color = glowOf(item),
    b = BANDS[band],
    fire = item.rarity === 'legendary';
  if ((!band || !color) && !fire) return null;
  return (
    <>
      {band > 0 && color && (
        <span aria-hidden className={`pointer-events-none absolute inset-0 ${round}`}>
          {/* Slow light rays behind it from +13, wider at +15. */}
          {rays && b.rays && (
            <span
              className={`absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 ${band >= 5 ? 'opacity-60' : 'opacity-35'} ${still ? '' : 'animate-[spin_18s_linear_infinite]'}`}
              style={{ background: `repeating-conic-gradient(${color}66 0deg 10deg, transparent 10deg 30deg)`, maskImage: 'radial-gradient(circle, #000 20%, transparent 65%)', WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 65%)' }}
            />
          )}
          {/* The glow: soft from +4, brighter and breathing from +7. */}
          <span className={`absolute inset-0 ${round} ${band >= 2 && !still ? 'animate-pulse' : ''}`} style={{ boxShadow: `0 0 ${4 + band * 3}px ${band}px ${color}${band >= 2 ? 'aa' : '66'}, inset 0 0 ${4 + band * 2}px ${color}55` }} />
          {b.sparks && !still && <Sparks n={band >= 4 ? 7 : 4} color={color} fast={band >= 5} round={round} />}
        </span>
      )}
      {fire && <LegendFire round={round} />}
    </>
  );
}

'use client';

import { useState } from 'react';
import type { GameState } from '@/lib/game';
import { salvageValue } from '@/lib/fog-gear';
import { canUpgrade, embersOf, findItem, matsOf, REROLL_COST, reroll, rested, salvage, tryUpgrade, upgradeCost, upgradeMats, upgradeOdds, type Forged } from '@/lib/forge';
import { bandOf, boostAt, BONUSES, MAX_PLUS, nameOf, RARITY, safeFloor, type Item } from '@/game/dungeon/items';
import { BANDS, EMBERS, FORGE_RISK, MATS, SAFE_POINTS, type MatId } from '@/balance';
import { ItemTile } from './ItemCard';
import { Sprite } from './Sprite';
import { useModal } from './useModal';

type Update = (fn: (s: GameState) => GameState) => void;

/* Mira's forge for one item, on its own page over the Hero tab. One question at a time: what the
   next plus gives, what it costs, the one button. Reroll and melt wait under "More". */

/** What Mira says after a try. */
const SAID: Record<Forged, (plus: number) => string> = {
  held: (p) => (p >= 15 ? 'Ember-born. I have never made anything like it.' : `It held. +${p}!`),
  missed: () => "It didn't take this time. The item is as it was. Again?",
  slipped: (p) => `It slipped to +${p}. It won't go lower than its last safe mark.`,
};

export function ForgeSheet({ id, state, update, onClose }: { id: string; state: GameState; update: Update; onClose: () => void }) {
  const box = useModal<HTMLDivElement>(onClose);
  const [said, setSaid] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [sure, setSure] = useState(false);
  const item = findItem(state, id);
  if (!item) return null;

  const now = new Date(),
    embers = embersOf(state),
    have = matsOf(state),
    plus = item.plus ?? 0,
    next = plus + 1,
    top = plus >= MAX_PLUS,
    cost = upgradeCost(item),
    need = Object.entries(upgradeMats(item)) as [MatId, number][],
    odds = upgradeOdds(state, item, now),
    ok = canUpgrade(state, item),
    matsShort = need.some(([m, n]) => (have[m] ?? 0) < n),
    color = RARITY[item.rarity].color;

  // A try is seeded from the item, so working it out here gives the same result the save gets.
  const go = () => {
    const r = tryUpgrade(state, item.id, now);
    if (r.forged) setSaid(SAID[r.forged](findItem(r.state, item.id)?.plus ?? 0));
    update((s) => tryUpgrade(s, item.id, now).state);
  };
  const melt = () => {
    if (!sure) return setSure(true);
    update((s) => salvage(s, item.id));
    onClose();
  };

  const mira = said ?? (top ? 'As good as anything can be made.' : plus === 0 ? "Bring it here. Let's make it stronger." : `I can take it to +${next}.`);
  // What changes: each line now and after the next plus, only the ones that move.
  const lines = [...item.base, ...item.bonuses]
    .map((b) => ({ now: BONUSES[b.id].show(b.v * boostAt(plus)), next: BONUSES[b.id].show(b.v * boostAt(next)) }))
    .filter((l) => top || l.now !== l.next);

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label="Mira's forge" className="safe-top safe-bottom fixed inset-0 z-40 !mt-0 overflow-y-auto bg-ink-950 outline-none land-safe-x">
      <div className="mx-auto max-w-md px-4 pb-8 pt-3 land:max-w-3xl land:pb-4">
        <div className="mb-3 flex items-center justify-between land:mb-2">
          <h2 className="font-pixel text-xs text-gold-300">Mira&apos;s forge</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg bg-ink-800 p-2.5">
            <Sprite id="uiIcon" opts={{ name: 'close' }} size={14} label="" />
          </button>
        </div>

        <div className="space-y-3 land:grid land:grid-cols-2 land:gap-4 land:space-y-0">
          <div className="space-y-3">
            {/* Mira and what she says. */}
            <div className="flex items-end gap-2">
              <Sprite id="mira" size={56} label="Mira" />
              <p aria-live="polite" className="relative mb-3 flex-1 rounded-xl bg-[#f5ecd7] px-3 py-2 text-[13px] leading-snug text-[#3b2a1a]">
                {mira}
              </p>
            </div>

            {/* The item: its tile, its name, and the plus it goes to. */}
            <section className="flex items-center gap-4 rounded-2xl bg-ink-800 p-4 pixel-border">
              <ItemTile item={item} size={64} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color }}>
                  {nameOf({ ...item, plus: 0 })}
                </p>
                <p className="mt-1.5 flex items-center gap-2 font-pixel text-base">
                  <span className="text-slate-300">+{plus}</span>
                  {!top && (
                    <>
                      <span className="text-[10px] text-slate-500">▶</span>
                      <span className="text-gold-300">+{next}</span>
                    </>
                  )}
                </p>
                <Pips plus={plus} />
              </div>
            </section>

            {lines.length > 0 && (
              <ul className="space-y-1 rounded-2xl bg-ink-800 p-3 text-xs">
                {lines.map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">{l.now}</span>
                    {!top && <span className="font-semibold text-emerald-300">{l.next}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3">
            {!top && (
              <section className="rounded-2xl bg-ink-800 p-4">
                {/* The price: embers, and from +6 the co-op materials, each with what you have. */}
                <div className="flex flex-wrap gap-2">
                  <Cost icon={<Sprite id="uiIcon" opts={{ name: 'flame' }} size={14} label="" />} n={cost} have={embers} label="embers" />
                  {need.map(([m, n]) => (
                    <Cost key={m} icon={<span aria-hidden className="h-2.5 w-2.5 rotate-45 rounded-[1px]" style={{ background: MATS[m].color }} />} n={n} have={have[m] ?? 0} label={MATS[m].name} />
                  ))}
                </div>
                {matsShort && <p className="mt-2 text-[11px] leading-snug text-slate-400">Materials only drop when you play with friends, or a friend gives them.</p>}

                <button
                  onClick={go}
                  disabled={!ok}
                  className="mt-3 w-full rounded-xl bg-gold-400 py-3.5 font-pixel text-[11px] text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:bg-ink-700 disabled:text-slate-500 disabled:shadow-none"
                >
                  {embers < cost ? `${cost - embers} more embers` : `Forge +${next}`}
                </button>
                <p className="mt-2 text-center text-[11px] leading-snug text-slate-400">
                  {embers < cost
                    ? `A workout gives ${EMBERS.full} embers.`
                    : odds >= 1
                      ? 'It always holds.'
                      : `${Math.round(odds * 100)}% it holds. A miss ${plus > safeFloor(plus) ? `may drop it to +${plus - 1}` : 'keeps it as it is'}; it never breaks.`}
                </p>
                {odds < 1 && (
                  <p className={`mt-1 text-center text-[11px] ${rested(state, now) ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {rested(state, now) ? `+${Math.round(FORGE_RISK.rested * 100)}% for training lately` : `Train for +${Math.round(FORGE_RISK.rested * 100)}%`}
                  </p>
                )}
              </section>
            )}

            {/* The rest, folded: reroll a bonus, melt it down. */}
            <section className="rounded-2xl bg-ink-800">
              <button onClick={() => setMore(!more)} aria-expanded={more} className="flex w-full items-center justify-between px-4 py-3 text-xs text-slate-300">
                Reroll or melt down
                <span className={`text-[10px] text-slate-500 transition ${more ? 'rotate-90' : ''}`}>▶</span>
              </button>
              {more && (
                <div className="space-y-2 px-4 pb-4">
                  {item.bonuses.map((b, i) => (
                    <button key={i} onClick={() => update((s) => reroll(s, item.id, i))} disabled={embers < REROLL_COST} className="flex w-full items-center justify-between rounded-lg bg-ink-700 px-3 py-2.5 text-xs text-slate-200 disabled:opacity-40">
                      <span>Reroll {BONUSES[b.id].name.toLowerCase()}</span>
                      <span className="flex items-center gap-1 text-orange-300">
                        <Sprite id="uiIcon" opts={{ name: 'flame' }} size={12} label="" /> {REROLL_COST}
                      </span>
                    </button>
                  ))}
                  <button onClick={melt} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs ${sure ? 'bg-red-500 text-white' : 'bg-ink-900 text-slate-300 ring-1 ring-ink-700'}`}>
                    <span>{sure ? "Sure? It's gone for good" : 'Melt it down'}</span>
                    <span className="flex items-center gap-1">
                      + <Sprite id="uiIcon" opts={{ name: 'flame' }} size={12} label="" /> {salvageValue(item)}
                    </span>
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/** +1..+15 as pips: the safe marks taller (it never drops below one), each band in its own light. */
function Pips({ plus }: { plus: number }) {
  return (
    <div className="mt-2" aria-label={`+${plus} of +${MAX_PLUS}, ${BANDS[bandOf(plus)].name}. Safe at +${SAFE_POINTS.join(', +')}`}>
      <div className="flex items-end gap-0.5">
        {Array.from({ length: MAX_PLUS }, (_, i) => {
          const safe = (SAFE_POINTS as readonly number[]).includes(i + 1),
            lit = i < plus,
            b = BANDS[bandOf(i + 1)];
          return <span key={i} className={`flex-1 rounded-[1px] ${safe ? 'h-3' : 'h-1.5'} ${lit ? '' : 'bg-ink-700'}`} style={lit ? { background: b.glow && b.glow !== 'rarity' ? b.glow : '#fbbf24' } : undefined} />;
        })}
      </div>
      <p className="mt-1 text-[9px] text-slate-500">Tall marks are safe: it never drops below one.</p>
    </div>
  );
}

/** One thing the next plus costs, red when you have too little. */
function Cost({ icon, n, have, label }: { icon: React.ReactNode; n: number; have: number; label: string }) {
  const short = have < n;
  return (
    <span aria-label={`${n} ${label}, you have ${have}`} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${short ? 'bg-red-500/15 ring-1 ring-red-400/50' : 'bg-ink-900'}`}>
      {icon}
      <span className={`font-pixel text-[9px] ${short ? 'text-red-300' : 'text-slate-100'}`}>{n}</span>
      <span className="text-[10px] text-slate-500">/ {have}</span>
    </span>
  );
}

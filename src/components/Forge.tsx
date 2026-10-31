'use client';

import { useState } from 'react';
import type { GameState } from '@/lib/game';
import { canUpgrade, embersOf, findItem, matsOf, REROLL_COST, reroll, rested, tryUpgrade, upgradeCost, upgradeMats, upgradeOdds, type Forged } from '@/lib/forge';
import { bandOf, boostAt, BONUSES, MAX_PLUS, nameOf, RARITY, safeFloor } from '@/game/dungeon/items';
import { BANDS, EMBERS, FORGE_RISK, MAT_IDS, MATS, SAFE_POINTS, type MatId } from '@/balance';
import { PixelTabs } from './PixelTabs';
import { ItemTile } from './ItemCard';
import { Sprite } from './Sprite';
import { useModal } from './useModal';

type Update = (fn: (s: GameState) => GameState) => void;

/** Set once the forge's guide has been shown on this phone. */
const SEEN = 'forma-forge-guide-seen';

/* Mira's forge for one item, on its own page over the Hero tab. Two tabs, one job each:
   Upgrade (what the next plus gives, what it costs, the chance, one button) and Reroll (swap one
   bonus for a random other, showing what it was). Melting down lives on the item's card. */

type Mode = 'up' | 'reroll';
const MODES: { id: Mode; label: string }[] = [
  { id: 'up', label: 'Upgrade' },
  { id: 'reroll', label: 'Reroll' },
];

/** What Mira says on each tab, before anything happens. */
const MIRA: Record<Mode, (plus: number, next: number, top: boolean) => string> = {
  up: (plus, next, top) => (top ? 'As good as anything can be made.' : plus === 0 ? "Bring it here. Let's make it stronger." : `I can take it to +${next}.`),
  reroll: () => "Don't like a bonus? I can turn it into another one.",
};

const BIG = 'w-full rounded-xl bg-gold-400 py-3.5 font-pixel text-[11px] text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none disabled:bg-ink-700 disabled:text-slate-500 disabled:shadow-none';
/** The number in a bonus's line ("+12% damage" → "+12%"). */
const num = (line: string) => line.match(/[+-]?\d[\d.,]*%?/)?.[0] ?? line;
const ember = (size: number) => <Sprite id="uiIcon" opts={{ name: 'flame' }} size={size} label="" />;

/** What Mira says after a try. */
const SAID: Record<Forged, (plus: number) => string> = {
  held: (p) => (p >= 15 ? 'Ember-born. I have never made anything like it.' : `It held. +${p}!`),
  missed: () => "It didn't take this time. The item is as it was. Again?",
  slipped: (p) => `It slipped to +${p}. It won't go lower than its last safe mark.`,
};

export function ForgeSheet({ id, state, update, onClose }: { id: string; state: GameState; update: Update; onClose: () => void }) {
  const box = useModal<HTMLDivElement>(onClose);
  const [said, setSaid] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('up');
  // The last swap: which bonus, and what it was before.
  const [rolled, setRolled] = useState<{ i: number; was: string } | null>(null);
  // The first time the forge opens it starts on how it works; after that, a button away.
  const [help, setHelp] = useState(() => {
    try {
      if (localStorage.getItem(SEEN)) return false;
      localStorage.setItem(SEEN, '1');
      return true;
    } catch {
      return false;
    }
  });
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

  const pickMode = (m: Mode) => {
    setMode(m);
    setSaid(null);
    setRolled(null);
  };
  const rollOne = (i: number) => {
    const b = item.bonuses[i];
    setRolled({ i, was: BONUSES[b.id].show(b.v * boostAt(plus)).toLowerCase() });
    update((s) => reroll(s, item.id, i));
  };
  // What changes: each line now and after the next plus, only the ones that move.
  const lines = [...item.base, ...item.bonuses]
    .map((b) => ({ name: BONUSES[b.id].name, now: num(BONUSES[b.id].show(b.v * boostAt(plus))), next: num(BONUSES[b.id].show(b.v * boostAt(next))) }))
    .filter((l) => top || l.now !== l.next);

  return (
    <div ref={box} role="dialog" aria-modal="true" aria-label="Mira's forge" className="safe-top safe-bottom fixed inset-0 z-40 !mt-0 overflow-y-auto bg-ink-950 outline-none land-safe-x">
      <div className="mx-auto max-w-md px-4 pb-8 pt-3 land:max-w-3xl land:pb-4">
        <div className="mb-3 flex items-center justify-between land:mb-2">
          <h2 className="font-pixel text-xs text-gold-300">Mira&apos;s forge</h2>
          <div className="flex gap-2">
            <button onClick={() => setHelp(!help)} aria-pressed={help} className={`rounded-lg px-3 py-2 font-pixel text-[9px] ${help ? 'bg-gold-400 text-ink-950' : 'bg-ink-800 text-gold-300'}`}>
              {help ? 'Back' : 'How it works'}
            </button>
            <button onClick={onClose} aria-label="Close" className="rounded-lg bg-ink-800 p-2.5">
              <Sprite id="uiIcon" opts={{ name: 'close' }} size={14} label="" />
            </button>
          </div>
        </div>

        {help ? (
          <HowItWorks onDone={() => setHelp(false)} />
        ) : (
        <>
        {/* What you have to spend here, always in sight: embers and the four co-op materials. */}
        <div className="mb-3 flex flex-wrap gap-1.5" aria-label="What you have">
          <Have icon={ember(14)} n={embers} label="embers" tone="text-orange-300" />
          {MAT_IDS.map((m) => (
            <Have key={m} icon={<span aria-hidden className="h-2.5 w-2.5 rotate-45 rounded-[1px]" style={{ background: MATS[m].color }} />} n={have[m] ?? 0} label={MATS[m].name} tone="text-slate-100" />
          ))}
        </div>

        <div className="space-y-3 land:grid land:grid-cols-2 land:gap-4 land:space-y-0">
          <div className="space-y-3">
            {/* Mira and what she says. */}
            <div className="flex items-end gap-2">
              <Sprite id="mira" size={56} label="Mira" />
              <p aria-live="polite" className="relative mb-3 flex-1 rounded-xl bg-[#f5ecd7] px-3 py-2.5 text-sm leading-snug text-[#3b2a1a]">
                {said ?? MIRA[mode](plus, next, top)}
              </p>
            </div>

            {/* The item: its tile, its name, and its plus (and the next one, upgrading). */}
            <section className="flex items-center gap-4 rounded-2xl bg-ink-800 p-4 pixel-border">
              <ItemTile item={item} size={64} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold" style={{ color }}>
                  {nameOf({ ...item, plus: 0 })}
                </p>
                <p className="mt-2 flex items-center gap-2 font-pixel text-lg">
                  <span className="text-slate-300">+{plus}</span>
                  {mode === 'up' && !top && (
                    <>
                      <span className="text-[10px] text-slate-500">▶</span>
                      <span className="text-gold-300">+{next}</span>
                    </>
                  )}
                </p>
                <Pips plus={plus} />
              </div>
            </section>

            {/* What to do with it: two tabs, one job each. */}
            <PixelTabs label="What to do" tabs={MODES} value={mode} onChange={pickMode} />
          </div>

          <div role="tabpanel" className="space-y-3">
            {mode === 'up' && (
              <>
                {lines.length > 0 && (
                  <ul className="space-y-1.5 rounded-2xl bg-ink-800 p-4 text-sm">
                    {lines.map((l, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-slate-300">{l.name}</span>
                        <span className="font-pixel text-[10px] text-slate-400">{l.now}</span>
                        {!top && (
                          <>
                            <span className="text-[9px] text-slate-500">▶</span>
                            <span className="font-pixel text-[10px] text-emerald-300">{l.next}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {!top && (
                  <section className="rounded-2xl bg-ink-800 p-4">
                    {/* The price: embers, and from +6 the co-op materials, each with what you have. */}
                    <div className="flex flex-wrap gap-2">
                      <Cost icon={ember(14)} n={cost} have={embers} label="embers" />
                      {need.map(([m, n]) => (
                        <Cost key={m} icon={<span aria-hidden className="h-2.5 w-2.5 rotate-45 rounded-[1px]" style={{ background: MATS[m].color }} />} n={n} have={have[m] ?? 0} label={MATS[m].name} />
                      ))}
                    </div>
                    {matsShort && <p className="mt-2 text-[13px] leading-snug text-slate-400">Materials only drop when you play with friends, or a friend gives them.</p>}
                    {embers < cost ? (
                      <p className="mt-2 text-center text-[13px] text-slate-400">A workout gives {EMBERS.full} embers.</p>
                    ) : odds >= 1 ? (
                      <p className="mt-2 text-center text-[13px] text-emerald-300">This step always works.</p>
                    ) : (
                      <Chance odds={odds} plus={plus} next={next} warm={rested(state, now)} />
                    )}
                    <button onClick={go} disabled={!ok} className={`mt-4 ${BIG}`}>
                      {embers < cost ? `${cost - embers} more embers` : `Forge +${next}`}
                    </button>
                  </section>
                )}
              </>
            )}

            {mode === 'reroll' && (
              <section className="rounded-2xl bg-ink-800 p-4">
                <p className="text-sm leading-snug text-slate-300">
                  Pick one bonus to swap for a different, random one. The rest of the item and its plus stay the same.
                </p>
                {item.bonuses.length ? (
                  <ul className="mt-3 space-y-2">
                    {item.bonuses.map((b, i) => {
                      const fresh = rolled?.i === i;
                      return (
                        <li key={i} className={`flex items-center gap-3 rounded-xl p-3 ${fresh ? 'bg-emerald-500/10 ring-1 ring-emerald-400/40' : 'bg-ink-900'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-slate-100">{BONUSES[b.id].show(b.v * boostAt(plus))}</p>
                            {fresh && <p className="mt-0.5 text-xs text-emerald-300">New! It was {rolled.was}.</p>}
                          </div>
                          <button
                            onClick={() => rollOne(i)}
                            disabled={embers < REROLL_COST}
                            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gold-400 px-3 py-2 font-pixel text-[9px] text-ink-950 shadow-[0_3px_0_#b45309] active:translate-y-0.5 active:shadow-none disabled:bg-ink-700 disabled:text-slate-500 disabled:shadow-none"
                          >
                            Swap {ember(12)} {REROLL_COST}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 rounded-xl bg-ink-900 p-3 text-sm text-slate-400">This item has no bonus to swap. Magic, rare and legendary items have them.</p>
                )}
                {item.base.length > 0 && (
                  <p className="mt-3 text-xs leading-snug text-slate-500">
                    The item&apos;s base stays: {item.base.map((b) => BONUSES[b.id].show(b.v * boostAt(plus))).join(', ')}.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
        </>
        )}
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
      <p className="mt-1.5 text-[11px] text-slate-500">Tall marks are safe spots.</p>
    </div>
  );
}

/** One thing the next plus costs, red when you have too little. */
function Cost({ icon, n, have, label }: { icon: React.ReactNode; n: number; have: number; label: string }) {
  const short = have < n;
  return (
    <span aria-label={`You have ${have} ${label}, it needs ${n}`} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${short ? 'bg-red-500/15 ring-1 ring-red-400/50' : 'bg-ink-900'}`}>
      {icon}
      <span className={`font-pixel text-[9px] ${short ? 'text-red-300' : 'text-slate-100'}`}>{have}</span>
      <span className="text-xs text-slate-500">/ {n}</span>
    </span>
  );
}

/** The chance a try works, as a bar, and what each way ends in. */
function Chance({ odds, plus, next, warm }: { odds: number; plus: number; next: number; warm: boolean }) {
  const pct = Math.round(odds * 100),
    slips = plus > safeFloor(plus);
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <span className="font-pixel text-[9px] text-slate-400">Chance</span>
        <span className="font-pixel text-sm text-gold-300">{pct}%</span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-[2px] bg-red-500/30">
        <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-emerald-500/10 px-2 py-2 ring-1 ring-emerald-400/30">
          <p className="font-pixel text-[8px] text-emerald-300">Works</p>
          <p className="mt-1 text-[13px] text-slate-200">Goes to +{next}</p>
        </div>
        <div className="rounded-lg bg-red-500/10 px-2 py-2 ring-1 ring-red-400/30">
          <p className="font-pixel text-[8px] text-red-300">Fails</p>
          <p className="mt-1 text-[13px] text-slate-200">{slips ? `May drop to +${plus - 1}` : `Stays +${plus}`}</p>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        A fail uses up the price. It never breaks.{' '}
        <span className={warm ? 'text-emerald-300' : ''}>{warm ? `+${Math.round(FORGE_RISK.rested * 100)}% for training lately.` : `Train for +${Math.round(FORGE_RISK.rested * 100)}%.`}</span>
      </p>
    </div>
  );
}

/** A small +1..+15 strip for the guide: `from`..`to` lit in `color`, the safe marks taller. */
function Strip({ from, to, color, safe = false }: { from: number; to: number; color: string; safe?: boolean }) {
  return (
    <div className="flex items-end gap-[2px]" aria-hidden>
      {Array.from({ length: MAX_PLUS }, (_, i) => {
        const p = i + 1,
          mark = (SAFE_POINTS as readonly number[]).includes(p),
          on = safe ? mark : p >= from && p <= to;
        return <span key={i} className={`flex-1 rounded-[1px] ${mark ? 'h-3' : 'h-1.5'}`} style={{ background: on ? color : '#1e2433' }} />;
      })}
    </div>
  );
}

/** How the forge works, in five short steps, each with its part of the +1..+15 strip lit. */
function HowItWorks({ onDone }: { onDone: () => void }) {
  const pity = Math.round(FORGE_RISK.pity * 100),
    warm = Math.round(FORGE_RISK.rested * 100);
  const STEPS: { title: string; text: string; strip: React.ReactNode; tone: string }[] = [
    { title: 'Up to +6', text: 'Always works. It costs embers, and every workout gives you some.', strip: <Strip from={1} to={6} color="#34d399" />, tone: 'text-emerald-300' },
    { title: 'From +6', text: 'Also asks for materials. They only drop when you play with friends, or a friend gives them.', strip: <Strip from={6} to={15} color="#a78bfa" />, tone: 'text-purple-300' },
    { title: 'From +7 it can fail', text: 'A fail uses up what you paid, and the item may drop one plus.', strip: <Strip from={7} to={15} color="#f87171" />, tone: 'text-red-300' },
    { title: `Safe at +${SAFE_POINTS.join(', +')}`, text: 'Once an item reaches a safe spot, it never drops below it. Nothing ever breaks.', strip: <Strip from={0} to={0} color="#fbbf24" safe />, tone: 'text-gold-300' },
    { title: 'Better odds', text: `Each fail adds +${pity}% to the next try. Training in the last ${FORGE_RISK.restedDays} days adds +${warm}%.`, strip: null, tone: 'text-sky-300' },
  ];
  return (
    <div className="space-y-3 land:grid land:grid-cols-2 land:gap-3 land:space-y-0">
      <div className="flex items-end gap-2 land:col-span-2">
        <Sprite id="mira" size={56} label="Mira" />
        <p className="mb-3 flex-1 rounded-xl bg-[#f5ecd7] px-3 py-2.5 text-sm leading-snug text-[#3b2a1a]">Each plus makes an item stronger and shine brighter. Here is how it goes.</p>
      </div>
      {STEPS.map((st, i) => (
        <section key={i} className="rounded-2xl bg-ink-800 p-4">
          <p className={`font-pixel text-[10px] ${st.tone}`}>{st.title}</p>
          <p className="mt-1.5 text-sm leading-snug text-slate-300">{st.text}</p>
          {st.strip && <div className="mt-2.5">{st.strip}</div>}
        </section>
      ))}
      <button onClick={onDone} className="w-full rounded-xl bg-gold-400 py-3.5 font-pixel text-[11px] text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none land:col-span-2">
        Got it
      </button>
    </div>
  );
}

/** One thing you have, as a chip: its icon and how many (faded at none). */
function Have({ icon, n, label, tone }: { icon: React.ReactNode; n: number; label: string; tone: string }) {
  return (
    <span aria-label={`${n} ${label}`} title={label} className={`flex items-center gap-1.5 rounded-lg bg-ink-800 px-2.5 py-1.5 ${n ? '' : 'opacity-40'}`}>
      {icon}
      <span className={`font-pixel text-[9px] ${tone}`}>{n}</span>
    </span>
  );
}

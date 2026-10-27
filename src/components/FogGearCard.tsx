'use client';

import { useState, type ReactNode } from 'react';
import { Flame } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { buildOf } from '@/lib/stats';
import { flameGuards, NO_GEAR, type FogGear, salvageValue, setGuard, takeOffToVault, vaultSize, wearFromVault } from '@/lib/fog-gear';
import { canUpgrade, embersOf, findItem, matsOf, matsShort, REROLL_COST, reroll, rested, salvage, tryUpgrade, upgradeCost, upgradeMats, upgradeOdds, type Forged } from '@/lib/forge';
import { bandOf, boostAt, BONUSES, ITEM_SLOTS, MAX_PLUS, nameOf, safeFloor, SLOT_NAME, shortOf, starterKit, type Item } from '@/game/dungeon/items';
import { BANDS, FORGE_RISK, MAT_IDS, MATS, SAFE_POINTS, type MatId } from '@/balance';
import { ItemCard, ItemTile } from './ItemCard';
import { Sprite } from './Sprite';

type Update = (fn: (s: GameState) => GameState) => void;

/** Your gear for the Fog, on one card: the three slots you wear (the flame's mark on the one it
    keeps if you fall), the vault at home, and Mira's forge for the item you tap. `land`: the Play tab
    held sideways, where the card fills the height it is given, what you have on the left and the
    tapped item with the forge on the right. */
export function FogGearCard({ state, update, land = false }: { state: GameState; update: Update; land?: boolean }) {
  const gear = state.fogGear ?? NO_GEAR,
    build = buildOf(state),
    size = vaultSize(state.sessions.length),
    kit = starterKit(state.profile.classId),
    flame = state.profile.flame || 'Your flame',
    fresh = flameGuards(state, new Date()),
    embers = embersOf(state);
  const [pick, setPick] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const all = [...Object.values(gear.worn), ...gear.vault].filter((x): x is Item => !!x),
    item = all.find((x) => x.id === pick) ?? null,
    worn = !!item && gear.worn[item.slot]?.id === item.id,
    guarded = gear.guard ? gear.worn[gear.guard] : undefined;
  const choose = (id: string | null) => {
    setPick(id === pick ? null : id);
    setSure(false);
  };
  const hint = <p className={`text-[11px] text-slate-500 ${land ? 'text-center' : 'mt-3'}`}>Tap an item to wear it, give it to {flame === 'Your flame' ? 'your flame' : flame}, or take it to Mira&apos;s forge.</p>;
  return (
    <section className={`rounded-2xl bg-ink-800 ${land ? 'flex h-full flex-col p-3' : 'p-4'}`}>
      <div className="flex items-baseline justify-between">
        <p className="font-pixel text-[10px] text-slate-400">Your gear for the Fog</p>
        <p className="flex items-center gap-1 font-mono text-[11px] text-orange-300">
          <Flame size={11} aria-hidden /> {embers} embers
        </p>
      </div>

      {/* Sideways: three columns as tall as the card, what you wear, the vault, and the tapped item. */}
      <Side on={land} className="mt-2.5 flex min-h-0 flex-1 gap-3">
      <Side on={land} className="w-[10.75rem] shrink-0 overflow-y-auto">
      <div className={land ? 'flex justify-between' : 'mt-3 flex gap-3'}>
        {ITEM_SLOTS.map((slot) => {
          const it = gear.worn[slot],
            short = it ? shortOf(it, build) : 0,
            kept = !!it && gear.guard === slot;
          return (
            <button key={slot} onClick={() => it && choose(it.id)} className={`relative flex flex-col items-center gap-1 rounded-lg p-1 ${it && it.id === pick ? 'bg-ink-900' : ''}`} aria-label={it ? `${nameOf(it)}${kept ? `, kept by ${flame}` : ''}` : `${SLOT_NAME[slot]}: ${slot === 'charm' ? 'none' : kit[slot].name}`}>
              {it ? <ItemTile item={it} size={48} dim={short > 0} /> : <span className="grid h-12 w-12 place-items-center rounded-lg border border-dashed border-ink-700 px-1 text-center text-[8px] leading-tight text-slate-500">{slot === 'charm' ? 'none' : kit[slot].name}</span>}
              {kept && (
                <span className={`absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full ring-2 ring-ink-800 ${fresh ? 'bg-orange-500 text-ink-950' : 'bg-ink-700 text-slate-400'}`} aria-hidden>
                  <Flame size={11} />
                </span>
              )}
              <span className="text-[9px] text-slate-500">{SLOT_NAME[slot]}</span>
            </button>
          );
        })}
      </div>
      <FallLine gear={gear} flame={flame} fresh={fresh} guarded={guarded} />
      </Side>

      <Side on={land} className="w-[9.5rem] shrink-0 overflow-y-auto rounded-xl bg-ink-900/60 p-2.5 min-[800px]:w-[11.5rem]">
      <p className={`flex items-baseline justify-between font-pixel text-[9px] text-gold-300 ${land ? '' : 'mt-4'}`}>
        <span>Vault</span>
        <span className="font-mono text-[10px] text-slate-400">
          {gear.vault.length}/{size}
        </span>
      </p>
      {gear.vault.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {gear.vault.map((it) => (
            <button key={it.id} onClick={() => choose(it.id)} className={`rounded-lg p-1 ${it.id === pick ? 'bg-ink-900' : ''}`} aria-label={nameOf(it)}>
              <ItemTile item={it} size={40} dim={shortOf(it, build) > 0} than={gear.worn[it.slot] ?? 'none'} />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-500">Empty. Items you bring home land here, safe from the Fog. One more slot every 5 workouts.</p>
      )}
      </Side>

      <Side on={land} className={`flex min-w-0 flex-1 flex-col overflow-y-auto rounded-xl ${item ? '' : 'items-center justify-center gap-2 bg-ink-900/60 p-4'}`}>
      {item ? (
        <div className={land ? 'space-y-2' : 'mt-3 space-y-2'}>
          <ItemCard item={item} build={build} than={gear.worn[item.slot] ?? 'none'}>
            {worn ? (
              <>
                <button onClick={() => update((s) => setGuard(s, gear.guard === item.slot ? null : item.slot))} className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-xs ${gear.guard === item.slot ? 'bg-orange-500 font-semibold text-ink-950' : 'bg-ink-700 text-orange-200'}`}>
                  <Flame size={12} aria-hidden /> {gear.guard === item.slot ? `${flame} keeps it` : `${flame}, keep this`}
                </button>
                <button onClick={() => update((s) => takeOffToVault(s, item.slot))} disabled={gear.vault.length >= size} className="flex-1 rounded-lg bg-ink-700 py-2 text-xs text-slate-200 disabled:opacity-40">
                  Into the vault
                </button>
              </>
            ) : (
              <button onClick={() => update((s) => wearFromVault(s, item.id))} disabled={shortOf(item, build) > 0} className="flex-1 rounded-lg bg-gold-400 py-2 text-xs font-semibold text-ink-950 disabled:bg-ink-700 disabled:text-slate-500">
                Wear
              </button>
            )}
          </ItemCard>
          <Forge
            item={item}
            state={state}
            embers={embers}
            update={update}
            sure={sure}
            onMelt={() => {
              if (!sure) return setSure(true);
              update((s) => salvage(s, item.id));
              setPick(null);
              setSure(false);
            }}
          />
        </div>
      ) : land ? (
        // Nothing tapped yet: Mira waits at her forge.
        <>
          <Sprite id="mira" size={56} label="Mira" />
          <p className="font-pixel text-[9px] text-gold-300">Mira&apos;s forge</p>
          {all.length > 0 && hint}
        </>
      ) : (
        all.length > 0 && hint
      )}
      </Side>
      </Side>
    </section>
  );
}

/** A column of the card held sideways; upright it adds nothing, so the card stays as it was. */
function Side({ on, className, children }: { on: boolean; className: string; children: ReactNode }) {
  return on ? <div className={className}>{children}</div> : <>{children}</>;
}

/** What a fall would cost, in one line: what you'd lose and what the flame keeps. */
function FallLine({ gear, flame, fresh, guarded }: { gear: FogGear; flame: string; fresh: boolean; guarded: Item | undefined }) {
  const worn = ITEM_SLOTS.map((s) => gear.worn[s]).filter((x): x is Item => !!x);
  if (!worn.length) return <p className="mt-2 text-[11px] leading-snug text-slate-500">Die in a run and the Fog takes what you wore and carried; the stairs or a win bring it all home.</p>;
  const lost = worn.filter((x) => !(fresh && x === guarded)).length;
  return (
    <p className={`mt-2 rounded-lg px-3 py-2 text-[11px] leading-snug ${guarded && fresh ? 'bg-orange-950/50 text-orange-200' : 'bg-ink-900 text-slate-400'}`}>
      {guarded
        ? fresh
          ? `If you fall, ${flame} keeps your ${nameOf(guarded)}. ${lost ? `The Fog takes the other ${lost === 1 ? 'one' : lost} and what you carry.` : 'The Fog takes what you carry.'}`
          : `${flame} would keep your ${nameOf(guarded)} if you fall, but only for 2 days after a workout. Train to light it.`
        : `If you fall, the Fog takes all ${worn.length === 1 ? 'of it' : worn.length} and what you carry. Tap one and give it to ${flame === 'Your flame' ? 'your flame' : flame} to keep.`}
    </p>
  );
}

/** The co-op materials you have, in a row (only once you have any). */
function Mats({ have }: { have: Partial<Record<MatId, number>> }) {
  if (!MAT_IDS.some((id) => have[id])) return null;
  return (
    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
      {MAT_IDS.map((id) => (
        <span key={id} className="flex items-center gap-1" style={{ color: MATS[id].color }}>
          <span className="h-2 w-2 rotate-45 rounded-[1px]" style={{ background: MATS[id].color }} aria-hidden />
          {MATS[id].name} {have[id] ?? 0}
        </span>
      ))}
    </p>
  );
}

/** What Mira says after a try. */
const SAID: Record<Forged, (plus: number) => string> = {
  held: (p) => (p >= 15 ? 'Ember-born. I have never made anything like it.' : `It held. +${p}.`),
  missed: () => 'It didn\'t take this time. The item is as it was. Again?',
  slipped: (p) => `It slipped to +${p}. It won't go lower than its last safe mark.`,
};

/** Mira's forge for one item: the next upgrade with what it asks and what it changes, the chance it
    holds from +7, a reroll per bonus, melting down. */
function Forge({ item, state, embers, update, sure, onMelt }: { item: Item; state: GameState; embers: number; update: Update; sure: boolean; onMelt: () => void }) {
  const [said, setSaid] = useState<{ id: string; text: string } | null>(null);
  if (item.starter) return null;
  const now = new Date(),
    plus = item.plus ?? 0,
    top = plus >= MAX_PLUS,
    cost = upgradeCost(item),
    need = upgradeMats(item),
    short = matsShort(state, item),
    odds = upgradeOdds(state, item, now),
    ok = canUpgrade(state, item),
    warm = rested(state, now),
    band = bandOf(plus);
  const go = () =>
    update((s) => {
      const r = tryUpgrade(s, item.id, now);
      if (r.forged) setSaid({ id: item.id, text: SAID[r.forged](findItem(r.state, item.id)?.plus ?? 0) });
      return r.state;
    });
  const needs = (Object.entries(need) as [MatId, number][]).map(([id, n]) => `${n} ${MATS[id].name.toLowerCase()}`);
  return (
    <div className="rounded-xl bg-ink-900 p-3 ring-1 ring-gold-400/30">
      <div className="flex items-center gap-2">
        <Sprite id="mira" size={40} label="Mira" />
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[9px] text-gold-300">Mira&apos;s forge</p>
          <p className="text-[11px] text-slate-400">
            {said?.id === item.id
              ? `"${said.text}"`
              : top
                ? 'As good as anything can be made.'
                : `"Give me ${cost} embers${needs.length ? ` and ${needs.join(', ')}` : ''}, and I'll try for +${plus + 1}."`}
          </p>
        </div>
      </div>
      {/* +1..+15 as pips: the safe marks a little taller, each band in its own light. */}
      <div className="mt-2 flex items-end gap-0.5" aria-label={`+${plus} of +${MAX_PLUS}, ${BANDS[band].name}`}>
        {Array.from({ length: MAX_PLUS }, (_, i) => {
          const safe = (SAFE_POINTS as readonly number[]).includes(i + 1),
            lit = i < plus,
            b = BANDS[bandOf(i + 1)];
          return <span key={i} className={`flex-1 rounded-full ${safe ? 'h-2.5' : 'h-1.5'} ${lit ? '' : 'bg-ink-700'}`} style={lit ? { background: b.glow && b.glow !== 'rarity' ? b.glow : '#fbbf24' } : undefined} />;
        })}
      </div>
      <p className="mt-1 flex justify-between text-[9px] text-slate-500">
        <span>{BANDS[band].name}</span>
        <span>Safe marks: +{SAFE_POINTS.join(', +')}</span>
      </p>
      <Mats have={matsOf(state)} />
      {!top && (
        <ul className="mt-2 space-y-0.5 text-xs">
          {[...item.base, ...item.bonuses].map((b, i) => {
            const show = BONUSES[b.id].show;
            return (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="text-slate-400">{show(b.v * boostAt(plus))}</span>
                <span className="text-emerald-300">→ {show(b.v * boostAt(plus + 1))}</span>
              </li>
            );
          })}
        </ul>
      )}
      {!top && odds < 1 && (
        <p className="mt-2 text-[11px] leading-snug text-slate-400">
          <span className="font-semibold text-gold-300">{Math.round(odds * 100)}% it holds.</span>{' '}
          {item.misses ? `+${Math.round(item.misses * FORGE_RISK.pity * 100)}% from ${item.misses === 1 ? 'the last miss' : `${item.misses} misses`}. ` : ''}
          {warm ? `+${Math.round(FORGE_RISK.rested * 100)}% for training lately. ` : `Train and it's +${Math.round(FORGE_RISK.rested * 100)}% for ${FORGE_RISK.restedDays} days. `}
          A miss spends what went in{plus > safeFloor(plus) ? ` and may slip it to +${plus - 1}` : ''}; it never breaks.
        </p>
      )}
      {!top && Object.keys(short).length > 0 && (
        <p className="mt-2 rounded-lg bg-ink-800 px-2 py-1.5 text-[11px] leading-snug text-slate-400">
          Still needs {(Object.entries(short) as [MatId, number][]).map(([id, n]) => `${n} ${MATS[id].name.toLowerCase()}`).join(', ')}. These only drop when you play with friends ({(Object.keys(short) as MatId[]).map((id) => MATS[id].from).join('; ')}).
        </p>
      )}
      <div className="mt-3 space-y-2">
        {!top && (
          <button onClick={go} disabled={!ok} className="w-full rounded-lg bg-gold-400 py-2 text-xs font-semibold text-ink-950 disabled:bg-ink-700 disabled:text-slate-500">
            {embers < cost ? `+${plus + 1} · ${cost - embers} more embers (a workout is 10)` : odds < 1 ? `Try for +${plus + 1} · ${Math.round(odds * 100)}% · ${cost} embers` : `Upgrade to +${plus + 1} · ${cost} embers`}
          </button>
        )}
        {item.bonuses.map((b, i) => (
          <button key={i} onClick={() => update((s) => reroll(s, item.id, i))} disabled={embers < REROLL_COST} className="w-full rounded-lg bg-ink-700 py-2 text-xs text-slate-200 disabled:opacity-40">
            Reroll {BONUSES[b.id].name.toLowerCase()} into something else · {REROLL_COST} embers
          </button>
        ))}
        <button onClick={onMelt} className={`w-full rounded-lg py-2 text-xs ${sure ? 'bg-red-500 text-white' : 'bg-ink-800 text-slate-300 ring-1 ring-ink-700'}`}>
          {sure ? `Sure? It's gone for good · +${salvageValue(item)} embers` : `Melt it down · +${salvageValue(item)} embers`}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Flame } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { buildOf } from '@/lib/stats';
import { flameGuards, NO_GEAR, type FogGear, salvageValue, setGuard, takeOffToVault, vaultSize, wearFromVault } from '@/lib/fog-gear';
import { embersOf, REROLL_COST, reroll, salvage, upgrade, upgradeCost } from '@/lib/forge';
import { BONUSES, ITEM_SLOTS, MAX_PLUS, nameOf, PLUS_STEP, SLOT_NAME, shortOf, starterKit, type Item } from '@/game/dungeon/items';
import { ItemCard, ItemTile } from './ItemCard';
import { Sprite } from './Sprite';

type Update = (fn: (s: GameState) => GameState) => void;

/** Your gear for the Fog, on one card: the three slots you wear (the flame's mark on the one it
    keeps if you fall), the vault at home, and Mira's forge for the item you tap. */
export function FogGearCard({ state, update }: { state: GameState; update: Update }) {
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
  return (
    <section className="rounded-2xl bg-ink-800 p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-pixel text-[10px] text-slate-400">Your gear for the Fog</p>
        <p className="flex items-center gap-1 font-mono text-[11px] text-orange-300">
          <Flame size={11} aria-hidden /> {embers} embers
        </p>
      </div>

      <div className="mt-3 flex gap-3">
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

      <p className="mt-4 flex items-baseline justify-between font-pixel text-[9px] text-gold-300">
        <span>Vault</span>
        <span className="font-mono text-[10px] text-slate-400">
          {gear.vault.length}/{size}
        </span>
      </p>
      {gear.vault.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {gear.vault.map((it) => (
            <button key={it.id} onClick={() => choose(it.id)} className={`rounded-lg p-1 ${it.id === pick ? 'bg-ink-900' : ''}`} aria-label={nameOf(it)}>
              <ItemTile item={it} size={40} dim={shortOf(it, build) > 0} />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-500">Empty. Items you bring home land here, safe from the Fog. One more slot every 5 workouts.</p>
      )}

      {item ? (
        <div className="mt-3 space-y-2">
          <ItemCard item={item} build={build}>
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
      ) : (
        all.length > 0 && <p className="mt-3 text-[11px] text-slate-500">Tap an item to wear it, give it to {flame === 'Your flame' ? 'your flame' : flame}, or take it to Mira&apos;s forge.</p>
      )}
    </section>
  );
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

/** Mira's forge for one item: the next upgrade with what it changes, a reroll per bonus, melting down. */
function Forge({ item, embers, update, sure, onMelt }: { item: Item; embers: number; update: Update; sure: boolean; onMelt: () => void }) {
  if (item.starter) return null;
  const plus = item.plus ?? 0,
    top = plus >= MAX_PLUS,
    cost = upgradeCost(item);
  return (
    <div className="rounded-xl bg-ink-900 p-3 ring-1 ring-gold-400/30">
      <div className="flex items-center gap-2">
        <Sprite id="mira" size={40} label="Mira" />
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[9px] text-gold-300">Mira&apos;s forge</p>
          <p className="text-[11px] text-slate-400">{top ? 'As good as I can make it.' : `"Give me ${cost} embers and I'll make it +${plus + 1}."`}</p>
        </div>
      </div>
      {/* +1..+5 as pips, so you see how far it can go. */}
      <div className="mt-2 flex gap-1" aria-label={`+${plus} of +${MAX_PLUS}`}>
        {Array.from({ length: MAX_PLUS }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < plus ? 'bg-gold-400' : 'bg-ink-700'}`} />
        ))}
      </div>
      {!top && (
        <ul className="mt-2 space-y-0.5 text-xs">
          {[...item.base, ...item.bonuses].map((b, i) => {
            const show = BONUSES[b.id].show;
            return (
              <li key={i} className="flex items-center justify-between gap-2">
                <span className="text-slate-400">{show(b.v * (1 + PLUS_STEP * plus))}</span>
                <span className="text-emerald-300">→ {show(b.v * (1 + PLUS_STEP * (plus + 1)))}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-3 space-y-2">
        {!top && (
          <button onClick={() => update((s) => upgrade(s, item.id))} disabled={embers < cost} className="w-full rounded-lg bg-gold-400 py-2 text-xs font-semibold text-ink-950 disabled:bg-ink-700 disabled:text-slate-500">
            {embers < cost ? `Upgrade to +${plus + 1} · ${cost - embers} more embers (a workout is 10)` : `Upgrade to +${plus + 1} · ${cost} embers`}
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

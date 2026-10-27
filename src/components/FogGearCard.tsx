'use client';

import { useState } from 'react';
import type { GameState } from '@/lib/game';
import { buildOf } from '@/lib/stats';
import { NO_GEAR, salvageValue, takeOffToVault, vaultSize, wearFromVault } from '@/lib/fog-gear';
import { salvage } from '@/lib/forge';
import { ITEM_SLOTS, nameOf, SLOT_NAME, shortOf, starterKit, type Item } from '@/game/dungeon/items';
import { ItemCard, ItemTile } from './ItemCard';

/** What you take into the Fog: the three slots you wear, and the vault at home, which keeps items
    safe from the Fog and grows with your workouts. Tap an item to wear it, take it off or throw it away. */
export function FogGearCard({ state, update }: { state: GameState; update: (fn: (s: GameState) => GameState) => void }) {
  const gear = state.fogGear ?? NO_GEAR,
    build = buildOf(state),
    size = vaultSize(state.sessions.length),
    kit = starterKit(state.profile.classId);
  const [pick, setPick] = useState<string | null>(null);
  const [sure, setSure] = useState(false);
  const all = [...Object.values(gear.worn), ...gear.vault].filter((x): x is Item => !!x),
    item = all.find((x) => x.id === pick) ?? null,
    worn = !!item && gear.worn[item.slot]?.id === item.id;
  const choose = (id: string | null) => {
    setPick(id === pick ? null : id);
    setSure(false);
  };
  return (
    <section className="rounded-2xl bg-ink-800 p-4">
      <p className="font-pixel text-[10px] text-slate-400">What you take into the Fog</p>
      <div className="mt-3 flex gap-3">
        {ITEM_SLOTS.map((slot) => {
          const it = gear.worn[slot],
            short = it ? shortOf(it, build) : 0;
          return (
            <button key={slot} onClick={() => it && choose(it.id)} className={`flex flex-col items-center gap-1 rounded-lg p-1 ${it && it.id === pick ? 'bg-ink-900' : ''}`} aria-label={it ? nameOf(it) : `${SLOT_NAME[slot]}: ${slot === 'charm' ? 'none' : kit[slot].name}`}>
              {it ? <ItemTile item={it} size={44} dim={short > 0} /> : <span className="grid h-11 w-11 place-items-center rounded-lg border border-dashed border-ink-700 px-1 text-center text-[8px] leading-tight text-slate-500">{slot === 'charm' ? 'none' : kit[slot].name}</span>}
              <span className="text-[9px] text-slate-500">{SLOT_NAME[slot]}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 flex items-baseline justify-between font-pixel text-[9px] text-gold-300">
        <span>Vault</span>
        <span className="font-mono text-[10px] text-slate-400">
          {gear.vault.length}/{size}
        </span>
      </p>
      {gear.vault.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {gear.vault.map((it) => (
            <button key={it.id} onClick={() => choose(it.id)} className={`rounded-lg p-1 ${it.id === pick ? 'bg-ink-900' : ''}`} aria-label={nameOf(it)}>
              <ItemTile item={it} size={38} dim={shortOf(it, build) > 0} />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-500">Empty. Items you bring home land here.</p>
      )}
      {item && (
        <div className="mt-3">
          <ItemCard item={item} build={build}>
            {worn ? (
              <button onClick={() => update((s) => takeOffToVault(s, item.slot))} disabled={gear.vault.length >= size} className="flex-1 rounded-lg bg-ink-700 py-2 text-xs text-slate-200 disabled:opacity-40">
                Into the vault
              </button>
            ) : (
              <button onClick={() => update((s) => wearFromVault(s, item.id))} disabled={shortOf(item, build) > 0} className="flex-1 rounded-lg bg-gold-400 py-2 text-xs font-semibold text-ink-950 disabled:bg-ink-700 disabled:text-slate-500">
                Wear
              </button>
            )}
            <button
              onClick={() => {
                if (!sure) return setSure(true);
                update((s) => salvage(s, item.id));
                setPick(null);
                setSure(false);
              }}
              className={`flex-1 rounded-lg py-2 text-xs ${sure ? 'bg-red-500 text-white' : 'bg-ink-700 text-slate-300'}`}
            >
              {sure ? `Sure? +${salvageValue(item)} embers` : 'Melt down'}
            </button>
          </ItemCard>
        </div>
      )}
      <p className="mt-3 text-[11px] leading-snug text-slate-400">
        Die in a run and the Fog takes what you wore and carried. Leave by the stairs, or win, and it all comes home. The vault keeps items safe: one more slot every 5 workouts.
      </p>
    </section>
  );
}

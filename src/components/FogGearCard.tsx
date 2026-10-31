'use client';

import { useState } from 'react';
import { heroLevel, type GameState } from '@/lib/game';
import { buildOf } from '@/lib/stats';
import { NO_GEAR, takeOffToVault, vaultSize, wearFromVault } from '@/lib/fog-gear';
import { canWear, ITEM_SLOTS, MAX_PLUS, nameOf, SLOT_NAME, starterKit, type Item } from '@/game/dungeon/items';
import { ItemCard, ItemTile } from './ItemCard';
import { ForgeSheet } from './Forge';
import { Sprite } from './Sprite';

type Update = (fn: (s: GameState) => GameState) => void;

/** Your gear for the Fog: the three slots you wear (they always come home, even from a fall) and
    the vault at home, its free spaces drawn empty. Tap an item for its card, to wear it, and for
    Mira's forge, which opens on its own page (`ForgeSheet`). `land`: the Hero tab's Gear part held
    sideways, what you have on the left and the tapped item on the right. */
export function FogGearCard({ state, update, land = false }: { state: GameState; update: Update; land?: boolean }) {
  const gear = state.fogGear ?? NO_GEAR,
    build = buildOf(state),
    size = vaultSize(state.sessions.length),
    cls = state.profile.classId,
    kit = starterKit(cls),
    level = heroLevel(state),
    can = (it: Item) => canWear(it, build, cls, level);
  const [pick, setPick] = useState<string | null>(null);
  const [forging, setForging] = useState(false);
  const all = [...Object.values(gear.worn), ...gear.vault].filter((x): x is Item => !!x),
    item = all.find((x) => x.id === pick) ?? null,
    worn = !!item && gear.worn[item.slot]?.id === item.id;
  const choose = (id: string) => setPick(id === pick ? null : id);
  const ring = (id: string) => (id === pick ? 'ring-2 ring-gold-300 ring-offset-2 ring-offset-ink-800' : '');

  // The way into Mira's forge: her face, what she does, and the plus she can take it to.
  const forgeButton = item && !item.starter && (
      <button
        onClick={() => setForging(true)}
        className="mt-2 flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-orange-950/60 to-ink-900 p-3 text-left ring-1 ring-orange-400/40 active:scale-[0.98]"
      >
        <Sprite id="mira" size={44} label="" />
        <span className="min-w-0 flex-1">
          <span className="block font-pixel text-[10px] text-gold-300">Mira&apos;s forge</span>
          <span className="mt-1 block text-xs text-slate-400">{(item.plus ?? 0) >= MAX_PLUS ? 'Reroll or melt down' : `Upgrade to +${(item.plus ?? 0) + 1}, reroll or melt down`}</span>
        </span>
        <span className="rounded-lg bg-gold-400 px-3 py-2 font-pixel text-[9px] text-ink-950 shadow-[0_3px_0_#b45309]">Open</span>
      </button>
  );

  return (
    <section className={`rounded-2xl bg-ink-800 ${land ? 'flex h-full gap-3 p-3' : 'p-4'}`}>
      <div className={land ? 'w-[13.5rem] shrink-0 overflow-y-auto' : ''}>
        <p className="font-pixel text-[9px] text-slate-400">Worn</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {ITEM_SLOTS.map((slot) => {
            const it = gear.worn[slot];
            return (
              <button key={slot} onClick={() => it && choose(it.id)} className="flex flex-col items-center gap-1.5 rounded-xl bg-ink-900/60 py-2.5" aria-label={it ? nameOf(it) : `${SLOT_NAME[slot]}: ${slot === 'weapon' ? kit.weapon.name : 'empty'}`}>
                {it ? (
                  <span className={`rounded-lg ${ring(it.id)}`}>
                    <ItemTile item={it} size={48} dim={!can(it)} />
                  </span>
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-lg border-2 border-dashed border-ink-700 px-1 text-center text-[8px] leading-tight text-slate-500">{slot === 'weapon' ? kit.weapon.name : ''}</span>
                )}
                <span className="text-[10px] text-slate-500">{SLOT_NAME[slot]}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 flex items-baseline justify-between font-pixel text-[9px] text-gold-300">
          <span>Vault</span>
          <span className="text-slate-500">
            {gear.vault.length}/{size}
          </span>
        </p>
        {/* Every space of the vault, the free ones empty, so it reads as a chest at a glance. */}
        <div className={`mt-2 grid gap-1.5 ${land ? 'grid-cols-4' : 'grid-cols-6'}`}>
          {Array.from({ length: size }, (_, i) => {
            const it = gear.vault[i];
            return it ? (
              <button key={it.id} onClick={() => choose(it.id)} aria-label={nameOf(it)} className={`grid aspect-square place-items-center rounded-lg ${ring(it.id)}`}>
                <ItemTile item={it} size={44} dim={!can(it)} than={gear.worn[it.slot] ?? 'none'} />
              </button>
            ) : (
              <span key={i} aria-hidden className="aspect-square rounded-lg bg-ink-900/60 ring-1 ring-inset ring-ink-700/60" />
            );
          })}
        </div>
        {!gear.vault.length && <p className="mt-2 text-[11px] text-slate-500">Loot you bring home from the Fog lands here.</p>}
      </div>

      <div className={land ? 'min-w-0 flex-1 overflow-y-auto' : 'mt-4'}>
        {/* Sideways the forge's button sits over the card, in sight; upright it is under it. */}
        {land && forgeButton && <div className="mb-2 [&>button]:mt-0">{forgeButton}</div>}
        {item ? (
          <ItemCard item={item} build={build} level={level} cls={cls} than={worn ? undefined : gear.worn[item.slot] ?? 'none'}>
            {worn ? (
              <button onClick={() => update((s) => takeOffToVault(s, item.slot))} disabled={gear.vault.length >= size} className="flex-1 rounded-lg bg-ink-700 py-2.5 text-xs text-slate-200 disabled:opacity-40">
                Take off
              </button>
            ) : (
              <button onClick={() => update((s) => wearFromVault(s, item.id))} disabled={!can(item)} className="flex-1 rounded-lg bg-ink-600 py-2.5 text-xs font-semibold text-slate-100 disabled:opacity-40">
                Wear
              </button>
            )}
          </ItemCard>
        ) : null}
        {!land && forgeButton}
        {!item && all.length > 0 && (
            <div className={`flex items-center gap-3 rounded-xl bg-ink-900/60 p-3 ${land ? 'h-full flex-col justify-center text-center' : ''}`}>
              <Sprite id="mira" size={48} label="Mira" />
              <p className="text-[11px] text-slate-400">Tap an item to wear it, or bring it to Mira&apos;s forge.</p>
            </div>
        )}
      </div>

      {forging && item && <ForgeSheet id={item.id} state={state} update={update} onClose={() => setForging(false)} />}
    </section>
  );
}

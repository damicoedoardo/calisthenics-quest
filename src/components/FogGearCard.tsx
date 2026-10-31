'use client';

import { useState } from 'react';
import { heroLevel, type GameState } from '@/lib/game';
import { buildOf } from '@/lib/stats';
import { NO_GEAR, salvageValue, takeOffToVault, vaultSize, wearFromVault } from '@/lib/fog-gear';
import { canWear, ITEM_SLOTS, itemScore, MAX_PLUS, nameOf, RARITY, SLOT_NAME, starterKit, type Item, type ItemSlot, type Rarity } from '@/game/dungeon/items';
import { meltable, salvage, salvageMany, type MeltPick } from '@/lib/forge';
import { ItemCard, ItemTile } from './ItemCard';
import { PixelTabs } from './PixelTabs';
import { ForgeSheet } from './Forge';
import { Sprite } from './Sprite';

type Update = (fn: (s: GameState) => GameState) => void;

/** Rarest first, then strongest. */
const ORDER: Rarity[] = ['legendary', 'rare', 'magic', 'common'];
const sorted = (items: Item[]) => [...items].sort((a, b) => ORDER.indexOf(a.rarity) - ORDER.indexOf(b.rarity) || itemScore(b) - itemScore(a));

/** Your gear for the Fog: the three slots you wear (they always come home, even from a fall) and
    the vault at home, rarest first, with a filter by slot and Melt many (`VaultMelt`). Tap an item
    for its card, to wear it or melt it down, and for Mira's forge, which opens on its own page
    (`ForgeSheet`). `land`: the Hero tab's Gear part held
    sideways, what you have on the left and the tapped item on the right. */
export function FogGearCard({ state, update, land = false }: { state: GameState; update: Update; land?: boolean }) {
  const gear = state.fogGear ?? NO_GEAR,
    build = buildOf(state),
    size = vaultSize(),
    cls = state.profile.classId,
    kit = starterKit(cls),
    level = heroLevel(state),
    can = (it: Item) => canWear(it, build, cls, level);
  const [pick, setPick] = useState<string | null>(null);
  const [forging, setForging] = useState(false);
  const [slot, setSlot] = useState<ItemSlot | null>(null);
  const [many, setMany] = useState(false);
  const [sure, setSure] = useState(false);
  const all = [...Object.values(gear.worn), ...gear.vault].filter((x): x is Item => !!x),
    item = all.find((x) => x.id === pick) ?? null,
    worn = !!item && gear.worn[item.slot]?.id === item.id;
  const choose = (id: string) => {
    setPick(id === pick ? null : id);
    setSure(false);
  };
  const shown = sorted(gear.vault.filter((it) => !slot || it.slot === slot)),
    cols = land ? 4 : 6,
    // The items, then free spaces to the end of the row (a whole row when it's full or empty).
    free = Math.min(size - gear.vault.length, cols - (shown.length % cols) || cols);
  const melt = () => {
    if (!item) return;
    if (!sure) return setSure(true);
    update((s) => salvage(s, item.id));
    setPick(null);
    setSure(false);
  };
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
          <span className="mt-1 block text-xs text-slate-400">{(item.plus ?? 0) >= MAX_PLUS ? 'Reroll a bonus' : `Upgrade to +${(item.plus ?? 0) + 1} or reroll`}</span>
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

        <div className="mt-4 flex items-center gap-2 font-pixel text-[9px] text-gold-300">
          <span>Vault</span>
          <span className="text-slate-500">
            {gear.vault.length}/{size}
          </span>
          {gear.vault.length > 0 && (
            <button
              onClick={() => setMany(!many)}
              aria-expanded={many}
              className={`ml-auto flex items-center gap-1 rounded-md px-2 py-1.5 font-sans text-[11px] ring-1 ${many ? 'bg-orange-500/20 text-orange-200 ring-orange-400/60' : 'text-orange-300 ring-orange-400/40'}`}
            >
              <Sprite id="uiIcon" opts={{ name: 'flame' }} size={12} label="" />
              Melt many
            </button>
          )}
        </div>
        {gear.vault.length > 0 && (
          <PixelTabs
            small
            label="Show"
            className="mt-2"
            tabs={[{ id: 'all', label: 'All' }, ...ITEM_SLOTS.map((s) => ({ id: s, label: SLOT_NAME[s] }))]}
            value={slot ?? 'all'}
            onChange={(id) => setSlot(id === 'all' ? null : id)}
          />
        )}
        {many && gear.vault.length > 0 && (
          <VaultMelt
            state={state}
            onMelt={(ids) => {
              update((s) => salvageMany(s, ids));
              if (pick && ids.includes(pick)) setPick(null);
            }}
          />
        )}
        {/* What you have, rarest first, then the free spaces to the end of the row. */}
        <div className={`mt-2 grid gap-1.5 ${land ? 'grid-cols-4' : 'grid-cols-6'}`}>
          {shown.map((it) => (
            <button key={it.id} onClick={() => choose(it.id)} aria-label={nameOf(it)} className={`grid aspect-square place-items-center rounded-lg ${ring(it.id)}`}>
              <ItemTile item={it} size={44} dim={!can(it)} than={gear.worn[it.slot] ?? 'none'} />
            </button>
          ))}
          {Array.from({ length: free }, (_, i) => (
            <span key={`free${i}`} aria-hidden className="aspect-square rounded-lg bg-ink-900/60 ring-1 ring-inset ring-ink-700/60" />
          ))}
        </div>
        {!gear.vault.length && <p className="mt-2 text-[11px] text-slate-500">Loot you bring home from the Fog lands here.</p>}
        {gear.vault.length > 0 && !shown.length && <p className="mt-2 text-[11px] text-slate-500">No {SLOT_NAME[slot!].toLowerCase()} in the vault.</p>}
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
            {!item.starter && (
              <button
                onClick={melt}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-2.5 text-xs ${sure ? 'bg-red-500 font-semibold text-white' : 'bg-ink-700 text-orange-200'}`}
              >
                {sure ? (
                  'Tap again: melt'
                ) : (
                  <>
                    Melt <Sprite id="uiIcon" opts={{ name: 'flame' }} size={12} label="embers" /> {salvageValue(item)}
                  </>
                )}
              </button>
            )}
          </ItemCard>
        ) : null}
        {sure && item && <p className="mt-1 text-center text-[11px] text-slate-400">{worn ? 'You wear it: its slot will be empty. ' : ''}Melted is gone for good.</p>}
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

/** Melt many at once: every common, magic or rare in the vault, or all that are weaker than what you
    wear. What you wear and what you forged are never taken. Each choice says how many and for how
    many embers, and asks for a second tap. */
function VaultMelt({ state, onMelt }: { state: GameState; onMelt: (ids: string[]) => void }) {
  const [sure, setSure] = useState<MeltPick | null>(null);
  const picks: { id: MeltPick; label: string; color?: string }[] = [
    { id: 'weaker', label: 'Weaker than yours' },
    ...(['common', 'magic', 'rare'] as const).map((r) => ({ id: r, label: `All ${RARITY[r].name.toLowerCase()}`, color: RARITY[r].color })),
  ];
  return (
    <div className="mt-2 rounded-xl bg-ink-900/70 p-2 ring-1 ring-orange-400/30">
      <ul className="space-y-1">
        {picks.map((p) => {
          const items = meltable(state, p.id),
            embers = items.reduce((n, it) => n + salvageValue(it), 0),
            on = sure === p.id;
          return (
            <li key={p.id}>
              <button
                disabled={!items.length}
                onClick={() => {
                  if (!on) return setSure(p.id);
                  onMelt(items.map((it) => it.id));
                  setSure(null);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs disabled:opacity-40 ${on ? 'bg-red-500 text-white' : 'bg-ink-800 text-slate-200'}`}
              >
                {p.color && <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />}
                <span className="flex-1">{on ? `Tap again: melt ${items.length}` : p.label}</span>
                <span className={on ? 'text-white/80' : 'text-slate-500'}>{items.length}</span>
                <span className="flex items-center gap-0.5 font-pixel text-[9px] text-orange-300">
                  <Sprite id="uiIcon" opts={{ name: 'flame' }} size={12} label="embers" />+{embers}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 px-1 text-[10px] leading-snug text-slate-500">Never melts what you wear, or items you forged (+1 and up). Legendaries only one at a time.</p>
    </div>
  );
}

'use client';

import { getStat, type Build } from '@/lib/stats';
import { iconOf, itemLines, nameOf, RARITY, SLOT_NAME, shortOf, type Item } from '@/game/dungeon/items';
import { Sprite } from './Sprite';

/** An item's icon in a tile edged in its rarity's color. */
export function ItemTile({ item, size = 40, dim = false }: { item: Item; size?: number; dim?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg bg-ink-900 ${dim ? 'opacity-50 grayscale' : ''}`} style={{ width: size, height: size, boxShadow: `0 0 0 2px ${RARITY[item.rarity].color}` }}>
      <Sprite id="itemIcon" opts={{ name: iconOf(item) }} size={Math.round(size * 0.7)} label="" />
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

/** An item on one card: icon, name in its rarity's color, what it gives, what it asks. */
export function ItemCard({ item, build, children }: { item: Item; build: Build; children?: React.ReactNode }) {
  const need = needLine(item, build);
  return (
    <div className="rounded-xl bg-ink-800 p-3 text-left ring-1 ring-ink-700">
      <div className="flex items-start gap-3">
        <ItemTile item={item} dim={!!need && !need.ok} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: RARITY[item.rarity].color }}>
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
        </div>
      </div>
      {children && <div className="mt-3 flex gap-2">{children}</div>}
    </div>
  );
}

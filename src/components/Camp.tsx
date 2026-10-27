'use client';

import { useEffect, useRef, useState } from 'react';
import { Flame, Smartphone, X } from 'lucide-react';
import type { GameState } from '@/lib/game';
import { buildOf } from '@/lib/stats';
import { ZONES, zoneStatus, type Zone } from '@/lib/fog';
import { flameGuards, NO_GEAR, salvageValue, setGuard } from '@/lib/fog-gear';
import { embersOf, REROLL_COST, reroll, salvage, upgrade, upgradeCost } from '@/lib/forge';
import { ITEM_SLOTS, MAX_PLUS, nameOf, RARITY, SLOT_NAME, BONUSES, type Item } from '@/game/dungeon/items';
import { campSheets } from '@/game/sheets';
import { gateZone, stations, type StationId } from '@/game/camp/layout';
import type { CampHandle } from '@/game/camp/scene';
import { FogGearCard } from './FogGearCard';
import { ItemCard, ItemTile } from './ItemCard';
import { usePortrait, useSideways } from './FogRun';

interface Props {
  state: GameState;
  update: (fn: (s: GameState) => GameState) => void;
  /** Where you stand when the camp opens (the gate you came back through). */
  at?: StationId;
  onPlay: (zone: Zone) => void;
  onLeave: () => void;
}

/** The camp between runs, held sideways: walk to the fire, the vault, Mira's forge or a gate, and
    its panel opens over the camp. */
export function Camp({ state, update, at, onPlay, onLeave }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const camp = useRef<CampHandle | null>(null);
  const [panel, setPanel] = useState<StationId | null>(null);
  const [failed, setFailed] = useState(false);
  useSideways();
  const portrait = usePortrait();

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let cancelled = false;
    const open = ZONES.filter((z) => zoneStatus(state, z).state !== 'locked').map((z) => z.id),
      cleared = ZONES.filter((z) => zoneStatus(state, z).state === 'cleared').map((z) => z.id);
    import('@/game/camp/scene').then(
      ({ startCamp }) => {
        if (cancelled) return;
        camp.current = startCamp(el, { sheets: campSheets(state), stations: stations(ZONES), open, cleared, at }, { open: setPanel });
      },
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
      camp.current?.destroy();
      camp.current = null;
    };
    // The camp is drawn once from the save it opens with; its panels read the live save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (panel || portrait) camp.current?.pause();
    else camp.current?.resume();
  }, [panel, portrait]);

  const zone = panel ? gateZone(panel) : null;
  return (
    <div className="fixed inset-0 z-40 touch-none select-none bg-ink-950">
      <div ref={host} className="absolute inset-0" />
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 flex items-center gap-2 px-3 pt-2">
        <p className="font-pixel text-[10px] text-gold-300 drop-shadow-[0_2px_0_#0b0d14]">The camp</p>
        <p className="flex items-center gap-1 rounded bg-ink-900/80 px-1.5 py-0.5 font-mono text-[10px] text-orange-300">
          <Flame size={11} aria-hidden /> {embersOf(state)} embers
        </p>
        <button aria-label="Leave the camp" onClick={onLeave} className="pointer-events-auto ml-auto grid h-9 w-9 place-items-center rounded-lg bg-ink-800/90 text-slate-200">
          <X size={16} />
        </button>
      </div>
      <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-slate-500">Tap a place to walk there, or hold to walk.</p>
      {failed && <p className="absolute inset-x-0 top-1/2 text-center text-sm text-slate-300">The camp has to download once, with a signal.</p>}

      {panel && (
        <div onPointerDown={(e) => e.stopPropagation()} className="absolute inset-0 z-10 flex animate-fadein items-center justify-center bg-ink-950/75 p-3">
          <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-ink-950/95 p-3 ring-1 ring-gold-400/40">
            {panel === 'vault' && <FogGearCard state={state} update={update} />}
            {panel === 'forge' && <ForgePanel state={state} update={update} />}
            {panel === 'fire' && <FirePanel state={state} update={update} />}
            {zone !== null && <GatePanel state={state} zone={ZONES[zone]} onPlay={onPlay} />}
            <button onClick={() => setPanel(null)} className="mt-3 w-full rounded-xl bg-ink-800 py-2.5 text-sm text-slate-300">
              Back to the camp
            </button>
          </div>
        </div>
      )}

      {portrait && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-ink-950 px-8 text-center">
          <Smartphone size={44} className="text-gold-300 motion-safe:animate-turn" aria-hidden />
          <p className="font-pixel text-xs leading-relaxed text-gold-300">Turn your phone sideways</p>
          <button onClick={onLeave} className="w-full max-w-xs rounded-xl bg-ink-800 py-3 text-sm text-slate-300">
            Back
          </button>
        </div>
      )}
    </div>
  );
}

/** Everything you own, worn and in the vault, as tiles to pick from. */
function ItemPicker({ state, pick, onPick }: { state: GameState; pick: string | null; onPick: (id: string) => void }) {
  const g = state.fogGear ?? NO_GEAR,
    all = [...ITEM_SLOTS.map((s) => g.worn[s]).filter((x): x is Item => !!x), ...g.vault];
  if (!all.length) return <p className="text-xs text-slate-500">Nothing to work on yet. Bring something home from the Fog.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {all.map((it) => (
        <button key={it.id} onClick={() => onPick(it.id)} className={`rounded-lg p-1 ${pick === it.id ? 'bg-ink-800' : ''}`} aria-label={nameOf(it)}>
          <ItemTile item={it} size={38} />
        </button>
      ))}
    </div>
  );
}

/** Mira's forge: upgrade an item, roll one of its bonuses again, or melt it down for embers. */
function ForgePanel({ state, update }: { state: GameState; update: Props['update'] }) {
  const [pick, setPick] = useState<string | null>(null);
  const g = state.fogGear ?? NO_GEAR,
    item = [...Object.values(g.worn), ...g.vault].find((x) => x?.id === pick) ?? null,
    have = embersOf(state);
  return (
    <section>
      <p className="font-pixel text-[10px] text-gold-300">Mira&apos;s forge</p>
      <p className="mt-1 text-xs text-slate-400">
        &ldquo;Embers from your training, and a little from what you melt down. Bring me something and we&apos;ll make it better.&rdquo; You have <span className="text-orange-300">{have} embers</span>.
      </p>
      <div className="mt-3">
        <ItemPicker state={state} pick={pick} onPick={setPick} />
      </div>
      {item && (
        <div className="mt-3">
          <ItemCard item={item} build={buildOf(state)}>
            <div className="w-full space-y-2">
              <button
                onClick={() => update((s) => upgrade(s, item.id))}
                disabled={(item.plus ?? 0) >= MAX_PLUS || have < upgradeCost(item)}
                className="w-full rounded-lg bg-gold-400 py-2 text-xs font-semibold text-ink-950 disabled:bg-ink-700 disabled:text-slate-500"
              >
                {(item.plus ?? 0) >= MAX_PLUS ? `At +${MAX_PLUS}, as good as it gets` : `Upgrade to +${(item.plus ?? 0) + 1} · ${upgradeCost(item)} embers`}
              </button>
              {item.bonuses.map((b, i) => (
                <button key={i} onClick={() => update((s) => reroll(s, item.id, i))} disabled={have < REROLL_COST} className="w-full rounded-lg bg-ink-700 py-2 text-xs text-slate-200 disabled:opacity-40">
                  Reroll {BONUSES[b.id].name.toLowerCase()} · {REROLL_COST} embers
                </button>
              ))}
              <button
                onClick={() => {
                  update((s) => salvage(s, item.id));
                  setPick(null);
                }}
                className="w-full rounded-lg bg-ink-800 py-2 text-xs text-slate-300 ring-1 ring-ink-700"
              >
                Melt down · +{salvageValue(item)} embers
              </button>
            </div>
          </ItemCard>
        </div>
      )}
    </section>
  );
}

/** The fire: your flame holds one worn item through a fall, while you've trained in the last 2 days. */
function FirePanel({ state, update }: { state: GameState; update: Props['update'] }) {
  const g = state.fogGear ?? NO_GEAR,
    on = flameGuards(state, new Date()),
    name = state.profile.flame || 'Your flame',
    worn = ITEM_SLOTS.map((s) => g.worn[s]).filter((x): x is Item => !!x);
  return (
    <section>
      <p className="font-pixel text-[10px] text-orange-300">The fire</p>
      <p className="mt-1 text-xs text-slate-300">
        {on
          ? `${name}: "You trained, so I'm strong enough to hold one thing for you. If the Fog takes you, I keep it safe."`
          : `${name}: "Train, and for two days I can hold one thing for you through a fall."`}
      </p>
      <p className="mt-3 font-pixel text-[9px] text-slate-400">What {name === 'Your flame' ? 'it' : name} holds</p>
      {worn.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {worn.map((it) => {
            const chosen = g.guard === it.slot;
            return (
              <button
                key={it.id}
                onClick={() => update((s) => setGuard(s, chosen ? null : it.slot))}
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs ring-1 ${chosen ? 'bg-orange-950/60 ring-orange-400' : 'bg-ink-800 ring-ink-700'}`}
              >
                <ItemTile item={it} size={28} dim={!on} />
                <span>
                  <span className="block" style={{ color: RARITY[it.rarity].color }}>
                    {nameOf(it)}
                  </span>
                  <span className="block text-[10px] text-slate-500">{chosen ? (on ? 'Held by the flame' : 'Held once you train') : SLOT_NAME[it.slot]}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-500">Wear something from the vault first.</p>
      )}
    </section>
  );
}

/** A gate: where it leads, how you've done there, and the way in. */
function GatePanel({ state, zone, onPlay }: { state: GameState; zone: Zone; onPlay: (z: Zone) => void }) {
  const st = zoneStatus(state, zone),
    best = state.fog?.best[zone.id];
  return (
    <section>
      <p className="font-pixel text-[10px] text-violet-300">{zone.name}</p>
      <p className="mt-1 text-xs text-slate-400">{st.state === 'locked' ? st.why : st.state === 'cleared' ? `${zone.bossName} has fallen here. Go back for better loot.` : `${zone.bossName} waits at the bottom.`}</p>
      {best && <p className="mt-1 text-[11px] text-slate-500">{best.won ? 'Cleared before.' : 'Not cleared yet.'}</p>}
      {st.state !== 'locked' && (
        <button onClick={() => onPlay(zone)} className="mt-3 w-full rounded-xl bg-gold-400 py-3 font-pixel text-[10px] text-ink-950 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
          Into the Fog
        </button>
      )}
    </section>
  );
}

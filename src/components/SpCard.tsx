"use client";

import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Droplets,
  Flame,
  Footprints,
  Gem,
  HeartPulse,
  Hourglass,
  Leaf,
  Lock,
  Mountain,
  Shield,
  Snowflake,
  Sparkles,
  Sun,
  Swords,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Sprite } from "./Sprite";
import { useLook } from "./Look";
import { gearOf } from "@/lib/game";
import {
  ABILITIES,
  abilityOf,
  SP_MOVES,
  SP_PASSIVES,
  type SpNo,
  type SpPassiveId,
} from "@/game/dungeon/engine";
import type { GameState } from "@/lib/game";
import {
  setSpOff,
  SP_FLOOR,
  spCard,
  spChosen,
  spOpen,
  spOwned,
  spTrial,
  spWorn,
  wearSp,
} from "@/lib/sp";

type Update = (fn: (s: GameState) => GameState) => void;

/** Your SPs on the Hero tab. Nothing shows before the Wanderer gives the first; only the ones you
    have show after that, so each new one is a surprise. With more than one, the arrows turn
    through them: each one's card (ash while the first is sealed), its trial or its moves and
    passive, and a button to wear it into the Fog (one at a time). */
export function SpCard({
  state,
  update,
  land = false,
}: {
  state: GameState;
  update: Update;
  land?: boolean;
}) {
  const look = useLook();
  const owned = spOwned(state),
    chosen = spChosen(state);
  const [view, setView] = useState<SpNo | 0>(0);
  const trial = spTrial(state);
  if (!trial) return null;
  // Before the first wakes it's the only card; after, the one you look at (the worn one at first).
  const n: SpNo = (view && owned.includes(view) ? view : chosen) || 1,
    card = spCard(state, n),
    open = n === 1 ? spOpen(state) : true,
    worn = spWorn(state) === n,
    at = owned.indexOf(n),
    ability = abilityOf(state.profile.classId);
  const turn = (d: number) =>
    owned.length > 1 &&
    setView(owned[(at + d + owned.length) % owned.length]);
  const moves = [
    {
      icon: (
        <Sprite id="abilityIcon" opts={{ name: ability }} size={24} label="" />
      ),
      name: ABILITIES[ability].name,
      text: "Your class ability, as before.",
    },
    {
      icon: (
        <Sprite id="spIcon" opts={{ name: card.skill }} size={24} label="" />
      ),
      name: SP_MOVES[card.skill].name,
      text: SP_MOVES[card.skill].text,
    },
    {
      icon: (
        <Sprite id="spIcon" opts={{ name: card.final }} size={24} label="" />
      ),
      name: SP_MOVES[card.final].name,
      text: SP_MOVES[card.final].text,
    },
    {
      icon: <PassiveIcon id={card.passive} />,
      name: SP_PASSIVES[card.passive].name,
      text: SP_PASSIVES[card.passive].text,
    },
  ];
  return (
    <section
      className={
        land ? "rounded-xl bg-ink-900 p-2.5" : "rounded-2xl bg-ink-800 p-4"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-pixel text-[10px] text-violet-300">
          SP · {card.name}
        </p>
        {!open ? (
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <Lock size={11} aria-hidden /> Sealed
          </p>
        ) : (
          owned.length > 1 && (
            <div className="flex items-center gap-1 text-[11px] text-slate-500">
              <button
                aria-label="The SP before"
                onClick={() => turn(-1)}
                className="grid h-6 w-6 place-items-center rounded-md bg-ink-700 text-slate-200"
              >
                <ChevronLeft size={14} aria-hidden />
              </button>
              <span className="w-8 text-center tabular-nums">
                {at + 1}/{owned.length}
              </span>
              <button
                aria-label="The SP after"
                onClick={() => turn(1)}
                className="grid h-6 w-6 place-items-center rounded-md bg-ink-700 text-slate-200"
              >
                <ChevronRight size={14} aria-hidden />
              </button>
            </div>
          )
        )}
      </div>
      <div className="mt-2 flex gap-3">
        <div className="shrink-0">
          <Sprite
            id="spCard"
            opts={{
              classId: state.profile.classId,
              awake: open,
              gear: gearOf(state),
              look,
              n,
            }}
            size={land ? 48 : 96}
          />
        </div>
        <div className="min-w-0 flex-1">
          {open ? (
            <>
              <ul className="space-y-2">
                {moves.map((m) => (
                  <li key={m.name} className="flex items-start gap-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-950/60">
                      {m.icon}
                    </span>
                    <span className="min-w-0 text-xs text-slate-300">
                      <span className="font-semibold text-slate-100">
                        {m.name}
                      </span>{" "}
                      {m.text}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() =>
                  update((s) => (worn ? setSpOff(s, true) : wearSp(s, n)))
                }
                className={`mt-3 w-full rounded-lg py-2 text-xs font-semibold ${worn ? "bg-violet-300 text-ink-950" : "bg-ink-700 text-slate-300"}`}
              >
                {worn ? "Worn into the Fog" : "Wear it into the Fog"}
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-400">
                The Wanderer&apos;s card wakes when it believes you.
              </p>
              <ul className="mt-2 space-y-1.5 text-xs">
                <Step
                  done={trial.workouts >= trial.need}
                  text={`Train ${trial.need} more times (${trial.workouts}/${trial.need})`}
                />
                <Step
                  done={trial.floor}
                  text={`Reach floor ${SP_FLOOR} in the Fog, where the guardian waits`}
                />
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Step({ done, text }: { done: boolean; text: string }) {
  return (
    <li
      className={`flex items-center gap-2 ${done ? "text-emerald-300" : "text-slate-300"}`}
    >
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded ${done ? "bg-emerald-400 text-ink-950" : "ring-1 ring-ink-600"}`}
      >
        {done && <Check size={11} aria-hidden />}
      </span>
      {text}
    </li>
  );
}

/** Each passive's mark, in its SP's color. */
const PASSIVE_MARK: Record<SpPassiveId, [LucideIcon, string]> = {
  embers: [Flame, "text-orange-400"],
  bedrock: [Mountain, "text-amber-200"],
  static: [Zap, "text-yellow-300"],
  secondwind: [Sun, "text-amber-300"],
  tailwind: [Wind, "text-emerald-300"],
  frostbite: [Snowflake, "text-sky-300"],
  harvest: [Leaf, "text-green-400"],
  focus: [Crosshair, "text-indigo-300"],
  splitstar: [Sparkles, "text-amber-200"],
  shell: [Gem, "text-cyan-300"],
  swiftsurge: [Hourglass, "text-amber-400"],
  rebound: [Shield, "text-purple-400"],
  flow: [Droplets, "text-sky-300"],
  momentum: [Footprints, "text-orange-300"],
  quickstep: [Swords, "text-pink-300"],
  sunburst: [HeartPulse, "text-yellow-400"],
};

function PassiveIcon({ id }: { id: SpPassiveId }) {
  const [Icon, color] = PASSIVE_MARK[id];
  return <Icon size={18} className={color} aria-hidden />;
}

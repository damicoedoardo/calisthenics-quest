"use client";

import { Check, Lock } from "lucide-react";
import { Sprite } from "./Sprite";
import { useLook } from "./Look";
import { gearOf } from "@/lib/game";
import { ABILITIES, abilityOf, SP_MOVES } from "@/game/dungeon/engine";
import type { GameState } from "@/lib/game";
import { setSpOff, SP_FLOOR, spCard, spOpen, spTrial, spWorn } from "@/lib/sp";

type Update = (fn: (s: GameState) => GameState) => void;

/** The first SP on the Hero tab: its card (ash while sealed, in color once awake), then the trial,
    or its three moves and a switch to wear it into the Fog. Nothing shows before the Wanderer gives it. */
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
  const trial = spTrial(state);
  if (!trial) return null;
  const card = spCard(state),
    open = spOpen(state),
    worn = spWorn(state),
    ability = abilityOf(state.profile.classId);
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
  ];
  return (
    <section
      className={
        land ? "rounded-xl bg-ink-900 p-2.5" : "rounded-2xl bg-ink-800 p-4"
      }
    >
      <div className="flex items-baseline justify-between">
        <p className="font-pixel text-[10px] text-violet-300">
          SP · {card.name}
        </p>
        {!open && (
          <p className="flex items-center gap-1 text-[11px] text-slate-500">
            <Lock size={11} aria-hidden /> Sealed
          </p>
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
                onClick={() => update((s) => setSpOff(s, worn))}
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

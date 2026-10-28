"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { Hero } from "./Hero";
import { Sprite } from "./Sprite";
import { useLook } from "./Look";
import { SP_CARDS } from "@/game/dungeon/content";
import { SP_LOOKS } from "@/sprites/characters/spLooks";
import type { ClassId, Gear, GearSlot } from "@/lib/gear";
import { fastStory } from "@/lib/dev";

/* The SP waking: the card rises and turns, your element storms in (fire for the Ember Knight, wind
   for the Wind Ranger, falling stars for the Star Sage, rings of water for the River Monk), you
   burn white, a flash, and there you stand in the SP's look under its name. Tap moves on. With
   reduced motion it goes straight to you in the new look. */

type Phase = "call" | "storm" | "flash" | "reveal";

/** When each phase starts, in ms. */
const AT: Record<Phase, number> = {
  call: 0,
  storm: 1400,
  flash: 3400,
  reveal: 3800,
};
/** How long the reveal holds before the scene moves on by itself (a tap moves on sooner). */
const HOLD = 3200;

const MOTION = "(prefers-reduced-motion: reduce)";

export function SpTransform({
  classId,
  gear,
  onDone,
}: {
  classId: ClassId;
  gear: Record<GearSlot, Gear>;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("call");
  const look = useLook();
  // The scene behind re-renders as it likes: keep the timer on the latest callback, not a new one.
  const done = useRef(onDone);
  done.current = onDone;
  const sp = SP_LOOKS[classId],
    name = SP_CARDS[classId].name;

  useEffect(() => {
    const still = fastStory() || window.matchMedia?.(MOTION).matches;
    if (still) {
      setPhase("reveal");
      return;
    }
    const ts = (["storm", "flash", "reveal"] as const).map((p) =>
      setTimeout(() => setPhase(p), AT[p]),
    );
    return () => ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(() => done.current(), fastStory() ? 100 : HOLD);
    return () => clearTimeout(t);
  }, [phase]);

  const tap = (e: MouseEvent) => {
    e.stopPropagation();
    if (phase === "reveal") done.current();
    else setPhase("reveal");
  };

  const glow = `drop-shadow(0 0 10px ${sp.aura[1]}) drop-shadow(0 0 24px ${sp.aura[0]})`;
  const sky = `radial-gradient(circle at 50% 58%, ${sp.aura[0]}${phase === "call" ? "55" : "aa"} 0%, #0b0d14 ${phase === "call" ? "45%" : "70%"})`;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden bg-ink-950"
      onClick={tap}
      role="img"
      aria-label={`You become the ${name}`}
    >
      <div
        className="absolute inset-0 transition-[background] duration-1000"
        style={{ background: sky }}
      />

      {phase === "storm" && (
        <Storm classId={classId} colors={sp.aura} spark={sp.spark} />
      )}

      <div
        className={`absolute inset-0 flex flex-col items-center justify-center ${phase === "storm" ? "animate-shake" : ""}`}
      >
        <div className="relative">
          {phase === "reveal" ? (
            <div className="animate-pop" style={{ filter: glow }}>
              <Hero gear={gear} classId={classId} sp size={256} look={look} />
            </div>
          ) : (
            // Before the flash it's still you, burning whiter as the element comes in.
            <div
              className="transition-[filter] duration-[1800ms]"
              style={{
                filter:
                  phase === "call" ? "none" : `brightness(0) invert(1) ${glow}`,
              }}
            >
              <Hero gear={gear} classId={classId} size={256} look={look} />
            </div>
          )}
          {phase === "call" && (
            <div className="absolute inset-x-0 top-1/3 flex justify-center [perspective:400px]">
              <div className="animate-cardrise" style={{ filter: glow }}>
                <Sprite
                  id="spCard"
                  opts={{ classId, awake: true, gear, look }}
                  size={96}
                  label=""
                />
              </div>
            </div>
          )}
        </div>
        <p
          className={`mt-2 font-pixel text-lg tracking-widest transition-opacity duration-700 ${phase === "reveal" ? "opacity-100" : "opacity-0"}`}
          style={{
            color: sp.aura[2],
            textShadow: `0 0 12px ${sp.aura[1]}, 0 3px 0 #0b0d14`,
          }}
        >
          {name.toUpperCase()}
        </p>
        <p
          className={`mt-6 text-xs text-slate-400 transition-opacity delay-1000 duration-700 ${phase === "reveal" ? "opacity-100" : "opacity-0"}`}
        >
          <span className="animate-blink">tap</span>
        </p>
      </div>

      <div
        className={`pointer-events-none absolute inset-0 bg-white transition-opacity ${phase === "flash" ? "opacity-100 duration-150" : "opacity-0 duration-700"}`}
      />
    </div>
  );
}

/** A pixel of the element, sized and placed in screen units. */
const bit = (style: CSSProperties, color: string, size = 8): CSSProperties => ({
  position: "absolute",
  width: size,
  height: size,
  background: color,
  imageRendering: "pixelated",
  ...style,
});

/** The element coming in, each class its own way. Placements come from the index, so every
    showing is the same. */
function Storm({
  classId,
  colors,
  spark,
}: {
  classId: ClassId;
  colors: string[];
  spark: string;
}) {
  const n = Array.from({ length: 40 }, (_, i) => i);
  const c = (i: number) => colors[i % 3 === 0 ? 2 : 1];
  if (classId === "warrior")
    // fire climbs from the ground all round you, and a ring of it burns at your feet
    return (
      <div className="pointer-events-none absolute inset-0">
        {n.map((i) => (
          <div
            key={i}
            className="animate-rise"
            style={bit(
              {
                left: `${30 + ((i * 37) % 40)}%`,
                bottom: `${(i * 13) % 20}%`,
                animationDuration: `${0.9 + (i % 5) * 0.18}s`,
                animationDelay: `${(i % 7) * 0.12}s`,
              },
              i % 4 === 0 ? spark : c(i),
              6 + (i % 3) * 4,
            )}
          />
        ))}
        <div className="absolute inset-x-0 top-[64%] flex justify-center">
          <div
            className="h-10 w-72 animate-flicker rounded-[50%] border-4"
            style={{
              borderColor: colors[1],
              boxShadow: `0 0 30px ${colors[1]}`,
            }}
          />
        </div>
      </div>
    );
  if (classId === "archer")
    // wind tears across in streaks, and leaves ride it
    return (
      <div className="pointer-events-none absolute inset-0">
        {n.map((i) => (
          <div
            key={i}
            className="animate-sweep"
            style={bit(
              {
                left: "50%",
                top: `${18 + ((i * 29) % 64)}%`,
                animationDuration: `${0.6 + (i % 4) * 0.15}s`,
                animationDelay: `${(i % 6) * 0.1}s`,
              },
              i % 5 === 0 ? spark : c(i),
              0,
            )}
          >
            <div
              style={{
                width: i % 5 === 0 ? 8 : 40 + (i % 3) * 30,
                height: i % 5 === 0 ? 8 : 3,
                background: i % 5 === 0 ? spark : c(i),
              }}
            />
          </div>
        ))}
      </div>
    );
  if (classId === "mage")
    // stars fall in from every side and gather into you
    return (
      <div className="pointer-events-none absolute inset-0">
        {n.map((i) => {
          const a = (i / n.length) * Math.PI * 2;
          return (
            <div
              key={i}
              className="animate-converge"
              style={bit(
                {
                  left: "calc(50% - 4px)",
                  top: "calc(50% - 4px)",
                  animationDelay: `${(i % 9) * 0.11}s`,
                  ["--dx" as string]: `${Math.round(Math.cos(a) * 44)}vw`,
                  ["--dy" as string]: `${Math.round(Math.sin(a) * 44)}vh`,
                },
                i % 3 === 0 ? spark : c(i),
                i % 3 === 0 ? 10 : 6,
              )}
            />
          );
        })}
      </div>
    );
  // water: rings spread from your feet, and drops rise through them
  return (
    <div className="pointer-events-none absolute inset-0">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={`r${i}`}
          className="absolute left-1/2 top-[64%] -ml-32 -mt-6 h-12 w-64 animate-ring rounded-[50%] border-4"
          style={{
            borderColor: colors[1 + (i % 2)],
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
      {n.map((i) => (
        <div
          key={i}
          className="animate-rise"
          style={bit(
            {
              left: `${32 + ((i * 41) % 36)}%`,
              bottom: `${20 + ((i * 7) % 18)}%`,
              animationDuration: `${1.2 + (i % 4) * 0.2}s`,
              animationDelay: `${(i % 8) * 0.12}s`,
            },
            i % 4 === 0 ? spark : c(i),
            6,
          )}
        />
      ))}
    </div>
  );
}

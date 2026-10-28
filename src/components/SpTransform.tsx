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
import { spDef, type SpElement, type SpNo } from "@/game/dungeon/content";
import { spLook } from "@/sprites/characters/spLooks";
import type { ClassId, Gear, GearSlot } from "@/lib/gear";
import { fastStory } from "@/lib/dev";

/* The SP waking: the card rises and turns, its element storms in (fire rises, wind sweeps, stars
   gather, water spreads in rings: STYLE), you burn white, a flash, and there you stand in the
   SP's look under its name. Tap moves on. With reduced motion it goes straight to you in the new
   look. */

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
  n = 1,
  gear,
  onDone,
}: {
  classId: ClassId;
  /** Which of the class's SPs wakes. */
  n?: SpNo;
  gear: Record<GearSlot, Gear>;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("call");
  const look = useLook();
  // The scene behind re-renders as it likes: keep the timer on the latest callback, not a new one.
  const done = useRef(onDone);
  done.current = onDone;
  const sp = spLook(classId, n),
    def = spDef(classId, n),
    name = def.name;

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
        <Storm style={STYLE[def.element]} colors={sp.aura} spark={sp.spark} />
      )}

      <div
        className={`absolute inset-0 flex flex-col items-center justify-center ${phase === "storm" ? "animate-shake" : ""}`}
      >
        <div className="relative">
          {phase === "reveal" ? (
            <div className="animate-pop" style={{ filter: glow }}>
              <Hero gear={gear} classId={classId} sp={n} size={256} look={look} />
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
                  opts={{ classId, awake: true, gear, look, n }}
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

/** How each element storms in: rising like fire, sweeping like wind, gathering like stars, or
    spreading in rings like water. */
type StormStyle = "rise" | "sweep" | "converge" | "rings";
const STYLE: Record<SpElement, StormStyle> = {
  fire: "rise",
  dawn: "rise",
  sun: "rise",
  tiger: "rise",
  wind: "sweep",
  leaf: "sweep",
  storm: "sweep",
  moon: "sweep",
  star: "converge",
  crystal: "converge",
  void: "converge",
  sand: "converge",
  water: "rings",
  frost: "rings",
  lotus: "rings",
  stone: "rings",
};

/** The element coming in, each its own way. Placements come from the index, so every showing is
    the same. */
function Storm({
  style,
  colors,
  spark,
}: {
  style: StormStyle;
  colors: string[];
  spark: string;
}) {
  const n = Array.from({ length: 40 }, (_, i) => i);
  const c = (i: number) => colors[i % 3 === 0 ? 2 : 1];
  if (style === "rise")
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
  if (style === "sweep")
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
  if (style === "converge")
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

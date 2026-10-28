import {
  uniformGear,
  type ClassId,
  type Gear,
  type GearSlot,
} from "@/lib/gear";
import type { Look } from "../engine/figure";
import {
  grid,
  mix,
  outline,
  painter,
  tint,
  type Grid,
  type Ramp,
} from "../engine/grid";
import { DEFAULT_LOOK, drawHero } from "./hero";
import { spLook } from "./spLooks";

/* The SP card the Wanderer hands you: a tall card with a window, and in it, you in the SP's look
   from the chest up. Sealed it is ash: you are a dark shape behind a crack of light. Awake it has
   its colors, its element's light behind you, and sparks that drift up the frame. */

export interface SpCardOpts {
  classId?: ClassId;
  awake?: boolean;
  gear?: Record<GearSlot, Gear>;
  look?: Look;
  /** Which of the class's SPs (1 to 4). */
  n?: number;
}

export const SP_CARD_W = 48;
export const SP_CARD_H = 64;

/** The stone of a sealed card, dark to light. */
const ASH: Ramp = ["#1c1b22", "#34323d", "#55525f"];
const SHADOW: Ramp = ["#0c0b10", "#16141c", "#221f2a"];
const GOLD: Ramp = ["#8a5a12", "#e0a526", "#ffe08a"];

/** The window: where the bust shows, and which part of the hero's 64x64 frame fills it. */
const WIN = { x: 5, y: 9, w: 38, h: 41, fromX: 13, fromY: 0 };

export function drawSpCard(o: SpCardOpts, f: number): Grid {
  const cls = o.classId ?? "warrior",
    n = o.n ?? 1,
    sp = spLook(cls, n),
    awake = !!o.awake,
    g = grid(SP_CARD_W, SP_CARD_H),
    p = painter(g),
    frame: Ramp = awake
      ? [mix(sp.aura[0], "#000000", 0.35), sp.aura[0], sp.aura[1]]
      : ASH,
    trim = awake ? GOLD : ASH;

  // The card: a dark edge, the frame, and the window's sky.
  p.r(0, 0, SP_CARD_W, SP_CARD_H, frame[0]);
  p.r(1, 1, SP_CARD_W - 2, SP_CARD_H - 2, frame[1]);
  p.row(1, 1, SP_CARD_W - 2, frame[2]);
  p.col(1, 1, SP_CARD_H - 2, frame[2]);
  p.r(3, 3, SP_CARD_W - 6, SP_CARD_H - 6, frame[0]);
  for (let y = 0; y < WIN.h; y++) {
    const t = y / WIN.h,
      sky = awake
        ? mix(mix(sp.aura[0], "#0b0d14", 0.55), sp.aura[1], t * 0.55)
        : mix(SHADOW[1], SHADOW[2], t);
    p.row(WIN.y + y, WIN.x, WIN.x + WIN.w - 1, sky);
  }
  if (awake) {
    // the element's light rising behind you
    p.ellipse(
      WIN.x + WIN.w / 2,
      WIN.y + WIN.h - 4,
      16,
      14,
      mix(sp.aura[1], "#0b0d14", 0.35),
    );
    p.ellipse(
      WIN.x + WIN.w / 2,
      WIN.y + WIN.h - 2,
      11,
      10,
      mix(sp.aura[1], "#0b0d14", 0.1),
    );
  }

  // You, in the SP's look, from the chest up.
  const hero = drawHero(
      {
        gear: o.gear ?? uniformGear(cls, 0),
        classId: cls,
        look: o.look ?? DEFAULT_LOOK,
        sp: n,
      },
      {},
      0,
    ),
    bust = awake ? hero : tint(hero, SHADOW);
  for (let y = 0; y < WIN.h; y++)
    for (let x = 0; x < WIN.w; x++) {
      const c = bust[WIN.fromY + y]?.[WIN.fromX + x];
      if (c) p.p(WIN.x + x, WIN.y + y, c);
    }
  // The window's own frame, with gold corners.
  p.row(WIN.y - 1, WIN.x - 1, WIN.x + WIN.w, trim[0]);
  p.row(WIN.y + WIN.h, WIN.x - 1, WIN.x + WIN.w, trim[0]);
  p.col(WIN.x - 1, WIN.y - 1, WIN.y + WIN.h, trim[0]);
  p.col(WIN.x + WIN.w, WIN.y - 1, WIN.y + WIN.h, trim[0]);
  [
    [WIN.x - 2, WIN.y - 2],
    [WIN.x + WIN.w - 1, WIN.y - 2],
    [WIN.x - 2, WIN.y + WIN.h - 1],
    [WIN.x + WIN.w - 1, WIN.y + WIN.h - 1],
  ].forEach(([x, y]) => {
    p.r(x, y, 3, 3, trim[1]);
    p.p(x, y, trim[2]);
  });

  // The stone at the top: the element's gem, or a grey seal.
  const gx = SP_CARD_W / 2;
  p.ellipse(gx - 0.5, 4.5, 3, 3, trim[0]);
  p.ellipse(gx - 0.5, 4.5, 2, 2, awake ? sp.aura[1] : ASH[2]);
  p.p(gx - 2, 3, awake ? "#ffffff" : ASH[2]);

  // The plate at the bottom, where the card's name sits, with the element's marks.
  p.r(6, 53, SP_CARD_W - 12, 7, trim[0]);
  p.r(7, 54, SP_CARD_W - 14, 5, awake ? frame[1] : ASH[1]);
  p.row(54, 7, SP_CARD_W - 8, trim[1]);
  for (let x = 10; x < SP_CARD_W - 10; x += 4)
    p.p(x, 56, awake ? sp.aura[2] : ASH[2]);

  const out = outline(g);
  const fx = painter(out);
  if (awake) {
    // sparks drift up the frame, one step a frame
    for (let i = 0; i < 5; i++) {
      const x = [2, 45, 3, 44, 24][i],
        y = SP_CARD_H - 4 - ((f * 4 + i * 13) % (SP_CARD_H - 8));
      fx.p(x, y, i % 2 ? "#ffffff" : sp.glow);
    }
    // a glint runs along the window's top
    fx.p(WIN.x + ((f * 6) % WIN.w), WIN.y - 1, "#ffffff");
  } else {
    // the seal's crack: a thin line of the element's light across the window, breathing
    const lit = f % 4 < 2 ? sp.aura[2] : sp.aura[1];
    const crack: [number, number][] = [
      [WIN.x + 4, WIN.y + 30],
      [WIN.x + 11, WIN.y + 26],
      [WIN.x + 16, WIN.y + 28],
      [WIN.x + 23, WIN.y + 21],
      [WIN.x + 29, WIN.y + 23],
      [WIN.x + 34, WIN.y + 17],
    ];
    for (let i = 1; i < crack.length; i++)
      fx.line(crack[i - 1][0], crack[i - 1][1], crack[i][0], crack[i][1], lit);
    fx.p(crack[f % crack.length][0], crack[f % crack.length][1] - 1, "#ffffff");
  }
  return out;
}

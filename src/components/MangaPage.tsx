'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { equippedGear } from '@/lib/gear';
import type { Figure, MangaPage as Page, Panel, Row, Tone, Words } from '@/story/manga';
import { Hero } from './Hero';
import { Hollow } from './Characters';
import { PlaceBackdrop } from './Place';

/* A manga page: ink borders on paper, pixel art in the panels, captions and bubbles on top.
   It only draws a page from src/story/manga.ts. Sizes follow the page's width, so the page reads
   the same on any phone. */

/** Paper between the panels, as a share of the page's width. */
const GUTTER = 0.022;
/** Ink around each panel, in px. */
const INK = 3;

const TONES: Record<Tone, string> = {
  golden: 'radial-gradient(circle at 50% 70%, #fff3c4 0%, #fcd34d 30%, #f59e0b 62%, #b45309 100%)',
  warm: 'linear-gradient(#f6c177, #c2773a)',
  dusk: 'linear-gradient(#a99a8e, #6b6470)',
  gray: 'linear-gradient(#8b8b93, #55555e)',
  dark: 'radial-gradient(circle at 66% 30%, #3b2f4a 0%, #17121f 55%, #08060c 100%)',
  black: 'linear-gradient(#0a0a0c, #0a0a0c)',
};

const DOTS = 'radial-gradient(rgba(0,0,0,0.26) 1px, transparent 1.7px)';

function speedLines([x, y]: [number, number]) {
  return `repeating-conic-gradient(from 0deg at ${x}% ${y}%, rgba(255,255,255,0.42) 0deg 1.6deg, transparent 1.6deg 7deg)`;
}

/** The left and right edges of each panel in a row, at its top and bottom, as shares of the width. */
function edges(row: Row) {
  const n = row.panels.length,
    cuts = row.cuts ?? Array.from({ length: n - 1 }, (_, i) => ({ at: (i + 1) / n, lean: 0 }));
  return row.panels.map((_, i) => {
    const l = i === 0 ? null : cuts[i - 1],
      r = i === n - 1 ? null : cuts[i];
    return {
      lt: l ? l.at + (l.lean ?? 0) : 0,
      lb: l ? l.at - (l.lean ?? 0) : 0,
      rt: r ? r.at + (r.lean ?? 0) : 1,
      rb: r ? r.at - (r.lean ?? 0) : 1,
      cutL: !!l,
      cutR: !!r,
    };
  });
}

/** The panel's outline as a clip path, shrunk by `pad` px (the ink is the gap between two of them). */
function outline(e: ReturnType<typeof edges>[number], w: number, h: number, pad: number) {
  const g = (GUTTER * w) / 2,
    x = (f: number, side: 'l' | 'r', cut: boolean) => f * w + (side === 'l' ? 1 : -1) * ((cut ? g : 0) + pad);
  return `polygon(${x(e.lt, 'l', e.cutL)}px ${pad}px, ${x(e.rt, 'r', e.cutR)}px ${pad}px, ${x(e.rb, 'r', e.cutR)}px ${h - pad}px, ${x(e.lb, 'l', e.cutL)}px ${h - pad}px)`;
}

function FigureArt({ f, pageW }: { f: Figure; pageW: number }) {
  const gear = equippedGear(undefined, 0),
    size = Math.round(f.size * pageW),
    [ax, ay] = f.anchor ?? [0.5, 1],
    style: CSSProperties = {
      left: `${f.at[0]}%`,
      top: `${f.at[1]}%`,
      transform: `translate(${-ax * 100}%, ${-ay * 100}%)${f.flip ? ' scaleX(-1)' : ''}`,
      filter: `grayscale(${f.gray ?? 0}) brightness(${1 - (f.dim ?? 0)})`,
      opacity: f.opacity,
    };
  return (
    <div className="absolute" style={style}>
      {f.who === 'hollow' ? <Hollow size={size} bounce={!!f.breathe} /> : <Hero gear={gear} size={size} bounce={!!f.breathe} variant={f.variant} />}
    </div>
  );
}

function fill(text: string, words: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => words[k] ?? '');
}

/** A spiky outline for the Hollow's voice: an ellipse with points. */
const SPIKES = `polygon(${Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2,
    r = i % 2 ? 0.86 : 1;
  return `${(50 + 50 * r * Math.cos(a)).toFixed(1)}% ${(50 + 50 * r * Math.sin(a)).toFixed(1)}%`;
}).join(', ')})`;

function WordsArt({ w, scale, words }: { w: Words; scale: number; words: Record<string, string> }) {
  const base: CSSProperties = { left: `${w.at[0]}%`, top: `${w.at[1]}%`, transform: 'translate(-50%, -50%)' };
  if (w.kind === 'sfx')
    return (
      <p
        aria-hidden
        className="absolute whitespace-nowrap font-pixel text-white"
        style={{ ...base, transform: `translate(-50%, -50%) rotate(${w.rotate ?? 0}deg)`, fontSize: 11 * scale * (w.size ?? 1), textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
      >
        {w.text}
      </p>
    );
  const text = fill(w.text, words);
  if (w.kind === 'caption')
    return w.plain ? (
      <p className="absolute text-center font-semibold tracking-wide text-slate-100" style={{ ...base, width: `${w.w}%`, fontSize: 14 * scale }}>
        {text}
      </p>
    ) : (
      <p className="absolute border-2 border-black bg-[#fbf7ee] px-[0.5em] py-[0.35em] font-medium leading-snug text-black" style={{ ...base, width: `${w.w}%`, fontSize: 12 * scale, boxShadow: '2px 2px 0 rgba(0,0,0,0.35)' }}>
        {text}
      </p>
    );
  if (w.look === 'voice')
    return (
      <div className="absolute" style={{ ...base, width: `${w.w}%` }}>
        {/* Ink spikes, then the dark inside. */}
        <div className="absolute -inset-[3px] bg-[#e5484d]" style={{ clipPath: SPIKES }} />
        <div className="relative bg-black px-[18%] py-[16%] text-center font-bold leading-tight text-white" style={{ clipPath: SPIKES, fontSize: 15 * scale }}>
          {text}
        </div>
      </div>
    );
  const faint = w.look === 'faint';
  return (
    <div className="absolute" style={{ ...base, width: `${w.w}%`, opacity: faint ? 0.6 : 1 }}>
      <p
        className={`relative rounded-[50%] border-2 bg-white px-[0.9em] py-[0.7em] text-center font-semibold leading-tight text-black ${faint ? 'border-dashed border-black/70 italic' : 'border-black'}`}
        style={{ fontSize: 12 * scale }}
      >
        {text}
      </p>
      {w.tail && <Tail side={w.tail} faint={faint} />}
    </div>
  );
}

/** A bubble's tail: a little ink wedge with a white one inside. */
function Tail({ side, faint }: { side: 'left' | 'right' | 'down'; faint: boolean }) {
  const pos: CSSProperties = side === 'down' ? { left: '46%', bottom: -11 } : side === 'left' ? { left: '22%', bottom: -11 } : { right: '22%', bottom: -11 };
  const skew = side === 'left' ? 'skewX(25deg)' : side === 'right' ? 'skewX(-25deg)' : 'none';
  return (
    <div className="absolute h-[13px] w-[14px]" style={{ ...pos, transform: skew }}>
      <div className="absolute inset-0 bg-black" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)', opacity: faint ? 0.7 : 1 }} />
      <div className="absolute inset-x-[3px] top-[-2px] h-[10px] bg-white" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
    </div>
  );
}

function PanelArt({ p, box, pageW, scale, words }: { p: Panel; box: CSSProperties; pageW: number; scale: number; words: Record<string, string> }) {
  const layers = [p.lines ? speedLines(p.lines) : null, p.dots ? DOTS : null, p.place ? null : TONES[p.tone]].filter(Boolean),
    sizes = [p.lines ? 'auto' : null, p.dots ? `${Math.max(4, Math.round(5 * scale))}px ${Math.max(4, Math.round(5 * scale))}px` : null, p.place ? null : 'auto'].filter(Boolean);
  return (
    <div className="absolute overflow-hidden" style={{ ...box, backgroundImage: layers.join(', '), backgroundSize: sizes.join(', ') }}>
      {p.place && <PlaceBackdrop id={p.place} className="absolute inset-0" />}
      <div role="img" aria-label={p.alt}>
        {p.figures?.map((f, i) => <FigureArt key={i} f={f} pageW={pageW} />)}
      </div>
      {p.words?.map((w, i) => <WordsArt key={i} w={w} scale={scale} words={words} />)}
    </div>
  );
}

function RowArt({ row, pageW, scale, words }: { row: Row; pageW: number; scale: number; words: Record<string, string> }) {
  const h = Math.round(row.h * pageW);
  return (
    <div className="relative" style={{ height: h }}>
      {edges(row).map((e, i) => {
        const left = Math.min(e.lt, e.lb) * pageW,
          right = Math.max(e.rt, e.rb) * pageW;
        // The panel's art sits in its bounding box; the clip path cuts the slanted edges.
        const box: CSSProperties = { left, width: right - left, top: 0, height: h };
        return (
          <div key={i} className="absolute inset-0">
            <div className="absolute inset-0 bg-black" style={{ clipPath: outline(e, pageW, h, 0) }} />
            <div className="absolute inset-0" style={{ clipPath: outline(e, pageW, h, INK) }}>
              <PanelArt p={row.panels[i]} box={box} pageW={pageW} scale={scale} words={words} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** One page, as wide as its box. `words` fills {voice} and the like in the text. */
export function MangaPage({ page, words = {}, footer }: { page: Page; words?: Record<string, string>; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null),
    [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // The page's inner width (inside the paper margin); text is sized for a 360 px page.
  const pad = Math.round(w * 0.035),
    inner = w - 2 * pad,
    scale = inner / 360;
  return (
    <div ref={ref} className="w-full bg-[#f4efe4] shadow-[0_6px_30px_rgba(0,0,0,0.5)]" style={{ padding: pad }}>
      {inner > 0 && (
        <div className="flex flex-col" style={{ gap: Math.round(GUTTER * inner) }}>
          {page.rows.map((row, i) => (
            <RowArt key={i} row={row} pageW={inner} scale={scale} words={words} />
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between font-pixel text-[9px] text-black/60">
        <span>{page.part}</span>
        <span>{page.page}</span>
      </div>
      {footer}
    </div>
  );
}

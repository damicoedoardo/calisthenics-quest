'use client';

import type { ReactNode } from 'react';
import { Hero } from './Hero';
import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import type { FaceMark, HairStyle, Look } from '@/sprites/engine/figure';
import { EYE_COLORS, HAIR, SKIN, type EyeColor, type HairColor, type SkinTone } from '@/sprites/palette';

/* Change how your hero looks: body, hair, hair color, eyes, skin and a mark on the face. Clothes
   come from the items you wear. Shown once after the opening and any time from the Hero tab. */

const BODIES: { id: Look['sex']; label: string }[] = [
  { id: 'm', label: 'Boy' },
  { id: 'f', label: 'Girl' },
];
export const STYLES: { id: HairStyle; label: string }[] = [
  { id: 'spiky', label: 'Spiky' },
  { id: 'swept', label: 'Swept' },
  { id: 'short', label: 'Headband' },
  { id: 'buzz', label: 'Buzz' },
  { id: 'wild', label: 'Wild' },
  { id: 'messy', label: 'Messy' },
  { id: 'mohawk', label: 'Mohawk' },
  { id: 'slick', label: 'Slick' },
  { id: 'sidepart', label: 'Side sweep' },
  { id: 'curly', label: 'Curly' },
  { id: 'afro', label: 'Afro' },
  { id: 'bob', label: 'Bob' },
  { id: 'hime', label: 'Hime' },
  { id: 'long', label: 'Long' },
  { id: 'pony', label: 'Ponytail' },
  { id: 'twin', label: 'Twin tails' },
  { id: 'braids', label: 'Braids' },
  { id: 'bun', label: 'Bun' },
  { id: 'topknot', label: 'Top knot' },
];
const MARKS: { id: FaceMark; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'freckles', label: 'Freckles' },
  { id: 'blush', label: 'Blush' },
  { id: 'scar', label: 'Scar' },
  { id: 'plaster', label: 'Plaster' },
  { id: 'mole', label: 'Mole' },
];

const chip = (on: boolean) =>
  `rounded-lg px-3 py-2 text-sm transition active:scale-95 ${on ? 'bg-gold-400 font-semibold text-ink-950' : 'bg-ink-800 text-slate-300'}`;
const swatch = (on: boolean) => `h-9 w-9 rounded-full transition active:scale-90 ${on ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-ink-900' : ''}`;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="land:col-start-2">
      <p className="mb-2 font-pixel text-[9px] text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

interface EditorProps {
  look: Look;
  onChange: (look: Look) => void;
  /** Gear and class for the preview, so you see yourself as you are now. */
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
}

/** Body, hair, hair color, eyes, skin and face, with a live preview of the hero. */
export function LookEditor({ look, onChange, gear, classId }: EditorProps) {
  const set = (patch: Partial<Look>) => onChange({ ...look, ...patch });
  return (
    // Sideways: the preview on the left, the choices beside it.
    <div className="space-y-4 land:grid land:grid-cols-[auto_1fr] land:items-start land:gap-x-5 land:gap-y-3 land:space-y-0">
      {/* Upright, the preview stays in view while the choices scroll under it. */}
      <div className="sticky top-0 z-10 flex justify-center rounded-2xl bg-gradient-to-b from-ink-700 to-ink-800 py-3 land:static land:row-span-6 land:px-6">
        <Hero gear={gear} classId={classId} look={look} size={168} />
      </div>
      <Row label="BODY">
        {BODIES.map((b) => (
          <button key={b.id} onClick={() => set({ sex: b.id })} className={chip(look.sex === b.id)}>
            {b.label}
          </button>
        ))}
      </Row>
      <Row label="HAIR">
        {STYLES.map((s) => (
          <button key={s.id} onClick={() => set({ style: s.id })} className={chip(look.style === s.id)}>
            {s.label}
          </button>
        ))}
      </Row>
      <Row label="HAIR COLOR">
        {(Object.keys(HAIR) as HairColor[]).map((c) => (
          <button key={c} aria-label={c} onClick={() => set({ hair: c })} className={swatch(look.hair === c)} style={{ background: HAIR[c][1] }} />
        ))}
      </Row>
      <Row label="EYES">
        {(Object.keys(EYE_COLORS) as EyeColor[]).map((c) => (
          <button key={c} aria-label={c} onClick={() => set({ eyes: c })} className={swatch((look.eyes ?? 'brown') === c)} style={{ background: EYE_COLORS[c][1] }} />
        ))}
      </Row>
      <Row label="SKIN">
        {(Object.keys(SKIN) as SkinTone[]).map((s) => (
          <button key={s} aria-label={s} onClick={() => set({ skin: s })} className={swatch(look.skin === s)} style={{ background: SKIN[s][1] }} />
        ))}
      </Row>
      <Row label="FACE">
        {MARKS.map((m) => (
          <button key={m.id} onClick={() => set({ mark: m.id })} className={chip((look.mark ?? 'none') === m.id)}>
            {m.label}
          </button>
        ))}
      </Row>
    </div>
  );
}

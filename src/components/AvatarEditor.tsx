'use client';

import type { ReactNode } from 'react';
import { Shuffle } from 'lucide-react';
import { Sprite } from './Sprite';
import { COLORS, PRESETS, SLOTS, type Avatar, type PresetId, type Slot } from '@/sprites/avatar/avatar';
import type { Part } from '@/sprites/avatar/types';

/* The character creator: a live preview, presets, and one row of choices per slot and color.
   Everything here is read from SLOTS, COLORS and PRESETS, so a new part or color shows up on its
   own. */

/** Which color row sits under which slot. */
const COLOR_OF: Partial<Record<Slot, keyof typeof COLORS>> = { hair: 'hairColor', eyes: 'eyeColor', top: 'topColor', bottom: 'bottomColor', shoes: 'shoesColor', extra: 'extraColor' };

const chip = (on: boolean) =>
  `rounded-lg px-2.5 py-1.5 text-xs transition active:scale-95 ${on ? 'bg-gold-400 font-semibold text-ink-950' : 'bg-ink-800 text-slate-300'}`;
const swatch = (on: boolean) => `h-7 w-7 rounded-full transition active:scale-90 ${on ? 'ring-2 ring-gold-400 ring-offset-2 ring-offset-ink-900' : ''}`;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-pixel text-[9px] text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** The middle tone of a palette entry: a cloth hex, or the base of a ramp. */
const tone = (c: string | readonly string[]) => (typeof c === 'string' ? c : c[1]);

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

export function randomAvatar(): Avatar {
  const out = {} as Record<string, string>;
  (Object.keys(SLOTS) as Slot[]).forEach((s) => (out[s] = pick(Object.keys(SLOTS[s].parts))));
  (Object.keys(COLORS) as (keyof typeof COLORS)[]).forEach((c) => (out[c] = pick(Object.keys(COLORS[c]))));
  return out as unknown as Avatar;
}

export function AvatarEditor({ avatar, onChange, size = 192 }: { avatar: Avatar; onChange: (a: Avatar) => void; size?: number }) {
  const set = (patch: Partial<Avatar>) => onChange({ ...avatar, ...patch });
  const colorRow = (key: keyof typeof COLORS, label: string) => (
    <Row key={key} label={label}>
      {Object.entries(COLORS[key]).map(([id, c]) => (
        <button key={id} aria-label={id} title={id} onClick={() => set({ [key]: id } as Partial<Avatar>)} className={swatch(avatar[key] === id)} style={{ background: tone(c) }} />
      ))}
    </Row>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-center rounded-2xl bg-gradient-to-b from-ink-700 to-ink-800 py-3" style={{ minHeight: size + 24 }}>
        <Sprite id="avatar" opts={{ avatar }} size={size} />
      </div>
      <Row label="PRESETS">
        {(Object.keys(PRESETS) as PresetId[]).map((id) => (
          <button key={id} onClick={() => onChange(PRESETS[id])} className={chip(false)}>
            {id[0].toUpperCase() + id.slice(1)}
          </button>
        ))}
        <button onClick={() => onChange(randomAvatar())} className={`${chip(false)} flex items-center gap-1`}>
          <Shuffle size={12} /> Random
        </button>
      </Row>
      {colorRow('skin', 'SKIN')}
      {(Object.keys(SLOTS) as Slot[]).map((slot) => (
        <div key={slot} className="space-y-2">
          <Row label={SLOTS[slot].label.toUpperCase()}>
            {Object.entries(SLOTS[slot].parts as Record<string, Part>).map(([id, part]) => (
              <button key={id} onClick={() => set({ [slot]: id } as Partial<Avatar>)} className={chip(avatar[slot] === id)}>
                {part.label}
              </button>
            ))}
          </Row>
          {COLOR_OF[slot] && colorRow(COLOR_OF[slot]!, `${SLOTS[slot].label.toUpperCase()} COLOR`)}
        </div>
      ))}
    </div>
  );
}

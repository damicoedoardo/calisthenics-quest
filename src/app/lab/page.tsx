'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pause, Play, Swords } from 'lucide-react';
import { Sprite, useSheet } from '@/components/Sprite';
import { equippedGear, type ClassId, type Tier } from '@/lib/gear';
import { CLIPS, type SpriteAction } from '@/sprites/clips';
import { DEFAULT_LOOK, type HeroVariant } from '@/sprites/characters/hero';
import { HAIRSTYLES, type Look } from '@/sprites/engine/figure';
import { HAIR, SKIN, type HairColor, type SkinTone } from '@/sprites/palette';
import { SPRITES, clipFor, labelFor, type SpriteId } from '@/sprites/registry';

/* Sprite Lab: every sprite and animation in one place, to check art changes on a phone.
   Not linked from the app; open /lab. */

const CLASSES: { id: ClassId | undefined; label: string }[] = [
  { id: undefined, label: 'Adventurer' },
  { id: 'warrior', label: 'Warrior' },
  { id: 'archer', label: 'Archer' },
  { id: 'monk', label: 'Monk' },
  { id: 'mage', label: 'Mage' },
];
const VARIANTS: HeroVariant[] = ['normal', 'echo', 'best', 'hollow'];
const SIZES = [64, 128, 192, 256];

function Chips<T>({ label, options, value, onChange, name = String }: { label: string; options: T[]; value: T; onChange: (v: T) => void; name?: (v: T) => string }) {
  return (
    <div>
      <p className="mb-1.5 font-pixel text-[9px] text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={name(o)}
            onClick={() => onChange(o)}
            className={`rounded-lg px-2.5 py-1.5 text-xs ${o === value ? 'bg-gold-400 font-semibold text-ink-950' : 'bg-ink-800 text-slate-300'}`}
          >
            {name(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-ink-900 p-4 pixel-border">
      <h2 className="mb-3 font-pixel text-[10px] text-gold-300">{title}</h2>
      {children}
    </section>
  );
}

export default function Lab() {
  const [classId, setClassId] = useState<ClassId | undefined>(undefined);
  const [tier, setTier] = useState<Tier>(0);
  const [variant, setVariant] = useState<HeroVariant>('normal');
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [size, setSize] = useState(192);
  const [playing, setPlaying] = useState(true);
  const [attacks, setAttacks] = useState(0);
  const [acting, setActing] = useState(false);
  const [light, setLight] = useState(false);

  const gear = equippedGear(classId, { push: tier, pull: tier, core: tier });
  const opts = { gear, classId, variant, look };
  const action: SpriteAction = acting ? 'attack' : 'idle';
  const idleClip = clipFor('hero', 'idle', opts) ?? 'idle';
  const attackClip = clipFor('hero', 'attack', opts) ?? 'idle';
  const idleSheet = useSheet('hero', 'idle', opts);
  const attackSheet = useSheet('hero', 'attack', opts);
  const stage = light ? 'bg-slate-300' : 'bg-ink-950';

  return (
    <main className="safe-top mx-auto min-h-dvh max-w-md space-y-4 px-4 pb-16">
      <header className="flex items-center gap-3">
        <Link href="/" aria-label="Back to the app" className="rounded-lg bg-ink-800 p-2 text-slate-300">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-pixel text-sm text-gold-300">Sprite Lab</h1>
          <p className="text-xs text-slate-500">Every sprite and animation. Art lives in src/sprites.</p>
        </div>
        <Link href="/lab/story" className="ml-auto rounded-lg bg-ink-800 px-3 py-2 text-xs text-gold-300">
          Story Lab
        </Link>
      </header>

      <Panel title="Your hero">
        <div className={`flex items-end justify-center rounded-xl py-4 ${stage}`} style={{ minHeight: 280 }}>
          <Sprite
            key={acting ? `a${attacks}` : 'idle'}
            id="hero"
            opts={opts}
            action={action}
            size={size}
            playing={acting || playing}
            onEnd={() => setActing(false)}
            flip={variant === 'hollow'}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setPlaying((p) => !p)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ink-800 py-2.5 text-sm text-slate-200">
            {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause idle' : 'Play idle'}
          </button>
          <button
            onClick={() => {
              setAttacks((n) => n + 1);
              setActing(true);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold-400 py-2.5 text-sm font-semibold text-ink-950"
          >
            <Swords size={14} /> Attack
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Chips label="CLASS" options={CLASSES} value={CLASSES.find((c) => c.id === classId) ?? CLASSES[0]} onChange={(c) => setClassId(c.id)} name={(c) => c.label} />
          <div>
            <p className="mb-1.5 font-pixel text-[9px] text-slate-500">GEAR TIER {tier}</p>
            <input type="range" min={0} max={6} value={tier} onChange={(e) => setTier(Number(e.target.value) as Tier)} className="w-full accent-amber-400" />
          </div>
          <Chips label="VARIANT" options={VARIANTS} value={variant} onChange={setVariant} />
          <Chips label="HEAD" options={['classic', 'manga'] as NonNullable<Look['head']>[]} value={look.head ?? 'classic'} onChange={(head) => setLook({ ...look, head })} />
          <Chips label="BODY" options={['m', 'f'] as Look['sex'][]} value={look.sex} onChange={(sex) => setLook({ ...look, sex })} name={(s) => (s === 'm' ? 'Male' : 'Female')} />
          <Chips label="HAIR" options={Object.keys(HAIRSTYLES) as Look['style'][]} value={look.style} onChange={(style) => setLook({ ...look, style })} />
          <Chips label="HAIR COLOR" options={Object.keys(HAIR) as HairColor[]} value={look.hair} onChange={(hair) => setLook({ ...look, hair })} />
          <Chips label="SKIN" options={Object.keys(SKIN) as SkinTone[]} value={look.skin} onChange={(skin) => setLook({ ...look, skin })} />
          <Chips label="SIZE" options={SIZES} value={size} onChange={setSize} name={(s) => `${s}px`} />
          <Chips label="STAGE" options={[false, true]} value={light} onChange={setLight} name={(l) => (l ? 'Light' : 'Dark')} />
        </div>
      </Panel>

      <Panel title="Frames">
        {[
          { name: 'Idle', clip: idleClip, sheet: idleSheet },
          { name: 'Attack', clip: attackClip, sheet: attackSheet },
        ].map(({ name, clip, sheet }) => (
          <div key={name} className="mb-4 last:mb-0">
            <p className="mb-1.5 text-xs text-slate-400">
              {name}: <span className="font-mono text-slate-200">{clip}</span>, {CLIPS[clip].frames.length} frames × {CLIPS[clip].ms} ms
              {CLIPS[clip].loop ? ', loops' : ', once'}
            </p>
            {sheet && (
              // The raw sheet, all frames side by side.
              <img src={sheet.src} alt={`${name} frames`} className={`w-full rounded-lg ${stage}`} style={{ imageRendering: 'pixelated' }} />
            )}
          </div>
        ))}
        <p className="text-xs text-slate-500">Change frames and timing in src/sprites/clips.ts.</p>
      </Panel>

      <Panel title="Everyone">
        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(SPRITES) as SpriteId[]).map((id) => (
            <div key={id} className="flex flex-col items-center gap-1.5 rounded-xl bg-ink-950 p-2">
              <div className="flex h-24 items-end">
                <Sprite id={id} size={96} />
              </div>
              <p className="text-center text-[10px] leading-tight text-slate-400">{labelFor(id).split(' with ')[0]}</p>
              <p className="font-mono text-[9px] text-slate-500">{id}</p>
            </div>
          ))}
        </div>
      </Panel>
    </main>
  );
}

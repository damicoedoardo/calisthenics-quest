'use client';

import { getUpgrade, UPGRADES, type SkillKind, type UpgradeId } from '@/lib/fog';
import type { FreePick } from '@/game/dungeon/engine';
import { Sprite } from './Sprite';

/* The level-up pick in a Fog run: three skill cards, colored by what the skill is about, with the
   levels it has as pips, and the skills you already took in a row under them. */

/** Each kind's color and word: the card's frame, its top band and its pips. */
const KINDS: Record<SkillKind, { label: string; color: string; tint: string }> = {
  attack: { label: 'Attack', color: '#f87171', tint: 'rgba(248,113,113,.14)' },
  magic: { label: 'Magic', color: '#a78bfa', tint: 'rgba(167,139,250,.16)' },
  guard: { label: 'Guard', color: '#34d399', tint: 'rgba(52,211,153,.14)' },
  craft: { label: 'Craft', color: '#7dd3fc', tint: 'rgba(125,211,252,.14)' },
};

const TITLE: Record<FreePick | 'level', string> = { level: 'Level up!', fresh: 'Warmed up!', rested: 'Rested!', past: 'Kept at it!' };

export function SkillPick({
  choices,
  levels,
  free,
  flameName,
  bossName,
  keys,
  onPick,
}: {
  choices: UpgradeId[];
  levels: Partial<Record<UpgradeId, number>>;
  free: FreePick | null;
  flameName: string | undefined;
  bossName: string;
  keys: boolean;
  onPick: (id: UpgradeId) => void;
}) {
  const name = (id: UpgradeId) => getUpgrade(id).name.replace('{flame}', flameName || 'Your flame');
  const why =
    free === 'fresh'
      ? 'You trained in the last two days: a free skill.'
      : free === 'rested'
        ? `You rested, and ${flameName || 'your flame'} burns brighter: a free skill.`
        : free === 'past'
          ? `You kept training after ${bossName} ran out of hearts: a free skill.`
          : null;
  const have = UPGRADES.filter((u) => (levels[u.id] ?? 0) > 0);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto bg-ink-950/90 px-4 py-3">
      <p className="font-pixel text-sm text-gold-300 drop-shadow-[0_2px_0_#0b0d14]">{TITLE[free ?? 'level']}</p>
      {why && <p className="mt-2 text-center text-xs text-slate-400">{why}</p>}
      <div className="mt-4 flex w-full max-w-3xl items-stretch justify-center gap-3 land:mt-3">
        {choices.map((id, i) => {
          const u = getUpgrade(id),
            k = KINDS[u.kind],
            now = levels[id] ?? 0;
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              style={{ background: `linear-gradient(${k.tint}, ${k.tint}), #181c2b`, boxShadow: `inset 0 0 0 2px ${k.color}, inset 0 0 0 4px #0b0d14, inset 0 -6px 0 4px rgba(11,13,20,.5)`, animationDelay: `${i * 70}ms` }}
              className="pixel-notch relative flex min-w-0 max-w-[13rem] flex-1 flex-col items-center px-2.5 pb-3 pt-0 text-center transition-transform active:scale-[.97] motion-safe:animate-pop motion-safe:[animation-fill-mode:both] desk:hover:-translate-y-1"
            >
              <span className="w-full py-1.5 font-pixel text-[7px] uppercase tracking-wider" style={{ color: k.color }}>
                {k.label}
              </span>
              <span className="pixel-notch grid h-14 w-14 place-items-center bg-ink-950 land:h-12 land:w-12" style={{ boxShadow: `inset 0 0 0 2px ${k.tint}` }}>
                <Sprite id="skillIcon" opts={{ name: id }} size={36} label="" />
              </span>
              <span className="mt-2 font-pixel text-[9px] leading-snug text-slate-100">{name(id)}</span>
              <span className="mt-1.5 flex gap-1" aria-label={now ? `level ${now + 1} of ${u.max}` : 'new'}>
                {Array.from({ length: u.max }, (_, n) => (
                  <span
                    key={n}
                    className={`h-1.5 w-2.5 ${n === now ? 'motion-safe:animate-pulse' : ''}`}
                    style={{ background: n < now ? k.color : n === now ? '#fde68a' : '#30375a' }}
                  />
                ))}
              </span>
              <span className="mt-2 text-[11px] leading-snug text-slate-300">{u.text(now + 1)}</span>
              {now === 0 && <span className="absolute right-2 top-1.5 font-pixel text-[6px] text-gold-300">NEW</span>}
              {keys && <Key k={String(i + 1)} />}
            </button>
          );
        })}
      </div>
      {have.length > 0 && (
        <div className="mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-1.5 land:mt-3">
          {have.map((u) => (
            <span key={u.id} title={name(u.id)} className="pixel-notch flex h-7 items-center gap-1 bg-ink-800 pl-1 pr-1.5" style={{ boxShadow: `inset 0 0 0 1px ${KINDS[u.kind].color}` }}>
              <Sprite id="skillIcon" opts={{ name: u.id }} size={18} label={name(u.id)} />
              <span className="font-pixel text-[7px] text-slate-200">{levels[u.id]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Key({ k }: { k: string }) {
  return (
    <kbd aria-hidden className="pointer-events-none absolute bottom-1.5 right-1.5 min-w-[16px] rounded-[3px] bg-ink-950 px-1 py-[3px] text-center font-pixel text-[7px] not-italic leading-none text-slate-200 ring-1 ring-slate-500/70 shadow-[0_2px_0_#0b0d14]">
      {k}
    </kbd>
  );
}

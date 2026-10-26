import type { ClassId, Gear, GearSlot } from '@/lib/gear';
import { Sprite, shade } from './Sprite';

// 20x19 pixel sprite. Each char maps to a color; '.' is empty.
const BODY = [
  '........HHHH........',
  '.......HHHHHH.......',
  '.......HSSSSH.......',
  '.......SESSES.......',
  '.......SSSSSS.......',
  '........SSSS........',
  '.....AAAAAAAAAA.....',
  '....AAAAAAAAAAAA....',
  '....SAAAAAAAAAAAS...',
  '....SAAAaaaaAAAA.S..',
  '....S.AAAAAAAA...S..',
  '....S.AAAAAAAA....S.',
  '....S.aaaaaaaa......',
  '......PPPPPPPP......',
  '......PPP..PPP......',
  '......PPP..PPP......',
  '......PPP..PPP......',
  '......PPP..PPP......',
  '.....BBBB..BBBB.....',
];

const CAPE = [
  '',
  '',
  '',
  '',
  '',
  '',
  '.....CCCCCCCCCC.....',
  '....CC........CC....',
  '...CC..........C....',
  '...C...........C....',
  '...C............C...',
  '..CC............C...',
  '..C.............CC..',
  '..C..............C..',
  '..CC.............C..',
  '...C............CC..',
];

const WEAPONS: Record<string, string[]> = {
  sword: [
    '....................',
    '..................W.',
    '..................W.',
    '..................W.',
    '..................W.',
    '..................W.',
    '..................W.',
    '..................W.',
    '..................W.',
    '..................W.',
    '.................hhh',
    '..................S.',
    '..................h.',
  ],
  bow: [
    '',
    '',
    '',
    '',
    '',
    '..................W.',
    '.................sWW',
    '.................s.W',
    '...................W',
    '...................W',
    '...................W',
    '..................SW',
    '...................W',
    '...................W',
    '.................s.W',
    '.................sWW',
    '..................W.',
  ],
  staff: [
    '..................O.',
    '.................OOO',
    '..................O.',
    '..................h.',
    '..................h.',
    '..................h.',
    '..................h.',
    '..................h.',
    '..................h.',
    '..................h.',
    '..................h.',
    '..................S.',
    '..................h.',
    '..................h.',
    '..................h.',
    '..................h.',
    '..................h.',
  ],
  wand: [
    '',
    '',
    '',
    '',
    '',
    '.................O.O',
    '..................O.',
    '.................O.O',
    '..................h.',
    '..................h.',
    '..................h.',
    '..................S.',
  ],
};

const SHIELD = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '.DDDDD',
  '.DDDDD',
  '.DDdDD',
  '.DDDDD',
  '.DDDDD',
  '..DDD.',
  '...D..',
];

const WEAPON_OF: Record<ClassId, string> = { warrior: 'sword', archer: 'bow', monk: 'staff', mage: 'wand' };

interface HeroProps {
  gear: Record<GearSlot, Gear>;
  classId?: ClassId;
  size?: number;
  bounce?: boolean;
  /** "echo" paints the ghost of who you were; "best" adds the Best Self's cape. */
  variant?: 'normal' | 'echo' | 'best';
}

export function Hero({ gear, classId, size = 160, bounce = true, variant = 'normal' }: HeroProps) {
  const echo = variant === 'echo';
  const armor = echo ? '#fde68a' : gear.armor.tier === 0 ? '#475569' : gear.armor.color;
  const weapon = WEAPONS[WEAPON_OF[classId ?? 'warrior']];
  const hasWeapon = echo || gear.weapon.tier > 0;
  const hasShield = !echo && gear.shield.tier > 0;
  const weaponColor = echo ? '#fef3c7' : gear.weapon.color;
  const skin = echo ? '#fef3c7' : '#e7c9a9';

  return (
    <svg
      viewBox="-1 -1 22 21"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={bounce ? 'animate-float' : undefined}
      style={echo ? { opacity: 0.85, filter: 'drop-shadow(0 0 1.5px #fbbf24)' } : undefined}
      role="img"
      aria-label={echo ? 'The Echo, the ghost of who you were' : `Hero with ${gear.weapon.name}, ${gear.armor.name} and ${gear.shield.name}`}
    >
      <defs>
        {(['weapon', 'armor', 'shield'] as const).map((slot) =>
          gear[slot].glow && !echo ? (
            <filter key={slot} id={`glow-${slot}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.6" floodColor={gear[slot].glow} floodOpacity="0.9" />
            </filter>
          ) : null,
        )}
      </defs>
      <ellipse cx="10" cy="19.3" rx="6" ry="0.7" fill="#000" opacity="0.35" />
      {variant === 'best' && <Sprite rows={CAPE} palette={{ C: '#b91c1c' }} />}
      <g filter={gear.armor.glow && !echo ? 'url(#glow-armor)' : undefined}>
        <Sprite
          rows={BODY}
          palette={{
            H: echo ? '#fbbf24' : '#3b2a1a',
            S: skin,
            E: '#111',
            A: armor,
            a: shade(armor, -0.35),
            P: echo ? '#fcd34d' : '#1f2937',
            B: echo ? '#f59e0b' : '#0f172a',
          }}
        />
      </g>
      {hasWeapon && (
        <g filter={gear.weapon.glow && !echo ? 'url(#glow-weapon)' : undefined}>
          <Sprite rows={weapon} palette={{ W: weaponColor, O: weaponColor, h: '#78350f', s: '#e5e7eb', S: skin }} />
        </g>
      )}
      {hasShield && (
        <g filter={gear.shield.glow ? 'url(#glow-shield)' : undefined}>
          <Sprite rows={SHIELD} palette={{ D: gear.shield.color, d: shade(gear.shield.color, -0.45) }} />
        </g>
      )}
    </svg>
  );
}

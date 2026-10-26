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
  /** "echo" paints the ghost of who you were; "best" adds the Best Self's cape; "hollow" is your shadow. */
  variant?: 'normal' | 'echo' | 'best' | 'hollow';
}

const HOLLOW = { H: '#0b0d14', S: '#1e1b2e', E: '#ef4444', A: '#171427', a: '#0b0a14', P: '#0f0d1a', B: '#05050a', W: '#2a2540' };

export function Hero({ gear, classId, size = 160, bounce = true, variant = 'normal' }: HeroProps) {
  const echo = variant === 'echo';
  const hollow = variant === 'hollow';
  const armor = hollow ? HOLLOW.A : echo ? '#fde68a' : gear.armor.tier === 0 ? '#475569' : gear.armor.color;
  const weapon = WEAPONS[WEAPON_OF[classId ?? 'warrior']];
  const hasWeapon = echo || hollow || gear.weapon.tier > 0;
  const hasShield = !echo && !hollow && gear.shield.tier > 0;
  const weaponColor = hollow ? HOLLOW.W : echo ? '#fef3c7' : gear.weapon.color;
  const skin = hollow ? HOLLOW.S : echo ? '#fef3c7' : '#e7c9a9';
  const plain = echo || hollow;

  return (
    <svg
      viewBox="-1 -1 22 21"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={bounce ? 'animate-float' : undefined}
      style={
        echo
          ? { opacity: 0.85, filter: 'drop-shadow(0 0 1.5px #fbbf24)' }
          : hollow
            ? { filter: 'drop-shadow(0 0 2px #7c3aed)' }
            : undefined
      }
      role="img"
      aria-label={
        echo ? 'The Echo, the ghost of who you were' : hollow ? 'The Hollow, your shadow' : `Hero with ${gear.weapon.name}, ${gear.armor.name} and ${gear.shield.name}`
      }
    >
      <defs>
        {(['weapon', 'armor', 'shield'] as const).map((slot) =>
          gear[slot].glow && !plain ? (
            <filter key={slot} id={`glow-${slot}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.6" floodColor={gear[slot].glow} floodOpacity="0.9" />
            </filter>
          ) : null,
        )}
      </defs>
      {/* The Hollow faces you, so it is drawn mirrored. */}
      <g transform={hollow ? 'translate(20 0) scale(-1 1)' : undefined}>
        <ellipse cx="10" cy="19.3" rx="6" ry="0.7" fill="#000" opacity="0.35" />
        {variant === 'best' && <Sprite rows={CAPE} palette={{ C: '#b91c1c' }} />}
        <g filter={gear.armor.glow && !plain ? 'url(#glow-armor)' : undefined}>
          <Sprite
            rows={BODY}
            palette={{
              H: hollow ? HOLLOW.H : echo ? '#fbbf24' : '#3b2a1a',
              S: skin,
              E: hollow ? HOLLOW.E : '#111',
              A: armor,
              a: hollow ? HOLLOW.a : shade(armor, -0.35),
              P: hollow ? HOLLOW.P : echo ? '#fcd34d' : '#1f2937',
              B: hollow ? HOLLOW.B : echo ? '#f59e0b' : '#0f172a',
            }}
          />
        </g>
        {hasWeapon && (
          <g filter={gear.weapon.glow && !plain ? 'url(#glow-weapon)' : undefined}>
            <Sprite rows={weapon} palette={{ W: weaponColor, O: weaponColor, h: hollow ? HOLLOW.B : '#78350f', s: hollow ? HOLLOW.W : '#e5e7eb', S: skin }} />
          </g>
        )}
        {hasShield && (
          <g filter={gear.shield.glow ? 'url(#glow-shield)' : undefined}>
            <Sprite rows={SHIELD} palette={{ D: gear.shield.color, d: shade(gear.shield.color, -0.45) }} />
          </g>
        )}
      </g>
    </svg>
  );
}

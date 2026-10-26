import type { Gear, GearSlot } from '@/lib/skills';

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

const SWORD = [
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
];

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

function shade(hex: string, amount: number): string {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * (1 + amount))));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function Sprite({ rows, palette }: { rows: string[]; palette: Record<string, string> }) {
  return (
    <>
      {rows.flatMap((row, y) =>
        row.split('').map((c, x) =>
          c === '.' || !palette[c] ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={palette[c]} />,
        ),
      )}
    </>
  );
}

export function Hero({ gear, size = 160, bounce = true }: { gear: Record<GearSlot, Gear>; size?: number; bounce?: boolean }) {
  const armor = gear.armor.color;
  const hasSword = gear.weapon.name !== 'Bare fists';
  const hasShield = gear.shield.color !== 'transparent';

  return (
    <svg
      viewBox="-1 -1 22 21"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={bounce ? 'animate-float' : undefined}
      role="img"
      aria-label={`Hero with ${gear.weapon.name}, ${gear.armor.name} and ${gear.shield.name}`}
    >
      <defs>
        {(['weapon', 'armor', 'shield'] as const).map((slot) =>
          gear[slot].glow ? (
            <filter key={slot} id={`glow-${slot}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="0.6" floodColor={gear[slot].glow} floodOpacity="0.9" />
            </filter>
          ) : null,
        )}
      </defs>
      <ellipse cx="10" cy="19.3" rx="6" ry="0.7" fill="#000" opacity="0.35" />
      <g filter={gear.armor.glow ? 'url(#glow-armor)' : undefined}>
        <Sprite
          rows={BODY}
          palette={{ H: '#3b2a1a', S: '#e7c9a9', E: '#111', A: armor, a: shade(armor, -0.35), P: '#1f2937', B: '#0f172a' }}
        />
      </g>
      {hasSword && (
        <g filter={gear.weapon.glow ? 'url(#glow-weapon)' : undefined}>
          <Sprite rows={SWORD} palette={{ W: gear.weapon.color, h: '#78350f', S: '#e7c9a9' }} />
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

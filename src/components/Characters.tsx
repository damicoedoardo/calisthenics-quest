import { PixelArt } from './Sprite';
import { Hero } from './Hero';
import { equippedGear, makeGear, type ClassId, type Gear, type GearSlot } from '@/lib/gear';
import { emberSheet, wandererSheet } from '@/lib/sprite64/cast';
import { SpriteSheet, useSheet } from './SpriteSheet';

const MIRA = [
  '.....RRRRRR.....',
  '....RRRRRRRR....',
  '...RRSSSSSSRR...',
  '...RSESSSSESR...',
  '...RSSSSSSSSR...',
  '...RRSSmmSSRR...',
  '....R.SSSS.R....',
  '...LLLLLLLLLL...',
  '..LLLAAAAAALLL..',
  '..SLLAAAAAALLS..',
  '..S.LAAAAAAL.S..',
  '..S.LAAAAAAL.S..',
  '..S.LAAAAAAL.S..',
  '....LAAAAAAL....',
  '....PPP..PPP....',
  '...BBBB..BBBB...',
];

const BOOK = [
  '.LLLLLLLLLLLLLL.',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  'LLppppppLppppppL',
  '.LLLLLLLLLLLLLL.',
  '.......LL.......',
];

const SLIME = [
  '......GGGG......',
  '....GGGGGGGG....',
  '...GGgGGGGGGG...',
  '..GGGGGGGGGGGG..',
  '..GGkGGGGGGkGG..',
  '.GGGkGGGGGGkGGG.',
  '.GGGGGGmmGGGGGG.',
  'GGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGG',
  '.GGGGGGGGGGGGGG.',
];

const MIRROR = [
  '...DDDDDD...',
  '..DggggggD..',
  '.DgGggggggD.',
  '.DgGggggggD.',
  '.DggggwgggD.',
  '.DgggwggggD.',
  '.DggwgggggD.',
  '.DgggggrggD.',
  '.DggggrrggD.',
  '.DggggggggD.',
  '..DggggggD..',
  '...DDDDDD...',
  '.....DD.....',
  '....DDDD....',
];

const GOLEM = [
  '.....SSSSSS.....',
  '....SsSSSSsS....',
  '....SSrSSrSS....',
  '....SSSSSSSS....',
  '..SSSSSSSSSSSS..',
  '.SSSsSSSSSSsSSS.',
  'SSSSSSSSSSSSSSSS',
  'SSS.SSSSSSSS.SSS',
  'SS..SSSsSSSS..SS',
  'SS..SSSSSSSS..SS',
  '....SSS..SSS....',
  '...SSSS..SSSS...',
];

const SUMMIT = [
  '.......F........',
  '.......FFF......',
  '.......F........',
  '......WWW.......',
  '.....WWWWW......',
  '....WWMMMWW.....',
  '...WMMMMMMMW....',
  '..MMMMMMMMMMM...',
  '.MMMMMMMMMMMMM..',
  'MMMMMMMMMMMMMMM.',
];

export function Wanderer({ size = 64 }: { size?: number }) {
  const src = useSheet(wandererSheet);
  return <SpriteSheet src={src} size={size} label="The Wanderer" />;
}

/** Ember grows with the weekly streak: scale 0 (tiny) to 5 (bonfire). */
export function Ember({ size = 48, dim = false }: { size?: number; dim?: boolean }) {
  const src = useSheet(emberSheet);
  return (
    <div className={`animate-flicker ${dim ? 'opacity-50' : ''}`}>
      <SpriteSheet src={src} size={size} label="Ember" />
    </div>
  );
}

const SHADOW_GEAR = { ...equippedGear(undefined, { push: 0, pull: 0, core: 0 }), weapon: makeGear('weapon', 1, undefined) };

interface HollowProps {
  size?: number;
  bounce?: boolean;
  /** The Hollow wears your shape: pass your gear and class to mirror them. */
  gear?: Record<GearSlot, Gear>;
  classId?: ClassId;
  action?: number;
}

/** The Hollow: your own shape, emptied out. The voice that says you're not enough. */
export function Hollow({ size = 64, bounce = true, gear = SHADOW_GEAR, classId, action }: HollowProps) {
  return <Hero gear={gear} classId={classId} size={size} variant="hollow" bounce={bounce} action={action} />;
}

/** The Book of Days: blank pages the player writes by training. */
export function Book({ size = 64 }: { size?: number }) {
  return <PixelArt rows={BOOK} palette={{ L: '#78350f', p: '#f5ecd7' }} size={size} className="animate-float" label="The Book of Days" />;
}

export function Mira({ size = 64 }: { size?: number }) {
  return (
    <PixelArt
      rows={MIRA}
      palette={{ R: '#b91c1c', S: '#e7c9a9', E: '#111', m: '#9f1239', L: '#78350f', A: '#a16207', P: '#1f2937', B: '#0f172a' }}
      size={size}
      label="Mira the Smith"
    />
  );
}

export type EnemyId = 'slime' | 'mirror' | 'golem' | 'hollow' | 'summit';

export function Enemy({ id, size = 72 }: { id: EnemyId; size?: number }) {
  switch (id) {
    case 'slime':
      return <PixelArt rows={SLIME} palette={{ G: '#64748b', g: '#94a3b8', k: '#0f172a', m: '#0f172a' }} size={size} label="Tomorrow" />;
    case 'mirror':
      return <PixelArt rows={MIRROR} palette={{ D: '#a16207', g: '#1e293b', G: '#334155', w: '#e2e8f0', r: '#ef4444' }} size={size} label="The Mirror" />;
    case 'golem':
      return <PixelArt rows={GOLEM} palette={{ S: '#78716c', s: '#57534e', r: '#f59e0b' }} size={size} label="The Plateau" />;
    case 'hollow':
      return <Hollow size={size} bounce={false} />;
    case 'summit':
      return <PixelArt rows={SUMMIT} palette={{ F: '#fbbf24', W: '#f8fafc', M: '#475569' }} size={size} label="The Summit" />;
  }
}

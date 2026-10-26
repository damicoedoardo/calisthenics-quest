import { PixelArt } from './Sprite';

const WANDERER = [
  '.....CCCCCC.....',
  '....CCCCCCCC....',
  '...CCCccccCCC...',
  '...CCcddddcCC...',
  '...CCdYddYdCC...',
  '...CCddddddCC...',
  '....CcddddcC....',
  '...CCCCCCCCCC...',
  '..CCCCCCCCCCCC..',
  '..CCCCCcCCCCCC..',
  '.CCCCCCcCCCCCCC.',
  '.CCCCCCcCCCCCCC.',
  '.CCCCCCcCCCCCCC.',
  '.CCCCCCcCCCCCCC.',
  '..CCCCCcCCCCCC..',
  '..BBBB....BBBB..',
];

const EMBER = [
  '.....Y......',
  '.....YY.....',
  '....YOY.....',
  '....YOOY....',
  '...YOOOY....',
  '..YOORROY...',
  '..YORRRROY..',
  '.YORRWWRROY.',
  '.YORWkWkROY.',
  '.YORWWWWROY.',
  '.YORRWWRROY.',
  '..YORRRROY..',
  '...YOOOOY...',
  '....YYYY....',
];

const DOUBT = [
  '....FFFFFFFF....',
  '..FFFFFFFFFFFF..',
  '.FFFfFFFFFFfFFF.',
  'FFFFFFFFFFFFFFFF',
  'FFFrrFFFFFFrrFFF',
  'FFFrrFFFFFFrrFFF',
  'FFFFFFFFFFFFFFFF',
  'FFFFFmmmmmmFFFFF',
  '.FFFFFFFFFFFFFF.',
  '.FFfFFFFFFFfFFF.',
  '..FFFFFFFFFFFF..',
  '.FF.FFFFFFFF.FF.',
  'F....FF..FF....F',
];

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
  return <PixelArt rows={WANDERER} palette={{ C: '#3f3a52', c: '#2a2638', d: '#111318', Y: '#fbbf24', B: '#1f2937' }} size={size} label="The Wanderer" />;
}

/** Ember grows with the weekly streak: scale 0 (tiny) to 5 (bonfire). */
export function Ember({ size = 48, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <PixelArt
      rows={EMBER}
      palette={{ Y: '#fde047', O: '#fb923c', R: '#ef4444', W: '#fff7ed', k: '#1f2937' }}
      size={size}
      className={`animate-flicker ${dim ? 'opacity-50' : ''}`}
      label="Ember"
    />
  );
}

export function Doubt({ size = 64 }: { size?: number }) {
  return <PixelArt rows={DOUBT} palette={{ F: '#4b5563', f: '#6b7280', r: '#ef4444', m: '#111827' }} size={size} label="Doubt" />;
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

export type EnemyId = 'slime' | 'mirror' | 'golem' | 'doubt' | 'summit';

export function Enemy({ id, size = 72 }: { id: EnemyId; size?: number }) {
  switch (id) {
    case 'slime':
      return <PixelArt rows={SLIME} palette={{ G: '#64748b', g: '#94a3b8', k: '#0f172a', m: '#0f172a' }} size={size} label="Tomorrow" />;
    case 'mirror':
      return <PixelArt rows={MIRROR} palette={{ D: '#a16207', g: '#1e293b', G: '#334155', w: '#e2e8f0', r: '#ef4444' }} size={size} label="The Mirror" />;
    case 'golem':
      return <PixelArt rows={GOLEM} palette={{ S: '#78716c', s: '#57534e', r: '#f59e0b' }} size={size} label="The Plateau" />;
    case 'doubt':
      return <Doubt size={size} />;
    case 'summit':
      return <PixelArt rows={SUMMIT} palette={{ F: '#fbbf24', W: '#f8fafc', M: '#475569' }} size={size} label="The Summit" />;
  }
}

import * as Phaser from 'phaser';
import type { ClassId } from '@/lib/gear';
import { xpToNext, type Power, type UpgradeId, type Zone } from '@/lib/fog';
import { music, type SfxId } from '@/lib/music';
import type { Sheet } from '@/sprites/registry';
import { BOSSES as BOSS_LOOKS, FOES as FOE_LOOKS, type SheetKey, type Stats } from '../rules';
import { R } from '@/sprites/palette';
import { botInput } from './bot';
import { BARREL, CHEST, CHEST_OPEN, PILLAR, SCONCE, SHRINE as SHRINE_PROP, type Prop } from './props';
import { THEMES, themeFor, type Theme } from './themes';
import {
  ABILITIES,
  FLAME_RING,
  ROOM,
  SHRINE,
  STEP,
  ELITE,
  RELICS,
  createRun,
  pickRelic,
  relic,
  spikeState,
  pick,
  skipFloor,
  skipToBoss,
  stepRun,
  takeEvents,
  winNow,
  type AbilityId,
  type Foe,
  type FreePick,
  type GameEvent,
  type MonsterKind,
  type RelicId,
  type RoomKind,
  type Run,
  type RunEnd,
  type ShotStyle,
} from './engine';

/* Draws a dungeon run. The engine (engine.ts) plays the game; this scene only reads it each frame,
   keeps a sprite for everything in it, and turns what happened (its events) into flashes, sparks,
   numbers and sound. Loaded only when a run starts, like everything that touches Phaser. */

export type { SheetKey, FreePick, RunEnd };

export interface RunSetup {
  zone: Zone;
  power: Power;
  classId: ClassId | undefined;
  sheets: Record<SheetKey, Sheet>;
  /** The bot plays (developer mode, balance tests). */
  autopilot?: boolean;
  /** Play the whole run at once without drawing it (balance tests). */
  fast?: boolean;
}

export interface Hud {
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
  level: number;
  seconds: number;
  kills: number;
  boss: { hp: number; max: number } | null;
  floor: number;
  floors: number;
  room: number;
  rooms: number;
  /** The class ability: 1 when ready. */
  ability: { id: AbilityId; ready: number };
  cleared: boolean;
  relics: Partial<Record<RelicId, number>>;
}

export interface RunEvents {
  hud: (h: Hud) => void;
  levelUp: (choices: UpgradeId[], levels: Partial<Record<UpgradeId, number>>, free: FreePick | null) => void;
  boss: () => void;
  say: (text: string) => void;
  /** A chest opened: three items to pick from. */
  relic: (choices: RelicId[], have: Partial<Record<RelicId, number>>) => void;
  /** A new floor: its number from 1. */
  floor: (n: number) => void;
  end: (r: RunEnd) => void;
}

export interface RunHandle {
  pick: (id: UpgradeId) => void;
  ability: () => void;
  pause: () => void;
  resume: () => void;
  skipToBoss: () => void;
  skipFloor: () => void;
  /** Developer mode: show the next zone's dungeon theme; returns its name. */
  cycleTheme: () => string;
  pickRelic: (id: RelicId) => void;
  winNow: () => void;
  autopilot: (on: boolean) => void;
  destroy: () => void;
}

const SFX: Record<'slash' | 'arrow' | 'orb' | 'wave', SfxId> = { slash: 'slash', arrow: 'arrow', orb: 'orb', wave: 'wave' };
const HEAL = '#86efac';
const RISE_MS = 280;

type Look = Pick<Stats, 'tex' | 'scale' | 'bits'> & { tint?: number };
/** The dungeon's own monsters, each with its own sprite (src/sprites/characters). */
const DUNGEON_LOOKS: Record<Exclude<MonsterKind, keyof typeof FOE_LOOKS>, Look> = {
  ram: { tex: 'ram', scale: 0.62, bits: [0xe89a48, 0xb8651e, 0xe8dcc0] },
  book: { tex: 'book', scale: 0.62, bits: [0xfef3c7, 0xd6d3d1, 0x92400e] },
  smoke: { tex: 'smoke', scale: 0.55, bits: [0xa78bfa, 0x6b21a8, 0xe9d5ff] },
  seeker: { tex: 'seeker', scale: 0.55, bits: [0x67e8f9, 0x0e7490, 0xffffff] },
  splitter: { tex: 'splitter', scale: 0.78, bits: [0x86efac, 0x15803d, 0xdcfce7] },
  splitling: { tex: 'splitling', scale: 0.5, bits: [0x86efac, 0x15803d] },
  shade: { tex: 'shade', scale: 0.65, bits: [0xa78bfa, 0x6b21a8, 0x1e1b4b] },
};
const looks = (kind: Foe['kind'], zone: Zone): Look =>
  kind === 'boss' ? BOSS_LOOKS[zone.boss] : kind in DUNGEON_LOOKS ? DUNGEON_LOOKS[kind as keyof typeof DUNGEON_LOOKS] : FOE_LOOKS[kind as keyof typeof FOE_LOOKS];
/** What a door says about the room behind it. */
const DOOR_LOOK: Record<RoomKind, { label: string; color: number }> = {
  fight: { label: 'FIGHT', color: 0xe2e8f0 },
  elite: { label: 'ELITE', color: 0xf87171 },
  treasure: { label: 'CHEST', color: 0xfbbf24 },
  rest: { label: 'REST', color: 0x86efac },
};
/** Each kind of monster shot has its own color, so you learn what it will do. */
const SHOT_TEX: Record<ShotStyle, string> = { plain: 'bullet', homing: 'bullet-homing', bounce: 'bullet-bounce', ramp: 'bullet-ramp', wiggle: 'bullet-page' };
const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;

class DungeonScene extends Phaser.Scene {
  run: Run;
  bot = false;
  private hero!: Phaser.GameObjects.Sprite;
  private foes = new Map<number, { s: Phaser.GameObjects.Sprite; base: number; born: number; squash: number; flash: number }>();
  private bullets = new Map<number, Phaser.GameObjects.Image>();
  private shots = new Map<number, Phaser.GameObjects.Image>();
  private gems = new Map<number, Phaser.GameObjects.Image>();
  private flames: Phaser.GameObjects.Sprite[] = [];
  private room!: Phaser.GameObjects.Graphics;
  private floorTiles!: Phaser.GameObjects.TileSprite;
  /** Water and spikes, redrawn each frame (they ripple and rise). */
  private ground!: Phaser.GameObjects.Graphics;
  /** What belongs to this room only: pebbles, pillars, the shrine. */
  private roomBits: Phaser.GameObjects.GameObject[] = [];
  private barrels = new Map<number, Phaser.GameObjects.Image>();
  private shrine: Phaser.GameObjects.Image | null = null;
  /** Torches on the side walls; their flames are drawn each frame on `torchFire`. */
  private torches: { x: number; y: number }[] = [];
  private torchFire!: Phaser.GameObjects.Graphics;
  /** The look of this zone's dungeon (themes.ts). Developer mode can cycle it. */
  private theme: Theme;
  private mists: Phaser.GameObjects.Image[] = [];
  private chest: Phaser.GameObjects.Image | null = null;
  private fx!: Phaser.GameObjects.Graphics;
  private shadows!: Phaser.GameObjects.Graphics;
  private pad!: Phaser.GameObjects.Graphics;
  private bits!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffs!: Phaser.GameObjects.Particles.ParticleEmitter;
  private numbers: Phaser.GameObjects.Text[] = [];
  private bossLabel: Phaser.GameObjects.Text | null = null;
  private keys: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd' | 'space', Phaser.Input.Keyboard.Key> | null = null;
  private stick: { id: number; x: number; y: number; dx: number; dy: number } | null = null;
  private fading: { draw: (g: Phaser.GameObjects.Graphics, p: number) => void; start: number; ms: number }[] = [];
  private acc = 0;
  private wantAbility = false;
  private offered = false;
  private ended = false;
  private hudAt = 0;
  private trailAt = 0;
  private paused = false;

  constructor(
    private setup: RunSetup,
    private bus: RunEvents,
  ) {
    super('dungeon');
    this.theme = themeFor(setup.zone.id);
    this.run = createRun({ zone: setup.zone, power: setup.power, classId: setup.classId, seed: Math.floor(Math.random() * 2 ** 31), autoPick: setup.fast });
  }

  preload() {
    for (const [key, s] of Object.entries(this.setup.sheets)) this.load.spritesheet(key, s.src, { frameWidth: s.w, frameHeight: s.h });
  }

  create() {
    const { zone } = this.setup;
    this.bot = !!this.setup.autopilot;
    if (this.setup.fast) {
      // Balance tests: the whole run in one go, then only the result.
      while (!this.run.over) {
        stepRun(this.run, botInput(this.run));
        this.run.events.length = 0;
      }
      this.ended = true;
      this.bus.hud(this.hud());
      this.bus.end(this.run.over);
      return;
    }
    this.makeTextures();
    for (const [key, s] of Object.entries(this.setup.sheets)) {
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: s.frames - 1 }), frameRate: 1000 / s.ms, repeat: s.loop ? -1 : 0 });
    }
    this.cameras.main.setBackgroundColor('#07080d').setRoundPixels(true);
    this.floorTiles = this.add.tileSprite(0, 0, ROOM.w, ROOM.h, 'ground').setOrigin(0).setDepth(-3);
    this.ground = this.add.graphics().setDepth(-1.5);
    this.room = this.add.graphics().setDepth(-1);
    this.torchFire = this.add.graphics().setDepth(-0.5);
    this.shadows = this.add.graphics().setDepth(0.5);
    this.fx = this.add.graphics().setDepth(90000);
    const fogTint = hex(this.theme.fog);
    for (let i = 0; i < 14; i++) {
      const m = this.add
        .image(Phaser.Math.Between(0, ROOM.w + 100), Phaser.Math.Between(0, ROOM.h + 400), 'mist')
        .setTint(fogTint)
        .setAlpha(0.12)
        .setScale(Phaser.Math.FloatBetween(2.5, 4.5))
        .setDepth(150000);
      this.mists.push(m);
      this.tweens.add({ targets: m, x: m.x + Phaser.Math.Between(-80, 80), duration: Phaser.Math.Between(9000, 16000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.hero = this.add.sprite(this.run.hero.x, this.run.hero.y, 'hero').play('hero').setScale(0.8);
    this.hero.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.hero.play('hero'));
    this.puffs = this.add.particles(0, 0, 'mist', {
      emitting: false,
      speed: { min: 6, max: 26 },
      gravityY: -18,
      lifespan: { min: 380, max: 560 },
      alpha: { start: 0.45, end: 0 },
      scale: { start: 0.1, end: 0.26 },
      tint: Phaser.Display.Color.HexStringToColor(this.theme.fog).lighten(25).color,
    });
    this.puffs.setDepth(2);
    this.bits = this.add.particles(0, 0, 'dot', { emitting: false, speed: { min: 50, max: 170 }, gravityY: 220, lifespan: { min: 280, max: 520 }, alpha: { start: 1, end: 0 }, scale: { start: 1.3, end: 0.4 } });
    this.bits.setDepth(90001);
    this.sparks = this.add.particles(0, 0, 'dot', { emitting: false, speed: { min: 60, max: 200 }, lifespan: 300, alpha: { start: 1, end: 0 }, tint: [0xfde68a, 0xfbbf24, 0xffffff] });
    this.sparks.setDepth(90002);
    for (let i = 0; i < 40; i++) {
      this.numbers.push(
        this.add
          .text(0, 0, '', { fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#ffffff', stroke: '#0b0d14', strokeThickness: 3 })
          .setOrigin(0.5)
          .setDepth(95000)
          .setVisible(false),
      );
    }
    this.pad = this.add.graphics().setScrollFactor(0).setDepth(300000);
    this.cameras.main.startFollow(this.hero, true, 0.14, 0.14);
    this.newRoom();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fitScreen());

    const kb = this.input.keyboard;
    if (kb) {
      const k = Phaser.Input.Keyboard.KeyCodes;
      this.keys = kb.addKeys({ up: k.UP, down: k.DOWN, left: k.LEFT, right: k.RIGHT, w: k.W, a: k.A, s: k.S, d: k.D, space: k.SPACE }) as DungeonScene['keys'];
      this.keys?.space.on('down', () => (this.wantAbility = true));
    }
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (!this.stick) this.stick = { id: p.id, x: p.x, y: p.y, dx: 0, dy: 0 };
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (!this.stick || p.id !== this.stick.id) return;
      const dx = p.x - this.stick.x,
        dy = p.y - this.stick.y,
        len = Math.hypot(dx, dy),
        max = 46;
      this.stick.dx = len > max ? (dx / len) * max : dx;
      this.stick.dy = len > max ? (dy / len) * max : dy;
    });
    const release = (p: Phaser.Input.Pointer) => {
      if (this.stick && p.id === this.stick.id) this.stick = null;
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
  }

  /** The screen filled: a room as wide as the phone, the camera following you up and down it
      (and a little sideways in the wide ones). The HUD floats over the top. */
  private fitScreen() {
    const { width, height } = this.scale.gameSize,
      cam = this.cameras.main,
      { w, h } = this.run.area;
    const zoom = Math.min(width / (ROOM.w + 20), height / 700);
    cam.setZoom(zoom);
    const vw = width / zoom,
      vh = height / zoom,
      // Room above the top wall for the HUD, so the door never hides under it.
      top = 78 / zoom,
      bottom = 16;
    const bw = Math.max(w + 24, vw),
      ch = h + top + bottom,
      bh = Math.max(ch, vh);
    cam.setBounds(w / 2 - bw / 2, ch >= vh ? -top : -top - (vh - ch) / 2, bw, bh);
    // You sit a little low on the screen: what's coming is above you.
    cam.setFollowOffset(0, Math.min(90, vh * 0.1));
  }

  /** A new room: its size, its floor, its walls and what stands on it. */
  private newRoom() {
    const r = this.run,
      { w, h } = r.area,
      T = r.terrain;
    for (const o of this.roomBits) o.destroy();
    this.roomBits = [];
    for (const b of this.barrels.values()) b.destroy();
    this.barrels.clear();
    this.shrine = null;
    this.chest = null;
    this.floorTiles.setSize(w, h).setTilePosition(r.room * 23 + r.floor * 41, r.floor * 17);
    const n = Math.round((w * h) / 8000);
    for (let i = 0; i < n; i++) {
      const key = ['stone', 'tuft', 'bone', 'crack'][i % 4];
      this.roomBits.push(
        this.add
          .image(Phaser.Math.Between(ROOM.wall + 10, w - ROOM.wall - 10), Phaser.Math.Between(ROOM.wall + 10, h - ROOM.wall - 10), key)
          .setDepth(-2)
          .setScale(key === 'crack' ? 2 : 1 + (i % 3) * 0.5),
      );
    }
    for (const p of T.pillars) this.roomBits.push(this.add.image(p.x, p.y + p.r * 0.35, 'pillar').setOrigin(0.5, 1).setScale(p.r / 20).setDepth(p.y + p.r));
    for (const b of T.barrels) this.barrels.set(b.id, this.add.image(b.x, b.y + 6, 'barrel').setOrigin(0.5, 1).setDepth(b.y));
    // Torches down both side walls, each throwing a warm pool of light.
    this.torches = [];
    for (let y = 150; y < h - 100; y += 240)
      for (const x of [ROOM.wall / 2, w - ROOM.wall / 2]) {
        this.torches.push({ x, y });
        this.roomBits.push(this.add.image(x, y, 'sconce').setDepth(-0.6));
        const glow = this.add.image(x, y - 8, 'mist').setTint(hex(this.theme.glow)).setAlpha(0.22).setScale(2.6).setDepth(-0.7);
        this.tweens.add({ targets: glow, alpha: 0.32, scale: 2.8, duration: 180 + (y % 7) * 30, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.roomBits.push(glow);
      }
    if (T.shrine) {
      this.shrine = this.add.image(T.shrine.x, T.shrine.y + 8, 'shrine').setOrigin(0.5, 1).setDepth(T.shrine.y);
      this.roomBits.push(this.shrine);
    }
    this.drawRoom();
    this.fitScreen();
    this.cameras.main.centerOn(r.hero.x, r.hero.y - Math.min(90, this.cameras.main.height / this.cameras.main.zoom / 10));
  }

  // ---------- textures drawn in code ----------

  private makeTextures() {
    const { zone } = this.setup;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const tex = (key: string, w: number, h: number, draw: () => void) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };
    tex('dot', 3, 3, () => g.fillStyle(0xffffff).fillRect(0, 0, 3, 3));
    if (this.textures.exists('mist')) this.textures.remove('mist');
    const mist = this.textures.createCanvas('mist', 64, 64);
    if (mist) {
      const ctx = mist.getContext(),
        grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
      mist.refresh();
    }
    const diamond = (w: number, h: number) => [new Phaser.Math.Vector2(w / 2, 0), new Phaser.Math.Vector2(w, h / 2), new Phaser.Math.Vector2(w / 2, h), new Phaser.Math.Vector2(0, h / 2)];
    tex('gem', 8, 10, () => {
      g.fillStyle(0x7dd3fc).fillPoints(diamond(8, 10), true);
      g.fillStyle(0xe0f2fe).fillRect(3, 2, 2, 3);
    });
    tex('gem-big', 10, 12, () => {
      g.fillStyle(0xfbbf24).fillPoints(diamond(10, 12), true);
      g.fillStyle(0xfef3c7).fillRect(4, 2, 2, 4);
    });
    tex('arrow', 16, 4, () => {
      g.fillStyle(0xd6d3d1).fillRect(0, 1, 12, 2);
      g.fillStyle(0xf8fafc).fillRect(12, 0, 2, 4).fillRect(14, 1, 2, 2);
      g.fillStyle(0xf97316).fillRect(0, 0, 3, 1).fillRect(0, 3, 3, 1);
    });
    tex('orb', 14, 14, () => {
      g.fillStyle(0xa78bfa, 0.35).fillCircle(7, 7, 7);
      g.fillStyle(0xc4b5fd).fillCircle(7, 7, 4);
      g.fillStyle(0xffffff).fillCircle(6, 6, 2);
    });
    // Monster shots: hot, round and easy to read against any ground.
    tex('bullet', 14, 14, () => {
      g.fillStyle(0xf43f5e, 0.35).fillCircle(7, 7, 7);
      g.fillStyle(0xfb7185).fillCircle(7, 7, 5);
      g.fillStyle(0xffe4e6).fillCircle(6, 6, 2);
    });
    tex('bullet-boss', 18, 18, () => {
      g.fillStyle(0xa855f7, 0.35).fillCircle(9, 9, 9);
      g.fillStyle(0xc084fc).fillCircle(9, 9, 6);
      g.fillStyle(0xf5d0fe).fillCircle(8, 8, 3);
    });
    const shot = (key: string, glow: number, body: number, core: number) =>
      tex(key, 14, 14, () => {
        g.fillStyle(glow, 0.35).fillCircle(7, 7, 7);
        g.fillStyle(body).fillCircle(7, 7, 5);
        g.fillStyle(core).fillCircle(6, 6, 2);
      });
    shot('bullet-homing', 0x22d3ee, 0x67e8f9, 0xecfeff);
    shot('bullet-bounce', 0x84cc16, 0xbef264, 0xf7fee7);
    shot('bullet-ramp', 0xf97316, 0xfdba74, 0xfff7ed);
    // The Book's pages.
    tex('bullet-page', 12, 12, () => {
      g.fillStyle(0xfbbf24, 0.35).fillRect(0, 0, 12, 12);
      g.fillStyle(0xfef3c7).fillRect(2, 1, 8, 10);
      g.fillStyle(0xa16207).fillRect(3, 3, 6, 1).fillRect(3, 5, 6, 1).fillRect(3, 7, 4, 1);
    });
    // The furniture, drawn as text rows (props.ts), two texture pixels per character.
    const prop = (key: string, { rows, palette }: Prop, under?: () => void) =>
      tex(key, rows[0].length * 2, rows.length * 2, () => {
        under?.();
        rows.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            const c = palette[ch];
            if (c) g.fillStyle(hex(c)).fillRect(x * 2, y * 2, 2, 2);
          }),
        );
      });
    prop('barrel', BARREL, () => g.fillStyle(0x000000, 0.3).fillEllipse(12, 25, 24, 6));
    prop('chest', CHEST, () => g.fillStyle(0x000000, 0.3).fillEllipse(15, 24, 30, 6));
    prop('chest-open', CHEST_OPEN, () => {
      g.fillStyle(0x000000, 0.3).fillEllipse(15, 24, 30, 6);
      g.fillStyle(hex(R.gold[2]), 0.25).fillEllipse(15, 8, 30, 14);
    });
    prop('sconce', SCONCE);
    g.destroy();
    this.themeTextures();
  }

  /** The textures that follow the zone's theme: the floor, its litter, the pillars, the shrine. */
  private themeTextures() {
    const t = this.theme,
      g = this.make.graphics({ x: 0, y: 0 }, false),
      // pebbles (dark, light), grass tufts (dark, light) and bones on the floor
      litter = t.litter ?? [t.stone[2], t.stone[4], t.stone[2], t.stone[3], t.stone[5]];
    const tex = (key: string, w: number, h: number, draw: () => void) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };
    // The stone in the props' rows ('1' darkest to '7' lightest) and their moss, in this theme.
    const prop = (key: string, { rows, palette }: Prop, under?: () => void) => {
      const pal: Record<string, string> = { ...palette, m: t.moss };
      t.stone.forEach((c, i) => (pal[String(i + 1)] = c));
      tex(key, rows[0].length * 2, rows.length * 2, () => {
        under?.();
        rows.forEach((row, y) =>
          [...row].forEach((ch, x) => {
            const c = pal[ch];
            if (c) g.fillStyle(hex(c)).fillRect(x * 2, y * 2, 2, 2);
          }),
        );
      });
    };
    const base = Phaser.Display.Color.HexStringToColor(t.ground);
    const lighter = base.clone().lighten(8).color,
      darker = base.clone().darken(5).color;
    // Flagstones: two courses of big slabs, laid so the tile repeats seamlessly. Soft edges (light
    // top-left, shade bottom-right) and thin mortar, so the floor stays quiet under the fight.
    const COURSES: [number, number, number[]][] = [
      [0, 30, [30, 30]],
      [32, 30, [14, 30, 14]],
    ];
    tex('ground', 64, 64, () => {
      const mortar = base.clone().darken(4).color,
        lit = base.clone().lighten(3).color,
        shade = base.clone().darken(2).color;
      g.fillStyle(mortar).fillRect(0, 0, 64, 64);
      const rnd = new Phaser.Math.RandomDataGenerator(['forma']);
      COURSES.forEach(([y, h, widths], row) => {
        let x = 0;
        widths.forEach((w, i) => {
          g.fillStyle((row + i) % 2 ? shade : base.color).fillRect(x, y, w, h);
          g.fillStyle(lit).fillRect(x, y, w - 1, 1).fillRect(x, y, 1, h - 1);
          g.fillStyle(mortar).fillRect(x + 1, y + h - 1, w - 1, 1).fillRect(x + w - 1, y + 1, 1, h - 1);
          // wear: a few chips and specks
          for (let k = 0; k < 3; k++) g.fillStyle(k % 2 ? lighter : darker).fillRect(x + rnd.between(3, w - 5), y + rnd.between(3, h - 4), rnd.between(1, 2), 1);
          x += w + 2;
        });
      });
      // one slab cracked across
      g.fillStyle(mortar).fillRect(36, 8, 5, 1).fillRect(40, 9, 4, 1).fillRect(43, 10, 4, 1).fillRect(46, 9, 3, 1);
    });
    tex('stone', 10, 7, () => {
      g.fillStyle(hex(litter[0])).fillRect(1, 2, 8, 5).fillRect(2, 1, 6, 1);
      g.fillStyle(hex(litter[1])).fillRect(2, 2, 4, 2);
    });
    tex('tuft', 9, 7, () => {
      g.fillStyle(hex(litter[2])).fillRect(1, 3, 1, 4).fillRect(4, 1, 1, 6).fillRect(7, 2, 1, 5);
      g.fillStyle(hex(litter[3])).fillRect(3, 4, 1, 3).fillRect(5, 3, 1, 4);
    });
    tex('bone', 10, 4, () => g.fillStyle(hex(litter[4])).fillRect(1, 1, 8, 2).fillRect(0, 0, 2, 4).fillRect(8, 0, 2, 4));
    tex('crack', 14, 6, () => g.fillStyle(darker).fillRect(0, 2, 5, 1).fillRect(4, 3, 4, 1).fillRect(7, 1, 4, 1).fillRect(10, 4, 4, 1));
    prop('pillar', PILLAR, () => g.fillStyle(0x000000, 0.3).fillEllipse(22, 58, 44, 12));
    prop('shrine', SHRINE_PROP, () => g.fillStyle(0x86efac, 0.18).fillCircle(18, 24, 18));
    g.destroy();
  }

  /** Developer mode: show the next zone's theme in this run, to preview every dungeon's look. */
  cycleTheme(): string {
    this.theme = THEMES[(THEMES.indexOf(this.theme) + 1) % THEMES.length];
    this.themeTextures();
    this.floorTiles.setTexture('ground');
    for (const m of this.mists) m.setTint(hex(this.theme.fog));
    this.newRoom();
    return this.theme.name;
  }

  /** Walls, and the door at the top: barred until the room is clear, then open and glowing. */
  private drawRoom() {
    const g = this.room.clear(),
      W = this.run.area.w,
      H = this.run.area.h,
      w = ROOM.wall,
      door = ROOM.door,
      dl = (W - door) / 2,
      S = this.theme.stone.map(hex);
    // The wall's mass, then brick courses: 7px tall, staggered, a lit top edge on each brick.
    g.fillStyle(S[1]).fillRect(0, 0, W, w).fillRect(0, H - w, W, w).fillRect(0, 0, w, H).fillRect(W - w, 0, w, H);
    // A brick, cut to the wall it sits in (x0..x1) so none hangs over the edge.
    const brick = (x: number, y: number, bw: number, bh: number, x0 = 0, x1 = W) => {
      const a = Math.max(x, x0),
        b = Math.min(x + bw, x1);
      if (b - a < 2) return;
      g.fillStyle(S[2]).fillRect(a, y, b - a, bh);
      g.fillStyle(S[3]).fillRect(a, y, b - a - 1, 1);
      g.fillStyle(S[1]).fillRect(b - 1, y, 1, bh);
    };
    for (let row = 0; row < 2; row++)
      for (let x = row * -8; x < W; x += 16) {
        brick(x, row * 7, 15, 6);
        brick(x, H - w + 6 + row * 7, 15, 6);
      }
    for (let y = w, n = 0; y < H - w; y += 7, n++)
      for (const x0 of [0, W - w]) for (let x = x0 - (n % 2 ? 8 : 0); x < x0 + w; x += 12) brick(x, y, 11, 6, x0, x0 + w);
    // The top wall's face, in shadow under a lit ledge; the bottom wall's top, catching the light.
    g.fillStyle(S[4]).fillRect(w, 14, W - 2 * w, 2);
    g.fillStyle(S[0]).fillRect(w, 16, W - 2 * w, w - 16);
    g.fillStyle(S[4]).fillRect(0, H - w, W, 2);
    // Inner edges of the side walls, then the shadow the walls throw on the floor.
    g.fillStyle(S[3]).fillRect(w - 2, w, 2, H - 2 * w).fillRect(W - w, w, 2, H - 2 * w);
    g.fillStyle(0x000000, 0.28).fillRect(w, w, W - 2 * w, 10).fillRect(w, w, 6, H - 2 * w).fillRect(W - w - 6, w, 6, H - 2 * w);
    g.fillStyle(0x000000, 0.14).fillRect(w, w + 10, W - 2 * w, 8);
    // The doorways: a stone frame either way.
    const frame = (l: number) => {
      g.fillStyle(S[4]).fillRect(l - 6, 0, 6, w).fillRect(l + door, 0, 6, w);
      g.fillStyle(S[5]).fillRect(l - 6, 0, 2, w).fillRect(l + door, 0, 2, w);
      for (let y = 5; y < w; y += 6) g.fillStyle(S[2]).fillRect(l - 6, y, 6, 1).fillRect(l + door, y, 6, 1);
    };
    if (this.run.doorOpen) {
      for (const d of this.run.doors) {
        const l = d.x - door / 2,
          color = this.run.doors.length > 1 ? DOOR_LOOK[d.kind].color : 0xfbbf24;
        g.fillStyle(0x07080d).fillRect(l, 0, door, w);
        // stairs going down into the dark, lit from below by what waits there
        for (let k = 0; k < 3; k++) g.fillStyle(S[1 + k]).fillRect(l + 4 + (2 - k) * 4, 6 + k * 5, door - 8 - (2 - k) * 8, 2);
        g.fillStyle(color, 0.35).fillRect(l + 6, w - 4, door - 12, 4);
        frame(l);
      }
    } else {
      // a portcullis: iron bars, two crossbars, points at the bottom
      g.fillStyle(0x0b0d14).fillRect(dl, 0, door, w);
      const iron = R.iron.map(hex);
      for (let x = dl + 5; x < dl + door - 4; x += 10) {
        g.fillStyle(iron[1]).fillRect(x, 0, 3, w - 3);
        g.fillStyle(iron[2]).fillRect(x, 0, 1, w - 3);
        g.fillStyle(iron[1]).fillRect(x + 1, w - 3, 1, 2);
      }
      g.fillStyle(iron[0]).fillRect(dl, 5, door, 2).fillRect(dl, 13, door, 2);
      frame(dl);
    }
  }

  // ---------- the loop ----------

  update(_time: number, deltaMs: number) {
    if (this.ended || this.paused) return;
    const run = this.run;
    this.acc += Math.min(deltaMs, 100);
    let steps = 0;
    while (this.acc >= STEP * 1000 && steps < 6) {
      this.acc -= STEP * 1000;
      steps++;
      const input = this.bot ? botInput(run) : { ...this.stickInput(), ability: this.wantAbility };
      this.wantAbility = false;
      stepRun(run, input);
      for (const e of takeEvents(run)) this.react(e);
      if (run.offer || run.over) break;
    }
    if (run.relicOffer && !this.offered) {
      this.offered = true;
      if (this.bot) {
        this.offered = false;
        this.pickRelic(run.relicOffer[0]);
      } else this.bus.relic(run.relicOffer, { ...run.relics });
    }
    if (run.offer && !this.offered) {
      this.offered = true;
      this.sparks.explode(30, this.hero.x, this.hero.y);
      if (this.bot) {
        this.offered = false;
        return this.pick(this.botPick(run.offer.choices));
      }
      music.sting('levelup');
      this.bus.levelUp(run.offer.choices, { ...run.ups }, run.offer.free);
    }
    this.sync();
    this.drawFx();
    this.drawPad();
    if (this.time.now >= this.hudAt) {
      this.hudAt = this.time.now + 100;
      this.bus.hud(this.hud());
    }
    if (run.over && !this.ended) {
      this.ended = true;
      this.bus.hud(this.hud());
      if (run.over.won) this.cameras.main.flash(600, 255, 240, 200);
      else this.hero.setTint(0x6b7280);
      this.time.delayedCall(run.over.won ? 1200 : 900, () => this.bus.end(run.over!));
    }
  }

  private botPick(choices: UpgradeId[]): UpgradeId {
    const order: UpgradeId[] = ['multi', 'power', 'haste', 'vital', 'spark', 'flame', 'nova', 'guard', 'swift', 'magnet'];
    return order.find((id) => choices.includes(id)) ?? choices[0];
  }

  private stickInput() {
    let x = 0,
      y = 0;
    if (this.stick) {
      x = this.stick.dx / 46;
      y = this.stick.dy / 46;
      if (Math.hypot(x, y) < 0.15) x = y = 0;
    } else if (this.keys) {
      const k = this.keys;
      x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
      y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    }
    return { x, y };
  }

  private hud(): Hud {
    const r = this.run;
    return {
      hp: Math.max(0, Math.ceil(r.hp)),
      maxHp: r.maxHp,
      xp: r.xp,
      xpNext: xpToNext(r.level),
      level: r.level,
      seconds: Math.floor(r.t),
      kills: r.kills,
      boss: r.boss ? { hp: Math.max(0, r.boss.hp), max: r.boss.maxHp } : null,
      floor: r.floor + 1,
      floors: r.layout.floors,
      room: r.room + 1,
      rooms: r.layout.rooms,
      ability: { id: r.ability, ready: Math.min(1, 1 - (r.abilityAt - r.t) / ABILITIES[r.ability].cd) },
      cleared: r.cleared,
      relics: { ...r.relics },
    };
  }

  /** Every sprite to where the engine says its thing is. */
  private sync() {
    const r = this.run,
      now = this.time.now,
      h = this.hero;
    // The hero: run bob and lean, blinking while untouchable after a hit.
    const moving = Math.hypot(r.hero.vx, r.hero.vy) > 5;
    h.setPosition(r.hero.x, r.hero.y).setDepth(r.hero.y);
    if (moving) {
      if (Math.abs(r.hero.vx) > 5) h.setFlipX(r.hero.vx < 0);
      const bob = Math.sin(now / 65) * 0.05;
      h.setScale(0.8 * (1 - bob * 0.6), 0.8 * (1 + bob)).setAngle(Math.sign(r.hero.vx) * 7);
      if (now >= this.trailAt) {
        this.trailAt = now + 110;
        this.puffs.explode(2, r.hero.x, r.hero.y + 22);
      }
    } else h.setScale(0.8).setAngle(0);
    const blink = r.t < r.hurtUntil || r.t < r.ghostUntil;
    h.setAlpha(blink ? (Math.floor(now / 80) % 2 ? 0.35 : 1) : 1);

    // Monsters.
    const seen = new Set<number>();
    for (const f of r.foes) {
      if (!f.alive) continue;
      seen.add(f.id);
      let e = this.foes.get(f.id);
      if (!e) {
        const look = looks(f.kind, this.setup.zone);
        const s = this.add.sprite(f.x, f.y, look.tex).play(look.tex).setScale(look.scale);
        if (f.kind === 'reflection') s.setTint(0xfde68a);
        else if (look.tint) s.setTint(look.tint);
        e = { s, base: look.scale * (f.elite ? ELITE.r : 1), born: now, squash: 0, flash: 0 };
        this.foes.set(f.id, e);
      }
      const { s, base } = e;
      s.setPosition(f.x, f.y).setDepth(f.y);
      if (Math.abs(f.vx) > 2) s.setFlipX(f.vx > 0);
      const born = (now - e.born) / RISE_MS;
      if (born < 1) s.setAlpha(born).setScale(base * (1.25 - 0.25 * born), base * (0.25 + 0.75 * born));
      else if (now < e.squash) s.setAlpha(1).setScale(base * 1.22, base * 0.8);
      else s.setAlpha(1).setScale(base);
      if (e.flash && now >= e.flash) {
        e.flash = 0;
        const tint = f.kind === 'reflection' ? 0xfde68a : f.kind === 'boss' ? undefined : looks(f.kind, this.setup.zone).tint;
        if (tint) s.setTint(tint);
        else if (f === r.boss && r.t < f.windUntil) s.setTint(0xff6b6b);
        else s.clearTint();
      }
      // A ram glowing before its charge; a shade fading out before it lands.
      if (f.kind === 'ram' && !e.flash) s.setTint(r.t < f.windUntil && Math.floor(now / 90) % 2 ? 0xff4d4d : (looks('ram', this.setup.zone).tint ?? 0xffffff));
      if (f.kind === 'shade') s.setAlpha(r.t < f.windUntil ? 0.25 : 1);
      if (f === r.boss && r.t < f.windUntil && !e.flash) s.setTint(0xff6b6b);
      else if (f === r.boss && !e.flash && f.kind === 'boss' && s.isTinted && r.t >= f.dashUntil) s.clearTint();
    }
    for (const [id, e] of this.foes)
      if (!seen.has(id)) {
        e.s.destroy();
        this.foes.delete(id);
      }
    if (this.bossLabel && r.boss) {
      this.bossLabel.setPosition(r.boss.x, r.boss.y - 34 * BOSS_LOOKS[this.setup.zone.boss].scale);
      if (this.setup.zone.boss === 'tomorrow') {
        const far = Math.hypot(r.boss.x - r.hero.x, r.boss.y - r.hero.y) > 200;
        this.bossLabel.setText(far ? 'Zzz... later...' : '');
      }
    }

    this.syncMap(this.bullets, r.bullets, (b) => this.add.image(b.x, b.y, b.boss && b.style === 'plain' ? 'bullet-boss' : SHOT_TEX[b.style]).setDepth(80000), (img, b) => {
      if (b.style === 'wiggle') img.setRotation(r.t * 6 + b.id);
    });
    for (const b of r.terrain.barrels)
      if (!b.alive && this.barrels.has(b.id)) {
        this.barrels.get(b.id)!.destroy();
        this.barrels.delete(b.id);
      }
    if (this.shrine && r.terrain.shrine?.used) this.shrine.setTint(0x57534e);
    this.syncMap(this.shots, r.shots, (s) => this.add.image(s.x, s.y, s.kind).setDepth(80001), (img, s) => img.setRotation(Math.atan2(s.vy, s.vx)));
    this.syncMap(this.gems, r.gems, (g) => this.add.image(g.x, g.y, g.value >= 3 ? 'gem-big' : 'gem').setDepth(1));

    // Your flame's fires, circling you.
    while (this.flames.length < r.flames) this.flames.push(this.add.sprite(r.hero.x, r.hero.y, 'ember').play('ember').setScale(0.42));
    this.flames.forEach((fl, i) => {
      const a = r.orbit + (i / Math.max(1, r.flames)) * Math.PI * 2;
      fl.setPosition(r.hero.x + Math.cos(a) * FLAME_RING, r.hero.y + Math.sin(a) * FLAME_RING).setDepth(fl.y + 1);
    });

    const g = this.shadows.clear().fillStyle(0x000000, 0.3);
    g.fillEllipse(r.hero.x, r.hero.y + 22, 30, 9);
    for (const f of r.foes) if (f.alive) g.fillEllipse(f.x, f.y + f.def.r + 6, f.def.r * 2.6, f.def.r * 0.8);
    // Elites stand on a gold ring.
    g.lineStyle(2, 0xfbbf24, 0.8);
    for (const f of r.foes) if (f.alive && f.elite) g.strokeEllipse(f.x, f.y + f.def.r + 4, f.def.r * 3, f.def.r);
  }

  private syncMap<T extends { id: number; x: number; y: number }>(
    map: Map<number, Phaser.GameObjects.Image>,
    list: T[],
    make: (t: T) => Phaser.GameObjects.Image,
    each?: (img: Phaser.GameObjects.Image, t: T) => void,
  ) {
    const seen = new Set<number>();
    for (const t of list) {
      seen.add(t.id);
      let img = map.get(t.id);
      if (!img) {
        img = make(t);
        map.set(t.id, img);
      }
      img.setPosition(t.x, t.y);
      each?.(img, t);
    }
    for (const [id, img] of map)
      if (!seen.has(id)) {
        img.destroy();
        map.delete(id);
      }
  }

  // ---------- what happened: light, sparks, sound ----------

  private react(e: GameEvent) {
    const now = this.time.now;
    switch (e.type) {
      case 'attack': {
        this.hero.play('heroAttack');
        this.hero.setFlipX(Math.cos(e.angle) < 0);
        this.sfx(SFX[e.kind]);
        if (e.kind === 'slash') {
          const R = e.r ?? 80,
            x = e.x,
            y = e.y;
          for (let i = 0; i < e.n; i++) {
            const a = e.angle + (i * Math.PI * 2) / e.n;
            this.fade(160, (g, p) => {
              g.lineStyle(7 * (1 - p) + 1, 0xfef3c7, 0.9 * (1 - p)).beginPath();
              g.arc(x, y, R * (0.75 + 0.25 * p), a - 1.2, a + 1.2);
              g.strokePath();
            });
          }
        }
        break;
      }
      case 'hit': {
        const ent = this.foes.get(e.id);
        if (ent) {
          ent.s.setTintFill(0xffffff);
          ent.flash = now + 50;
          ent.squash = now + 90;
        }
        this.sparks.explode(2, e.x, e.y - 6);
        this.sfx(e.boss ? 'bossHit' : 'hit');
        this.number(e.x, e.y - 18, e.dmg);
        break;
      }
      case 'kill': {
        const look = looks(e.kind, this.setup.zone);
        const boss = e.kind === 'boss',
          R = 30 * look.scale,
          x = e.x,
          y = e.y;
        for (const c of look.bits) {
          this.bits.particleTint = c;
          this.bits.explode(boss ? 24 : e.kind === 'golem' ? 10 : 4, x, y);
        }
        this.fade(boss ? 600 : 220, (g, p) => {
          g.fillStyle(0xffffff, 0.5 * (1 - p)).fillCircle(x, y, R * (0.4 + 0.4 * p));
          g.lineStyle(3 * (1 - p) + 1, 0xffffff, 0.8 * (1 - p)).strokeCircle(x, y, R * (0.5 + 0.9 * p));
        });
        // the Splitter bursts into its three Splitlings
        if (e.kind === 'splitter') {
          const pop = this.add.sprite(x, y, 'splitterPop').setScale(look.scale).setDepth(y).play('splitterPop');
          pop.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => pop.destroy());
        }
        if (e.kind === 'golem' || boss) this.cameras.main.shake(150, 0.005);
        this.sfx('kill', e.kind === 'golem' || boss ? 0.6 : e.kind === 'wisp' ? 1.3 : 1);
        if (boss) this.bossLabel?.destroy();
        break;
      }
      case 'hurt':
        this.cameras.main.shake(120, 0.006);
        this.cameras.main.flash(120, 140, 20, 20);
        this.sfx('hurt');
        this.bits.particleTint = 0xef4444;
        this.bits.explode(6, e.x, e.y);
        this.number(e.x, e.y - 26, e.dmg, '#fca5a5');
        break;
      case 'shoot':
        this.sparks.explode(e.boss ? 3 : 1, e.x, e.y);
        break;
      case 'burst': {
        const color = { nova: 0xf8fafc, orb: 0xa78bfa, wave: 0xfbbf24, fire: 0xf97316, ability: 0x7dd3fc }[e.color],
          { x, y, r: R } = e;
        if (e.color === 'nova') this.sfx('nova');
        if (e.color === 'wave') this.sfx('wave');
        this.fade(260, (g, p) => {
          g.lineStyle(5 * (1 - p) + 1, color, 0.8 * (1 - p)).strokeCircle(x, y, R * (0.3 + 0.7 * p));
          g.fillStyle(color, 0.12 * (1 - p)).fillCircle(x, y, R * (0.3 + 0.7 * p));
        });
        break;
      }
      case 'chain': {
        const zig = e.points.map((p, i) => (i === 0 ? p : { x: p.x + Phaser.Math.Between(-6, 6), y: p.y + Phaser.Math.Between(-6, 6) }));
        this.sfx('spark');
        this.fade(140, (g, p) => {
          g.lineStyle(3, 0x67e8f9, 1 - p);
          for (let i = 1; i < zig.length; i++) g.lineBetween(zig[i - 1].x, zig[i - 1].y, zig[i].x, zig[i].y);
        });
        break;
      }
      case 'ability': {
        const { x, y, toX, toY } = e;
        this.sfx(e.id === 'volley' ? 'arrow' : e.id === 'still' ? 'nova' : 'dash');
        this.cameras.main.shake(100, 0.004);
        if (e.id === 'charge' || e.id === 'dash' || e.id === 'blink') {
          this.fade(300, (g, p) => g.lineStyle(10 * (1 - p) + 2, 0x7dd3fc, 0.6 * (1 - p)).lineBetween(x, y, toX, toY));
          this.puffs.explode(10, x, y + 10);
        }
        if (e.id === 'still') this.fade(500, (g, p) => g.lineStyle(4, 0x86efac, 0.8 * (1 - p)).strokeCircle(x, y, 30 + 120 * p));
        break;
      }
      case 'heal':
        this.number(e.x, e.y - 30, e.n, HEAL);
        this.bits.particleTint = 0x86efac;
        this.bits.explode(16, e.x, e.y);
        break;
      case 'gem':
        this.sfx('gem');
        break;
      case 'spawn':
        this.puffs.explode(5, e.x, e.y + 20);
        if (e.kind === 'golem') {
          this.sfx('stomp');
          this.cameras.main.shake(180, 0.004);
        }
        break;
      case 'room':
        this.cameras.main.fadeIn(250, 7, 8, 13);
        this.newRoom();
        break;
      case 'boom': {
        const { x, y, r: R } = e;
        this.sfx('stomp', 1.2);
        this.cameras.main.shake(140, 0.006);
        this.bits.particleTint = 0xf97316;
        this.bits.explode(14, x, y);
        this.puffs.explode(8, x, y);
        this.fade(380, (g, p) => {
          g.fillStyle(0xfde68a, 0.5 * (1 - p)).fillCircle(x, y, R * (0.3 + 0.5 * p));
          g.lineStyle(4 * (1 - p) + 1, 0xf97316, 0.9 * (1 - p)).strokeCircle(x, y, R * (0.4 + 0.6 * p));
        });
        break;
      }
      case 'blink': {
        this.puffs.explode(8, e.x, e.y + 10);
        this.puffs.explode(8, e.toX, e.toY + 10);
        this.sfx('dash', 0.8);
        break;
      }
      case 'wind':
        this.sfx('stomp', 1.6);
        break;
      case 'shrine': {
        const { x, y } = e;
        this.sfx('nova', 1.4);
        this.fade(700, (g, p) => g.lineStyle(3, 0x86efac, 0.9 * (1 - p)).strokeCircle(x, y - 10, 14 + 60 * p));
        this.bus.say('The shrine restores you.');
        break;
      }
      case 'clear': {
        const r = this.run;
        this.drawRoom();
        this.sfx('nova', 0.7);
        // What's behind each door, written over it.
        const single = r.doors.length === 1,
          last = r.floor === r.layout.floors - 1 && r.room === r.layout.rooms - 2;
        for (const d of r.doors) {
          const look = single ? { label: last ? 'BOSS' : 'STAIRS', color: last ? 0xa855f7 : 0xfbbf24 } : DOOR_LOOK[d.kind];
          this.roomBits.push(
            this.add
              .text(d.x, ROOM.wall + 34, look.label, { fontFamily: '"Press Start 2P", monospace', fontSize: '9px', color: `#${look.color.toString(16).padStart(6, '0')}`, stroke: '#0b0d14', strokeThickness: 3 })
              .setOrigin(0.5, 0)
              .setDepth(96000),
          );
        }
        if (r.chest) {
          this.chest?.destroy();
          this.chest = this.add.image(r.chest.x, r.chest.y + 10, 'chest').setOrigin(0.5, 1).setDepth(r.chest.y);
          this.roomBits.push(this.chest);
          this.puffs.explode(10, r.chest.x, r.chest.y);
        }
        this.bus.say(single ? (last ? 'Room clear. The boss is through that door.' : 'Room clear. The stairs go down.') : r.chest ? 'Room clear. Open the chest, then pick a door.' : 'Room clear. Pick a door: each says what waits behind it.');
        break;
      }
      case 'chest':
        this.chest?.setTexture('chest-open');
        this.sparks.explode(30, e.x, e.y - 10);
        this.sfx('gem', 0.6);
        break;
      case 'relic':
        this.bus.say(`${RELICS[e.id].name}: ${RELICS[e.id].text}`);
        break;
      case 'ward': {
        const { x, y } = e;
        this.sfx('bossHit', 1.6);
        this.fade(400, (g, p) => g.lineStyle(4 * (1 - p) + 1, 0x7dd3fc, 1 - p).strokeCircle(x, y, 22 + 30 * p));
        break;
      }
      case 'floor':
        this.bus.floor(e.floor + 1);
        break;
      case 'boss': {
        const b = this.run.boss!;
        this.bossLabel = this.add
          .text(b.x, b.y, '', { fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#fecaca', stroke: '#0b0d14', strokeThickness: 3, align: 'center' })
          .setOrigin(0.5, 1)
          .setDepth(96000);
        this.cameras.main.flash(400, 60, 20, 90);
        this.cameras.main.shake(700, 0.008);
        this.sfx('roar');
        this.bus.boss();
        break;
      }
      case 'dash': {
        const { x, y, toX, toY } = e;
        this.sfx('dash');
        this.fade(700, (g, p) => g.lineStyle(10, 0xef4444, 0.15 + 0.3 * p).lineBetween(x, y, toX, toY));
        break;
      }
      case 'shout': {
        const { x, y } = e;
        this.sfx('roar', 1.3);
        this.cameras.main.shake(300, 0.006);
        this.bossLabel?.setText('NOT GOOD ENOUGH!');
        this.time.delayedCall(1800, () => this.bossLabel?.setText(''));
        this.fade(500, (g, p) => g.lineStyle(6 * (1 - p) + 1, 0xfecaca, 0.8 * (1 - p)).strokeCircle(x, y, 40 + 220 * p));
        break;
      }
      case 'say':
        this.bus.say(e.text);
        break;
    }
  }

  private number(x: number, y: number, n: number, color?: string) {
    const t = this.numbers.find((x) => !x.visible);
    if (!t) return;
    const big = n >= 30;
    t.setText(color === HEAL ? `+${n}` : String(n))
      .setColor(color ?? (big ? '#fbbf24' : '#ffffff'))
      .setFontSize(big ? 11 : 8)
      .setPosition(x + Phaser.Math.Between(-6, 6), y)
      .setVisible(true)
      .setAlpha(1)
      .setScale(big ? 1.4 : 1);
    this.tweens.add({ targets: t, y: y - (big ? 26 : 18), alpha: 0, scale: 1, duration: big ? 600 : 450, onComplete: () => t.setVisible(false) });
  }

  private fade(ms: number, draw: (g: Phaser.GameObjects.Graphics, p: number) => void) {
    this.fading.push({ draw, start: this.time.now, ms });
  }

  private drawFx() {
    const now = this.time.now,
      r = this.run;
    this.fx.clear();
    this.fading = this.fading.filter((f) => {
      const p = (now - f.start) / f.ms;
      if (p >= 1) return false;
      f.draw(this.fx, p);
      return true;
    });
    // Tomorrow's reach, so it's clear where waiting starts.
    if (r.boss?.alive && this.setup.zone.boss === 'tomorrow') {
      const far = Math.hypot(r.boss.x - r.hero.x, r.boss.y - r.hero.y) > 200;
      this.fx.lineStyle(2, far ? 0x86efac : 0x94a3b8, far ? 0.5 : 0.18).strokeCircle(r.boss.x, r.boss.y, 200);
    }
    // The way out, once open.
    if (r.doorOpen) {
      const p = (Math.sin(now / 200) + 1) / 2;
      for (const d of r.doors) this.fx.fillStyle(r.doors.length > 1 ? DOOR_LOOK[d.kind].color : 0xfbbf24, 0.15 + 0.2 * p).fillTriangle(d.x - 10, ROOM.wall + 26, d.x + 10, ROOM.wall + 26, d.x, ROOM.wall + 12);
    }
    // The ward, while it's up.
    if (relic(r, 'charm') && r.t >= r.wardAt) this.fx.lineStyle(2, 0x7dd3fc, 0.35 + 0.15 * Math.sin(now / 180)).strokeCircle(r.hero.x, r.hero.y, 24);
    // A ram's line before it charges.
    for (const f of r.foes) {
      if (!f.alive) continue;
      if (f.kind === 'ram' && r.t < f.windUntil) {
        const p = 1 - (f.windUntil - r.t) / 0.75,
          len = 330 * 0.6;
        this.fx.lineStyle(f.def.r * 2, 0xef4444, 0.1 + 0.25 * p).lineBetween(f.x, f.y, f.x + f.dashX * len, f.y + f.dashY * len);
      }
      // Where a shade will land.
      if (f.kind === 'shade' && r.t < f.windUntil) {
        const p = 1 - (f.windUntil - r.t) / 0.8;
        this.fx.lineStyle(2, 0xa78bfa, 0.9).strokeCircle(f.dashX, f.dashY, 26 - 10 * p);
        this.fx.fillStyle(0x6b21a8, 0.2 + 0.3 * p).fillCircle(f.dashX, f.dashY, 16);
      }
    }
    // Smoke bombs: in the air, then a circle filling up until it bursts.
    for (const m of r.mines) {
      if (r.t < m.lands) {
        const p = 1 - (m.lands - r.t) / 0.55;
        this.fx.fillStyle(0x000000, 0.25).fillCircle(m.x, m.y, 4 + 6 * p);
        this.fx.fillStyle(0xc4b5fd).fillCircle(m.x, m.y - 40 * Math.sin(Math.PI * p), 5);
      } else {
        const p = 1 - (m.at - r.t) / 1.1;
        this.fx.lineStyle(2, 0xc084fc, 0.9).strokeCircle(m.x, m.y, m.r);
        this.fx.fillStyle(0xa855f7, 0.1 + 0.3 * p).fillCircle(m.x, m.y, m.r * p);
        this.fx.fillStyle(0xe9d5ff).fillCircle(m.x, m.y, 4);
      }
    }
    this.drawGround();
  }

  /** Water that ripples, and spikes: flat, then a red warning, then up. */
  private drawGround() {
    const r = this.run,
      g = this.ground.clear(),
      now = this.time.now;
    // Pools: a stone rim, deep water darkest under the near edge, light dancing on the surface.
    const T = this.theme,
      water = T.water.map(hex),
      S = T.stone.map(hex);
    for (const q of r.terrain.water) {
      g.fillStyle(S[3]).fillRect(q.x - 3, q.y - 3, q.w + 6, q.h + 6);
      g.fillStyle(S[5]).fillRect(q.x - 3, q.y + q.h, q.w + 6, 2);
      g.fillStyle(water[1]).fillRect(q.x, q.y, q.w, q.h);
      g.fillStyle(water[0]).fillRect(q.x, q.y, q.w, 6);
      g.fillStyle(water[2], 0.45).fillRect(q.x, q.y + q.h - 6, q.w, 6);
      for (let i = 0; i < 6; i++) {
        const y = q.y + 10 + ((i + 0.5) * (q.h - 16)) / 6,
          x = q.x + 6 + ((now / 30 + i * 37) % (q.w - 28)),
          len = 8 + (i % 3) * 4;
        g.fillStyle(water[3], 0.55).fillRect(x, y, len, 2);
        g.fillStyle(water[2], 0.6).fillRect(x + 3, y + 2, len - 4, 1);
      }
      // a glint that comes and goes
      const k = Math.floor(now / 220) % 9;
      if (k < 3) g.fillStyle(0xffffff, 0.8 - k * 0.25).fillRect(q.x + ((q.w * 0.3 + q.x) % (q.w - 10)) + 4, q.y + q.h * 0.4, 2, 2);
    }
    // Spike plates, set into the floor. Down: dark sockets, the tips just showing. Warning: the
    // sockets glow red, the plate's edge pulses and the tips start to rise. Up: tall steel spikes.
    const steel = R.silver.map(hex),
      iron = R.iron.map(hex),
      pulse = 0.5 + 0.5 * Math.sin(now / 55);
    for (const q of r.terrain.spikes) {
      const st = spikeState(q, r.t);
      g.fillStyle(S[0]).fillRect(q.x, q.y, q.w, q.h);
      g.fillStyle(S[2]).fillRect(q.x + 2, q.y + 2, q.w - 4, q.h - 4);
      g.fillStyle(S[3]).fillRect(q.x + 2, q.y + 2, q.w - 4, 1).fillRect(q.x + 2, q.y + 2, 1, q.h - 4);
      if (st === 'warn') {
        g.fillStyle(0x7f1d1d, 0.25 + 0.2 * pulse).fillRect(q.x + 2, q.y + 2, q.w - 4, q.h - 4);
        g.lineStyle(2, 0xef4444, 0.45 + 0.45 * pulse).strokeRect(q.x + 1, q.y + 1, q.w - 2, q.h - 2);
      }
      for (let x = q.x + 12; x < q.x + q.w; x += 24)
        for (let y = q.y + 12; y < q.y + q.h; y += 24)
          for (const cx of [x - 6, x, x + 6]) {
            const base = y + 6 - (cx === x ? 3 : 0);
            // the socket
            g.fillStyle(st === 'warn' ? 0xef4444 : S[0], st === 'warn' ? 0.6 + 0.4 * pulse : 1).fillRect(cx - 2, base - 1, 5, 3);
            if (st === 'up') {
              // a spike: stacked 2px rows widening to the base, lit on the left, shade on the right
              g.fillStyle(0x000000, 0.3).fillRect(cx + 1, base, 5, 2);
              [1, 1, 2, 2, 2, 3, 3].forEach((half, k) => {
                const yy = base - 14 + k * 2;
                g.fillStyle(steel[1]).fillRect(cx - half + 1, yy, half * 2 - 1, 2);
                g.fillStyle(steel[2]).fillRect(cx - half + 1, yy, 1, 2);
                g.fillStyle(steel[0]).fillRect(cx + half - 1, yy, 1, 2);
              });
            } else if (st === 'warn') g.fillStyle(iron[2]).fillRect(cx, base - 4, 1, 3).fillRect(cx - 1, base - 2, 3, 1);
            else g.fillStyle(iron[1]).fillRect(cx, base - 1, 1, 1);
          }
    }
    // Torch flames: a tongue of fire that never sits still, in the theme's color.
    const l = this.torchFire.clear(),
      fire = T.fire.map(hex);
    this.torches.forEach((t, i) => {
      const k = Math.floor(now / 110 + i * 3) % 4,
        sway = k === 1 ? -1 : k === 3 ? 1 : 0,
        lick = k % 2;
      l.fillStyle(fire[0]).fillRect(t.x - 5, t.y - 12, 10, 6);
      l.fillStyle(fire[1]).fillRect(t.x - 4, t.y - 17, 8, 10);
      l.fillStyle(fire[1]).fillRect(t.x - 3 + sway, t.y - 22 - lick, 6, 6);
      l.fillStyle(fire[1]).fillRect(t.x - 1 + sway * 2, t.y - 26 - lick, 2, 4);
      l.fillStyle(fire[2]).fillRect(t.x - 3, t.y - 15, 6, 7);
      l.fillStyle(fire[2]).fillRect(t.x - 2 + sway, t.y - 19 - lick, 4, 4);
      l.fillStyle(fire[3]).fillRect(t.x - 2, t.y - 13, 4, 4);
      // an ember drifting up now and then
      if ((Math.floor(now / 160) + i) % 5 === 0) l.fillStyle(fire[2]).fillRect(t.x + sway * 3, t.y - 30 - ((now / 20) % 6), 1, 1);
    });
    if (r.terrain.shrine && !r.terrain.shrine.used) {
      const { x, y } = r.terrain.shrine;
      g.fillStyle(0x86efac, 0.12 + 0.08 * Math.sin(now / 250)).fillCircle(x, y, SHRINE.r + 14);
    }
  }

  /** A screen point, for drawing on the pad (which the camera's zoom would otherwise scale). */
  private onPad(x: number, y: number): [number, number] {
    const cam = this.cameras.main,
      cx = cam.width / 2,
      cy = cam.height / 2;
    return [(x - cx) / cam.zoom + cx, (y - cy) / cam.zoom + cy];
  }

  private drawPad() {
    this.pad.clear();
    // What's off the screen: marks on the edge (red monsters, violet boss, the open door in gold).
    const cam = this.cameras.main,
      v = cam.worldView,
      r = this.run,
      edge = (x: number, y: number, color: number, size: number) => {
        if (v.contains(x, y)) return;
        const sx = Phaser.Math.Clamp((x - v.x) * cam.zoom, 14, cam.width - 14),
          sy = Phaser.Math.Clamp((y - v.y) * cam.zoom, 84, cam.height - 14),
          a = Math.atan2((y - v.y) * cam.zoom - sy, (x - v.x) * cam.zoom - sx),
          [px, py] = this.onPad(sx, sy),
          k = size / cam.zoom;
        this.pad.fillStyle(color, 0.85).fillTriangle(px + Math.cos(a) * k, py + Math.sin(a) * k, px + Math.cos(a + 2.4) * k * 0.7, py + Math.sin(a + 2.4) * k * 0.7, px + Math.cos(a - 2.4) * k * 0.7, py + Math.sin(a - 2.4) * k * 0.7);
      };
    for (const f of r.foes) if (f.alive) edge(f.x, f.y, f === r.boss ? 0xa855f7 : 0xef4444, f === r.boss ? 14 : 8);
    if (r.doorOpen) for (const d of r.doors) edge(d.x, ROOM.wall, r.doors.length > 1 ? DOOR_LOOK[d.kind].color : 0xfbbf24, 14);
    if (r.chest && !r.chest.opened) edge(r.chest.x, r.chest.y, 0xfbbf24, 10);
    if (r.terrain.shrine && !r.terrain.shrine.used && r.hp < r.maxHp * 0.6) edge(r.terrain.shrine.x, r.terrain.shrine.y, 0x86efac, 10);
    if (!this.stick) return;
    const [sx, sy] = this.onPad(this.stick.x, this.stick.y),
      k = 1 / cam.zoom;
    this.pad.fillStyle(0xffffff, 0.12).fillCircle(sx, sy, 46 * k);
    this.pad.lineStyle(2 * k, 0xffffff, 0.25).strokeCircle(sx, sy, 46 * k);
    this.pad.fillStyle(0xfbbf24, 0.6).fillCircle(sx + this.stick.dx * k, sy + this.stick.dy * k, 18 * k);
  }

  private sfx(id: SfxId, pitch?: number) {
    music.sfx(id, pitch);
  }

  // ---------- from the page ----------

  pick(id: UpgradeId) {
    this.offered = false;
    pick(this.run, id);
    const h = this.hero;
    this.fade(450, (g, p) => g.lineStyle(4 * (1 - p) + 1, 0xfbbf24, 0.9 * (1 - p)).strokeCircle(h.x, h.y, 24 + 80 * p));
  }

  ability() {
    this.wantAbility = true;
  }

  setPaused(on: boolean) {
    this.paused = on;
    this.run.paused = on;
  }

  skipToBoss() {
    skipToBoss(this.run);
    for (const e of takeEvents(this.run)) this.react(e);
  }

  winNow() {
    winNow(this.run);
  }

  pickRelic(id: RelicId) {
    this.offered = false;
    pickRelic(this.run, id);
    for (const e of takeEvents(this.run)) this.react(e);
    const h = this.hero;
    this.fade(450, (g, p) => g.lineStyle(4 * (1 - p) + 1, 0xfbbf24, 0.9 * (1 - p)).strokeCircle(h.x, h.y, 24 + 80 * p));
  }

  skipFloor() {
    skipFloor(this.run);
    for (const e of takeEvents(this.run)) this.react(e);
  }
}

export function startRun(parent: HTMLElement, setup: RunSetup, events: RunEvents): RunHandle {
  const scene = new DungeonScene(setup, events);
  const game = new Phaser.Game({
    type: setup.fast ? Phaser.HEADLESS : Phaser.AUTO,
    parent,
    backgroundColor: '#07080d',
    pixelArt: true,
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    input: { activePointers: 2 },
    scene: [scene],
  });
  return {
    pick: (id) => scene.pick(id),
    ability: () => scene.ability(),
    pause: () => scene.setPaused(true),
    resume: () => scene.setPaused(false),
    skipToBoss: () => scene.skipToBoss(),
    skipFloor: () => scene.skipFloor(),
    cycleTheme: () => scene.cycleTheme(),
    pickRelic: (id) => scene.pickRelic(id),
    winNow: () => scene.winNow(),
    autopilot: (on) => (scene.bot = on),
    destroy: () => game.destroy(true),
  };
}

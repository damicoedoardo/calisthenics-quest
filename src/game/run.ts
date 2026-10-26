import * as Phaser from 'phaser';
import type { ClassId } from '@/lib/gear';
import { RUN_SECONDS, rollUpgrades, xpToNext, type Power, type UpgradeId, type Zone } from '@/lib/fog';
import type { FogBoss } from '@/story/types';
import { music, type SfxId } from '@/lib/music';
import type { Sheet } from '@/sprites/registry';

/* One run in the Fog, as a Phaser scene. You move; your hero attacks on its own in the class's
   style; Fog creatures come in waves; each one leaves light that levels you up, and each level
   lets you pick a skill. At RUN_SECONDS the zone's boss walks out, and each boss fights in a way
   only its chapter's lesson beats (see BOSS below).
   Only this file and the files it imports touch Phaser, and it is loaded only when a run starts. */

export type SheetKey = 'hero' | 'heroAttack' | 'ember' | 'hollow' | 'slime' | 'wisp' | 'mirror' | 'golem' | 'knight' | 'echo';

/** Why a skill is free at the start of a run. */
export type FreePick = 'fresh' | 'rested';

export interface RunSetup {
  zone: Zone;
  power: Power;
  classId: ClassId | undefined;
  sheets: Record<SheetKey, Sheet>;
  /** The bot plays: it moves and picks skills on its own (developer mode, balance tests). */
  autopilot?: boolean;
  /** Play the whole run as fast as the computer can, without drawing it (balance tests). */
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
}

export interface RunEnd {
  won: boolean;
  seconds: number;
  kills: number;
  level: number;
  /** HP left at the end, for balance tests. */
  hp: number;
  maxHp: number;
  /** When the boss walked out (s), if it did. */
  bossAt: number | null;
}

export interface RunEvents {
  hud: (h: Hud) => void;
  /** A pick is waiting: `free` says why it's free (trained recently, or rested), null for a level-up. */
  levelUp: (choices: UpgradeId[], levels: Partial<Record<UpgradeId, number>>, free: FreePick | null) => void;
  boss: () => void;
  /** Something the run says out loud: the Knight's shout, a hit on a reflection, the fairy's heal. */
  say: (text: string) => void;
  end: (r: RunEnd) => void;
}

export interface RunHandle {
  pick: (id: UpgradeId) => void;
  pause: () => void;
  resume: () => void;
  skipToBoss: () => void;
  winNow: () => void;
  /** Hand the run to the bot, or take it back. */
  autopilot: (on: boolean) => void;
  destroy: () => void;
}

/** Skills the bot takes first. */
const BOT_PICKS: UpgradeId[] = ['multi', 'power', 'haste', 'vital', 'spark', 'flame', 'nova', 'guard', 'swift', 'magnet'];

const WORLD = 2400;
const HERO_SPEED = 150;
const HERO_HP = 100;
const MAX_FOES = 120;
const INVULNERABLE_MS = 600;
/** How far ranged attacks look for a target: about the width of a phone screen. */
const RANGE = 240;
/** A sword swings only at what it can reach, so it never whiffs on a foe still walking in. */
const SLASH_REACH = 90;

type FoeKind = 'slime' | 'wisp' | 'mirror' | 'golem' | 'reflection' | 'boss';

interface Stats {
  hp: number;
  speed: number;
  dmg: number;
  xp: number;
  scale: number;
  r: number;
  bits: number[];
  /** Its sprite sheet. */
  tex: SheetKey;
}

const FOES: Record<Exclude<FoeKind, 'boss'>, Stats> = {
  slime: { hp: 12, speed: 52, dmg: 7, xp: 1, scale: 0.55, r: 14, bits: [0x94a3b8, 0x5b74c4, 0xe2e8f0], tex: 'slime' },
  wisp: { hp: 8, speed: 88, dmg: 5, xp: 1, scale: 0.5, r: 13, bits: [0xf97316, 0xfde68a, 0x6b7280], tex: 'wisp' },
  mirror: { hp: 34, speed: 66, dmg: 11, xp: 3, scale: 0.65, r: 15, bits: [0xe2e8f0, 0xcbd5e1, 0xffffff], tex: 'mirror' },
  golem: { hp: 160, speed: 42, dmg: 18, xp: 10, scale: 0.95, r: 18, bits: [0xa8a29e, 0x78716c, 0x84cc16], tex: 'golem' },
  // A golden copy of you, sent by the Mirror. Hitting it hurts you.
  reflection: { hp: 30, speed: 78, dmg: 8, xp: 0, scale: 0.75, r: 12, bits: [0xfde68a, 0xfbbf24, 0xffffff], tex: 'echo' },
};

/** The Perfect Knight's armor: every hit breaks one plate, however weak. */
const KNIGHT_PLATES = 40;

/**
 * The bosses. Each one's rule is its chapter's lesson:
 * - Tomorrow heals while you keep your distance and splits off small Tomorrows: get close.
 * - The Mirror sends reflections of you, and hitting them hurts you: walk past them.
 * - The Perfect Knight wears plates that any hit breaks, and shouts to push you away: keep hitting.
 * - The Hollow dashes and calls the fog (the Plateau and the Summit fight like it for now).
 */
const BOSSES: Record<FogBoss, Stats> = {
  tomorrow: { hp: 2000, speed: 46, dmg: 16, xp: 0, scale: 1.5, r: 20, bits: [0x94a3b8, 0x5b74c4, 0xe2e8f0], tex: 'slime' },
  mirror: { hp: 480, speed: 36, dmg: 16, xp: 0, scale: 1.35, r: 16, bits: [0xe2e8f0, 0xcbd5e1, 0xffffff], tex: 'mirror' },
  knight: { hp: KNIGHT_PLATES, speed: 62, dmg: 18, xp: 0, scale: 1.15, r: 14, bits: [0xe2e8f0, 0x94a3b8, 0xdc2626], tex: 'knight' },
  plateau: { hp: 650, speed: 70, dmg: 20, xp: 0, scale: 1.5, r: 13, bits: [0xa78bfa, 0x6b21a8, 0xffffff], tex: 'hollow' },
  hollow: { hp: 650, speed: 70, dmg: 20, xp: 0, scale: 1.5, r: 13, bits: [0xa78bfa, 0x6b21a8, 0xffffff], tex: 'hollow' },
  summit: { hp: 650, speed: 70, dmg: 20, xp: 0, scale: 1.5, r: 13, bits: [0xa78bfa, 0x6b21a8, 0xffffff], tex: 'hollow' },
};

const HEAL = '#86efac';

/** A boss you can't bring down in this long (s) means you need more training: the Fog closes in. */
const BOSS_LIMIT = 180;

/** Tomorrow heals while you're further than this. */
const TOMORROW_REACH = 200;

/** The sound each class's attack makes. */
const ATTACK_SFX: Record<'slash' | 'arrow' | 'orb' | 'wave', SfxId> = { slash: 'slash', arrow: 'arrow', orb: 'orb', wave: 'wave' };
/** How long a creature takes to rise out of the fog (ms). */
const RISE_MS = 280;

/** Base attack per class: how often it fires (s) and how hard it hits. */
const ATTACK: Record<'slash' | 'arrow' | 'orb' | 'wave', { cd: number; dmg: number }> = {
  slash: { cd: 0.9, dmg: 14 },
  arrow: { cd: 0.6, dmg: 10 },
  orb: { cd: 0.8, dmg: 15 },
  wave: { cd: 1.3, dmg: 11 },
};

function attackOf(cls: ClassId | undefined): keyof typeof ATTACK {
  return cls === 'archer' ? 'arrow' : cls === 'mage' ? 'orb' : cls === 'monk' ? 'wave' : 'slash';
}

class Foe extends Phaser.Physics.Arcade.Sprite {
  kind: FoeKind = 'slime';
  hp = 1;
  maxHp = 1;
  speed = 50;
  dmg = 5;
  xp = 1;
  /** Scale when standing still; hits and spawning squash it for a moment. */
  base = 1;
  bornAt = 0;
  squashUntil = 0;
  flashUntil = 0;
  knockUntil = 0;
  flameAt = 0;
  stats: Stats = FOES.slime;
  // The boss's dash: wind-up until windUntil, then a dash until dashUntil.
  windUntil = 0;
  dashUntil = 0;
  dashDir = new Phaser.Math.Vector2();
}

interface Shot {
  img: Phaser.Physics.Arcade.Image;
  dmg: number;
  pierce: number;
  homing: boolean;
  target: Foe | null;
  hit: Set<Foe>;
  dies: number;
}

interface Gem {
  img: Phaser.GameObjects.Image;
  value: number;
  pulled: boolean;
}

const hex = (c: string) => Phaser.Display.Color.HexStringToColor(c).color;

class RunScene extends Phaser.Scene {
  private hero!: Phaser.Physics.Arcade.Sprite;
  private foes!: Phaser.Physics.Arcade.Group;
  private shots: Shot[] = [];
  private gems: Gem[] = [];
  private flames: Phaser.GameObjects.Sprite[] = [];
  private fx!: Phaser.GameObjects.Graphics;
  private pad!: Phaser.GameObjects.Graphics;
  private ash!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bits!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffs!: Phaser.GameObjects.Particles.ParticleEmitter;
  private shadows!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Image;
  private numbers: Phaser.GameObjects.Text[] = [];
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private stick: { id: number; x: number; y: number; dx: number; dy: number } | null = null;
  private fading: { draw: (g: Phaser.GameObjects.Graphics, t: number) => void; start: number; ms: number }[] = [];

  private t = 0;
  private hp = HERO_HP;
  private maxHp = HERO_HP;
  private xp = 0;
  private level = 1;
  private kills = 0;
  private hurtUntil = 0;
  private facing = new Phaser.Math.Vector2(1, 0);
  private cd = { attack: 0.5, spawn: 0.5, spark: 2, nova: 3, fireball: 2.5, dust: 0, trail: 0, hud: 0 };
  private ups: Partial<Record<UpgradeId, number>> = {};
  private pendingLevels = 0;
  private boss: Foe | null = null;
  private bossSummon = 0;
  private bossDash = 0;
  /** Tomorrow: seconds spent far from it since its last split. The Knight: time to the next shout. */
  private bossClock = 0;
  /** The Knight's shout pushes you back until then. */
  private shoved = { until: 0, x: 0, y: 0 };
  /** Free skills still to offer at the start: for having trained recently, and for being rested. */
  private free: FreePick[] = [];
  /** Reflections hurt you only this often. */
  private mirrorHurtAt = 0;
  private fairyAt = 0;
  private bossLabel: Phaser.GameObjects.Text | null = null;
  private rings = new Set<number>();
  private elites = 0;
  private over = false;
  private orbit = 0;
  /** Seconds since the last frame. */
  private dt = 0;
  private bossAt: number | null = null;
  bot = false;

  constructor(
    private setup: RunSetup,
    private bus: RunEvents,
  ) {
    super('run');
  }

  preload() {
    for (const [key, s] of Object.entries(this.setup.sheets)) this.load.spritesheet(key, s.src, { frameWidth: s.w, frameHeight: s.h });
  }

  create() {
    const { zone, power } = this.setup;
    this.maxHp = this.hp = HERO_HP + power.hold;
    this.makeTextures();
    for (const [key, s] of Object.entries(this.setup.sheets)) {
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: s.frames - 1 }), frameRate: 1000 / s.ms, repeat: s.loop ? -1 : 0 });
    }

    this.physics.world.setBounds(0, 0, WORLD, WORLD);
    this.cameras.main.setBounds(0, 0, WORLD, WORLD).setBackgroundColor(zone.ground).setRoundPixels(true);
    this.add.tileSprite(0, 0, WORLD, WORLD, 'ground').setOrigin(0).setDepth(-2);
    for (let i = 0; i < 420; i++) {
      const key = ['stone', 'tuft', 'tuft', 'bone', 'stone', 'tuft', 'crack'][i % 7];
      this.add.image(Phaser.Math.Between(20, WORLD - 20), Phaser.Math.Between(20, WORLD - 20), key).setDepth(-1).setScale(key === 'crack' ? 2 : 1 + (i % 3) * 0.5);
    }
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(40, WORLD - 40),
        y = Phaser.Math.Between(80, WORLD - 40);
      this.add.image(x, y, 'tree').setOrigin(0.5, 1).setDepth(y).setScale(2);
    }
    const fogTint = hex(zone.fog);
    for (let i = 0; i < 60; i++) {
      const m = this.add
        .image(Phaser.Math.Between(0, WORLD), Phaser.Math.Between(0, WORLD), 'mist')
        .setTint(fogTint)
        .setAlpha(0.18)
        .setScale(Phaser.Math.FloatBetween(2.5, 5))
        .setDepth(150000);
      this.tweens.add({ targets: m, x: m.x + Phaser.Math.Between(-160, 160), y: m.y + Phaser.Math.Between(-60, 60), duration: Phaser.Math.Between(9000, 16000), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.hero = this.physics.add.sprite(WORLD / 2, WORLD / 2, 'hero').play('hero').setScale(0.8);
    (this.hero.body as Phaser.Physics.Arcade.Body).setCircle(12, 20, 30).setCollideWorldBounds(true);
    this.hero.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.hero.play('hero'));
    this.cameras.main.startFollow(this.hero, true, 0.15, 0.15);

    this.foes = this.physics.add.group({ classType: Foe });
    this.physics.add.collider(this.foes, this.foes);
    this.physics.add.overlap(this.hero, this.foes, (_h, f) => this.hurt(f as Foe));

    this.fx = this.add.graphics().setDepth(90000);
    // Under everything that stands on the ground, above the ground itself and its light.
    this.shadows = this.add.graphics().setDepth(0.5);
    this.puffs = this.add.particles(0, 0, 'mist', {
      emitting: false,
      speed: { min: 6, max: 26 },
      gravityY: -18,
      lifespan: { min: 380, max: 560 },
      alpha: { start: 0.45, end: 0 },
      scale: { start: 0.1, end: 0.26 },
      tint: Phaser.Display.Color.HexStringToColor(zone.fog).lighten(25).color,
    });
    this.puffs.setDepth(2);
    this.bits = this.add.particles(0, 0, 'dot', {
      emitting: false,
      speed: { min: 50, max: 170 },
      gravityY: 220,
      lifespan: { min: 280, max: 520 },
      alpha: { start: 1, end: 0 },
      scale: { start: 1.3, end: 0.4 },
    });
    this.bits.setDepth(90001);
    this.ash = this.add.particles(0, 0, 'dot', {
      emitting: false,
      speed: { min: 20, max: 110 },
      lifespan: 450,
      alpha: { start: 1, end: 0 },
      scale: { start: 1.4, end: 0.2 },
      tint: [0x9ca3af, 0x6b7280, 0xf97316],
    });
    this.ash.setDepth(90001);
    this.sparks = this.add.particles(0, 0, 'dot', {
      emitting: false,
      speed: { min: 60, max: 200 },
      lifespan: 300,
      alpha: { start: 1, end: 0 },
      tint: [0xfde68a, 0xfbbf24, 0xffffff],
    });
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

    this.vignette = this.add.image(0, 0, 'vignette').setScrollFactor(0).setDepth(200000);
    this.pad = this.add.graphics().setScrollFactor(0).setDepth(300000);
    this.fitScreen();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fitScreen());

    const kb = this.input.keyboard;
    if (kb) {
      const k = Phaser.Input.Keyboard.KeyCodes;
      this.keys = kb.addKeys({ up: k.UP, down: k.DOWN, left: k.LEFT, right: k.RIGHT, w: k.W, a: k.A, s: k.S, d: k.D }) as RunScene['keys'];
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

    this.syncFlames();
    this.free = [...(power.fresh ? (['fresh'] as const) : []), ...(power.rested ? (['rested'] as const) : [])];
    if (this.free.length) this.time.delayedCall(700, () => this.offer(this.free.shift()!));
    this.bot = !!this.setup.autopilot;
    if (this.setup.fast) this.fastForward();
  }

  /** Runs the game loop by hand, frame after frame without drawing, until the run ends. */
  private fastForward() {
    const loop = this.game.loop;
    loop.sleep();
    const frame = 1000 / 60;
    let t = this.time.now;
    let ended = false;
    this.events.once('run-ended', () => (ended = true));
    this.events.once(Phaser.Scenes.Events.DESTROY, () => (ended = true));
    const chunk = () => {
      for (let i = 0; i < 600 && !ended; i++) {
        t += frame;
        this.game.headlessStep(t, frame);
      }
      if (ended) loop.wake();
      else setTimeout(chunk, 0);
    };
    setTimeout(chunk, 0);
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
    const base = Phaser.Display.Color.HexStringToColor(zone.ground);
    const lighter = base.clone().lighten(8).color,
      darker = base.clone().darken(5).color;
    tex('ground', 64, 64, () => {
      g.fillStyle(base.color).fillRect(0, 0, 64, 64);
      const rnd = new Phaser.Math.RandomDataGenerator(['forma']);
      for (let i = 0; i < 24; i++) g.fillStyle(i % 2 ? lighter : darker).fillRect(rnd.between(0, 62), rnd.between(0, 62), rnd.between(1, 2), rnd.between(1, 2));
    });
    tex('stone', 10, 7, () => {
      g.fillStyle(0x3f3a4d).fillRect(1, 2, 8, 5).fillRect(2, 1, 6, 1);
      g.fillStyle(0x5b5570).fillRect(2, 2, 4, 2);
    });
    tex('tuft', 9, 7, () => {
      g.fillStyle(0x3a3346).fillRect(1, 3, 1, 4).fillRect(4, 1, 1, 6).fillRect(7, 2, 1, 5);
      g.fillStyle(0x4c4459).fillRect(3, 4, 1, 3).fillRect(5, 3, 1, 4);
    });
    tex('bone', 10, 4, () => {
      g.fillStyle(0x6b6478).fillRect(1, 1, 8, 2).fillRect(0, 0, 2, 4).fillRect(8, 0, 2, 4);
    });
    tex('dot', 3, 3, () => g.fillStyle(0xffffff).fillRect(0, 0, 3, 3));
    tex('crack', 14, 6, () => {
      g.fillStyle(darker).fillRect(0, 2, 5, 1).fillRect(4, 3, 4, 1).fillRect(7, 1, 4, 1).fillRect(10, 4, 4, 1);
    });
    tex('tree', 18, 26, () => {
      // A dead tree: a bent trunk and bare branches.
      g.fillStyle(0x2a2433).fillRect(8, 8, 3, 18).fillRect(7, 22, 5, 4);
      g.fillStyle(0x2a2433).fillRect(3, 6, 6, 2).fillRect(2, 3, 2, 4).fillRect(10, 10, 6, 2).fillRect(14, 6, 2, 5).fillRect(6, 0, 2, 7).fillRect(11, 2, 2, 7);
      g.fillStyle(0x3d3549).fillRect(9, 9, 1, 14).fillRect(4, 6, 3, 1).fillRect(11, 10, 3, 1);
    });
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
    tex('gem', 8, 10, () => {
      g.fillStyle(0x7dd3fc).fillPoints([new Phaser.Math.Vector2(4, 0), new Phaser.Math.Vector2(8, 5), new Phaser.Math.Vector2(4, 10), new Phaser.Math.Vector2(0, 5)], true);
      g.fillStyle(0xe0f2fe).fillRect(3, 2, 2, 3);
    });
    tex('gem-big', 10, 12, () => {
      g.fillStyle(0xfbbf24).fillPoints([new Phaser.Math.Vector2(5, 0), new Phaser.Math.Vector2(10, 6), new Phaser.Math.Vector2(5, 12), new Phaser.Math.Vector2(0, 6)], true);
      g.fillStyle(0xfef3c7).fillRect(4, 2, 2, 4);
    });
    tex('arrow', 16, 4, () => {
      g.fillStyle(0xd6d3d1).fillRect(0, 1, 12, 2);
      g.fillStyle(0xf8fafc).fillRect(12, 0, 2, 4).fillRect(14, 1, 2, 2);
      g.fillStyle(0xf97316).fillRect(0, 0, 3, 1).fillRect(0, 3, 3, 1);
    });
    tex('fireball', 14, 14, () => {
      g.fillStyle(0xf97316, 0.4).fillCircle(7, 7, 7);
      g.fillStyle(0xfb923c).fillCircle(7, 7, 5);
      g.fillStyle(0xfde047).fillCircle(7, 7, 3);
    });
    tex('orb', 14, 14, () => {
      g.fillStyle(0xa78bfa, 0.35).fillCircle(7, 7, 7);
      g.fillStyle(0xc4b5fd).fillCircle(7, 7, 4);
      g.fillStyle(0xffffff).fillCircle(6, 6, 2);
    });
    if (this.textures.exists('vignette')) this.textures.remove('vignette');
    const cv = this.textures.createCanvas('vignette', 256, 256);
    if (cv) {
      const ctx = cv.getContext(),
        grad = ctx.createRadialGradient(128, 128, 40, 128, 128, 128),
        fog = Phaser.Display.Color.HexStringToColor(zone.fog);
      grad.addColorStop(0, `rgba(${fog.red},${fog.green},${fog.blue},0)`);
      grad.addColorStop(0.55, `rgba(${fog.red},${fog.green},${fog.blue},0.2)`);
      grad.addColorStop(1, `rgba(${fog.red},${fog.green},${fog.blue},0.85)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
      cv.refresh();
    }
    g.destroy();
  }

  private fitScreen() {
    const { width, height } = this.scale.gameSize;
    this.vignette.setPosition(width / 2, height / 2).setDisplaySize(Math.max(width, height) * 1.25, Math.max(width, height) * 1.25);
  }

  // ---------- the loop ----------

  update(_time: number, deltaMs: number) {
    if (this.over) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    this.dt = dt;
    this.t += dt;
    this.move(dt);
    this.spawn(dt);
    this.steer();
    this.attack(dt);
    this.skills(dt);
    this.moveShots();
    this.pullGems();
    this.drawFx();
    this.drawShadows();
    this.hero.setDepth(this.hero.y);
    if (this.time.now < this.hurtUntil) this.hero.setAlpha(Math.floor(this.time.now / 80) % 2 ? 0.35 : 1);
    else this.hero.setAlpha(1);
    this.cd.hud -= dt;
    if (this.cd.hud <= 0) {
      this.cd.hud = 0.1;
      this.bus.hud(this.hud());
    }
  }

  private hud(): Hud {
    return {
      hp: Math.max(0, Math.ceil(this.hp)),
      maxHp: this.maxHp,
      xp: this.xp,
      xpNext: xpToNext(this.level),
      level: this.level,
      seconds: Math.floor(this.t),
      kills: this.kills,
      boss: this.boss ? { hp: Math.max(0, this.boss.hp), max: this.boss.maxHp } : null,
    };
  }

  private move(dt: number) {
    let x = 0,
      y = 0;
    if (this.bot) [x, y] = this.botMove();
    else if (this.stick) {
      x = this.stick.dx / 46;
      y = this.stick.dy / 46;
      if (Math.hypot(x, y) < 0.15) x = y = 0;
    } else if (this.keys) {
      const k = this.keys;
      x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
      y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const speed = HERO_SPEED * (1 + 0.12 * (this.ups.swift ?? 0));
    if (this.time.now < this.shoved.until) this.hero.setVelocity(this.shoved.x, this.shoved.y);
    else this.hero.setVelocity(x * speed, y * speed);
    if (len > 0.01) {
      this.facing.set(x, y).normalize();
      if (Math.abs(x) > 0.1) this.hero.setFlipX(x < 0);
      // A little run: bob up and down, lean into the move, kick up the fog at your feet.
      const bob = Math.sin(this.time.now / 65) * 0.05 * len;
      this.hero.setScale(0.8 * (1 - bob * 0.6), 0.8 * (1 + bob)).setAngle(x * 7);
      this.cd.dust -= dt;
      if (this.cd.dust <= 0) {
        this.cd.dust = 0.11;
        this.puffs.explode(2, this.hero.x - x * 8, this.hero.y + 22);
      }
      this.cd.trail -= dt;
      if (this.cd.trail <= 0) {
        this.cd.trail = 0.07;
        this.ghost(this.hero, 0xbfdbfe, 0.2 + 0.08 * (this.ups.swift ?? 0), 200);
      }
    } else if (this.hero.angle !== 0) {
      this.hero.setScale(0.8).setAngle(0);
    }
    this.pad.clear();
    if (this.stick) {
      this.pad.fillStyle(0xffffff, 0.12).fillCircle(this.stick.x, this.stick.y, 46);
      this.pad.lineStyle(2, 0xffffff, 0.25).strokeCircle(this.stick.x, this.stick.y, 46);
      this.pad.fillStyle(0xfbbf24, 0.6).fillCircle(this.stick.x + this.stick.dx, this.stick.y + this.stick.dy, 18);
    }
  }

  /**
   * The bot: steps away from what's close (reflections most of all), picks up light, and circles
   * the boss at the distance its rule asks for. A steady, careful player, not a great one. With a
   * sword it lets the crowd come into reach instead, since a slash only hits what's close.
   */
  private botMove(): [number, number] {
    const h = this.hero,
      melee = attackOf(this.setup.classId) === 'slash';
    let x = 0,
      y = 0;
    for (const o of this.foes.getChildren()) {
      const f = o as Foe;
      if (!f.active || f === this.boss) continue;
      const dx = h.x - f.x,
        dy = h.y - f.y,
        d = Math.hypot(dx, dy) || 1;
      if (d > (melee && f.kind !== 'reflection' ? 70 : 170)) continue;
      const w = ((f.kind === 'reflection' ? 3 : melee ? 0.4 : 1) * (f.dmg / 8) * 2500) / (d * d);
      x += (dx / d) * w;
      y += (dy / d) * w;
    }
    const b = this.boss;
    if (b?.active) {
      const dx = b.x - h.x,
        dy = b.y - h.y,
        d = Math.hypot(dx, dy) || 1,
        rule = this.setup.zone.boss,
        // Tomorrow heals when you're far, the Knight needs hits: stay close. The rest dash: keep room.
        want = melee ? 60 : rule === 'tomorrow' || rule === 'knight' ? 80 : rule === 'mirror' ? 110 : 150,
        pull = Phaser.Math.Clamp((d - want) / 80, -1.5, 1.5);
      x += (dx / d) * pull - (dy / d) * 0.7;
      y += (dy / d) * pull + (dx / d) * 0.7;
    } else {
      let gem: Gem | null = null,
        best = 260;
      for (const g of this.gems) {
        const d = Math.hypot(g.img.x - h.x, g.img.y - h.y);
        if (d < best) {
          best = d;
          gem = g;
        }
      }
      if (gem) {
        const dx = gem.img.x - h.x,
          dy = gem.img.y - h.y,
          d = Math.hypot(dx, dy) || 1;
        x += (dx / d) * 0.8;
        y += (dy / d) * 0.8;
      }
    }
    // Keep off the walls, where a crowd can pin you.
    const m = 200;
    if (h.x < m) x += (m - h.x) / m;
    if (h.x > WORLD - m) x -= (h.x - (WORLD - m)) / m;
    if (h.y < m) y += (m - h.y) / m;
    if (h.y > WORLD - m) y -= (h.y - (WORLD - m)) / m;
    const len = Math.hypot(x, y);
    return len < 0.05 ? [0, 0] : [x / len, y / len];
  }

  // ---------- foes ----------

  private spawn(dt: number) {
    const t = this.t;
    if (!this.boss && t >= RUN_SECONDS) {
      this.summonBoss();
      return;
    }
    if (this.bossAt !== null && t - this.bossAt >= BOSS_LIMIT) {
      this.bus.say('The Fog closes in. Train, and come back.');
      this.lose();
      return;
    }
    // Ring waves: the fog closes in from every side.
    for (const at of [60, 150]) {
      if (t >= at && !this.rings.has(at)) {
        this.rings.add(at);
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          this.addFoe('wisp', this.hero.x + Math.cos(a) * 340, this.hero.y + Math.sin(a) * 340);
        }
      }
    }
    if (t >= 90 && Math.floor((t - 90) / 45) >= this.elites) {
      this.elites++;
      for (let i = 0; i < (t > 180 ? 2 : 1); i++) this.addFoe('golem', ...this.edgePoint());
    }
    this.cd.spawn -= dt;
    if (this.cd.spawn > 0) return;
    this.cd.spawn = Math.max(0.3, 0.8 - t / 400) * (this.boss ? 3 : 1);
    const count = 1 + Math.floor(t / 60);
    const [px, py] = this.edgePoint();
    // A pack comes from one side, so they arrive together.
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const kind: FoeKind = t < 45 ? (r < 0.7 ? 'slime' : 'wisp') : t < 120 ? (r < 0.45 ? 'slime' : r < 0.85 ? 'wisp' : 'mirror') : r < 0.3 ? 'slime' : r < 0.7 ? 'wisp' : 'mirror';
      this.addFoe(kind, px + Phaser.Math.Between(-50, 50), py + Phaser.Math.Between(-50, 50));
    }
  }

  private edgePoint(): [number, number] {
    const cam = this.cameras.main,
      a = Math.random() * Math.PI * 2,
      d = Math.hypot(cam.width, cam.height) / 2 + 40;
    return [Phaser.Math.Clamp(this.hero.x + Math.cos(a) * d, 10, WORLD - 10), Phaser.Math.Clamp(this.hero.y + Math.sin(a) * d, 10, WORLD - 10)];
  }

  private addFoe(kind: FoeKind, x: number, y: number, boss?: FogBoss): Foe | null {
    if (kind !== 'boss' && this.foes.countActive() >= MAX_FOES) return null;
    const s = boss ? BOSSES[boss] : FOES[kind as Exclude<FoeKind, 'boss'>],
      { zone } = this.setup,
      grow = kind === 'boss' ? 1 : 1 + this.t / 180;
    const f = this.foes.get(Phaser.Math.Clamp(x, 10, WORLD - 10), Phaser.Math.Clamp(y, 10, WORLD - 10), s.tex) as Foe;
    f.setTexture(s.tex).setActive(true).setVisible(true).setScale(s.scale).clearTint().setAlpha(1);
    f.play(s.tex);
    f.kind = kind;
    f.stats = s;
    f.base = s.scale;
    f.bornAt = this.time.now;
    f.squashUntil = 0;
    if (this.cameras.main.worldView.contains(f.x, f.y)) this.puffs.explode(5, f.x, f.y + 26 * s.scale);
    // The Knight's plates don't grow with the zone: it's the number of hits that counts.
    f.maxHp = f.hp = boss === 'knight' ? KNIGHT_PLATES : Math.round(s.hp * zone.hp * grow);
    f.speed = s.speed * (0.9 + Math.random() * 0.2);
    f.dmg = s.dmg * zone.dmg;
    f.xp = s.xp;
    f.flashUntil = f.knockUntil = f.flameAt = f.windUntil = f.dashUntil = 0;
    const body = f.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    // Circle in texture pixels, centred low on the 64x64 frame where the creature sits.
    body.setCircle(s.r / s.scale > 30 ? 30 : s.r / s.scale, 32 - Math.min(30, s.r / s.scale), 36 - Math.min(30, s.r / s.scale));
    body.setCollideWorldBounds(true);
    if (kind === 'golem') {
      this.sfx('stomp');
      this.cameras.main.shake(180, 0.004);
    }
    return f;
  }

  private steer() {
    const now = this.time.now;
    for (const o of this.foes.getChildren()) {
      const f = o as Foe;
      if (!f.active) continue;
      f.setDepth(f.y);
      // Rise out of the fog when spawned; squash for a moment when hit.
      const born = (now - f.bornAt) / RISE_MS;
      if (born < 1) f.setAlpha(born).setScale(f.base * (1.25 - 0.25 * born), f.base * (0.25 + 0.75 * born));
      else if (now < f.squashUntil) f.setAlpha(1).setScale(f.base * 1.22, f.base * 0.8);
      else if (f.scaleX !== f.base) f.setAlpha(1).setScale(f.base);
      if (f.flashUntil && now >= f.flashUntil) {
        f.flashUntil = 0;
        f.clearTint();
      }
      if (now < f.knockUntil) continue;
      if (f === this.boss) {
        this.steerBoss(f, now);
        continue;
      }
      const dx = this.hero.x - f.x,
        dy = this.hero.y - f.y,
        d = Math.hypot(dx, dy) || 1;
      f.setVelocity((dx / d) * f.speed, (dy / d) * f.speed);
      f.setFlipX(dx > 0);
    }
  }

  private summonBoss() {
    const [x, y] = this.edgePoint();
    const kind = this.setup.zone.boss;
    const b = this.addFoe('boss', x, y, kind);
    if (!b) return;
    this.boss = b;
    this.bossDash = 3;
    this.bossSummon = kind === 'mirror' ? 2 : 6;
    this.bossClock = kind === 'knight' ? 6 : 0;
    this.bossAt = this.t;
    this.bossLabel = this.add
      .text(b.x, b.y, '', { fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#fecaca', stroke: '#0b0d14', strokeThickness: 3, align: 'center' })
      .setOrigin(0.5, 1)
      .setDepth(96000);
    this.cameras.main.flash(400, 60, 20, 90);
    this.cameras.main.shake(700, 0.008);
    this.sfx('roar');
    this.bus.boss();
  }

  private steerBoss(b: Foe, now: number) {
    const dt = this.dt;
    this.bossLabel?.setPosition(b.x, b.y - 34 * b.base);
    const kind = this.setup.zone.boss;
    if (kind === 'tomorrow') return this.steerTomorrow(b, dt);
    if (kind === 'mirror') return this.steerMirror(b, dt);
    if (kind === 'knight') this.knightShout(b, dt, now);
    const dx = this.hero.x - b.x,
      dy = this.hero.y - b.y,
      d = Math.hypot(dx, dy) || 1;
    b.setFlipX(kind === 'knight' ? dx > 0 : dx < 0);
    if (now < b.windUntil) {
      b.setVelocity(0, 0);
      return;
    }
    if (b.windUntil && now >= b.windUntil && now < b.dashUntil) {
      b.setVelocity(b.dashDir.x * 380, b.dashDir.y * 380);
      this.cd.trail -= dt;
      if (this.cd.trail <= 0) {
        this.cd.trail = 0.05;
        this.ghost(b, 0xef4444, 0.35, 260);
      }
      return;
    }
    if (b.dashUntil && now >= b.dashUntil) {
      b.windUntil = b.dashUntil = 0;
      b.clearTint();
    }
    b.setVelocity((dx / d) * b.speed, (dy / d) * b.speed);
    this.bossDash -= dt;
    this.bossSummon -= dt;
    if (this.bossDash <= 0) {
      this.bossDash = 4.5;
      b.windUntil = now + 700;
      b.dashUntil = now + 700 + 550;
      b.dashDir.set(dx / d, dy / d);
      b.setTint(0xff6b6b);
      this.sfx('dash');
      const from = { x: b.x, y: b.y },
        dir = b.dashDir.clone();
      this.fade(700, (g, p) => {
        g.lineStyle(10, 0xef4444, 0.15 + 0.3 * p).lineBetween(from.x, from.y, from.x + dir.x * 210, from.y + dir.y * 210);
      });
    }
    if (this.bossSummon <= 0) {
      this.bossSummon = 9;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.addFoe('wisp', b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60);
      }
    }
  }

  /** Tomorrow: it creeps after you, and while you keep away it heals and splits off small Tomorrows. */
  private steerTomorrow(b: Foe, dt: number) {
    const dx = this.hero.x - b.x,
      dy = this.hero.y - b.y,
      d = Math.hypot(dx, dy) || 1,
      far = d > TOMORROW_REACH;
    b.setFlipX(dx > 0);
    b.setVelocity((dx / d) * b.speed, (dy / d) * b.speed);
    // Its reach, so it's clear where waiting starts.
    const x = b.x,
      y = b.y;
    this.fade(40, (g) => g.lineStyle(2, far ? 0x86efac : 0x94a3b8, far ? 0.5 : 0.18).strokeCircle(x, y, TOMORROW_REACH));
    this.bossLabel?.setText(far ? 'Zzz... later...' : '');
    if (!far) return;
    b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.03 * dt);
    this.cd.trail -= dt;
    if (this.cd.trail <= 0) {
      this.cd.trail = 0.25;
      this.bits.particleTint = 0x86efac;
      this.bits.explode(3, b.x, b.y - 10);
    }
    this.bossClock += dt;
    if (this.bossClock >= 10) {
      this.bossClock = 0;
      this.sfx('stomp');
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        this.addFoe('slime', b.x + Math.cos(a) * 50, b.y + Math.sin(a) * 50);
      }
      this.bus.say('Tomorrow splits while you wait');
    }
  }

  /** The Mirror keeps its distance and sends golden reflections of you to stand in the way. */
  private steerMirror(b: Foe, dt: number) {
    const dx = this.hero.x - b.x,
      dy = this.hero.y - b.y,
      d = Math.hypot(dx, dy) || 1;
    b.setFlipX(dx > 0);
    const v = d > 170 ? b.speed : d < 120 ? -b.speed : 0;
    b.setVelocity((dx / d) * v, (dy / d) * v);
    this.bossSummon -= dt;
    if (this.bossSummon > 0) return;
    this.bossSummon = 5;
    const alive = this.foes.getChildren().filter((o) => (o as Foe).active && (o as Foe).kind === 'reflection').length;
    for (let i = 0; i < Math.min(2, 6 - alive); i++) {
      // Between you and the Mirror, a little to each side.
      const side = (i === 0 ? 1 : -1) * 40,
        px = -dy / d,
        py = dx / d;
      const r = this.addFoe('reflection', b.x + dx * 0.45 + px * side, b.y + dy * 0.45 + py * side);
      r?.setTint(0xfde68a);
    }
    this.sfx('nova', 1.4);
  }

  /** The Knight: every few seconds he raises his shield and shouts, and the shout shoves you away. */
  private knightShout(b: Foe, dt: number, now: number) {
    this.bossClock -= dt;
    if (this.bossClock > 0) return;
    this.bossClock = 8;
    this.bossLabel?.setText('NOT GOOD ENOUGH!').setColor('#fecaca');
    this.time.delayedCall(1800, () => this.bossLabel?.setText(''));
    this.bus.say('"Not good enough!" Keep hitting.');
    this.sfx('roar', 1.3);
    this.cameras.main.shake(300, 0.006);
    const dx = this.hero.x - b.x,
      dy = this.hero.y - b.y,
      d = Math.hypot(dx, dy) || 1;
    if (d < 260) this.shoved = { until: now + 450, x: (dx / d) * 320, y: (dy / d) * 320 };
    const x = b.x,
      y = b.y;
    this.fade(500, (g, p) => g.lineStyle(6 * (1 - p) + 1, 0xfecaca, 0.8 * (1 - p)).strokeCircle(x, y, 40 + 220 * p));
  }

  // ---------- hitting ----------

  private power(base: number) {
    return base * (1 + this.setup.power.strike) * (1 + 0.25 * (this.ups.power ?? 0));
  }

  private nearest(x: number, y: number, skip?: Set<Foe>, within = Infinity): Foe | null {
    let best: Foe | null = null,
      bd = within * within;
    for (const o of this.foes.getChildren()) {
      const f = o as Foe;
      if (!f.active || skip?.has(f)) continue;
      const d = (f.x - x) ** 2 + (f.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  private damage(f: Foe, amount: number, knock = 0, fromX = this.hero.x, fromY = this.hero.y) {
    if (!f.active) return;
    // The Knight's plates: any hit breaks exactly one.
    const dmg = f === this.boss && this.setup.zone.boss === 'knight' ? 1 : Math.max(1, Math.round(amount));
    if (f.kind === 'reflection') this.hitYourself();
    f.hp -= dmg;
    f.setTintFill(0xffffff);
    f.flashUntil = this.time.now + 50;
    f.squashUntil = this.time.now + 90;
    this.sparks.explode(2, f.x, f.y - 6);
    this.sfx(f === this.boss ? 'bossHit' : 'hit');
    this.number(f.x, f.y - 18 * f.base, dmg);
    if (knock > 0 && f !== this.boss) {
      const dx = f.x - fromX,
        dy = f.y - fromY,
        d = Math.hypot(dx, dy) || 1;
      f.setVelocity((dx / d) * knock, (dy / d) * knock);
      f.knockUntil = this.time.now + 140;
    }
    if (f.hp <= 0) this.kill(f);
  }

  private kill(f: Foe) {
    this.kills++;
    const boss = f === this.boss,
      x = f.x,
      y = f.y,
      R = 30 * f.base;
    this.ash.explode(boss ? 60 : 6, x, y);
    // Burst into bits of its own colors, with a flash of light where it stood.
    for (const c of f.stats.bits) {
      this.bits.particleTint = c;
      this.bits.explode(boss ? 24 : f.kind === 'golem' ? 10 : 4, x, y);
    }
    this.fade(boss ? 600 : 220, (g, p) => {
      g.fillStyle(0xffffff, 0.5 * (1 - p)).fillCircle(x, y, R * (0.4 + 0.4 * p));
      g.lineStyle(3 * (1 - p) + 1, 0xffffff, 0.8 * (1 - p)).strokeCircle(x, y, R * (0.5 + 0.9 * p));
    });
    if (f.kind === 'golem') this.cameras.main.shake(150, 0.005);
    this.sfx('kill', f.kind === 'golem' || boss ? 0.6 : f.kind === 'wisp' ? 1.3 : 1);
    if (f.xp > 0) {
      const big = f.xp >= 3;
      this.gems.push({ img: this.add.image(f.x, f.y, big ? 'gem-big' : 'gem').setDepth(1), value: f.xp, pulled: false });
    }
    f.disableBody(true, true);
    if (f === this.boss) {
      this.bossLabel?.destroy();
      this.win();
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

  private attack(dt: number) {
    this.cd.attack -= dt;
    if (this.cd.attack > 0) return;
    const kind = attackOf(this.setup.classId),
      a = ATTACK[kind],
      reach = kind === 'slash' ? SLASH_REACH : RANGE,
      // The boss hides in its horde, so attacks go for it whenever it's in reach. Not the Mirror:
      // there you hit whatever is nearest, reflections too, so you have to walk past them.
      boss =
        this.boss?.active && this.setup.zone.boss !== 'mirror' && Math.hypot(this.boss.x - this.hero.x, this.boss.y - this.hero.y) <= reach ? this.boss : null,
      target = boss ?? this.nearest(this.hero.x, this.hero.y, undefined, reach);
    if (!target && kind !== 'wave') return;
    this.cd.attack = a.cd / ((1 + this.setup.power.reach) * (1 + 0.18 * (this.ups.haste ?? 0)));
    this.hero.play('heroAttack');
    if (kind !== 'wave') this.sfx(ATTACK_SFX[kind]);
    const n = 1 + (this.ups.multi ?? 0),
      dmg = this.power(a.dmg);
    if (target) this.hero.setFlipX(target.x < this.hero.x);
    if (kind === 'arrow' && target) {
      const base = Math.atan2(target.y - this.hero.y, target.x - this.hero.x);
      for (let i = 0; i < n; i++) this.fire('arrow', base + (i - (n - 1) / 2) * 0.16, 430, dmg, 1, null);
    } else if (kind === 'orb' && target) {
      const hit = new Set<Foe>();
      for (let i = 0; i < n; i++) {
        const t = this.nearest(this.hero.x, this.hero.y, hit, RANGE) ?? target;
        hit.add(t);
        this.fire('orb', Math.atan2(t.y - this.hero.y, t.x - this.hero.x) + (i - (n - 1) / 2) * 0.4, 250, dmg, 0, t);
      }
    } else if (kind === 'wave') {
      for (let i = 0; i < n; i++) this.time.delayedCall(i * 180, () => this.wave(110 + i * 20, dmg));
    } else if (target) {
      const base = Math.atan2(target.y - this.hero.y, target.x - this.hero.x);
      for (let i = 0; i < n; i++) this.slash(base + (i * Math.PI * 2) / n, dmg);
    }
  }

  private fire(key: 'arrow' | 'orb', angle: number, speed: number, dmg: number, pierce: number, target: Foe | null) {
    const img = this.physics.add.image(this.hero.x, this.hero.y - 6, key).setRotation(angle).setDepth(90000);
    img.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.shots.push({ img, dmg, pierce, homing: key === 'orb', target, hit: new Set(), dies: this.time.now + 1600 });
  }

  private moveShots() {
    const now = this.time.now;
    this.shots = this.shots.filter((s) => {
      if (now > s.dies) {
        s.img.destroy();
        return false;
      }
      if (s.homing) {
        const tx = s.img.x,
          ty = s.img.y;
        this.fade(160, (g, p) => g.fillStyle(0xa78bfa, 0.35 * (1 - p)).fillCircle(tx, ty, 5 * (1 - p)));
        if (!s.target?.active) s.target = this.nearest(s.img.x, s.img.y, undefined, 300);
        if (s.target) {
          const a = Math.atan2(s.target.y - s.img.y, s.target.x - s.img.x);
          s.img.setVelocity(Math.cos(a) * 250, Math.sin(a) * 250);
        }
      }
      const f = this.nearest(s.img.x, s.img.y, s.hit, 20);
      if (!f) return true;
      s.hit.add(f);
      if (s.homing) {
        this.damage(f, s.dmg, 60, s.img.x, s.img.y);
        this.burst(s.img.x, s.img.y, 56, s.dmg * 0.5, 0xa78bfa, f);
        s.img.destroy();
        return false;
      }
      this.damage(f, s.dmg, 90, s.img.x, s.img.y);
      if (s.pierce-- <= 0) {
        s.img.destroy();
        return false;
      }
      return true;
    });
  }

  private slash(angle: number, dmg: number) {
    const R = SLASH_REACH - 10,
      x = this.hero.x,
      y = this.hero.y;
    for (const o of this.foes.getChildren()) {
      const f = o as Foe;
      if (!f.active) continue;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d > R + 10) continue;
      const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(f.y - y, f.x - x) - angle));
      if (diff < 1.3 || d < 22) this.damage(f, dmg, 140);
    }
    this.fade(160, (g, p) => {
      g.lineStyle(7 * (1 - p) + 1, 0xfef3c7, 0.9 * (1 - p)).beginPath();
      g.arc(this.hero.x, this.hero.y, R * (0.75 + 0.25 * p), angle - 1.2, angle + 1.2);
      g.strokePath();
    });
  }

  private wave(R: number, dmg: number) {
    const x = this.hero.x,
      y = this.hero.y;
    this.sfx('wave');
    this.burst(x, y, R, dmg, 0xfbbf24);
  }

  /** Everything within R takes dmg and is pushed back; a ring shows it. */
  private burst(x: number, y: number, R: number, dmg: number, color: number, skip?: Foe) {
    for (const o of this.foes.getChildren()) {
      const f = o as Foe;
      if (!f.active || f === skip) continue;
      if (Math.hypot(f.x - x, f.y - y) <= R) this.damage(f, dmg, 160, x, y);
    }
    this.fade(260, (g, p) => {
      g.lineStyle(5 * (1 - p) + 1, color, 0.8 * (1 - p)).strokeCircle(x, y, R * (0.3 + 0.7 * p));
      g.fillStyle(color, 0.12 * (1 - p)).fillCircle(x, y, R * (0.3 + 0.7 * p));
    });
  }

  /** The Mirror's rule: a hit on a reflection of you hurts you a little. */
  private hitYourself() {
    const now = this.time.now;
    if (this.over || now < this.mirrorHurtAt) return;
    if (!this.mirrorHurtAt) this.bus.say('That was you. Walk past your reflections.');
    this.mirrorHurtAt = now + 300;
    this.hp -= 2;
    this.number(this.hero.x, this.hero.y - 26, 2, '#fca5a5');
    this.hero.setTint(0xfde68a);
    this.time.delayedCall(120, () => this.hero.clearTint());
    if (this.hp <= 0) this.lose();
  }

  /** The bonfire's fireball: it bursts where it lands. */
  private fireball(t: Foe) {
    const from = this.flames[0] ?? this.hero,
      tx = t.x,
      ty = t.y;
    const img = this.add.image(from.x, from.y, 'fireball').setDepth(90000);
    this.sfx('flame', 0.7);
    this.tweens.add({
      targets: img,
      x: tx,
      y: ty,
      duration: 320,
      ease: 'Quad.easeIn',
      onComplete: () => {
        img.destroy();
        this.ash.explode(8, tx, ty);
        this.burst(tx, ty, 52, this.power(16), 0xf97316);
      },
    });
  }

  private skills(dt: number) {
    const { power } = this.setup;
    if (power.fireballs) {
      this.cd.fireball -= dt;
      if (this.cd.fireball <= 0) {
        const target = this.nearest(this.hero.x, this.hero.y, undefined, RANGE);
        this.cd.fireball = target ? 2.5 : 0.3;
        if (target) this.fireball(target);
      }
    }
    // The fire fairy: when you're low, it heals you (then rests a while).
    if (power.fairy && this.hp < this.maxHp * 0.35 && this.time.now >= this.fairyAt) {
      this.fairyAt = this.time.now + 25000;
      const heal = Math.round(this.maxHp * 0.25);
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.number(this.hero.x, this.hero.y - 30, heal, HEAL);
      this.bits.particleTint = 0x86efac;
      this.bits.explode(16, this.hero.x, this.hero.y);
      this.bus.say(`${power.flameName || 'Your flame'} heals you`);
    }
    // Ember's flames: from your workouts, plus the ones picked in this run.
    const flames = this.flames.length;
    if (flames > 0) {
      this.orbit += dt * 2.6;
      const now = this.time.now;
      this.flames.forEach((fl, i) => {
        const a = this.orbit + (i / flames) * Math.PI * 2;
        fl.setPosition(this.hero.x + Math.cos(a) * 68, this.hero.y + Math.sin(a) * 68).setDepth(fl.y + 1);
        for (const o of this.foes.getChildren()) {
          const f = o as Foe;
          if (!f.active || now < f.flameAt) continue;
          if (Math.hypot(f.x - fl.x, f.y - fl.y) < 22) {
            f.flameAt = now + 500;
            this.damage(f, this.power(7), 60, fl.x, fl.y);
            this.sparks.explode(3, f.x, f.y);
            this.sfx('flame');
          }
        }
      });
    }
    const spark = this.ups.spark ?? 0;
    if (spark > 0) {
      this.cd.spark -= dt;
      if (this.cd.spark <= 0) {
        this.cd.spark = 2;
        if (this.chain(2 + spark, this.power(14 + 6 * (spark - 1)))) this.sfx('spark');
      }
    }
    const nova = this.ups.nova ?? 0;
    if (nova > 0) {
      this.cd.nova -= dt;
      if (this.cd.nova <= 0) {
        this.cd.nova = 3;
        this.burst(this.hero.x, this.hero.y, 90 + 20 * (nova - 1), this.power(10 + 5 * (nova - 1)), 0xf8fafc);
        this.sfx('nova');
        this.cameras.main.shake(100, 0.003);
      }
    }
  }

  /** Lightning from the hero through up to `jumps` foes. False when nothing was in reach. */
  private chain(jumps: number, dmg: number): boolean {
    const hit = new Set<Foe>();
    const points: { x: number; y: number }[] = [{ x: this.hero.x, y: this.hero.y - 10 }];
    let from = { x: this.hero.x, y: this.hero.y };
    for (let i = 0; i < jumps; i++) {
      const f = this.nearest(from.x, from.y, hit, i === 0 ? 300 : 160);
      if (!f) break;
      hit.add(f);
      points.push({ x: f.x, y: f.y });
      from = { x: f.x, y: f.y };
    }
    if (points.length < 2) return false;
    hit.forEach((f) => this.damage(f, dmg, 30));
    const zig = points.map((p, i) => (i === 0 ? p : { x: p.x + Phaser.Math.Between(-6, 6), y: p.y + Phaser.Math.Between(-6, 6) }));
    this.fade(140, (g, p) => {
      g.lineStyle(3, 0x67e8f9, 1 - p);
      for (let i = 1; i < zig.length; i++) g.lineBetween(zig[i - 1].x, zig[i - 1].y, zig[i].x, zig[i].y);
      g.lineStyle(1, 0xffffff, 1 - p);
      for (let i = 1; i < zig.length; i++) g.lineBetween(zig[i - 1].x, zig[i - 1].y, zig[i].x, zig[i].y);
    });
    return true;
  }

  private fade(ms: number, draw: (g: Phaser.GameObjects.Graphics, p: number) => void) {
    this.fading.push({ draw, start: this.time.now, ms });
  }

  private drawFx() {
    const now = this.time.now;
    this.fx.clear();
    this.fading = this.fading.filter((f) => {
      const p = (now - f.start) / f.ms;
      if (p >= 1) return false;
      f.draw(this.fx, p);
      return true;
    });
  }

  /** Soft shadows ground everyone, so they stop looking pasted on. */
  private drawShadows() {
    const g = this.shadows.clear().fillStyle(0x000000, 0.3);
    g.fillEllipse(this.hero.x, this.hero.y + 22, 30, 9);
    for (const o of this.foes.getChildren()) {
      const f = o as Foe;
      if (f.active) g.fillEllipse(f.x, f.y + 26 * f.base, 46 * f.base, 13 * f.base);
    }
  }

  /** A fading copy of a sprite where it stands: speed lines for the hero, the boss's dash. */
  private ghost(src: Phaser.GameObjects.Sprite, tint: number, alpha: number, ms: number) {
    const img = this.add
      .image(src.x, src.y, src.texture.key, src.frame.name)
      .setFlipX(src.flipX)
      .setScale(src.scaleX, src.scaleY)
      .setAngle(src.angle)
      .setTintFill(tint)
      .setAlpha(alpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(src.depth - 1);
    this.tweens.add({ targets: img, alpha: 0, duration: ms, onComplete: () => img.destroy() });
  }

  private sfx(id: SfxId, pitch?: number) {
    music.sfx(id, pitch);
  }

  // ---------- light and levels ----------

  private pullGems() {
    const reach = 60 * (1 + 0.15 * this.setup.power.levels.pull + 0.5 * (this.ups.magnet ?? 0));
    this.gems = this.gems.filter((g) => {
      const dx = this.hero.x - g.img.x,
        dy = this.hero.y - g.img.y,
        d = Math.hypot(dx, dy);
      if (d < 16) {
        g.img.destroy();
        this.sfx('gem');
        this.gain(g.value);
        return false;
      }
      if (g.pulled || d < reach) {
        g.pulled = true;
        const step = Math.min(d, 7);
        g.img.x += (dx / d) * step;
        g.img.y += (dy / d) * step;
      }
      return true;
    });
  }

  private gain(n: number) {
    this.xp += n;
    while (this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level++;
      this.pendingLevels++;
    }
    if (this.pendingLevels > 0 && !this.scene.isPaused()) this.offer(null);
  }

  private offer(free: FreePick | null) {
    const choices = rollUpgrades(this.ups);
    if (choices.length === 0) {
      this.pendingLevels = 0;
      this.free = [];
      this.hp = Math.min(this.maxHp, this.hp + 20);
      return;
    }
    if (!free) this.pendingLevels--;
    this.sparks.explode(30, this.hero.x, this.hero.y);
    if (this.bot) return this.pick(BOT_PICKS.find((id) => choices.includes(id)) ?? choices[0]);
    music.sting('levelup');
    this.scene.pause();
    this.bus.levelUp(choices, { ...this.ups }, free);
  }

  /** Developer mode: jump to just before the boss. */
  skipToBoss() {
    this.t = Math.max(this.t, RUN_SECONDS - 3);
    // Count the waves and elites skipped over as done, so they don't all arrive at once.
    this.rings = new Set([60, 150]);
    this.elites = Math.floor((this.t - 90) / 45) + 1;
  }

  /** Developer mode: end the run as if the boss fell. */
  winNow() {
    this.win();
  }

  pick(id: UpgradeId) {
    const lv = (this.ups[id] ?? 0) + 1;
    this.ups[id] = lv;
    // A ring of light as the new skill takes hold, once the game is moving again.
    const hero = this.hero;
    this.fade(450, (g, p) => g.lineStyle(4 * (1 - p) + 1, 0xfbbf24, 0.9 * (1 - p)).strokeCircle(hero.x, hero.y, 24 + 80 * p));
    if (id === 'vital') {
      this.maxHp += 25;
      this.hp = this.maxHp;
    }
    if (id === 'flame') this.syncFlames();
    if (this.free.length) this.offer(this.free.shift()!);
    else if (this.pendingLevels > 0) this.offer(null);
    else this.scene.resume();
  }

  private syncFlames() {
    const want = this.setup.power.flames + (this.ups.flame ?? 0);
    while (this.flames.length < want) this.flames.push(this.add.sprite(this.hero.x, this.hero.y, 'ember').play('ember').setScale(0.42));
  }

  // ---------- getting hit, ending ----------

  private hurt(f: Foe) {
    const now = this.time.now;
    if (this.over || now < this.hurtUntil || !f.active) return;
    const armor = Math.min(0.6, this.setup.power.armor + 0.1 * (this.ups.guard ?? 0));
    this.hp -= f.dmg * (1 - armor);
    this.hurtUntil = now + INVULNERABLE_MS;
    this.cameras.main.shake(120, 0.006);
    this.cameras.main.flash(120, 140, 20, 20);
    this.sfx('hurt');
    this.bits.particleTint = 0xef4444;
    this.bits.explode(6, this.hero.x, this.hero.y);
    this.burstPush(90);
    if (this.hp <= 0) this.lose();
  }

  /** Shove nearby foes back a little so a hit gives room to escape. */
  private burstPush(R: number) {
    for (const o of this.foes.getChildren()) {
      const f = o as Foe;
      if (!f.active || f === this.boss) continue;
      const dx = f.x - this.hero.x,
        dy = f.y - this.hero.y,
        d = Math.hypot(dx, dy) || 1;
      if (d < R) {
        f.setVelocity((dx / d) * 180, (dy / d) * 180);
        f.knockUntil = this.time.now + 160;
      }
    }
  }

  private win() {
    if (this.over) return;
    this.over = true;
    this.cameras.main.flash(600, 255, 240, 200);
    for (const o of this.foes.getChildren()) {
      const f = o as Foe;
      if (f.active) {
        this.ash.explode(6, f.x, f.y);
        f.disableBody(true, true);
      }
    }
    this.physics.pause();
    this.bus.hud(this.hud());
    this.time.delayedCall(1200, () => this.ended(true));
  }

  private lose() {
    if (this.over) return;
    this.over = true;
    this.hp = 0;
    this.physics.pause();
    this.hero.setTint(0x6b7280);
    this.bus.hud(this.hud());
    this.time.delayedCall(900, () => this.ended(false));
  }

  private ended(won: boolean) {
    this.events.emit('run-ended');
    this.bus.end({ won, seconds: Math.floor(this.t), kills: this.kills, level: this.level, hp: Math.max(0, Math.ceil(this.hp)), maxHp: this.maxHp, bossAt: this.bossAt === null ? null : Math.floor(this.bossAt) });
  }
}

export function startRun(parent: HTMLElement, setup: RunSetup, events: RunEvents): RunHandle {
  const scene = new RunScene(setup, events);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: setup.zone.ground,
    pixelArt: true,
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    physics: { default: 'arcade', arcade: { debug: false } },
    input: { activePointers: 2 },
    scene: [scene],
  });
  return {
    pick: (id) => scene.pick(id),
    pause: () => scene.scene.pause(),
    resume: () => scene.scene.resume(),
    skipToBoss: () => scene.skipToBoss(),
    winNow: () => scene.winNow(),
    autopilot: (on) => (scene.bot = on),
    destroy: () => game.destroy(true),
  };
}

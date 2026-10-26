import * as Phaser from 'phaser';
import type { ClassId } from '@/lib/gear';
import { RUN_SECONDS, rollUpgrades, xpToNext, type Power, type UpgradeId, type Zone } from '@/lib/fog';
import type { Sheet } from '@/sprites/registry';

/* One run in the Fog, as a Phaser scene. You move; your hero attacks on its own in the class's
   style; Fog creatures come in waves; each one leaves light that levels you up, and each level
   lets you pick a skill. At RUN_SECONDS the Hollow walks out, speaking your own inner critic.
   Only this file and the files it imports touch Phaser, and it is loaded only when a run starts. */

export type SheetKey = 'hero' | 'heroAttack' | 'ember' | 'hollow' | 'slime' | 'wisp' | 'mirror' | 'golem';

export interface RunSetup {
  zone: Zone;
  power: Power;
  classId: ClassId | undefined;
  sheets: Record<SheetKey, Sheet>;
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
}

export interface RunEvents {
  hud: (h: Hud) => void;
  /** A pick is waiting: `fresh` is the free one for having trained recently. */
  levelUp: (choices: UpgradeId[], levels: Partial<Record<UpgradeId, number>>, fresh: boolean) => void;
  boss: () => void;
  end: (r: RunEnd) => void;
}

export interface RunHandle {
  pick: (id: UpgradeId) => void;
  pause: () => void;
  resume: () => void;
  skipToBoss: () => void;
  winNow: () => void;
  destroy: () => void;
}

const WORLD = 2400;
const HERO_SPEED = 150;
const HERO_HP = 100;
const MAX_FOES = 120;
const INVULNERABLE_MS = 600;
/** How far ranged attacks look for a target: about the width of a phone screen. */
const RANGE = 240;

type FoeKind = 'slime' | 'wisp' | 'mirror' | 'golem' | 'hollow';

const FOES: Record<FoeKind, { hp: number; speed: number; dmg: number; xp: number; scale: number; r: number }> = {
  slime: { hp: 12, speed: 52, dmg: 7, xp: 1, scale: 0.55, r: 14 },
  wisp: { hp: 8, speed: 88, dmg: 5, xp: 1, scale: 0.5, r: 13 },
  mirror: { hp: 34, speed: 66, dmg: 11, xp: 3, scale: 0.65, r: 15 },
  golem: { hp: 160, speed: 42, dmg: 18, xp: 10, scale: 0.95, r: 18 },
  hollow: { hp: 650, speed: 70, dmg: 20, xp: 0, scale: 1.5, r: 13 },
};

/** Base attack per class: how often it fires (s) and how hard it hits. */
const ATTACK: Record<'slash' | 'arrow' | 'orb' | 'wave', { cd: number; dmg: number }> = {
  slash: { cd: 0.9, dmg: 14 },
  arrow: { cd: 0.6, dmg: 10 },
  orb: { cd: 0.8, dmg: 12 },
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
  flashUntil = 0;
  knockUntil = 0;
  flameAt = 0;
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
  private cd = { attack: 0.5, spawn: 0.5, spark: 2, nova: 3, dust: 0, hud: 0 };
  private ups: Partial<Record<UpgradeId, number>> = {};
  private pendingLevels = 0;
  private boss: Foe | null = null;
  private bossSummon = 0;
  private bossDash = 0;
  private rings = new Set<number>();
  private elites = 0;
  private over = false;
  private orbit = 0;

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
    if (power.fresh) this.time.delayedCall(700, () => this.offer(true));
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
    this.t += dt;
    this.move();
    this.spawn(dt);
    this.steer();
    this.attack(dt);
    this.skills(dt);
    this.moveShots();
    this.pullGems();
    this.drawFx();
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

  private move() {
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
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const speed = HERO_SPEED * (1 + 0.12 * (this.ups.swift ?? 0));
    this.hero.setVelocity(x * speed, y * speed);
    if (len > 0.01) {
      this.facing.set(x, y).normalize();
      if (Math.abs(x) > 0.1) this.hero.setFlipX(x < 0);
      this.cd.dust -= 1 / 60;
      if (this.cd.dust <= 0) {
        this.cd.dust = 0.25;
        this.ash.explode(1, this.hero.x, this.hero.y + 22);
      }
    }
    this.pad.clear();
    if (this.stick) {
      this.pad.fillStyle(0xffffff, 0.12).fillCircle(this.stick.x, this.stick.y, 46);
      this.pad.lineStyle(2, 0xffffff, 0.25).strokeCircle(this.stick.x, this.stick.y, 46);
      this.pad.fillStyle(0xfbbf24, 0.6).fillCircle(this.stick.x + this.stick.dx, this.stick.y + this.stick.dy, 18);
    }
  }

  // ---------- foes ----------

  private spawn(dt: number) {
    const t = this.t;
    if (!this.boss && t >= RUN_SECONDS) {
      this.summonBoss();
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

  private addFoe(kind: FoeKind, x: number, y: number): Foe | null {
    if (kind !== 'hollow' && this.foes.countActive() >= MAX_FOES) return null;
    const s = FOES[kind],
      { zone } = this.setup,
      grow = kind === 'hollow' ? 1 : 1 + this.t / 180;
    const f = this.foes.get(Phaser.Math.Clamp(x, 10, WORLD - 10), Phaser.Math.Clamp(y, 10, WORLD - 10), kind) as Foe;
    f.setTexture(kind).setActive(true).setVisible(true).setScale(s.scale).clearTint().setAlpha(1);
    f.play(kind);
    f.kind = kind;
    f.maxHp = f.hp = Math.round(s.hp * zone.hp * grow);
    f.speed = s.speed * (0.9 + Math.random() * 0.2);
    f.dmg = s.dmg * zone.dmg;
    f.xp = s.xp;
    f.flashUntil = f.knockUntil = f.flameAt = f.windUntil = f.dashUntil = 0;
    const body = f.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
    // Circle in texture pixels, centred low on the 64x64 frame where the creature sits.
    body.setCircle(s.r / s.scale > 30 ? 30 : s.r / s.scale, 32 - Math.min(30, s.r / s.scale), 36 - Math.min(30, s.r / s.scale));
    body.setCollideWorldBounds(true);
    return f;
  }

  private steer() {
    const now = this.time.now;
    for (const o of this.foes.getChildren()) {
      const f = o as Foe;
      if (!f.active) continue;
      f.setDepth(f.y);
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
    const b = this.addFoe('hollow', x, y);
    if (!b) return;
    b.setTexture('hollow').play('hollow');
    this.boss = b;
    this.bossDash = 3;
    this.bossSummon = 6;
    this.cameras.main.flash(400, 60, 20, 90);
    this.bus.boss();
  }

  private steerBoss(b: Foe, now: number) {
    const dt = this.game.loop.delta / 1000;
    const dx = this.hero.x - b.x,
      dy = this.hero.y - b.y,
      d = Math.hypot(dx, dy) || 1;
    b.setFlipX(dx < 0);
    if (now < b.windUntil) {
      b.setVelocity(0, 0);
      return;
    }
    if (b.windUntil && now >= b.windUntil && now < b.dashUntil) {
      b.setVelocity(b.dashDir.x * 380, b.dashDir.y * 380);
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
    const dmg = Math.max(1, Math.round(amount));
    f.hp -= dmg;
    f.setTintFill(0xffffff);
    f.flashUntil = this.time.now + 50;
    this.number(f.x, f.y - 18 * f.scale, dmg);
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
    this.ash.explode(f === this.boss ? 60 : 10, f.x, f.y);
    if (f.xp > 0) {
      const big = f.xp >= 3;
      this.gems.push({ img: this.add.image(f.x, f.y, big ? 'gem-big' : 'gem').setDepth(1), value: f.xp, pulled: false });
    }
    f.disableBody(true, true);
    if (f === this.boss) this.win();
  }

  private number(x: number, y: number, n: number) {
    const t = this.numbers.find((x) => !x.visible);
    if (!t) return;
    t.setText(String(n)).setPosition(x + Phaser.Math.Between(-6, 6), y).setVisible(true).setAlpha(1);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 450, onComplete: () => t.setVisible(false) });
  }

  private attack(dt: number) {
    this.cd.attack -= dt;
    if (this.cd.attack > 0) return;
    const kind = attackOf(this.setup.classId),
      a = ATTACK[kind],
      reach = kind === 'slash' ? 130 : RANGE,
      // The boss hides in its horde, so attacks go for it whenever it's in reach.
      boss = this.boss?.active && Math.hypot(this.boss.x - this.hero.x, this.boss.y - this.hero.y) <= reach ? this.boss : null,
      target = boss ?? this.nearest(this.hero.x, this.hero.y, undefined, reach);
    if (!target && kind !== 'wave') return;
    this.cd.attack = a.cd / ((1 + this.setup.power.reach) * (1 + 0.18 * (this.ups.haste ?? 0)));
    this.hero.play('heroAttack');
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
        this.burst(s.img.x, s.img.y, 42, s.dmg * 0.5, 0xa78bfa, f);
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
    const R = 80,
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

  private skills(dt: number) {
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
          }
        }
      });
    }
    const spark = this.ups.spark ?? 0;
    if (spark > 0) {
      this.cd.spark -= dt;
      if (this.cd.spark <= 0) {
        this.cd.spark = 2;
        this.chain(2 + spark, this.power(14 + 6 * (spark - 1)));
      }
    }
    const nova = this.ups.nova ?? 0;
    if (nova > 0) {
      this.cd.nova -= dt;
      if (this.cd.nova <= 0) {
        this.cd.nova = 3;
        this.burst(this.hero.x, this.hero.y, 90 + 20 * (nova - 1), this.power(10 + 5 * (nova - 1)), 0xf8fafc);
      }
    }
  }

  private chain(jumps: number, dmg: number) {
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
    if (points.length < 2) return;
    hit.forEach((f) => this.damage(f, dmg, 30));
    const zig = points.map((p, i) => (i === 0 ? p : { x: p.x + Phaser.Math.Between(-6, 6), y: p.y + Phaser.Math.Between(-6, 6) }));
    this.fade(140, (g, p) => {
      g.lineStyle(3, 0x67e8f9, 1 - p);
      for (let i = 1; i < zig.length; i++) g.lineBetween(zig[i - 1].x, zig[i - 1].y, zig[i].x, zig[i].y);
      g.lineStyle(1, 0xffffff, 1 - p);
      for (let i = 1; i < zig.length; i++) g.lineBetween(zig[i - 1].x, zig[i - 1].y, zig[i].x, zig[i].y);
    });
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

  // ---------- light and levels ----------

  private pullGems() {
    const reach = 60 * (1 + 0.15 * this.setup.power.levels.pull + 0.5 * (this.ups.magnet ?? 0));
    this.gems = this.gems.filter((g) => {
      const dx = this.hero.x - g.img.x,
        dy = this.hero.y - g.img.y,
        d = Math.hypot(dx, dy);
      if (d < 16) {
        g.img.destroy();
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
    if (this.pendingLevels > 0 && !this.scene.isPaused()) this.offer(false);
  }

  private offer(fresh: boolean) {
    const choices = rollUpgrades(this.ups);
    if (choices.length === 0) {
      this.pendingLevels = 0;
      this.hp = Math.min(this.maxHp, this.hp + 20);
      return;
    }
    if (!fresh) this.pendingLevels--;
    this.sparks.explode(30, this.hero.x, this.hero.y);
    this.scene.pause();
    this.bus.levelUp(choices, { ...this.ups }, fresh);
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
    if (id === 'vital') {
      this.maxHp += 25;
      this.hp = this.maxHp;
    }
    if (id === 'flame') this.syncFlames();
    if (this.pendingLevels > 0) this.offer(false);
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
    this.time.delayedCall(1200, () => this.bus.end({ won: true, seconds: Math.floor(this.t), kills: this.kills, level: this.level }));
  }

  private lose() {
    if (this.over) return;
    this.over = true;
    this.hp = 0;
    this.physics.pause();
    this.hero.setTint(0x6b7280);
    this.bus.hud(this.hud());
    this.time.delayedCall(900, () => this.bus.end({ won: false, seconds: Math.floor(this.t), kills: this.kills, level: this.level }));
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
    destroy: () => game.destroy(true),
  };
}

import * as Phaser from 'phaser';
import type { ClassId } from '@/lib/gear';
import { xpToNext, type Power, type UpgradeId, type Zone } from '@/lib/fog';
import { music, type SfxId } from '@/lib/music';
import type { Sheet } from '@/sprites/registry';
import { BOSSES as BOSS_LOOKS, FOES as FOE_LOOKS, type SheetKey, type Stats } from '../rules';
import { botInput } from './bot';
import {
  ABILITIES,
  FLAME_RING,
  ROOM,
  STEP,
  createRun,
  pick,
  skipToBoss,
  stepRun,
  takeEvents,
  winNow,
  type AbilityId,
  type Foe,
  type FreePick,
  type GameEvent,
  type Run,
  type RunEnd,
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
}

export interface RunEvents {
  hud: (h: Hud) => void;
  levelUp: (choices: UpgradeId[], levels: Partial<Record<UpgradeId, number>>, free: FreePick | null) => void;
  boss: () => void;
  say: (text: string) => void;
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
  winNow: () => void;
  autopilot: (on: boolean) => void;
  destroy: () => void;
}

const SFX: Record<'slash' | 'arrow' | 'orb' | 'wave', SfxId> = { slash: 'slash', arrow: 'arrow', orb: 'orb', wave: 'wave' };
const HEAL = '#86efac';
const RISE_MS = 280;

const looks = (f: Foe, zone: Zone): Stats => (f.kind === 'boss' ? BOSS_LOOKS[zone.boss] : FOE_LOOKS[f.kind]);
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
    for (let i = 0; i < 40; i++) {
      const key = ['stone', 'tuft', 'bone', 'crack'][i % 4];
      this.add
        .image(Phaser.Math.Between(ROOM.wall + 10, ROOM.w - ROOM.wall - 10), Phaser.Math.Between(ROOM.wall + 10, ROOM.h - ROOM.wall - 10), key)
        .setDepth(-2)
        .setScale(key === 'crack' ? 2 : 1 + (i % 3) * 0.5);
    }
    this.room = this.add.graphics().setDepth(-1);
    this.shadows = this.add.graphics().setDepth(0.5);
    this.fx = this.add.graphics().setDepth(90000);
    const fogTint = hex(zone.fog);
    for (let i = 0; i < 10; i++) {
      const m = this.add
        .image(Phaser.Math.Between(0, ROOM.w), Phaser.Math.Between(0, ROOM.h), 'mist')
        .setTint(fogTint)
        .setAlpha(0.12)
        .setScale(Phaser.Math.FloatBetween(2.5, 4.5))
        .setDepth(150000);
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
      tint: Phaser.Display.Color.HexStringToColor(zone.fog).lighten(25).color,
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
    this.fitScreen();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fitScreen());
    this.drawRoom();

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

  /** The whole room on screen, as big as it fits. */
  private fitScreen() {
    const { width, height } = this.scale.gameSize;
    // The HUD takes the top 72 px; the room hangs right under it.
    const zoom = Math.min(width / ROOM.w, (height - 80) / ROOM.h);
    this.cameras.main.setZoom(zoom).centerOn(ROOM.w / 2, (height / 2 - 72) / zoom);
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
      g.fillStyle(darker).fillRect(0, 0, 64, 1).fillRect(0, 0, 1, 64).fillRect(32, 0, 1, 32).fillRect(0, 32, 64, 1).fillRect(16, 32, 1, 32);
      const rnd = new Phaser.Math.RandomDataGenerator(['forma']);
      for (let i = 0; i < 18; i++) g.fillStyle(i % 2 ? lighter : darker).fillRect(rnd.between(0, 62), rnd.between(0, 62), rnd.between(1, 2), rnd.between(1, 2));
    });
    tex('stone', 10, 7, () => {
      g.fillStyle(0x3f3a4d).fillRect(1, 2, 8, 5).fillRect(2, 1, 6, 1);
      g.fillStyle(0x5b5570).fillRect(2, 2, 4, 2);
    });
    tex('tuft', 9, 7, () => {
      g.fillStyle(0x3a3346).fillRect(1, 3, 1, 4).fillRect(4, 1, 1, 6).fillRect(7, 2, 1, 5);
      g.fillStyle(0x4c4459).fillRect(3, 4, 1, 3).fillRect(5, 3, 1, 4);
    });
    tex('bone', 10, 4, () => g.fillStyle(0x6b6478).fillRect(1, 1, 8, 2).fillRect(0, 0, 2, 4).fillRect(8, 0, 2, 4));
    tex('crack', 14, 6, () => g.fillStyle(darker).fillRect(0, 2, 5, 1).fillRect(4, 3, 4, 1).fillRect(7, 1, 4, 1).fillRect(10, 4, 4, 1));
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
    g.destroy();
  }

  /** Walls, and the door at the top: barred until the room is clear, then open and glowing. */
  private drawRoom() {
    const g = this.room.clear(),
      W = ROOM.w,
      H = ROOM.h,
      w = ROOM.wall,
      door = ROOM.door,
      dl = (W - door) / 2;
    const wall = 0x2a2433,
      top = 0x3d3549,
      edge = 0x15111c;
    g.fillStyle(wall).fillRect(0, 0, W, w).fillRect(0, H - w, W, w).fillRect(0, 0, w, H).fillRect(W - w, 0, w, H);
    // Bricks.
    g.fillStyle(top);
    for (let x = 0; x < W; x += 16) {
      g.fillRect(x, 2, 14, 6).fillRect(x + 8, 11, 14, 6);
      g.fillRect(x, H - w + 2, 14, 6).fillRect(x + 8, H - w + 11, 14, 6);
    }
    for (let y = w; y < H - w; y += 16) {
      g.fillRect(3, y, 6, 14).fillRect(12, y + 8, 6, 14);
      g.fillRect(W - w + 3, y, 6, 14).fillRect(W - w + 12, y + 8, 6, 14);
    }
    g.fillStyle(edge).fillRect(w, w, W - 2 * w, 3);
    if (this.run.doorOpen) {
      g.fillStyle(0x07080d).fillRect(dl, 0, door, w);
      g.fillStyle(0xfbbf24, 0.25).fillRect(dl + 6, w - 4, door - 12, 4);
    } else {
      g.fillStyle(0x1a1522).fillRect(dl, 0, door, w);
      g.fillStyle(0x6b6478);
      for (let x = dl + 6; x < dl + door - 4; x += 10) g.fillRect(x, 2, 3, w - 4);
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
        const look = looks(f, this.setup.zone);
        const s = this.add.sprite(f.x, f.y, look.tex).play(look.tex).setScale(look.scale);
        if (f.kind === 'reflection') s.setTint(0xfde68a);
        e = { s, base: look.scale, born: now, squash: 0, flash: 0 };
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
        if (f.kind === 'reflection') s.setTint(0xfde68a);
        else if (f === r.boss && r.t < f.windUntil) s.setTint(0xff6b6b);
        else s.clearTint();
      }
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

    this.syncMap(this.bullets, r.bullets, (b) => this.add.image(b.x, b.y, b.boss ? 'bullet-boss' : 'bullet').setDepth(80000));
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
        const look = e.kind === 'boss' ? BOSS_LOOKS[this.setup.zone.boss] : FOE_LOOKS[e.kind];
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
        this.drawRoom();
        this.floorTiles.setTilePosition(this.run.room * 23 + this.run.floor * 41, this.run.floor * 17);
        break;
      case 'clear':
        this.drawRoom();
        this.sfx('nova', 0.7);
        this.bus.say(this.run.room + 1 === this.run.layout.rooms ? 'Room clear. The stairs go down.' : 'Room clear. The door is open.');
        break;
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
      this.fx.fillStyle(0xfbbf24, 0.15 + 0.2 * p).fillTriangle(ROOM.w / 2 - 10, ROOM.wall + 26, ROOM.w / 2 + 10, ROOM.wall + 26, ROOM.w / 2, ROOM.wall + 12);
    }
  }

  private drawPad() {
    this.pad.clear();
    if (!this.stick) return;
    this.pad.fillStyle(0xffffff, 0.12).fillCircle(this.stick.x, this.stick.y, 46);
    this.pad.lineStyle(2, 0xffffff, 0.25).strokeCircle(this.stick.x, this.stick.y, 46);
    this.pad.fillStyle(0xfbbf24, 0.6).fillCircle(this.stick.x + this.stick.dx, this.stick.y + this.stick.dy, 18);
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
    winNow: () => scene.winNow(),
    autopilot: (on) => (scene.bot = on),
    destroy: () => game.destroy(true),
  };
}

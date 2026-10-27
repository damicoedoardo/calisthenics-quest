import * as Phaser from 'phaser';
import type { Sheet } from '@/sprites/registry';
import { CHEST, type Prop } from '../dungeon/props';
import { ANVIL, GATE, LOGS } from './props';
import { CAMP, gateZone, REACH, type Station, type StationId } from './layout';

/* The camp, drawn with Phaser and held sideways: the fire with your flame, the vault, Mira at her
   forge, and a gate for each zone. Hold a finger down to walk toward it, or tap a spot to walk
   there; reaching a spot tells the page to open its panel. Loaded with import() like the run. */

export type CampSheetKey = 'hero' | 'heroWalk' | 'ember' | 'mira';

export interface CampSetup {
  sheets: Record<CampSheetKey, Sheet>;
  stations: Station[];
  /** Zones whose gate is open, and those whose boss has fallen. */
  open: number[];
  cleared: number[];
  /** Where to stand at the start: the gate you came back through, or the fire. */
  at?: StationId;
}

export interface CampEvents {
  open: (id: StationId) => void;
}

export interface CampHandle {
  pause: () => void;
  resume: () => void;
  destroy: () => void;
}

const SPEED = 170;
const FONT = '"Press Start 2P", monospace';

class CampScene extends Phaser.Scene {
  private hero!: Phaser.GameObjects.Sprite;
  private fire!: Phaser.GameObjects.Graphics;
  private hint!: Phaser.GameObjects.Text;
  /** Where the finger is held (walk toward it), or the spot tapped (walk there, then open it). */
  private hold: Phaser.Input.Pointer | null = null;
  private goal: { x: number; y: number; id: StationId | null } | null = null;
  /** The spot you're standing at, so its panel opens once per visit. */
  private at: StationId | null = null;
  paused = false;

  constructor(
    private setup: CampSetup,
    private bus: CampEvents,
  ) {
    super('camp');
  }

  preload() {
    for (const [key, s] of Object.entries(this.setup.sheets)) this.load.spritesheet(key, s.src, { frameWidth: s.w, frameHeight: s.h });
  }

  create() {
    for (const [key, s] of Object.entries(this.setup.sheets)) {
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(key, { start: 0, end: s.frames - 1 }), frameRate: 1000 / s.ms, repeat: s.loop ? -1 : 0 });
    }
    this.textures.exists('chest') || this.prop('chest', CHEST);
    this.prop('anvil', ANVIL);
    this.prop('gate', GATE);
    this.prop('logs', LOGS);
    this.drawGround();
    const cam = this.cameras.main;
    cam.setBackgroundColor('#07080d').setRoundPixels(true).setBounds(0, 0, CAMP.w, CAMP.h);

    this.fire = this.add.graphics().setDepth(1);
    for (const s of this.setup.stations) this.placeStation(s);
    const start = this.setup.stations.find((s) => s.id === (this.setup.at ?? 'fire')) ?? this.setup.stations[0];
    this.hero = this.add.sprite(start.x + 40, start.y + 30, 'hero').play('hero').setScale(0.85).setOrigin(0.5, 0.9);
    this.at = start.id;
    cam.startFollow(this.hero, true, 0.12, 0.12);
    this.hint = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '8px', color: '#fde68a', backgroundColor: '#0b0d14cc', padding: { x: 5, y: 4 } })
      .setOrigin(0.5, 1)
      .setDepth(9999)
      .setVisible(false);

    this.fitScreen();
    this.scale.on(Phaser.Scale.Events.RESIZE, () => this.fitScreen());
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (this.paused) return;
      this.hold = p;
      const s = this.stationAt(p.worldX, p.worldY);
      this.goal = s ? { x: s.x + (s.id.startsWith('gate') ? 0 : 40), y: s.y + 26, id: s.id } : { x: p.worldX, y: p.worldY, id: null };
    });
    this.input.on(Phaser.Input.Events.POINTER_UP, () => (this.hold = null));
  }

  /** The screen shows the camp's whole height. */
  private fitScreen() {
    const { width, height } = this.scale.gameSize,
      cam = this.cameras.main;
    cam.setZoom(height / CAMP.h);
    cam.setBounds(0, 0, Math.max(CAMP.w, width / cam.zoom), CAMP.h);
  }

  private prop(key: string, { rows, palette }: Prop) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    rows.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const c = palette[ch];
        if (c) g.fillStyle(parseInt(c.slice(1), 16)).fillRect(x * 2, y * 2, 2, 2);
      }),
    );
    g.generateTexture(key, rows[0].length * 2, rows.length * 2);
    g.destroy();
  }

  /** The night sky, the treeline, and the trodden ground the camp stands on. */
  private drawGround() {
    const g = this.add.graphics().setDepth(-10),
      { w, h, ground } = CAMP;
    g.fillStyle(0x0b1020).fillRect(0, 0, w, ground);
    for (let i = 0; i < 70; i++) g.fillStyle(0xe2e8f0, 0.3 + ((i * 37) % 5) / 10).fillRect((i * 263) % w, (i * 71) % (ground - 50), 1, 1);
    // the treeline, dark against the sky
    g.fillStyle(0x111827);
    for (let x = 0; x < w; x += 18) {
      const t = 22 + ((x * 13) % 29);
      g.fillTriangle(x - 14, ground, x + 9, ground - t, x + 32, ground);
    }
    g.fillStyle(0x1c1917).fillRect(0, ground, w, h - ground);
    g.fillStyle(0x292524).fillRect(0, ground + 70, w, 50);
    // pebbles and ash
    for (let i = 0; i < 140; i++) g.fillStyle([0x44403c, 0x57534e, 0x292524][i % 3]).fillRect((i * 151) % w, ground + 6 + ((i * 89) % (h - ground - 12)), 2 + (i % 3), 2);
    // the fog at both ends
    for (let i = 0; i < 6; i++) {
      g.fillStyle(0x94a3b8, 0.05).fillRect(0, 0, 50 + i * 20, h);
      g.fillStyle(0x94a3b8, 0.05).fillRect(w - 50 - i * 20, 0, 50 + i * 20, h);
    }
  }

  private placeStation(s: Station) {
    const zone = gateZone(s.id),
      label = (text: string, color: string) =>
        this.add
          .text(s.x, s.y - 62, text, { fontFamily: FONT, fontSize: '8px', color, stroke: '#0b0d14', strokeThickness: 3, align: 'center', wordWrap: { width: 130 } })
          .setOrigin(0.5, 1)
          .setDepth(9000);
    if (s.id === 'fire') {
      this.add.image(s.x, s.y + 6, 'logs').setDepth(s.y);
      this.add.sprite(s.x, s.y - 20, 'ember').play('ember').setScale(0.7).setDepth(s.y + 1);
      label(s.label, '#fdba74');
    } else if (s.id === 'vault') {
      this.add.image(s.x, s.y, 'chest').setScale(2).setOrigin(0.5, 1).setDepth(s.y);
      label(s.label, '#fde68a');
    } else if (s.id === 'forge') {
      this.add.image(s.x, s.y, 'anvil').setScale(1.4).setOrigin(0.5, 1).setDepth(s.y);
      this.add.sprite(s.x + 46, s.y + 4, 'mira').play('mira').setScale(0.8).setOrigin(0.5, 0.9).setFlipX(true).setDepth(s.y + 2);
      label(s.label, '#fde68a');
    } else if (zone !== null) {
      const open = this.setup.open.includes(zone),
        cleared = this.setup.cleared.includes(zone);
      // The dark inside the arch: the Fog, glowing when the way is open.
      const g = this.add.graphics().setDepth(s.y - 1);
      g.fillStyle(open ? 0x6d28d9 : 0x0b0d14, open ? 0.55 : 0.9).fillRect(s.x - 26, s.y - 60, 52, 60);
      this.add.image(s.x, s.y + 2, 'gate').setScale(1.8).setOrigin(0.5, 1).setDepth(s.y);
      label(`${s.label}${cleared ? '\nCLEARED' : open ? '' : '\nLOCKED'}`, cleared ? '#86efac' : open ? '#c4b5fd' : '#64748b');
    }
  }

  /** The spot under a tap, if any. */
  private stationAt(x: number, y: number): Station | null {
    let best: Station | null = null,
      bd = 70;
    for (const s of this.setup.stations) {
      const d = Math.hypot(s.x - x, s.y - 30 - y);
      if (d < bd) {
        bd = d;
        best = s;
      }
    }
    return best;
  }

  update(_t: number, deltaMs: number) {
    const now = this.time.now,
      h = this.hero;
    this.drawFire(now);
    if (this.paused) return;
    // Held: walk toward the finger. Let go after a tap: walk on to the spot tapped.
    if (this.hold?.isDown) this.goal = { x: this.hold.worldX, y: this.hold.worldY, id: this.goal?.id ?? null };
    let moving = false;
    if (this.goal) {
      const dx = this.goal.x - h.x,
        dy = this.goal.y - h.y,
        d = Math.hypot(dx, dy),
        step = (SPEED * Math.min(deltaMs, 50)) / 1000;
      if (d > 4) {
        h.x += (dx / d) * Math.min(step, d);
        h.y += (dy / d) * Math.min(step, d);
        h.setFlipX(dx < 0);
        moving = true;
      } else if (!this.hold?.isDown) this.goal = null;
    }
    h.y = Phaser.Math.Clamp(h.y, CAMP.ground + 40, CAMP.h - 12);
    h.x = Phaser.Math.Clamp(h.x, 30, CAMP.w - 30);
    h.setDepth(h.y + 5);
    const anim = moving ? 'heroWalk' : 'hero';
    if (h.anims.currentAnim?.key !== anim) h.play(anim);
    // Reaching a spot opens its panel, once per visit.
    const near = this.setup.stations.find((s) => Math.hypot(s.x - h.x, s.y + 20 - h.y) < REACH + (s.id.startsWith('gate') ? 0 : 30)) ?? null;
    // Only the spot you walked to opens: passing one on the way to another doesn't.
    if (near && near.id !== this.at && (this.goal ? this.goal.id === near.id : !this.hold?.isDown)) {
      this.at = near.id;
      this.goal = null;
      this.hold = null;
      this.bus.open(near.id);
    } else if (!near) this.at = null;
    this.hint.setVisible(false);
  }

  /** The fire under your flame: a few flickering tongues. */
  private drawFire(now: number) {
    const s = this.setup.stations.find((x) => x.id === 'fire');
    if (!s) return;
    const g = this.fire.clear(),
      k = Math.floor(now / 110) % 4;
    g.fillStyle(0xf97316, 0.16 + 0.05 * Math.sin(now / 200)).fillCircle(s.x, s.y - 6, 70);
    g.fillStyle(0xea580c).fillRect(s.x - 9, s.y - 8, 18, 8);
    g.fillStyle(0xf97316).fillRect(s.x - 7 + (k % 2), s.y - 16, 14, 10);
    g.fillStyle(0xfde68a).fillRect(s.x - 3 - (k === 3 ? 1 : 0), s.y - 12, 6, 6);
    g.setDepth(s.y - 2);
  }
}

export function startCamp(parent: HTMLElement, setup: CampSetup, events: CampEvents): CampHandle {
  const scene = new CampScene(setup, events);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#07080d',
    pixelArt: true,
    banner: false,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    scene: [scene],
  });
  return {
    pause: () => (scene.paused = true),
    resume: () => (scene.paused = false),
    destroy: () => game.destroy(true),
  };
}

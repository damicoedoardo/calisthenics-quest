import type { ClassId } from '@/lib/gear';
import { RUN_SECONDS, rollUpgrades, xpToNext, type Power, type UpgradeId, type Zone } from '@/lib/fog';
import type { FogBoss } from '@/story/types';
import {
  ATTACK,
  BOSSES,
  BOSS_LIMIT,
  BOT_PICKS,
  DASH,
  FAIRY,
  FIREBALL,
  FLAME,
  FOES,
  INVULNERABLE_MS,
  MAX_FOES,
  RANGE,
  RINGS,
  RING_RADIUS,
  RING_SIZE,
  SLASH_REACH,
  SUMMON,
  TOMORROW_REACH,
  WORLD,
  armorOf,
  attackCooldown,
  attackOf,
  botSteer,
  clamp,
  elitePack,
  elitesDue,
  foeHp,
  foeKindAt,
  gemReach,
  heroDamage,
  heroMaxHp,
  heroSpeed,
  novaHit,
  packSize,
  sparkHit,
  spawnCooldown,
  type FoeKind,
  type Stats,
} from './rules';

/* The Fog without Phaser: the same rules (rules.ts), the same bot, on plain circles, with nothing
   drawn. A run takes a fraction of a second, so balance can be measured over hundreds of runs.
   It copies how run.ts plays a frame: physics moves everyone and checks who touches the hero,
   then the hero moves, the fog spawns, foes steer, the hero attacks, skills fire, shots fly and
   light is picked up. What it leaves out is looks (sound, particles, numbers, squash). */

export interface SimSetup {
  zone: Zone;
  power: Power;
  classId: ClassId | undefined;
  /** Seed for every roll in the run: the same seed plays the same run. */
  seed: number;
  /** Boss stats to use instead of the game's, for tuning. */
  bosses?: Record<FogBoss, Stats>;
  /** The phone screen the game would run on: foes walk in just past its corners. */
  screen?: { w: number; h: number };
}

export interface SimEnd {
  won: boolean;
  seconds: number;
  kills: number;
  level: number;
  hp: number;
  maxHp: number;
  bossAt: number | null;
  /** How the run ended. */
  why: 'boss' | 'hp' | 'limit';
}

interface Foe {
  kind: FoeKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Its body sits this far below its middle. */
  dy: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  xp: number;
  active: boolean;
  knockUntil: number;
  flameAt: number;
  windUntil: number;
  dashUntil: number;
  dashX: number;
  dashY: number;
}

interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  pierce: number;
  homing: boolean;
  target: Foe | null;
  hit: Set<Foe>;
  dies: number;
}

interface Gem {
  x: number;
  y: number;
  value: number;
  pulled: boolean;
}

/** A small seeded random generator (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FRAME = 1 / 60;
const HERO_R = 9.6;
const HERO_DY = 8;
type FreePick = 'fresh' | 'rested';

/** Plays one run with the bot, start to end. */
export function simulateRun(setup: SimSetup): SimEnd {
  const { zone, power, classId } = setup;
  const bosses = setup.bosses ?? BOSSES;
  const rule = zone.boss;
  const rnd = seeded(setup.seed);
  const screen = setup.screen ?? { w: 390, h: 844 };
  const edge = Math.hypot(screen.w, screen.h) / 2 + 40;
  const kind = attackOf(classId);
  const melee = kind === 'slash';

  const hero = { x: WORLD / 2, y: WORLD / 2, vx: 0, vy: 0 };
  let maxHp = heroMaxHp(power),
    hp = maxHp,
    xp = 0,
    level = 1,
    kills = 0,
    hurtUntil = 0,
    pendingLevels = 0,
    t = 0,
    now = 0,
    over: SimEnd | null = null,
    boss: Foe | null = null,
    bossAt: number | null = null,
    bossSummon = 0,
    bossDash = 0,
    bossClock = 0,
    mirrorHurtAt = 0,
    fairyAt = 0,
    elites = 0,
    orbit = 0,
    flames = 0;
  const shoved = { until: 0, x: 0, y: 0 };
  const cd = { attack: 0.5, spawn: 0.5, spark: 2, nova: 3, fireball: 2.5 };
  const ups: Partial<Record<UpgradeId, number>> = {};
  const rings = new Set<number>();
  const foes: Foe[] = [];
  let shots: Shot[] = [];
  let gems: Gem[] = [];
  const timers: { at: number; run: () => void }[] = [];
  const later = (ms: number, run: () => void) => timers.push({ at: now + ms, run });
  const free: FreePick[] = [...(power.fresh ? (['fresh'] as const) : []), ...(power.rested ? (['rested'] as const) : [])];

  const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));
  const active = () => foes.filter((f) => f.active && f !== boss);
  const end = (won: boolean, why: SimEnd['why']) => {
    if (over) return;
    over = { won, seconds: Math.floor(t), kills, level, hp: won ? Math.max(0, Math.ceil(hp)) : 0, maxHp, bossAt: bossAt === null ? null : Math.floor(bossAt), why };
  };

  // ---------- foes ----------

  const edgePoint = (): [number, number] => {
    const a = rnd() * Math.PI * 2;
    return [clamp(hero.x + Math.cos(a) * edge, 10, WORLD - 10), clamp(hero.y + Math.sin(a) * edge, 10, WORLD - 10)];
  };

  const addFoe = (k: FoeKind, x: number, y: number, which?: FogBoss): Foe | null => {
    if (k !== 'boss' && foes.reduce((n, f) => n + (f.active ? 1 : 0), 0) >= MAX_FOES) return null;
    const s = which ? bosses[which] : FOES[k as Exclude<FoeKind, 'boss'>];
    // Phaser reuses dead foes; here a dead one is dropped at the next tidy-up.
    const f: Foe = {
      kind: k,
      x: clamp(x, 10, WORLD - 10),
      y: clamp(y, 10, WORLD - 10),
      vx: 0,
      vy: 0,
      r: Math.min(s.r, 30 * s.scale),
      dy: 4 * s.scale,
      hp: foeHp(s, zone, t, which),
      maxHp: 0,
      speed: s.speed * (0.9 + rnd() * 0.2),
      dmg: s.dmg * zone.dmg,
      xp: s.xp,
      active: true,
      knockUntil: 0,
      flameAt: 0,
      windUntil: 0,
      dashUntil: 0,
      dashX: 0,
      dashY: 0,
    };
    f.maxHp = f.hp;
    foes.push(f);
    return f;
  };

  const spawn = (dt: number) => {
    if (!boss && t >= RUN_SECONDS) return summonBoss();
    if (bossAt !== null && t - bossAt >= BOSS_LIMIT) return end(false, 'limit');
    for (const at of RINGS) {
      if (t >= at && !rings.has(at)) {
        rings.add(at);
        for (let i = 0; i < RING_SIZE; i++) {
          const a = (i / RING_SIZE) * Math.PI * 2;
          addFoe('wisp', hero.x + Math.cos(a) * RING_RADIUS, hero.y + Math.sin(a) * RING_RADIUS);
        }
      }
    }
    if (elitesDue(t) > elites) {
      elites++;
      for (let i = 0; i < elitePack(t); i++) addFoe('golem', ...edgePoint());
    }
    cd.spawn -= dt;
    if (cd.spawn > 0) return;
    cd.spawn = spawnCooldown(t, !!boss);
    const count = packSize(t);
    const [px, py] = edgePoint();
    for (let i = 0; i < count; i++) addFoe(foeKindAt(t, rnd()), px + between(-50, 50), py + between(-50, 50));
  };

  const summonBoss = () => {
    const b = addFoe('boss', ...edgePoint(), rule);
    if (!b) return;
    boss = b;
    bossDash = DASH.first;
    bossSummon = rule === 'mirror' ? 2 : 6;
    bossClock = rule === 'knight' ? 6 : 0;
    bossAt = t;
  };

  const steer = (dt: number) => {
    for (const f of foes) {
      if (!f.active || now < f.knockUntil) continue;
      if (f === boss) {
        steerBoss(f, dt);
        continue;
      }
      const dx = hero.x - f.x,
        dy = hero.y - f.y,
        d = Math.hypot(dx, dy) || 1;
      f.vx = (dx / d) * f.speed;
      f.vy = (dy / d) * f.speed;
    }
  };

  const steerBoss = (b: Foe, dt: number) => {
    const dx = hero.x - b.x,
      dy = hero.y - b.y,
      d = Math.hypot(dx, dy) || 1;
    if (rule === 'tomorrow') {
      b.vx = (dx / d) * b.speed;
      b.vy = (dy / d) * b.speed;
      if (d <= TOMORROW_REACH) return;
      b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.03 * dt);
      bossClock += dt;
      if (bossClock >= 10) {
        bossClock = 0;
        for (let i = 0; i < 3; i++) {
          const a = rnd() * Math.PI * 2;
          addFoe('slime', b.x + Math.cos(a) * 50, b.y + Math.sin(a) * 50);
        }
      }
      return;
    }
    if (rule === 'mirror') {
      const v = d > 170 ? b.speed : d < 120 ? -b.speed : 0;
      b.vx = (dx / d) * v;
      b.vy = (dy / d) * v;
      bossSummon -= dt;
      if (bossSummon > 0) return;
      bossSummon = 5;
      const alive = foes.filter((f) => f.active && f.kind === 'reflection').length;
      for (let i = 0; i < Math.min(2, 6 - alive); i++) {
        const side = (i === 0 ? 1 : -1) * 40,
          px = -dy / d,
          py = dx / d;
        addFoe('reflection', b.x + dx * 0.45 + px * side, b.y + dy * 0.45 + py * side);
      }
      return;
    }
    if (rule === 'knight') {
      bossClock -= dt;
      if (bossClock <= 0) {
        bossClock = 8;
        if (d < 260) Object.assign(shoved, { until: now + 450, x: (dx / d) * 320, y: (dy / d) * 320 });
      }
    }
    if (now < b.windUntil) {
      b.vx = b.vy = 0;
      return;
    }
    if (b.windUntil && now >= b.windUntil && now < b.dashUntil) {
      b.vx = b.dashX * DASH.speed;
      b.vy = b.dashY * DASH.speed;
      return;
    }
    if (b.dashUntil && now >= b.dashUntil) b.windUntil = b.dashUntil = 0;
    b.vx = (dx / d) * b.speed;
    b.vy = (dy / d) * b.speed;
    bossDash -= dt;
    bossSummon -= dt;
    if (bossDash <= 0) {
      bossDash = DASH.every;
      b.windUntil = now + DASH.windMs;
      b.dashUntil = now + DASH.windMs + DASH.dashMs;
      b.dashX = dx / d;
      b.dashY = dy / d;
    }
    if (bossSummon <= 0) {
      bossSummon = SUMMON.every;
      for (let i = 0; i < SUMMON.count; i++) {
        const a = (i / SUMMON.count) * Math.PI * 2;
        addFoe('wisp', b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60);
      }
    }
  };

  // ---------- hitting ----------

  const pow = (base: number) => heroDamage(base, power, ups);

  const nearest = (x: number, y: number, skip?: Set<Foe>, within = Infinity): Foe | null => {
    let best: Foe | null = null,
      bd = within * within;
    for (const f of foes) {
      if (!f.active || skip?.has(f)) continue;
      const d = (f.x - x) ** 2 + (f.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  };

  const damage = (f: Foe, amount: number, knock = 0, fromX = hero.x, fromY = hero.y) => {
    if (!f.active) return;
    const dmg = f === boss && rule === 'knight' ? 1 : Math.max(1, Math.round(amount));
    if (f.kind === 'reflection') hitYourself();
    f.hp -= dmg;
    if (knock > 0 && f !== boss) {
      const dx = f.x - fromX,
        dy = f.y - fromY,
        d = Math.hypot(dx, dy) || 1;
      f.vx = (dx / d) * knock;
      f.vy = (dy / d) * knock;
      f.knockUntil = now + 140;
    }
    if (f.hp <= 0) kill(f);
  };

  const kill = (f: Foe) => {
    kills++;
    if (f.xp > 0) gems.push({ x: f.x, y: f.y, value: f.xp, pulled: false });
    f.active = false;
    if (f === boss) end(true, 'boss');
  };

  const hitYourself = () => {
    if (over || now < mirrorHurtAt) return;
    mirrorHurtAt = now + 300;
    hp -= 2;
    if (hp <= 0) end(false, 'hp');
  };

  const burst = (x: number, y: number, R: number, dmg: number, skip?: Foe) => {
    for (const f of foes) {
      if (!f.active || f === skip) continue;
      if (Math.hypot(f.x - x, f.y - y) <= R) damage(f, dmg, 160, x, y);
    }
  };

  const fire = (angle: number, speed: number, dmg: number, pierce: number, target: Foe | null, homing: boolean) => {
    shots.push({ x: hero.x, y: hero.y - 6, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg, pierce, homing, target, hit: new Set(), dies: now + 1600 });
  };

  const slash = (angle: number, dmg: number) => {
    const R = SLASH_REACH - 10,
      x = hero.x,
      y = hero.y;
    for (const f of foes) {
      if (!f.active) continue;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d > R + 10) continue;
      let diff = Math.atan2(f.y - y, f.x - x) - angle;
      diff = Math.abs(Math.atan2(Math.sin(diff), Math.cos(diff)));
      if (diff < 1.3 || d < 22) damage(f, dmg, 140);
    }
  };

  const attack = (dt: number) => {
    cd.attack -= dt;
    if (cd.attack > 0) return;
    const reach = melee ? SLASH_REACH : RANGE,
      b = boss?.active && rule !== 'mirror' && Math.hypot(boss.x - hero.x, boss.y - hero.y) <= reach ? boss : null,
      target = b ?? nearest(hero.x, hero.y, undefined, reach);
    if (!target && kind !== 'wave') return;
    cd.attack = attackCooldown(kind, power, ups);
    const n = 1 + (ups.multi ?? 0),
      dmg = pow(ATTACK[kind].dmg);
    if (kind === 'arrow' && target) {
      const base = Math.atan2(target.y - hero.y, target.x - hero.x);
      for (let i = 0; i < n; i++) fire(base + (i - (n - 1) / 2) * 0.16, 430, dmg, 1, null, false);
    } else if (kind === 'orb' && target) {
      const hit = new Set<Foe>();
      for (let i = 0; i < n; i++) {
        const tg = nearest(hero.x, hero.y, hit, RANGE) ?? target;
        hit.add(tg);
        fire(Math.atan2(tg.y - hero.y, tg.x - hero.x) + (i - (n - 1) / 2) * 0.4, 250, dmg, 0, tg, true);
      }
    } else if (kind === 'wave') {
      for (let i = 0; i < n; i++) {
        const R = 110 + i * 20;
        if (i === 0) burst(hero.x, hero.y, R, dmg);
        else later(i * 180, () => burst(hero.x, hero.y, R, dmg));
      }
    } else if (target) {
      const base = Math.atan2(target.y - hero.y, target.x - hero.x);
      for (let i = 0; i < n; i++) slash(base + (i * Math.PI * 2) / n, dmg);
    }
  };

  const moveShots = () => {
    shots = shots.filter((s) => {
      if (now > s.dies) return false;
      if (s.homing) {
        if (!s.target?.active) s.target = nearest(s.x, s.y, undefined, 300);
        if (s.target) {
          const a = Math.atan2(s.target.y - s.y, s.target.x - s.x);
          s.vx = Math.cos(a) * 250;
          s.vy = Math.sin(a) * 250;
        }
      }
      const f = nearest(s.x, s.y, s.hit, 20);
      if (!f) return true;
      s.hit.add(f);
      if (s.homing) {
        damage(f, s.dmg, 60, s.x, s.y);
        burst(s.x, s.y, 56, s.dmg * 0.5, f);
        return false;
      }
      damage(f, s.dmg, 90, s.x, s.y);
      return s.pierce-- > 0;
    });
  };

  const chain = (jumps: number, dmg: number) => {
    const hit = new Set<Foe>();
    let from = { x: hero.x, y: hero.y };
    for (let i = 0; i < jumps; i++) {
      const f = nearest(from.x, from.y, hit, i === 0 ? 300 : 160);
      if (!f) break;
      hit.add(f);
      from = { x: f.x, y: f.y };
    }
    hit.forEach((f) => damage(f, dmg, 30));
  };

  const skills = (dt: number) => {
    if (power.fireballs) {
      cd.fireball -= dt;
      if (cd.fireball <= 0) {
        const target = nearest(hero.x, hero.y, undefined, RANGE);
        cd.fireball = target ? FIREBALL.every : 0.3;
        if (target) {
          const tx = target.x,
            ty = target.y;
          later(FIREBALL.flightMs, () => burst(tx, ty, FIREBALL.r, pow(FIREBALL.dmg)));
        }
      }
    }
    if (power.fairy && hp < maxHp * FAIRY.below && now >= fairyAt) {
      fairyAt = now + FAIRY.restMs;
      hp = Math.min(maxHp, hp + Math.round(maxHp * FAIRY.heal));
    }
    if (flames > 0) {
      orbit += dt * FLAME.spin;
      for (let i = 0; i < flames; i++) {
        const a = orbit + (i / flames) * Math.PI * 2,
          fx = hero.x + Math.cos(a) * FLAME.orbit,
          fy = hero.y + Math.sin(a) * FLAME.orbit;
        for (const f of foes) {
          if (!f.active || now < f.flameAt) continue;
          if (Math.hypot(f.x - fx, f.y - fy) < FLAME.touch) {
            f.flameAt = now + FLAME.every;
            damage(f, pow(FLAME.dmg), 60, fx, fy);
          }
        }
      }
    }
    const spark = ups.spark ?? 0;
    if (spark > 0) {
      cd.spark -= dt;
      if (cd.spark <= 0) {
        cd.spark = 2;
        const hit = sparkHit(spark);
        chain(hit.jumps, pow(hit.dmg));
      }
    }
    const nova = ups.nova ?? 0;
    if (nova > 0) {
      cd.nova -= dt;
      if (cd.nova <= 0) {
        cd.nova = 3;
        const hit = novaHit(nova);
        burst(hero.x, hero.y, hit.r, pow(hit.dmg));
      }
    }
  };

  // ---------- light and levels ----------

  const pullGems = () => {
    const reach = gemReach(power, ups);
    gems = gems.filter((g) => {
      const dx = hero.x - g.x,
        dy = hero.y - g.y,
        d = Math.hypot(dx, dy);
      if (d < 16) {
        gain(g.value);
        return false;
      }
      if (g.pulled || d < reach) {
        g.pulled = true;
        const step = Math.min(d, 7);
        g.x += (dx / d) * step;
        g.y += (dy / d) * step;
      }
      return true;
    });
  };

  const gain = (n: number) => {
    xp += n;
    while (xp >= xpToNext(level)) {
      xp -= xpToNext(level);
      level++;
      pendingLevels++;
    }
    if (pendingLevels > 0) offer(null);
  };

  const offer = (freePick: FreePick | null) => {
    const choices = rollUpgrades(ups, rnd);
    if (choices.length === 0) {
      pendingLevels = 0;
      free.length = 0;
      hp = Math.min(maxHp, hp + 20);
      return;
    }
    if (!freePick) pendingLevels--;
    pick(BOT_PICKS.find((id) => choices.includes(id)) ?? choices[0]);
  };

  const pick = (id: UpgradeId) => {
    ups[id] = (ups[id] ?? 0) + 1;
    if (id === 'vital') {
      maxHp += 25;
      hp = maxHp;
    }
    if (id === 'flame') flames = power.flames + (ups.flame ?? 0);
    if (free.length) offer(free.shift()!);
    else if (pendingLevels > 0) offer(null);
  };

  // ---------- getting hit ----------

  const hurt = (f: Foe) => {
    if (over || now < hurtUntil || !f.active) return;
    hp -= f.dmg * (1 - armorOf(power, ups));
    hurtUntil = now + INVULNERABLE_MS;
    for (const o of foes) {
      if (!o.active || o === boss) continue;
      const dx = o.x - hero.x,
        dy = o.y - hero.y,
        d = Math.hypot(dx, dy) || 1;
      if (d < 90) {
        o.vx = (dx / d) * 180;
        o.vy = (dy / d) * 180;
        o.knockUntil = now + 160;
      }
    }
    if (hp <= 0) end(false, 'hp');
  };

  // ---------- physics: move, push apart, touch ----------

  // Kept sorted by x (almost sorted already from the frame before), so only neighbours are compared.
  const byX: Foe[] = [];
  const physics = (dt: number) => {
    const hr = HERO_R;
    hero.x = clamp(hero.x + hero.vx * dt, hr, WORLD - hr);
    hero.y = clamp(hero.y + hero.vy * dt, hr - HERO_DY, WORLD - hr - HERO_DY);
    byX.length = 0;
    let widest = 0;
    for (const f of foes) {
      if (!f.active) continue;
      f.x = clamp(f.x + f.vx * dt, f.r, WORLD - f.r);
      f.y = clamp(f.y + f.vy * dt, f.r - f.dy, WORLD - f.r - f.dy);
      byX.push(f);
      if (f.r > widest) widest = f.r;
    }
    for (const s of shots) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    // Foes push each other apart, half the overlap each.
    byX.sort((p, q) => p.x - q.x);
    for (let i = 0; i < byX.length; i++) {
      const f = byX[i];
      for (let j = i + 1; j < byX.length; j++) {
        const o = byX[j];
        const dx = o.x - f.x;
        if (dx > f.r + widest) break;
        const dy = o.y + o.dy - (f.y + f.dy),
          rr = f.r + o.r;
        if (dx * dx + dy * dy >= rr * rr) continue;
        const d = Math.hypot(dx, dy),
          gap = rr - d,
          nx = d ? dx / d : 1,
          ny = d ? dy / d : 0;
        f.x -= (nx * gap) / 2;
        f.y -= (ny * gap) / 2;
        o.x += (nx * gap) / 2;
        o.y += (ny * gap) / 2;
      }
    }
    for (const f of foes) {
      if (!f.active) continue;
      if (Math.hypot(f.x - hero.x, f.y + f.dy - (hero.y + HERO_DY)) < f.r + HERO_R) hurt(f);
      if (over) return;
    }
  };

  // ---------- the loop ----------

  if (free.length) later(700, () => offer(free.shift()!));
  flames = power.flames;
  let frame = 0;
  while (!over) {
    frame++;
    now = frame * FRAME * 1000;
    for (let i = 0; i < timers.length; i++) {
      if (timers[i].at <= now) {
        const run = timers[i].run;
        timers.splice(i--, 1);
        run();
      }
    }
    if (over) break;
    physics(FRAME);
    if (over) break;
    t += FRAME;
    // (TypeScript can't see the callbacks that set the boss.)
    const b = boss as Foe | null;
    const [mx, my] = botSteer(hero, active(), b?.active ? b : null, gems, rule, melee);
    const speed = heroSpeed(ups);
    if (now < shoved.until) {
      hero.vx = shoved.x;
      hero.vy = shoved.y;
    } else {
      hero.vx = mx * speed;
      hero.vy = my * speed;
    }
    spawn(FRAME);
    if (over) break;
    steer(FRAME);
    attack(FRAME);
    if (over) break;
    skills(FRAME);
    if (over) break;
    moveShots();
    if (over) break;
    pullGems();
    if (frame % 600 === 0) {
      for (let i = foes.length - 1; i >= 0; i--) if (!foes[i].active) foes.splice(i, 1);
    }
  }
  return over as unknown as SimEnd;
}

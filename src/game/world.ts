import { F, ENEMY, BOSS, VIS_CAP, SHOOT_CAP, ARMY_SPACING, MAX_ARMY, upgradeStats } from './config';
import type { EType, BossKind, Upgrades } from './config';
import type { LaneDef, LevelDef, LevelEvent } from './levels';
import { endlessChunk } from './levels';

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Soldier {
  x: number;
  z: number;
  phase: number;
  born: number;
}

export enum ES {
  March = 0,
  Charge = 1,
  Dying = 2,
  Removed = 3,
}

export interface Enemy {
  type: EType;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  r: number;
  speed: number;
  state: ES;
  t: number; // dying timer / shoot timer
  how: 'ice' | 'frost';
  flash: number;
  phase: number;
}

export type BossState = 'walk' | 'idle' | 'windup' | 'recover' | 'dash' | 'return' | 'dead';

export interface Boss {
  id: number;
  kind: BossKind;
  name: string;
  hp: number;
  maxHp: number;
  x: number;
  z: number;
  r: number;
  state: BossState;
  t: number;
  cd: number;
  frozen: number;
  flash: number;
  atk: number; // attack counter
  dashTo: number;
  contactAcc: number;
  dmgAcc: number;
  dmgT: number;
  enraged: boolean;
  anim: string; // current attack anim for renderer
  animT: number;
}

export interface Tele {
  id: number;
  kind: 'circle' | 'strip';
  x: number;
  z: number;
  r: number; // circle radius or strip half width
  z0: number;
  z1: number;
  t: number;
  dur: number;
  owner: number;
  dmg: 'slam' | 'fire' | 'dash';
}

export interface Arrow {
  x: number;
  vx: number;
  z: number;
  y: number;
  dmg: number;
  life: number;
}

export interface EProj {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  t: number;
  dur: number;
}

export type PanelKind = 'add' | 'mul' | 'frost';

export interface Panel {
  id: number;
  side: number; // -1 left, 1 right
  x: number;
  z: number;
  kind: PanelKind;
  n: number;
  text: string;
  pop: number; // >0 when collected (render pop anim)
}

export interface Wall {
  side: number;
  hp: number;
  maxHp: number;
  z: number;
  flash: number;
  alive: boolean;
}

export interface Lane {
  side: number;
  x: number;
  def: LaneDef | null;
  idx: number;
  spawned: number;
  delay: number;
  panels: Panel[];
  wall: Wall | null;
}

export interface GateHalf {
  op: 'add' | 'mul';
  v: number;
  max: number; // shooting can raise an additive half up to this value
  hits: number;
  flash: number;
}

export interface Gate {
  id: number;
  z: number;
  age: number;
  shoot: number;
  halves: [GateHalf, GateHalf];
  passed: number; // -1 not passed else chosen half
  fade: number;
}

export interface FrostWave {
  x: number;
  z: number;
  z0: number;
  zEnd: number;
  w: number;
}

export type GEvent =
  | { k: 'edie'; x: number; z: number; how: 'ice' | 'frost' | 'contact'; type: EType }
  | { k: 'sdie'; x: number; z: number; how: string }
  | { k: 'collect'; x: number; z: number; text: string; good: boolean; big: boolean }
  | { k: 'gate'; x: number; z: number; text: string; good: boolean }
  | { k: 'whit'; side: number }
  | { k: 'wbreak'; side: number; x: number; z: number }
  | { k: 'bspawn'; id: number; name: string; kind: BossKind }
  | { k: 'bhit'; id: number; dmg: number; x: number; z: number }
  | { k: 'bdie'; id: number; x: number; z: number; kind: BossKind }
  | { k: 'bfreeze'; id: number }
  | { k: 'slam'; x: number; z: number; r: number; killed: number }
  | { k: 'boom'; x: number; z: number; r: number; killed: number }
  | { k: 'dash'; x: number; z0: number; z1: number; killed: number }
  | { k: 'windup'; id: number; kind: BossKind }
  | { k: 'summon'; id: number }
  | { k: 'frost'; x: number; z: number }
  | { k: 'frostReady' }
  | { k: 'ehitArrow'; x: number; z: number; killed: boolean }
  | { k: 'ramHit'; x: number; z: number; killed: number }
  | { k: 'msg'; text: string }
  | { k: 'win' }
  | { k: 'lose' };

interface Spawner {
  type: EType;
  left: number;
  rate: number;
  acc: number;
  width: number;
  hp: number;
}

export interface WorldOpts {
  level: LevelDef;
  upg: Upgrades;
  seed?: number;
}

const GRID_X0 = -10;
const GRID_Z0 = -110;
const GRID_COLS = 20;
const GRID_ROWS = 140;
const MAX_ENEMIES = 4000;

export function parsePanel(s: string): { kind: PanelKind; n: number; text: string } {
  if (s === 'F') return { kind: 'frost', n: 0, text: '冰' };
  if (s[0] === 'x') return { kind: 'mul', n: Number(s.slice(1)), text: '×' + s.slice(1) };
  const n = Number(s);
  return { kind: 'add', n, text: n >= 0 ? '+' + n : String(n) };
}

export function gateText(h: GateHalf): string {
  if (h.op === 'mul') return '×' + h.v;
  return h.v >= 0 ? '+' + h.v : String(h.v);
}

export class World {
  readonly level: LevelDef;
  readonly stats: ReturnType<typeof upgradeStats>;
  readonly rand: () => number;
  t = 0;
  N: number;
  ax = 0;
  targetX = 0;
  armyVX = 0;
  // derived army shape
  Rx = 0.5;
  Rz = 0.5;
  cz = 0.5;
  soldiers: Soldier[] = [];
  enemies: Enemy[] = [];
  bosses: Boss[] = [];
  teles: Tele[] = [];
  arrows: Arrow[] = [];
  eproj: EProj[] = [];
  lanes: Lane[] = [];
  popped: Panel[] = [];
  gates: Gate[] = [];
  frostWave: FrostWave | null = null;
  frostCd = 0;
  frostEnabled: boolean;
  events: GEvent[] = [];
  state: 'play' | 'win' | 'lose' = 'play';
  kills = 0;
  bossKills = 0;
  peakN = 0;
  collected = 0;
  shotsThisStep = 0;
  chunk = 0;

  private nextId = 1;
  private spawners: Spawner[] = [];
  private tl: LevelEvent[];
  private tlIdx = 0;
  private tlPhase = 0;
  private tlTimer = 0;
  private fireAcc = 0;
  private releaseAcc = 0;
  private futureCount = 0;
  private gridHead = new Int32Array(GRID_COLS * GRID_ROWS);
  private gridNext = new Int32Array(MAX_ENEMIES);

  constructor(opts: WorldOpts) {
    this.level = opts.level;
    this.stats = upgradeStats(opts.upg);
    this.rand = mulberry32(opts.seed ?? (Math.random() * 1e9) | 0);
    this.N = Math.max(1, opts.level.start + this.stats.startBonus);
    this.peakN = this.N;
    this.frostEnabled = opts.level.frost !== false;
    this.frostCd = this.frostEnabled ? 6 : 0;
    this.tl = opts.level.endless ? endlessChunk(this.chunk++) : opts.level.events.slice();
    this.recountFuture();
    this.lanes = [this.makeLane(-1, opts.level.lanes.L ?? null), this.makeLane(1, opts.level.lanes.R ?? null)];
    for (let i = 0; i < this.N && i < VIS_CAP; i++) this.addVisible(0, F.front + 0.5);
    this.updateShape();
    for (const s of this.soldiers) s.born = -10;
  }

  // ---------------------------------------------------------------- helpers
  private makeLane(side: number, def: LaneDef | null): Lane {
    const lane: Lane = { side, x: side * F.laneX, def, idx: 0, spawned: 0, delay: def?.delay ?? 0, panels: [], wall: null };
    if (def && def.wall && def.wall > 0) {
      lane.wall = { side, hp: def.wall, maxHp: def.wall, z: F.wallZ, flash: 0, alive: true };
    }
    if (def) {
      // prefill the conveyor so it looks alive from the start
      const spacing = def.spacing ?? 2.3;
      const stopZ = lane.wall ? F.wallZ - 0.9 : F.front - 6;
      for (let z = stopZ; z > F.panelSpawnZ && (def.count === undefined || lane.spawned < def.count); z -= spacing) {
        this.spawnPanel(lane, z);
      }
    }
    return lane;
  }

  private spawnPanel(lane: Lane, z: number) {
    const def = lane.def!;
    const p = parsePanel(def.panels[lane.idx % def.panels.length]);
    lane.idx++;
    lane.spawned++;
    lane.panels.push({ id: this.nextId++, side: lane.side, x: lane.x, z, kind: p.kind, n: p.n, text: p.text, pop: 0 });
  }

  private recountFuture() {
    let c = 0;
    for (let i = this.tlIdx; i < this.tl.length; i++) {
      const e = this.tl[i];
      if (e.type === 'wave') c += e.count;
    }
    this.futureCount = c;
  }

  remaining(): number {
    let c = this.futureCount;
    for (const s of this.spawners) c += s.left;
    for (const e of this.enemies) if (e.state !== ES.Dying) c++;
    return c;
  }

  private threat(): number {
    let c = 0;
    for (const s of this.spawners) c += s.left;
    for (const e of this.enemies) if (e.state !== ES.Dying) c++;
    for (const b of this.bosses) if (b.state !== 'dead') c++;
    return c;
  }

  bossAlive(): Boss | undefined {
    return this.bosses.find((b) => b.state !== 'dead');
  }

  stars(): number {
    if (this.state !== 'win') return 0;
    if (this.N >= this.level.stars[1]) return 3;
    if (this.N >= this.level.stars[0]) return 2;
    return 1;
  }

  private addVisible(x: number, z: number) {
    this.soldiers.push({ x: x + (this.rand() - 0.5) * 0.6, z: z + (this.rand() - 0.5) * 0.6, phase: this.rand() * 6.28, born: this.t });
  }

  private removeVisible(i: number, how: string) {
    const s = this.soldiers[i];
    this.events.push({ k: 'sdie', x: s.x, z: s.z, how });
    const last = this.soldiers.pop()!;
    if (i < this.soldiers.length) this.soldiers[i] = last;
  }

  private nearestSoldier(x: number, z: number): number {
    let bi = -1;
    let bd = 1e9;
    for (let i = 0; i < this.soldiers.length; i++) {
      const s = this.soldiers[i];
      const d = (s.x - x) * (s.x - x) + (s.z - z) * (s.z - z);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    return bi;
  }

  addSoldiers(n: number, x: number, z: number) {
    this.N = Math.min(MAX_ARMY, this.N + n);
    if (this.N > this.peakN) this.peakN = this.N;
    const want = Math.min(this.N, VIS_CAP);
    while (this.soldiers.length < want) this.addVisible(x, z);
  }

  killSoldiers(n: number, x: number, z: number, how: string) {
    if (n <= 0) return;
    this.N = Math.max(0, this.N - n);
    const want = Math.min(this.N, VIS_CAP);
    let removed = 0;
    while (this.soldiers.length > want) {
      const i = this.nearestSoldier(x, z);
      if (i < 0) break;
      this.removeVisible(i, how);
      removed++;
    }
    if (removed === 0 && this.soldiers.length) {
      const i = this.nearestSoldier(x, z);
      const s = this.soldiers[i];
      this.events.push({ k: 'sdie', x: s.x, z: s.z, how });
    }
  }

  /** kill soldiers inside a region; returns kills */
  private killIn(test: (x: number, z: number) => boolean, how: string): number {
    if (!this.soldiers.length) return 0;
    const inside: number[] = [];
    for (let i = 0; i < this.soldiers.length; i++) if (test(this.soldiers[i].x, this.soldiers[i].z)) inside.push(i);
    if (!inside.length) return 0;
    const frac = inside.length / this.soldiers.length;
    const kills = this.N > this.soldiers.length ? Math.round(frac * this.N) : inside.length;
    // remove from highest index to keep indices valid
    inside.sort((a, b) => b - a);
    for (const i of inside) this.removeVisible(i, how);
    this.N = Math.max(0, this.N - kills);
    const want = Math.min(this.N, VIS_CAP);
    while (this.soldiers.length > want) this.removeVisible(this.soldiers.length - 1, how);
    while (this.soldiers.length < want) this.addVisible(this.ax, this.cz + this.Rz);
    return kills;
  }

  private updateShape() {
    const K = Math.max(1, this.soldiers.length);
    const R = ARMY_SPACING * Math.sqrt(K) + 0.3;
    const sx = Math.min(1, 4.3 / R);
    this.Rx = R * sx;
    this.Rz = R / sx;
    this.cz = F.front + this.Rz;
  }

  /** formation slot offsets (relative x, absolute z) of the visible soldiers */
  slotOffsets(): [number, number][] {
    const n = this.soldiers.length;
    const sx = this.Rx / Math.max(0.01, ARMY_SPACING * Math.sqrt(Math.max(1, n)) + 0.3);
    const out: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const r = ARMY_SPACING * Math.sqrt(i + 0.5);
      const a = i * 2.39996;
      out.push([Math.cos(a) * r * sx, this.cz + (Math.sin(a) * r) / sx]);
    }
    return out;
  }

  // ---------------------------------------------------------------- input
  setTarget(x: number) {
    this.targetX = x;
  }

  castFrost(): boolean {
    if (!this.frostEnabled || this.frostCd > 0 || this.state !== 'play' || this.frostWave) return false;
    this.frostCd = this.stats.frostCd;
    this.frostWave = { x: this.ax, z: F.front, z0: F.front, zEnd: F.front - this.stats.frostRange, w: this.stats.frostWidth };
    this.events.push({ k: 'frost', x: this.ax, z: F.front });
    return true;
  }

  // ---------------------------------------------------------------- update
  update(dt: number) {
    if (this.state !== 'play') {
      // keep effects animating a bit
      this.t += dt;
      this.updateSoldiers(dt);
      this.updateArrows(dt);
      return;
    }
    this.t += dt;
    this.shotsThisStep = 0;
    this.updateTimeline(dt);
    this.updateSpawners(dt);
    this.updateArmy(dt);
    this.buildGrid();
    this.shoot(dt);
    this.updateArrows(dt);
    this.updateEnemies(dt);
    this.updateBosses(dt);
    this.updateTeles(dt);
    this.updateEProj(dt);
    this.updateLanes(dt);
    this.updateGates(dt);
    this.updateFrost(dt);
    this.updateSoldiers(dt);

    if (this.N <= 0) {
      this.state = 'lose';
      this.events.push({ k: 'lose' });
    } else if (!this.level.endless && this.tlIdx >= this.tl.length && this.threat() === 0) {
      this.state = 'win';
      this.events.push({ k: 'win' });
    }
  }

  private updateTimeline(dt: number) {
    for (let guard = 0; guard < 20; guard++) {
      if (this.tlIdx >= this.tl.length) {
        if (this.level.endless) {
          this.tl.push(...endlessChunk(this.chunk++));
          if (this.chunk > 1) this.events.push({ k: 'msg', text: `第 ${this.chunk} 波 · 敌军更强了！` });
          this.recountFuture();
        } else return;
      }
      const e = this.tl[this.tlIdx];
      if (this.tlPhase === 0) {
        if (e.clear !== undefined && this.threat() > e.clear) return;
        this.tlPhase = 1;
        this.tlTimer = e.wait ?? 0;
      }
      this.tlTimer -= dt;
      dt = 0;
      if (this.tlTimer > 0) return;
      this.fireEvent(e);
      this.tlIdx++;
      this.tlPhase = 0;
      this.recountFuture();
    }
  }

  private fireEvent(e: LevelEvent) {
    switch (e.type) {
      case 'wave':
        if (e.pre) this.placeBlock(e.enemy, e.count, (e.hp ?? 1) * this.dynHp());
        else this.spawners.push({ type: e.enemy, left: e.count, rate: e.rate ?? 8, acc: 0, width: e.width ?? F.centerHalf - 0.5, hp: e.hp ?? 1 });
        break;
      case 'boss':
        this.spawnBoss(e.kind, Math.round(e.hp * Math.pow(this.dynHp(), 1.2)), e.name ?? BOSS[e.kind].title);
        break;
      case 'lane': {
        const i = e.side === 'L' ? 0 : 1;
        const old = this.lanes[i];
        const nl = this.makeLane(old.side, e.lane);
        this.lanes[i] = nl;
        break;
      }
      case 'gate': {
        const mk = (s: string): GateHalf => {
          if (s[0] === 'x') return { op: 'mul', v: Number(s.slice(1)), max: 0, hits: 0, flash: 0 };
          const v = Number(s);
          return { op: 'add', v, max: v + 2 * Math.max(50, Math.abs(v)), hits: 0, flash: 0 };
        };
        this.gates.push({ id: this.nextId++, z: F.dividerEndZ - 1, age: 0, shoot: e.shoot ?? 0, halves: [mk(e.left), mk(e.right)], passed: -1, fade: 0 });
        break;
      }
      case 'msg':
        this.events.push({ k: 'msg', text: e.text });
        break;
    }
  }

  private makeEnemy(type: EType, x: number, z: number, state: ES, hpMul = 1): Enemy {
    const d = ENEMY[type];
    const hp = d.hp * hpMul;
    return { type, x, z, hp, maxHp: hp, r: d.r, speed: d.speed * (0.9 + this.rand() * 0.2), state, t: 1 + this.rand() * 2, how: 'ice', flash: 0, phase: this.rand() * 6.28 };
  }

  private placeBlock(type: EType, count: number, hpMul: number) {
    const w = F.centerHalf - 0.35;
    const sp = type === 'inf' || type === 'archer' ? 0.6 : 0.78;
    const perRow = Math.floor((2 * w) / sp);
    for (let i = 0; i < count && this.enemies.length < MAX_ENEMIES; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const x = -w + (col + 0.5) * ((2 * w) / perRow) + (this.rand() - 0.5) * 0.2 + (row % 2 ? 0.15 : -0.15);
      const z = F.holdZ - 0.4 - row * sp * 0.92 + (this.rand() - 0.5) * 0.2;
      this.enemies.push(this.makeEnemy(type, x, z, type === 'cav' || type === 'ram' ? ES.Charge : ES.March, hpMul));
    }
  }

  /** endless mode: enemies scale with the size of the player's army so a snowball never trivialises it */
  private dynHp(): number {
    return this.level.endless ? Math.pow(Math.max(1, this.N / 200), 0.9) : 1;
  }

  private updateSpawners(dt: number) {
    const dyn = this.dynHp();
    for (let i = this.spawners.length - 1; i >= 0; i--) {
      const s = this.spawners[i];
      s.acc += dt * s.rate;
      while (s.acc >= 1 && s.left > 0 && this.enemies.length < MAX_ENEMIES) {
        s.acc -= 1;
        s.left--;
        const x = (this.rand() * 2 - 1) * s.width;
        const z = F.spawnZ - this.rand() * 4;
        this.enemies.push(this.makeEnemy(s.type, x, z, s.type === 'cav' || s.type === 'ram' ? ES.Charge : ES.March, s.hp * dyn));
      }
      if (s.left <= 0) this.spawners.splice(i, 1);
    }
  }

  private spawnBoss(kind: BossKind, hp: number, name: string) {
    const d = BOSS[kind];
    const b: Boss = {
      id: this.nextId++, kind, name, hp, maxHp: hp, x: 0, z: -38, r: d.r, state: 'walk', t: 0, cd: d.cd, frozen: 0, flash: 0, atk: 0, dashTo: 0,
      contactAcc: 0, dmgAcc: 0, dmgT: 0, enraged: false, anim: '', animT: 0,
    };
    this.bosses.push(b);
    this.events.push({ k: 'bspawn', id: b.id, name, kind });
  }

  private updateArmy(dt: number) {
    const minX = F.minX + this.Rx * 0.55;
    const maxX = F.maxX - this.Rx * 0.55;
    const tx = Math.max(minX, Math.min(maxX, this.targetX));
    const maxSpeed = 15;
    const prev = this.ax;
    const diff = tx - this.ax;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), maxSpeed * dt, Math.abs(diff) * Math.min(1, dt * 12) + 0.02);
    this.ax += step;
    this.ax = Math.max(minX, Math.min(maxX, this.ax));
    this.armyVX = (this.ax - prev) / Math.max(dt, 1e-4);
    this.updateShape();
  }

  private updateSoldiers(dt: number) {
    const sx = this.Rx / Math.max(0.01, ARMY_SPACING * Math.sqrt(Math.max(1, this.soldiers.length)) + 0.3);
    const k = Math.min(1, dt * 7);
    for (let i = 0; i < this.soldiers.length; i++) {
      const s = this.soldiers[i];
      const r = ARMY_SPACING * Math.sqrt(i + 0.5);
      const a = i * 2.39996;
      const tx = this.ax + Math.cos(a) * r * sx;
      const tz = this.cz + Math.sin(a) * r / sx;
      s.x += (tx - s.x) * k;
      s.z += (tz - s.z) * k;
    }
  }

  private buildGrid() {
    this.gridHead.fill(-1);
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.state === ES.Dying) continue;
      const c = this.cellOf(e.x, e.z);
      if (c < 0) continue;
      this.gridNext[i] = this.gridHead[c];
      this.gridHead[c] = i;
    }
  }

  private cellOf(x: number, z: number): number {
    const cx = Math.floor(x - GRID_X0);
    const cz = Math.floor(z - GRID_Z0);
    if (cx < 0 || cx >= GRID_COLS || cz < 0 || cz >= GRID_ROWS) return -1;
    return cz * GRID_COLS + cx;
  }

  private shoot(dt: number) {
    if (!this.soldiers.length) return;
    const shooters = Math.min(this.N, SHOOT_CAP);
    const dmg = this.stats.damage * (this.N / shooters);
    this.fireAcc += dt * this.stats.rate * shooters;
    if (this.fireAcc < 1) return;
    // nearby chargers get light auto-aim so a small army can defend itself
    const near: Enemy[] = [];
    for (const e of this.enemies) if (e.state === ES.Charge && e.z > F.front - 16 && e.z < this.cz + this.Rz) near.push(e);
    while (this.fireAcc >= 1) {
      this.fireAcc -= 1;
      const s = this.soldiers[(this.rand() * this.soldiers.length) | 0];
      let vx = 0;
      let bd = 1e9;
      for (const e of near) {
        const dz = s.z - e.z;
        const dx = e.x - s.x;
        if (dz < 0.5 || Math.abs(dx) > dz * 0.45 + 0.6) continue;
        const d = dx * dx + dz * dz;
        if (d < bd) {
          bd = d;
          vx = (dx / dz) * F.arrowSpeed;
        }
      }
      this.arrows.push({ x: s.x + (this.rand() - 0.5) * 0.12, vx, z: s.z - 0.35, y: 0.8, dmg, life: (F.arrowRange + (s.z - F.front)) / F.arrowSpeed });
      this.shotsThisStep++;
    }
  }

  private updateArrows(dt: number) {
    const arr = this.arrows;
    for (let i = arr.length - 1; i >= 0; i--) {
      const a = arr[i];
      const z0 = a.z;
      a.z -= F.arrowSpeed * dt;
      a.x += a.vx * dt;
      a.life -= dt;
      let dead = a.life <= 0;
      if (!dead && this.state === 'play') dead = this.arrowHits(a, z0);
      if (dead) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
      }
    }
  }

  /** returns true if arrow consumed */
  private arrowHits(a: Arrow, z0: number): boolean {
    for (let pierce = 0; pierce < 4; pierce++) {
      let bestZ = -1e9;
      let kind = 0; // 1 enemy 2 boss 3 wall 4 gate 5 divider
      let ref: number = -1;
      // dividers
      if (a.z < F.dividerEndZ && Math.abs(Math.abs(a.x) - F.dividerX) < F.dividerHalf) {
        bestZ = Math.min(z0, F.dividerEndZ);
        kind = 5;
      }
      // walls
      for (let li = 0; li < 2; li++) {
        const w = this.lanes[li].wall;
        if (!w || !w.alive) continue;
        if (Math.abs(a.x - this.lanes[li].x) < F.laneHalf + 0.05 && z0 >= w.z - 0.4 && a.z <= w.z + 0.4 && w.z > bestZ) {
          bestZ = w.z;
          kind = 3;
          ref = li;
        }
      }
      // gates
      for (let gi = 0; gi < this.gates.length; gi++) {
        const g = this.gates[gi];
        if (!g.shoot || g.passed >= 0 || g.age < 0.6) continue;
        if (Math.abs(a.x) < F.centerHalf && z0 >= g.z - 0.3 && a.z <= g.z + 0.3 && g.z > bestZ) {
          bestZ = g.z;
          kind = 4;
          ref = gi;
        }
      }
      // bosses
      for (let bi = 0; bi < this.bosses.length; bi++) {
        const b = this.bosses[bi];
        if (b.state === 'dead') continue;
        if (Math.abs(a.x - b.x) < b.r && z0 >= b.z - b.r * 0.7 && a.z <= b.z + b.r * 0.7 && b.z + b.r * 0.5 > bestZ) {
          bestZ = b.z + b.r * 0.5;
          kind = 2;
          ref = bi;
        }
      }
      // enemies via grid
      const cx0 = Math.floor(a.x - 1.2 - GRID_X0);
      const cx1 = Math.floor(a.x + 1.2 - GRID_X0);
      const cz0 = Math.floor(a.z - 1.2 - GRID_Z0);
      const cz1 = Math.floor(z0 + 1.2 - GRID_Z0);
      for (let cz = Math.max(0, cz0); cz <= Math.min(GRID_ROWS - 1, cz1); cz++) {
        for (let cx = Math.max(0, cx0); cx <= Math.min(GRID_COLS - 1, cx1); cx++) {
          let j = this.gridHead[cz * GRID_COLS + cx];
          while (j >= 0) {
            const e = this.enemies[j];
            if (e.state !== ES.Dying && Math.abs(e.x - a.x) < e.r + 0.06 && e.z - e.r <= z0 && e.z + e.r >= a.z && e.z > bestZ) {
              bestZ = e.z;
              kind = 1;
              ref = j;
            }
            j = this.gridNext[j];
          }
        }
      }
      if (kind === 0) return false;
      if (kind === 5) return true;
      if (kind === 3) {
        const w = this.lanes[ref].wall!;
        w.hp -= a.dmg;
        w.flash = 0.08;
        this.events.push({ k: 'whit', side: w.side });
        if (w.hp <= 0) {
          w.alive = false;
          w.hp = 0;
          this.events.push({ k: 'wbreak', side: w.side, x: this.lanes[ref].x, z: w.z });
        }
        return true;
      }
      if (kind === 4) {
        const g = this.gates[ref];
        const h = g.halves[a.x < 0 ? 0 : 1];
        h.flash = 0.08;
        if (h.op === 'add' && h.v < h.max) {
          h.hits += Math.min(a.dmg, 3);
          while (h.hits >= g.shoot && h.v < h.max) {
            h.hits -= g.shoot;
            h.v += 1;
          }
        }
        return true;
      }
      if (kind === 2) {
        const b = this.bosses[ref];
        const dmg = a.dmg * (b.frozen > 0 ? 1.5 : 1);
        b.hp -= dmg;
        if (b.flash < -0.09) b.flash = 0.07; // blink rather than staying white under sustained fire
        b.dmgAcc += dmg;
        if (b.hp <= 0) this.killBoss(b);
        return true;
      }
      // enemy
      const e = this.enemies[ref];
      const before = e.hp;
      e.hp -= a.dmg;
      e.flash = 0.1;
      if (e.hp <= 0) {
        this.killEnemy(e, 'ice');
        a.dmg -= before;
        if (a.dmg < 0.2) return true;
        a.z = e.z - 0.01;
        z0 = e.z - 0.01;
        continue;
      }
      if (e.type === 'ram') this.events.push({ k: 'ehitArrow', x: e.x, z: e.z, killed: false });
      return true;
    }
    return true;
  }

  private killEnemy(e: Enemy, how: 'ice' | 'frost') {
    e.state = ES.Dying;
    e.how = how;
    e.t = how === 'ice' ? 0.22 + this.rand() * 0.12 : 0.25 + this.rand() * 0.5;
    this.kills++;
  }

  private killBoss(b: Boss) {
    b.state = 'dead';
    b.t = 0;
    b.hp = 0;
    this.bossKills++;
    this.teles = this.teles.filter((t) => t.owner !== b.id);
    this.events.push({ k: 'bdie', id: b.id, x: b.x, z: b.z, kind: b.kind });
  }

  private updateEnemies(dt: number) {
    const es = this.enemies;
    const ax = this.ax;
    const cz = this.cz;
    const Rx = this.Rx;
    const Rz = this.Rz;
    // horde release
    const cmax = this.level.charge.max + (this.level.endless ? this.chunk * 5 : 0);
    const rate = Math.min(cmax, this.level.charge.base + this.level.charge.ramp * this.t);
    this.releaseAcc += dt * rate;
    let marchers = -1;
    if (this.releaseAcc >= 1) {
      marchers = 0;
      for (const e of es) if (e.state === ES.March && e.type !== 'archer') marchers++;
    }
    while (this.releaseAcc >= 1) {
      this.releaseAcc -= 1;
      if (marchers <= 0) break;
      let best: Enemy | null = null;
      for (let k = 0; k < 28; k++) {
        const e = es[(this.rand() * es.length) | 0];
        if (e.state === ES.March && e.type !== 'archer' && (!best || e.z > best.z)) best = e;
      }
      if (best) {
        best.state = ES.Charge;
        marchers--;
      }
    }
    const pending = this.spawners.length > 0 || this.tlIdx < this.tl.length;
    if (marchers >= 0 && marchers < 10 && !pending) {
      for (const e of es) if (e.state === ES.March) e.state = ES.Charge;
    }

    const head = this.gridHead;
    const next = this.gridNext;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.state === ES.Removed) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.state === ES.Dying) {
        e.t -= dt;
        if (e.t <= 0) {
          this.events.push({ k: 'edie', x: e.x, z: e.z, how: e.how, type: e.type });
          e.state = ES.Removed;
        }
        continue;
      }
      e.phase += dt * e.speed * 3.2;
      let vx = 0;
      let vz = 0;
      if (e.state === ES.March) {
        const hold = e.type === 'archer' ? F.holdZ - 3 : F.holdZ;
        if (e.z < hold) vz = e.speed;
        if (e.type === 'archer' && e.z > hold - 3) {
          // shoot at the army
          e.t -= dt;
          if (e.t <= 0 && this.soldiers.length && F.front - e.z < 30) {
            e.t = 2.4 + this.rand() * 1.4;
            const s = this.soldiers[(this.rand() * this.soldiers.length) | 0];
            const dur = 1.25;
            this.eproj.push({ x0: e.x, z0: e.z, x1: s.x + this.armyVX * dur * 0.3, z1: s.z, t: 0, dur });
          }
        }
      } else {
        // charge toward the army
        let dx = ax - e.x;
        const dz = cz - e.z;
        if (Math.abs(dx) < Rx * 0.6) dx *= 0.3;
        const d = Math.hypot(dx, dz) + 1e-4;
        const sp = e.speed * (e.type === 'inf' ? 1.25 : 1.05);
        vx = (dx / d) * sp;
        vz = (dz / d) * sp;
        if (vz < sp * 0.35 && e.z < cz - Rz) vz = sp * 0.35;
      }
      // separation
      if (e.type !== 'ram') {
        let px = 0;
        let pz = 0;
        let checks = 0;
        const ccx = Math.floor(e.x - GRID_X0);
        const ccz = Math.floor(e.z - GRID_Z0);
        for (let oz = -1; oz <= 1 && checks < 14; oz++) {
          const rz = ccz + oz;
          if (rz < 0 || rz >= GRID_ROWS) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const rx = ccx + ox;
            if (rx < 0 || rx >= GRID_COLS) continue;
            let j = head[rz * GRID_COLS + rx];
            while (j >= 0 && checks < 14) {
              const o = es[j];
              if (j !== i && o.state < ES.Dying) {
                const ddx = e.x - o.x;
                const ddz = e.z - o.z;
                const rr = e.r + o.r;
                const d2 = ddx * ddx + ddz * ddz;
                if (d2 < rr * rr && d2 > 1e-6) {
                  const d = Math.sqrt(d2);
                  const push = (rr - d) / d;
                  const wgt = o.type === 'ram' ? 1.0 : 0.5;
                  px += ddx * push * wgt;
                  pz += ddz * push * wgt;
                }
                checks++;
              }
              j = next[j];
            }
          }
        }
        e.x += px * Math.min(1, dt * 10);
        e.z += pz * Math.min(1, dt * 10);
      }
      e.x += vx * dt;
      e.z += vz * dt;
      if (e.state === ES.March) {
        const hold = e.type === 'archer' ? F.holdZ - 3 : F.holdZ;
        if (e.z > hold + 0.6) e.z = hold + 0.6;
      }
      if (e.z < F.dividerEndZ) {
        const lim = F.centerHalf - e.r;
        if (e.x < -lim) e.x = -lim;
        else if (e.x > lim) e.x = lim;
      } else {
        const lim = F.outerX - e.r;
        if (e.x < -lim) e.x = -lim;
        else if (e.x > lim) e.x = lim;
      }
      // contact with army
      if (e.z > F.front - 2.5) {
        const nx = (e.x - ax) / (Rx + e.r);
        const nz = (e.z - cz) / (Rz + e.r);
        if (nx * nx + nz * nz < 1) {
          const def = ENEMY[e.type];
          this.events.push({ k: 'edie', x: e.x, z: e.z, how: 'contact', type: e.type });
          if (e.type === 'ram') this.events.push({ k: 'ramHit', x: e.x, z: e.z, killed: Math.max(def.contact, Math.round(this.N * 0.06)) });
          const n = e.type === 'ram' ? Math.max(def.contact, Math.round(this.N * 0.06)) : Math.round(def.contact * Math.sqrt(e.maxHp / def.hp));
          this.killSoldiers(n, e.x, e.z, e.type === 'ram' ? 'slam' : 'contact');
          this.kills++;
          e.state = ES.Removed;
          continue;
        }
      }
      if (e.z > F.panelEndZ) e.state = ES.Removed;
    }
    let k = 0;
    for (let i = 0; i < es.length; i++) if (es[i].state !== ES.Removed) es[k++] = es[i];
    es.length = k;
  }

  private updateBosses(dt: number) {
    for (let i = this.bosses.length - 1; i >= 0; i--) {
      const b = this.bosses[i];
      if (b.flash > -1) b.flash -= dt;
      b.dmgT -= dt;
      if (b.dmgAcc > 0 && b.dmgT <= 0) {
        this.events.push({ k: 'bhit', id: b.id, dmg: Math.round(b.dmgAcc), x: b.x, z: b.z });
        b.dmgAcc = 0;
        b.dmgT = 0.22;
      }
      if (b.state === 'dead') {
        b.t += dt;
        if (b.t > 2.5) this.bosses.splice(i, 1);
        continue;
      }
      b.animT += dt;
      const def = BOSS[b.kind];
      if (!b.enraged && b.hp < b.maxHp * 0.5 && b.kind === 'warlord') {
        b.enraged = true;
        this.events.push({ k: 'summon', id: b.id });
        this.spawners.push({ type: 'cav', left: 30, rate: 6, acc: 0, width: 4, hp: 1 });
      }
      if (b.frozen > 0) {
        b.frozen -= dt;
        continue;
      }
      const tz = F.front - def.standoff - b.r;
      const followX = (spd: number) => {
        const dx = this.ax - b.x;
        b.x += Math.sign(dx) * Math.min(Math.abs(dx), spd * dt);
        const lim = (b.z < F.dividerEndZ ? F.centerHalf : F.outerX) - b.r * 0.6;
        b.x = Math.max(-lim, Math.min(lim, b.x));
      };
      switch (b.state) {
        case 'walk':
          b.z += def.speed * dt * (b.z < -20 ? 1.6 : 1);
          followX(1.2);
          if (b.z >= tz) {
            b.z = tz;
            b.state = 'idle';
            b.cd = Math.min(b.cd, 1.2);
          }
          if (b.z > -20) b.cd -= dt;
          if (b.cd <= 0 && b.kind === 'fire') this.startAttack(b);
          break;
        case 'idle':
          b.z += Math.sign(tz - b.z) * Math.min(Math.abs(tz - b.z), def.speed * dt);
          followX(b.kind === 'fire' ? 1.4 : 2.4);
          b.cd -= dt * (b.enraged ? 1.45 : 1);
          if (b.cd <= 0) this.startAttack(b);
          break;
        case 'windup':
          b.t -= dt;
          if (b.t <= 0) {
            b.state = 'recover';
            b.t = 0.7;
          }
          break;
        case 'recover':
          b.t -= dt;
          if (b.t <= 0) b.state = 'idle';
          break;
        case 'dash':
          b.z += 26 * dt;
          if (b.z >= b.dashTo) {
            b.z = b.dashTo;
            b.state = 'return';
          }
          break;
        case 'return':
          b.z -= 7 * dt;
          if (b.z <= tz) {
            b.z = tz;
            b.state = 'idle';
          }
          break;
      }
      // contact damage
      if (b.state !== 'dash') {
        const nx = (b.x - this.ax) / (this.Rx + b.r * 0.8);
        const nz = (b.z - this.cz) / (this.Rz + b.r * 0.8);
        if (nx * nx + nz * nz < 1) {
          b.contactAcc += dt * 5;
          if (b.contactAcc >= 1) {
            const n = Math.floor(b.contactAcc);
            b.contactAcc -= n;
            this.killSoldiers(n, b.x, b.z, 'slam');
          }
        }
      }
    }
  }

  private startAttack(b: Boss) {
    const def = BOSS[b.kind];
    b.cd = def.cd * (0.85 + this.rand() * 0.3);
    let kind: string = b.kind;
    if (b.kind === 'warlord') {
      const seq = ['slam', 'fire', 'slam', 'summon', 'fire', 'slam'];
      kind = seq[b.atk % seq.length];
    }
    b.atk++;
    b.anim = kind;
    b.animT = 0;
    const s = this.soldiers;
    if (kind === 'hammer' || kind === 'slam') {
      const r = b.kind === 'warlord' ? (b.enraged ? 3.6 : 3.2) : 2.7;
      const dur = b.kind === 'warlord' && b.enraged ? 0.95 : 1.15;
      this.teles.push({ id: this.nextId++, kind: 'circle', x: this.ax, z: F.front + 1.6, r, z0: 0, z1: 0, t: 0, dur, owner: b.id, dmg: 'slam' });
      b.state = 'windup';
      b.t = dur;
      b.anim = 'slam';
    } else if (kind === 'spear') {
      const dur = 1.2;
      this.teles.push({ id: this.nextId++, kind: 'strip', x: this.ax, z: 0, r: 1.25, z0: b.z, z1: this.cz + this.Rz + 2, t: 0, dur, owner: b.id, dmg: 'dash' });
      b.state = 'windup';
      b.t = dur + 0.01;
      b.x = this.ax;
    } else if (kind === 'fire') {
      const n = b.kind === 'warlord' ? (b.enraged ? 6 : 4) : b.hp < b.maxHp * 0.5 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const tgt = s.length ? s[(this.rand() * s.length) | 0] : { x: this.ax, z: this.cz };
        this.teles.push({ id: this.nextId++, kind: 'circle', x: tgt.x + (this.rand() - 0.5) * 1.5, z: tgt.z + (this.rand() - 0.5) * 1.5, r: 1.7, z0: b.x, z1: b.z, t: -i * 0.18, dur: 1.45, owner: b.id, dmg: 'fire' });
      }
      b.state = 'windup';
      b.t = 0.6;
    } else if (kind === 'summon') {
      this.spawners.push({ type: 'cav', left: 16, rate: 8, acc: 0, width: 4, hp: 1 });
      this.events.push({ k: 'summon', id: b.id });
      b.state = 'recover';
      b.t = 1.2;
    }
    this.events.push({ k: 'windup', id: b.id, kind: b.kind });
  }

  private updateTeles(dt: number) {
    for (let i = this.teles.length - 1; i >= 0; i--) {
      const t = this.teles[i];
      t.t += dt;
      if (t.dmg === 'dash') {
        const b = this.bosses.find((x) => x.id === t.owner);
        if (b) t.z0 = b.z;
      }
      if (t.t < t.dur) continue;
      this.teles.splice(i, 1);
      if (t.kind === 'circle') {
        const r2 = t.r * t.r;
        const killed = this.killIn((x, z) => (x - t.x) * (x - t.x) + (z - t.z) * (z - t.z) < r2, t.dmg === 'fire' ? 'fire' : 'slam');
        this.events.push({ k: t.dmg === 'fire' ? 'boom' : 'slam', x: t.x, z: t.z, r: t.r, killed });
      } else {
        const b = this.bosses.find((x) => x.id === t.owner);
        const killed = this.killIn((x, z) => Math.abs(x - t.x) < t.r && z > t.z0 - 1 && z < t.z1, 'slam');
        this.events.push({ k: 'dash', x: t.x, z0: t.z0, z1: t.z1, killed });
        if (b && b.state !== 'dead') {
          b.state = 'dash';
          b.dashTo = t.z1;
          b.x = t.x;
        }
      }
    }
  }

  private updateEProj(dt: number) {
    for (let i = this.eproj.length - 1; i >= 0; i--) {
      const p = this.eproj[i];
      p.t += dt;
      if (p.t >= p.dur) {
        this.eproj.splice(i, 1);
        const j = this.nearestSoldier(p.x1, p.z1);
        if (j >= 0) {
          const s = this.soldiers[j];
          if ((s.x - p.x1) ** 2 + (s.z - p.z1) ** 2 < 0.6 * 0.6) this.killSoldiers(Math.max(1, Math.round((0.4 * this.N) / this.soldiers.length)), p.x1, p.z1, 'arrow');
        }
      }
    }
  }

  private updateLanes(dt: number) {
    const reachX = this.Rx * 0.85 + F.laneHalf;
    for (const lane of this.lanes) {
      const w = lane.wall;
      if (w && w.flash > 0) w.flash -= dt;
      const def = lane.def;
      if (!def) continue;
      if (lane.delay > 0) {
        lane.delay -= dt;
        continue;
      }
      const spacing = def.spacing ?? 2.3;
      const speed = def.speed ?? 5;
      const last = lane.panels[lane.panels.length - 1];
      if ((def.count === undefined || lane.spawned < def.count) && (!last || last.z >= F.panelSpawnZ + spacing)) {
        this.spawnPanel(lane, last ? last.z - spacing : F.panelSpawnZ);
      }
      let prevZ = w && w.alive ? w.z - 0.9 + spacing : 1e9;
      for (let i = 0; i < lane.panels.length; i++) {
        const p = lane.panels[i];
        const maxZ = prevZ - spacing;
        p.z = Math.min(p.z + speed * dt, maxZ);
        prevZ = p.z;
      }
      for (let i = lane.panels.length - 1; i >= 0; i--) {
        const p = lane.panels[i];
        if (p.z > F.panelEndZ) {
          lane.panels.splice(i, 1);
          continue;
        }
        if (p.z >= F.front - 0.4 && p.z <= F.front + 2 * this.Rz && Math.abs(p.x - this.ax) < reachX) {
          lane.panels.splice(i, 1);
          this.applyPanel(p);
        }
      }
    }
    for (let i = this.popped.length - 1; i >= 0; i--) {
      const p = this.popped[i];
      p.pop += dt;
      p.z += 3 * dt;
      if (p.pop > 0.5) this.popped.splice(i, 1);
    }
  }

  private applyPanel(p: Panel) {
    p.pop = 0.001;
    this.popped.push(p);
    this.collected++;
    let good = true;
    const before = this.N;
    if (p.kind === 'add') {
      if (p.n >= 0) this.addSoldiers(p.n, p.x, p.z);
      else {
        good = false;
        this.killSoldiers(-p.n, p.x, p.z, 'trap');
      }
    } else if (p.kind === 'mul') {
      this.addSoldiers(Math.round(this.N * (p.n - 1)), p.x, p.z);
    } else if (p.kind === 'frost') {
      if (this.frostEnabled) {
        this.frostCd = 0;
        this.events.push({ k: 'frostReady' });
      }
    }
    const gained = this.N - before;
    this.events.push({ k: 'collect', x: p.x, z: p.z, text: p.text, good, big: Math.abs(gained) >= 20 || p.kind === 'mul' });
  }

  private updateGates(dt: number) {
    for (let i = this.gates.length - 1; i >= 0; i--) {
      const g = this.gates[i];
      g.age += dt;
      for (const h of g.halves) if (h.flash > 0) h.flash -= dt;
      if (g.passed >= 0) {
        g.fade += dt;
        g.z += 2.4 * dt;
        if (g.fade > 0.8) this.gates.splice(i, 1);
        continue;
      }
      if (g.age > 0.6) g.z += 2.3 * dt;
      if (g.z >= F.front && Math.abs(this.ax) > F.centerHalf + 0.2) {
        // army is in a side lane: the gate passes by harmlessly
        g.passed = 2;
        continue;
      }
      if (g.z >= F.front) {
        const side = this.ax < 0 ? 0 : 1;
        g.passed = side;
        const h = g.halves[side];
        const text = gateText(h);
        const gx = side === 0 ? -F.centerHalf / 2 : F.centerHalf / 2;
        let good = true;
        if (h.op === 'mul') this.addSoldiers(Math.round(this.N * (h.v - 1)), this.ax, F.front);
        else if (h.v >= 0) this.addSoldiers(h.v, this.ax, F.front);
        else {
          good = false;
          this.killSoldiers(-h.v, this.ax, F.front, 'trap');
        }
        this.events.push({ k: 'gate', x: gx, z: g.z, text, good });
      }
    }
  }

  private updateFrost(dt: number) {
    if (this.frostCd > 0) {
      const before = this.frostCd;
      this.frostCd = Math.max(0, this.frostCd - dt);
      if (before > 0 && this.frostCd === 0) this.events.push({ k: 'frostReady' });
    }
    const w = this.frostWave;
    if (!w) return;
    const z0 = w.z;
    w.z -= 30 * dt;
    const hw = w.w / 2;
    for (const e of this.enemies) {
      if (e.state === ES.Dying) continue;
      if (e.z <= z0 + 0.6 && e.z >= w.z - 0.6 && Math.abs(e.x - w.x) < hw + e.r) {
        if (e.type === 'ram') {
          e.hp -= 40;
          e.flash = 0.3;
          if (e.hp <= 0) this.killEnemy(e, 'frost');
        } else this.killEnemy(e, 'frost');
      }
    }
    for (const b of this.bosses) {
      if (b.state === 'dead' || b.frozen > 0) continue;
      if (b.z <= z0 + b.r && b.z >= w.z - b.r && Math.abs(b.x - w.x) < hw + b.r) {
        b.frozen = 3;
        if (b.state === 'windup' || b.state === 'dash') b.state = 'idle';
        b.cd = Math.max(b.cd, 1.5);
        this.teles = this.teles.filter((t) => t.owner !== b.id || t.dmg === 'fire');
        this.events.push({ k: 'bfreeze', id: b.id });
      }
    }
    for (let i = this.eproj.length - 1; i >= 0; i--) {
      const p = this.eproj[i];
      const k = p.t / p.dur;
      const px = p.x0 + (p.x1 - p.x0) * k;
      const pz = p.z0 + (p.z1 - p.z0) * k;
      if (pz <= z0 + 1 && pz >= w.z - 1 && Math.abs(px - w.x) < hw) this.eproj.splice(i, 1);
    }
    if (w.z <= w.zEnd) this.frostWave = null;
  }

  // ---------------------------------------------------------------- results
  coinsEarned(): number {
    return Math.floor(this.kills / 6) + this.bossKills * 40;
  }
}

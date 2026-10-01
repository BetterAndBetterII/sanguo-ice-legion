import * as THREE from 'three';
import { radialTexture, ringTexture } from './textures';
import { spikeGeometry } from './models';

const _c = new THREE.Color();

/** Instanced debris / shard particles. */
export class Particles {
  readonly mesh: THREE.InstancedMesh;
  private n = 0;
  private readonly cap: number;
  private p: Float32Array; // x y z vx vy vz rx ry rvx rvy life max scale bounce
  private static S = 14;
  constructor(cap: number, geo: THREE.BufferGeometry, mat: THREE.Material) {
    this.cap = cap;
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.p = new Float32Array(cap * Particles.S);
  }

  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, color: number, scale: number, life: number) {
    let i = this.n;
    if (i >= this.cap) i = (Math.random() * this.cap) | 0;
    else this.n++;
    const o = i * Particles.S;
    const p = this.p;
    p[o] = x;
    p[o + 1] = y;
    p[o + 2] = z;
    p[o + 3] = vx;
    p[o + 4] = vy;
    p[o + 5] = vz;
    p[o + 6] = Math.random() * 6;
    p[o + 7] = Math.random() * 6;
    p[o + 8] = (Math.random() - 0.5) * 14;
    p[o + 9] = (Math.random() - 0.5) * 14;
    p[o + 10] = life;
    p[o + 11] = life;
    p[o + 12] = scale;
    p[o + 13] = 0;
    _c.setHex(color);
    this.mesh.instanceColor!.setXYZ(i, _c.r, _c.g, _c.b);
  }

  burst(x: number, y: number, z: number, n: number, colors: number[], speed: number, up: number, scale: number, life: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.emit(
        x + (Math.random() - 0.5) * 0.3,
        y + Math.random() * 0.4,
        z + (Math.random() - 0.5) * 0.3,
        Math.cos(a) * s,
        up * (0.5 + Math.random()),
        Math.sin(a) * s,
        colors[(Math.random() * colors.length) | 0],
        scale * (0.6 + Math.random() * 0.8),
        life * (0.7 + Math.random() * 0.6),
      );
    }
  }

  update(dt: number) {
    const p = this.p;
    const S = Particles.S;
    const arr = this.mesh.instanceMatrix.array as Float32Array;
    const col = this.mesh.instanceColor!.array as Float32Array;
    let i = 0;
    while (i < this.n) {
      const o = i * S;
      p[o + 10] -= dt;
      if (p[o + 10] <= 0) {
        // swap-remove
        const last = this.n - 1;
        if (i !== last) {
          p.copyWithin(o, last * S, last * S + S);
          col[i * 3] = col[last * 3];
          col[i * 3 + 1] = col[last * 3 + 1];
          col[i * 3 + 2] = col[last * 3 + 2];
        }
        this.n--;
        continue;
      }
      p[o + 4] -= 22 * dt;
      p[o] += p[o + 3] * dt;
      p[o + 1] += p[o + 4] * dt;
      p[o + 2] += p[o + 5] * dt;
      if (p[o + 1] < 0.03) {
        p[o + 1] = 0.03;
        if (p[o + 13] < 2) {
          p[o + 4] = -p[o + 4] * 0.35;
          p[o + 13]++;
        } else p[o + 4] = 0;
        p[o + 3] *= 0.6;
        p[o + 5] *= 0.6;
        p[o + 8] *= 0.5;
        p[o + 9] *= 0.5;
      }
      p[o + 6] += p[o + 8] * dt;
      p[o + 7] += p[o + 9] * dt;
      const k = p[o + 10] / p[o + 11];
      const s = p[o + 12] * Math.min(1, k * 3);
      const rx = p[o + 6];
      const ry = p[o + 7];
      const cx = Math.cos(rx);
      const sx = Math.sin(rx);
      const cy = Math.cos(ry);
      const sy = Math.sin(ry);
      const m = i * 16;
      // R = Ry * Rx
      arr[m] = cy * s;
      arr[m + 1] = 0;
      arr[m + 2] = -sy * s;
      arr[m + 3] = 0;
      arr[m + 4] = sy * sx * s;
      arr[m + 5] = cx * s;
      arr[m + 6] = cy * sx * s;
      arr[m + 7] = 0;
      arr[m + 8] = sy * cx * s;
      arr[m + 9] = -sx * s;
      arr[m + 10] = cy * cx * s;
      arr[m + 11] = 0;
      arr[m + 12] = p[o];
      arr[m + 13] = p[o + 1];
      arr[m + 14] = p[o + 2];
      arr[m + 15] = 1;
      i++;
    }
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }

  clear() {
    this.n = 0;
    this.mesh.count = 0;
  }
}

interface RingFx {
  mesh: THREE.Mesh;
  t: number;
  dur: number;
  r0: number;
  r1: number;
  op: number;
  follow?: () => { x: number; z: number };
}

/** Flat expanding rings / glows on the ground. */
export class Rings {
  readonly group = new THREE.Group();
  private pool: RingFx[] = [];
  private active: RingFx[] = [];
  private geo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private texs: Record<string, THREE.Texture>;
  constructor() {
    this.texs = {
      ice: ringTexture('rgba(120,220,255,0.9)'),
      white: ringTexture('rgba(255,255,255,0.8)'),
      red: ringTexture('rgba(255,90,60,0.9)'),
      gold: ringTexture('rgba(255,210,80,0.9)'),
      glow: radialTexture('rgba(160,230,255,0.9)', 'rgba(160,230,255,0)'),
      fire: radialTexture('rgba(255,170,60,1)', 'rgba(255,80,20,0)'),
      dust: radialTexture('rgba(190,160,120,0.8)', 'rgba(190,160,120,0)'),
    };
  }

  spawn(kind: string, x: number, z: number, r0: number, r1: number, dur: number, op = 1, y = 0.06, follow?: () => { x: number; z: number }) {
    let fx = this.pool.pop();
    if (!fx) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(this.geo, mat);
      mesh.frustumCulled = false;
      fx = { mesh, t: 0, dur, r0, r1, op };
    }
    const mat = fx.mesh.material as THREE.MeshBasicMaterial;
    mat.map = this.texs[kind] ?? this.texs.white;
    mat.blending = kind === 'dust' ? THREE.NormalBlending : THREE.AdditiveBlending;
    mat.needsUpdate = true;
    fx.t = 0;
    fx.dur = dur;
    fx.r0 = r0;
    fx.r1 = r1;
    fx.op = op;
    fx.follow = follow;
    fx.mesh.position.set(x, y, z);
    fx.mesh.scale.setScalar(r0 * 2);
    this.group.add(fx.mesh);
    this.active.push(fx);
  }

  update(dt: number) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i];
      fx.t += dt;
      const k = Math.min(1, fx.t / fx.dur);
      const e = 1 - Math.pow(1 - k, 3);
      const r = fx.r0 + (fx.r1 - fx.r0) * e;
      fx.mesh.scale.set(r * 2, 1, r * 2);
      if (fx.follow) {
        const p = fx.follow();
        fx.mesh.position.x = p.x;
        fx.mesh.position.z = p.z;
      }
      (fx.mesh.material as THREE.MeshBasicMaterial).opacity = fx.op * (1 - k);
      if (k >= 1) {
        this.group.remove(fx.mesh);
        this.active.splice(i, 1);
        this.pool.push(fx);
      }
    }
  }

  clear() {
    for (const fx of this.active) {
      this.group.remove(fx.mesh);
      this.pool.push(fx);
    }
    this.active.length = 0;
  }
}

/** Ice spikes erupting from the ground (frost wave). */
export class Spikes {
  readonly mesh: THREE.InstancedMesh;
  private items: { x: number; z: number; t: number; dur: number; s: number; ry: number; tilt: number }[] = [];
  constructor(cap = 500) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xc8f2ff, emissive: 0x2a86c0, transparent: true, opacity: 0.92 });
    this.mesh = new THREE.InstancedMesh(spikeGeometry(), mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
  }
  spawn(x: number, z: number, s: number, dur = 0.9) {
    if (this.items.length >= this.mesh.instanceMatrix.count) this.items.shift();
    this.items.push({ x, z, t: 0, dur, s, ry: Math.random() * 6, tilt: (Math.random() - 0.5) * 0.6 });
  }
  update(dt: number) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    let n = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (it.t >= it.dur) {
        this.items.splice(i, 1);
        continue;
      }
      const k = it.t / it.dur;
      const grow = k < 0.15 ? k / 0.15 : k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      e.set(it.tilt, it.ry, it.tilt * 0.5);
      q.setFromEuler(e);
      v.set(it.x, -0.1, it.z);
      sc.set(it.s, it.s * grow * 1.3, it.s);
      m.compose(v, q, sc);
      this.mesh.setMatrixAt(n++, m);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  clear() {
    this.items.length = 0;
    this.mesh.count = 0;
  }
}

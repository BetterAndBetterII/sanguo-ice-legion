import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BossKind } from '../game/config';

interface PartOpts {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();

/** Bake a primitive into a non-indexed geometry with a flat vertex color. */
export function part(geo: THREE.BufferGeometry, color: number | string, o: PartOpts = {}): THREE.BufferGeometry {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g = g.clone();
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  tmpE.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  tmpQ.setFromEuler(tmpE);
  tmpM.compose(new THREE.Vector3(o.x ?? 0, o.y ?? 0, o.z ?? 0), tmpQ, new THREE.Vector3(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1));
  g.applyMatrix4(tmpM);
  const c = new THREE.Color(color);
  const n = g.getAttribute('position').count;
  const cols = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts, false)!;
  g.computeBoundingSphere();
  return g;
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
const sph = (r: number, ws = 8, hs = 6) => new THREE.SphereGeometry(r, ws, hs);
const cone = (r: number, h: number, s = 8) => new THREE.ConeGeometry(r, h, s);

const SKIN = 0xf2c39b;

/** Player archer (faces -z, camera sees the back). */
export function soldierGeometry(): THREE.BufferGeometry {
  const blue = 0x2b7cf2;
  const deep = 0x173f9a;
  const ice = 0xd8f4ff;
  const bowGeo = new THREE.TorusGeometry(0.26, 0.024, 4, 10, Math.PI);
  return merge([
    part(box(0.12, 0.32, 0.13), deep, { x: -0.08, y: 0.16 }),
    part(box(0.12, 0.32, 0.13), deep, { x: 0.08, y: 0.16 }),
    part(box(0.34, 0.36, 0.24), blue, { y: 0.5 }),
    part(box(0.36, 0.07, 0.26), ice, { y: 0.35 }),
    part(box(0.15, 0.08, 0.22), 0x8fd3ff, { x: -0.2, y: 0.67 }),
    part(box(0.15, 0.08, 0.22), 0x8fd3ff, { x: 0.2, y: 0.67 }),
    part(box(0.09, 0.3, 0.1), blue, { x: -0.23, y: 0.5, rx: -0.6 }),
    part(box(0.09, 0.3, 0.1), blue, { x: 0.23, y: 0.52, rx: -0.3 }),
    part(sph(0.15), SKIN, { y: 0.82 }),
    part(new THREE.SphereGeometry(0.17, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), 0x1f5fd6, { y: 0.84 }),
    part(box(0.05, 0.2, 0.16), ice, { y: 1.04, z: 0.02 }),
    part(box(0.34, 0.44, 0.04), 0x5cb6ff, { y: 0.5, z: 0.15, rx: 0.12 }),
    part(cyl(0.055, 0.05, 0.34, 6), 0x7a4a25, { x: 0.1, y: 0.64, z: 0.2, rz: 0.35 }),
    part(box(0.1, 0.06, 0.06), 0xffffff, { x: 0.16, y: 0.83, z: 0.2, rz: 0.35 }),
    part(bowGeo, ice, { x: -0.24, y: 0.58, z: -0.14, rz: -Math.PI / 2, ry: Math.PI / 2 }),
    part(box(0.012, 0.52, 0.012), 0xffffff, { x: -0.24, y: 0.58, z: -0.14 }),
  ]);
}

function redBody(torso: number, extra: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return merge([
    part(box(0.13, 0.32, 0.14), 0x3d1012, { x: -0.09, y: 0.16 }),
    part(box(0.13, 0.32, 0.14), 0x3d1012, { x: 0.09, y: 0.16 }),
    part(box(0.38, 0.38, 0.26), torso, { y: 0.5 }),
    part(box(0.3, 0.2, 0.04), 0x7d141c, { y: 0.55, z: 0.14 }),
    part(box(0.4, 0.07, 0.28), 0xe2b33c, { y: 0.34 }),
    part(box(0.1, 0.3, 0.11), torso, { x: -0.24, y: 0.5, rx: 0.3 }),
    part(box(0.1, 0.3, 0.11), torso, { x: 0.24, y: 0.5, rx: 0.3 }),
    part(sph(0.155), SKIN, { y: 0.83 }),
    part(box(0.14, 0.035, 0.03), 0x1a1a1a, { y: 0.79, z: 0.145 }),
    part(box(0.035, 0.035, 0.02), 0x1a1a1a, { x: -0.055, y: 0.86, z: 0.145 }),
    part(box(0.035, 0.035, 0.02), 0x1a1a1a, { x: 0.055, y: 0.86, z: 0.145 }),
    ...extra,
  ]);
}

export function infantryGeometry(): THREE.BufferGeometry {
  return redBody(0xd42a36, [
    part(cyl(0.16, 0.19, 0.12, 8), 0xa8141e, { y: 0.97 }),
    part(sph(0.05, 6, 4), 0xe2b33c, { y: 1.06 }),
    part(cyl(0.022, 0.022, 1.3, 4), 0x6b4a2a, { x: 0.27, y: 0.68, z: 0.08 }),
    part(cone(0.045, 0.16, 4), 0xdfe6ee, { x: 0.27, y: 1.41, z: 0.08 }),
  ]);
}

export function shieldGeometry(): THREE.BufferGeometry {
  return redBody(0xb3222c, [
    part(cyl(0.17, 0.2, 0.16, 8), 0x6a6f78, { y: 0.98 }),
    part(cone(0.06, 0.14, 6), 0xa8141e, { y: 1.12 }),
    part(box(0.5, 0.6, 0.06), 0xe2b33c, { y: 0.52, z: 0.21 }),
    part(box(0.44, 0.54, 0.06), 0x8c1b22, { y: 0.52, z: 0.24 }),
    part(sph(0.07, 6, 4), 0xe2b33c, { y: 0.55, z: 0.28 }),
  ]);
}

export function archerGeometry(): THREE.BufferGeometry {
  const bowGeo = new THREE.TorusGeometry(0.25, 0.022, 4, 10, Math.PI);
  return redBody(0x9b2a6a, [
    part(cone(0.3, 0.16, 8), 0xd9a441, { y: 1.0 }),
    part(bowGeo, 0x6b3a1a, { x: -0.26, y: 0.58, z: 0.12, rz: -Math.PI / 2, ry: -Math.PI / 2 }),
    part(cyl(0.05, 0.05, 0.3, 6), 0x5a3a1a, { x: 0.1, y: 0.64, z: -0.16, rz: -0.35 }),
  ]);
}

export function cavalryGeometry(): THREE.BufferGeometry {
  const horse = 0x5a3a28;
  const dark = 0x2e1d12;
  return merge([
    part(box(0.38, 0.4, 0.95), horse, { y: 0.62 }),
    part(box(0.22, 0.42, 0.24), horse, { y: 0.92, z: 0.45, rx: -0.5 }),
    part(box(0.17, 0.18, 0.36), horse, { y: 1.1, z: 0.64 }),
    part(box(0.06, 0.24, 0.3), dark, { y: 1.08, z: 0.42, rx: -0.5 }),
    part(box(0.09, 0.44, 0.09), dark, { x: -0.13, y: 0.22, z: 0.36 }),
    part(box(0.09, 0.44, 0.09), dark, { x: 0.13, y: 0.22, z: 0.36 }),
    part(box(0.09, 0.44, 0.09), dark, { x: -0.13, y: 0.22, z: -0.36 }),
    part(box(0.09, 0.44, 0.09), dark, { x: 0.13, y: 0.22, z: -0.36 }),
    part(box(0.06, 0.4, 0.06), dark, { y: 0.62, z: -0.5, rx: 0.5 }),
    part(box(0.44, 0.2, 0.5), 0xc4232f, { y: 0.84 }),
    part(box(0.34, 0.4, 0.24), 0xd42a36, { y: 1.12 }),
    part(sph(0.15), SKIN, { y: 1.44 }),
    part(cyl(0.17, 0.17, 0.12, 8), 0x6a6f78, { y: 1.57 }),
    part(box(0.06, 0.24, 0.03), 0xe2b33c, { y: 1.68 }),
    part(cyl(0.022, 0.022, 1.7, 4), 0x6b4a2a, { x: 0.25, y: 1.15, z: 0.3, rx: 1.1 }),
    part(cone(0.05, 0.2, 4), 0xdfe6ee, { x: 0.25, y: 1.5, z: 1.08, rx: 1.1 }),
  ]);
}

export function ramGeometry(): THREE.BufferGeometry {
  const wood = 0x6e4a2b;
  const dark = 0x3b2a1a;
  const w = (x: number, z: number) => part(cyl(0.34, 0.34, 0.16, 10), dark, { x, y: 0.34, z, rz: Math.PI / 2 });
  return merge([
    part(box(1.4, 0.4, 2.0), wood, { y: 0.55 }),
    w(-0.78, 0.62),
    w(0.78, 0.62),
    w(-0.78, -0.62),
    w(0.78, -0.62),
    part(box(0.12, 0.8, 0.12), dark, { x: -0.6, y: 1.1, z: 0.85 }),
    part(box(0.12, 0.8, 0.12), dark, { x: 0.6, y: 1.1, z: 0.85 }),
    part(box(0.12, 0.8, 0.12), dark, { x: -0.6, y: 1.1, z: -0.85 }),
    part(box(0.12, 0.8, 0.12), dark, { x: 0.6, y: 1.1, z: -0.85 }),
    part(cone(1.25, 0.7, 4), 0xa81e28, { y: 1.85, ry: Math.PI / 4, sz: 1.45 }),
    part(cyl(0.2, 0.2, 2.8, 8), 0x8a6038, { y: 0.95, z: 0.4, rx: Math.PI / 2 }),
    part(cone(0.26, 0.5, 8), 0x8d99a6, { y: 0.95, z: 2.0, rx: Math.PI / 2 }),
    part(box(0.04, 0.9, 0.04), dark, { y: 2.4, z: -0.3 }),
    part(box(0.5, 0.34, 0.02), 0xd42a36, { x: 0.25, y: 2.65, z: -0.3 }),
  ]);
}

/** Panel signboard frame (front faces +z). */
export function panelFrameGeometry(): THREE.BufferGeometry {
  return merge([
    part(box(2.1, 1.05, 0.12), 0xffffff, { y: 0.78 }),
    part(box(0.1, 0.4, 0.1), 0xffffff, { x: -0.85, y: 0.18 }),
    part(box(0.1, 0.4, 0.1), 0xffffff, { x: 0.85, y: 0.18 }),
  ]);
}

export function crystalGeometry(): THREE.BufferGeometry {
  const g = merge([part(cyl(0.5, 0.55, 1.6, 6), 0xffffff, { y: 0.8 }), part(cone(0.5, 0.8, 6), 0xffffff, { y: 2.0 })]);
  return g;
}

export function spikeGeometry(): THREE.BufferGeometry {
  return merge([part(cone(0.22, 1.1, 5), 0xffffff, { y: 0.55 })]);
}

// ------------------------------------------------------------------ bosses

export interface BossModel {
  group: THREE.Group;
  armR: THREE.Group;
  armL: THREE.Group;
  body: THREE.Group;
  mats: THREE.MeshLambertMaterial[];
  baseColors: THREE.Color[];
  ice: THREE.Mesh;
}

function m(color: number, mats: THREE.MeshLambertMaterial[], emissive = 0x000000) {
  const mat = new THREE.MeshLambertMaterial({ color, emissive });
  mats.push(mat);
  return mat;
}

export function bossModel(kind: BossKind): BossModel {
  const mats: THREE.MeshLambertMaterial[] = [];
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const pal = {
    hammer: { robe: 0xa3202c, collar: 0x8a2fa8, hat: 0xb3121e, trim: 0xe2b33c, weapon: 0x707782 },
    spear: { robe: 0x2f4f7a, collar: 0xc9d2db, hat: 0xc9d2db, trim: 0xd42a36, weapon: 0xdfe6ee },
    fire: { robe: 0xe0662a, collar: 0x3a1a12, hat: 0x2a1410, trim: 0xffc94a, weapon: 0xff8a2a },
    warlord: { robe: 0x2a2a33, collar: 0xb3121e, hat: 0xe0b040, trim: 0xe0b040, weapon: 0xd8dde4 },
  }[kind];
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0, parent: THREE.Object3D = body) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const dark = m(0x2b1414, mats);
  add(box(0.24, 0.5, 0.26), dark, -0.18, 0.25, 0);
  add(box(0.24, 0.5, 0.26), dark, 0.18, 0.25, 0);
  const robe = m(pal.robe, mats);
  add(cyl(0.42, 0.6, 0.9, 10), robe, 0, 0.85, 0);
  add(cyl(0.6, 0.62, 0.12, 10), m(pal.trim, mats), 0, 0.42, 0);
  add(box(0.86, 0.14, 0.62), m(pal.trim, mats), 0, 0.92, 0.02);
  add(box(0.18, 0.18, 0.06), m(0x7a1218, mats), 0, 0.92, 0.33);
  const collar = add(new THREE.TorusGeometry(0.38, 0.15, 6, 14), m(pal.collar, mats), 0, 1.28, 0);
  collar.rotation.x = Math.PI / 2;
  add(cyl(0.36, 0.42, 0.3, 10), robe, 0, 1.22, 0);
  const skin = m(SKIN, mats);
  add(sph(0.32, 12, 10), skin, 0, 1.62, 0.02);
  const black = m(0x161616, mats);
  const beard = add(cone(0.24, 0.42, 8), black, 0, 1.36, 0.2);
  beard.rotation.x = Math.PI;
  add(box(0.3, 0.07, 0.06), black, 0, 1.52, 0.3);
  add(box(0.12, 0.05, 0.04), black, -0.12, 1.74, 0.29).rotation.z = -0.35;
  add(box(0.12, 0.05, 0.04), black, 0.12, 1.74, 0.29).rotation.z = 0.35;
  const white = m(0xffffff, mats);
  add(sph(0.045, 6, 4), white, -0.11, 1.66, 0.29);
  add(sph(0.045, 6, 4), white, 0.11, 1.66, 0.29);
  const hat = m(pal.hat, mats);
  if (kind === 'warlord') {
    add(cyl(0.34, 0.36, 0.22, 10), hat, 0, 1.9, 0);
    const plumeMat = m(0xd42a36, mats);
    for (const sx of [-1, 1]) {
      const p = add(box(0.05, 1.3, 0.05), plumeMat, sx * 0.18, 2.5, -0.15);
      p.rotation.z = -sx * 0.45;
      p.rotation.x = -0.3;
    }
    add(box(0.16, 0.16, 0.06), m(0xd42a36, mats), 0, 1.98, 0.32);
  } else if (kind === 'spear') {
    add(new THREE.SphereGeometry(0.36, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hat, 0, 1.72, 0);
    add(cone(0.08, 0.4, 6), m(0xd42a36, mats), 0, 2.15, 0);
  } else {
    add(box(0.5, 0.22, 0.42), hat, 0, 1.92, 0);
    add(box(0.52, 0.06, 0.44), m(pal.trim, mats), 0, 1.84, 0);
  }
  // arms
  const mkArm = (sx: number) => {
    const g = new THREE.Group();
    g.position.set(sx * 0.58, 1.3, 0);
    body.add(g);
    const a = add(cyl(0.13, 0.11, 0.62, 8), robe, 0, -0.3, 0, g);
    a.rotation.z = sx * 0.1;
    add(sph(0.12, 8, 6), skin, 0, -0.66, 0.02, g);
    add(sph(0.17, 8, 6), m(pal.collar, mats), 0, 0.02, 0, g);
    return g;
  };
  const armR = mkArm(1);
  const armL = mkArm(-1);
  const wmat = m(pal.weapon, mats);
  const wood = m(0x6b4a2a, mats);
  if (kind === 'hammer') {
    add(cyl(0.05, 0.05, 1.5, 6), wood, 0, -0.5, 0.4, armR).rotation.x = Math.PI / 2;
    add(box(0.55, 0.45, 0.45), wmat, 0, -0.5, 1.15, armR);
    add(box(0.6, 0.08, 0.5), m(0x3c4048, mats), 0, -0.3, 1.15, armR);
  } else if (kind === 'spear') {
    add(cyl(0.04, 0.04, 2.8, 6), wood, 0, -0.62, 0.4, armR).rotation.x = Math.PI / 2;
    const tip = add(cone(0.1, 0.5, 4), wmat, 0, -0.62, 2.0, armR);
    tip.rotation.x = Math.PI / 2;
    add(sph(0.1, 6, 4), m(0xd42a36, mats), 0, -0.62, 1.7, armR);
  } else if (kind === 'fire') {
    const orb = m(0xffa040, mats, 0xff5a10);
    add(sph(0.22, 10, 8), orb, 0, -0.75, 0.15, armR);
    add(sph(0.18, 10, 8), orb, 0, -0.72, 0.15, armL);
  } else {
    add(cyl(0.05, 0.05, 3.2, 6), m(0x8a1a1a, mats), 0, -0.62, 0.5, armR).rotation.x = Math.PI / 2;
    const blade = add(cone(0.12, 0.7, 4), wmat, 0, -0.62, 2.35, armR);
    blade.rotation.x = Math.PI / 2;
    const cres = add(new THREE.TorusGeometry(0.32, 0.06, 4, 10, Math.PI), wmat, 0.0, -0.62, 1.8, armR);
    cres.rotation.y = Math.PI / 2;
    cres.rotation.z = Math.PI / 2;
    add(box(0.9, 0.7, 0.06), m(0xb3121e, mats), 0, 1.0, -0.42).rotation.x = 0.15;
  }
  const iceMat = new THREE.MeshLambertMaterial({ color: 0xbfefff, transparent: true, opacity: 0.55, emissive: 0x3a90c0 });
  const ice = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 0), iceMat);
  ice.position.y = 1.1;
  ice.scale.set(1, 1.35, 1);
  ice.visible = false;
  group.add(ice);
  group.traverse((o) => {
    o.frustumCulled = false;
  });
  return { group, armR, armL, body, mats, baseColors: mats.map((x) => x.color.clone()), ice };
}

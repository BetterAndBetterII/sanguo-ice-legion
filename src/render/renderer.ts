import * as THREE from 'three';
import { F, VIS_CAP, ENEMY, BOSS } from '../game/config';
import type { EType } from '../game/config';
import { ES, gateText } from '../game/world';
import type { World, GEvent, Boss, Tele } from '../game/world';
import {
  soldierGeometry,
  infantryGeometry,
  shieldGeometry,
  archerGeometry,
  cavalryGeometry,
  ramGeometry,
  panelFrameGeometry,
  crystalGeometry,
  bossModel,
  part,
  merge,
} from './models';
import type { BossModel } from './models';
import {
  sandTexture,
  snowTexture,
  conveyorTexture,
  stoneTexture,
  radialTexture,
  panelLabel,
  panelStyle,
  panelStyleColor,
  TextTex,
  drawBigNumber,
  drawGate,
  bannerTexture,
  blueBannerTexture,
} from './textures';
import type { PanelStyle } from './textures';
import { Particles, Rings, Spikes } from './fx';

const ENEMY_CAP: Record<EType, number> = { inf: 4000, shield: 900, cav: 900, archer: 500, ram: 40 };

function tintMaterial(): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aTint;\nvarying vec4 vTint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTint = aTint;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vTint;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vTint.rgb, vTint.a);')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vTint.rgb * vTint.a * 0.55;');
  };
  return mat;
}

interface Unit {
  mesh: THREE.InstancedMesh;
  tint: THREE.InstancedBufferAttribute;
  cap: number;
  n: number;
}

function makeUnit(geo: THREE.BufferGeometry, mat: THREE.Material, cap: number): Unit {
  const g = geo.clone();
  const tint = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
  tint.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('aTint', tint);
  const mesh = new THREE.InstancedMesh(g, mat, cap);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  return { mesh, tint, cap, n: 0 };
}

/** write a TRS matrix with yaw (Y) and roll (Z) */
function writeM(arr: Float32Array, i: number, x: number, y: number, z: number, yaw: number, s: number, roll: number, sy = s) {
  const cy = Math.cos(yaw);
  const sny = Math.sin(yaw);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const o = i * 16;
  arr[o] = cy * cr * s;
  arr[o + 1] = sr * s;
  arr[o + 2] = -sny * cr * s;
  arr[o + 3] = 0;
  arr[o + 4] = -cy * sr * sy;
  arr[o + 5] = cr * sy;
  arr[o + 6] = sny * sr * sy;
  arr[o + 7] = 0;
  arr[o + 8] = sny * s;
  arr[o + 9] = 0;
  arr[o + 10] = cy * s;
  arr[o + 11] = 0;
  arr[o + 12] = x;
  arr[o + 13] = y;
  arr[o + 14] = z;
  arr[o + 15] = 1;
}

interface PanelView {
  group: THREE.Group;
  frame: THREE.Mesh;
  label: THREE.Mesh;
}

interface WallView {
  group: THREE.Group;
  block: THREE.Mesh;
  label: THREE.Mesh;
  tex: TextTex;
  baseX: number;
}

interface GateView {
  group: THREE.Group;
  halves: { mesh: THREE.Mesh; tex: TextTex }[];
}

interface BossView {
  model: BossModel;
  shadow: THREE.Mesh;
  deadT: number;
  crumbled: boolean;
  frozenShown: boolean;
}

interface TeleView {
  ring: THREE.Mesh;
  fill: THREE.Mesh;
  ball?: THREE.Mesh;
}

export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private container: HTMLElement;
  w = 1;
  h = 1;
  private camBase = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private camX = 0;
  shakeAmt = 0;
  private time = 0;

  private soldiers: Unit;
  private enemies: Record<EType, Unit>;
  private shadows: THREE.InstancedMesh;
  private arrows: THREE.InstancedMesh;
  private eArrows: THREE.InstancedMesh;
  private eMarks: THREE.InstancedMesh;
  private shards: Particles;
  private debris: Particles;
  rings = new Rings();
  private spikes = new Spikes(600);
  private conveyorTex: THREE.Texture[] = [];
  private panelGeo = panelFrameGeometry();
  private panelLabelGeo = new THREE.PlaneGeometry(1.95, 0.97);
  private panelFrameMats = new Map<PanelStyle, THREE.MeshLambertMaterial>();
  private labelMats = new Map<THREE.Texture, THREE.MeshBasicMaterial>();
  private panelViews = new Map<number, PanelView>();
  private panelPool: PanelView[] = [];
  private walls: (WallView | null)[] = [null, null];
  private closedLanes: THREE.Object3D[] = [];
  private gates = new Map<number, GateView>();
  private bossViews = new Map<number, BossView>();
  private teleViews = new Map<number, TeleView>();
  private telePool: TeleView[] = [];
  private frostFront: THREE.Mesh;
  private lastFrostZ = 0;
  private stoneTex = stoneTexture();
  private dyn = new THREE.Group();
  private snow: THREE.Points;
  private shadowTex = radialTexture('rgba(30,20,10,0.55)', 'rgba(30,20,10,0)');
  private redTex = radialTexture('rgba(255,40,30,0.55)', 'rgba(255,40,30,0.15)');
  private redRingTex: THREE.Texture;
  private budget = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(50, 0.5, 0.5, 260);
    this.scene.background = new THREE.Color(0xa9d8ec);
    this.scene.fog = new THREE.Fog(0xb4dcee, 70, 150);

    const hemi = new THREE.HemisphereLight(0xeef8ff, 0xc8a06a, 1.25);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.9);
    sun.position.set(-8, 18, 10);
    this.scene.add(sun);

    this.buildEnvironment();

    const unitMat = tintMaterial();
    this.soldiers = makeUnit(soldierGeometry(), unitMat, VIS_CAP + 10);
    this.enemies = {
      inf: makeUnit(infantryGeometry(), unitMat, ENEMY_CAP.inf),
      shield: makeUnit(shieldGeometry(), unitMat, ENEMY_CAP.shield),
      cav: makeUnit(cavalryGeometry(), unitMat, ENEMY_CAP.cav),
      archer: makeUnit(archerGeometry(), unitMat, ENEMY_CAP.archer),
      ram: makeUnit(ramGeometry(), unitMat, ENEMY_CAP.ram),
    };
    this.scene.add(this.soldiers.mesh);
    for (const u of Object.values(this.enemies)) this.scene.add(u.mesh);

    const shGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(shGeo, new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }), 6500);
    this.shadows.frustumCulled = false;
    this.shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.shadows.renderOrder = -1;
    this.scene.add(this.shadows);

    const arrowGeo = merge([part(new THREE.BoxGeometry(0.05, 0.05, 1.2), 0xffffff, { z: 0.2 }), part(new THREE.ConeGeometry(0.07, 0.22, 4), 0xffffff, { z: -0.5, rx: -Math.PI / 2 })]);
    this.arrows = new THREE.InstancedMesh(arrowGeo, new THREE.MeshBasicMaterial({ color: 0xdff8ff }), 1600);
    this.arrows.frustumCulled = false;
    this.arrows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.arrows);
    this.eArrows = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.06, 0.9), new THREE.MeshBasicMaterial({ color: 0x7a1a12 }), 300);
    this.eArrows.frustumCulled = false;
    this.scene.add(this.eArrows);
    this.redRingTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      g.strokeStyle = 'rgba(255,60,40,0.95)';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(32, 32, 26, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = 'rgba(255,60,40,0.35)';
      g.fill();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    this.eMarks = new THREE.InstancedMesh(shGeo, new THREE.MeshBasicMaterial({ map: this.redRingTex, transparent: true, depthWrite: false }), 300);
    this.eMarks.frustumCulled = false;
    this.scene.add(this.eMarks);

    const shardMat = new THREE.MeshLambertMaterial({ emissive: 0x335566 });
    this.shards = new Particles(3000, new THREE.TetrahedronGeometry(0.13), shardMat);
    this.scene.add(this.shards.mesh);
    const debrisMat = new THREE.MeshLambertMaterial({});
    this.debris = new Particles(1800, new THREE.BoxGeometry(0.16, 0.16, 0.16), debrisMat);
    this.scene.add(this.debris.mesh);
    this.scene.add(this.rings.group);
    this.scene.add(this.spikes.mesh);
    this.scene.add(this.dyn);

    const ff = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 2.4),
      new THREE.MeshBasicMaterial({ map: radialTexture('rgba(200,245,255,0.9)', 'rgba(120,210,255,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    ff.visible = false;
    this.frostFront = ff;
    this.scene.add(ff);

    // falling snow
    const sn = 500;
    const pos = new Float32Array(sn * 3);
    for (let i = 0; i < sn; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = Math.random() * 22;
      pos[i * 3 + 2] = -60 + Math.random() * 75;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.snow = new THREE.Points(
      sg,
      new THREE.PointsMaterial({ size: 0.16, map: radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 32), transparent: true, depthWrite: false, color: 0xffffff }),
    );
    this.snow.frustumCulled = false;
    this.scene.add(this.snow);

    this.resize();
  }

  // ------------------------------------------------------------------ environment
  private buildEnvironment() {
    const env = new THREE.Group();
    this.scene.add(env);
    const sand = sandTexture();
    sand.repeat.set(5, 40);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(16, 150), new THREE.MeshLambertMaterial({ map: sand }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -50);
    env.add(ground);
    const snow = snowTexture();
    snow.repeat.set(6, 50);
    for (const sx of [-1, 1]) {
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(40, 170), new THREE.MeshLambertMaterial({ map: snow }));
      sg.rotation.x = -Math.PI / 2;
      sg.position.set(sx * 28, -0.02, -55);
      env.add(sg);
    }
    // conveyors
    const cb = conveyorTexture('#5a6e86', '#8fb4d8');
    const cg = conveyorTexture('#7a6a4e', '#d8c07a');
    for (const [sx, tex] of [
      [-1, cb],
      [1, cg],
    ] as const) {
      tex.repeat.set(1, 66);
      this.conveyorTex.push(tex);
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 132), new THREE.MeshLambertMaterial({ map: tex }));
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(sx * F.laneX, 0.015, -44);
      env.add(plane);
      for (const ex of [-1.3, 1.3]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 132), new THREE.MeshLambertMaterial({ color: sx < 0 ? 0x3d5f8a : 0x8a6a2a }));
        rail.position.set(sx * F.laneX + ex, 0.07, -44);
        env.add(rail);
      }
    }
    // dividers
    const st = this.stoneTex.clone();
    st.repeat.set(1, 1);
    st.needsUpdate = true;
    const divLen = 110;
    const stoneLong = this.stoneTex.clone();
    stoneLong.repeat.set(30, 1);
    stoneLong.wrapS = stoneLong.wrapT = THREE.RepeatWrapping;
    stoneLong.needsUpdate = true;
    for (const sx of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, divLen), [
        new THREE.MeshLambertMaterial({ map: stoneLong }),
        new THREE.MeshLambertMaterial({ map: stoneLong }),
        new THREE.MeshLambertMaterial({ color: 0xc9c2b2 }),
        new THREE.MeshLambertMaterial({ color: 0xc9c2b2 }),
        new THREE.MeshLambertMaterial({ map: st }),
        new THREE.MeshLambertMaterial({ map: st }),
      ]);
      d.position.set(sx * F.dividerX, 1.2, F.dividerEndZ - divLen / 2);
      env.add(d);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, divLen), new THREE.MeshLambertMaterial({ color: 0x9a8f7c }));
      cap.position.set(sx * F.dividerX, 2.5, F.dividerEndZ - divLen / 2);
      env.add(cap);
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.6, 1.2), new THREE.MeshLambertMaterial({ map: st }));
      pillar.position.set(sx * F.dividerX, 1.8, F.dividerEndZ + 0.1);
      env.add(pillar);
      const pcap = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), new THREE.MeshLambertMaterial({ color: 0x8a7f6c }));
      pcap.position.set(sx * F.dividerX, 3.7, F.dividerEndZ + 0.1);
      env.add(pcap);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 140), new THREE.MeshLambertMaterial({ color: 0xbfb6a2 }));
      rim.position.set(sx * 7.85, 0.45, -48);
      env.add(rim);
      // banners on divider
      const bt = bannerTexture();
      for (let z = -20; z > -100; z -= 14) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), new THREE.MeshLambertMaterial({ color: 0x4a3420 }));
        pole.position.set(sx * F.dividerX, 3.6, z);
        env.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.4), new THREE.MeshLambertMaterial({ map: bt, side: THREE.DoubleSide, transparent: true }));
        flag.position.set(sx * F.dividerX + sx * 0.38, 3.9, z);
        env.add(flag);
      }
    }
    // our blue banners near the army
    const bb = blueBannerTexture();
    for (const sx of [-1, 1]) {
      for (const z of [6, 14]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 4), new THREE.MeshLambertMaterial({ color: 0x4a3420 }));
        pole.position.set(sx * 8.1, 1.5, z);
        env.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.6), new THREE.MeshLambertMaterial({ map: bb, side: THREE.DoubleSide, transparent: true }));
        flag.position.set(sx * 8.1 - sx * 0.42, 2.3, z);
        env.add(flag);
      }
    }
    // ice crystal cliffs
    const cGeo = crystalGeometry();
    const cMat = new THREE.MeshLambertMaterial({ emissive: 0x0d3a4a, vertexColors: false });
    const cnt = 260;
    const crystals = new THREE.InstancedMesh(cGeo, cMat, cnt);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const col = new THREE.Color();
    const palette = [0x5fd6d0, 0x3fb7c9, 0x8ee8f0, 0xbff4ff, 0x2a9fb8, 0x6fe0c8];
    for (let i = 0; i < cnt; i++) {
      const side = i % 2 ? 1 : -1;
      const z = 10 - Math.random() * 125;
      const near = z > -25;
      const x = side * ((near ? 9.6 : 8.7) + Math.random() * 7);
      const s = (near ? 0.6 + Math.random() * 1.1 : 0.7 + Math.random() * 2.2) + (Math.abs(x) > 12.5 ? 1.2 : 0);
      e.set((Math.random() - 0.5) * 0.4, Math.random() * 6, -side * (0.1 + Math.random() * 0.3));
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, -0.2, z), q, new THREE.Vector3(s, s * (1 + Math.random() * 1.2), s));
      crystals.setMatrixAt(i, m);
      col.setHex(palette[(Math.random() * palette.length) | 0]);
      crystals.setColorAt(i, col);
    }
    env.add(crystals);
    // enemy fortress at the far end
    const fortMat = new THREE.MeshLambertMaterial({ color: 0x8a5a4a });
    const fort = new THREE.Mesh(new THREE.BoxGeometry(22, 8, 3), fortMat);
    fort.position.set(0, 4, -106);
    env.add(fort);
    const gate = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 0.4), new THREE.MeshLambertMaterial({ color: 0x2a1410 }));
    gate.position.set(0, 3, -104.4);
    env.add(gate);
    for (const sx of [-1, 1]) {
      const tw = new THREE.Mesh(new THREE.BoxGeometry(4, 12, 4), fortMat);
      tw.position.set(sx * 9, 6, -105);
      env.add(tw);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 3, 4), new THREE.MeshLambertMaterial({ color: 0xa81e28 }));
      roof.position.set(sx * 9, 13.5, -105);
      roof.rotation.y = Math.PI / 4;
      env.add(roof);
    }
    const roofM = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 4), new THREE.MeshLambertMaterial({ color: 0xa81e28 }));
    roofM.position.set(0, 8.5, -105);
    env.add(roofM);
  }

  // ------------------------------------------------------------------ level setup
  setWorld(w: World) {
    // clear dynamic views
    for (const v of this.panelViews.values()) this.releasePanel(v);
    this.panelViews.clear();
    for (const wv of this.walls) if (wv) this.dyn.remove(wv.group);
    this.walls = [null, null];
    for (const o of this.closedLanes) this.dyn.remove(o);
    this.closedLanes = [];
    for (const g of this.gates.values()) this.dyn.remove(g.group);
    this.gates.clear();
    for (const b of this.bossViews.values()) {
      this.dyn.remove(b.model.group);
      this.dyn.remove(b.shadow);
    }
    this.bossViews.clear();
    for (const t of this.teleViews.values()) this.releaseTele(t);
    this.teleViews.clear();
    this.shards.clear();
    this.debris.clear();
    this.rings.clear();
    this.spikes.clear();
    this.shakeAmt = 0;
    this.camX = w.ax * 0.25;
    this.syncLanes(w);
  }

  private syncLanes(w: World) {
    for (let i = 0; i < 2; i++) {
      const lane = w.lanes[i];
      const cur = this.walls[i];
      if (lane.wall && (!cur || cur.group.userData.wall !== lane.wall)) {
        if (cur) this.dyn.remove(cur.group);
        this.walls[i] = this.makeWall(lane.x, lane.wall.z);
        this.walls[i]!.group.userData.wall = lane.wall;
      }
      if (!lane.def && this.closedLanes.length < 2 && !this.closedLanes.some((o) => o.userData.side === lane.side)) {
        const g = this.makeClosedGate(lane.x);
        g.userData.side = lane.side;
        this.closedLanes.push(g);
      }
    }
  }

  private makeWall(x: number, z: number): WallView {
    const group = new THREE.Group();
    const tex = this.stoneTex.clone();
    tex.repeat.set(1.5, 1);
    tex.needsUpdate = true;
    const block = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 1.1), new THREE.MeshLambertMaterial({ map: tex, color: 0xd8d0c0 }));
    block.position.set(0, 1.1, 0);
    group.add(block);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.25, 1.3), new THREE.MeshLambertMaterial({ color: 0x8a7f6c }));
    top.position.set(0, 2.3, 0);
    group.add(top);
    const tt = new TextTex(256, 128, drawBigNumber);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: tt.tex, transparent: true, depthWrite: false }));
    label.position.set(0, 0.75, 1.15);
    label.rotation.x = -0.75;
    label.renderOrder = 2;
    group.add(label);
    group.position.set(x, 0, z);
    this.dyn.add(group);
    return { group, block, label, tex: tt, baseX: x };
  }

  private makeClosedGate(x: number): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: 0x4a4f58 });
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.12), mat);
      bar.position.set(i * 0.5, 1.1, 0);
      g.add(bar);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 0.2), mat);
    beam.position.set(0, 1.9, 0);
    g.add(beam);
    const beam2 = beam.clone();
    beam2.position.y = 0.6;
    g.add(beam2);
    g.position.set(x, 0, F.wallZ);
    this.dyn.add(g);
    return g;
  }

  private getPanel(): PanelView {
    const v = this.panelPool.pop();
    if (v) {
      this.dyn.add(v.group);
      return v;
    }
    const group = new THREE.Group();
    const frame = new THREE.Mesh(this.panelGeo, undefined);
    const label = new THREE.Mesh(this.panelLabelGeo, undefined);
    label.position.set(0, 0.78, 0.07);
    group.add(frame);
    group.add(label);
    this.dyn.add(group);
    return { group, frame, label };
  }

  private releasePanel(v: PanelView) {
    this.dyn.remove(v.group);
    this.panelPool.push(v);
  }

  private frameMat(style: PanelStyle) {
    let m = this.panelFrameMats.get(style);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: panelStyleColor(style) });
      this.panelFrameMats.set(style, m);
    }
    return m;
  }

  private labelMat(tex: THREE.Texture) {
    let m = this.labelMats.get(tex);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      this.labelMats.set(tex, m);
    }
    return m;
  }

  private getTele(): TeleView {
    const v = this.telePool.pop();
    if (v) {
      this.dyn.add(v.ring, v.fill);
      return v;
    }
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.redRingTex, transparent: true, depthWrite: false }));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.redTex, transparent: true, depthWrite: false }));
    ring.renderOrder = 1;
    fill.renderOrder = 1;
    this.dyn.add(ring, fill);
    return { ring, fill };
  }

  private releaseTele(v: TeleView) {
    this.dyn.remove(v.ring, v.fill);
    if (v.ball) {
      this.dyn.remove(v.ball);
      v.ball = undefined;
    }
    this.telePool.push(v);
  }

  // ------------------------------------------------------------------ per-frame
  resize() {
    const r = this.container.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.renderer.setSize(this.w, this.h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    const aspect = this.w / this.h;
    const fov = aspect < 0.62 ? 52 : 46;
    this.camera.fov = fov;
    this.camera.aspect = aspect;
    const t = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const want = 17.2;
    const dist = Math.min(48, Math.max(24, want / 2 / (aspect * t)));
    const A = new THREE.Vector3(0, 0, 5);
    const phi = THREE.MathUtils.degToRad(57);
    this.camBase.set(0, Math.sin(phi) * dist, A.z + Math.cos(phi) * dist);
    const delta = THREE.MathUtils.degToRad(fov / 2) * 0.58;
    const look = phi - delta;
    this.camLook.set(0, this.camBase.y - Math.sin(look) * 40, this.camBase.z - Math.cos(look) * 40);
    this.camera.updateProjectionMatrix();
  }

  shake(a: number) {
    this.shakeAmt = Math.min(1.2, Math.max(this.shakeAmt, a));
  }

  project(x: number, y: number, z: number): { x: number; y: number; ok: boolean } {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.w, y: (-v.y * 0.5 + 0.5) * this.h, ok: v.z < 1 };
  }

  handleEvents(events: GEvent[], w: World) {
    this.budget = 0;
    for (const ev of events) this.onEvent(ev, w);
  }

  private onEvent(ev: GEvent, w: World) {
    const shards = this.shards;
    const debris = this.debris;
    switch (ev.k) {
      case 'edie': {
        this.budget++;
        const n = this.budget > 60 ? 1 : this.budget > 25 ? 2 : 5;
        if (ev.how === 'contact') {
          debris.burst(ev.x, 0.5, ev.z, n, [0xc4232f, 0x8a1a22, 0xd8b47a], 3, 4, 0.8, 0.6);
        } else if (ev.how === 'frost') {
          shards.burst(ev.x, 0.6, ev.z, n + 1, [0xbff4ff, 0x7fd8ff, 0xffffff], 3.5, 5, 1.1, 0.9);
        } else {
          shards.burst(ev.x, 0.6, ev.z, n, [0xffffff, 0xd8f4ff, 0xa8e4ff], 3, 5, 1, 0.8);
        }
        if (ev.type === 'ram') {
          debris.burst(ev.x, 0.8, ev.z, 30, [0x6e4a2b, 0x8a6038, 0xa81e28], 6, 8, 2.2, 1.2);
          this.rings.spawn('dust', ev.x, ev.z, 0.5, 3, 0.7, 0.8);
          this.shake(0.35);
        }
        break;
      }
      case 'sdie': {
        this.budget++;
        const n = this.budget > 40 ? 1 : 4;
        if (ev.how === 'fire') debris.burst(ev.x, 0.4, ev.z, n, [0x3a2a22, 0x8a8a8a, 0xff8a2a], 3, 5, 0.9, 0.9);
        else debris.burst(ev.x, 0.4, ev.z, n, [0x9aa0a8, 0x7a8088, 0x5a6068, 0x2b7cf2], 3, 5, 0.9, 1.0);
        break;
      }
      case 'collect': {
        const follow = () => ({ x: w.ax, z: w.cz });
        this.rings.spawn(ev.good ? (ev.big ? 'gold' : 'ice') : 'red', w.ax, w.cz, w.Rx * 0.6, w.Rx + 1.6, 0.45, 1, 0.08, follow);
        shards.burst(ev.x, 1, ev.z, ev.big ? 16 : 5, ev.good ? (ev.big ? [0xffe066, 0xffffff] : [0x8fd3ff, 0xffffff]) : [0xff5050, 0x7a0d14], 4, 6, 1, 0.7);
        if (ev.big) this.shake(0.15);
        break;
      }
      case 'gate':
        this.rings.spawn(ev.good ? 'gold' : 'red', w.ax, w.cz, 1, w.Rx + 3, 0.6, 1, 0.08, () => ({ x: w.ax, z: w.cz }));
        shards.burst(ev.x, 1.5, ev.z, 24, ev.good ? [0xffe066, 0x8fd3ff, 0xffffff] : [0xff5050, 0xffffff], 6, 7, 1.2, 1);
        this.shake(ev.good ? 0.2 : 0.4);
        break;
      case 'wbreak':
        debris.burst(ev.x, 1.2, ev.z, 50, [0xd8d0c0, 0xbfb6a2, 0x8a7f6c], 7, 9, 2.4, 1.4);
        this.rings.spawn('dust', ev.x, ev.z + 0.5, 1, 4.5, 0.9, 0.9);
        this.shake(0.55);
        break;
      case 'slam':
        this.rings.spawn('white', ev.x, ev.z, 0.5, ev.r + 1.2, 0.45, 1);
        this.rings.spawn('dust', ev.x, ev.z, 1, ev.r + 0.8, 0.9, 0.9);
        debris.burst(ev.x, 0.3, ev.z, 26, [0xbfa77a, 0x8a7a5a, 0x9aa0a8], 7, 7, 1.4, 1.1);
        this.shake(0.8);
        break;
      case 'boom':
        this.rings.spawn('fire', ev.x, ev.z, 0.5, ev.r + 0.8, 0.5, 1, 0.1);
        debris.burst(ev.x, 0.4, ev.z, 18, [0xff8a2a, 0xffd04a, 0x3a2a22], 6, 8, 1.2, 0.9);
        this.shake(0.4);
        break;
      case 'dash':
        for (let z = ev.z0; z < ev.z1; z += 1.2) this.rings.spawn('dust', ev.x + (Math.random() - 0.5), z, 0.4, 1.6, 0.7, 0.7);
        this.shake(0.6);
        break;
      case 'frost':
        this.rings.spawn('ice', ev.x, w.cz, 1, 7, 0.6, 1, 0.1);
        this.rings.spawn('glow', ev.x, w.cz - 2, 1, 6, 0.8, 0.8, 0.12);
        this.lastFrostZ = F.front;
        this.shake(0.3);
        break;
      case 'ramHit':
        debris.burst(ev.x, 0.6, ev.z, 30, [0x9aa0a8, 0x6e4a2b, 0x2b7cf2], 7, 7, 1.4, 1.2);
        this.rings.spawn('dust', ev.x, ev.z, 1, 4, 0.8, 0.9);
        this.shake(0.7);
        break;
      case 'bdie':
        this.shake(1.0);
        this.rings.spawn('gold', ev.x, ev.z, 1, 9, 0.9, 1);
        break;
      case 'bfreeze': {
        const b = w.bosses.find((x) => x.id === ev.id);
        if (b) shards.burst(b.x, 2, b.z, 30, [0xffffff, 0xbff4ff], 5, 6, 1.4, 1);
        break;
      }
      default:
        break;
    }
  }

  update(w: World, dt: number) {
    this.time += dt;
    this.syncLanes(w);
    this.syncUnits(w);
    this.syncArrows(w);
    this.syncPanels(w);
    this.syncWalls(w);
    this.syncGates(w);
    this.syncBosses(w, dt);
    this.syncTeles(w);
    this.syncFrost(w);
    this.shards.update(dt);
    this.debris.update(dt);
    this.rings.update(dt);
    this.spikes.update(dt);
    // conveyors scroll
    for (let i = 0; i < 2; i++) {
      const lane = w.lanes[i];
      if (lane.def) this.conveyorTex[i].offset.y += ((lane.def.speed ?? 5) * dt) / 2;
    }
    // snow
    const sp = this.snow.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = sp.array as Float32Array;
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= dt * (1.2 + (i % 7) * 0.12);
      arr[i] += Math.sin(this.time + i) * dt * 0.3;
      if (arr[i + 1] < 0) arr[i + 1] = 22;
    }
    sp.needsUpdate = true;
    // camera
    this.camX += (w.ax * 0.22 - this.camX) * Math.min(1, dt * 3);
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
    const s = this.shakeAmt * this.shakeAmt * 0.9;
    this.camera.position.set(this.camBase.x + this.camX + (Math.random() - 0.5) * s, this.camBase.y + (Math.random() - 0.5) * s, this.camBase.z + (Math.random() - 0.5) * s * 0.5);
    this.camera.lookAt(this.camLook.x + this.camX * 0.6, this.camLook.y, this.camLook.z);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  private syncUnits(w: World) {
    const t = this.time;
    const shadowArr = this.shadows.instanceMatrix.array as Float32Array;
    let sn = 0;
    // soldiers
    {
      const u = this.soldiers;
      const arr = u.mesh.instanceMatrix.array as Float32Array;
      const tint = u.tint.array as Float32Array;
      const moving = Math.min(1, Math.abs(w.armyVX) / 6);
      const lean = Math.max(-0.25, Math.min(0.25, -w.armyVX * 0.025));
      const n = Math.min(w.soldiers.length, u.cap);
      for (let i = 0; i < n; i++) {
        const s = w.soldiers[i];
        const bob = Math.abs(Math.sin(t * (6 + moving * 6) + s.phase)) * (0.04 + moving * 0.06);
        const age = w.t - s.born;
        const pop = age < 0.25 ? 0.6 + (age / 0.25) * 0.4 : 1;
        writeM(arr, i, s.x, bob, s.z, 0, pop, lean + Math.sin(t * 5 + s.phase) * 0.04);
        const fl = age < 0.35 ? 1 - age / 0.35 : 0;
        tint[i * 4] = 0.75;
        tint[i * 4 + 1] = 0.95;
        tint[i * 4 + 2] = 1;
        tint[i * 4 + 3] = fl * 0.9;
        writeM(shadowArr, sn++, s.x, 0.02, s.z, 0, 0.75, 0);
      }
      u.mesh.count = n;
      u.mesh.instanceMatrix.needsUpdate = true;
      u.tint.needsUpdate = true;
    }
    // enemies
    for (const u of Object.values(this.enemies)) u.n = 0;
    const ax = w.ax;
    const cz = w.cz;
    for (const e of w.enemies) {
      if (e.state === ES.Removed) continue;
      const u = this.enemies[e.type];
      if (u.n >= u.cap) continue;
      const i = u.n++;
      const arr = u.mesh.instanceMatrix.array as Float32Array;
      const tint = u.tint.array as Float32Array;
      let yaw = 0;
      let y = 0;
      let roll = 0;
      let s = 1;
      const big = e.type === 'ram';
      if (e.state === ES.Dying) {
        s = 1.06;
        const ice = e.how === 'ice';
        tint[i * 4] = ice ? 0.93 : 0.62;
        tint[i * 4 + 1] = ice ? 0.98 : 0.9;
        tint[i * 4 + 2] = 1;
        tint[i * 4 + 3] = 0.88;
      } else {
        if (e.state === ES.Charge) yaw = Math.atan2(ax - e.x, cz - e.z) * 0.8;
        y = big ? Math.abs(Math.sin(e.phase)) * 0.03 : Math.abs(Math.sin(e.phase)) * 0.08;
        roll = big ? 0 : Math.sin(e.phase) * 0.07;
        const fl = e.flash > 0 ? Math.min(1, e.flash / 0.1) : 0;
        tint[i * 4] = 1;
        tint[i * 4 + 1] = 1;
        tint[i * 4 + 2] = 1;
        tint[i * 4 + 3] = fl * 0.85;
        if (big && e.hp < e.maxHp) {
          // damaged ram gets darker
          tint[i * 4] = 0.25;
          tint[i * 4 + 1] = 0.2;
          tint[i * 4 + 2] = 0.2;
          tint[i * 4 + 3] = Math.max(fl * 0.85, (1 - e.hp / e.maxHp) * 0.4);
        }
      }
      writeM(arr, i, e.x, y, e.z, yaw, s, roll);
      if (sn < 6500) writeM(shadowArr, sn++, e.x, 0.02, e.z, 0, e.r * 2.6, 0);
    }
    for (const u of Object.values(this.enemies)) {
      u.mesh.count = u.n;
      u.mesh.instanceMatrix.needsUpdate = true;
      u.tint.needsUpdate = true;
    }
    this.shadows.count = sn;
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  private syncArrows(w: World) {
    const arr = this.arrows.instanceMatrix.array as Float32Array;
    const n = Math.min(w.arrows.length, 1600);
    for (let i = 0; i < n; i++) {
      const a = w.arrows[i];
      writeM(arr, i, a.x, a.y, a.z, Math.atan2(-a.vx, F.arrowSpeed), 1, 0);
    }
    this.arrows.count = n;
    this.arrows.instanceMatrix.needsUpdate = true;
    // enemy arrows
    const m = new THREE.Matrix4();
    const o = new THREE.Object3D();
    const em = this.eMarks.instanceMatrix.array as Float32Array;
    const ne = Math.min(w.eproj.length, 300);
    for (let i = 0; i < ne; i++) {
      const p = w.eproj[i];
      const k = p.t / p.dur;
      const x = p.x0 + (p.x1 - p.x0) * k;
      const z = p.z0 + (p.z1 - p.z0) * k;
      const y = 0.8 + Math.sin(k * Math.PI) * 5;
      const k2 = Math.min(1, k + 0.02);
      const nx = p.x0 + (p.x1 - p.x0) * k2;
      const nz = p.z0 + (p.z1 - p.z0) * k2;
      const ny = 0.8 + Math.sin(k2 * Math.PI) * 5;
      o.position.set(x, y, z);
      o.lookAt(nx, ny, nz);
      o.updateMatrix();
      m.copy(o.matrix);
      this.eArrows.setMatrixAt(i, m);
      const ms = 0.6 + k * 0.7;
      writeM(em, i, p.x1, 0.05, p.z1, 0, ms * (0.8 + Math.sin(this.time * 20) * 0.08), 0);
    }
    this.eArrows.count = ne;
    this.eArrows.instanceMatrix.needsUpdate = true;
    this.eMarks.count = ne;
    this.eMarks.instanceMatrix.needsUpdate = true;
  }

  private syncPanels(w: World) {
    const seen = new Set<number>();
    const place = (p: { id: number; x: number; z: number; kind: string; n: number; text: string; pop: number }) => {
      seen.add(p.id);
      let v = this.panelViews.get(p.id);
      if (!v) {
        v = this.getPanel();
        const style = panelStyle(p.kind, p.n);
        v.frame.material = this.frameMat(style);
        v.label.material = this.labelMat(panelLabel(p.text, style));
        this.panelViews.set(p.id, v);
      }
      v.group.position.set(p.x, p.pop > 0 ? p.pop * 5 : 0, p.z);
      const sc = p.pop > 0 ? 1 + p.pop * 1.6 : 1;
      v.group.scale.setScalar(p.pop > 0 ? Math.max(0.01, sc * (1 - p.pop * 1.6)) : 1);
    };
    for (const lane of w.lanes) for (const p of lane.panels) if (p.z > -95) place(p);
    for (const p of w.popped) place(p);
    for (const [id, v] of this.panelViews) {
      if (!seen.has(id)) {
        this.releasePanel(v);
        this.panelViews.delete(id);
      }
    }
  }

  private syncWalls(w: World) {
    for (let i = 0; i < 2; i++) {
      const v = this.walls[i];
      const wall = w.lanes[i].wall;
      if (!v || !wall) continue;
      v.group.visible = wall.alive;
      if (!wall.alive) continue;
      v.tex.set(String(Math.ceil(wall.hp)));
      const k = wall.hp / wall.maxHp;
      (v.block.material as THREE.MeshLambertMaterial).color.setRGB(0.85 * (0.6 + 0.4 * k) + (wall.flash > 0 ? 0.3 : 0), 0.82 * (0.6 + 0.4 * k) + (wall.flash > 0 ? 0.3 : 0), 0.75 * (0.6 + 0.4 * k) + (wall.flash > 0 ? 0.3 : 0));
      v.group.position.x = v.baseX + (wall.flash > 0 ? (Math.random() - 0.5) * 0.08 : 0);
    }
  }

  private syncGates(w: World) {
    const seen = new Set<number>();
    for (const g of w.gates) {
      seen.add(g.id);
      let v = this.gates.get(g.id);
      if (!v) {
        v = this.makeGate();
        this.gates.set(g.id, v);
      }
      const rise = Math.min(1, g.age / 0.6);
      v.group.position.set(0, (rise - 1) * 3, g.z);
      for (let h = 0; h < 2; h++) {
        const half = g.halves[h];
        const txt = gateText(half);
        const good = half.op === 'mul' ? half.v >= 1 : half.v >= 0;
        v.halves[h].tex.set(txt, good ? (g.shoot ? 'good|s' : 'good') : 'bad');
        const mesh = v.halves[h].mesh;
        const fl = half.flash > 0 ? 1.08 : 1;
        if (g.passed >= 0) {
          const chosen = g.passed === h;
          const k = Math.min(1, g.fade / 0.8);
          mesh.scale.setScalar(chosen ? 1 + k * 0.6 : Math.max(0.01, 1 - k));
          (mesh.material as THREE.MeshBasicMaterial).opacity = 1 - k;
        } else {
          mesh.scale.setScalar(fl);
          (mesh.material as THREE.MeshBasicMaterial).opacity = 1;
        }
      }
    }
    for (const [id, v] of this.gates) {
      if (!seen.has(id)) {
        this.dyn.remove(v.group);
        this.gates.delete(id);
      }
    }
  }

  private makeGate(): GateView {
    const group = new THREE.Group();
    const postMat = new THREE.MeshLambertMaterial({ color: 0xe8f4ff });
    for (const x of [-F.centerHalf, 0, F.centerHalf]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.8, 0.25), postMat);
      post.position.set(x, 1.4, 0);
      group.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(F.centerHalf * 2 + 0.4, 0.22, 0.3), postMat);
    beam.position.set(0, 2.85, 0);
    group.add(beam);
    const halves: GateView['halves'] = [];
    for (const sx of [-1, 1]) {
      const tex = new TextTex(256, 128, (g, text, w, h, extra) => {
        drawGate(g, text, w, h, extra.split('|')[0]);
        if (extra.includes('|s')) {
          g.strokeStyle = '#ffffff';
          g.lineWidth = 4;
          g.beginPath();
          g.arc(w - 26, 26, 12, 0, Math.PI * 2);
          g.moveTo(w - 42, 26);
          g.lineTo(w - 10, 26);
          g.moveTo(w - 26, 10);
          g.lineTo(w - 26, 42);
          g.stroke();
        }
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(F.centerHalf - 0.3, 2.2), new THREE.MeshBasicMaterial({ map: tex.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      mesh.position.set((sx * F.centerHalf) / 2, 1.45, 0);
      group.add(mesh);
      halves.push({ mesh, tex });
    }
    this.dyn.add(group);
    return { group, halves };
  }

  private syncBosses(w: World, dt: number) {
    const seen = new Set<number>();
    for (const b of w.bosses) {
      seen.add(b.id);
      let v = this.bossViews.get(b.id);
      if (!v) {
        const model = bossModel(b.kind);
        const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false }));
        this.dyn.add(model.group, shadow);
        v = { model, shadow, deadT: 0, crumbled: false, frozenShown: false };
        this.bossViews.set(b.id, v);
      }
      this.animateBoss(v, b, w, dt);
    }
    for (const [id, v] of this.bossViews) {
      if (!seen.has(id)) {
        this.dyn.remove(v.model.group, v.shadow);
        this.bossViews.delete(id);
      }
    }
  }

  private animateBoss(v: BossView, b: Boss, w: World, dt: number) {
    const def = BOSS[b.kind];
    const md = v.model;
    const sc = def.scale;
    md.group.position.set(b.x, 0, b.z);
    md.group.scale.setScalar(sc);
    v.shadow.position.set(b.x, 0.03, b.z);
    v.shadow.scale.setScalar(b.r * 3.2);
    const t = this.time;
    if (b.state === 'dead') {
      v.deadT += dt;
      for (let i = 0; i < md.mats.length; i++) {
        const g = 0.55 + (i % 3) * 0.06;
        md.mats[i].color.setRGB(g, g, g * 1.02);
        md.mats[i].emissive.setRGB(0, 0, 0);
      }
      md.ice.visible = false;
      if (v.deadT > 0.7 && !v.crumbled) {
        v.crumbled = true;
        this.debris.burst(b.x, 2.5, b.z, 70, [0x9a9a9a, 0x7a7a7a, 0xbdbdbd, 0x5a5a5a], 6, 6, 3, 1.6);
        this.rings.spawn('dust', b.x, b.z, 1, 5, 1, 0.9);
        this.shake(0.7);
      }
      md.group.visible = !v.crumbled;
      v.shadow.visible = !v.crumbled;
      return;
    }
    md.group.rotation.y = Math.atan2(w.ax - b.x, w.cz - b.z) * 0.7;
    const walking = b.state === 'walk' || b.state === 'return';
    md.body.position.y = walking ? Math.abs(Math.sin(t * 5)) * 0.08 : 0;
    md.body.rotation.z = walking ? Math.sin(t * 5) * 0.05 : 0;
    let ar = walking ? Math.sin(t * 5) * 0.4 : Math.sin(t * 2) * 0.1;
    let al = walking ? -Math.sin(t * 5) * 0.4 : -Math.sin(t * 2) * 0.1;
    let lean = 0;
    const anim = b.anim;
    if (b.state === 'windup') {
      if (anim === 'slam' || b.kind === 'hammer') {
        const k = Math.min(1, b.animT / 0.9);
        ar = -2.7 * k;
        al = -2.5 * k;
        lean = -0.25 * k;
      } else if (b.kind === 'spear') {
        const k = Math.min(1, b.animT / 0.8);
        ar = 0.9 * k;
        lean = -0.2 * k;
      } else {
        const k = Math.min(1, b.animT / 0.4);
        ar = -2.4 * k;
        al = -2.4 * k;
      }
    } else if (b.state === 'recover') {
      const k = Math.min(1, b.animT / 0.15);
      if (anim === 'slam' || b.kind === 'hammer') {
        ar = -2.7 + 3.4 * k;
        al = -2.5 + 3.0 * k;
        lean = 0.35 * k;
      } else {
        ar = -1.2;
        al = -1.2;
      }
    } else if (b.state === 'dash') {
      ar = -1.5;
      lean = 0.35;
    }
    md.armR.rotation.x += (ar - md.armR.rotation.x) * Math.min(1, dt * 18);
    md.armL.rotation.x += (al - md.armL.rotation.x) * Math.min(1, dt * 18);
    md.body.rotation.x += (lean - md.body.rotation.x) * Math.min(1, dt * 12);
    // tints
    const frozen = b.frozen > 0;
    md.ice.visible = frozen;
    for (let i = 0; i < md.mats.length; i++) {
      const mat = md.mats[i];
      mat.color.copy(md.baseColors[i]);
      if (frozen) {
        mat.color.lerp(new THREE.Color(0xbfefff), 0.55);
        mat.emissive.setRGB(0.05, 0.18, 0.28);
      } else if (b.flash > 0) mat.emissive.setRGB(0.55, 0.45, 0.45);
      else mat.emissive.setRGB(0, 0, 0);
    }
    if (b.kind === 'fire' && !frozen && Math.random() < dt * 20) {
      this.shards.emit(b.x + (Math.random() - 0.5) * 1.5, 2 + Math.random(), b.z, 0, 3, 0, 0xff9a3a, 0.8, 0.4);
    }
  }

  private syncTeles(w: World) {
    const seen = new Set<number>();
    for (const tl of w.teles) {
      seen.add(tl.id);
      let v = this.teleViews.get(tl.id);
      if (!v) {
        v = this.getTele();
        this.teleViews.set(tl.id, v);
      }
      this.placeTele(v, tl, w);
    }
    for (const [id, v] of this.teleViews) {
      if (!seen.has(id)) {
        this.releaseTele(v);
        this.teleViews.delete(id);
      }
    }
  }

  private placeTele(v: TeleView, tl: Tele, w: World) {
    const k = Math.max(0, Math.min(1, tl.t / tl.dur));
    const pulse = 0.85 + Math.sin(this.time * 18) * 0.15;
    const vis = tl.t >= 0;
    v.ring.visible = vis;
    v.fill.visible = vis;
    if (tl.kind === 'circle') {
      v.ring.position.set(tl.x, 0.07, tl.z);
      v.ring.scale.set(tl.r * 2, 1, tl.r * 2);
      v.fill.position.set(tl.x, 0.08, tl.z);
      v.fill.scale.set(tl.r * 2 * k, 1, tl.r * 2 * k);
      (v.ring.material as THREE.MeshBasicMaterial).opacity = pulse;
      (v.fill.material as THREE.MeshBasicMaterial).opacity = 0.9;
      if (tl.dmg === 'fire') {
        if (!v.ball) {
          v.ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
          const glow = new THREE.Mesh(
            new THREE.PlaneGeometry(2.4, 2.4),
            new THREE.MeshBasicMaterial({ map: radialTexture('rgba(255,180,60,0.9)', 'rgba(255,80,20,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          v.ball.add(glow);
          this.dyn.add(v.ball);
        }
        v.ball.visible = vis;
        const sx = tl.z0;
        const sz = tl.z1;
        v.ball.position.set(sx + (tl.x - sx) * k, 3 + Math.sin(k * Math.PI) * 8 * (1 - k * 0.3) - k * 3 + 0.3, sz + (tl.z - sz) * k);
        (v.ball.children[0] as THREE.Mesh).lookAt(this.camera.position);
        if (Math.random() < 0.5) this.shards.emit(v.ball.position.x, v.ball.position.y, v.ball.position.z, 0, 1, 0, 0xff7a20, 0.9, 0.35);
      }
    } else {
      const len = tl.z1 - tl.z0;
      v.ring.position.set(tl.x, 0.07, tl.z0 + len / 2);
      v.ring.scale.set(tl.r * 2, 1, len);
      (v.ring.material as THREE.MeshBasicMaterial).opacity = pulse * 0.6;
      v.fill.position.set(tl.x, 0.08, tl.z0 + (len * k) / 2);
      v.fill.scale.set(tl.r * 2, 1, len * k);
    }
    void w;
  }

  private syncFrost(w: World) {
    const fw = w.frostWave;
    if (!fw) {
      this.frostFront.visible = false;
      return;
    }
    this.frostFront.visible = true;
    this.frostFront.position.set(fw.x, 1.1, fw.z);
    this.frostFront.scale.set(fw.w + 1, 1, 1);
    while (this.lastFrostZ > fw.z) {
      this.lastFrostZ -= 0.8;
      for (let x = -fw.w / 2; x <= fw.w / 2; x += 0.75) {
        if (Math.random() < 0.75) this.spikes.spawn(fw.x + x + (Math.random() - 0.5) * 0.5, this.lastFrostZ + (Math.random() - 0.5) * 0.5, 0.7 + Math.random() * 0.9, 0.9 + Math.random() * 0.4);
      }
      this.shards.burst(fw.x + (Math.random() - 0.5) * fw.w, 0.3, this.lastFrostZ, 3, [0xffffff, 0xbff4ff], 2, 5, 0.9, 0.6);
    }
  }

  /** boss world positions for UI bars */
  bossAnchor(b: Boss): { x: number; y: number; ok: boolean } {
    return this.project(b.x, BOSS[b.kind].scale * 2.35 + 0.4, b.z);
  }

  enemyHeight(type: EType) {
    return ENEMY[type].r;
  }
}

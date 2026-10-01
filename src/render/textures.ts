import * as THREE from 'three';

export const FONT = '"GameFont", "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function sandTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  const r = rand(7);
  g.fillStyle = '#d8b47a';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const x = r() * 256;
    const y = r() * 256;
    const s = 2 + r() * 10;
    g.fillStyle = r() < 0.5 ? `rgba(160,120,70,${0.05 + r() * 0.08})` : `rgba(250,225,180,${0.05 + r() * 0.1})`;
    g.beginPath();
    g.ellipse(x, y, s, s * (0.4 + r() * 0.6), r() * 3, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(110,85,55,${0.2 + r() * 0.3})`;
    g.fillRect(r() * 256, r() * 256, 1.5 + r() * 2, 1.5 + r() * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function snowTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const r = rand(3);
  g.fillStyle = '#eef8ff';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 300; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(170,205,235,0.25)' : 'rgba(255,255,255,0.6)';
    g.beginPath();
    g.arc(r() * 128, r() * 128, 1 + r() * 5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function conveyorTexture(base: string, stripe: string): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = stripe;
  g.fillRect(0, 0, 64, 10);
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(0, 10, 64, 3);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.fillRect(4, 20, 56, 30);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(0, 0, 4, 64);
  g.fillRect(60, 0, 4, 64);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function stoneTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const r = rand(11);
  g.fillStyle = '#d9d2c3';
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 200; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(120,110,95,0.12)' : 'rgba(255,255,255,0.15)';
    g.fillRect(r() * 128, r() * 128, 2 + r() * 8, 2 + r() * 6);
  }
  g.strokeStyle = 'rgba(90,80,70,0.35)';
  g.lineWidth = 2;
  for (let y = 0; y < 128; y += 32) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(128, y);
    g.stroke();
    for (let x = (y / 32) % 2 ? 0 : 32; x < 128; x += 64) {
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x, y + 32);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function radialTexture(inner: string, outer: string, size = 64): THREE.CanvasTexture {
  const [c, g] = canvas(size, size);
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function ringTexture(color: string): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grd = g.createRadialGradient(64, 64, 30, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.6, color);
  grd.addColorStop(0.8, 'rgba(255,255,255,0.95)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export type PanelStyle = 'blue' | 'gold' | 'red' | 'frost' | 'purple';

export function panelStyle(kind: string, n: number): PanelStyle {
  if (kind === 'frost') return 'frost';
  if (kind === 'mul') return 'purple';
  if (n < 0) return 'red';
  if (n >= 30) return 'gold';
  return 'blue';
}

const STYLE: Record<PanelStyle, { top: string; bot: string; edge: string; text: string; stroke: string }> = {
  blue: { top: '#5fb2ff', bot: '#1f62e0', edge: '#0d3a9a', text: '#ffffff', stroke: '#0b2a70' },
  gold: { top: '#fff07a', bot: '#f2b400', edge: '#a36b00', text: '#ffffff', stroke: '#7a4a00' },
  red: { top: '#ff7a7a', bot: '#d41e2a', edge: '#7a0d14', text: '#ffffff', stroke: '#5a0a10' },
  frost: { top: '#d8f8ff', bot: '#38b4f0', edge: '#0b5a9a', text: '#ffffff', stroke: '#0b4a8a' },
  purple: { top: '#d79bff', bot: '#8a3ae0', edge: '#4a1590', text: '#ffffff', stroke: '#3a0a70' },
};

export function panelStyleColor(s: PanelStyle): number {
  return new THREE.Color(STYLE[s].bot).getHex();
}

const labelCache = new Map<string, THREE.CanvasTexture>();

export function panelLabel(text: string, style: PanelStyle): THREE.CanvasTexture {
  const key = text + '|' + style;
  const hit = labelCache.get(key);
  if (hit) return hit;
  const [c, g] = canvas(256, 128);
  const st = STYLE[style];
  roundRect(g, 4, 4, 248, 120, 18);
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, st.top);
  grd.addColorStop(1, st.bot);
  g.fillStyle = grd;
  g.fill();
  g.lineWidth = 8;
  g.strokeStyle = st.edge;
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.25)';
  roundRect(g, 14, 12, 228, 30, 12);
  g.fill();
  const size = text.length > 4 ? 64 : 84;
  g.font = `${size}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 12;
  g.strokeStyle = st.stroke;
  g.lineJoin = 'round';
  g.strokeText(text, 128, 70);
  g.fillStyle = st.text;
  g.fillText(text, 128, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  labelCache.set(key, t);
  return t;
}

/** Dynamic text texture (wall HP, gate values). */
export class TextTex {
  readonly canvas: HTMLCanvasElement;
  readonly tex: THREE.CanvasTexture;
  private g: CanvasRenderingContext2D;
  private last = '';
  constructor(
    w: number,
    h: number,
    private draw: (g: CanvasRenderingContext2D, text: string, w: number, h: number, extra: string) => void,
  ) {
    [this.canvas, this.g] = canvas(w, h);
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
  }
  set(text: string, extra = '') {
    const key = text + '|' + extra;
    if (key === this.last) return;
    this.last = key;
    this.g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.draw(this.g, text, this.canvas.width, this.canvas.height, extra);
    this.tex.needsUpdate = true;
  }
}

export function drawBigNumber(g: CanvasRenderingContext2D, text: string, w: number, h: number) {
  g.font = `${Math.floor(h * 0.78)}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = h * 0.13;
  g.strokeStyle = '#1b1b22';
  g.strokeText(text, w / 2, h * 0.55);
  g.fillStyle = '#ffffff';
  g.fillText(text, w / 2, h * 0.55);
}

export function drawGate(g: CanvasRenderingContext2D, text: string, w: number, h: number, extra: string) {
  const good = !extra.startsWith('bad');
  const shootable = extra.endsWith('|s');
  const grd = g.createLinearGradient(0, 0, 0, h);
  if (good) {
    grd.addColorStop(0, 'rgba(120,200,255,0.85)');
    grd.addColorStop(1, 'rgba(30,110,240,0.65)');
  } else {
    grd.addColorStop(0, 'rgba(255,130,130,0.85)');
    grd.addColorStop(1, 'rgba(210,30,40,0.65)');
  }
  g.fillStyle = grd;
  roundRect(g, 4, 4, w - 8, h - 8, 16);
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = good ? 'rgba(220,245,255,0.95)' : 'rgba(255,220,220,0.95)';
  g.stroke();
  g.font = `${Math.floor(h * 0.55)}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = 12;
  g.strokeStyle = good ? '#0b2a70' : '#5a0a10';
  g.strokeText(text, w / 2, h * 0.55);
  g.fillStyle = '#fff';
  g.fillText(text, w / 2, h * 0.55);
  if (shootable) {
    // crosshair badge: this value can be raised by shooting it
    const r = h * 0.16;
    const cx = w - r - 14;
    const cy = r + 12;
    g.fillStyle = 'rgba(255,214,90,0.95)';
    g.beginPath();
    g.arc(cx, cy, r + 5, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#6a3d00';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(cx, cy, r * 0.62, 0, Math.PI * 2);
    g.moveTo(cx - r, cy);
    g.lineTo(cx + r, cy);
    g.moveTo(cx, cy - r);
    g.lineTo(cx, cy + r);
    g.stroke();
  }
}

export function bannerTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 128);
  g.fillStyle = '#c4202c';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(64, 0);
  g.lineTo(64, 110);
  g.lineTo(32, 92);
  g.lineTo(0, 110);
  g.closePath();
  g.fill();
  g.strokeStyle = '#f2c14a';
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = '#f2c14a';
  g.font = `40px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('敌', 32, 46);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function blueBannerTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 128);
  g.fillStyle = '#1f62e0';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(64, 0);
  g.lineTo(64, 110);
  g.lineTo(32, 92);
  g.lineTo(0, 110);
  g.closePath();
  g.fill();
  g.strokeStyle = '#d8f4ff';
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = `40px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('冰', 32, 46);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

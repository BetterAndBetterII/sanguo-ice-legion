// Fully synthesized WebAudio SFX + music (no audio files).

type Wave = OscillatorType;

const PENTA = [0, 2, 4, 7, 9]; // C D E G A
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private musicBus!: GainNode;
  private comp!: DynamicsCompressorNode;
  private noiseBuf!: AudioBuffer;
  private last = new Map<string, number>();
  muted = false;
  private musicMode: 'off' | 'menu' | 'battle' | 'boss' = 'off';
  private nextNote = 0;
  private step = 0;
  private timer: number | null = null;
  private melody: number[] = [];
  private bar = 0;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 6;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.22;
    this.sfx.connect(this.comp);
    this.musicBus.connect(this.comp);
    this.comp.connect(this.master);
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.genMelody();
    if (this.musicMode !== 'off') this.startScheduler();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  private ok(name: string, gap: number): boolean {
    if (!this.ctx || this.muted) return false;
    const now = this.ctx.currentTime;
    const l = this.last.get(name) ?? -1;
    if (now - l < gap) return false;
    this.last.set(name, now);
    return true;
  }

  private tone(freq: number, dur: number, type: Wave, vol: number, opts: { end?: number; attack?: number; at?: number; bus?: AudioNode; filter?: number; detune?: number } = {}) {
    const c = this.ctx!;
    const t = opts.at ?? c.currentTime;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (opts.end) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.end), t + dur);
    if (opts.detune) o.detune.value = opts.detune;
    const g = c.createGain();
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = o;
    if (opts.filter) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      o.connect(f);
      node = f;
    }
    node.connect(g);
    g.connect(opts.bus ?? this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, type: BiquadFilterType, freq: number, opts: { end?: number; q?: number; at?: number; bus?: AudioNode } = {}) {
    const c = this.ctx!;
    const t = opts.at ?? c.currentTime;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (opts.end) f.frequency.exponentialRampToValueAtTime(opts.end, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(opts.bus ?? this.sfx);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------------ sfx
  shoot() {
    if (!this.ok('shoot', 0.045)) return;
    this.noise(0.04, 0.05, 'highpass', 2500);
    this.tone(900 + Math.random() * 200, 0.05, 'triangle', 0.025, { end: 500 });
  }
  shatter(big = false) {
    if (!this.ok('shatter', big ? 0.03 : 0.04)) return;
    const f = 2200 + Math.random() * 2400;
    this.tone(f, 0.12, 'sine', 0.06);
    this.tone(f * 1.5, 0.08, 'sine', 0.035);
    this.noise(0.07, 0.07, 'highpass', 5000);
  }
  puff() {
    if (!this.ok('puff', 0.06)) return;
    this.noise(0.08, 0.1, 'bandpass', 700, { q: 2 });
  }
  soldierDie() {
    if (!this.ok('sdie', 0.07)) return;
    this.noise(0.06, 0.09, 'bandpass', 1300, { q: 3 });
    this.tone(220, 0.06, 'square', 0.02, { end: 120, filter: 900 });
  }
  collect(step: number) {
    if (!this.ok('collect', 0.05)) return;
    const n = 72 + PENTA[step % 5] + 12 * Math.floor((step % 15) / 5);
    this.tone(midi(n), 0.12, 'triangle', 0.12);
    this.tone(midi(n + 12), 0.08, 'sine', 0.05);
  }
  big() {
    if (!this.ok('big', 0.1)) return;
    const c = this.ctx!;
    [0, 4, 7, 12].forEach((s, i) => this.tone(midi(72 + s), 0.25, 'triangle', 0.12, { at: c.currentTime + i * 0.05 }));
    this.noise(0.4, 0.05, 'highpass', 6000);
  }
  trap() {
    if (!this.ok('trap', 0.1)) return;
    this.tone(330, 0.3, 'sawtooth', 0.09, { end: 110, filter: 1500 });
  }
  wallHit() {
    if (!this.ok('whit', 0.08)) return;
    this.tone(150, 0.08, 'sine', 0.12, { end: 70 });
    this.noise(0.05, 0.05, 'lowpass', 1200);
  }
  wallBreak() {
    if (!this.ok('wbreak', 0.2)) return;
    this.noise(0.7, 0.35, 'lowpass', 900, { end: 200 });
    this.tone(90, 0.6, 'sine', 0.35, { end: 35 });
  }
  slam() {
    if (!this.ok('slam', 0.15)) return;
    this.noise(0.6, 0.45, 'lowpass', 500, { end: 120 });
    this.tone(95, 0.55, 'sine', 0.5, { end: 30 });
    this.tone(60, 0.4, 'square', 0.08, { end: 30, filter: 300 });
  }
  boom() {
    if (!this.ok('boom', 0.08)) return;
    this.noise(0.45, 0.3, 'bandpass', 700, { end: 200, q: 0.8 });
    this.tone(130, 0.35, 'sine', 0.3, { end: 45 });
  }
  dash() {
    if (!this.ok('dash', 0.2)) return;
    this.noise(0.45, 0.25, 'bandpass', 300, { end: 2500, q: 1.5 });
  }
  windup() {
    if (!this.ok('windup', 0.25)) return;
    this.tone(160, 0.5, 'sawtooth', 0.06, { end: 420, filter: 1200, attack: 0.1 });
  }
  roar() {
    if (!this.ok('roar', 1)) return;
    const c = this.ctx!;
    this.tone(110, 1.1, 'sawtooth', 0.14, { filter: 700, attack: 0.08, end: 90 });
    this.tone(165, 1.1, 'sawtooth', 0.1, { filter: 700, attack: 0.08, end: 130 });
    for (let i = 0; i < 3; i++) this.drum(c.currentTime + i * 0.18, 0.5, this.sfx);
  }
  frost() {
    if (!this.ok('frost', 0.3)) return;
    const c = this.ctx!;
    this.noise(0.9, 0.3, 'highpass', 7000, { end: 1200 });
    this.tone(90, 0.5, 'sine', 0.3, { end: 40 });
    [0, 3, 7, 12, 15, 19].forEach((s, i) => this.tone(midi(81 + s), 0.5, 'sine', 0.05, { at: c.currentTime + i * 0.04 }));
  }
  frostReady() {
    if (!this.ok('fready', 0.5)) return;
    const c = this.ctx!;
    [0, 7, 12].forEach((s, i) => this.tone(midi(88 + s), 0.3, 'sine', 0.06, { at: c.currentTime + i * 0.06 }));
  }
  gate(good: boolean) {
    if (!this.ok('gate', 0.2)) return;
    const c = this.ctx!;
    const seq = good ? [0, 4, 7, 12, 16] : [12, 8, 5, 0];
    seq.forEach((s, i) => this.tone(midi(67 + s), 0.18, good ? 'triangle' : 'sawtooth', good ? 0.12 : 0.07, { at: c.currentTime + i * 0.06, filter: good ? undefined : 1400 }));
  }
  ramHit() {
    if (!this.ok('ram', 0.2)) return;
    this.noise(0.5, 0.4, 'lowpass', 700, { end: 150 });
    this.tone(70, 0.4, 'sine', 0.4, { end: 30 });
  }
  bossDie() {
    if (!this.ok('bdie', 0.5)) return;
    const c = this.ctx!;
    this.noise(1.2, 0.4, 'lowpass', 1200, { end: 100 });
    this.tone(70, 1.0, 'sine', 0.5, { end: 25 });
    [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(midi(64 + s), 0.3, 'triangle', 0.1, { at: c.currentTime + 0.3 + i * 0.07 }));
  }
  click() {
    if (!this.ok('click', 0.04)) return;
    this.tone(1200, 0.05, 'triangle', 0.08, { end: 800 });
  }
  star(i: number) {
    if (!this.ctx || this.muted) return;
    this.tone(midi(76 + ([0, 4, 7][i] ?? 0)), 0.35, 'triangle', 0.15);
    this.tone(midi(88 + ([0, 4, 7][i] ?? 0)), 0.25, 'sine', 0.05);
  }
  coin() {
    if (!this.ok('coin', 0.04)) return;
    this.tone(1900, 0.06, 'square', 0.03, { filter: 4000 });
    this.tone(2500, 0.08, 'sine', 0.04, { at: this.ctx!.currentTime + 0.04 });
  }
  win() {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    const seq = [0, 4, 7, 12, 7, 12, 16, 19, 24];
    seq.forEach((s, i) => this.tone(midi(60 + s), i === seq.length - 1 ? 0.8 : 0.16, 'triangle', 0.14, { at: c.currentTime + i * 0.09 }));
    for (let i = 0; i < 4; i++) this.drum(c.currentTime + i * 0.18, 0.5, this.sfx);
  }
  lose() {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    [12, 8, 5, 0, -5].forEach((s, i) => this.tone(midi(57 + s), 0.5, 'sawtooth', 0.08, { at: c.currentTime + i * 0.22, filter: 900 }));
    this.drum(c.currentTime, 0.6, this.sfx);
  }
  upgrade() {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    [0, 7, 12, 19].forEach((s, i) => this.tone(midi(72 + s), 0.2, 'triangle', 0.1, { at: c.currentTime + i * 0.05 }));
  }

  // ------------------------------------------------------------------ music
  private drum(t: number, vol: number, bus: AudioNode) {
    const c = this.ctx!;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + 0.4);
    this.noise(0.08, vol * 0.25, 'lowpass', 600, { at: t, bus });
  }

  private pluck(n: number, t: number, vol: number) {
    const f = midi(n);
    this.tone(f * 1.01, 0.5, 'triangle', vol, { at: t, end: f, attack: 0.003, bus: this.musicBus });
    this.tone(f * 2, 0.25, 'sine', vol * 0.3, { at: t, attack: 0.003, bus: this.musicBus });
  }

  private genMelody() {
    // 4 bars x 8 eighth-notes, pentatonic random walk (-1 = rest)
    let idx = 7;
    const m: number[] = [];
    for (let i = 0; i < 32; i++) {
      if (i % 8 === 7 || Math.random() < 0.18) {
        m.push(-1);
        continue;
      }
      idx += Math.round((Math.random() - 0.5) * 3);
      idx = Math.max(3, Math.min(12, idx));
      m.push(idx);
    }
    this.melody = m;
  }

  setMusic(mode: 'off' | 'menu' | 'battle' | 'boss') {
    if (mode === this.musicMode) return;
    const was = this.musicMode;
    this.musicMode = mode;
    if (mode === 'off') {
      if (this.timer !== null) clearInterval(this.timer);
      this.timer = null;
      return;
    }
    if (was === 'off' || this.timer === null) this.startScheduler();
  }

  private startScheduler() {
    if (!this.ctx || this.timer !== null) return;
    this.nextNote = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.timer = window.setInterval(() => this.schedule(), 50);
  }

  private schedule() {
    if (!this.ctx || this.musicMode === 'off') return;
    const bpm = this.musicMode === 'menu' ? 92 : this.musicMode === 'boss' ? 138 : 124;
    const stepDur = 60 / bpm / 2; // eighth notes
    while (this.nextNote < this.ctx.currentTime + 0.25) {
      const t = this.nextNote;
      const s = this.step % 8;
      const bar = Math.floor(this.step / 8) % 4;
      if (s === 0) this.bar = bar;
      const roots = [57, 53, 55, 52]; // A F G E
      const root = roots[this.bar];
      const battle = this.musicMode !== 'menu';
      // drums
      if (battle) {
        if (s === 0 || s === 3 || s === 4 || (this.musicMode === 'boss' && s === 6)) this.drum(t, s === 0 ? 0.55 : 0.32, this.musicBus);
        if (s % 2 === 1) this.noise(0.03, 0.05, 'highpass', 7000, { at: t, bus: this.musicBus });
      } else if (s === 0 || s === 4) this.drum(t, 0.25, this.musicBus);
      // bass
      if (s === 0 || (battle && s === 4) || (battle && s === 6)) this.tone(midi(root - 12), stepDur * 1.8, 'triangle', 0.22, { at: t, bus: this.musicBus });
      // melody
      const mi = this.melody[(this.step % 32 + 32) % 32];
      if (mi >= 0 && (battle || s % 2 === 0)) {
        const oct = Math.floor(mi / 5);
        const n = 57 + 12 * (oct - 1) + PENTA[mi % 5];
        this.pluck(n + 12, t, battle ? 0.09 : 0.07);
      }
      this.nextNote += stepDur;
      this.step++;
      if (this.step % 128 === 0) this.genMelody();
    }
  }
}

export const sound = new Sound();

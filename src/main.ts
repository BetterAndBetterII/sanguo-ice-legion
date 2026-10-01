import './ui/style.css';
import { World } from './game/world';
import type { GEvent } from './game/world';
import { Bot } from './game/bot';
import { LEVELS, ENDLESS } from './game/levels';
import type { LevelDef } from './game/levels';
import { F, UPGRADE_MAX, upgradeCost } from './game/config';
import type { Upgrades } from './game/config';
import { loadSave, writeSave, resetSave } from './game/save';
import type { SaveData } from './game/save';
import { Renderer } from './render/renderer';
import { UI, REPO, ICON } from './ui/ui';
import type { EndResult } from './ui/ui';
import { sound } from './audio/audio';

type Mode = 'menu' | 'brief' | 'play' | 'pause' | 'end';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');

async function loadFonts() {
  try {
    const ui = new FontFace('GameFont', 'url(/fonts/ui.woff2) format("woff2")');
    const title = new FontFace('TitleFont', 'url(/fonts/title.woff2) format("woff2")');
    const timeout = new Promise((r) => setTimeout(r, 2500));
    const loaded = Promise.all([ui.load(), title.load()]).then(([a, b]) => {
      document.fonts.add(a);
      document.fonts.add(b);
    });
    await Promise.race([loaded, timeout]);
  } catch {
    /* fall back to system fonts */
  }
}

class Game {
  save: SaveData = loadSave();
  renderer: Renderer;
  ui: UI;
  mode: Mode = 'menu';
  world: World;
  level: LevelDef = LEVELS[0];
  demo = true;
  bot = new Bot(0.8);
  autoplay = DEBUG && params.has('auto');
  speed = 1;
  private acc = 0;
  private last = performance.now();
  private slowmo = 0;
  private keys = new Set<string>();
  private dragging = false;
  private dragStartX = 0;
  private dragStartTarget = 0;
  private collectStep = 0;
  private collectT = 0;
  private endTimer = -1;
  private stage: HTMLElement;
  private movedOnce = false;
  private fpsAcc = 0;
  private fpsFrames = 0;
  fps = 60;

  constructor() {
    this.stage = document.getElementById('stage')!;
    this.renderer = new Renderer(document.getElementById('gl')!);
    this.ui = new UI(
      this.stage,
      {
        play: (l) => this.startLevel(l),
        openBrief: (l) => this.openBrief(l),
        resume: () => this.resume(),
        restart: () => this.startLevel(this.level),
        toMenu: () => this.toMenu(),
        toLevels: () => this.toLevels(),
        toUpgrades: () => this.toUpgrades(),
        buyUpgrade: (k) => this.buy(k),
        toggleMute: () => this.toggleMute(),
        pause: () => this.pause(),
        frost: () => this.castFrost(),
        next: () => this.next(),
        resetProgress: () => {
          this.save = resetSave();
          this.toUpgrades();
        },
      },
      () => this.save,
    );
    sound.setMuted(this.save.muted);
    this.world = this.makeDemo();
    this.renderer.setWorld(this.world);
    this.bindInput();
    window.addEventListener('resize', () => this.renderer.resize());
    new ResizeObserver(() => this.renderer.resize()).observe(this.stage);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.pause();
    });
    this.ui.showMenu();
    sound.setMusic('menu');
    requestAnimationFrame((t) => this.frame(t));
  }

  private makeDemo(): World {
    const lvl = LEVELS[6];
    this.demo = true;
    this.bot = new Bot(0.8);
    return new World({ level: lvl, upg: { troops: 3, damage: 3, rate: 3, frostCd: 3, frostRange: 3 } });
  }

  // ------------------------------------------------------------------ flow
  private openBrief(l: LevelDef) {
    sound.click();
    this.ensureDemo();
    this.mode = 'menu';
    this.ui.setGray(false);
    this.ui.showBrief(l);
    sound.setMusic('menu');
  }

  private ensureDemo() {
    if (!this.demo || this.world.state !== 'play') {
      this.world = this.makeDemo();
      this.renderer.setWorld(this.world);
      this.ui.setGray(false);
    }
  }

  private toMenu() {
    sound.click();
    this.mode = 'menu';
    this.ensureDemo();
    this.ui.setGray(false);
    this.ui.showMenu();
    sound.setMusic('menu');
  }

  private toLevels() {
    sound.click();
    this.mode = 'menu';
    this.ensureDemo();
    this.ui.setGray(false);
    this.ui.showLevels();
    sound.setMusic('menu');
  }

  private toUpgrades() {
    sound.click();
    this.mode = 'menu';
    this.ensureDemo();
    this.ui.setGray(false);
    this.ui.showUpgrades();
    sound.setMusic('menu');
  }

  private buy(k: keyof Upgrades) {
    const lv = this.save.upg[k];
    const cost = upgradeCost(lv);
    if (lv >= UPGRADE_MAX || this.save.coins < cost) return;
    this.save.coins -= cost;
    this.save.upg[k] = lv + 1;
    writeSave(this.save);
    sound.upgrade();
    this.ui.showUpgrades();
  }

  private toggleMute() {
    this.save.muted = !this.save.muted;
    writeSave(this.save);
    sound.setMuted(this.save.muted);
    this.ui.refreshMute();
    if (this.mode === 'pause') this.ui.showPause();
  }

  startLevel(l: LevelDef) {
    sound.init();
    sound.click();
    this.level = l;
    this.demo = false;
    this.world = new World({ level: l, upg: this.save.upg });
    this.renderer.setWorld(this.world);
    this.mode = 'play';
    this.endTimer = -1;
    this.slowmo = 0;
    this.collectStep = 0;
    this.movedOnce = false;
    this.ui.setGray(false);
    this.ui.clearScreen();
    this.ui.showHud(l, this.world.frostEnabled);
    if (l.id === 1 || !this.save.tutorialDone) this.ui.showHint();
    this.ui.toast(l.endless ? '无尽冰河 · 开战！' : `第 ${l.id} 关 · ${l.name}`, 'big');
    sound.setMusic('battle');
    this.bot = new Bot(1);
  }

  private next() {
    const id = this.level.id + 1;
    if (id <= LEVELS.length) this.openBrief(LEVELS[id - 1]);
    else this.toMenu();
  }

  private pause() {
    if (this.mode !== 'play') return;
    this.mode = 'pause';
    this.ui.showPause();
  }

  private resume() {
    if (this.mode !== 'pause') return;
    sound.click();
    this.mode = 'play';
    this.ui.clearScreen();
    this.last = performance.now();
  }

  private castFrost() {
    if (this.mode !== 'play') return;
    if (this.world.castFrost()) sound.frost();
  }

  private finish() {
    const w = this.world;
    const l = this.level;
    const win = w.state === 'win';
    const s = this.save;
    let coins = 0;
    let firstClear = false;
    let newBest = false;
    const stars = w.stars();
    if (l.endless) {
      coins = Math.floor(w.kills / 5) + w.bossKills * 40;
      if (w.kills > s.endlessBest) {
        s.endlessBest = w.kills;
        newBest = true;
      }
    } else if (win) {
      firstClear = !(s.stars[l.id] > 0);
      coins = Math.round((firstClear ? l.reward : l.reward * 0.4) + w.coinsEarned() + stars * 15);
      s.stars[l.id] = Math.max(s.stars[l.id] ?? 0, stars);
      if ((s.best[l.id] ?? 0) < w.N) {
        newBest = (s.best[l.id] ?? 0) > 0;
        s.best[l.id] = w.N;
      }
      s.unlocked = Math.max(s.unlocked, Math.min(LEVELS.length, l.id + 1) + (l.id === LEVELS.length ? 1 : 0));
    } else {
      coins = Math.floor(w.coinsEarned() * 0.5) + 10;
    }
    s.coins += coins;
    s.tutorialDone = s.tutorialDone || win || l.id > 1;
    writeSave(s);
    const r: EndResult = { win, level: l, stars, army: w.N, kills: w.kills, coins, time: w.t, bossKills: w.bossKills, firstClear, newBest };
    this.mode = 'end';
    if (win) {
      this.ui.showWin(r);
      sound.win();
      for (let i = 0; i < stars; i++) setTimeout(() => sound.star(i), 350 + i * 350);
      setTimeout(() => sound.coin(), 1000);
    } else this.ui.showLose(r);
    sound.setMusic('menu');
    this.lastResult = r;
  }
  lastResult: EndResult | null = null;

  // ------------------------------------------------------------------ input
  private bindInput() {
    const st = this.stage;
    st.addEventListener('pointerdown', (e) => {
      sound.init();
      if (this.mode !== 'play') return;
      if ((e.target as HTMLElement).closest('button, a')) return;
      this.dragging = true;
      this.dragStartX = e.clientX;
      this.dragStartTarget = this.world.targetX;
      st.setPointerCapture?.(e.pointerId);
    });
    st.addEventListener('pointermove', (e) => {
      if (!this.dragging || this.mode !== 'play') return;
      const wpx = this.renderer.w;
      const dx = ((e.clientX - this.dragStartX) / wpx) * 17 * 1.25;
      this.world.setTarget(Math.max(F.minX, Math.min(F.maxX, this.dragStartTarget + dx)));
      if (Math.abs(e.clientX - this.dragStartX) > 8) this.markMoved();
    });
    const end = () => {
      this.dragging = false;
    };
    st.addEventListener('pointerup', end);
    st.addEventListener('pointercancel', end);
    window.addEventListener('keydown', (e) => {
      sound.init();
      this.keys.add(e.key.toLowerCase());
      if (e.key === ' ' || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        this.castFrost();
      }
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (this.mode === 'play') this.pause();
        else if (this.mode === 'pause') this.resume();
      }
      if (e.key === 'Enter') {
        if (this.mode === 'end' && this.lastResult) {
          if (this.lastResult.win) this.next();
          else this.startLevel(this.level);
        }
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  private markMoved() {
    if (!this.movedOnce) {
      this.movedOnce = true;
      setTimeout(() => this.ui.hideHint(), 1500);
    }
  }

  // ------------------------------------------------------------------ loop
  private frame(now: number) {
    requestAnimationFrame((t) => this.frame(t));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc > 1) {
      this.fps = this.fpsFrames / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
    const w = this.world;
    const running = this.mode === 'play' || this.mode === 'end' || this.demo;
    if (running) {
      // keyboard steering
      if (this.mode === 'play') {
        let dir = 0;
        if (this.keys.has('a') || this.keys.has('arrowleft')) dir -= 1;
        if (this.keys.has('d') || this.keys.has('arrowright')) dir += 1;
        if (dir) {
          w.setTarget(Math.max(F.minX, Math.min(F.maxX, (Math.abs(w.targetX - w.ax) > 2 ? w.ax : w.targetX) + dir * 13 * dt)));
          this.markMoved();
        }
      }
      let scale = this.speed;
      if (this.slowmo > 0) {
        this.slowmo -= dt;
        scale *= 0.3;
      }
      this.acc += dt * scale;
      const step = 1 / 60;
      let n = 0;
      while (this.acc >= step && n < 8) {
        if ((this.demo || this.autoplay) && w.state === 'play') {
          const d = this.bot.update(w, step);
          w.setTarget(d.x);
          if (d.frost && w.castFrost() && !this.demo) sound.frost();
        }
        w.update(step);
        this.acc -= step;
        n++;
        if (w.shotsThisStep > 0 && !this.demo) sound.shoot();
        this.processEvents(w.events);
        w.events.length = 0;
      }
      if (this.acc > step * 8) this.acc = 0;
      if (this.demo && w.state !== 'play') {
        this.world = this.makeDemo();
        this.renderer.setWorld(this.world);
      }
    }
    if (!this.demo && this.mode === 'play' && w.state !== 'play' && this.endTimer < 0) {
      this.endTimer = w.state === 'win' ? 1.6 : 1.4;
      if (w.state === 'lose') {
        this.ui.setGray(true);
        sound.lose();
      } else {
        this.ui.toast('大捷！', 'big win');
      }
      this.ui.hideHud();
      this.mode = 'end';
    }
    if (this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.finish();
    }
    this.renderer.update(this.world, this.mode === 'pause' ? 0 : dt * (this.slowmo > 0 ? 0.4 : 1) * this.speed);
    if (!this.demo && (this.mode === 'play' || this.mode === 'pause')) this.ui.updateHud(this.world, this.renderer);
    this.renderer.render();
  }

  private processEvents(events: GEvent[]) {
    const w = this.world;
    this.renderer.handleEvents(events, w);
    if (this.demo) return;
    const r = this.renderer;
    const ui = this.ui;
    for (const ev of events) {
      switch (ev.k) {
        case 'edie':
          if (ev.how === 'contact') sound.puff();
          else sound.shatter(ev.how === 'frost');
          break;
        case 'sdie':
          sound.soldierDie();
          break;
        case 'collect': {
          if (w.t - this.collectT > 1.2) this.collectStep = 0;
          this.collectT = w.t;
          if (!ev.good) sound.trap();
          else if (ev.big) sound.big();
          else sound.collect(this.collectStep++);
          const p = r.project(w.ax, 2.6, F.front);
          ui.float(p.x + (Math.random() - 0.5) * 30, p.y, ev.text, ev.good ? (ev.big ? 'gold big' : 'blue') : 'red');
          break;
        }
        case 'gate': {
          sound.gate(ev.good);
          const p = r.project(w.ax, 3, F.front);
          ui.float(p.x, p.y, ev.text, ev.good ? 'gold huge' : 'red huge');
          break;
        }
        case 'whit':
          sound.wallHit();
          break;
        case 'wbreak':
          sound.wallBreak();
          ui.toast(ev.side > 0 ? '右侧石墙已破！' : '左侧石墙已破！', 'gold');
          break;
        case 'bspawn':
          sound.roar();
          ui.toast(`敌将【${ev.name}】来袭！`, 'red big');
          sound.setMusic('boss');
          break;
        case 'bhit': {
          const p = r.project(ev.x + (Math.random() - 0.5) * 1.5, 4.5 + Math.random(), ev.z);
          ui.float(p.x, p.y, '-' + ev.dmg, 'dmg');
          break;
        }
        case 'bdie':
          sound.bossDie();
          this.slowmo = 0.9;
          ui.toast('斩将！', 'gold big');
          if (!w.bosses.some((b) => b.state !== 'dead')) sound.setMusic('battle');
          break;
        case 'bfreeze':
          ui.toast('敌将被冰封！', 'ice');
          break;
        case 'slam':
        case 'boom':
        case 'dash': {
          if (ev.k === 'slam') sound.slam();
          else if (ev.k === 'boom') sound.boom();
          else sound.dash();
          if (ev.killed > 0) {
            const x = ev.x;
            const z = ev.k === 'dash' ? F.front + 1 : ev.z;
            const p = r.project(x, 2, z);
            ui.float(p.x, p.y, '-' + ev.killed, 'red big');
          }
          break;
        }
        case 'windup':
          sound.windup();
          break;
        case 'summon':
          sound.roar();
          ui.toast('战神狂暴 · 召唤铁骑！', 'red big');
          break;
        case 'frost':
          break;
        case 'frostReady':
          sound.frostReady();
          ui.frostPulse();
          break;
        case 'ramHit': {
          sound.ramHit();
          const p = r.project(ev.x, 2, ev.z);
          ui.float(p.x, p.y, '-' + ev.killed, 'red big');
          break;
        }
        default:
          break;
      }
    }
  }
}

function boot() {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div id="stage">
      <div id="gl"></div>
      <div id="overlay"></div>
      <div id="hud"></div>
      <div id="screens"></div>
      <a class="gh-corner" href="${REPO}" target="_blank" rel="noopener" aria-label="GitHub 仓库">${ICON.github}<span>开源</span></a>
    </div>`;
  const game = new Game();
  // debug / test hooks
  (window as unknown as { __sgil: unknown }).__sgil = {
    game,
    start: (id: number) => game.startLevel(id === 99 ? ENDLESS : LEVELS[id - 1]),
    auto: (on: boolean) => (game.autoplay = on),
    speed: (s: number) => (game.speed = s),
    world: () => game.world,
    save: () => game.save,
    state: () => ({ mode: game.mode, state: game.world.state, t: game.world.t, N: game.world.N, remaining: game.world.remaining(), fps: game.fps }),
  };
}

loadFonts().then(boot);

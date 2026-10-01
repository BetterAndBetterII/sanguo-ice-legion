import { LEVELS, ENDLESS } from '../game/levels';
import type { LevelDef } from '../game/levels';
import { BOSS, ENEMY, UPGRADE_MAX, upgradeCost, upgradeStats } from '../game/config';
import type { Upgrades, EType } from '../game/config';
import type { SaveData } from '../game/save';
import { totalStars } from '../game/save';
import type { World } from '../game/world';
import { F } from '../game/config';
import type { Renderer } from '../render/renderer';

export const REPO = 'https://github.com/BetterAndBetterII/sanguo-ice-legion';

export const ICON = {
  github:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V7a5 5 0 00-5-5zm-3 8V7a3 3 0 016 0v3H9z"/></svg>',
  snow: '<svg viewBox="0 0 48 48" aria-hidden="true"><g stroke="currentColor" stroke-width="3.2" stroke-linecap="round" fill="none"><path d="M24 4v40M6.7 14l34.6 20M6.7 34l34.6-20"/><path d="M24 4l-5 5M24 4l5 5M24 44l-5-5M24 44l5-5M6.7 14l1.8 6.8M6.7 14l6.8-1.8M41.3 34l-6.8 1.8M41.3 34l-1.8-6.8M6.7 34l6.8 1.8M6.7 34l1.8-6.8M41.3 14l-1.8 6.8M41.3 14l-6.8-1.8"/></g></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
  soundOn:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 00-2.5-4v8a4.5 4.5 0 002.5-4zM14 3.2v2.1a7 7 0 010 13.4v2.1a9 9 0 000-17.6z"/></svg>',
  soundOff:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm18.6 3l2.1-2.1-1.4-1.4-2.1 2.1-2.1-2.1-1.4 1.4 2.1 2.1-2.1 2.1 1.4 1.4 2.1-2.1 2.1 2.1 1.4-1.4z" transform="translate(-2 0)"/></svg>',
  retry: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5V1L7 6l5 5V7a5 5 0 11-5 5H5a7 7 0 107-7z"/></svg>',
  coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f6c443" stroke="#9a6a10" stroke-width="2"/><rect x="9" y="9" width="6" height="6" fill="#9a6a10"/></svg>',
  hand: '<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="#fff" stroke="#123" stroke-width="3" d="M26 30V10a5 5 0 0110 0v16l3-1a5 5 0 016 3l1 2 3-1a5 5 0 016 4v12c0 9-7 16-16 16h-4c-6 0-10-3-13-8l-8-13a5 5 0 018-6z"/></svg>',
  troops: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 11a3 3 0 100-6 3 3 0 000 6zm8 0a3 3 0 100-6 3 3 0 000 6zM8 13c-3 0-6 1.5-6 4v2h12v-2c0-2.5-3-4-6-4zm8 0c-.5 0-1 0-1.5.1 1.5.9 2.5 2.2 2.5 3.9v2h5v-2c0-2.5-3-4-6-4z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 3l-6 1 2 2-9 9-3-1-2 2 3 1 1 3 2-2-1-3 9-9 2 2z"/></svg>',
  speed: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
  range: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2l3 6h-2v6h-2V8H9zM4 16h16v2H4zm2 3h12v2H6z"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>',
};

export interface UIActions {
  play(level: LevelDef): void;
  openBrief(level: LevelDef): void;
  resume(): void;
  restart(): void;
  toMenu(): void;
  toLevels(): void;
  toUpgrades(): void;
  buyUpgrade(key: keyof Upgrades): void;
  toggleMute(): void;
  pause(): void;
  frost(): void;
  next(): void;
  resetProgress(): void;
}

export interface EndResult {
  win: boolean;
  level: LevelDef;
  stars: number;
  army: number;
  kills: number;
  coins: number;
  time: number;
  bossKills: number;
  firstClear: boolean;
  newBest: boolean;
}

const fmt = (n: number) => (n >= 10000 ? (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '万' : String(n));

const UPG_INFO: Record<keyof Upgrades, { name: string; icon: string; desc: (u: Upgrades) => string }> = {
  troops: { name: '初始兵力', icon: ICON.troops, desc: (u) => `开局额外 +${upgradeStats(u).startBonus} 兵` },
  damage: { name: '冰箭锋利', icon: ICON.arrow, desc: (u) => `箭矢伤害 ×${upgradeStats(u).damage.toFixed(1)}` },
  rate: { name: '连珠快射', icon: ICON.speed, desc: (u) => `射速 ${upgradeStats(u).rate.toFixed(2)} 箭/秒` },
  frostCd: { name: '冰河回息', icon: ICON.snow, desc: (u) => `冰河破冷却 ${upgradeStats(u).frostCd.toFixed(1)} 秒` },
  frostRange: { name: '冰河万里', icon: ICON.range, desc: (u) => `冰河破距离 ${upgradeStats(u).frostRange.toFixed(0)} 步` },
};

export class UI {
  private root: HTMLElement;
  private screens: HTMLElement;
  private hud: HTMLElement;
  private overlay: HTMLElement;
  private armyLabel: HTMLElement;
  private bossBars = new Map<number, HTMLElement>();
  private floaters: HTMLElement[] = [];
  private lastArmy = -1;
  private hudEls: Record<string, HTMLElement> = {};
  private hintEl: HTMLElement | null = null;

  constructor(
    root: HTMLElement,
    private actions: UIActions,
    private save: () => SaveData,
  ) {
    this.root = root;
    this.overlay = root.querySelector('#overlay')!;
    this.hud = root.querySelector('#hud')!;
    this.screens = root.querySelector('#screens')!;
    this.armyLabel = document.createElement('div');
    this.armyLabel.className = 'army-label';
    this.overlay.appendChild(this.armyLabel);
    this.screens.addEventListener('click', (e) => this.onClick(e));
    this.hud.addEventListener('click', (e) => this.onClick(e));
    this.hud.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) e.stopPropagation();
    });
  }

  private onClick(e: Event) {
    const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!el || el.classList.contains('disabled')) return;
    const act = el.dataset.act!;
    const arg = el.dataset.arg;
    const a = this.actions;
    switch (act) {
      case 'start': {
        const s = this.save();
        const id = Math.min(s.unlocked, LEVELS.length);
        a.openBrief(LEVELS[id - 1]);
        break;
      }
      case 'levels':
        a.toLevels();
        break;
      case 'upgrades':
        a.toUpgrades();
        break;
      case 'endless':
        a.openBrief(ENDLESS);
        break;
      case 'level':
        a.openBrief(arg === '99' ? ENDLESS : LEVELS[Number(arg) - 1]);
        break;
      case 'go':
        a.play(arg === '99' ? ENDLESS : LEVELS[Number(arg) - 1]);
        break;
      case 'menu':
        a.toMenu();
        break;
      case 'buy':
        a.buyUpgrade(arg as keyof Upgrades);
        break;
      case 'mute':
        a.toggleMute();
        break;
      case 'pause':
        a.pause();
        break;
      case 'resume':
        a.resume();
        break;
      case 'restart':
        a.restart();
        break;
      case 'next':
        a.next();
        break;
      case 'frost':
        a.frost();
        break;
      case 'reset':
        if (confirm('确定要清空全部进度吗？')) a.resetProgress();
        break;
    }
  }

  private set(html: string, cls = '') {
    this.screens.innerHTML = html ? `<div class="screen ${cls}">${html}</div>` : '';
  }

  private coinsBar(): string {
    const s = this.save();
    return `<div class="coins">${ICON.coin}<span>${fmt(s.coins)}</span></div>`;
  }

  private muteBtn(): string {
    const m = this.save().muted;
    return `<button class="icon-btn" data-act="mute" aria-label="${m ? '开启声音' : '静音'}">${m ? ICON.soundOff : ICON.soundOn}</button>`;
  }

  // ------------------------------------------------------------------ screens
  showMenu() {
    const s = this.save();
    const endlessOpen = s.unlocked > 6;
    const ts = totalStars(s);
    this.hideHud();
    this.set(
      `<div class="top-row">${this.coinsBar()}<div class="stars-total">${ICON.star}<span>${ts}/${LEVELS.length * 3}</span></div>${this.muteBtn()}</div>
      <div class="logo">
        <div class="logo-main">冰河军团</div>
        <div class="logo-sub"><span>三国兵海</span></div>
        <div class="logo-tag">万军对冲 · 冰封千里</div>
      </div>
      <div class="menu-btns">
        <button class="btn btn-gold btn-big" data-act="start">${s.unlocked > 1 ? '继续征战' : '开始征战'}<small>第 ${Math.min(s.unlocked, LEVELS.length)} 关</small></button>
        <button class="btn btn-ice" data-act="levels">选择关卡</button>
        <button class="btn btn-ice" data-act="upgrades">强化军团</button>
        <button class="btn btn-ice ${endlessOpen ? '' : 'disabled'}" data-act="endless">无尽冰河${endlessOpen ? (s.endlessBest ? `<small>最佳 ${fmt(s.endlessBest)}</small>` : '') : '<small>通关第 6 关解锁</small>'}</button>
        <a class="btn btn-gh" href="${REPO}" target="_blank" rel="noopener">${ICON.star}${ICON.github}<span>GitHub 开源</span></a>
      </div>
      <div class="foot">原创同人小游戏 · 拖动指挥 · 自动放箭</div>`,
      'menu',
    );
  }

  showLevels() {
    const s = this.save();
    let html = `<div class="top-row"><button class="icon-btn" data-act="menu" aria-label="返回">${ICON.back}</button><div class="title-sm">选择关卡</div>${this.coinsBar()}</div><div class="level-grid">`;
    let chapter = '';
    for (const l of LEVELS) {
      if (l.sub !== chapter) {
        chapter = l.sub;
        html += `<div class="chapter">${chapter}</div>`;
      }
      const locked = l.id > s.unlocked;
      const st = s.stars[l.id] ?? 0;
      const boss = l.events.some((e) => e.type === 'boss');
      html += `<button class="lvl ${locked ? 'locked disabled' : ''} ${boss ? 'boss' : ''}" data-act="level" data-arg="${l.id}">
        <div class="lvl-n">${locked ? ICON.lock : l.id}</div>
        <div class="lvl-name">${l.name.replace('终章 · ', '')}</div>
        <div class="lvl-stars">${[0, 1, 2].map((i) => `<i class="${i < st ? 'on' : ''}">${ICON.star}</i>`).join('')}</div>
      </button>`;
    }
    const endlessOpen = s.unlocked > 6;
    html += `<div class="chapter">无尽模式</div><button class="lvl endless ${endlessOpen ? '' : 'locked disabled'}" data-act="level" data-arg="99"><div class="lvl-n">${endlessOpen ? '∞' : ICON.lock}</div><div class="lvl-name">无尽冰河</div><div class="lvl-best">${s.endlessBest ? '最佳斩敌 ' + fmt(s.endlessBest) : endlessOpen ? '挑战极限' : '通关第 6 关'}</div></button>`;
    html += `</div>`;
    this.set(html, 'levels');
  }

  showUpgrades() {
    const s = this.save();
    let html = `<div class="top-row"><button class="icon-btn" data-act="menu" aria-label="返回">${ICON.back}</button><div class="title-sm">强化军团</div>${this.coinsBar()}</div><div class="upg-list">`;
    for (const key of Object.keys(UPG_INFO) as (keyof Upgrades)[]) {
      const info = UPG_INFO[key];
      const lv = s.upg[key];
      const max = lv >= UPGRADE_MAX;
      const cost = upgradeCost(lv);
      const nextU = { ...s.upg, [key]: lv + 1 };
      const afford = s.coins >= cost;
      html += `<div class="upg">
        <div class="upg-icon">${info.icon}</div>
        <div class="upg-body">
          <div class="upg-name">${info.name}<span class="upg-lv">Lv.${lv}</span></div>
          <div class="upg-pips">${Array.from({ length: UPGRADE_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
          <div class="upg-desc">${info.desc(s.upg)}${max ? '' : ` <b>→ ${info.desc(nextU).replace(/^[^\d×]*/, '')}</b>`}</div>
        </div>
        <button class="btn btn-small ${max ? 'btn-ice disabled' : afford ? 'btn-gold' : 'btn-ice disabled'}" data-act="buy" data-arg="${key}">${max ? '已满' : `${ICON.coin}${fmt(cost)}`}</button>
      </div>`;
    }
    html += `</div><div class="upg-tip">通关、斩将与斩敌都能获得金币。失败也有少量补给。</div>
    <button class="link-btn" data-act="reset">重置进度</button>`;
    this.set(html, 'upgrades');
  }

  showBrief(l: LevelDef) {
    const s = this.save();
    const counts: Partial<Record<EType, number>> = {};
    const bosses: string[] = [];
    let gates = 0;
    for (const e of l.events) {
      if (e.type === 'wave') counts[e.enemy] = (counts[e.enemy] ?? 0) + e.count;
      if (e.type === 'boss') bosses.push(`${e.name ?? BOSS[e.kind].title}<small>${fmt(e.hp)}</small>`);
      if (e.type === 'gate') gates++;
    }
    const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
    const chips = (Object.keys(counts) as EType[]).map((k) => `<span class="chip chip-${k}">${ENEMY[k].name} ${counts[k]}</span>`).join('');
    const st = s.stars[l.id] ?? 0;
    const startN = l.start + upgradeStats(s.upg).startBonus;
    this.set(
      `<div class="brief-card">
        <div class="brief-sub">${l.endless ? '无尽模式' : `第 ${l.id} 关 · ${l.sub}`}</div>
        <div class="brief-name">${l.name}</div>
        ${l.endless ? `<div class="brief-stars">最佳斩敌 ${fmt(s.endlessBest)}</div>` : `<div class="brief-stars">${[0, 1, 2].map((i) => `<i class="${i < st ? 'on' : ''}">${ICON.star}</i>`).join('')}</div>`}
        <div class="brief-hint">${l.hint}</div>
        <div class="brief-row"><span class="lbl">敌军</span><span class="val red">${l.endless ? '无穷无尽' : fmt(total)}</span></div>
        ${chips ? `<div class="chips">${chips}</div>` : ''}
        ${bosses.length ? `<div class="brief-row"><span class="lbl">敌将</span><span class="val boss-names">${bosses.join('')}</span></div>` : ''}
        ${gates ? `<div class="brief-row"><span class="lbl">抉择之门</span><span class="val">${gates} 道</span></div>` : ''}
        <div class="brief-row"><span class="lbl">我军</span><span class="val blue">${startN} 弓手</span></div>
        ${l.endless ? '' : `<div class="brief-row small"><span class="lbl">星级</span><span class="val">存活 ≥${l.stars[0]} 得二星 · ≥${l.stars[1]} 得三星</span></div>`}
        <div class="brief-btns">
          <button class="btn btn-ice" data-act="${l.endless ? 'menu' : 'levels'}">返回</button>
          <button class="btn btn-gold btn-big" data-act="go" data-arg="${l.id}">出征！</button>
        </div>
      </div>`,
      'brief',
    );
  }

  showPause() {
    this.set(
      `<div class="pause-card">
        <div class="brief-name">暂停</div>
        <button class="btn btn-gold btn-big" data-act="resume">继续战斗</button>
        <button class="btn btn-ice" data-act="restart">重新开始</button>
        <button class="btn btn-ice" data-act="levels">关卡列表</button>
        <button class="btn btn-ice" data-act="mute">${this.save().muted ? '开启声音' : '关闭声音'}</button>
      </div>`,
      'pause',
    );
  }

  showWin(r: EndResult) {
    this.hideHud();
    const l = r.level;
    const hasNext = !l.endless && l.id < LEVELS.length;
    this.set(
      `<div class="end-card win">
        <div class="end-banner win-banner">大 捷</div>
        <div class="end-stars">${[0, 1, 2].map((i) => `<i class="${i < r.stars ? 'on' : ''}" style="animation-delay:${0.35 + i * 0.35}s">${ICON.star}</i>`).join('')}</div>
        <div class="end-level">第 ${l.id} 关 · ${l.name}</div>
        <div class="end-stats">
          <div><span>剩余兵力</span><b class="blue">${fmt(r.army)}</b>${r.newBest ? '<em>新纪录</em>' : ''}</div>
          <div><span>斩敌</span><b class="red">${fmt(r.kills)}</b></div>
          ${r.bossKills ? `<div><span>斩将</span><b>${r.bossKills}</b></div>` : ''}
          <div><span>用时</span><b>${Math.round(r.time)} 秒</b></div>
          <div class="coin-row"><span>获得金币</span><b class="gold">${ICON.coin}<span class="count-up" data-to="${r.coins}">0</span></b></div>
        </div>
        ${l.id === LEVELS.length ? '<div class="end-note">恭喜通关全部关卡！无尽冰河等你挑战。</div>' : ''}
        <div class="end-btns">
          <button class="btn btn-ice" data-act="restart">${ICON.retry}再战</button>
          <button class="btn btn-ice" data-act="upgrades">强化</button>
          ${hasNext ? '<button class="btn btn-gold btn-big" data-act="next">下一关</button>' : '<button class="btn btn-gold btn-big" data-act="menu">主菜单</button>'}
        </div>
      </div>`,
      'end',
    );
    this.countUp();
  }

  showLose(r: EndResult) {
    this.hideHud();
    const l = r.level;
    this.set(
      `<div class="end-card lose">
        <div class="end-banner lose-banner"><span>失败</span></div>
        <div class="end-level">${l.endless ? '无尽冰河' : `第 ${l.id} 关 · ${l.name}`}</div>
        <div class="end-stats">
          <div><span>斩敌</span><b class="red">${fmt(r.kills)}</b>${l.endless && r.newBest ? '<em>新纪录</em>' : ''}</div>
          ${r.bossKills ? `<div><span>斩将</span><b>${r.bossKills}</b></div>` : ''}
          <div><span>坚持</span><b>${Math.round(r.time)} 秒</b></div>
          <div class="coin-row"><span>${l.endless ? '获得金币' : '战场补给'}</span><b class="gold">${ICON.coin}<span class="count-up" data-to="${r.coins}">0</span></b></div>
        </div>
        <button class="retry-hex" data-act="restart" aria-label="重试">${ICON.retry}</button>
        <div class="end-tip">${this.loseTip(r)}</div>
        <div class="end-btns">
          <button class="btn btn-ice" data-act="${l.endless ? 'menu' : 'levels'}">返回</button>
          <button class="btn btn-gold" data-act="upgrades">强化军团</button>
        </div>
      </div>`,
      'end',
    );
    this.countUp();
  }

  private loseTip(r: EndResult): string {
    const tips = [
      '先去左侧兵道收集兵牌，兵多了箭才密。',
      '射穿右侧石墙能拿到大额兵牌——但别贪太久。',
      '敌将抡锤时红圈出现，立刻横移闪开！',
      '冰河破能冻碎一大片敌军，还能冻住敌将三秒。',
      '强化「初始兵力」与「冰箭锋利」能显著降低难度。',
      '抉择之门：用箭射击带准星的门可以提高数字。',
    ];
    return '提示：' + tips[(r.kills + r.level.id) % tips.length];
  }

  private countUp() {
    const el = this.screens.querySelector('.count-up') as HTMLElement | null;
    if (!el) return;
    const to = Number(el.dataset.to);
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0 - 900) / 900);
      el.textContent = String(Math.max(0, Math.round(to * Math.max(0, k))));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  clearScreen() {
    this.set('');
  }

  // ------------------------------------------------------------------ HUD
  showHud(l: LevelDef, frostEnabled: boolean) {
    this.hud.innerHTML = `
      <div class="hud-top">
        <button class="icon-btn" data-act="pause" aria-label="暂停">${ICON.pause}</button>
        <div class="hud-level"><small>${l.endless ? '无尽模式' : '第 ' + l.id + ' 关'}</small>${l.name.replace('终章 · ', '')}</div>
        <div class="enemy-count"><span class="ec-label">敌军</span><span class="ec-num">0</span></div>
        ${this.muteBtn()}
      </div>
      <div class="boss-top hidden"><div class="bt-name"></div><div class="bt-bar"><i></i></div></div>
      <div class="toast-zone"></div>
      ${frostEnabled ? `<button class="frost-btn" data-act="frost" aria-label="冰河破"><div class="fb-cd"></div>${ICON.snow}<span>冰河破</span></button>` : ''}
    `;
    this.hud.classList.add('on');
    this.hudEls = {
      ec: this.hud.querySelector('.ec-num')!,
      bossTop: this.hud.querySelector('.boss-top')!,
      btName: this.hud.querySelector('.bt-name')!,
      btBar: this.hud.querySelector('.bt-bar i')!,
      toast: this.hud.querySelector('.toast-zone')!,
    };
    const fb = this.hud.querySelector('.frost-btn') as HTMLElement | null;
    if (fb) {
      this.hudEls.frost = fb;
      this.hudEls.frostCd = fb.querySelector('.fb-cd')!;
    }
    this.armyLabel.style.display = '';
    this.lastArmy = -1;
  }

  refreshMute() {
    const btn = this.hud.querySelector('[data-act="mute"]');
    if (btn) btn.outerHTML = this.muteBtn();
    const sb = this.screens.querySelector('.top-row [data-act="mute"]');
    if (sb) sb.outerHTML = this.muteBtn();
  }

  hideHud() {
    this.hud.classList.remove('on');
    this.hud.innerHTML = '';
    this.armyLabel.style.display = 'none';
    for (const el of this.bossBars.values()) el.remove();
    this.bossBars.clear();
    this.hideHint();
  }

  showHint() {
    if (this.hintEl) return;
    const el = document.createElement('div');
    el.className = 'drag-hint';
    el.innerHTML = `<div class="dh-hand">${ICON.hand}</div><div class="dh-text">按住拖动 · 指挥军团</div>`;
    this.overlay.appendChild(el);
    this.hintEl = el;
  }

  hideHint() {
    if (this.hintEl) {
      this.hintEl.remove();
      this.hintEl = null;
    }
  }

  toast(text: string, kind = '') {
    const zone = this.hudEls.toast;
    if (!zone) return;
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = text;
    zone.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  float(x: number, y: number, text: string, cls: string) {
    if (this.floaters.length > 45) {
      const old = this.floaters.shift();
      old?.remove();
    }
    const el = document.createElement('div');
    el.className = 'floater ' + cls;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    this.overlay.appendChild(el);
    this.floaters.push(el);
    setTimeout(() => {
      el.remove();
      const i = this.floaters.indexOf(el);
      if (i >= 0) this.floaters.splice(i, 1);
    }, 1100);
  }

  frostPulse() {
    const fb = this.hudEls.frost;
    if (!fb) return;
    fb.classList.remove('ready-pulse');
    void fb.offsetWidth;
    fb.classList.add('ready-pulse');
  }

  updateHud(w: World, r: Renderer) {
    const ec = this.hudEls.ec;
    if (ec) ec.textContent = w.level.endless ? fmt(w.kills) : fmt(w.remaining());
    if (w.level.endless && ec) (ec.previousElementSibling as HTMLElement).textContent = '斩敌';
    // frost button
    const fb = this.hudEls.frost;
    if (fb) {
      const k = w.frostCd / w.stats.frostCd;
      (this.hudEls.frostCd as HTMLElement).style.setProperty('--k', String(Math.max(0, Math.min(1, k))));
      fb.classList.toggle('ready', w.frostCd <= 0 && !w.frostWave);
    }
    // army label
    if (w.soldiers.length) {
      const p = r.project(w.ax, 1.5, F.front - 0.4);
      this.armyLabel.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      if (w.N !== this.lastArmy) {
        this.armyLabel.textContent = fmt(w.N);
        if (this.lastArmy >= 0) {
          this.armyLabel.classList.remove('bump', 'hurt');
          void this.armyLabel.offsetWidth;
          this.armyLabel.classList.add(w.N > this.lastArmy ? 'bump' : 'hurt');
        }
        this.lastArmy = w.N;
      }
      this.armyLabel.style.opacity = '1';
    } else this.armyLabel.style.opacity = '0';
    // boss bars
    const seen = new Set<number>();
    let topBoss: (typeof w.bosses)[number] | null = null;
    for (const b of w.bosses) {
      if (b.state === 'dead') continue;
      seen.add(b.id);
      if (!topBoss) topBoss = b;
      let el = this.bossBars.get(b.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'boss-bar';
        el.innerHTML = '<span class="bb-num"></span><div class="bb-track"><i></i></div>';
        this.overlay.appendChild(el);
        this.bossBars.set(b.id, el);
      }
      const p = r.bossAnchor(b);
      el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
      (el.querySelector('.bb-num') as HTMLElement).textContent = fmt(Math.ceil(b.hp));
      (el.querySelector('i') as HTMLElement).style.width = `${(b.hp / b.maxHp) * 100}%`;
      el.classList.toggle('frozen', b.frozen > 0);
    }
    for (const [id, el] of this.bossBars) {
      if (!seen.has(id)) {
        el.remove();
        this.bossBars.delete(id);
      }
    }
    const bt = this.hudEls.bossTop;
    if (bt) {
      bt.classList.toggle('hidden', !topBoss);
      if (topBoss) {
        this.hudEls.btName.textContent = topBoss.name;
        (this.hudEls.btBar as HTMLElement).style.width = `${(topBoss.hp / topBoss.maxHp) * 100}%`;
      }
    }
  }

  setGray(on: boolean) {
    this.root.classList.toggle('gray', on);
  }
}

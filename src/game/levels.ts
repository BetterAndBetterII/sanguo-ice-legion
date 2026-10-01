import type { BossKind, EType } from './config';

export interface LaneDef {
  panels: string[]; // cycled: '+1', '+99', 'x2', '-10', 'F' (frost charge)
  wall?: number; // wall HP blocking the lane (0/undefined = open)
  spacing?: number;
  speed?: number;
  count?: number; // total panels then stop (default infinite)
  delay?: number;
}

export type LevelEvent =
  | { type: 'wave'; enemy: EType; count: number; rate?: number; pre?: boolean; width?: number; wait?: number; clear?: number }
  | { type: 'boss'; kind: BossKind; hp: number; name?: string; wait?: number; clear?: number }
  | { type: 'lane'; side: 'L' | 'R'; lane: LaneDef | null; wait?: number; clear?: number }
  | { type: 'gate'; left: string; right: string; shoot?: number; wait?: number; clear?: number }
  | { type: 'msg'; text: string; wait?: number; clear?: number };

export interface LevelDef {
  id: number;
  name: string;
  sub: string;
  hint: string;
  start: number; // base starting troops
  lanes: { L?: LaneDef; R?: LaneDef };
  charge: { base: number; ramp: number; max: number }; // horde release rate (enemies / s)
  events: LevelEvent[];
  stars: [number, number]; // final army for 2★ / 3★
  reward: number;
  frost?: boolean; // frost skill available (default true)
  endless?: boolean;
}

const C = (base: number, ramp: number, max: number) => ({ base, ramp, max });

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: '冰河初醒',
    sub: '第一章 · 出征',
    hint: '按住屏幕左右拖动指挥军团。弓手会自动放箭，走到左侧兵道收集「+1」兵牌壮大军团！',
    start: 5,
    lanes: { L: { panels: ['+1'], spacing: 2.3 } },
    charge: C(0.5, 0.02, 2),
    frost: false,
    events: [
      { type: 'wave', enemy: 'inf', count: 90, pre: true },
      { type: 'wave', enemy: 'inf', count: 60, rate: 6, wait: 14 },
    ],
    stars: [40, 80],
    reward: 60,
  },
  {
    id: 2,
    name: '破壁取兵',
    sub: '第一章 · 出征',
    hint: '兵道被石墙封住了！站到墙前用箭射穿它（墙上数字是耐久），右侧墙后藏着「+10」兵牌。',
    start: 6,
    lanes: { L: { panels: ['+1'], wall: 3 }, R: { panels: ['+10'], count: 8, wall: 45, spacing: 2.6 } },
    charge: C(0.6, 0.025, 3),
    frost: false,
    events: [
      { type: 'wave', enemy: 'inf', count: 160, pre: true },
      { type: 'wave', enemy: 'inf', count: 90, rate: 6, wait: 18 },
    ],
    stars: [60, 130],
    reward: 80,
  },
  {
    id: 3,
    name: '冰河破',
    sub: '第一章 · 出征',
    hint: '冰河破已解锁！点右下角冰晶按钮（或空格键）释放一道寒冰巨浪，冻碎前方一切敌军。',
    start: 5,
    lanes: { L: { panels: ['+1', '+1', '+1', 'F'] , wall: 2}, R: { panels: ['+20'], count: 8, wall: 160, spacing: 2.6 } },
    charge: C(0.8, 0.03, 4),
    events: [
      { type: 'wave', enemy: 'inf', count: 260, pre: true },
      { type: 'wave', enemy: 'inf', count: 120, rate: 8, wait: 16 },
    ],
    stars: [80, 160],
    reward: 100,
  },
  {
    id: 4,
    name: '锤将来袭',
    sub: '第二章 · 敌将',
    hint: '敌将【锤将】登场！他抡锤前地面会出现红圈——及时左右闪避，别让整支军团被砸成石像。',
    start: 6,
    lanes: { L: { panels: ['+1'], wall: 2 }, R: { panels: ['+30'], count: 8, wall: 220, spacing: 2.8 } },
    charge: C(0.9, 0.03, 5),
    events: [
      { type: 'wave', enemy: 'inf', count: 300, pre: true },
      { type: 'boss', kind: 'hammer', hp: 300, name: '锤将·蔡阳', wait: 10 },
      { type: 'wave', enemy: 'inf', count: 100, rate: 8, wait: 12 },
    ],
    stars: [40, 100],
    reward: 130,
  },
  {
    id: 5,
    name: '盾墙',
    sub: '第二章 · 敌将',
    hint: '盾兵皮糙肉厚，需要多箭才能击破。中路会升起抉择之门：选对一边，兵力翻倍！',
    start: 8,
    lanes: { L: { panels: ['+1', '+1', '+2'], wall: 4 }, R: { panels: ['+30'], count: 8, wall: 260, spacing: 2.8 } },
    charge: C(1, 0.03, 5),
    events: [
      { type: 'wave', enemy: 'inf', count: 200, pre: true },
      { type: 'wave', enemy: 'shield', count: 70, rate: 4, wait: 4 },
      { type: 'gate', left: 'x2', right: '-20', wait: 14 },
      { type: 'wave', enemy: 'shield', count: 60, rate: 5, wait: 6 },
      { type: 'gate', left: '-30', right: 'x2', wait: 14 },
      { type: 'wave', enemy: 'inf', count: 150, rate: 9, wait: 4 },
    ],
    stars: [250, 550],
    reward: 150,
  },
  {
    id: 6,
    name: '铁骑突袭',
    sub: '第二章 · 敌将',
    hint: '骑兵冲锋极快，会绕开主阵直扑你的军团。时刻留意，把弓阵对准它们！',
    start: 10,
    lanes: { L: { panels: ['+2', '+2', '+5'], wall: 30, spacing: 2.6 }, R: { panels: ['+40'], count: 8, wall: 300, spacing: 2.8 } },
    charge: C(1.1, 0.035, 6),
    events: [
      { type: 'wave', enemy: 'inf', count: 260, pre: true },
      { type: 'wave', enemy: 'cav', count: 30, rate: 2.5, wait: 10 },
      { type: 'gate', left: '+40', right: 'x2', wait: 8 },
      { type: 'wave', enemy: 'cav', count: 50, rate: 3.5, wait: 6 },
      { type: 'wave', enemy: 'inf', count: 150, rate: 8, wait: 2 },
    ],
    stars: [150, 320],
    reward: 170,
  },
  {
    id: 7,
    name: '兵海七九九',
    sub: '第三章 · 兵海',
    hint: '七百九十九敌军压境，三员锤将轮番上阵！右侧巨墙后是「+99」——值不值得硬破，由你定夺。',
    start: 10,
    lanes: { L: { panels: ['+1'], wall: 1, spacing: 2.0 }, R: { panels: ['+99'], count: 8, wall: 799, spacing: 3.0 } },
    charge: C(1.2, 0.035, 6),
    events: [
      { type: 'wave', enemy: 'inf', count: 799, pre: true },
      { type: 'boss', kind: 'hammer', hp: 400, name: '锤将·壹', wait: 6 },
      { type: 'boss', kind: 'hammer', hp: 500, name: '锤将·贰', clear: 1, wait: 2 },
      { type: 'boss', kind: 'hammer', hp: 600, name: '锤将·叁', clear: 1, wait: 2 },
    ],
    stars: [80, 200],
    reward: 220,
  },
  {
    id: 8,
    name: '箭雨',
    sub: '第三章 · 兵海',
    hint: '敌方弓手会站在远处朝你放箭，箭落处会有红点预警——移动闪避，并优先清掉弓手。',
    start: 12,
    lanes: { L: { panels: ['+2', '+2', '+2', 'F'], wall: 20 }, R: { panels: ['+50'], count: 8, wall: 380, spacing: 3 } },
    charge: C(1.4, 0.04, 8),
    events: [
      { type: 'wave', enemy: 'inf', count: 400, pre: true },
      { type: 'wave', enemy: 'archer', count: 60, rate: 3, wait: 3 },
      { type: 'gate', left: '-40', right: '+20', shoot: 3, wait: 14 },
      { type: 'wave', enemy: 'archer', count: 60, rate: 4, wait: 4 },
      { type: 'boss', kind: 'hammer', hp: 2500, name: '锤将·许褚', wait: 6 },
      { type: 'wave', enemy: 'inf', count: 300, rate: 10, wait: 4 },
    ],
    stars: [250, 550],
    reward: 250,
  },
  {
    id: 9,
    name: '冲车破阵',
    sub: '第三章 · 兵海',
    hint: '冲车极其坚固，一旦撞进军团会碾碎大片士兵。务必在它靠近前集中火力或用冰河破冻住它！',
    start: 14,
    lanes: { L: { panels: ['+3', '+3', '-15', '+3', '+8'], wall: 40, spacing: 2.5 }, R: { panels: ['+60'], count: 8, wall: 420, spacing: 2.8 } },
    charge: C(1.5, 0.045, 8),
    events: [
      { type: 'wave', enemy: 'inf', count: 300, pre: true },
      { type: 'wave', enemy: 'shield', count: 120, rate: 4, wait: 2 },
      { type: 'wave', enemy: 'ram', count: 4, rate: 0.25, wait: 6 },
      { type: 'gate', left: 'x2', right: '-50', shoot: 4, wait: 10 },
      { type: 'wave', enemy: 'ram', count: 6, rate: 0.3, wait: 6 },
      { type: 'wave', enemy: 'inf', count: 400, rate: 12, wait: 2 },
    ],
    stars: [180, 400],
    reward: 280,
  },
  {
    id: 10,
    name: '长坂枪魂',
    sub: '第四章 · 名将',
    hint: '【枪将】会锁定一条直线突刺——看到地上红色长条，立刻横向闪开！',
    start: 15,
    lanes: { L: { panels: ['+3', '+3', '+8'], wall: 50, spacing: 2.5 }, R: { panels: ['+80'], count: 8, wall: 500, spacing: 3 } },
    charge: C(1.6, 0.045, 9),
    events: [
      { type: 'wave', enemy: 'inf', count: 500, pre: true },
      { type: 'boss', kind: 'spear', hp: 3000, name: '枪将·张绣', wait: 8 },
      { type: 'wave', enemy: 'cav', count: 100, rate: 3, wait: 8 },
      { type: 'gate', left: '+60', right: '-60', shoot: 3, wait: 10 },
      { type: 'wave', enemy: 'inf', count: 300, rate: 10, wait: 4 },
      { type: 'wave', enemy: 'cav', count: 100, rate: 4, wait: 4 },
    ],
    stars: [300, 700],
    reward: 320,
  },
  {
    id: 11,
    name: '寒夜围城',
    sub: '第四章 · 名将',
    hint: '敌军四面围城。左道冰晶兵牌可立即充满冰河破——冰与箭，缺一不可。',
    start: 18,
    lanes: { L: { panels: ['+4', 'F', '+4', '+4'], wall: 60, spacing: 2.4 }, R: { panels: ['+100'], count: 8, wall: 600, spacing: 3 } },
    charge: C(1.9, 0.05, 10),
    events: [
      { type: 'wave', enemy: 'inf', count: 900, pre: true },
      { type: 'wave', enemy: 'shield', count: 200, rate: 5, wait: 4 },
      { type: 'wave', enemy: 'archer', count: 80, rate: 3, wait: 10 },
      { type: 'gate', left: 'x2', right: 'x3', shoot: 0, wait: 6 },
      { type: 'wave', enemy: 'cav', count: 120, rate: 4, wait: 8 },
      { type: 'wave', enemy: 'inf', count: 500, rate: 14, wait: 4 },
      { type: 'wave', enemy: 'ram', count: 5, rate: 0.3, wait: 2 },
    ],
    stars: [250, 550],
    reward: 360,
  },
  {
    id: 12,
    name: '火烧连营',
    sub: '第四章 · 名将',
    hint: '【火将】远程投掷火球，落点会出现红圈。他躲在远处——走近、对准、射倒他！',
    start: 20,
    lanes: { L: { panels: ['+5', '+5', '-20', '+12'], wall: 80, spacing: 2.4 }, R: { panels: ['+120'], count: 8, wall: 700, spacing: 3 } },
    charge: C(1.9, 0.05, 10),
    events: [
      { type: 'wave', enemy: 'inf', count: 700, pre: true },
      { type: 'wave', enemy: 'archer', count: 80, rate: 3, wait: 4 },
      { type: 'boss', kind: 'fire', hp: 5000, name: '火将·陆逊', wait: 8 },
      { type: 'gate', left: '-80', right: '+30', shoot: 2, wait: 12 },
      { type: 'wave', enemy: 'ram', count: 6, rate: 0.3, wait: 4 },
      { type: 'wave', enemy: 'inf', count: 500, rate: 12, wait: 4 },
    ],
    stars: [350, 800],
    reward: 400,
  },
  {
    id: 13,
    name: '千骑卷平冈',
    sub: '第五章 · 决战',
    hint: '千骑席卷而来！抉择之门可以用箭射来改写数字——负数也能射成正数。',
    start: 22,
    lanes: { L: { panels: ['+5', '+5', '+10', 'F'], wall: 100, spacing: 2.4 }, R: { panels: ['+150'], count: 8, wall: 800, spacing: 3 } },
    charge: C(2, 0.05, 11),
    events: [
      { type: 'wave', enemy: 'inf', count: 600, pre: true },
      { type: 'wave', enemy: 'cav', count: 250, rate: 5, wait: 6 },
      { type: 'gate', left: '-100', right: '-60', shoot: 1, wait: 8 },
      { type: 'wave', enemy: 'cav', count: 250, rate: 6, wait: 6 },
      { type: 'boss', kind: 'spear', hp: 6000, name: '枪将·马超', wait: 4 },
      { type: 'gate', left: 'x2', right: '+100', shoot: 2, wait: 10 },
      { type: 'wave', enemy: 'cav', count: 250, rate: 6, wait: 4 },
    ],
    stars: [600, 1300],
    reward: 450,
  },
  {
    id: 14,
    name: '三将合围',
    sub: '第五章 · 决战',
    hint: '锤将、枪将、火将三员猛将同时来袭，红圈与长条会交错出现。冷静走位！',
    start: 25,
    lanes: { L: { panels: ['+6', '+6', '+15', 'F', '-30'], wall: 120, spacing: 2.4 }, R: { panels: ['+200'], count: 8, wall: 1000, spacing: 3 } },
    charge: C(2.1, 0.05, 11),
    events: [
      { type: 'wave', enemy: 'inf', count: 1000, pre: true },
      { type: 'wave', enemy: 'shield', count: 200, rate: 5, wait: 4 },
      { type: 'boss', kind: 'hammer', hp: 6000, name: '锤将·典韦', wait: 8 },
      { type: 'boss', kind: 'fire', hp: 6000, name: '火将·周瑜', wait: 10 },
      { type: 'gate', left: '+80', right: 'x2', shoot: 2, wait: 6 },
      { type: 'boss', kind: 'spear', hp: 7000, name: '枪将·赵云', wait: 10 },
      { type: 'wave', enemy: 'cav', count: 200, rate: 5, wait: 6 },
      { type: 'wave', enemy: 'archer', count: 120, rate: 4, wait: 2 },
    ],
    stars: [700, 1800],
    reward: 520,
  },
  {
    id: 15,
    name: '终章 · 炎魔战神',
    sub: '第五章 · 决战',
    hint: '最终决战！炎魔战神会砸地、投火、召唤铁骑，血量减半后狂暴。集结你的全部兵力，冰封战神！',
    start: 30,
    lanes: { L: { panels: ['+8', '+8', '+20', 'F'], wall: 150, spacing: 2.3 }, R: { panels: ['+300'], count: 8, wall: 1300, spacing: 3 } },
    charge: C(2.2, 0.05, 12),
    events: [
      { type: 'wave', enemy: 'inf', count: 1200, pre: true },
      { type: 'wave', enemy: 'shield', count: 250, rate: 6, wait: 4 },
      { type: 'gate', left: 'x2', right: '-100', shoot: 2, wait: 10 },
      { type: 'wave', enemy: 'archer', count: 120, rate: 4, wait: 6 },
      { type: 'boss', kind: 'warlord', hp: 25000, name: '炎魔战神·吕布', wait: 8 },
      { type: 'wave', enemy: 'ram', count: 8, rate: 0.25, wait: 6 },
      { type: 'wave', enemy: 'inf', count: 600, rate: 12, wait: 4 },
      { type: 'wave', enemy: 'cav', count: 200, rate: 5, wait: 4 },
    ],
    stars: [700, 1600],
    reward: 800,
  },
];

/** Endless mode: an infinite, escalating chunk generator. */
export const ENDLESS: LevelDef = {
  id: 99,
  name: '无尽冰河',
  sub: '无尽模式',
  hint: '敌军无穷无尽，越战越强。坚持得越久，斩敌越多，奖励越丰厚！',
  start: 20,
  lanes: { L: { panels: ['+3', '+3', 'F', '+3', '+8'], wall: 30, spacing: 2.4 }, R: { panels: ['+80'], count: 8, wall: 400, spacing: 3 } },
  charge: C(2, 0.03, 14),
  events: [],
  stars: [0, 0],
  reward: 0,
  endless: true,
};

export function endlessChunk(k: number): LevelEvent[] {
  const ev: LevelEvent[] = [];
  const s = 1 + k * 0.35;
  ev.push({ type: 'wave', enemy: 'inf', count: Math.round(180 * s), rate: 8 + k, wait: k === 0 ? 0 : 2, clear: k === 0 ? undefined : 60 });
  if (k >= 1) ev.push({ type: 'wave', enemy: k % 2 ? 'shield' : 'cav', count: Math.round(40 * s), rate: 4 + k * 0.3, wait: 3 });
  if (k >= 2) ev.push({ type: 'wave', enemy: 'archer', count: Math.round(20 * s), rate: 3, wait: 3 });
  if (k % 2 === 1) ev.push({ type: 'gate', left: k % 4 === 1 ? 'x2' : `-${20 * k}`, right: k % 4 === 1 ? `-${20 * k}` : 'x2', shoot: 2, wait: 4 });
  if (k % 3 === 2) {
    const kinds = ['hammer', 'spear', 'fire', 'warlord'] as const;
    ev.push({ type: 'boss', kind: kinds[Math.floor(k / 3) % 4], hp: Math.round(500 + 300 * k), wait: 4 });
  }
  if (k >= 4 && k % 2 === 0) ev.push({ type: 'wave', enemy: 'ram', count: 2 + Math.floor(k / 4), rate: 0.3, wait: 4 });
  if (k > 0 && k % 3 === 0) ev.push({ type: 'lane', side: 'R', lane: { panels: [`+${80 + 40 * k}`], wall: 400 + 150 * k, spacing: 3 }, wait: 0 });
  return ev;
}

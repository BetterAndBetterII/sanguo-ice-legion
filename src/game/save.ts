import type { Upgrades } from './config';
import { UPGRADE_MAX, upgradeCost } from './config';

export interface SaveData {
  v: 1;
  unlocked: number; // highest unlocked level id
  stars: Record<number, number>;
  best: Record<number, number>; // best final army per level
  coins: number;
  upg: Upgrades;
  muted: boolean;
  endlessBest: number;
  tutorialDone: boolean;
}

const KEY = 'sanguo-ice-legion-save-v1';

function fresh(): SaveData {
  return {
    v: 1,
    unlocked: 1,
    stars: {},
    best: {},
    coins: 0,
    upg: { troops: 0, damage: 0, rate: 0, frostCd: 0, frostRange: 0 },
    muted: false,
    endlessBest: 0,
    tutorialDone: false,
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const d = JSON.parse(raw) as Partial<SaveData>;
    const f = fresh();
    return { ...f, ...d, upg: { ...f.upg, ...(d.upg ?? {}) }, stars: { ...(d.stars ?? {}) }, best: { ...(d.best ?? {}) } } as SaveData;
  } catch {
    return fresh();
  }
}

export function writeSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage may be unavailable (private mode) */
  }
}

export function resetSave(): SaveData {
  const f = fresh();
  writeSave(f);
  return f;
}

export function totalStars(s: SaveData): number {
  return Object.values(s.stars).reduce((a, b) => a + b, 0);
}

export function canUpgrade(s: SaveData, key: keyof Upgrades): boolean {
  const lv = s.upg[key];
  return lv < UPGRADE_MAX && s.coins >= upgradeCost(lv);
}

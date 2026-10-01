// Battlefield geometry & tuning constants (world units ~ 1 soldier = 0.5u)

export const F = {
  centerHalf: 4.7, // half width of the central enemy corridor
  dividerX: 5.0, // x of the divider walls between corridor & side lanes
  dividerHalf: 0.3,
  laneX: 6.3, // side lane center
  laneHalf: 1.2,
  outerX: 7.6, // outer cliff boundary
  dividerEndZ: -8, // dividers run from far away to here
  wallZ: -9.2, // lane wall (barrier) position
  spawnZ: -74,
  holdZ: -12, // where the horde gathers before charging
  front: 0, // army front line
  panelSpawnZ: -82,
  panelEndZ: 18,
  arrowRange: 34,
  arrowSpeed: 42,
  minX: -7.1,
  maxX: 7.1,
} as const;

export const VIS_CAP = 200; // max rendered soldiers (count can be larger)
export const SHOOT_CAP = 150; // max physical arrow shooters
export const ARMY_SPACING = 0.29;
export const MAX_ARMY = 99999;

export type EType = 'inf' | 'shield' | 'cav' | 'archer' | 'ram';

export interface ETypeDef {
  hp: number;
  speed: number;
  r: number;
  contact: number; // soldiers killed on contact
  name: string;
}

export const ENEMY: Record<EType, ETypeDef> = {
  inf: { hp: 1, speed: 2.5, r: 0.28, contact: 1, name: '步卒' },
  shield: { hp: 5, speed: 1.8, r: 0.34, contact: 1, name: '盾兵' },
  cav: { hp: 3, speed: 5.6, r: 0.42, contact: 2, name: '骑兵' },
  archer: { hp: 2, speed: 2.2, r: 0.28, contact: 1, name: '弓手' },
  ram: { hp: 70, speed: 1.35, r: 1.05, contact: 18, name: '冲车' },
};

export type BossKind = 'hammer' | 'spear' | 'fire' | 'warlord';

export const BOSS: Record<BossKind, { r: number; speed: number; standoff: number; cd: number; scale: number; title: string }> = {
  hammer: { r: 1.15, speed: 1.7, standoff: 3.0, cd: 3.4, scale: 2.5, title: '锤将' },
  spear: { r: 1.0, speed: 2.0, standoff: 10, cd: 4.2, scale: 2.4, title: '枪将' },
  fire: { r: 1.0, speed: 1.6, standoff: 15, cd: 3.8, scale: 2.4, title: '火将' },
  warlord: { r: 1.6, speed: 1.4, standoff: 4.0, cd: 2.8, scale: 3.4, title: '炎魔战神' },
};

export interface Upgrades {
  troops: number;
  damage: number;
  rate: number;
  frostCd: number;
  frostRange: number;
}

export const UPGRADE_MAX = 10;

export function upgradeStats(u: Upgrades) {
  return {
    startBonus: u.troops * 3,
    damage: 1 + 0.2 * u.damage,
    rate: 1.5 * (1 + 0.09 * u.rate),
    frostCd: 24 - 1.4 * u.frostCd,
    frostRange: 16 + 1.4 * u.frostRange,
    frostWidth: 7 + 0.25 * u.frostRange,
  };
}

export function upgradeCost(level: number): number {
  return Math.round((40 * Math.pow(1.48, level)) / 5) * 5;
}

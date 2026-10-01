import { F, ENEMY } from './config';
import { ES, World, parsePanel } from './world';

/** Heuristic autoplayer: used for balance sims, demo mode and automated tests. */
export class Bot {
  private target = 0;
  private timer = 0;
  constructor(private skill = 1) {}

  update(w: World, dt: number): { x: number; frost: boolean } {
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.1 + (1 - this.skill) * 0.25;
      this.target = this.decide(w);
    }
    return { x: this.target, frost: this.wantFrost(w) };
  }

  private wantFrost(w: World): boolean {
    if (!w.frostEnabled || w.frostCd > 0 || w.frostWave) return false;
    const range = w.stats.frostRange;
    const hw = w.stats.frostWidth / 2;
    let n = 0;
    let near = 0;
    for (const e of w.enemies) {
      if (e.state === ES.Dying) continue;
      if (e.z > F.front - range && Math.abs(e.x - w.ax) < hw) {
        n += e.type === 'ram' ? 15 : e.type === 'shield' ? 2 : 1;
        if (e.z > F.front - 7) near++;
      }
    }
    const boss = w.bosses.find((b) => b.state !== 'dead' && b.frozen <= 0 && b.z > F.front - range && Math.abs(b.x - w.ax) < hw + 1);
    if (boss && (boss.state === 'windup' || boss.state === 'idle')) return true;
    return n >= 45 || near >= 14;
  }

  private decide(w: World): number {
    const offsets = w.slotOffsets();
    const N = w.N;
    const nVis = Math.max(1, offsets.length);
    const reach = w.Rx * 0.85 + F.laneHalf;
    const gm = 1 + 30 / Math.max(1, N);
    let best = w.ax;
    let bestScore = -1e18;
    const dps = w.stats.damage * w.stats.rate * Math.min(N, 150) * (N / Math.min(N, 150));
    for (let cx = F.minX + w.Rx * 0.55; cx <= F.maxX - w.Rx * 0.55 + 1e-6; cx += 0.35) {
      let score = 0;
      const travel = Math.abs(cx - w.ax) / 14 + 0.12;
      // --- danger from telegraphs
      for (const t of w.teles) {
        const left = t.dur - t.t;
        let inside = 0;
        for (const [ox, oz] of offsets) {
          const x = cx + ox;
          if (t.kind === 'circle') {
            if ((x - t.x) ** 2 + (oz - t.z) ** 2 < (t.r + 0.3) ** 2) inside++;
          } else if (Math.abs(x - t.x) < t.r + 0.3 && oz < t.z1) inside++;
        }
        const reachable = travel < left ? 1 : 0.3;
        score -= ((inside / nVis) * (N * 12 + 400) + (inside > 0 ? 100 : 0)) * reachable;
      }
      for (const p of w.eproj) {
        if (p.dur - p.t > 0.15 && Math.abs(p.x1 - cx - (w.ax - w.ax)) < 0.8) score -= 0.5;
      }
      // --- offense: enemies in our firing column
      let march = 0;
      for (const e of w.enemies) {
        if (e.state === ES.Dying) continue;
        if (e.z < F.front - F.arrowRange || e.z > F.front + 1) continue;
        if (Math.abs(e.x - cx) < w.Rx + 0.2) {
          const dist = F.front - e.z;
          if (e.state !== ES.Charge && e.type !== 'archer') {
            march += 0.04;
            continue;
          }
          const urg = dist < 18 ? 1 + (18 - dist) / 4 : 0.5;
          let v = urg * (e.type === 'archer' ? 3 : 1) * (e.type === 'ram' ? ENEMY.ram.contact / 4 : 1);
          if (e.z < F.dividerEndZ && Math.abs(cx) > F.dividerX - 0.2 && Math.abs(e.x) < F.dividerX) v *= 0.2;
          score += v;
        }
      }
      score += Math.min(8, march);
      for (const b of w.bosses) {
        if (b.state === 'dead') continue;
        if (Math.abs(b.x - cx) < b.r + w.Rx * 0.5) score += 25;
      }
      // --- walls: worth shooting if the lane behind is valuable
      for (const lane of w.lanes) {
        if (!lane.wall || !lane.wall.alive || !lane.def) continue;
        if (Math.abs(lane.x - cx) < F.laneHalf + w.Rx * 0.6) {
          const pv = this.panelValue(lane.def.panels, N);
          const pps = (lane.def.speed ?? 5) / (lane.def.spacing ?? 2.3);
          const tBreak = lane.wall.hp / Math.max(0.5, dps * Math.min(1, (F.laneHalf * 2) / Math.max(1, w.Rx * 2)));
          const ov = Math.max(0, Math.min(cx + w.Rx, lane.x + F.laneHalf) - Math.max(cx - w.Rx, lane.x - F.laneHalf)) / (2 * w.Rx);
          const tb = tBreak / Math.max(0.2, ov);
          const cnt = lane.def.count;
          const rate = cnt ? (cnt * pv) / (tb + cnt / pps) : pv * pps;
          score += Math.min(90, rate * 6 * gm * Math.pow(tb < 12 ? 1 : 12 / tb, 2)) * ov;
        }
      }
      // --- panels arriving soon
      for (const lane of w.lanes) {
        if (lane.wall && lane.wall.alive) continue;
        const sp = lane.def?.speed ?? 5;
        for (const p of lane.panels) {
          if (p.z < F.front - sp * 2.2 || p.z > F.front + 2 * w.Rz) continue;
          if (Math.abs(p.x - cx) < reach) {
            const eta = (F.front - p.z) / sp;
            if (eta < travel - 0.2 && eta > 0) continue;
            let v = 0;
            if (p.kind === 'add') v = p.n >= 0 ? p.n * 3 : p.n * 3.5;
            else if (p.kind === 'mul') v = N * (p.n - 1) * 3;
            else v = w.frostCd > 3 ? 12 : 1;
            score += v * gm;
          }
        }
      }
      // --- gates
      for (const g of w.gates) {
        if (g.passed >= 0 || g.z < F.front - 12) continue;
        if (Math.abs(cx) > F.centerHalf + 0.2) continue;
        const h = g.halves[cx < 0 ? 0 : 1];
        const v = h.op === 'mul' ? N * (h.v - 1) : h.v;
        score += v * 1.5 * (g.z > F.front - 4 ? 3 : 1);
      }
      score -= Math.abs(cx - this.target) * 0.6;
      if (score > bestScore) {
        bestScore = score;
        best = cx;
      }
    }
    return best;
  }

  private panelValue(panels: string[], N: number): number {
    let v = 0;
    for (const s of panels) {
      const p = parsePanel(s);
      v += p.kind === 'add' ? p.n : p.kind === 'mul' ? N * (p.n - 1) * 0.6 : 5;
    }
    return v / panels.length;
  }
}

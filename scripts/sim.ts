// Headless balance simulation: npx tsx scripts/sim.ts [levelId|all] [upgradeLevel] [runs] [skill]
import { LEVELS, ENDLESS } from '../src/game/levels';
import { World } from '../src/game/world';
import { Bot } from '../src/game/bot';

const arg = process.argv[2] ?? 'all';
const ul = Number(process.argv[3] ?? 0);
const runs = Number(process.argv[4] ?? 3);
const skill = Number(process.argv[5] ?? 1);
const upg = { troops: ul, damage: ul, rate: ul, frostCd: ul, frostRange: ul };

const levels = arg === 'all' ? LEVELS : arg === 'endless' ? [ENDLESS] : LEVELS.filter((l) => String(l.id) === arg);
for (const level of levels) {
  const res: string[] = [];
  let wins = 0;
  for (let r = 0; r < runs; r++) {
    const w = new World({ level, upg, seed: 1234 + r * 77 });
    const bot = new Bot(skill);
    const dt = 1 / 60;
    let maxEnemies = 0;
    const t0 = performance.now();
    const bossLog: string[] = [];
    const spawnAt = new Map<number, [number, number]>();
    while (w.state === 'play' && w.t < 400) {
      const d = bot.update(w, dt);
      w.setTarget(d.x);
      if (d.frost) w.castFrost();
      w.update(dt);
      for (const ev of w.events) {
        if (ev.k === 'bspawn') spawnAt.set(ev.id, [w.t, w.N]);
        if (ev.k === 'bdie') { const sp = spawnAt.get(ev.id)!; bossLog.push(`${ev.kind}:${(w.t - sp[0]).toFixed(0)}s(N${sp[1]}→${w.N})`); }
      }
      w.events.length = 0;
      maxEnemies = Math.max(maxEnemies, w.enemies.length);
    }
    const ms = performance.now() - t0;
    if (w.state === 'win') wins++;
    res.push(`${w.state}@${w.t.toFixed(0)}s N=${w.N} peak=${w.peakN} kills=${w.kills} rem=${w.remaining()} boss=${w.bossAlive()?.hp.toFixed(0) ?? '-'} ★${w.stars()} coins=${w.coinsEarned()} maxE=${maxEnemies} ${(ms / (w.t * 60)).toFixed(2)}ms/step ${bossLog.join(' ')}`);
  }
  console.log(`L${level.id} [u${ul} s${skill}] ${wins}/${runs} | ` + res.map(r => r.replace(/ kills=\d+| rem=0| boss=-| coins=\d+| maxE=\d+| [\d.]+ms\/step/g, '')).join(' | '));
}

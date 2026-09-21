// =============================================
// ⚖️ Banco de equilibrio — `npm run balance`
//
// Juega partidas con tres bots (torpe, sensato, experto) y cuenta cuántas llegan al jefe, cuántas lo vencen,
// dónde se muere y contra quién. Sirve para tocar números con datos y no a ojo.
//
//   npm run balance                          1000 partidas por bot
//   npm run balance -- --n 3000              más partidas
//   npm run balance -- --set subboss.hpMul=1.6 --set weights.subboss=9
//                                            prueba una variante SIN tocar los archivos
//   npm run balance -- --bots sensato        solo un bot
// =============================================
import { RPG_BALANCE } from '../src/data/balance.js';
import { runBatch, BOTS } from './sim.mjs';

const args = process.argv.slice(2);
const getAll = flag => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const n = Number(getAll('--n')[0]) || 1000;
const botNames = (getAll('--bots')[0] || Object.keys(BOTS).join(',')).split(',');

for (const kv of getAll('--set')) {
    const [path, value] = kv.split('=');
    const keys = path.split('.');
    let o = RPG_BALANCE;
    for (const k of keys.slice(0, -1)) o = o[k];
    if (!(keys.at(-1) in o)) throw new Error(`Número de equilibrio desconocido: ${path}`);
    o[keys.at(-1)] = Number(value);
    console.log(`⚙️  ${path} = ${value}`);
}

const pct = (a, b) => `${(100 * a / b).toFixed(1).padStart(5)} %`;
const started = Date.now();
console.log(`\n⚖️ Banco de equilibrio · ${n} partidas por bot\n`);
const rows = [];
for (const name of botNames) {
    const r = runBatch(name, n);
    rows.push(r);
    const top = [...r.killers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${Math.round(100 * v / n)}%`).join(', ');
    console.log(`${name.padEnd(8)} llega al jefe ${pct(r.reached, n)} · lo vence ${pct(r.won, n)} · combates/partida ${(r.fights / n).toFixed(1)} · hogueras ${(r.campfires / n).toFixed(1)} · eventos ${(r.events / n).toFixed(1)}`);
    console.log(`         muertes por piso (1-16): ${r.deaths.map(d => String(Math.round(100 * d / n)).padStart(2)).join(' ')}   · mata más: ${top || '—'}`);
}
console.log(`\n(${((Date.now() - started) / 1000).toFixed(1)} s)`);

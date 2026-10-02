// =============================================
// 🧭 Banco de la aventura: miles de partidas de Zafias jugadas por un bot, de jugador nuevo a jefe de la zona.
// Mide, por enemigo, cuánto se gana, cuánta vida cuesta y cuántas veces se cae; y por partida, el nivel, el oro, las
// pociones y las veces que hay que dormir. No es una prueba que falle: es un informe. El bot vive en
// tests/lib/adventure-bot.mjs (los bancos nuevos lo reutilizan con sus propios ganchos).
// Uso: node tests/adventure-sim.mjs [partidas=2000] [--bot listo|ingenuo]
//      SHIFT=-1 node tests/adventure-sim.mjs   baja un piso a todos los enemigos (para probar sin tocar los datos)
// =============================================
import { ZAFIAS } from '../src/data/zones/zafias.js';
import { CREATURES } from '../src/data/creatures.js';
import { simulate, report, POLICIES } from './lib/adventure-bot.mjs';

const args = process.argv.slice(2);
const N = Number(args.find(a => /^\d+$/.test(a)) || 2000);
const BOT = args.includes('--bot') ? args[args.indexOf('--bot') + 1] : 'listo';

const SHIFT = Number(process.env.SHIFT || 0);
if (SHIFT) {
    for (const sc of Object.values(ZAFIAS.scenes)) for (const p of sc.points) if (p.enemy && p.enemy.floor != null) p.enemy.floor = Math.max(0, p.enemy.floor + SHIFT);
    for (const c of Object.values(CREATURES)) c.floor = Math.max(0, c.floor + SHIFT);
}

const t0 = Date.now();
const res = simulate({ runs: N, policy: POLICIES[BOT] || POLICIES.listo });
console.log(report(res, `bot ${BOT} (${((Date.now() - t0) / 1000).toFixed(1)} s)`));

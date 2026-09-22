// =============================================
// ⚖️ RPG-pack — vigilante del equilibrio
// El equilibrio se afina con `npm run balance`. Este test NO fija los números: solo salta si un cambio deja el juego
// injugable, demasiado fácil o sin diferencia entre jugar bien y mal. Las bandas son anchas a propósito.
// Objetivo de diseño: un jugador medio gana ~20 % de las partidas.
// =============================================
import { createRpgHero, createRpgMonster } from '../src/engine.js';
import { createRpgItem, equipItem } from '../src/items.js';
import { runBatch, fightWith } from '../tools/sim.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}

const N = 500;
console.log(`\n⚖️ Tasas de victoria (${N} partidas por bot)`);
const torpe = runBatch('torpe', N, 20000);
const sensato = runBatch('sensato', N, 20000);
const experto = runBatch('experto', N, 20000);
const pct = (a) => Math.round(100 * a / N);
console.log(`     ℹ️ llegan al jefe / lo vencen → torpe ${pct(torpe.reached)}/${pct(torpe.won)} %, sensato ${pct(sensato.reached)}/${pct(sensato.won)} %, experto ${pct(experto.reached)}/${pct(experto.won)} %`);

assert('el jugador sensato gana entre el 10 % y el 30 % (objetivo: ~20 %)', pct(sensato.won) >= 10 && pct(sensato.won) <= 30);
assert('el jugador experto gana entre el 25 % y el 75 %', pct(experto.won) >= 25 && pct(experto.won) <= 75);
assert('el jugador torpe (solo ataca) no gana más del 25 %', pct(torpe.won) <= 25);
assert('jugar mejor se nota: torpe < sensato < experto (con margen)', pct(torpe.won) + 2 < pct(sensato.won) && pct(sensato.won) + 10 < pct(experto.won));
assert('el jefe final se alcanza: el sensato llega al menos el 25 % de las veces', pct(sensato.reached) >= 25);
assert('pocos mueren en los 5 primeros pisos (sensato < 10 %)', sensato.deaths.slice(0, 5).reduce((a, b) => a + b, 0) / N < 0.10);
assert('la dificultad se concentra al final: mueren más en el último tramo que en el primero',
    sensato.deaths.slice(10).reduce((a, b) => a + b, 0) > sensato.deaths.slice(0, 5).reduce((a, b) => a + b, 0));

console.log('\n💰 Coste de cada combate con el héroe sano (bot sensato)');
{
    const STUB = () => 0.5;
    // Un héroe «típico» del piso f: equipo poco común, uno más cada pocos pisos (la ruta da unos 4-6 objetos)
    const grow = (f) => {
        const h = createRpgHero();
        const gear = [['gladio_corto', 1], ['cota_caminante', 2], ['escudo_torre', 5], ['anillo_filo', 8]];
        for (const [baseId, from] of gear) if (f >= from) equipItem(h, createRpgItem({ rng: STUB, floor: f, baseId, rarityId: 'poco_comun' }));
        h.hp = h.maxHp;
        return h;
    };
    const cost = (type, f) => {
        const h = grow(f), start = h.hp;
        const out = fightWith('sensato', h, createRpgMonster(type, f), STUB);
        return out.result === 'victory' ? (start - h.hp) / start : Infinity;
    };
    let worst = 0, worstFloor = 0;
    for (let f = 0; f <= 13; f++) { const c = cost('monster', f); if (c > worst) { worst = c; worstFloor = f + 1; } }
    console.log(`     ℹ️ el combate normal más caro cuesta el ${Math.round(worst * 100)} % de la vida (piso ${worstFloor})`);
    assert('ningún combate normal cuesta más del 35 % de la vida (antes de esta entrega: 20-30 % de media)', worst <= 0.35);
    assert('los 3 primeros combates cuestan menos del 12 % (grupo fácil)', [0, 1, 2].every(f => cost('monster', f) < 0.12));
    assert('un sub-jefe se puede vencer con la vida completa en TODOS los pisos donde aparece (5-14)', (() => {
        for (let f = 4; f <= 13; f++) if (!Number.isFinite(cost('subboss', f))) return false;
        return true;
    })());
    assert('un sub-jefe es un reto de verdad: cuesta más de media que un monstruo normal (un piso suelto puede variar por el patrón exacto)',
        [4, 8, 12].reduce((t, f) => t + cost('subboss', f), 0) > [4, 8, 12].reduce((t, f) => t + cost('monster', f), 0));
    assert('un sub-jefe nunca deja al héroe sano al borde de la muerte (< 70 % de la vida)', (() => {
        for (let f = 4; f <= 13; f++) if (cost('subboss', f) >= 0.7) return false;
        return true;
    })());
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

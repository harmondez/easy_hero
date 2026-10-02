// =============================================
// 🧭 Zonas del Modo Aventura: los datos encajan entre sí
// Cada camino une paradas que existen, todo se puede alcanzar desde la entrada de su escena, las paradas y los
// recodos caen dentro del encuadre, las salidas llevan a paradas reales y cada diálogo citado está escrito.
// =============================================
import { ZAFIAS, ZAFIAS_DIALOGUES } from '../src/data/zones/zafias.js';
import { PORTRAITS } from '../src/data/characters.js';
import { ART } from '../src/data/art.js';

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}${detail ? ` → ${detail}` : ''}`); }
}

const zone = ZAFIAS;
const MARGIN = 12;   // un punto puede rozar el borde del encuadre
console.log('\n🧭 Zona de Zafias');

const allIds = Object.values(zone.scenes).flatMap(sc => sc.points.map(p => p.id));
assert('Cada parada tiene un id único en toda la zona', new Set(allIds).size === allIds.length,
    allIds.filter((id, i) => allIds.indexOf(id) !== i).join(', '));

for (const [sid, sc] of Object.entries(zone.scenes)) {
    const nodes = { ...(sc.forks || {}) };
    for (const p of sc.points) nodes[p.id] = p;
    const b = sc.box;
    const inside = q => q.x >= b.x - MARGIN && q.x <= b.x + b.w + MARGIN && q.y >= b.y - MARGIN && q.y <= b.y + b.h + MARGIN;

    const badLinks = (sc.links || []).filter(([a, c]) => !nodes[a] || !nodes[c]).map(l => `${l[0]}→${l[1]}`);
    assert(`${sid}: cada camino une paradas o cruces que existen`, !badLinks.length, badLinks.join(', '));

    const untraced = (sc.links || []).filter(l => !l[2]).map(l => `${l[0]}→${l[1]}`);
    assert(`${sid}: cada camino tiene recodos (a mano o trazados con tools/trace-paths.mjs)`, !untraced.length, untraced.join(', '));

    const out = [...Object.entries(nodes).filter(([, q]) => !inside(q)).map(([id]) => id),
        ...(sc.links || []).flatMap(([a, c, via = []]) => via.filter(q => !inside(q)).map(q => `${a}→${c} (${q.x},${q.y})`))];
    assert(`${sid}: paradas y recodos dentro del encuadre de la escena`, !out.length, out.join(', '));

    // Todo se alcanza desde la entrada (sin contar bloqueos ni marcas: eso es la historia, no el mapa)
    const seen = new Set([sc.startAt]);
    const queue = [sc.startAt];
    while (queue.length) {
        const id = queue.shift();
        for (const [a, c] of sc.links || []) {
            const next = a === id ? c : c === id ? a : null;
            if (next && !seen.has(next)) { seen.add(next); queue.push(next); }
        }
    }
    const lost = Object.keys(nodes).filter(id => !seen.has(id));
    assert(`${sid}: todo se alcanza por los caminos desde «${sc.startAt}»`, !lost.length, lost.join(', '));

    const badExits = sc.points.filter(p => p.kind === 'exit')
        .filter(p => !zone.scenes[p.to] || !zone.scenes[p.to].points.some(q => q.id === p.arriveAt)).map(p => p.id);
    assert(`${sid}: las salidas llevan a una parada real de su escena de destino`, !badExits.length, badExits.join(', '));

    const keys = sc.points.flatMap(p => [p.dialogue, ...(p.talk || []).map(t => t.dialogue)]).filter(Boolean);
    const missing = keys.filter(k => !ZAFIAS_DIALOGUES[k]);
    assert(`${sid}: todos los diálogos citados están escritos`, !missing.length, missing.join(', '));
}

const pois = Object.values(zone.scenes).flatMap(sc => sc.points.filter(p => p.kind === 'poi'));
assert('Hay puntos de interés en las tres escenas', Object.values(zone.scenes).every(sc => sc.points.some(p => p.kind === 'poi')));
assert('Los hallazgos con recompensa se marcan para darla una sola vez',
    pois.every(p => (p.talk || []).every(t => !t.reward || (t.set && p.talk.some(o => (o.when || []).includes(t.set))))));

// Retratos de los diálogos (novela visual)
const whos = new Set(Object.values(ZAFIAS_DIALOGUES).flat().map(l => l.who));
assert('Cada retrato asignado existe en el juego (img/portraits)', Object.values(PORTRAITS).every(p => ART.portraits[typeof p === 'string' ? p : p.id]));
assert('Cada retrato es de alguien que habla de verdad en Zafias', Object.keys(PORTRAITS).every(w => whos.has(w)));
assert('Maela, Bram, Grask y el héroe tienen retrato', ['Maela, la posadera', 'Bram, el herrero', 'Grask, jefe goblin', '{heroe}'].every(w => PORTRAITS[w]));

console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);

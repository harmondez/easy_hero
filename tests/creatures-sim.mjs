// =============================================
// 🐺 Criaturas con nombre: se crean bien, cada una pelea como dice su ficha y tiene su dibujo
// =============================================
import { CREATURES } from '../src/data/creatures.js';
import { PATTERNS } from '../src/data/monsters.js';
import { createRpgCreature } from '../src/engine.js';
import { ART } from '../src/data/art.js';
import { monsterArt } from '../src/art.js';

let passed = 0, failed = 0;
function assert(label, cond, detail = '') {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}${detail ? ` → ${detail}` : ''}`); }
}
console.log('\n🐺 Criaturas con nombre');

const all = Object.entries(CREATURES);
const made = Object.fromEntries(all.map(([id, c]) => [id, createRpgCreature(c)]));
assert('Todas se crean con su nombre, vida y daño', all.every(([id, c]) => made[id].name === c.name && made[id].hp > 0 && made[id].atq > 0));
assert('Todas usan un patrón de movimientos que existe', all.every(([, c]) => PATTERNS[c.pattern]));
const noArt = all.filter(([, c]) => !monsterArt(ART, c.name)).map(([id]) => id);
assert('Todas tienen su dibujo en el juego (enemigo_<nombre>)', !noArt.length, noArt.join(', '));
assert('Siempre salen iguales (sin variantes al azar)', all.every(([id, c]) => JSON.stringify(createRpgCreature(c)) === JSON.stringify(made[id])));

const ratio = (a, b, k) => made[a][k] / made[b][k];
assert('El gnoll berserker pega más que el gnoll pero aguanta menos',
    made['gnoll-berserker'].atq > made['gnoll-de-zafias'].atq && made['gnoll-berserker'].hp < made['gnoll-de-zafias'].hp
    && ratio('gnoll-berserker', 'gnoll-de-zafias', 'atq') > ratio('gnoll-berserker', 'gnoll-de-zafias', 'hp'));
assert('El orco guerrero lleva armadura: resiste el daño físico', (made['orco-guerrero'].rules.physResist || 0) >= 0.25);
assert('El orco chamán tiene más daño y más vida que el orco de Zafias',
    made['orco-chaman'].atq > made['orco-de-zafias'].atq && made['orco-chaman'].hp > made['orco-de-zafias'].hp);
assert('Los jefes (Feronius, Gnarok, Guul) son más fuertes que su tropa',
    [['feronius', 'lobo-de-zafias'], ['gnarok', 'gnoll-berserker'], ['guul', 'orco-guerrero']]
        .every(([boss, troop]) => made[boss].hp > made[troop].hp && made[boss].atq > made[troop].atq)
    && made.guul.type === 'boss');

console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);

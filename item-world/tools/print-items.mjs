// =============================================
// 🖨️ print-items.mjs — muestra el contenido del taller y vigila invariantes
// Uso: node item-world/tools/print-items.mjs
//
// No toca nada del juego: solo importa los módulos de item-world y los del juego en LECTURA.
// =============================================
import { RARITIES, RARITY_BY_ID, RARITY_WEIGHTS, rollRarity } from '../src/rarities.js';
import { ITEM_SLOTS, DAMAGE_TYPES, ITEM_BASES, ITEM_BASE_BY_ID, basesBySlot, BASIC_WEAPON_ID } from '../src/items.js';
import { AFFIX_NUMBERS, AFFIX_RULES, AFFIX_UNIQUES, AFFIX_POOL, AFFIX_BY_ID, AFFIX_COUNTS } from '../src/affixes.js';
import { createRpgItem, describeItem, itemPoints, itemPower, ITEM_FLOOR_SCALE } from '../src/fabrication.js';
import { createRng } from '../../src/rng.js';

const KNOWN_HOOKS = ['onCombatStart', 'onAttack', 'onDefend', 'onDamaged', 'onVictory', 'onSkill', 'global'];
const KNOWN_TRAITS = [
    'extra_strike', 'poison_on_hit', 'skill_dmg', 'skill_cd', 'skill_burn', 'defend_heal', 'first_attack_double',
    'revenge', 'combat_start_heal', 'victory_heal', 'damage_type_bonus', 'discard_heal', 'flee_safe',
    'thorns', 'burn_on_hit', 'reader_shield', 'first_turn_focus'
];

let errors = 0;
const fail = msg => { errors++; console.log(`  ❌ ${msg}`); };

console.log('=== 🧰 item-world · validación de contenido ===\n');

// 1) Rarezas
console.log('💎 Rarezas');
const wSum = RARITIES.reduce((s, r) => s + r.weight, 0);
if (wSum !== 100) fail(`las probabilidades suman ${wSum} (debe ser 100)`);
for (let i = 1; i < RARITIES.length; i++) {
    if (RARITIES[i].power <= RARITIES[i - 1].power) fail(`el poder no crece en ${RARITIES[i].id}`);
    if (RARITIES[i].affixes < RARITIES[i - 1].affixes) fail(`los afijos no crecen en ${RARITIES[i].id}`);
    if (!/^#[0-9a-f]{6}$/i.test(RARITIES[i].color)) fail(`color inválido en ${RARITIES[i].id}`);
}
RARITIES.forEach(r => console.log(`  ${r.icon} ${r.id.padEnd(12)} afijos=${r.affixes}${r.unique ? ' +único' : '      '} poder=×${r.power.toFixed(2)} peso=${r.weight}% ${r.color}`));
console.log(`  ${RARITIES.map(r => r.weight).join('+')} = ${wSum}% ✓`);

// 2) Bases (122: 24/30/34/34)
console.log('\n🎒 Bases');
const ids = ITEM_BASES.map(b => b.id);
if (new Set(ids).size !== ids.length) fail('hay ids de base repetidos');
const count = slot => basesBySlot(slot).length;
console.log(`  total=${ITEM_BASES.length}  ⚔️${count('weapon')}  🛡️${count('secondary')}  🧥${count('armor')}  💍${count('accessory')}`);
if (ITEM_BASES.length !== 122) fail(`hay ${ITEM_BASES.length} bases (se esperaban 122)`);
if (count('weapon') !== 24) fail('armas ≠ 24'); if (count('secondary') !== 30) fail('secundarias ≠ 30');
if (count('armor') !== 34) fail('armaduras ≠ 34'); if (count('accessory') !== 34) fail('accesorios ≠ 34');

const weaponTypes = basesBySlot('weapon').map(b => b.damaged);
for (const t of Object.keys(DAMAGE_TYPES)) {
    if (weaponTypes.filter(x => x === t).length < 4) fail(`tipo ${t} con menos de 4 armas (tiene ${weaponTypes.filter(x => x === t).length})`);
}
for (const b of ITEM_BASES) {
    if (b.slot !== 'weapon' && b.damaged) fail(`${b.id}: solo las armas marcan tipo de daño`);
    if (b.slot === 'weapon' && !(b.main.atq >= 1)) fail(`${b.id}: las armas llevan atq`);
    if (b.slot === 'weapon' && !DAMAGE_TYPES[b.damaged]) fail(`${b.id}: tipo de daño desconocido`);
    if ((b.slot === 'armor' || b.slot === 'accessory') && !b.trait) fail(`${b.id}: armaduras/accesorios llevan rasgo`);
    if (b.slot === 'secondary' && !b.main && !b.trait) fail(`${b.id}: secundaria sin main ni rasgo`);
    if (b.trait && !KNOWN_TRAITS.includes(b.trait.k)) fail(`${b.id}: rasgo ${b.trait.k} fuera del glosario`);
}
console.log(`  6 tipos de daño cubiertos por 4 armas cada uno (24 armas) ✓`);

// 3) Afijos
console.log('\n🎲 Afijos');
console.log(`  pool=${AFFIX_POOL.length} (${AFFIX_NUMBERS.length} números + ${AFFIX_RULES.length} reglas) + ${AFFIX_UNIQUES.length} únicos = ${AFFIX_COUNTS.total + AFFIX_UNIQUES.length}`);
if (AFFIX_POOL.length !== 18) fail(`pool de afijos = ${AFFIX_POOL.length} (18)`);
if (AFFIX_UNIQUES.length !== 6) fail(`únicos = ${AFFIX_UNIQUES.length} (6)`);
const aIds = Object.keys(AFFIX_BY_ID);
if (new Set(aIds).size !== aIds.length) fail('ids de afijo repetidos');
for (const a of AFFIX_POOL) {
    if (a.kind === 'number' && !a.stat) fail(`${a.id}: número sin stat`);
    if (a.kind === 'rule' && !KNOWN_HOOKS.includes(a.hook)) fail(`${a.id}: gancho ${a.hook} fuera del contrato`);
}
for (const u of AFFIX_UNIQUES) {
    if (u.rarity !== 'legendaria') fail(`${u.id}: único sin rarity legendaria`);
    if (!KNOWN_HOOKS.includes(u.hook)) fail(`${u.id}: gancho ${u.hook} fuera del contrato`);
}
console.log(`  todos los ganchos de reglas y únicos están en el contrato ✓`);

// 4) Fabricación: invariantes sobre miles de objetos
console.log('\n🏭 Fabricación (6000 objetos con semilla)');
const rng = createRng(20260922);
const raritiesSeen = {};
let repeats = 0, badSlots = 0, badUique = 0;
const floors = [0, 3, 8, 15];
const scalings = [];
for (let i = 0; i < 6000; i++) {
    const floor = floors[i % floors.length];
    const item = createRpgItem({ rng, floor });
    raritiesSeen[item.rarity] = (raritiesSeen[item.rarity] || 0) + 1;
    const affixIds = item.affixes.map(a => a.id);
    if (new Set(affixIds).size !== affixIds.length) repeats++;
    if (item.affixes.length !== RARITY_BY_ID[item.rarity].affixes) badSlots++;
    if (item.rarity === 'legendaria' && !item.unique) badUique++;
    if (item.rarity !== 'legendaria' && item.unique) badUique++;
    // Escalado monótono y determinista: misma base, rareza fija, solo cambia el piso
    if (i < 400) {
        const low = createRpgItem({ rng, floor, baseId: 'espada_sendero', rarityId: 'comun' });
        const high = createRpgItem({ rng, floor: floor + 6, baseId: 'espada_sendero', rarityId: 'comun' });
        scalings.push([floor, high.floor, low.main.atq, high.main.atq, low.power, high.power]);
        if (high.main.atq <= low.main.atq) fail('escalado no monótono en espada_sendero');
        if (high.power <= low.power) fail('poder no monótono con el piso');
    }
}
if (repeats) fail(`${repeats} objetos con afijos repetidos`);
if (badSlots) fail(`${badSlots} objetos con nº de afijos distinto a su rareza`);
if (badUique) fail(`${badUique} objetos con rasgo único mal colocado`);
console.log(`  distribución observada: ${Object.entries(raritiesSeen).map(([k, v]) => `${k}=${(100 * v / 6000).toFixed(1)}%`).join('  ')}  (teórica 50/28/14/6/2)`);
console.log(`  ejemplos de escalado (espada común): ${scalings.slice(0, 4).map(s => `piso ${s[0]}→atq ${s[2]} / piso ${s[1]}→atq ${s[3]}`).join(' · ')}`);
if (!repeats && !badSlots && !badUique) console.log('  ninguno repite afijos; nº de afijos correcto; único solo en legendarias ✓');

// 5) Muestras bonitas
console.log('\n⭐ Muestras');
function show(item) {
    console.log(`  ${item.rarityName} · piso ${item.floor} · ${item.icon} ${item.name}${item.damaged ? ` (${item.damaged})` : ''}`);
    console.log(`     ${describeItem(item).slice(1).map(l => l.replace('· ', '')).join(' · ')}`);
}
const seed = 42;
const r2 = createRng(seed);
show(createRpgItem({ rng: r2, floor: 0, baseId: BASIC_WEAPON_ID }));
for (let i = 0; i < 5; i++) show(createRpgItem({ rng: r2, floor: [1, 4, 7, 12, 15][i] }));

// 6) Cierre
console.log('\n' + '＝'.repeat(46));
if (errors) { console.log(`   ${errors} ERRORES detectados`); process.exit(1); }
console.log('   ✓ Todo el contenido del taller es válido y listo para revisión.');
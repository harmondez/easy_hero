// =============================================
// 🧪 Harness · Fase 1 — Integridad de datos (estático, sin azar, instantáneo)
// Cada línea "BUG ..." es un hallazgo real. "OK ..." confirma una comprobación.
// =============================================
import { RARITIES, RARITY_BY_ID, RARITY_MIN, RARITY_BIAS } from '../../src/data/rarities.js';
import { ITEM_BASES, ITEM_SLOTS, DAMAGE_TYPES } from '../../src/data/items.js';
import { AFFIX_POOL, AFFIX_UNIQUES } from '../../src/data/affixes.js';
import { MONSTER_ROSTER, DEEP_ROSTERS, SUBBOSS_ROSTER, BOSS_DEF, DEEP_BOSSES, ALL_MONSTER_DEFS, PATTERNS, TIER_NAMES } from '../../src/data/monsters.js';
import { MONSTER_ADJECTIVES, MONSTER_LINEAGES } from '../../src/data/variants.js';
import { UPGRADES, UPGRADES_BY_ID, upgradeCost, upgradeMax } from '../../src/data/upgrades.js';
import { RPG_EVENTS, EVENT_MONSTERS } from '../../src/data/events.js';
import { RPG_BALANCE } from '../../src/data/balance.js';

let bugs = 0, checks = 0;
const ok = (label) => { checks++; };
const bug = (label) => { checks++; bugs++; console.log(`BUG ${label}`); };

// --- Rarezas ---
if (RARITIES.reduce((s, r) => s + r.weight, 0) <= 0) bug('rarities: la suma de pesos no es positiva');
else ok();
for (const src of Object.keys(RARITY_BIAS)) {
    if (RARITY_BIAS[src].length !== RARITIES.length) bug(`RARITY_BIAS.${src}: longitud ${RARITY_BIAS[src].length} != ${RARITIES.length} rarezas`);
    if (RARITY_BIAS[src].some(w => !(w > 0))) bug(`RARITY_BIAS.${src}: contiene un peso <= 0 (anularía esa rareza)`);
    checks += 2;
}
for (const [src, min] of Object.entries(RARITY_MIN)) {
    if (!RARITY_BY_ID[min]) bug(`RARITY_MIN.${src} apunta a una rareza inexistente: ${min}`);
    checks++;
}

// --- Bases de objeto ---
const baseIds = new Set();
for (const b of ITEM_BASES) {
    checks++;
    if (baseIds.has(b.id)) bug(`ITEM_BASES: id duplicado "${b.id}"`); else baseIds.add(b.id);
    if (!ITEM_SLOTS[b.slot]) bug(`ITEM_BASES[${b.id}]: ranura desconocida "${b.slot}"`);
    if (b.damaged && !DAMAGE_TYPES[b.damaged]) bug(`ITEM_BASES[${b.id}]: tipo de daño desconocido "${b.damaged}"`);
}
if (ITEM_SLOTS.weapon && !ITEM_BASES.some(b => b.slot === 'weapon')) bug('No hay ninguna base de arma');
console.log(`OK bases de objeto: ${ITEM_BASES.length} revisadas`);

// --- Afijos ---
const affixIds = new Set();
for (const a of AFFIX_POOL) {
    checks++;
    if (affixIds.has(a.id)) bug(`AFFIX_POOL: id duplicado "${a.id}"`); else affixIds.add(a.id);
}
for (const u of AFFIX_UNIQUES) {
    checks++;
    if (affixIds.has(u.id)) bug(`AFFIX_UNIQUES: id "${u.id}" choca con AFFIX_POOL`);
}
console.log(`OK afijos: ${AFFIX_POOL.length} normales + ${AFFIX_UNIQUES.length} únicos`);

// --- Monstruos: nombres e iconos únicos dentro de cada elenco jugable ---
const nameSet = new Set(), iconSet = new Set();
for (const m of ALL_MONSTER_DEFS) {
    checks += 2;
    if (nameSet.has(m.name)) bug(`Monstruo con nombre duplicado: "${m.name}"`); else nameSet.add(m.name);
    if (!PATTERNS[Object.keys(PATTERNS).find(k => PATTERNS[k] === m.pattern)] && !Array.isArray(m.pattern)) bug(`"${m.name}": patrón inválido`);
}
// Los iconos SÍ pueden repetirse entre tramos distintos (no compiten en pantalla a la vez), pero no dentro del mismo tramo
for (const roster of [MONSTER_ROSTER, ...DEEP_ROSTERS]) {
    const icons = new Set();
    for (const m of roster) {
        checks++;
        if (icons.has(m.icon)) bug(`Icono repetido dentro del mismo elenco: ${m.icon} (${m.name})`); else icons.add(m.icon);
    }
}
if (DEEP_BOSSES.length < 1) bug('No hay jefes de profundidad definidos');
if (TIER_NAMES.length < DEEP_ROSTERS.length + 1) bug(`TIER_NAMES (${TIER_NAMES.length}) no cubre todos los elencos (${DEEP_ROSTERS.length + 1})`);
checks += 2;
console.log(`OK monstruos: ${ALL_MONSTER_DEFS.length} normales, ${SUBBOSS_ROSTER.length} sub-jefes, 1+${DEEP_BOSSES.length} jefes`);

// El daño máximo de un patrón no debería disparar el "no pega más de X" que se promete en planning.md
for (const roster of [MONSTER_ROSTER, ...DEEP_ROSTERS]) {
    for (const m of roster) {
        const maxHit = Math.max(0, ...m.pattern.filter(p => p.k === 'attack').map(p => p.m || 1));
        checks++;
        if (maxHit > 3.5) bug(`"${m.name}": multiplicador de golpe ${maxHit} > 3.5 (fuera de lo documentado en planning.md)`);
    }
}

// --- Variantes ---
const varIds = new Set();
for (const v of [...MONSTER_ADJECTIVES, ...MONSTER_LINEAGES]) {
    checks++;
    if (varIds.has(v.id)) bug(`Variante con id duplicado: "${v.id}"`); else varIds.add(v.id);
    checks++;
    if (!v.name || !v.desc) bug(`Variante "${v.id}": falta name o desc`);
    // Sanidad de multiplicadores: no deberían ser <=0 (dejarían el monstruo en 0 HP o daño negativo)
    for (const k of ['atkMul', 'hpMul', 'goldMul', 'xpMul']) {
        if (v[k] != null) { checks++; if (!(v[k] > 0)) bug(`Variante "${v.id}".${k} = ${v[k]} (debe ser > 0)`); }
    }
}
console.log(`OK variantes: ${MONSTER_ADJECTIVES.length} adjetivos + ${MONSTER_LINEAGES.length} linajes`);

// --- La Forja ---
const upIds = new Set();
for (const u of UPGRADES) {
    checks++;
    if (upIds.has(u.id)) bug(`UPGRADES: id duplicado "${u.id}"`); else upIds.add(u.id);
    checks++;
    if (!(u.cost > 0)) bug(`UPGRADES[${u.id}]: coste base no positivo (${u.cost})`);
    if (u.growth != null) { checks++; if (!(u.growth >= 1)) bug(`UPGRADES[${u.id}]: growth ${u.growth} < 1 (el precio bajaría o se quedaría igual)`); }
    // El coste debe ser estrictamente creciente en los primeros 20 niveles (si no está topada)
    if (upgradeMax(u) > 1) {
        let prev = upgradeCost(u, 0);
        for (let lvl = 1; lvl < 20; lvl++) {
            const c = upgradeCost(u, lvl);
            checks++;
            if (c <= prev) { bug(`UPGRADES[${u.id}]: el coste no crece en el nivel ${lvl} (${prev} → ${c})`); break; }
            prev = c;
        }
    }
}
console.log(`OK La Forja: ${UPGRADES.length} mejoras`);

// --- Eventos ---
const evIds = new Set();
for (const e of RPG_EVENTS) {
    checks++;
    if (evIds.has(e.id)) bug(`RPG_EVENTS: id duplicado "${e.id}"`); else evIds.add(e.id);
}
console.log(`OK eventos: ${RPG_EVENTS.length}`);

// --- Balance: sanity de todos los números usados por el motor ---
if (!(RPG_BALANCE.depth.tierMul > 1)) bug(`depth.tierMul (${RPG_BALANCE.depth.tierMul}) debería ser > 1 para que el descenso escale`);
if (!(RPG_BALANCE.loot.combatDropChance >= 0 && RPG_BALANCE.loot.combatDropChance <= 1)) bug('loot.combatDropChance fuera de [0,1]');
checks += 2;
console.log(`OK balance: tierMul=${RPG_BALANCE.depth.tierMul}, combatDropChance=${RPG_BALANCE.loot.combatDropChance}`);

console.log(`\nSUMMARY fase1: ${checks} comprobaciones, ${bugs} bugs`);
process.exit(bugs > 0 ? 1 : 0);

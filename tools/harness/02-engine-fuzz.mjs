// =============================================
// 🧪 Harness · Fase 2 — Fuzzing del motor puro (mapas, monstruos, combate)
// Miles de semillas aleatorias contra invariantes del motor. "BUG ..." = hallazgo.
// =============================================
import {
    generateRpgMap, rpgAvailableNodes, RPG_MAP_CONFIG, RPG_NODE_TYPES,
    createRpgMonster, pickMonsterVariants, rpgMonsterStats, rpgAbsoluteFloor,
    createRpgHero, createRpgCombat, rpgCombatAction, rpgIntentView, refreshPrimaryStats,
    RPG_COMBAT_TYPES
} from '../../src/engine.js';
import { createRng } from '../../src/rng.js';
import { equipItem, createRpgItem } from '../../src/items.js';
import { MONSTER_ADJECTIVES, MONSTER_LINEAGES } from '../../src/data/variants.js';

let bugs = 0, checks = 0;
const bug = (label) => { checks++; bugs++; console.log(`BUG ${label}`); };
const pass = () => { checks++; };
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

// --- Generación de mapas: 300 semillas × tramos 0,1,2,5 ---
const N_MAPS = 300;
let mapSig = new Map(); // primeras 5 semillas: comprobar determinismo re-generando
for (const tier of [0, 1, 2, 5]) {
    for (let s = 1; s <= N_MAPS; s++) {
        let map;
        try { map = generateRpgMap(createRng(s), RPG_MAP_CONFIG, tier); }
        catch (e) { bug(`generateRpgMap(seed=${s}, tier=${tier}) lanzó: ${e.message}`); continue; }
        pass();
        const bosses = map.nodes.filter(n => n.type === 'boss');
        if (bosses.length !== 1) bug(`mapa seed=${s} tier=${tier}: ${bosses.length} nodos de jefe (debería ser 1)`);
        pass();
        if (map.tier !== tier) bug(`mapa seed=${s} tier=${tier}: map.tier quedó en ${map.tier}`);
        pass();
        // Conectividad: todo nodo debe ser alcanzable desde algún inicio, siguiendo `next`
        const byId = new Map(map.nodes.map(n => [n.id, n]));
        const reach = new Set(map.startIds);
        const stack = [...map.startIds];
        while (stack.length) { const n = byId.get(stack.pop()); for (const id of n.next) if (!reach.has(id)) { reach.add(id); stack.push(id); } }
        pass();
        if (reach.size !== map.nodes.length) bug(`mapa seed=${s} tier=${tier}: ${map.nodes.length - reach.size} nodos inalcanzables desde el inicio`);
        // Cada tipo de nodo debe ser uno de los conocidos
        pass();
        if (map.nodes.some(n => !RPG_NODE_TYPES[n.type])) bug(`mapa seed=${s} tier=${tier}: nodo con tipo desconocido`);
        // rpgAvailableNodes no debe reventar con ids raros
        pass();
        try { rpgAvailableNodes(map, 'nodo-inexistente', false); rpgAvailableNodes(map, null, true); rpgAvailableNodes(null, null); }
        catch (e) { bug(`rpgAvailableNodes con entradas raras lanzó: ${e.message}`); }
        if (s <= 5) mapSig.set(`${tier}:${s}`, JSON.stringify(map));
    }
}
// Determinismo: regenerar las mismas 5 semillas por tramo debe dar el mismo JSON
for (const [key, sig] of mapSig) {
    const [tier, s] = key.split(':').map(Number);
    const again = JSON.stringify(generateRpgMap(createRng(s), RPG_MAP_CONFIG, tier));
    pass();
    if (again !== sig) bug(`mapa seed=${s} tier=${tier}: no determinista (misma semilla, mapa distinto)`);
}
console.log(`OK mapas: ${N_MAPS} semillas × 4 tramos`);

// --- Monstruos: todas las combinaciones tipo × tramo(0-8) × variantes, estadísticas finitas ---
const allVariantIds = [null, ...MONSTER_ADJECTIVES.map(v => v.id)];
const allLinIds = [null, ...MONSTER_LINEAGES.map(v => v.id)];
for (const type of ['monster', 'subboss', 'boss']) {
    for (let tier = 0; tier <= 8; tier++) {
        for (const floor of [0, 3, 7, 15]) {
            for (const adj of allVariantIds) {
                for (const lin of allLinIds) {
                    let m;
                    try { m = createRpgMonster(type, floor, tier, (adj || lin) ? { adj, lin } : null); }
                    catch (e) { bug(`createRpgMonster(${type},${floor},${tier},{${adj},${lin}}) lanzó: ${e.message}`); continue; }
                    pass();
                    if (!finite(m.atq) || m.atq <= 0) bug(`${type} tier${tier} piso${floor} adj=${adj} lin=${lin}: ATK inválido ${m.atq}`);
                    pass();
                    if (!finite(m.hp) || m.hp <= 0) bug(`${type} tier${tier} piso${floor} adj=${adj} lin=${lin}: HP inválido ${m.hp}`);
                    pass();
                    if (!m.name) bug(`${type} tier${tier} piso${floor} adj=${adj} lin=${lin}: sin nombre`);
                    pass();
                    if (!Array.isArray(m.pattern) || !m.pattern.length) bug(`${type} tier${tier} piso${floor} adj=${adj} lin=${lin}: patrón vacío`);
                }
            }
        }
    }
}
console.log(`OK monstruos: tipos × tramos 0-8 × 4 pisos × ${allVariantIds.length}×${allLinIds.length} combinaciones de variante`);

// Determinismo de pickMonsterVariants + respeta "sin variantes en el grupo fácil del tramo 0"
for (let s = 1; s <= 500; s++) {
    const nodeId = `rpg_${s % 16}_${s % 7}`;
    const a = pickMonsterVariants(s, nodeId, s % 6, s % 16);
    const b = pickMonsterVariants(s, nodeId, s % 6, s % 16);
    pass();
    if (JSON.stringify(a) !== JSON.stringify(b)) bug(`pickMonsterVariants no determinista para seed=${s} node=${nodeId}`);
    pass();
    if (s % 6 === 0 && (s % 16) < 3 && (a.adj || a.lin)) bug(`pickMonsterVariants dio variante en tramo0/grupo-fácil (seed=${s}, floor=${s % 16})`);
}
console.log('OK pickMonsterVariants: determinismo y regla de grupo fácil (500 semillas)');

// --- Combate: miles de partidas aleatorias contra invariantes básicos ---
const ACTIONS = ['attack', 'defend', 'skill', 'flee'];
let longestCombat = 0, timeouts = 0, combatsRun = 0;
for (let s = 1; s <= 800; s++) {
    const rng = createRng(s * 7919 + 1);
    const hero = createRpgHero();
    // arma/variantes aleatorias para forzar todas las ramas de daño elemental/físico y resistencias
    if (rng() < 0.5) { try { equipItem(hero, createRpgItem({ rng, floor: s % 40, rarityId: ['comun', 'rara', 'legendaria'][s % 3] })); } catch { /* ver abajo */ } }
    refreshPrimaryStats(hero);
    const tier = s % 7;
    const adjPool = [null, ...MONSTER_ADJECTIVES.map(v => v.id)];
    const linPool = [null, ...MONSTER_LINEAGES.map(v => v.id)];
    const variants = { adj: adjPool[s % adjPool.length], lin: linPool[(s * 3) % linPool.length] };
    const type = RPG_COMBAT_TYPES[s % 3];
    const monster = createRpgMonster(type, s % 16, tier, variants);
    let combat;
    try { combat = createRpgCombat(hero, monster, rng); }
    catch (e) { bug(`createRpgCombat lanzó (seed=${s}): ${e.message}`); continue; }
    combatsRun++;
    let rounds = 0, over = false;
    while (!over && rounds < 300) {
        rounds++;
        const action = ACTIONS[Math.floor(rng() * ACTIONS.length)];
        let res;
        try { res = rpgCombatAction(combat, action); }
        catch (e) { bug(`rpgCombatAction lanzó en la ronda ${rounds} (seed=${s}, adj=${variants.adj}, lin=${variants.lin}): ${e.message}`); break; }
        pass();
        if (combat.hero.hp < 0) bug(`héroe con HP negativo (${combat.hero.hp}) seed=${s} ronda=${rounds}`);
        pass();
        if (combat.monster.hp < 0) bug(`monstruo con HP negativo (${combat.monster.hp}) seed=${s} ronda=${rounds}`);
        pass();
        try { rpgIntentView(combat.monster); } catch (e) { bug(`rpgIntentView lanzó (seed=${s}): ${e.message}`); }
        over = res.over || combat.over;
    }
    longestCombat = Math.max(longestCombat, rounds);
    pass();
    if (!over) { timeouts++; bug(`combate no terminó en 300 rondas (seed=${s}, tipo=${type}, tier=${tier}, adj=${variants.adj}, lin=${variants.lin})`); }
}
console.log(`OK combate: ${combatsRun} combates aleatorios simulados, ronda más larga=${longestCombat}, ${timeouts} sin terminar`);

console.log(`\nSUMMARY fase2: ${checks} comprobaciones, ${bugs} bugs`);
process.exit(bugs > 0 ? 1 : 0);

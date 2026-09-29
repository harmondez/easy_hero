// =============================================
// 🧪 Harness · Fase 5 — Guardado/restauración: cientos de partidas a medias,
// en distintos puntos (mapa, combate con variantes, evento, botín, tramos > 0),
// guardadas y restauradas, comprobando que no se pierde ni se rompe nada.
// =============================================
import {
    generateRpgMap, RPG_MAP_CONFIG, createRpgHero, createRpgMonster, createRpgCombat,
    rpgCombatAction, pickMonsterVariants, rpgAvailableNodes
} from '../../src/engine.js';
import * as Events from '../../src/events.js';
import { rollLootDrop } from '../../src/items.js';
import { createRng } from '../../src/rng.js';
import { snapshotRun, restoreRun } from '../../src/save.js';

let bugs = 0, checks = 0;
const bug = (label) => { checks++; bugs++; console.log(`BUG ${label}`); };
const pass = () => { checks++; };

function buildRpgState(seed) {
    const rng = createRng(seed);
    const tier = seed % 5;
    const hero = createRpgHero();
    const map = generateRpgMap(rng, RPG_MAP_CONFIG, tier);
    const start = map.startIds[Math.floor(rng() * map.startIds.length)];
    const byId = new Map(map.nodes.map(n => [n.id, n]));
    const rpg = {
        seed, rng, tier, hero, map,
        currentId: start, visitedIds: [start],
        usedEvents: [], skipNext: seed % 4 === 0,
        stats: { combatsWon: seed % 3, events: [], campfires: seed % 2, chests: seed % 5, discarded: 0, equipped: 0, fled: 0 },
        log: [{ msg: 'inicio', type: 'system' }],
        combatMenu: 'main', pendingNodeId: null, eventCombat: null, combatResult: null, loot: null,
        combat: null, event: null
    };
    const mode = seed % 4;
    if (mode === 1) {
        // A media de un combate, con variante (para forzar heroStatus con datos reales)
        const variants = pickMonsterVariants(seed, start, tier, byId.get(start).floor);
        const m = createRpgMonster('monster', byId.get(start).floor, tier, variants);
        rpg.combat = createRpgCombat(hero, m, rng);
        rpgCombatAction(rpg.combat, 'attack');
        if (!rpg.combat.over) rpgCombatAction(rpg.combat, 'defend');
    } else if (mode === 2) {
        // A medio evento
        const evId = Events.RPG_EVENTS[seed % Events.RPG_EVENTS.length].id;
        const session = Events.startRpgEvent(evId, rng, byId.get(start).floor);
        rpg.event = { node: byId.get(start), session, result: null, view: null };
    } else if (mode === 3) {
        // Con botín pendiente (el nuevo formato de un solo objeto)
        const item = rollLootDrop({ rng, floor: byId.get(start).floor, source: 'chest', hero });
        rpg.loot = { source: 'chest', floor: byId.get(start).floor, offers: [item], selected: 0 };
    }
    return rpg;
}

const N = 400;
for (let s = 1; s <= N; s++) {
    let rpg;
    try { rpg = buildRpgState(s); }
    catch (e) { bug(`buildRpgState(seed=${s}) lanzó: ${e.message}`); continue; }
    pass();

    let snap;
    try { snap = JSON.parse(JSON.stringify(snapshotRun(rpg))); }
    catch (e) { bug(`snapshotRun(seed=${s}) lanzó o no serializa: ${e.message}`); continue; }
    pass();
    if (!snap) { bug(`snapshotRun(seed=${s}) devolvió null para una partida válida`); continue; }

    let back;
    try { back = restoreRun(snap); }
    catch (e) { bug(`restoreRun(seed=${s}) lanzó: ${e.message}`); continue; }
    pass();
    if (!back) { bug(`restoreRun(seed=${s}) devolvió null para un guardado propio válido`); continue; }

    pass();
    if (back.tier !== rpg.tier) bug(`seed=${s}: el tramo no sobrevive (${rpg.tier} → ${back.tier})`);
    pass();
    if (JSON.stringify(back.hero) !== JSON.stringify(rpg.hero)) bug(`seed=${s}: el héroe cambia al restaurar`);
    pass();
    if (back.currentId !== rpg.currentId) bug(`seed=${s}: la posición cambia al restaurar`);

    if (rpg.combat) {
        pass();
        if (!back.combat) bug(`seed=${s}: el combate a medias se perdió al restaurar`);
        else {
            pass();
            if (back.combat.hero !== back.hero) bug(`seed=${s}: el combate restaurado no apunta al héroe restaurado (referencias rotas)`);
            pass();
            if (JSON.stringify(back.combat.heroStatus) !== JSON.stringify(rpg.combat.heroStatus)) bug(`seed=${s}: heroStatus del combate no sobrevive al guardado`);
            pass();
            // El combate debe poder seguir jugándose sin lanzar
            try { rpgCombatAction(back.combat, 'attack'); } catch (e) { bug(`seed=${s}: el combate restaurado no se puede seguir jugando: ${e.message}`); }
        }
    }
    if (rpg.loot) {
        pass();
        if (!back.loot || JSON.stringify(back.loot) !== JSON.stringify(rpg.loot)) bug(`seed=${s}: el botín pendiente no sobrevive igual al guardado`);
    }
    if (rpg.event) {
        pass();
        if (!back.event) bug(`seed=${s}: el evento a medias se perdió al restaurar`);
    }

    // rpgAvailableNodes sobre el estado restaurado no debe lanzar
    pass();
    try { rpgAvailableNodes(back.map, back.currentId, false); } catch (e) { bug(`seed=${s}: rpgAvailableNodes sobre el mapa restaurado lanzó: ${e.message}`); }
}
console.log(`OK guardado/restauración: ${N} partidas a medias (mapa, combate con variantes, evento, botín)`);

console.log(`\nSUMMARY fase5: ${checks} comprobaciones, ${bugs} bugs`);
process.exit(bugs > 0 ? 1 : 0);

// =============================================
// 💾 RPG-pack — guardado y retomar partida (src/save.js, puro: usa un almacenamiento falso)
// =============================================
import {
    createRpgHero, createRpgCombat, rpgCombatAction, generateRpgMap, createRpgMonster
} from '../src/engine.js';
import { startRpgEvent, resolveRpgEventChoice, rpgEventScreen, createEventMonster, pickRpgEvent } from '../src/events.js';
import { createRng, newSeed } from '../src/rng.js';
import { snapshotRun, restoreRun, saveRun, loadRun, clearRun, peekRun, SAVE_KEY, SAVE_VERSION } from '../src/save.js';
import { playRun } from '../tools/sim.mjs';

let passed = 0;
let failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}

// Almacenamiento falso (como localStorage)
function fakeStorage(opts = {}) {
    const data = new Map();
    return {
        data,
        getItem: k => (data.has(k) ? data.get(k) : null),
        setItem: (k, v) => { if (opts.throwOnSet) throw new Error('QuotaExceededError'); data.set(k, String(v)); },
        removeItem: k => data.delete(k)
    };
}

/** Una partida a medias, como la que tendría main.js. */
function midRun(seed = 1234) {
    const rng = createRng(seed);
    const map = generateRpgMap(rng);
    const hero = createRpgHero();
    hero.hp = 17; hero.maxHp = 33; hero.atq = 4; hero.level = 4;
    hero.vows = { noFlee: true };
    hero.skillMods = { fire_strike: { damage: 3, cooldown: -1 } };
    hero.affinity = { guerrero: 2, picaro: 0, elementalista: 1 };
    return {
        seed, rng, hero, map,
        currentId: map.nodes.find(n => n.floor === 3).id,
        visitedIds: [map.startIds[0]],
        usedEvents: ['pozo_deseos', 'lector'],
        skipNext: true,
        stats: { combatsWon: 3, events: ['pozo_deseos'], campfires: 1, chests: 1 },
        log: [{ msg: 'Hola', type: 'system' }],
        combatMenu: 'main', combatResult: null, pendingNodeId: null, eventCombat: null,
        combat: null, event: null
    };
}

console.log('\n📸 Instantánea de la partida');
{
    const r = midRun();
    const snap = snapshotRun(r);
    assert('la instantánea es texto guardable (JSON)', typeof JSON.stringify(snap) === 'string' && snap.v === SAVE_VERSION);
    assert('no se puede guardar sin partida', snapshotRun(null) === null && snapshotRun({ hero: null }) === null);
    assert('la instantánea no contiene funciones (el generador se guarda como número)', !JSON.stringify(snap).includes('function') && typeof snap.rngState === 'number');

    const back = restoreRun(JSON.parse(JSON.stringify(snap)));
    assert('se restaura el héroe entero: vida, ATK, votos, mejoras y afinidades', JSON.stringify(back.hero) === JSON.stringify(r.hero));
    assert('se restaura el mapa idéntico', JSON.stringify(back.map) === JSON.stringify(r.map));
    assert('se restaura la posición, lo visitado, los eventos vistos y el salto pendiente',
        back.currentId === r.currentId && JSON.stringify(back.visitedIds) === JSON.stringify(r.visitedIds)
        && JSON.stringify(back.usedEvents) === JSON.stringify(r.usedEvents) && back.skipNext === true);
    assert('se restauran las estadísticas y el diario', JSON.stringify(back.stats) === JSON.stringify(r.stats) && back.log[0].msg === 'Hola');
    assert('se restaura la semilla', back.seed === 1234);
    const next5 = Array.from({ length: 5 }, r.rng);
    assert('el generador aleatorio continúa EXACTAMENTE donde estaba', Array.from({ length: 5 }, back.rng).join() === next5.join());
}

console.log('\n⚔️ Un combate a medias');
{
    const r = midRun(77);
    r.hero.hp = r.hero.maxHp = 60; r.hero.vows = {};
    const monster = createEventMonster('lector', r.hero, 6, 1);
    r.combat = createRpgCombat(r.hero, monster, r.rng);
    rpgCombatAction(r.combat, 'attack');
    rpgCombatAction(r.combat, 'defend');
    const back = restoreRun(JSON.parse(JSON.stringify(snapshotRun(r))));
    assert('el combate se restaura con su ronda, enfriamientos y última acción',
        back.combat.turn === r.combat.turn && back.combat.lastAction === 'defend' && JSON.stringify(back.combat.cooldowns) === JSON.stringify(r.combat.cooldowns));
    assert('la intención del enemigo (lo que va a hacer) también se restaura', JSON.stringify(back.combat.monster.intent) === JSON.stringify(r.combat.monster.intent));
    assert('el héroe del combate es el MISMO objeto que el de la partida (no una copia)', back.combat.hero === back.hero);
    assert('el combate recupera el generador de la partida', typeof back.combat.rng === 'function');

    // Seguir jugando desde el guardado da lo mismo que seguir sin haber guardado
    const actions = ['attack', 'attack', 'defend', 'skill', 'attack', 'attack'];
    for (const a of actions) { rpgCombatAction(r.combat, a); rpgCombatAction(back.combat, a); }
    assert('seguir desde el guardado da EXACTAMENTE el mismo resultado que no haber guardado',
        back.combat.hero.hp === r.combat.hero.hp && back.combat.monster.hp === r.combat.monster.hp && back.combat.turn === r.combat.turn);
}

console.log('\n🎲 Un evento a medias');
{
    const r = midRun(88);
    const node = r.map.nodes.find(n => n.type === 'event') || r.map.nodes[10];
    const session = startRpgEvent('lector', r.rng, node.floor);
    r.event = { node, session, result: null, view: null };
    resolveRpgEventChoice(session, 0, r.hero, r.rng); // «Plantarle cara» → primera pregunta
    const back = restoreRun(JSON.parse(JSON.stringify(snapshotRun(r))));
    assert('el evento se restaura en su misma pantalla con sus preguntas', back.event.session.screen === 'q' && back.event.session.state.qs.length === 3);
    assert('el nodo del evento es el mismo objeto del mapa restaurado', back.event.node === back.map.nodes.find(n => n.id === node.id));
    assert('la pantalla que se ve es idéntica antes y después de guardar',
        JSON.stringify(rpgEventScreen(back.event.session)) === JSON.stringify(rpgEventScreen(session)));
    // Responder todo igual en las dos versiones
    for (let i = 0; i < 3; i++) {
        resolveRpgEventChoice(session, 0, r.hero, r.rng);
        resolveRpgEventChoice(back.event.session, 0, back.hero, back.rng);
    }
    assert('terminar el evento desde el guardado da el mismo resultado', JSON.stringify(back.hero) === JSON.stringify(r.hero));

    // Resultado ya mostrado
    const r2 = midRun(5);
    const s2 = startRpgEvent('pozo_deseos', r2.rng, 4);
    const res = resolveRpgEventChoice(s2, 1, r2.hero, r2.rng);
    r2.event = { node: r2.map.nodes[8], session: s2, result: res, view: { icon: '⛲', title: 'El pozo', lines: res.lines, changes: res.changes, button: 'CONTINUAR LA RUTA' } };
    const back2 = restoreRun(JSON.parse(JSON.stringify(snapshotRun(r2))));
    assert('un evento ya resuelto conserva lo que se mostraba (texto, cambios y botón)',
        back2.event.result.ok && back2.event.view.button === 'CONTINUAR LA RUTA' && back2.event.view.changes.length === res.changes.length);
    // Combate de evento pendiente
    const r3 = midRun(6);
    r3.eventCombat = { monster: 'reflejo', onWin: { atq: 1, maxHp: 5 }, onWinText: 'Fin' };
    r3.combatResult = { result: 'victory', title: '¡Victoria!', detail: 'x', button: 'CONTINUAR LA RUTA' };
    const back3 = restoreRun(JSON.parse(JSON.stringify(snapshotRun(r3))));
    assert('se conservan el combate de evento pendiente y el panel de resultado', back3.eventCombat.onWin.maxHp === 5 && back3.combatResult.title === '¡Victoria!');
}

console.log('\n🗄️ Almacenamiento');
{
    const st = fakeStorage();
    const r = midRun();
    assert('sin nada guardado no hay partida que retomar', peekRun(st) === null && loadRun(st) === null);
    assert('se guarda la partida', saveRun(st, r) === true && st.data.has(SAVE_KEY));
    const peek = peekRun(st);
    assert('peekRun resume la partida sin cargarla: piso, vida y semilla', peek.floor === 4 && peek.hp === 17 && peek.maxHp === 33 && peek.seed === 1234 && peek.floors === 15);
    assert('se puede cargar la partida guardada', loadRun(st).hero.hp === 17);
    clearRun(st);
    assert('borrar deja el almacenamiento vacío', !st.data.has(SAVE_KEY) && loadRun(st) === null);

    // Robustez
    assert('un almacenamiento lleno no rompe el juego: devuelve false', saveRun(fakeStorage({ throwOnSet: true }), r) === false);
    assert('sin almacenamiento (modo privado) tampoco se rompe nada', saveRun(null, r) === false && loadRun(null) === null && peekRun(null) === null);
    st.data.set(SAVE_KEY, '{esto no es json');
    assert('un guardado dañado se descarta sin lanzar errores', loadRun(st) === null && peekRun(st).outdated === true);
    st.data.set(SAVE_KEY, JSON.stringify({ ...snapshotRun(r), v: SAVE_VERSION + 1 }));
    assert('un guardado de otra versión se descarta y se avisa (outdated)', loadRun(st) === null && peekRun(st).outdated === true);
    st.data.set(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, hero: { hp: 'x' }, map: { nodes: [] }, seed: 1 }));
    assert('un guardado con datos absurdos se descarta', loadRun(st) === null);
    st.data.set(SAVE_KEY, JSON.stringify({ ...snapshotRun(r), event: { nodeId: 'no_existe', session: {} } }));
    assert('un guardado que apunta a un nodo inexistente se descarta', loadRun(st) === null);
    assert('restoreRun(null) y restoreRun({}) no lanzan', restoreRun(null) === null && restoreRun({}) === null);
}

console.log('\n🔁 La misma semilla, la misma partida');
{
    const strip = r => JSON.stringify({ ...r, hero: undefined });
    assert('dos partidas con la misma semilla y el mismo bot son idénticas (15 semillas)', (() => {
        for (let sd = 1; sd <= 15; sd++) {
            if (strip(playRun('sensato', sd)) !== strip(playRun('sensato', sd))) return false;
            if (JSON.stringify(playRun('experto', sd).hero) !== JSON.stringify(playRun('experto', sd).hero)) return false;
        }
        return true;
    })());
    assert('semillas distintas dan partidas distintas', strip(playRun('torpe', 1)) !== strip(playRun('torpe', 2)) || strip(playRun('torpe', 3)) !== strip(playRun('torpe', 4)));
    assert('el sorteo de eventos es repetible con la misma semilla', (() => {
        const a = createRng(9), b = createRng(9), used = [];
        for (let i = 0; i < 10; i++) { const x = pickRpgEvent(used, 4, a); used.push(x); if (x !== pickRpgEvent(used.slice(0, -1), 4, b)) return false; }
        return true;
    })());
    assert('el resultado de un evento con azar depende solo de la semilla', (() => {
        const run = seed => { const rng = createRng(seed), h = createRpgHero(); h.hp = 20; const s = startRpgEvent('alquimista_errante', rng, 4); resolveRpgEventChoice(s, 0, h, rng); return JSON.stringify(h); };
        return run(3) === run(3);
    })());
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

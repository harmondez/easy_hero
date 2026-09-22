// =============================================
// 🗡️ RPG-pack — héroe, escala de monstruos, mapa y combate (src/engine.js, puro)
// =============================================
import {
    RPG_HERO_BASE, RPG_NODE_TYPES, RPG_MAP_CONFIG,
    createRpgHero, rpgMonsterStats, generateRpgMap, rpgAvailableNodes,
    createRpgMonster, createRpgCombat, rpgCombatAction, rpgSkillReady, rpgCanFlee,
    rpgVictoryReward, applyRpgReward, RPG_MIN_EVENTS_PER_ROUTE, RPG_MIN_CAMPFIRES_PER_ROUTE,
    rpgIntentView, rpgAttackPreview, rpgIncomingPreview
} from '../src/engine.js';
import { RPG_BALANCE } from '../src/data/balance.js';
import { createRng, newSeed, seedToCode, codeToSeed } from '../src/rng.js';
import { MONSTER_ROSTER, SUBBOSS_ROSTER, BOSS_DEF, atk, heal, CHARGE, GUARD, REST } from '../src/data/monsters.js';

let passed = 0;
let failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}

function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

console.log('\n🗡️ Héroe y monstruos (escala propia del RPG)');
const hero = createRpgHero();
assert('el héroe empieza con ATK 1 / HP 25', hero.atq === 1 && hero.hp === 25);
assert('maxHp = HP inicial y nivel 1', hero.maxHp === 25 && hero.level === 1);
assert('createRpgHero devuelve una copia (no muta la base)', (hero.atq = 99, RPG_HERO_BASE.atq === 0));
hero.atq = 1;
assert('el héroe solo tiene ATK, HP y guardia como atributos (sin DEF) más equipo, inventario, votos, mejoras y afinidades', (() => {
    const h = createRpgHero();
    const keys = Object.keys(h).sort().join(',');
    return keys === 'affinity,atq,color,equipment,guard,hp,icon,inventory,level,maxHp,name,skillMods,trophy,vows'
        && h.guard === 0 && h.inventory.length === 0 && h.trophy === null
        && h.equipment.weapon.baseId === 'espada_sendero' && !h.equipment.secondary && !h.equipment.armor && !h.equipment.accessory
        && Object.keys(h.vows).length === 0 && Object.keys(h.skillMods).length === 0
        && Object.values(h.affinity).every(v => v === 0);
})());
assert('todas las partidas empiezan con el mismo héroe', JSON.stringify(createRpgHero()) === JSON.stringify(createRpgHero()));

const m0 = rpgMonsterStats('monster', 0);
assert('el primer monstruo es más débil que el héroe inicial', m0.atq <= 1 && m0.hp < 25);
let monotone = true;
for (let f = 1; f <= 8; f++) {
    const prev = rpgMonsterStats('monster', f - 1);
    const cur = rpgMonsterStats('monster', f);
    if (cur.hp < prev.hp || cur.atq < prev.atq) monotone = false;
}
assert('los monstruos nunca se debilitan al subir de piso', monotone);
const hi = rpgMonsterStats('monster', 8);
assert('el monstruo del piso 8 supera al del piso 0 en todo', hi.atq > m0.atq && hi.hp > m0.hp);
const sb = rpgMonsterStats('subboss', 5);
const mo = rpgMonsterStats('monster', 5);
assert('un sub-jefe es más fuerte que un monstruo del mismo piso', sb.atq > mo.atq && sb.hp > mo.hp);
const bo = rpgMonsterStats('boss', RPG_MAP_CONFIG.floors - 1);
const sbLate = rpgMonsterStats('subboss', RPG_MAP_CONFIG.floors - 2);
assert('el jefe final es más fuerte que cualquier sub-jefe', bo.atq > sbLate.atq && bo.hp > sbLate.hp);
assert('piso negativo/decimal no rompe la escala', rpgMonsterStats('monster', -3).hp === 6 && Number.isInteger(rpgMonsterStats('monster', 2.7).hp));

console.log('\n⚔️ Combate por turnos');
{
    const fresh = (type = 'monster', floor = 0) => {
        const h = createRpgHero();
        return createRpgCombat(h, createRpgMonster(type, floor));
    };
    // Monstruo de prueba: golpea siempre con su ATK (para probar reglas del héroe sin depender de patrones)
    const plain = (atq, hp) => ({ type: 'monster', floor: 0, name: 'Muñeco', icon: '🧪', color: '#888', atq, hp, maxHp: hp, pattern: [{ k: 'attack', m: 1 }] });
    const freshPlain = (atq, hp) => createRpgCombat(createRpgHero(), plain(atq, hp));

    const mon = createRpgMonster('monster', 0);
    assert('el monstruo trae nombre, icono y stats de la escala', mon.name && mon.icon && mon.hp === 6 && mon.maxHp === 6 && mon.atq === 1);
    assert('sub-jefe y jefe final tienen nombre propio', createRpgMonster('subboss', 4).name && createRpgMonster('boss', 9).name === 'Dragón Ancestral');

    // Atacar: el héroe pega y el monstruo responde
    let c = fresh();
    let r = rpgCombatAction(c, 'attack');
    assert('atacar: el monstruo pierde el ATK del héroe', c.monster.hp === 5);
    assert('atacar: el monstruo responde con su golpe', c.hero.hp === 24 && r.events.length === 2);
    assert('el turno avanza', c.turn === 2 && !r.over);

    // Defender: el próximo golpe se reduce a la mitad (redondeo hacia arriba)
    c = freshPlain(5, 40);
    r = rpgCombatAction(c, 'defend');
    assert('defender: el golpe de 5 pasa a 3', c.hero.hp === 25 - 3);
    assert('defender: solo dura una ronda', c.defending === false);
    const before = c.hero.hp;
    rpgCombatAction(c, 'attack');
    assert('después de defender el daño vuelve a ser completo', before - c.hero.hp === 5);
    c = fresh();
    rpgCombatAction(c, 'defend');
    assert('defender contra un golpe de 1 no lo anula (redondeo hacia arriba)', c.hero.hp === 24);

    // Habilidad: 5 de fuego + enfriamiento de 3 rondas
    c = fresh('monster', 4);
    const hp4 = c.monster.hp;
    r = rpgCombatAction(c, 'skill', 'fire_strike');
    assert('Golpe de Fuego inflige 5 de daño', c.monster.hp === hp4 - 5);
    assert('el héroe no tiene DEF: el monstruo golpea con todo su ATK', (() => {
        const cc = freshPlain(4, 60);
        rpgCombatAction(cc, 'attack');
        return cc.hero.hp === 25 - 4 && !('def' in cc.hero) && !('def' in cc.monster);
    })());
    assert('la habilidad queda enfriándose (3)', c.cooldowns.fire_strike === 3 && !rpgSkillReady(c, 'fire_strike'));
    r = rpgCombatAction(c, 'skill');
    assert('no se puede usar mientras se enfría', r.ok === false && c.monster.hp === hp4 - 5);
    rpgCombatAction(c, 'attack'); // 3 -> 2
    rpgCombatAction(c, 'attack'); // 2 -> 1
    assert('sigue enfriándose 2 rondas después', c.cooldowns.fire_strike === 1 && !rpgSkillReady(c, 'fire_strike'));
    rpgCombatAction(c, 'attack'); // 1 -> 0
    assert('vuelve a estar lista tras 3 rondas de espera', rpgSkillReady(c, 'fire_strike'));

    // Huir: solo de monstruos normales, cuesta un golpe, no avanza el mapa
    c = fresh();
    assert('se puede huir de un monstruo normal', rpgCanFlee(c));
    r = rpgCombatAction(c, 'flee');
    assert('huir: termina el combate como "fled" pagando un golpe', r.over && c.result === 'fled' && c.hero.hp === 24);
    assert('sub-jefe y jefe final: no se puede huir', !rpgCanFlee(fresh('subboss', 4)) && !rpgCanFlee(fresh('boss', 9))
        && rpgCombatAction(fresh('boss', 9), 'flee').ok === false);
    c = fresh(); c.hero.hp = 1;
    assert('huir con 1 HP contra un golpe mortal = derrota', rpgCombatAction(c, 'flee').result === 'defeat');

    // Victoria / derrota / combate terminado
    c = fresh(); c.hero.atq = 99;
    r = rpgCombatAction(c, 'attack');
    assert('victoria: el monstruo cae y no contraataca', r.result === 'victory' && c.hero.hp === 25 && c.over);
    assert('un combate terminado no acepta más acciones', rpgCombatAction(c, 'attack').ok === false);
    c = freshPlain(5, 40); c.hero.hp = 3;
    r = rpgCombatAction(c, 'attack');
    assert('derrota: el héroe cae a 0 HP', r.result === 'defeat' && c.hero.hp === 0);
    assert('acción desconocida no rompe nada', rpgCombatAction(fresh(), 'bailar').ok === false);

    // Recompensas
    const h = createRpgHero();
    applyRpgReward(h, rpgVictoryReward('monster'));
    assert('victoria sobre monstruo: ya no da fuerza (solo sube el nivel: la fuerza viene del equipo)', h.atq === 1 && h.maxHp === 25 && h.hp === 25 && h.level === 2);
    const h2 = createRpgHero(); h2.hp = 10;
    applyRpgReward(h2, rpgVictoryReward('subboss'));
    assert('victoria sobre sub-jefe: tampoco da fuerza (su premio es un objeto)', h2.atq === 1 && h2.maxHp === 25 && h2.hp === 10);

    // Un héroe que va creciendo debería poder con los primeros monstruos
    const grow = createRpgHero();
    let survived = 0;
    for (let f = 0; f < 3; f++) {
        const cb = createRpgCombat(grow, createRpgMonster('monster', f));
        let guard = 60;
        while (!cb.over && guard--) rpgCombatAction(cb, 'attack');
        if (cb.result === 'victory') { survived++; applyRpgReward(grow, rpgVictoryReward('monster')); }
    }
    assert('el héroe base supera los 3 primeros monstruos atacando', survived === 3);
}

console.log('\n🗺️ Mapa (300 semillas)');
const { floors, cols } = RPG_MAP_CONFIG;
let allOk = { connected: true, noCross: true, types: true, boss: true, floor0: true, special: true, adjacency: true, starts: true,
    eventPlace: true, eventAdj: true, eventMin: true, campFinal: true, socialAdj: true, campMin: true, subbossAvoid: true };
let eventTotal = 0;

for (let seed = 1; seed <= 300; seed++) {
    const map = generateRpgMap(mulberry32(seed));
    const byId = new Map(map.nodes.map(n => [n.id, n]));

    // Piso 0 solo monstruos, jefe único al final
    const bosses = map.nodes.filter(n => n.type === 'boss');
    if (bosses.length !== 1 || bosses[0].floor !== floors - 1 || bosses[0].id !== map.bossId) allOk.boss = false;
    if (!map.nodes.filter(n => n.floor === 0).every(n => n.type === 'monster')) allOk.floor0 = false;
    if (map.startIds.length !== Math.min(RPG_MAP_CONFIG.paths, cols)) allOk.starts = false;

    // Tipos válidos y dentro del tablero
    if (!map.nodes.every(n => RPG_NODE_TYPES[n.type] && n.col >= 0 && n.col < cols && n.floor >= 0 && n.floor < floors)) allOk.types = false;

    // Aristas siempre al piso siguiente y a columna contigua; sin cruces
    for (const n of map.nodes) {
        for (const id of n.next) {
            const t = byId.get(id);
            if (!t || t.floor !== n.floor + 1) allOk.connected = false;
            if (t && n.floor < floors - 2 && Math.abs(t.col - n.col) > 1) allOk.connected = false;
        }
        if (n.type !== 'boss' && n.next.length === 0) allOk.connected = false;
    }
    for (let f = 0; f < floors - 2; f++) {
        const edges = map.nodes.filter(n => n.floor === f).flatMap(n => n.next.map(id => [n.col, byId.get(id).col]));
        for (const [a, b] of edges) for (const [c, d] of edges) {
            if ((a < c && b > d) || (a > c && b < d)) allOk.noCross = false;
        }
    }

    // Todo nodo es alcanzable desde el inicio y llega al jefe
    const reach = new Set(map.startIds);
    for (let f = 0; f < floors - 1; f++) {
        map.nodes.filter(n => n.floor === f && reach.has(n.id)).forEach(n => n.next.forEach(id => reach.add(id)));
    }
    if (reach.size !== map.nodes.length) allOk.connected = false;

    // Sub-jefe y cofre presentes; sin cofre→cofre ni sub-jefe→sub-jefe consecutivos
    if (!map.nodes.some(n => n.type === 'subboss')) allOk.special = false;
    if (!map.nodes.some(n => n.type === 'chest' && n.floor < floors - 2)) allOk.special = false;
    for (const n of map.nodes) for (const id of n.next) {
        const t = byId.get(id);
        if (n.type === t.type && (n.type === 'chest' || n.type === 'subboss')) allOk.adjacency = false;
        if (n.type === 'event' && t.type === 'event') allOk.eventAdj = false;
    }

    // Eventos: nunca en el piso 0 ni en el piso previo al jefe, y todo camino cruza al menos el mínimo
    for (const n of map.nodes.filter(n => n.type === 'event')) {
        eventTotal++;
        if (n.floor === 0 || n.floor >= floors - 2) allOk.eventPlace = false;
    }
    const fewest = new Map();
    for (const n of [...map.nodes].sort((a, b) => b.floor - a.floor)) {
        const own = n.type === 'event' ? 1 : 0;
        fewest.set(n.id, own + (n.next.length ? Math.min(...n.next.map(id => fewest.get(id))) : 0));
    }
    if (Math.min(...map.startIds.map(id => fewest.get(id))) < RPG_MIN_EVENTS_PER_ROUTE) allOk.eventMin = false;

    // Hogueras: una en TODO el piso previo al jefe, nunca pegadas a otra hoguera ni a un evento, y al menos el mínimo por camino
    if (!map.nodes.filter(n => n.floor === floors - 2).every(n => n.type === 'campfire')) allOk.campFinal = false;
    const social = x => x.type === 'campfire' || x.type === 'event';
    for (const n of map.nodes) for (const id of n.next) if (social(n) && social(byId.get(id))) allOk.socialAdj = false;
    const fewestCamp = new Map();
    for (const n of [...map.nodes].sort((a, b) => b.floor - a.floor)) {
        const own = n.type === 'campfire' ? 1 : 0;
        fewestCamp.set(n.id, own + (n.next.length ? Math.min(...n.next.map(id => fewestCamp.get(id))) : 0));
    }
    if (Math.min(...map.startIds.map(id => fewestCamp.get(id))) < RPG_MIN_CAMPFIRES_PER_ROUTE) allOk.campMin = false;

    // Los sub-jefes son opcionales: desde cualquier nodo hay siempre una salida que no es un sub-jefe
    for (const n of map.nodes) if (n.next.length && n.next.every(id => byId.get(id).type === 'subboss')) allOk.subbossAvoid = false;
}
assert('todas las aristas van al piso siguiente y todo nodo llega al jefe', allOk.connected);
assert('ninguna arista se cruza con otra', allOk.noCross);
assert('tipos de nodo válidos y dentro del tablero', allOk.types);
assert('un único jefe final, en el último piso', allOk.boss);
assert('el piso 0 son solo monstruos', allOk.floor0);
assert('nº de rutas de inicio = paths configurados', allOk.starts);
assert('siempre hay al menos un sub-jefe y un cofre intermedio', allOk.special);
assert('no hay cofre→cofre ni sub-jefe→sub-jefe seguidos', allOk.adjacency);

assert('los eventos nunca están en el piso 0 ni justo antes del jefe', allOk.eventPlace);
assert('no hay dos eventos seguidos', allOk.eventAdj);
assert(`todo camino de inicio a jefe cruza al menos ${RPG_MIN_EVENTS_PER_ROUTE} eventos`, allOk.eventMin);
assert('en promedio hay eventos de sobra por mapa (≥ 7)', eventTotal / 300 >= 7);
assert('el piso previo al jefe es SIEMPRE una hoguera', allOk.campFinal);
assert('eventos y hogueras nunca van pegados entre sí', allOk.socialAdj);
assert(`todo camino de inicio a jefe pasa por al menos ${RPG_MIN_CAMPFIRES_PER_ROUTE} hogueras`, allOk.campMin);
assert('los sub-jefes son opcionales: siempre hay una salida sin sub-jefe', allOk.subbossAvoid);
assert('la ruta es larga y densa: 16 pisos, 7 columnas, 6 caminos', floors === 16 && cols === 7 && RPG_MAP_CONFIG.paths === 6);

console.log('\n🧭 rpgAvailableNodes');
const m = generateRpgMap(mulberry32(7));
assert('sin posición: solo el piso 0', rpgAvailableNodes(m, null).join() === m.startIds.join());
const first = m.nodes.find(n => n.id === m.startIds[0]);
assert('desde un nodo: sus hijos', rpgAvailableNodes(m, first.id).join() === first.next.join());
assert('desde el jefe: nada', rpgAvailableNodes(m, m.bossId).length === 0);
assert('mapa nulo: nada', rpgAvailableNodes(null, null).length === 0);
{
    const sk = rpgAvailableNodes(m, first.id, true);
    const grandchildren = new Set(first.next.flatMap(id => m.nodes.find(n => n.id === id).next));
    assert('con salto de piso: solo los hijos de los hijos', sk.length > 0 && sk.every(id => grandchildren.has(id)) && sk.length === grandchildren.size);
    assert('con salto de piso se sube exactamente dos pisos', sk.every(id => m.nodes.find(n => n.id === id).floor === first.floor + 2));
}

// ---------------------------------------------
console.log('\n👁️ Intenciones del enemigo (se ven ANTES de actuar y se ejecutan tal cual)');
{
    const mk = (pattern, atq = 4, hp = 100, extra = {}) => ({ type: 'monster', floor: 0, name: 'Muñeco', icon: '🧪', color: '#888', atq, hp, maxHp: hp, pattern, ...extra });
    const bigHero = () => { const h = createRpgHero(); h.hp = h.maxHp = 100; return h; };
    const start = (pattern, atq, hp, extra) => createRpgCombat(bigHero(), mk(pattern, atq, hp, extra));

    let c = start([atk(2)], 4);
    assert('al empezar el combate ya hay una intención visible', !!c.monster.intent && c.monster.intent.k === 'attack');
    assert('un ataque anuncia su daño exacto (2 × ATK 4 = 8)', c.monster.intent.dmg === 8);
    rpgCombatAction(c, 'attack');
    assert('la intención anunciada es EXACTAMENTE la que se ejecuta (8 de daño)', c.hero.hp === 92);

    c = start([atk(1), CHARGE, atk(3)], 4);
    const seen = [];
    for (let i = 0; i < 6; i++) { seen.push(c.monster.intent.k + (c.monster.intent.dmg || '')); rpgCombatAction(c, 'attack'); }
    assert('el patrón se repite en ciclo (ataque, carga, golpe fuerte…)', seen.join(',') === 'attack4,charge,attack12,attack4,charge,attack12');

    c = start([CHARGE, atk(2)], 5);
    rpgCombatAction(c, 'attack');
    assert('cargar no hace daño', c.hero.hp === 100);
    assert('después de cargar viene el golpe anunciado', c.monster.intent.k === 'attack' && c.monster.intent.dmg === 10);

    c = start([GUARD, atk(1)], 4, 100);
    c.hero.atq = 6;
    assert('si se protege, tu ataque anuncia la mitad', rpgAttackPreview(c) === 3);
    rpgCombatAction(c, 'attack');
    assert('protegerse reduce a la mitad el daño del héroe', c.monster.hp === 97);
    c = start([GUARD, atk(1)], 4, 100);
    rpgCombatAction(c, 'skill', 'fire_strike');
    assert('protegerse también reduce a la mitad las habilidades (5 → 3)', c.monster.hp === 97);
    c = start([GUARD], 4, 100);
    c.hero.atq = 1;
    assert('protegerse nunca deja el daño en 0 (mínimo 1)', rpgAttackPreview(c) === 1);

    c = start([heal(0.1)], 4, 100);
    c.monster.hp = 50;
    const r0 = rpgCombatAction(c, 'attack'); // el héroe hace 1 y el monstruo se cura el 10 % de 100
    assert('curarse recupera el % de su vida máxima', c.monster.hp === 59 && r0.events.some(e => e.kind === 'heal' && e.amount === 10));
    c = start([heal(0.5)], 4, 100);
    c.monster.hp = 95;
    rpgCombatAction(c, 'attack');
    assert('curarse nunca supera la vida máxima', c.monster.hp === 100);

    c = start([REST], 4, 100);
    rpgCombatAction(c, 'attack');
    assert('descansar no hace nada', c.hero.hp === 100);

    // Defender: solo cubre la ronda en curso
    c = start([CHARGE, atk(1)], 4);
    rpgCombatAction(c, 'defend');
    assert('defenderte cuando el enemigo no ataca no sirve de nada (sin daño y la defensa se gasta)', c.hero.hp === 100 && c.defending === false);
    rpgCombatAction(c, 'attack');
    assert('la ronda siguiente el golpe llega completo', c.hero.hp === 96);

    // Vistas y anticipos para la interfaz
    c = start([atk(2)], 4);
    assert('rpgIncomingPreview: sin defender 8 y defendiendo 4', rpgIncomingPreview(c, false) === 8 && rpgIncomingPreview(c, true) === 4);
    assert('un golpe de ×2 o más se ve como «Golpe fuerte» 💥', rpgIntentView(c.monster).icon === '💥' && rpgIntentView(c.monster).value === 8);
    assert('un golpe normal se ve como «Ataca» ⚔️', rpgIntentView(start([atk(1)], 4).monster).icon === '⚔️');
    assert('cada tipo de intención tiene su icono', (() => {
        const icons = [[CHARGE, '⚡'], [GUARD, '🛡️'], [heal(0.1), '💚'], [REST, '💤']];
        return icons.every(([mv, ic]) => rpgIntentView(start([mv], 4).monster).icon === ic);
    })());
    assert('rpgIncomingPreview es 0 si el enemigo no va a atacar', rpgIncomingPreview(start([CHARGE], 4), false) === 0);

    // Huir cuesta el ATK base, no la intención
    c = start([atk(3)], 4);
    const fled = rpgCombatAction(c, 'flee');
    assert('huir cuesta un golpe base (ATK 4), no el golpe anunciado', fled.over && c.hero.hp === 96);

    // Patrones por pesos (el azar viene del generador de la partida, así que se puede repetir)
    const weighted = { weights: [[atk(1), 1], [CHARGE, 1]] };
    assert('un patrón por pesos usa el generador de la partida', createRpgCombat(bigHero(), mk(null, 4, 100, weighted), () => 0.1).monster.intent.k === 'attack'
        && createRpgCombat(bigHero(), mk(null, 4, 100, weighted), () => 0.9).monster.intent.k === 'charge');
    assert('un monstruo sin patrón ataca siempre con su ATK', (() => { const cc = createRpgCombat(bigHero(), { ...mk(null, 4, 100), pattern: undefined }); return cc.monster.intent.dmg === 4; })());
}

console.log('\n👹 Bestiario: cada monstruo con su forma de atacar');
{
    const all = [...MONSTER_ROSTER, ...SUBBOSS_ROSTER, BOSS_DEF];
    const kinds = new Set(['attack', 'charge', 'guard', 'heal', 'rest']);
    assert('hay 15 monstruos normales (uno por piso), 3 sub-jefes y un jefe', MONSTER_ROSTER.length === 15 && SUBBOSS_ROSTER.length === 3 && !!BOSS_DEF);
    assert('todos tienen nombre, icono y un patrón con movimientos válidos', all.every(d => d.name && d.icon && d.pattern.length > 0 && d.pattern.every(m => kinds.has(m.k))));
    assert('todos los monstruos normales son distintos', new Set(MONSTER_ROSTER.map(d => d.name)).size === 15 && new Set(MONSTER_ROSTER.map(d => d.icon)).size === 15);
    assert('todos atacan alguna vez y ningún golpe supera ×3,5 ni baja de ×0,5', all.every(d => {
        const hits = d.pattern.filter(m => m.k === 'attack');
        return hits.length > 0 && hits.every(m => m.m >= 0.5 && m.m <= 3.5);
    }));
    assert('la media de daño por ronda de cada patrón está entre ×0,3 y ×1,6 (ningún enemigo es una trampa)', all.every(d => {
        const avg = d.pattern.reduce((t, m) => t + (m.k === 'attack' ? m.m : 0), 0) / d.pattern.length;
        return avg >= 0.3 && avg <= 1.6;
    }));
    assert('los tres primeros pisos son el «grupo fácil»: el patrón medio no supera ×1,1', MONSTER_ROSTER.slice(0, 3).every(d => d.pattern.reduce((t, m) => t + (m.k === 'attack' ? m.m : 0), 0) / d.pattern.length <= 1.1));
    assert('createRpgMonster usa el patrón de cada piso', createRpgMonster('monster', 2).name === 'Goblin' && createRpgMonster('monster', 2).pattern[0].k === 'charge');
    assert('un piso fuera del bestiario usa el último monstruo (no rompe)', createRpgMonster('monster', 40).name === MONSTER_ROSTER.at(-1).name);
}

console.log('\n🎲 Aleatoriedad con semilla');
{
    const a = createRng(123), b = createRng(123), d = createRng(124);
    const A = Array.from({ length: 8 }, a), B = Array.from({ length: 8 }, b), D = Array.from({ length: 8 }, d);
    assert('la misma semilla da la misma secuencia', A.join() === B.join());
    assert('semillas distintas dan secuencias distintas', A.join() !== D.join());
    assert('todos los valores están en [0, 1)', Array.from({ length: 2000 }, createRng(5)).every(v => v >= 0 && v < 1));
    const r1 = createRng(77); for (let i = 0; i < 10; i++) r1();
    const saved = r1.state;
    const next5 = Array.from({ length: 5 }, r1);
    const r2 = createRng(77); r2.state = saved;
    assert('se puede guardar y restaurar el estado del generador (base de guardar la partida)', Array.from({ length: 5 }, r2).join() === next5.join());
    assert('la misma semilla da EXACTAMENTE el mismo mapa', JSON.stringify(generateRpgMap(createRng(4242))) === JSON.stringify(generateRpgMap(createRng(4242)))
        && JSON.stringify(generateRpgMap(createRng(4242))) !== JSON.stringify(generateRpgMap(createRng(4243))));
    assert('newSeed devuelve un número de 32 bits sin signo', (() => { for (let i = 0; i < 500; i++) { const n = newSeed(); if (!(n >= 0 && n <= 4294967295 && Number.isInteger(n))) return false; } return true; })());
    assert('seedToCode y codeToSeed son inversos (2000 semillas)', (() => {
        const rng = createRng(9);
        for (let i = 0; i < 2000; i++) { const n = newSeed(rng); if (codeToSeed(seedToCode(n)) !== n) return false; }
        return true;
    })());
    assert('el código tiene el formato XXXX-XXX', /^[0-9A-Z]{4}-[0-9A-Z]{3}$/.test(seedToCode(123456789)) && seedToCode(0) === '0000-000');
    assert('el código no distingue mayúsculas, espacios ni guion', codeToSeed('k3f9-2qa') === codeToSeed(' K3F92QA '));
    assert('un texto libre también sirve de semilla (y siempre da la misma)', codeToSeed('mi ruta secreta') === codeToSeed('mi ruta secreta') && codeToSeed('mi ruta secreta') !== codeToSeed('otra'));
    assert('un texto vacío no es una semilla', codeToSeed('') === null && codeToSeed('   ') === null && codeToSeed(null) === null);
}

console.log('\n⚖️ Números de equilibrio compartidos');
{
    const before = rpgMonsterStats('monster', 0).hp;
    RPG_BALANCE.monster.hpBase += 4;
    const changed = rpgMonsterStats('monster', 0).hp;
    RPG_BALANCE.monster.hpBase -= 4;
    assert('el motor lee los números de data/balance.js (el banco de equilibrio puede cambiarlos)', changed === before + 4 && rpgMonsterStats('monster', 0).hp === before);
    assert('la hoguera cura el 30 % y los sub-jefes ya no son una pared', RPG_BALANCE.campfire.healPct === 0.3 && RPG_BALANCE.subboss.hpMul <= 2);
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

// =============================================
// 🗡️ RPG-pack — héroe, escala de monstruos, mapa y combate (src/engine.js, puro)
// =============================================
import {
    RPG_HERO_BASE, RPG_NODE_TYPES, RPG_MAP_CONFIG,
    createRpgHero, rpgMonsterStats, generateRpgMap, rpgAvailableNodes,
    createRpgMonster, createRpgCombat, rpgCombatAction, rpgSkillReady, rpgCanFlee,
    rpgVictoryReward, applyRpgReward
} from '../src/engine.js';

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
assert('el héroe empieza con ATK 1 / HP 25 / DEF 0', hero.atq === 1 && hero.hp === 25 && hero.def === 0);
assert('maxHp = HP inicial y nivel 1', hero.maxHp === 25 && hero.level === 1);
assert('createRpgHero devuelve una copia (no muta la base)', (hero.atq = 99, RPG_HERO_BASE.atq === 1));
assert('el héroe solo tiene atributos básicos (sin pasivas, ultimates, Fervor, elementos ni clase)', (() => {
    const keys = Object.keys(createRpgHero()).sort().join(',');
    return keys === 'atq,color,def,hp,icon,level,maxHp,name';
})());
assert('todas las partidas empiezan con el mismo héroe', JSON.stringify(createRpgHero()) === JSON.stringify(createRpgHero()));

const m0 = rpgMonsterStats('monster', 0);
assert('el primer monstruo es más débil que el héroe inicial', m0.atq <= 1 && m0.hp < 25 && m0.def === 0);
let monotone = true;
for (let f = 1; f <= 8; f++) {
    const prev = rpgMonsterStats('monster', f - 1);
    const cur = rpgMonsterStats('monster', f);
    if (cur.hp < prev.hp || cur.atq < prev.atq || cur.def < prev.def) monotone = false;
}
assert('los monstruos nunca se debilitan al subir de piso', monotone);
const hi = rpgMonsterStats('monster', 8);
assert('el monstruo del piso 8 supera al del piso 0 en todo', hi.atq > m0.atq && hi.hp > m0.hp && hi.def > m0.def);
const sb = rpgMonsterStats('subboss', 5);
const mo = rpgMonsterStats('monster', 5);
assert('un sub-jefe es más fuerte que un monstruo del mismo piso', sb.atq > mo.atq && sb.hp > mo.hp && sb.def > mo.def);
const bo = rpgMonsterStats('boss', RPG_MAP_CONFIG.floors - 1);
const sbLate = rpgMonsterStats('subboss', RPG_MAP_CONFIG.floors - 2);
assert('el jefe final es más fuerte que cualquier sub-jefe', bo.atq > sbLate.atq && bo.hp > sbLate.hp && bo.def > sbLate.def);
assert('piso negativo/decimal no rompe la escala', rpgMonsterStats('monster', -3).hp === 6 && Number.isInteger(rpgMonsterStats('monster', 2.7).hp));

console.log('\n⚔️ Combate por turnos');
{
    const fresh = (type = 'monster', floor = 0) => {
        const h = createRpgHero();
        return createRpgCombat(h, createRpgMonster(type, floor));
    };

    const mon = createRpgMonster('monster', 0);
    assert('el monstruo trae nombre, icono y stats de la escala', mon.name && mon.icon && mon.hp === 6 && mon.maxHp === 6 && mon.atq === 1);
    assert('sub-jefe y jefe final tienen nombre propio', createRpgMonster('subboss', 4).name && createRpgMonster('boss', 9).name === 'Dragón Ancestral');

    // Atacar: el héroe pega y el monstruo responde
    let c = fresh();
    let r = rpgCombatAction(c, 'attack');
    assert('atacar: el monstruo pierde ATK del héroe (mín. 1)', c.monster.hp === 5);
    assert('atacar: el monstruo responde con su golpe', c.hero.hp === 24 && r.events.length === 2);
    assert('el turno avanza', c.turn === 2 && !r.over);

    // Defender: el próximo golpe se reduce a la mitad (redondeo hacia arriba)
    c = fresh('monster', 8); // monstruo ATK 5
    r = rpgCombatAction(c, 'defend');
    assert('defender: el golpe de 5 pasa a 3', c.hero.hp === 25 - 3);
    assert('defender: solo dura un golpe', c.defending === false);
    const before = c.hero.hp;
    rpgCombatAction(c, 'attack');
    assert('después de defender el daño vuelve a ser completo', before - c.hero.hp === 5);
    c = fresh();
    rpgCombatAction(c, 'defend');
    assert('defender contra un golpe de 1 no lo anula (redondeo hacia arriba)', c.hero.hp === 24);

    // Habilidad: 5 de fuego + enfriamiento de 3 rondas
    c = fresh('monster', 4); // HP 18
    r = rpgCombatAction(c, 'skill', 'fire_strike');
    assert('Golpe de Fuego inflige 5 de daño', c.monster.hp === 18 - 5);
    assert('Golpe de Fuego ignora la DEF del monstruo', (() => {
        const cc = fresh('monster', 6); // DEF 2
        rpgCombatAction(cc, 'skill');
        return cc.monster.hp === cc.monster.maxHp - 5;
    })());
    assert('la habilidad queda enfriándose (3)', c.cooldowns.fire_strike === 3 && !rpgSkillReady(c, 'fire_strike'));
    r = rpgCombatAction(c, 'skill');
    assert('no se puede usar mientras se enfría', r.ok === false && c.monster.hp === 13);
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
    c = fresh('monster', 8); c.hero.hp = 3;
    r = rpgCombatAction(c, 'attack');
    assert('derrota: el héroe cae a 0 HP', r.result === 'defeat' && c.hero.hp === 0);
    assert('acción desconocida no rompe nada', rpgCombatAction(fresh(), 'bailar').ok === false);

    // Recompensas
    const h = createRpgHero();
    applyRpgReward(h, rpgVictoryReward('monster'));
    assert('victoria sobre monstruo: +1 ATK, +4 HP máx (y curación) y nivel 2', h.atq === 2 && h.maxHp === 29 && h.hp === 29 && h.level === 2);
    const h2 = createRpgHero(); h2.hp = 10;
    applyRpgReward(h2, rpgVictoryReward('subboss'));
    assert('victoria sobre sub-jefe: +2 ATK, +1 DEF, +8 HP', h2.atq === 3 && h2.def === 1 && h2.maxHp === 33 && h2.hp === 18);

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
let allOk = { connected: true, noCross: true, types: true, boss: true, floor0: true, special: true, adjacency: true, starts: true };

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
    }
}
assert('todas las aristas van al piso siguiente y todo nodo llega al jefe', allOk.connected);
assert('ninguna arista se cruza con otra', allOk.noCross);
assert('tipos de nodo válidos y dentro del tablero', allOk.types);
assert('un único jefe final, en el último piso', allOk.boss);
assert('el piso 0 son solo monstruos', allOk.floor0);
assert('nº de rutas de inicio = paths configurados', allOk.starts);
assert('siempre hay al menos un sub-jefe y un cofre intermedio', allOk.special);
assert('no hay cofre→cofre ni sub-jefe→sub-jefe seguidos', allOk.adjacency);

console.log('\n🧭 rpgAvailableNodes');
const m = generateRpgMap(mulberry32(7));
assert('sin posición: solo el piso 0', rpgAvailableNodes(m, null).join() === m.startIds.join());
const first = m.nodes.find(n => n.id === m.startIds[0]);
assert('desde un nodo: sus hijos', rpgAvailableNodes(m, first.id).join() === first.next.join());
assert('desde el jefe: nada', rpgAvailableNodes(m, m.bossId).length === 0);
assert('mapa nulo: nada', rpgAvailableNodes(null, null).length === 0);

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

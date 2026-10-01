import { RPG_BALANCE } from './data/balance.js?v=1.6.0';
import { pickMonsterDef } from './data/monsters.js?v=1.6.0';
import { ADJECTIVES_BY_ID, LINEAGES_BY_ID, adjectivesFor, lineagesFor } from './data/variants.js?v=1.6.0';
import { DAMAGE_TYPES, equipItem, createStarterItem, ruleSum, ruleMax, hasRule } from './items.js?v=1.6.0';
import { PRIMARY_BASE, derivePrimary, isElementalDamage } from './stats.js?v=1.6.0';
import { HEAVY_TELLS, HEAVY_TELL_MIN } from './data/telegraphs.js?v=1.6.0';

// =============================================
// 🗡️ RPG-pack — motor (puro, sin DOM)
// Atributos básicos ATK / HP más un equipo de 4 ranuras (src/items.js). Nada del Easy Hit original: sin Fervor,
// pasivas de carta, ultimates ni catálogo de campeones.
// =============================================

// Escala propia (números pequeños). Todas las partidas empiezan con el MISMO héroe y las mismas
// estadísticas; según los caminos que se tomen se va haciendo más fuerte (y, más adelante,
// se especializa en guerrero, pícaro o elementalista).
export const RPG_HERO_BASE = {
    name: 'Héroe', icon: '🗡️', color: '#fbbf24',
    atq: 0, hp: 25   // el ATK inicial (1) lo pone la espada básica
};

// vows: renuncias permanentes (noFlee, noSkills) · skillMods: mejoras de habilidades · affinity: hacia dónde se inclina el build
// equipment: { weapon, secondary, armor, accessory } · guard: cuánto más reduce Defender (lo suman los escudos)
// primary: { str, dex, int, vit } — base 5/5/5/5; main.js le suma los puntos permanentes ya invertidos (meta.primary)
export function createRpgHero() {
    const hero = {
        ...RPG_HERO_BASE, maxHp: RPG_HERO_BASE.hp, level: 1, guard: 0,
        vows: {}, skillMods: {}, affinity: { guerrero: 0, picaro: 0, elementalista: 0 },
        equipment: { weapon: null, secondary: null, armor: null, accessory: null },
        inventory: [],   // hasta 10 objetos guardados sin equipar; se reinicia cada ruta
        trophy: null,    // el objeto legendario del jefe final, si ya lo ganaste; lo rellena main.js desde el progreso persistente
        primary: { ...PRIMARY_BASE },
        critChance: 0, critMult: 1.5, dodgeChance: 0, physResist: 0, elemResist: 0,
        _primaryBonus: { atq: 0, maxHp: 0 }
    };
    equipItem(hero, createStarterItem());
    refreshPrimaryStats(hero);
    return hero;
}

/**
 * Recalcula lo que dan las 4 primarias: hay que llamarla al crear el héroe, al cambiar de arma (el bono de
 * ATK/daño elemental depende del tipo de daño del arma) y al invertir un punto de nivel. En la base (5/5/5/5,
 * sin inversión) todo esto da 0 y el héroe queda exactamente como antes de que existiera este sistema.
 */
export function refreshPrimaryStats(hero) {
    const weapon = hero.equipment && hero.equipment.weapon;
    const bonus = derivePrimary(hero.primary, weapon && weapon.damaged);
    const old = hero._primaryBonus || { atq: 0, maxHp: 0 };

    hero.atq = Math.max(1, hero.atq - old.atq + bonus.atqBonus);
    const dHp = bonus.maxHpBonus - old.maxHp;
    if (dHp) {
        hero.maxHp = Math.max(1, hero.maxHp + dHp);
        hero.hp = Math.min(hero.maxHp, Math.max(1, hero.hp + Math.max(0, dHp)));
    }
    hero._primaryBonus = { atq: bonus.atqBonus, maxHp: bonus.maxHpBonus };
    hero.elemDmgBonus = bonus.elemDmgBonus;
    hero.critChance = bonus.critChance;
    hero.critMult = bonus.critMult;
    hero.dodgeChance = bonus.dodgeChance;
    hero.physResist = bonus.physResist;
    hero.elemResist = bonus.elemResist;
    return hero;
}

// Monstruos: escalan piso a piso. Los primeros son el «grupo fácil».
// (sub-jefe y jefe final multiplican la base del piso donde aparecen). Los números viven en data/balance.js
// `tier` es el tramo del descenso sin fin: multiplica todo de forma acumulativa. En el tramo 0 el
// multiplicador es exactamente 1 y ni siquiera se aplica, así que los números de siempre no se mueven.
export function rpgMonsterStats(type, floor, tier = 0) {
    const f = Math.max(0, floor | 0);
    const B = RPG_BALANCE;
    let atq = B.monster.atkBase + Math.floor(f * B.monster.atkPerFloor);
    let hp = Math.round(B.monster.hpBase + B.monster.hpPerFloor * f);
    if (f < B.monster.easyFloors && B.monster.easyFactor !== 1) {
        atq = Math.max(1, Math.round(atq * B.monster.easyFactor));
        hp = Math.max(1, Math.round(hp * B.monster.easyFactor));
    }
    if (type === 'subboss') { atq += B.subboss.atkBonus; hp = Math.round(hp * B.subboss.hpMul); }
    else if (type === 'boss') { atq += B.boss.atkBonus; hp = Math.round(hp * B.boss.hpMul); }
    const t = Math.max(0, tier | 0);
    if (t > 0) {
        const mul = Math.pow(B.depth.tierMul, t);
        atq = Math.max(1, Math.round(atq * mul));
        hp = Math.max(1, Math.round(hp * mul));
    }
    return { atq, hp };
}

/** Profundidad absoluta (el número que ve el jugador): el tramo 2, piso 3, es el piso 35. */
export function rpgAbsoluteFloor(tier, floor, cfg = RPG_MAP_CONFIG) {
    return Math.max(0, tier | 0) * cfg.floors + Math.max(0, floor | 0);
}

export const RPG_NODE_TYPES = {
    monster:  { id: 'monster',  name: 'Monstruo', icon: '👾', desc: 'Combate contra un monstruo.' },
    chest:    { id: 'chest',    name: 'Cofre',    icon: '🧰', desc: 'Un cofre con botín.' },
    event:    { id: 'event',    name: 'Evento',   icon: '🎲', desc: 'Una situación con dos decisiones.' },
    campfire: { id: 'campfire', name: 'Hoguera',  icon: '🔥', desc: 'Descansa o mejora tu arma.' },
    subboss:  { id: 'subboss',  name: 'Sub-jefe', icon: '💀', desc: 'Combate difícil (opcional), mejor recompensa.' },
    boss:     { id: 'boss',     name: 'Jefe final', icon: '🐉', desc: 'El guardián del final de la ruta.' }
};

// floors incluye el piso del jefe final; paths = rutas que se trazan desde el piso 0
export const RPG_MAP_CONFIG = { floors: 16, cols: 7, paths: 6 };

// Todo camino de inicio a jefe pasa por al menos este número de eventos y de hogueras
export const RPG_MIN_EVENTS_PER_ROUTE = 3;
export const RPG_MIN_CAMPFIRES_PER_ROUTE = 2;

function _rpgWeightedType(rng, pool) {
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let roll = rng() * total;
    for (const [type, w] of pool) {
        roll -= w;
        if (roll < 0) return type;
    }
    return pool[0][0];
}

function _generateRpgMapOnce(rng, cfg) {
    const { floors, cols, paths } = cfg;
    const bossFloor = floors - 1;
    const lastRegular = floors - 2;
    const bossCol = Math.floor(cols / 2);
    const W = RPG_BALANCE.weights;
    const SUBBOSS_MIN_FLOOR = RPG_BALANCE.subbossMinFloor;

    const nodesByKey = new Map();
    const edgesByFloor = Array.from({ length: floors }, () => []);
    const getNode = (floor, col) => {
        const key = `${floor}:${col}`;
        if (!nodesByKey.has(key)) {
            nodesByKey.set(key, { id: `rpg_${floor}_${col}`, floor, col, type: null, next: [] });
        }
        return nodesByKey.get(key);
    };

    const startCols = [...Array(cols).keys()];
    for (let i = startCols.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [startCols[i], startCols[j]] = [startCols[j], startCols[i]];
    }

    for (const startCol of startCols.slice(0, Math.min(paths, cols))) {
        let col = startCol;
        for (let f = 0; f < lastRegular; f++) {
            const from = getNode(f, col);
            // Moverse a la columna contigua sin cruzar aristas ya trazadas (seguir recto nunca cruza)
            const options = [col - 1, col, col + 1]
                .filter(c => c >= 0 && c < cols)
                .filter(c => !edgesByFloor[f].some(([a, b]) => (a < col && b > c) || (a > col && b < c)));
            const nextCol = options[Math.floor(rng() * options.length)];
            const to = getNode(f + 1, nextCol);
            if (!from.next.includes(to.id)) from.next.push(to.id);
            if (!edgesByFloor[f].some(([a, b]) => a === col && b === nextCol)) edgesByFloor[f].push([col, nextCol]);
            col = nextCol;
        }
        const last = getNode(lastRegular, col);
        const boss = getNode(bossFloor, bossCol);
        if (!last.next.includes(boss.id)) last.next.push(boss.id);
    }

    const nodes = [...nodesByKey.values()].sort((a, b) => a.floor - b.floor || a.col - b.col);
    const byId = new Map(nodes.map(n => [n.id, n]));
    const parents = new Map(nodes.map(n => [n.id, []]));
    nodes.forEach(n => n.next.forEach(id => parents.get(id).push(n.id)));
    const neighbors = n => [...parents.get(n.id), ...n.next].map(id => byId.get(id));
    const neighborTypes = n => neighbors(n).map(x => x.type);
    const isFixed = n => n.floor === 0 || n.floor === lastRegular || n.floor === bossFloor;

    for (const n of nodes) {
        if (n.floor === bossFloor) { n.type = 'boss'; continue; }
        if (n.floor === 0) { n.type = 'monster'; continue; }
        if (n.floor === 1) { n.type = 'chest'; continue; }       // botín de bienvenida: todas las rutas empiezan con un objeto
        if (n.floor === lastRegular) { n.type = 'campfire'; continue; } // una hoguera SIEMPRE antes del jefe
        const parentTypes = parents.get(n.id).map(id => byId.get(id).type);
        const pool = [['monster', W.monster]];
        // Eventos y hogueras: nunca dos seguidos ni pegados entre sí, ni justo antes de la hoguera final
        if (n.floor < lastRegular - 1 && !parentTypes.includes('event') && !parentTypes.includes('campfire')) {
            pool.push(['event', W.event], ['campfire', W.campfire]);
        }
        if (!parentTypes.includes('chest')) pool.push(['chest', W.chest]);
        if (n.floor >= SUBBOSS_MIN_FLOOR && !parentTypes.includes('subboss')) pool.push(['subboss', W.subboss]);
        n.type = _rpgWeightedType(rng, pool);
    }

    // Un sub-jefe solo puede colocarse si cada uno de sus padres conserva otra salida que no sea un sub-jefe
    const subbossKeepsExit = n => parents.get(n.id).every(pid =>
        byId.get(pid).next.some(cid => cid !== n.id && byId.get(cid).type !== 'subboss'));
    const forceType = (type, minFloor, maxFloor, extraOk = () => true) => {
        if (nodes.some(n => n.type === type && n.floor >= minFloor && n.floor <= maxFloor)) return;
        const candidates = nodes.filter(n => n.type === 'monster' && n.floor >= minFloor && n.floor <= maxFloor
            && !neighborTypes(n).includes(type) && extraOk(n));
        if (candidates.length) candidates[Math.floor(rng() * candidates.length)].type = type;
    };
    forceType('subboss', SUBBOSS_MIN_FLOOR, lastRegular - 1, subbossKeepsExit);
    forceType('chest', 1, lastRegular - 2);

    // Los sub-jefes son OPCIONALES: desde cualquier nodo siempre hay una salida que no es un sub-jefe.
    for (const n of nodes) {
        if (!n.next.length) continue;
        const kids = n.next.map(id => byId.get(id));
        if (kids.every(k => k.type === 'subboss')) kids[Math.floor(rng() * kids.length)].type = 'monster';
    }
    forceType('subboss', SUBBOSS_MIN_FLOOR, lastRegular - 1, subbossKeepsExit);

    // Todo camino de inicio a jefe debe cruzar al menos RPG_MIN_EVENTS_PER_ROUTE eventos y
    // RPG_MIN_CAMPFIRES_PER_ROUTE hogueras.
    // Búsqueda local: se toma el camino más pobre, se convierte en evento (u hoguera) uno de sus monstruos y, si un
    // vecino lo impide (no puede haber dos seguidos), ese vecino vuelve a ser monstruo. Solo se conservan los cambios
    // que no empeoran el déficit total (lo que falta sumando todos los caminos), así que siempre termina.
    const MINS = { event: RPG_MIN_EVENTS_PER_ROUTE, campfire: RPG_MIN_CAMPFIRES_PER_ROUTE };
    const bottomUp = [...nodes].reverse(); // de los pisos altos a los bajos (calculado una sola vez)
    const startNodes = nodes.filter(n => n.floor === 0);
    const routeStats = type => {
        const MIN = MINS[type];
        const best = new Map();  // id -> { count, route }: el camino con menos nodos de ese tipo desde ese nodo
        const walks = new Map(); // id -> nº de caminos hasta el jefe con k nodos (k = MIN significa «MIN o más»)
        for (const n of bottomUp) {
            const own = n.type === type ? 1 : 0;
            const w = new Array(MIN + 1).fill(0);
            if (!n.next.length) {
                best.set(n.id, { count: own, route: [n] });
                w[Math.min(MIN, own)] = 1;
            } else {
                const child = n.next.map(id => best.get(id)).reduce((a, b) => (b.count < a.count ? b : a));
                best.set(n.id, { count: own + child.count, route: [n, ...child.route] });
                for (const id of n.next) walks.get(id).forEach((c, k) => { w[Math.min(MIN, k + own)] += c; });
            }
            walks.set(n.id, w);
        }
        const starts = startNodes;
        const worst = starts.map(n => best.get(n.id)).reduce((a, b) => (b.count < a.count ? b : a));
        const shortfall = starts.reduce((t, n) => t + walks.get(n.id).reduce((x, c, k) => x + c * Math.max(0, MIN - k), 0), 0);
        return { worst, shortfall };
    };
    const clash = n => n.type === 'event' || n.type === 'campfire';
    let se = routeStats('event');
    let sc = routeStats('campfire');
    for (let attempt = nodes.length * 10; attempt > 0 && (se.shortfall + sc.shortfall) > 0; attempt--) {
        const type = se.shortfall >= sc.shortfall ? 'event' : 'campfire';
        const target = type === 'event' ? se : sc;
        const spots = target.worst.route.filter(n => n.type === 'monster' && n.floor >= 1 && n.floor < lastRegular - 1
            && !neighbors(n).some(x => clash(x) && isFixed(x)));
        if (!spots.length) break;
        const spot = spots[Math.floor(rng() * spots.length)];
        const blockers = neighbors(spot).filter(clash);
        const previous = blockers.map(b => b.type);
        spot.type = type;
        blockers.forEach(b => { b.type = 'monster'; });
        const te = routeStats('event');
        const tc = routeStats('campfire');
        if (te.shortfall + tc.shortfall <= se.shortfall + sc.shortfall) { se = te; sc = tc; }
        else {
            spot.type = 'monster';
            blockers.forEach((b, i) => { b.type = previous[i]; });
        }
    }

    return {
        floors, cols, nodes,
        bossId: getNode(bossFloor, bossCol).id,
        startIds: nodes.filter(n => n.floor === 0).map(n => n.id),
        routeShortfall: se.shortfall + sc.shortfall
    };
}

// La búsqueda local casi siempre cumple los mínimos; en el raro caso de que se atasque se genera otro mapa.
export function generateRpgMap(rng = Math.random, cfg = RPG_MAP_CONFIG, tier = 0) {
    let map;
    for (let tries = 0; tries < 40; tries++) {
        map = _generateRpgMapOnce(rng, cfg);
        if (!map.routeShortfall) break;
    }
    delete map.routeShortfall;
    map.tier = Math.max(0, tier | 0);   // el tramo del descenso: decide elenco, dureza y oro
    return map;
}

// skip = true: el héroe se salta un piso (puente de cuerdas) y puede ir a los hijos de sus hijos
export function rpgAvailableNodes(map, currentId, skip = false) {
    if (!map) return [];
    if (!currentId) return [...map.startIds];
    const byId = new Map(map.nodes.map(n => [n.id, n]));
    const current = byId.get(currentId);
    if (!current) return [];
    if (!skip) return [...current.next];
    const out = new Set();
    for (const id of current.next) {
        const child = byId.get(id);
        (child && child.next.length ? child.next : [id]).forEach(x => out.add(x));
    }
    return [...out];
}

// =============================================
// 🗡️ MODO RPG — combate por turnos (héroe vs monstruo)
// Cada ronda: se ve la INTENCIÓN del monstruo, actúa el héroe y, si el monstruo sigue en pie, ejecuta esa intención.
// =============================================
export const RPG_COMBAT_TYPES = ['monster', 'subboss', 'boss'];

export const RPG_SKILLS = {
    fire_strike: {
        id: 'fire_strike', name: 'Golpe de Fuego', icon: '🔥', element: 'Fuego',
        damage: 5, cooldown: 3,
        desc: 'Inflige 5 de daño de fuego.',
        describe: s => `Inflige ${s.damage} de daño de fuego.${s.burn ? ` Quema ${s.burn.dmg} por ronda durante ${s.burn.turns} rondas.` : ''}`
    }
};

// Quemadura del Golpe de Fuego: la dan los rasgos «skill_burn» (rondas que suman) y la legendaria «pyre»
function _skillBurn(hero, skillId) {
    if (skillId !== 'fire_strike') return null;
    const turns = ruleSum(hero, 'skill_burn');
    const pyre = ruleSum(hero, 'pyre');
    if (!turns && !pyre) return null;
    return { dmg: pyre || 2, turns: Math.max(turns, pyre ? 3 : 0) };
}

/** Habilidad con las mejoras del héroe (y, si se pasa el combate, el bonus del primer turno) aplicadas. */
export function rpgSkillInfo(hero, skillId, combat = null) {
    const skill = RPG_SKILLS[skillId];
    if (!skill) return null;
    const mods = (hero && hero.skillMods && hero.skillMods[skillId]) || {};
    let bonus = mods.damage || 0;
    if (skillId === 'fire_strike') {
        if (hasRule(hero, 'pyre')) bonus += 2;
        if (combat && combat.turn === 1) bonus += ruleSum(hero, 'first_turn_focus');
    }
    const info = { ...skill, damage: skill.damage + bonus, cooldown: Math.max(1, skill.cooldown + (mods.cooldown || 0)), burn: _skillBurn(hero, skillId) };
    info.desc = skill.describe ? skill.describe(info) : skill.desc;
    return info;
}

export function createRpgMonster(type, floor, tier = 0, variantIds = null) {
    const f = Math.max(0, floor | 0);
    const t = Math.max(0, tier | 0);
    const stats = rpgMonsterStats(type, f, t);
    const def = pickMonsterDef(type, f, t);
    const color = type === 'boss' ? '#f97316' : type === 'subboss' ? '#a78bfa' : '#ef4444';
    const monster = {
        type, floor: f, tier: t,
        name: def.name,
        baseName: def.name,   // la clave del bestiario: «Ogro Colérico» se anota como «Ogro»
        icon: def.icon, color,
        atq: stats.atq, hp: stats.hp, maxHp: stats.hp,
        pattern: def.pattern
    };
    return variantIds ? applyMonsterVariants(monster, variantIds) : monster;
}

/**
 * Aplica un adjetivo y/o un linaje a un monstruo ya creado: multiplica sus estadísticas y su
 * recompensa, transforma su patrón y le deja las reglas de combate en `monster.rules`.
 * Las resistencias SUMAN cuando las dan las dos tablas; el resto de reglas, la última gana.
 */
export function applyMonsterVariants(monster, ids) {
    const adj = ids && ids.adj ? ADJECTIVES_BY_ID[ids.adj] : null;
    const lin = ids && ids.lin ? LINEAGES_BY_ID[ids.lin] : null;
    if (!adj && !lin) return monster;

    let atkMul = 1, hpMul = 1, goldMul = 1, xpMul = 1;
    const rules = {};
    let pattern = monster.pattern;
    for (const v of [adj, lin]) {
        if (!v) continue;
        atkMul *= v.atkMul || 1;
        hpMul *= v.hpMul || 1;
        goldMul *= v.goldMul || 1;
        xpMul *= v.xpMul || 1;
        if (v.pattern) pattern = v.pattern(pattern);
        for (const [k, val] of Object.entries(v.rules || {})) {
            rules[k] = (k === 'physResist' || k === 'elemResist') ? (rules[k] || 0) + val : val;
        }
    }
    monster.atq = Math.max(1, Math.round(monster.atq * atkMul));
    monster.maxHp = Math.max(1, Math.round(monster.maxHp * hpMul));
    monster.hp = monster.maxHp;
    monster.pattern = pattern;
    monster.rules = rules;
    monster.goldMul = goldMul;
    monster.xpMul = xpMul;
    monster.variants = { adj: adj ? adj.id : null, lin: lin ? lin.id : null };
    monster.name = [monster.baseName, adj && adj.name, lin && lin.name].filter(Boolean).join(' ');
    return monster;
}

// Hash estable de un texto a [0, 1). NO usa el generador de la partida a propósito: si consumiera
// azar del motor, cambiaría todos los mapas ya existentes y rompería las comprobaciones exactas.
function _hash01(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000003) / 1000003;
}

/**
 * Qué variantes le tocan al monstruo de un nodo. Es determinista (misma semilla y mismo nodo →
 * mismo monstruo, siempre) y la probabilidad crece con el tramo: bajar no es solo más difícil,
 * es más raro. Devuelve {} cuando el monstruo sale limpio, que es lo más habitual arriba.
 */
export function pickMonsterVariants(seed, nodeId, tier = 0, floor = null) {
    const t = Math.max(0, tier | 0);
    // Los primeros pisos de la mazmorra de siempre son la puerta de entrada al juego: ahí nunca hay
    // variantes. Toparte con un «Slime Certero de la Niebla» en el piso 1 sería una pésima bienvenida.
    if (t === 0 && floor !== null && floor < RPG_BALANCE.monster.easyFloors) return {};
    const V = RPG_BALANCE.variants;
    const chance = c => Math.min(c.max, c.base + c.perTier * t);
    const out = {};
    const adjPool = adjectivesFor(t);
    if (adjPool.length && _hash01(`${seed}|${nodeId}|adj`) < chance(V.adjChance)) {
        out.adj = adjPool[Math.floor(_hash01(`${seed}|${nodeId}|adj#`) * adjPool.length)].id;
    }
    const linPool = lineagesFor(t);
    if (linPool.length && _hash01(`${seed}|${nodeId}|lin`) < chance(V.lineageChance)) {
        out.lin = linPool[Math.floor(_hash01(`${seed}|${nodeId}|lin#`) * linPool.length)].id;
    }
    return out;
}

// --- Intenciones: lo que hará el monstruo en su turno ---
const DEFAULT_PATTERN = [{ k: 'attack', m: 1 }];

// Cuánto multiplica AHORA MISMO el daño del monstruo por sus variantes (furia al verse herido,
// sed de sangre). Se calcula al ELEGIR la intención, nunca al ejecutarla: así el número que ves
// sobre el enemigo sigue siendo exactamente el que te va a hacer.
function _rpgMonsterRage(monster) {
    const r = monster.rules;
    if (!r) return 1;
    let mul = 1;
    const pct = monster.hp / Math.max(1, monster.maxHp);
    if (r.rageBelow && pct <= r.rageBelow) mul *= r.rageAtkMul || 1.5;
    if (r.bloodlust) mul *= 1 + r.bloodlust * (1 - pct);
    return mul;
}

function _rpgPickIntent(monster, rng) {
    // «Cauto»: al verse perdido, su siguiente movimiento es curarse (una sola vez, y se ve venir)
    const r = monster.rules;
    if (r && r.healBelow && !monster.healUsed && monster.hp <= monster.maxHp * r.healBelow) {
        monster.healUsed = true;
        return { k: 'heal', p: r.healPct || 0.25 };
    }
    let move;
    if (monster.weights && monster.weights.length) {
        const total = monster.weights.reduce((s, [, w]) => s + w, 0);
        let roll = rng() * total;
        move = monster.weights[monster.weights.length - 1][0];
        for (const [mv, w] of monster.weights) { roll -= w; if (roll < 0) { move = mv; break; } }
    } else {
        const p = monster.pattern && monster.pattern.length ? monster.pattern : DEFAULT_PATTERN;
        move = p[(monster.step || 0) % p.length];
        monster.step = (monster.step || 0) + 1;
    }
    if (move.k === 'attack') {
        const m = move.m == null ? 1 : move.m;
        return { k: 'attack', m, dmg: Math.max(1, Math.round(monster.atq * m * _rpgMonsterRage(monster))) };
    }
    if (move.k === 'heal') return { k: 'heal', p: move.p == null ? 0.1 : move.p };
    return { k: move.k };
}

// Curar al héroe sin pasar de su vida máxima; devuelve lo que curó de verdad
function _healHero(hero, n) {
    const before = hero.hp;
    hero.hp = Math.min(hero.maxHp, hero.hp + Math.max(0, n));
    return hero.hp - before;
}

// Estado del combate que usan las reglas del equipo (ataques hechos, venganza, usos únicos…)
const _newCombatState = () => ({ attacks: 0, revenge: 0, frenzy: 0, lastStandUsed: false, determinationUsed: false });

export function createRpgCombat(hero, monster, rng = Math.random) {
    const combat = {
        hero, monster, rng,
        turn: 1,
        defending: false,
        cooldowns: Object.fromEntries(Object.keys(RPG_SKILLS).map(id => [id, 0])),
        lastAction: null, // para enemigos con IA que leen tus movimientos
        state: _newCombatState(),
        heroStatus: { burn: null, poison: 0 }, // lo que te hacen las variantes «de la Plaga» y «de las Brasas»
        potions: 0,       // las que llevas encima; quien crea el combate las pone y recoge las que sobren
        intro: [],        // lo que ocurre al empezar (el equipo puede curarte): la interfaz lo cuenta en el diario
        over: false,
        result: null // 'victory' | 'defeat' | 'fled'
    };
    monster.step = monster.step || 0;
    monster.status = { burn: null, poison: 0 };
    monster.intent = _rpgPickIntent(monster, rng);
    const heal = _healHero(hero, ruleSum(hero, 'combat_start_heal'));
    if (heal) combat.intro.push({ actor: 'hero', target: 'hero', kind: 'heal', amount: heal, text: `✨ ${hero.name} recupera ${heal} de vida al empezar.` });
    return combat;
}

/** Cómo se muestra la intención: { icon, label, value, kind, hint } */
export function rpgIntentView(monster) {
    const it = monster && monster.intent;
    if (!it) return null;
    if (it.k === 'attack') {
        const heavy = it.m >= 1.8;
        return { icon: heavy ? '💥' : '⚔️', label: heavy ? 'Golpe fuerte' : 'Ataca', value: it.dmg, kind: heavy ? 'heavy' : 'attack',
            hint: `Te hará ${it.dmg} de daño` };
    }
    if (it.k === 'charge') return { icon: '⚡', label: 'Reúne fuerzas', value: null, kind: 'charge', hint: 'No ataca ahora: prepara algo fuerte' };
    if (it.k === 'guard') return { icon: '🛡️', label: 'Se protege', value: null, kind: 'guard', hint: 'Recibirá la mitad de daño esta ronda' };
    if (it.k === 'heal') return { icon: '💚', label: 'Se cura', value: Math.max(1, Math.round(monster.maxHp * it.p)), kind: 'heal', hint: 'Recupera vida' };
    return { icon: '💤', label: 'Descansa', value: null, kind: 'rest', hint: 'No hace nada esta ronda' };
}

/**
 * Telegrafiado sin números: si lo próximo del enemigo es un golpe fuerte, una frase que lo avisa.
 * Devuelve { kind: 'heavy', text } o null. No dice cuánto hará ni gasta azar (la frase sale de la ronda).
 */
export function rpgTelegraph(combat) {
    if (!combat || combat.over) return null;
    const it = combat.monster && combat.monster.intent;
    if (!it || it.k !== 'attack' || it.m < HEAVY_TELL_MIN) return null;
    const text = HEAVY_TELLS[(combat.turn - 1) % HEAVY_TELLS.length].replace('{name}', combat.monster.name);
    return { kind: 'heavy', text };
}

export function rpgSkillReady(combat, skillId) {
    return !!RPG_SKILLS[skillId] && !!combat && combat.cooldowns[skillId] === 0 && !combat.hero.vows?.noSkills;
}

export function rpgCanFlee(combat) {
    return !!combat && !combat.over && combat.monster.type === 'monster' && !combat.hero.vows?.noFlee;
}

function _rpgHit(attacker) {
    return Math.max(1, attacker.atq);
}

// Si el monstruo se protege esta ronda, el daño del héroe se reduce a la mitad (redondeando hacia arriba)
function _rpgGuarded(combat, dmg) {
    return combat.monster.intent && combat.monster.intent.k === 'guard' ? Math.max(1, Math.ceil(dmg / 2)) : dmg;
}

// Resistencias de las variantes («Coriáceo» al daño físico, «Etéreo» al elemental). Los monstruos
// sin variante no tienen `rules`, así que esto devuelve el daño intacto y nada de lo de antes cambia.
function _rpgMonsterResist(combat, dmg, elemental) {
    const r = combat.monster.rules;
    if (!r) return dmg;
    const pct = elemental ? (r.elemResist || 0) : (r.physResist || 0);
    return pct > 0 ? Math.max(1, Math.round(dmg * (1 - pct))) : dmg;
}

// El tipo de daño del héroe lo marca su arma principal (sin arma elemental, es físico)
function _rpgHeroHitsElemental(hero) {
    const w = hero.equipment && hero.equipment.weapon;
    return !!(w && isElementalDamage(w.damaged));
}

// Defender: el golpe se reduce a la mitad (hacia arriba) y luego el escudo quita `guard` más
function _rpgDefended(hero, dmg) {
    return Math.max(0, Math.ceil(dmg / 2) - (hero.guard || 0));
}

// Crítico (DEX): en la base (sin invertir puntos) critChance es 0 y esto no consume ningún número aleatorio,
// así que no cambia nada de lo que ya pasaba antes de que existiera este sistema.
function _rpgRollCrit(combat, dmg) {
    const { hero } = combat;
    if (hero.critChance > 0 && combat.rng() < hero.critChance) {
        return { dmg: Math.max(dmg + 1, Math.round(dmg * (hero.critMult || 1.5))), crit: true };
    }
    return { dmg, crit: false };
}

// --- El golpe del héroe: ATK + reglas del equipo. `st` es el estado (se pasa una copia para previsualizar) ---
function _rpgStrikeDamage(combat, st, hpNow) {
    const { hero, monster } = combat;
    const weapon = hero.equipment && hero.equipment.weapon;
    let dmg = _rpgHit(hero) + st.revenge;
    if (weapon && weapon.damaged) {
        dmg += ruleSum(hero, 'damage_type_bonus', weapon.damaged);
        if (isElementalDamage(weapon.damaged)) dmg += hero.elemDmgBonus || 0; // el bono de INT solo con arma elemental
    }
    if (hasRule(hero, 'frenzy')) dmg += st.frenzy * ruleSum(hero, 'frenzy');
    if (st.attacks === 0) dmg *= Math.max(1, ruleMax(hero, 'first_attack_double'));
    const execute = ruleMax(hero, 'execute');
    if (execute && hpNow <= monster.maxHp * 0.2) dmg *= execute;
    return Math.max(1, Math.round(dmg));
}

// Un ataque = 1 golpe (2 con «golpe extra» en el primer turno). Devuelve el daño de cada golpe.
function _rpgAttackHits(combat, commit) {
    const st = commit ? combat.state : { ...combat.state };
    const strikes = 1 + (combat.turn === 1 ? ruleSum(combat.hero, 'extra_strike') : 0);
    const hits = [];
    const elemental = _rpgHeroHitsElemental(combat.hero);
    let hp = combat.monster.hp;
    for (let i = 0; i < strikes && hp > 0; i++) {
        const dmg = _rpgGuarded(combat, _rpgMonsterResist(combat, _rpgStrikeDamage(combat, st, hp), elemental));
        hits.push(dmg);
        hp -= dmg;
        st.attacks++; st.revenge = 0; st.frenzy++;
    }
    return hits;
}

/** Daño de cada golpe que haría ahora Atacar (teniendo en cuenta protección y reglas del equipo). */
export function rpgAttackHits(combat) {
    return _rpgAttackHits(combat, false);
}

/** Daño total que haría ahora un ataque normal del héroe. */
export function rpgAttackPreview(combat) {
    return rpgAttackHits(combat).reduce((a, b) => a + b, 0);
}

/** Daño que recibiría el héroe ahora mismo (0 si el monstruo no ataca). `defending` = si se defiende.
 *  No cuenta la esquiva (es al azar); sí cuenta la resistencia física, que es fija. */
export function rpgIncomingPreview(combat, defending = false) {
    const it = combat.monster.intent;
    if (!it || it.k !== 'attack') return 0;
    const pierce = combat.monster.rules && combat.monster.rules.pierceGuard;  // «Certero»: defenderse no reduce nada
    let dmg = (defending && !pierce) ? _rpgDefended(combat.hero, it.dmg) : it.dmg;
    if (combat.hero.physResist > 0) dmg = Math.max(0, Math.round(dmg * (1 - combat.hero.physResist)));
    return dmg;
}

// Icono del tipo de daño del arma (🗡️ Filo, 🔥 Fuego…) para los textos del combate
function _rpgWeaponIcon(hero) {
    const w = hero.equipment && hero.equipment.weapon;
    return (w && DAMAGE_TYPES[w.damaged] && DAMAGE_TYPES[w.damaged].icon) || '🗡️';
}

function _applyBurn(monster, dmg, turns) {
    const cur = monster.status.burn;
    monster.status.burn = { dmg: Math.max(dmg, cur ? cur.dmg : 0), turns: Math.max(turns, cur ? cur.turns : 0) };
}

// Efectos de «al golpear»: veneno, quemadura y robo de vida
function _rpgOnHit(combat, dmg, events) {
    const { hero, monster } = combat;
    const poison = ruleSum(hero, 'poison_on_hit');
    if (poison) monster.status.poison += poison;
    const burn = ruleSum(hero, 'burn_on_hit');
    if (burn) _applyBurn(monster, burn, 2);
    const steal = ruleSum(hero, 'lifesteal');
    if (steal) {
        const healed = _healHero(hero, Math.max(1, Math.round(dmg * steal)));
        if (healed) events.push({ actor: 'hero', target: 'hero', kind: 'heal', amount: healed, text: `🩸 ${hero.name} roba ${healed} de vida.` });
    }
}

// Efectos de las variantes cuando el MONSTRUO acierta: robo de vida y estados sobre el héroe.
function _rpgMonsterOnHit(combat, dmg, events) {
    const { hero, monster } = combat;
    const r = monster.rules;
    if (!r) return;
    if (r.lifesteal) {
        const healed = Math.min(monster.maxHp - monster.hp, Math.max(1, Math.round(dmg * r.lifesteal)));
        if (healed > 0) {
            monster.hp += healed;
            events.push({ actor: 'monster', target: 'monster', kind: 'heal', amount: healed,
                text: `🩸 ${monster.name} se alimenta y recupera ${healed} de vida.` });
        }
    }
    if (r.poisonOnHit) {
        combat.heroStatus.poison += r.poisonOnHit;
        events.push({ actor: 'monster', target: 'hero', kind: 'status', amount: 0,
            text: `☠️ ${hero.name} queda envenenado (${combat.heroStatus.poison} por ronda).` });
    }
    if (r.burnOnHit) {
        const cur = combat.heroStatus.burn;
        combat.heroStatus.burn = {
            dmg: Math.max(r.burnOnHit.dmg, cur ? cur.dmg : 0),
            turns: Math.max(r.burnOnHit.turns, cur ? cur.turns : 0)
        };
        events.push({ actor: 'monster', target: 'hero', kind: 'status', amount: 0,
            text: `🔥 ${hero.name} arde (${combat.heroStatus.burn.dmg} por ronda, ${combat.heroStatus.burn.turns} rondas).` });
    }
}

// Veneno y quemadura SOBRE EL HÉROE (variantes «de la Plaga» y «de las Brasas»), al cerrar la ronda
function _rpgTickHeroStatuses(combat, events) {
    const { hero } = combat;
    const s = combat.heroStatus;
    if (!s) return;
    if (s.burn) {
        const dmg = Math.min(hero.hp, s.burn.dmg);
        hero.hp -= dmg;
        s.burn.turns--;
        if (s.burn.turns <= 0) s.burn = null;
        if (dmg > 0) events.push({ actor: 'monster', target: 'hero', kind: 'burn', amount: dmg, text: `🔥 ${hero.name} sufre ${dmg} de quemadura.` });
    }
    if (s.poison > 0 && hero.hp > 0) {
        const dmg = Math.min(hero.hp, s.poison);
        hero.hp -= dmg;
        events.push({ actor: 'monster', target: 'hero', kind: 'poison', amount: dmg, text: `☠️ ${hero.name} sufre ${dmg} de veneno.` });
    }
}

function _rpgStatusSummary(monster, events, poisonBefore, burnBefore) {
    const s = monster.status;
    if (s.poison > poisonBefore) events.push({ actor: 'hero', target: 'monster', kind: 'status', amount: 0, text: `☠️ ${monster.name} está envenenado (${s.poison} por ronda).` });
    if (s.burn && (!burnBefore || s.burn.turns > burnBefore.turns || s.burn.dmg > burnBefore.dmg)) {
        events.push({ actor: 'hero', target: 'monster', kind: 'status', amount: 0, text: `🔥 ${monster.name} arde (${s.burn.dmg} por ronda, ${s.burn.turns} rondas).` });
    }
}

// Al final de la acción del héroe, veneno y quemadura hacen su daño (el enemigo no responde si cae)
function _rpgTickStatuses(combat, events) {
    const m = combat.monster;
    const s = m.status;
    if (s.burn) {
        const dmg = Math.min(m.hp, s.burn.dmg);
        m.hp -= dmg;
        s.burn.turns--;
        if (s.burn.turns <= 0) s.burn = null;
        if (dmg > 0) events.push({ actor: 'hero', target: 'monster', kind: 'burn', amount: dmg, text: `🔥 ${m.name} sufre ${dmg} de quemadura.` });
    }
    if (s.poison > 0 && m.hp > 0) {
        const dmg = Math.min(m.hp, s.poison);
        m.hp -= dmg;
        events.push({ actor: 'hero', target: 'monster', kind: 'poison', amount: dmg, text: `☠️ ${m.name} sufre ${dmg} de veneno.` });
    }
}

function _rpgVictory(combat, events) {
    const { hero, monster } = combat;
    combat.over = true;
    combat.result = 'victory';
    events.push({ actor: 'monster', target: 'monster', kind: 'defeat', amount: 0, text: `✨ ${monster.name} ha sido derrotado.` });
    // «de los Huesos»: al caer te asesta un último golpe. Nunca mata (ganar y morir a la vez sería absurdo).
    const dying = monster.rules && monster.rules.deathBlow;
    if (dying) {
        const dmg = Math.min(hero.hp - 1, Math.max(1, Math.round(monster.atq * dying)));
        if (dmg > 0) {
            hero.hp -= dmg;
            events.push({ actor: 'monster', target: 'hero', kind: 'attack', amount: dmg,
                text: `🦴 Al caer, ${monster.name} te asesta un último golpe: ${dmg} de daño.` });
        }
    }
    const healed = _healHero(hero, ruleSum(hero, 'victory_heal'));
    if (healed) events.push({ actor: 'hero', target: 'hero', kind: 'heal', amount: healed, text: `🌿 ${hero.name} recupera ${healed} de vida al vencer.` });
    return { ok: true, events, over: true, result: 'victory' };
}

// El héroe recibe un golpe: reglas de «última defensa», «venganza» y «determinación»
function _rpgHeroTakesHit(combat, dmg, events) {
    const { hero } = combat;
    const st = combat.state;
    if (dmg > 0 && hero.hp - dmg <= 0 && hasRule(hero, 'last_stand') && !st.lastStandUsed) {
        st.lastStandUsed = true;
        dmg = hero.hp - 1;
        events.push({ actor: 'hero', target: 'hero', kind: 'rule', amount: 0, text: `🛡️ ¡Última defensa! ${hero.name} resiste con 1 de vida.` });
    }
    hero.hp = Math.max(0, hero.hp - dmg);
    if (dmg > 0 && hero.hp > 0) {
        st.revenge = ruleSum(hero, 'revenge');
        if (!st.determinationUsed && hasRule(hero, 'determination') && hero.hp <= hero.maxHp / 2) {
            st.determinationUsed = true;
            const healed = _healHero(hero, ruleSum(hero, 'determination'));
            if (healed) events.push({ actor: 'hero', target: 'hero', kind: 'heal', amount: healed, text: `💞 Determinación: ${hero.name} recupera ${healed} de vida.` });
        }
    }
    return dmg;
}

/**
 * Resuelve una acción del héroe y la respuesta del monstruo (la intención que se veía).
 * action: 'attack' | 'defend' | 'skill' | 'potion' | 'flee'
 * Devuelve { ok, error?, events, over, result }. Cada evento: { actor, target, kind, amount, text }
 */
export function rpgCombatAction(combat, action, skillId = 'fire_strike') {
    if (!combat || combat.over) return { ok: false, error: 'El combate ya terminó.', events: [], over: true, result: combat ? combat.result : null };
    const { hero, monster } = combat;
    const events = [];
    let usedSkill = null;
    const guarded = monster.intent && monster.intent.k === 'guard';
    const guardNote = guarded ? ' (se protege: la mitad)' : '';
    const poisonBefore = monster.status.poison;
    const burnBefore = monster.status.burn && { ...monster.status.burn };

    if (action === 'attack') {
        const icon = _rpgWeaponIcon(hero);
        const mRules = monster.rules || {};
        const hits = _rpgAttackHits(combat, true).map(dmg => _rpgRollCrit(combat, dmg));
        hits.forEach(({ dmg, crit }) => {
            // «Escurridizo»: sin variante la probabilidad es 0 y el dado no llega a tirarse
            if (mRules.dodge > 0 && combat.rng() < mRules.dodge) {
                events.push({ actor: 'monster', target: 'monster', kind: 'dodge', amount: 0,
                    text: `💨 ${monster.name} esquiva el golpe de ${hero.name}.` });
                return;
            }
            monster.hp = Math.max(0, monster.hp - dmg);
            events.push({ actor: 'hero', target: 'monster', kind: crit ? 'crit' : 'attack', amount: dmg,
                text: `${icon} ${hero.name} ataca a ${monster.name}: ${dmg} de daño${crit ? ' 💥 ¡CRÍTICO!' : ''}${guardNote}.` });
            _rpgOnHit(combat, dmg, events);
            // «Espinoso»: te hiere al golpearle. Nunca te mata: morir por tu propio ataque sería injusto.
            if (mRules.thorns && hero.hp > 1) {
                const back = Math.min(hero.hp - 1, mRules.thorns);
                hero.hp -= back;
                events.push({ actor: 'monster', target: 'hero', kind: 'thorns', amount: back,
                    text: `🌵 Las púas de ${monster.name} te hieren: ${back} de daño.` });
            }
        });
        _rpgStatusSummary(monster, events, poisonBefore, burnBefore);
    } else if (action === 'skill') {
        const skill = RPG_SKILLS[skillId];
        if (!skill) return { ok: false, error: 'Habilidad desconocida.', events: [], over: false, result: null };
        if (hero.vows?.noSkills) return { ok: false, error: 'Tu voto de silencio te impide usar habilidades.', events: [], over: false, result: null };
        if (!rpgSkillReady(combat, skillId)) {
            return { ok: false, error: `${skill.name} se está enfriando (${combat.cooldowns[skillId]}).`, events: [], over: false, result: null };
        }
        const info = rpgSkillInfo(hero, skillId, combat);
        const { dmg, crit } = _rpgRollCrit(combat, _rpgGuarded(combat, _rpgMonsterResist(combat, info.damage, true)));
        monster.hp = Math.max(0, monster.hp - dmg);
        combat.cooldowns[skillId] = info.cooldown;
        usedSkill = skillId;
        combat.state.frenzy = 0;
        events.push({ actor: 'hero', target: 'monster', kind: 'skill', amount: dmg, text: `${skill.icon} ${hero.name} usa ${skill.name}: ${dmg} de daño de fuego${crit ? ' 💥 ¡CRÍTICO!' : ''}${guardNote}.` });
        if (info.burn) _applyBurn(monster, info.burn.dmg, info.burn.turns);
        _rpgStatusSummary(monster, events, poisonBefore, burnBefore);
    } else if (action === 'defend') {
        combat.defending = true;
        combat.state.frenzy = 0;
        events.push({ actor: 'hero', target: 'hero', kind: 'defend', amount: 0, text: `🛡️ ${hero.name} se defiende: el golpe de esta ronda hará la mitad${hero.guard ? ` y ${hero.guard} menos` : ''}.` });
        const healed = _healHero(hero, ruleSum(hero, 'defend_heal'));
        if (healed) events.push({ actor: 'hero', target: 'hero', kind: 'heal', amount: healed, text: `💚 ${hero.name} recupera ${healed} de vida al defenderse.` });
    } else if (action === 'flee') {
        if (hero.vows?.noFlee) return { ok: false, error: 'Tu voto de acero te impide huir.', events: [], over: false, result: null };
        if (!rpgCanFlee(combat)) return { ok: false, error: 'No se puede huir de este combate.', events: [], over: false, result: null };
        if (hasRule(hero, 'flee_safe')) {
            events.push({ actor: 'monster', target: 'hero', kind: 'attack', amount: 0, text: `🏃 ${hero.name} huye sin que ${monster.name} llegue a tocarle.` });
            combat.over = true;
            combat.result = 'fled';
            return { ok: true, events, over: true, result: 'fled' };
        }
        const dmg = _rpgHit(monster);
        hero.hp = Math.max(0, hero.hp - dmg);
        events.push({ actor: 'monster', target: 'hero', kind: 'attack', amount: dmg, text: `${monster.icon} ${monster.name} te golpea mientras huyes: ${dmg} de daño.` });
        combat.over = true;
        combat.result = hero.hp <= 0 ? 'defeat' : 'fled';
        events.push({ actor: 'hero', target: 'hero', kind: combat.result === 'fled' ? 'flee' : 'defeat', amount: 0,
            text: combat.result === 'fled' ? `🏃 ${hero.name} huye del combate.` : `💀 ${hero.name} cae al huir.` });
        return { ok: true, events, over: true, result: combat.result };
    } else if (action === 'potion') {
        if (!(combat.potions > 0)) return { ok: false, error: 'No te quedan pociones.', events: [], over: false, result: null };
        if (hero.hp >= hero.maxHp) return { ok: false, error: 'Ya tienes la vida al máximo.', events: [], over: false, result: null };
        combat.potions--;
        combat.state.frenzy = 0;
        const healed = _healHero(hero, Math.max(1, Math.round(hero.maxHp * RPG_BALANCE.potion.heal)));
        events.push({ actor: 'hero', target: 'hero', kind: 'heal', amount: healed, text: `🧪 ${hero.name} bebe una poción: recupera ${healed} de vida.` });
    } else {
        return { ok: false, error: 'Acción desconocida.', events: [], over: false, result: null };
    }

    if (monster.hp <= 0) return _rpgVictory(combat, events);

    // Veneno y quemadura: si el enemigo cae, no llega a responder
    _rpgTickStatuses(combat, events);
    if (monster.hp <= 0) return _rpgVictory(combat, events);

    // Enemigo que lee tus movimientos: si repites la acción, su golpe hace el doble
    const repeated = monster.ai === 'reader' && combat.lastAction === action && !hasRule(hero, 'reader_shield');
    combat.lastAction = action;

    // Respuesta del monstruo: ejecuta EXACTAMENTE la intención que se veía
    const intent = monster.intent || { k: 'attack', m: 1, dmg: _rpgHit(monster) };
    if (intent.k === 'attack') {
        let dmg = intent.dmg;
        if (repeated) {
            dmg *= 2;
            events.push({ actor: 'monster', target: 'monster', kind: 'read', amount: 0, text: `👁️ ${monster.name} lee tus movimientos: ¡has repetido la acción y su golpe será doble!` });
        }
        const mRules = monster.rules || {};
        // «de la Niebla»: su primer golpe del combate hace el doble (la emboscada se gasta aunque lo esquives)
        const ambush = mRules.ambush && !combat.state.ambushDone;
        if (ambush) {
            dmg = Math.round(dmg * mRules.ambush);
            combat.state.ambushDone = true;
            events.push({ actor: 'monster', target: 'monster', kind: 'ambush', amount: 0, text: `🌫️ ${monster.name} surge de la niebla: ¡su primer golpe hace el doble!` });
        }
        // Esquiva (DEX): si esquivas, el golpe no llega y no hay nada más que mitigar
        const dodged = hero.dodgeChance > 0 && combat.rng() < hero.dodgeChance;
        const halved = combat.defending && !mRules.pierceGuard;   // «Certero»: defenderse no sirve
        if (dodged) dmg = 0;
        else {
            if (halved) dmg = _rpgDefended(hero, dmg);
            if (hero.physResist > 0) dmg = Math.max(0, Math.round(dmg * (1 - hero.physResist))); // resistencia física (VIT)
        }
        dmg = _rpgHeroTakesHit(combat, dmg, events);
        const pierced = combat.defending && mRules.pierceGuard;
        events.push({ actor: 'monster', target: 'hero', kind: 'attack', amount: dmg,
            text: dodged ? `💨 ${hero.name} esquiva el golpe de ${monster.name}.`
                : `${monster.icon} ${monster.name} golpea a ${hero.name}: ${dmg} de daño${halved ? ' (reducido al defender)' : ''}${pierced ? ' (¡atraviesa tu defensa!)' : ''}.` });
        if (!dodged && dmg > 0) _rpgMonsterOnHit(combat, dmg, events);
        // Espinas: mientras defiendes, quien te golpea recibe daño
        const thorns = (!dodged && halved) ? ruleSum(hero, 'thorns') : 0;
        if (thorns && hero.hp > 0) {
            const back = Math.min(monster.hp, thorns);
            monster.hp -= back;
            events.push({ actor: 'hero', target: 'monster', kind: 'thorns', amount: back, text: `🌹 Las espinas de ${hero.name} hieren a ${monster.name}: ${back} de daño.` });
        }
    } else if (intent.k === 'charge') {
        events.push({ actor: 'monster', target: 'monster', kind: 'charge', amount: 0, text: `⚡ ${monster.name} reúne fuerzas.` });
    } else if (intent.k === 'guard') {
        events.push({ actor: 'monster', target: 'monster', kind: 'guard', amount: 0, text: `🛡️ ${monster.name} se protege.` });
    } else if (intent.k === 'heal') {
        const amount = Math.min(monster.maxHp - monster.hp, Math.max(1, Math.round(monster.maxHp * intent.p)));
        monster.hp += amount;
        events.push({ actor: 'monster', target: 'monster', kind: 'heal', amount, text: `💚 ${monster.name} se cura ${amount} de vida.` });
    } else {
        events.push({ actor: 'monster', target: 'monster', kind: 'rest', amount: 0, text: `💤 ${monster.name} descansa.` });
    }
    combat.defending = false;
    _rpgTickHeroStatuses(combat, events);

    if (hero.hp <= 0) {
        combat.over = true;
        combat.result = 'defeat';
        events.push({ actor: 'hero', target: 'hero', kind: 'defeat', amount: 0, text: `💀 ${hero.name} ha caído.` });
        return { ok: true, events, over: true, result: 'defeat' };
    }
    if (monster.hp <= 0) return _rpgVictory(combat, events);   // las espinas pueden rematarlo

    // Fin de ronda: enfriar habilidades (la usada esta ronda empieza a enfriarse en la siguiente)
    for (const id of Object.keys(combat.cooldowns)) {
        if (id !== usedSkill && combat.cooldowns[id] > 0) combat.cooldowns[id]--;
    }
    combat.turn++;
    monster.intent = _rpgPickIntent(monster, combat.rng || Math.random); // la siguiente intención, visible desde ya
    return { ok: true, events, over: false, result: null };
}

// Recompensa provisional de victoria (para que el héroe crezca y la ruta sea recorrible)
export function rpgVictoryReward(type) {
    const V = RPG_BALANCE.victory;
    if (type === 'subboss') return { ...V.subboss };
    if (type === 'boss' || type === 'event') return { atq: 0, hp: 0, level: 0 };
    return { ...V.monster };
}

export function applyRpgReward(hero, reward) {
    hero.atq += reward.atq;
    hero.maxHp += reward.hp;
    hero.hp = Math.min(hero.maxHp, hero.hp + reward.hp);
    if (reward.atq || reward.hp || reward.level) hero.level += reward.level || 1;
    return hero;
}

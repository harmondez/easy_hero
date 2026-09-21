// =============================================
// 🗡️ RPG-pack — motor (puro, sin DOM)
// Solo atributos básicos: ATK / HP. Nada del Easy Hit original: sin Fervor,
// pasivas de carta, ultimates ni catálogo de campeones.
// =============================================

// Escala propia (números pequeños). Todas las partidas empiezan con el MISMO héroe y las mismas
// estadísticas; según los caminos que se tomen se va haciendo más fuerte (y, más adelante,
// se especializa en guerrero, pícaro o elementalista).
export const RPG_HERO_BASE = {
    name: 'Héroe', icon: '🗡️', color: '#fbbf24',
    atq: 1, hp: 25
};

// vows: renuncias permanentes (noFlee, noSkills) · skillMods: mejoras de habilidades · affinity: hacia dónde se inclina el build
export function createRpgHero() {
    return {
        ...RPG_HERO_BASE, maxHp: RPG_HERO_BASE.hp, level: 1,
        vows: {}, skillMods: {}, affinity: { guerrero: 0, picaro: 0, elementalista: 0 }
    };
}

// Monstruos: los primeros pisos son más débiles que el héroe inicial y escalan piso a piso.
// (sub-jefe y jefe final multiplican la base del piso donde aparecen)
export function rpgMonsterStats(type, floor) {
    const f = Math.max(0, floor | 0);
    const base = { atq: 1 + Math.floor(f / 2), hp: 6 + 3 * f };
    if (type === 'subboss') return { atq: base.atq + 2, hp: Math.round(base.hp * 2.5) };
    if (type === 'boss') return { atq: base.atq + 5, hp: Math.round(base.hp * 3.5) };
    return base;
}

export const RPG_NODE_TYPES = {
    monster: { id: 'monster', name: 'Monstruo', icon: '👹', desc: 'Combate contra un monstruo.' },
    chest:   { id: 'chest',   name: 'Cofre',    icon: '🧰', desc: 'Un cofre con botín.' },
    event:   { id: 'event',   name: 'Evento',   icon: '🎲', desc: 'Una situación con dos decisiones.' },
    subboss: { id: 'subboss', name: 'Sub-jefe', icon: '💀', desc: 'Combate difícil, mejor recompensa.' },
    boss:    { id: 'boss',    name: 'Jefe final', icon: '🐉', desc: 'El guardián del final de la ruta.' }
};

// floors incluye el piso del jefe final; paths = rutas que se trazan desde el piso 0
export const RPG_MAP_CONFIG = { floors: 16, cols: 7, paths: 6 };

// Todo camino de inicio a jefe pasa por al menos este número de eventos
export const RPG_MIN_EVENTS_PER_ROUTE = 3;

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
    const SUBBOSS_MIN_FLOOR = 4;

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
    const neighborTypes = n => [...parents.get(n.id), ...n.next].map(id => byId.get(id).type);

    for (const n of nodes) {
        if (n.floor === bossFloor) { n.type = 'boss'; continue; }
        if (n.floor === 0) { n.type = 'monster'; continue; }
        if (n.floor === lastRegular) { n.type = 'chest'; continue; }
        const parentTypes = parents.get(n.id).map(id => byId.get(id).type);
        const pool = [['monster', 45]];
        if (!parentTypes.includes('event')) pool.push(['event', 22]);
        if (n.floor < lastRegular - 1 && !parentTypes.includes('chest')) pool.push(['chest', 13]);
        if (n.floor >= SUBBOSS_MIN_FLOOR && !parentTypes.includes('subboss')) pool.push(['subboss', 20]);
        n.type = _rpgWeightedType(rng, pool);
    }

    const forceType = (type, minFloor, maxFloor) => {
        if (nodes.some(n => n.type === type && n.floor >= minFloor && n.floor <= maxFloor)) return;
        const candidates = nodes.filter(n => n.type === 'monster' && n.floor >= minFloor && n.floor <= maxFloor
            && !neighborTypes(n).includes(type));
        if (candidates.length) candidates[Math.floor(rng() * candidates.length)].type = type;
    };
    forceType('subboss', SUBBOSS_MIN_FLOOR, lastRegular - 1);
    forceType('chest', 1, lastRegular - 2);

    // Todo camino de inicio a jefe debe cruzar al menos RPG_MIN_EVENTS_PER_ROUTE eventos.
    // Búsqueda local: se toma un camino incompleto y se convierte en evento uno de sus monstruos;
    // si un evento vecino lo impide (no puede haber dos seguidos), ese vecino vuelve a ser monstruo.
    // Solo se conservan los cambios que no empeoran el déficit total (eventos que faltan sumando todos los caminos),
    // así que siempre termina.
    const MIN_EV = RPG_MIN_EVENTS_PER_ROUTE;
    const routeStats = () => {
        const best = new Map();  // id -> { count, route }: el camino con menos eventos desde ese nodo
        const walks = new Map(); // id -> nº de caminos hasta el jefe con k eventos (k = MIN_EV significa "MIN_EV o más")
        for (const n of [...nodes].sort((a, b) => b.floor - a.floor)) {
            const own = n.type === 'event' ? 1 : 0;
            const w = new Array(MIN_EV + 1).fill(0);
            if (!n.next.length) {
                best.set(n.id, { count: own, route: [n] });
                w[Math.min(MIN_EV, own)] = 1;
            } else {
                const child = n.next.map(id => best.get(id)).reduce((a, b) => (b.count < a.count ? b : a));
                best.set(n.id, { count: own + child.count, route: [n, ...child.route] });
                for (const id of n.next) walks.get(id).forEach((c, k) => { w[Math.min(MIN_EV, k + own)] += c; });
            }
            walks.set(n.id, w);
        }
        const starts = nodes.filter(n => n.floor === 0);
        const worst = starts.map(n => best.get(n.id)).reduce((a, b) => (b.count < a.count ? b : a));
        const shortfall = starts.reduce((t, n) => t + walks.get(n.id).reduce((x, c, k) => x + c * Math.max(0, MIN_EV - k), 0), 0);
        return { worst, shortfall };
    };
    let stats = routeStats();
    for (let attempt = nodes.length * 40; attempt > 0 && stats.shortfall > 0; attempt--) {
        const spots = stats.worst.route.filter(n => n.type === 'monster' && n.floor >= 1 && n.floor < lastRegular);
        if (!spots.length) break;
        const spot = spots[Math.floor(rng() * spots.length)];
        const blockers = [...parents.get(spot.id), ...spot.next].map(id => byId.get(id)).filter(n => n.type === 'event');
        spot.type = 'event';
        blockers.forEach(b => { b.type = 'monster'; });
        const trial = routeStats();
        if (trial.shortfall <= stats.shortfall) stats = trial;
        else {
            spot.type = 'monster';
            blockers.forEach(b => { b.type = 'event'; });
        }
    }

    return {
        floors, cols, nodes,
        bossId: getNode(bossFloor, bossCol).id,
        startIds: nodes.filter(n => n.floor === 0).map(n => n.id),
        eventShortfall: stats.shortfall
    };
}

// La búsqueda local casi siempre cumple el mínimo de eventos por camino; en el raro caso de que
// se atasque (~0,3 % de los mapas) se genera otro mapa.
export function generateRpgMap(rng = Math.random, cfg = RPG_MAP_CONFIG) {
    let map;
    for (let tries = 0; tries < 30; tries++) {
        map = _generateRpgMapOnce(rng, cfg);
        if (!map.eventShortfall) break;
    }
    delete map.eventShortfall;
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
// Cada ronda: actúa el héroe y, si el monstruo sigue en pie, responde.
// =============================================
export const RPG_COMBAT_TYPES = ['monster', 'subboss', 'boss'];

export const RPG_SKILLS = {
    fire_strike: {
        id: 'fire_strike', name: 'Golpe de Fuego', icon: '🔥', element: 'Fuego',
        damage: 5, cooldown: 3,
        desc: 'Inflige 5 de daño de fuego.',
        describe: s => `Inflige ${s.damage} de daño de fuego.`
    }
};

/** Habilidad con las mejoras del héroe aplicadas (daño y enfriamiento). */
export function rpgSkillInfo(hero, skillId) {
    const skill = RPG_SKILLS[skillId];
    if (!skill) return null;
    const mods = (hero && hero.skillMods && hero.skillMods[skillId]) || {};
    const info = { ...skill, damage: skill.damage + (mods.damage || 0), cooldown: Math.max(1, skill.cooldown + (mods.cooldown || 0)) };
    info.desc = skill.describe ? skill.describe(info) : skill.desc;
    return info;
}

const RPG_MONSTER_POOL = [
    ['Slime', '🟢'], ['Rata Gigante', '🐀'], ['Goblin', '👺'], ['Murciélago', '🦇'],
    ['Lobo', '🐺'], ['Esqueleto', '🦴'], ['Araña Venenosa', '🕷️'], ['Orco', '👹'], ['Gólem', '🗿']
];
const RPG_SUBBOSS_POOL = [['Minotauro', '🐂'], ['Bruja del Pantano', '🧙'], ['Caballero Caído', '⚔️']];

export function createRpgMonster(type, floor) {
    const f = Math.max(0, floor | 0);
    const stats = rpgMonsterStats(type, f);
    let name, icon, color;
    if (type === 'boss') { name = 'Dragón Ancestral'; icon = '🐉'; color = '#f97316'; }
    else if (type === 'subboss') { [name, icon] = RPG_SUBBOSS_POOL[f % RPG_SUBBOSS_POOL.length]; color = '#a78bfa'; }
    else { [name, icon] = RPG_MONSTER_POOL[Math.min(f, RPG_MONSTER_POOL.length - 1)]; color = '#ef4444'; }
    return { type, floor: f, name, icon, color, atq: stats.atq, hp: stats.hp, maxHp: stats.hp };
}

export function createRpgCombat(hero, monster) {
    return {
        hero, monster,
        turn: 1,
        defending: false,
        cooldowns: Object.fromEntries(Object.keys(RPG_SKILLS).map(id => [id, 0])),
        lastAction: null, // para enemigos con IA que leen tus movimientos
        over: false,
        result: null // 'victory' | 'defeat' | 'fled'
    };
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

/**
 * Resuelve una acción del héroe y la respuesta del monstruo.
 * action: 'attack' | 'defend' | 'skill' | 'flee'
 * Devuelve { ok, error?, events, over, result }. Cada evento: { actor, target, kind, amount, text }
 */
export function rpgCombatAction(combat, action, skillId = 'fire_strike') {
    if (!combat || combat.over) return { ok: false, error: 'El combate ya terminó.', events: [], over: true, result: combat ? combat.result : null };
    const { hero, monster } = combat;
    const events = [];
    let usedSkill = null;

    if (action === 'attack') {
        const dmg = _rpgHit(hero);
        monster.hp = Math.max(0, monster.hp - dmg);
        events.push({ actor: 'hero', target: 'monster', kind: 'attack', amount: dmg, text: `🗡️ ${hero.name} ataca a ${monster.name}: ${dmg} de daño.` });
    } else if (action === 'skill') {
        const skill = RPG_SKILLS[skillId];
        if (!skill) return { ok: false, error: 'Habilidad desconocida.', events: [], over: false, result: null };
        if (hero.vows?.noSkills) return { ok: false, error: 'Tu voto de silencio te impide usar habilidades.', events: [], over: false, result: null };
        if (!rpgSkillReady(combat, skillId)) {
            return { ok: false, error: `${skill.name} se está enfriando (${combat.cooldowns[skillId]}).`, events: [], over: false, result: null };
        }
        const info = rpgSkillInfo(hero, skillId);
        monster.hp = Math.max(0, monster.hp - info.damage);
        combat.cooldowns[skillId] = info.cooldown;
        usedSkill = skillId;
        events.push({ actor: 'hero', target: 'monster', kind: 'skill', amount: info.damage, text: `${skill.icon} ${hero.name} usa ${skill.name}: ${info.damage} de daño de fuego.` });
    } else if (action === 'defend') {
        combat.defending = true;
        events.push({ actor: 'hero', target: 'hero', kind: 'defend', amount: 0, text: `🛡️ ${hero.name} se defiende: el próximo golpe hará la mitad.` });
    } else if (action === 'flee') {
        if (hero.vows?.noFlee) return { ok: false, error: 'Tu voto de acero te impide huir.', events: [], over: false, result: null };
        if (!rpgCanFlee(combat)) return { ok: false, error: 'No se puede huir de este combate.', events: [], over: false, result: null };
        const dmg = _rpgHit(monster);
        hero.hp = Math.max(0, hero.hp - dmg);
        events.push({ actor: 'monster', target: 'hero', kind: 'attack', amount: dmg, text: `${monster.icon} ${monster.name} te golpea mientras huyes: ${dmg} de daño.` });
        combat.over = true;
        combat.result = hero.hp <= 0 ? 'defeat' : 'fled';
        events.push({ actor: 'hero', target: 'hero', kind: combat.result === 'fled' ? 'flee' : 'defeat', amount: 0,
            text: combat.result === 'fled' ? `🏃 ${hero.name} huye del combate.` : `💀 ${hero.name} cae al huir.` });
        return { ok: true, events, over: true, result: combat.result };
    } else {
        return { ok: false, error: 'Acción desconocida.', events: [], over: false, result: null };
    }

    if (monster.hp <= 0) {
        combat.over = true;
        combat.result = 'victory';
        events.push({ actor: 'monster', target: 'monster', kind: 'defeat', amount: 0, text: `✨ ${monster.name} ha sido derrotado.` });
        return { ok: true, events, over: true, result: 'victory' };
    }

    // Enemigo que lee tus movimientos: si repites la acción, su golpe hace el doble
    const repeated = monster.ai === 'reader' && combat.lastAction === action;
    combat.lastAction = action;

    // Respuesta del monstruo (defender reduce a la mitad, redondeando hacia arriba)
    let dmg = _rpgHit(monster);
    if (repeated) {
        dmg *= 2;
        events.push({ actor: 'monster', target: 'monster', kind: 'read', amount: 0, text: `👁️ ${monster.name} lee tus movimientos: ¡has repetido la acción y su golpe será doble!` });
    }
    const halved = combat.defending;
    if (halved) dmg = Math.ceil(dmg / 2);
    combat.defending = false;
    hero.hp = Math.max(0, hero.hp - dmg);
    events.push({ actor: 'monster', target: 'hero', kind: 'attack', amount: dmg,
        text: `${monster.icon} ${monster.name} golpea a ${hero.name}: ${dmg} de daño${halved ? ' (reducido al defender)' : ''}.` });

    if (hero.hp <= 0) {
        combat.over = true;
        combat.result = 'defeat';
        events.push({ actor: 'hero', target: 'hero', kind: 'defeat', amount: 0, text: `💀 ${hero.name} ha caído.` });
        return { ok: true, events, over: true, result: 'defeat' };
    }

    // Fin de ronda: enfriar habilidades (la usada esta ronda empieza a enfriarse en la siguiente)
    for (const id of Object.keys(combat.cooldowns)) {
        if (id !== usedSkill && combat.cooldowns[id] > 0) combat.cooldowns[id]--;
    }
    combat.turn++;
    return { ok: true, events, over: false, result: null };
}

// Recompensa provisional de victoria (para que el héroe crezca y la ruta sea recorrible)
export function rpgVictoryReward(type) {
    if (type === 'subboss') return { atq: 2, hp: 8 };
    if (type === 'boss' || type === 'event') return { atq: 0, hp: 0 };
    return { atq: 1, hp: 4 };
}

export function applyRpgReward(hero, reward) {
    hero.atq += reward.atq;
    hero.maxHp += reward.hp;
    hero.hp = Math.min(hero.maxHp, hero.hp + reward.hp);
    if (reward.atq || reward.hp) hero.level += 1;
    return hero;
}

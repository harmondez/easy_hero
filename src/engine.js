import { RPG_BALANCE } from './data/balance.js?v=1.2.0';
import { pickMonsterDef } from './data/monsters.js?v=1.2.0';
import { DAMAGE_TYPES, equipItem, createStarterItem, ruleSum, ruleMax, hasRule } from './items.js?v=1.2.0';

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
export function createRpgHero() {
    const hero = {
        ...RPG_HERO_BASE, maxHp: RPG_HERO_BASE.hp, level: 1, guard: 0,
        vows: {}, skillMods: {}, affinity: { guerrero: 0, picaro: 0, elementalista: 0 },
        equipment: { weapon: null, secondary: null, armor: null, accessory: null },
        inventory: [],   // hasta 10 objetos guardados sin equipar; se reinicia cada ruta
        trophy: null     // el objeto legendario del jefe final, si ya lo ganaste; lo rellena main.js desde el progreso persistente
    };
    equipItem(hero, createStarterItem());
    return hero;
}

// Monstruos: escalan piso a piso. Los primeros son el «grupo fácil».
// (sub-jefe y jefe final multiplican la base del piso donde aparecen). Los números viven en data/balance.js
export function rpgMonsterStats(type, floor) {
    const f = Math.max(0, floor | 0);
    const B = RPG_BALANCE;
    let atq = B.monster.atkBase + Math.floor(f * B.monster.atkPerFloor);
    let hp = Math.round(B.monster.hpBase + B.monster.hpPerFloor * f);
    if (f < B.monster.easyFloors && B.monster.easyFactor !== 1) {
        atq = Math.max(1, Math.round(atq * B.monster.easyFactor));
        hp = Math.max(1, Math.round(hp * B.monster.easyFactor));
    }
    if (type === 'subboss') return { atq: atq + B.subboss.atkBonus, hp: Math.round(hp * B.subboss.hpMul) };
    if (type === 'boss') return { atq: atq + B.boss.atkBonus, hp: Math.round(hp * B.boss.hpMul) };
    return { atq, hp };
}

export const RPG_NODE_TYPES = {
    monster:  { id: 'monster',  name: 'Monstruo', icon: '👹', desc: 'Combate contra un monstruo.' },
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
export function generateRpgMap(rng = Math.random, cfg = RPG_MAP_CONFIG) {
    let map;
    for (let tries = 0; tries < 40; tries++) {
        map = _generateRpgMapOnce(rng, cfg);
        if (!map.routeShortfall) break;
    }
    delete map.routeShortfall;
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

export function createRpgMonster(type, floor) {
    const f = Math.max(0, floor | 0);
    const stats = rpgMonsterStats(type, f);
    const def = pickMonsterDef(type, f);
    const color = type === 'boss' ? '#f97316' : type === 'subboss' ? '#a78bfa' : '#ef4444';
    return {
        type, floor: f, name: def.name, icon: def.icon, color,
        atq: stats.atq, hp: stats.hp, maxHp: stats.hp,
        pattern: def.pattern
    };
}

// --- Intenciones: lo que hará el monstruo en su turno ---
const DEFAULT_PATTERN = [{ k: 'attack', m: 1 }];

function _rpgPickIntent(monster, rng) {
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
        return { k: 'attack', m, dmg: Math.max(1, Math.round(monster.atq * m)) };
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

// Defender: el golpe se reduce a la mitad (hacia arriba) y luego el escudo quita `guard` más
function _rpgDefended(hero, dmg) {
    return Math.max(0, Math.ceil(dmg / 2) - (hero.guard || 0));
}

// --- El golpe del héroe: ATK + reglas del equipo. `st` es el estado (se pasa una copia para previsualizar) ---
function _rpgStrikeDamage(combat, st, hpNow) {
    const { hero, monster } = combat;
    const weapon = hero.equipment && hero.equipment.weapon;
    let dmg = _rpgHit(hero) + st.revenge;
    if (weapon && weapon.damaged) dmg += ruleSum(hero, 'damage_type_bonus', weapon.damaged);
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
    let hp = combat.monster.hp;
    for (let i = 0; i < strikes && hp > 0; i++) {
        const dmg = _rpgGuarded(combat, _rpgStrikeDamage(combat, st, hp));
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

/** Daño que recibiría el héroe ahora mismo (0 si el monstruo no ataca). `defending` = si se defiende. */
export function rpgIncomingPreview(combat, defending = false) {
    const it = combat.monster.intent;
    if (!it || it.k !== 'attack') return 0;
    return defending ? _rpgDefended(combat.hero, it.dmg) : it.dmg;
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
 * action: 'attack' | 'defend' | 'skill' | 'flee'
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
        const hits = _rpgAttackHits(combat, true);
        hits.forEach(dmg => {
            monster.hp = Math.max(0, monster.hp - dmg);
            events.push({ actor: 'hero', target: 'monster', kind: 'attack', amount: dmg, text: `${icon} ${hero.name} ataca a ${monster.name}: ${dmg} de daño${guardNote}.` });
            _rpgOnHit(combat, dmg, events);
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
        const dmg = _rpgGuarded(combat, info.damage);
        monster.hp = Math.max(0, monster.hp - dmg);
        combat.cooldowns[skillId] = info.cooldown;
        usedSkill = skillId;
        combat.state.frenzy = 0;
        events.push({ actor: 'hero', target: 'monster', kind: 'skill', amount: dmg, text: `${skill.icon} ${hero.name} usa ${skill.name}: ${dmg} de daño de fuego${guardNote}.` });
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
        const halved = combat.defending;
        if (halved) dmg = _rpgDefended(hero, dmg);
        dmg = _rpgHeroTakesHit(combat, dmg, events);
        events.push({ actor: 'monster', target: 'hero', kind: 'attack', amount: dmg,
            text: `${monster.icon} ${monster.name} golpea a ${hero.name}: ${dmg} de daño${halved ? ' (reducido al defender)' : ''}.` });
        // Espinas: mientras defiendes, quien te golpea recibe daño
        const thorns = halved ? ruleSum(hero, 'thorns') : 0;
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

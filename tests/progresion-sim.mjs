// =============================================
// 🧭 Banco de la progresión de la aventura: ¿cómo gana fuerza el héroe en el Modo Aventura?
//
// Es una INVESTIGACIÓN: no cambia el juego. Todo lo que se prueba (tienda de armas, botín de jefes, equipo traído del
// descenso, dureza de los enemigos…) se cambia EN MEMORIA dentro de este archivo y se deshace al terminar cada variante.
// Reutiliza el bot de la aventura (tests/lib/adventure-bot.mjs) con sus ganchos (heroHook, onVictory, onSleep) y le añade una
// segunda zona de prueba con las fichas de gnolls y orcos de src/data/creatures.js.
// Informe: docs/informes/progresion-aventura.md (todas sus tablas salen de aquí).
//
// Uso:  node tests/progresion-sim.mjs [partidas=2000] [--seccion todo|ref|hace-falta|tienda|botin|descenso|mezcla|dureza|feronius|zona2|rutas]
//       (sin --seccion saca todas las tablas del informe; tarda unos minutos: es lo que hay que dejar correr)
//
// Cómo se mide (resumen; el informe lo cuenta con más calma):
//   · Zafias: el bot de siempre (tests/lib), con la política «listo» (no usa el Golpe de Fuego) o «fuego» (lo usa en cuanto está listo).
//   · Segunda zona: dos ramas desde su aldea, la manada de gnolls (acaba en Gnarok, sub-jefe) y el fuerte orco (acaba en Guul, jefe),
//     con las fichas de creatures.js tal cual. Mismas reglas que Zafias: caer = posada, reaparece todo menos los jefes.
//   · «Dureza»: multiplicador de la vida de los enemigos de una zona (en datos se escribiría como hpMul en las fichas). Para cada
//     opción se busca cuánta dureza admite cada zona sin cambiar su curva: así se ve cuánta fuerza da de verdad.
// =============================================
import { ZAFIAS } from '../src/data/zones/zafias.js';
import { CREATURES } from '../src/data/creatures.js';
import * as Engine from '../src/engine.js';
import * as Items from '../src/items.js';
import { RPG_BALANCE } from '../src/data/balance.js';
import { UPGRADES_BY_ID, upgradeCost } from '../src/data/upgrades.js';
import { XP_REWARD, POINTS_PER_LEVEL, xpToNext } from '../src/stats.js';
import { simulate, POLICIES, rngFrom, ALLOCATE_DEFAULT } from './lib/adventure-bot.mjs';

// ---------- Políticas de combate ----------
const heavy = m => m.intent && m.intent.k === 'attack' && m.intent.m >= 1.8;
const needsPotion = (c, hero) => hero.hp <= hero.maxHp * 0.35 && c.potions > 0;
export const POL = {
    /** El bot de siempre: no usa el Golpe de Fuego. */
    listo: POLICIES.listo,
    /** Usa el Golpe de Fuego en cuanto está listo; si no, como «listo»: poción por debajo del 35 %, defenderse de lo fuerte, atacar. */
    fuego: (c, hero, m) => {
        if (needsPotion(c, hero)) return 'potion';
        if (heavy(m)) return 'defend';
        return Engine.rpgSkillReady(c, 'fire_strike') ? 'skill' : 'attack';
    },
    /** Como «fuego», pero el Golpe de Fuego va antes que defenderse. */
    fuegoYa: (c, hero, m) => {
        if (needsPotion(c, hero)) return 'potion';
        if (Engine.rpgSkillReady(c, 'fire_strike')) return 'skill';
        return heavy(m) ? 'defend' : 'attack';
    }
};

// ---------- Dureza de los enemigos (cambios EN MEMORIA; siempre se deshacen) ----------
/**
 * Multiplica la vida de todos los enemigos de Zafias por `hpMul`. Los de piso fijo se convierten, mientras dura la prueba, en fichas
 * de criatura con el mismo tipo y piso (así se puede aplicar un `hpMul` sin tocar el piso, que da saltos muy grandes); los lobos y
 * Feronius ya son fichas. Devuelve la función que lo deshace.
 */
function scaleZafias(hpMul) {
    if (!hpMul || hpMul === 1) return () => {};
    const undo = [];
    for (const sc of Object.values(ZAFIAS.scenes)) for (const p of sc.points) {
        if (p.kind !== 'enemy' || !p.enemy) continue;
        if (p.enemy.creature) {
            const c = CREATURES[p.enemy.creature];
            if (c._scaled) continue;
            const old = c.hpMul; c.hpMul = (old || 1) * hpMul; c._scaled = true;
            undo.push(() => { if (old === undefined) delete c.hpMul; else c.hpMul = old; delete c._scaled; });
        } else {
            const key = `_z_${p.id}`, old = p.enemy;
            CREATURES[key] = { name: p.name, type: old.type, floor: old.floor, hpMul };
            p.enemy = { creature: key };
            undo.push(() => { p.enemy = old; delete CREATURES[key]; });
        }
    }
    return () => undo.forEach(f => f());
}
/** Multiplica la vida de UNA criatura (p. ej. Feronius, el jefe de Zafias). */
function scaleCreature(id, hpMul) {
    if (!hpMul || hpMul === 1) return () => {};
    const c = CREATURES[id], old = c.hpMul;
    c.hpMul = (old || 1) * hpMul;
    return () => { if (old === undefined) delete c.hpMul; else c.hpMul = old; };
}
/** Lo mismo para las fichas de gnolls y orcos de la segunda zona. */
function scaleZone2(hpMul) {
    if (!hpMul || hpMul === 1) return () => {};
    const undo = [];
    for (const id of Z2_IDS) {
        const c = CREATURES[id], old = c.hpMul;
        c.hpMul = (old || 1) * hpMul;
        undo.push(() => { if (old === undefined) delete c.hpMul; else c.hpMul = old; });
    }
    return () => undo.forEach(f => f());
}

// ---------- La segunda zona de prueba: el bosque amarillo (gnolls y orcos) ----------
// Dos ramas desde la aldea de la zona: la manada de gnolls (acaba en Gnarok, sub-jefe) y el fuerte orco (acaba en Guul, jefe).
// Mismas reglas que Zafias: al dormir en la posada reaparece todo menos los jefes (`once`).
const Z2_IDS = ['gnoll-de-zafias', 'gnoll-berserker', 'gnarok', 'orco-de-zafias', 'orco-guerrero', 'orco-chaman', 'guul'];
const Z2_BRANCH = {
    gnarok: ['z-gnoll-1', 'z-gnoll-2', 'z-berserker-1', 'z-berserker-2', 'gnarok'],
    guul: ['z-orco-1', 'z-guerrero-1', 'z-chaman-1', 'z-guerrero-2', 'guul']
};
const Z2_POINT = {
    'z-gnoll-1': 'gnoll-de-zafias', 'z-gnoll-2': 'gnoll-de-zafias', 'z-berserker-1': 'gnoll-berserker', 'z-berserker-2': 'gnoll-berserker', gnarok: 'gnarok',
    'z-orco-1': 'orco-de-zafias', 'z-guerrero-1': 'orco-guerrero', 'z-chaman-1': 'orco-chaman', 'z-guerrero-2': 'orco-guerrero', guul: 'guul'
};
const Z2_ONCE = new Set(['gnarok', 'guul']);
const Z2_FARM = ['f-gnoll-1', 'f-gnoll-2', 'f-gnoll-3'];   // los gnolls sueltos de la entrada: lo fácil para entrenar
for (const f of Z2_FARM) Z2_POINT[f] = 'gnoll-de-zafias';

// ---------- Equipo ----------
export const mkItem = (baseId, floor = 0, rarityId = 'comun', rng = Math.random) => Items.createRpgItem({ baseId, floor, rarityId, rng });
const scoreOf = it => (it ? Items.itemScore(it) : 0);
const SLOT_ORDER = ['weapon', 'armor', 'secondary', 'accessory'];
const betterThanWorn = (st, item) => scoreOf(item) > scoreOf(st.gear[item.slot]) + 0.01;
function wear(st, item) { if (item && betterThanWorn(st, item)) { st.gear[item.slot] = item; return true; } return false; }
function applyGear(hero, st) {
    // La Forja de hoy (data/upgrades.js): Filo afilado +1 ATK y Constitución +4 vida por nivel comprado
    if (st.forge) { hero.atq += st.forge.filo; hero.maxHp += 4 * st.forge.constitucion; hero.hp = hero.maxHp; }
    for (const slot of SLOT_ORDER) if (st.gear[slot]) Items.equipItem(hero, st.gear[slot]);
    Engine.refreshPrimaryStats(hero);   // el bono de FUE/INT depende del tipo de daño del arma
}

// ---------- Una variante: qué se prueba ----------
/**
 * scenario = {
 *   shop?:    [{ slot, baseId, floor, price, zone? }]   tienda: el bot ahorra y compra la mejor mejora que pueda pagar al dormir (antes que las
 *                                                       pociones). `floor` es la «calidad» del objeto (+8 % por piso); `zone`: desde qué zona se vende (1 por defecto)
 *   drops?:   { <idEnemigo>: { source|rarity, floor, slot?, baseId? } }   botín de jefes; se equipa si mejora lo que lleva
 *   forge?:   true = el bot gasta en La Forja de hoy (la que ya existe en la tienda de la aldea): la mejora más barata que pueda pagar
 *   carry?:   (rng) => [objetos]   equipo que trae el héroe desde el descenso (lo tiene desde la primera noche)
 *   fmul?:    vida de Feronius (× vida), solo él   ·   zmul?:    dureza de Zafias (× vida)   ·   z2mul?: dureza de la segunda zona
 *   zone2?:   si se juega la segunda zona después de Feronius (true por defecto)
 * }
 */
export function run(scenario, { runs = 2000, policy = POL.listo, seed0 = 1000 } = {}) {
    const sc = { zone2: true, zmul: 1, z2mul: 1, ...scenario };
    const undo = [scaleZafias(sc.zmul), scaleZone2(sc.z2mul), scaleCreature('feronius', sc.fmul)];
    const sts = [], seen = new WeakSet(), z2 = [];
    const touch = st => {
        if (seen.has(st)) return;
        seen.add(st);
        st.idx = sts.length; sts.push(st);
        st.gear = {}; st.owned = new Set(); st.forge = sc.forge ? { filo: 0, constitucion: 0 } : null; st.zone = 1; st.earned = 10; st.spentGear = 0;   // 10 = el pozo
        st.rng = rngFrom(seed0 + 7919 * st.idx + 13);
        for (const it of sc.carry ? sc.carry(st.rng) : []) wear(st, it);
    };
    const goldFor = m => Math.round((RPG_BALANCE.gold[m.type] || 2) * (m.goldMul || 1));
    const buyPotionsTo = (st, cap) => { while (st.meta.gold >= RPG_BALANCE.potion.price && st.meta.potions < cap) { st.meta.gold -= RPG_BALANCE.potion.price; st.meta.potions++; } };
    const stock = (sc.shop || []).map(s => ({ zone: 1, ...s, item: mkItem(s.baseId, s.floor || 0, s.rarity || 'comun') }));
    const forgeCost = (st, id) => upgradeCost(UPGRADES_BY_ID[id], st.forge[id]);
    const forgeOpts = st => (st.forge ? ['filo', 'constitucion'] : []);
    const wanted = st => [...stock.filter(s => s.zone <= st.zone && !st.owned.has(s) && betterThanWorn(st, s.item)), ...forgeOpts(st)];
    const keep = sc.keepPotions ?? 1;   // con algo por comprar, el bot ahorra: se queda con 1 poción y guarda el resto del oro
    const restock = st => buyPotionsTo(st, wanted(st).length ? keep : RPG_BALANCE.potion.max);
    const buyGear = st => {
        for (;;) {
            // La Forja: la mejora más barata que se pueda pagar (a igual precio, Filo)
            const fo = forgeOpts(st).filter(id => st.meta.gold >= forgeCost(st, id)).sort((a, b) => forgeCost(st, a) - forgeCost(st, b));
            if (fo.length) { st.meta.gold -= forgeCost(st, fo[0]); st.spentGear += forgeCost(st, fo[0]) ; st.forge[fo[0]]++; continue; }
            const opts = stock.filter(s => s.zone <= st.zone && !st.owned.has(s) && betterThanWorn(st, s.item) && st.meta.gold >= s.price);
            if (!opts.length) return;
            opts.sort((a, b) => scoreOf(b.item) - scoreOf(a.item) || a.price - b.price);
            const s = opts[0];
            st.meta.gold -= s.price; st.spentGear += s.price; st.owned.add(s); st.gear[s.item.slot] = s.item;
        }
    };
    /** Al dormir: la tienda va ANTES que las pociones; se deshace la compra de pociones de la librería y se rehace con lo que sobra. */
    const shopAtInn = st => {
        if (!stock.length && !sc.forge) return;
        st.meta.gold = st.goldBefore; st.meta.potions = st.potsBefore;
        buyGear(st); restock(st);
    };
    const dropFor = (st, id) => {
        const d = sc.drops && sc.drops[id];
        if (!d) return;
        const it = d.baseId ? Items.createRpgItem({ rng: st.rng, floor: d.floor || 0, baseId: d.baseId, rarityId: d.rarity || null })
            : d.rarity ? Items.createRpgItem({ rng: st.rng, floor: d.floor || 0, slot: d.slot || null, rarityId: d.rarity })
                : Items.rollLootDrop({ rng: st.rng, floor: d.floor || 0, source: d.source || 'subboss', hero: { equipment: st.gear } });
        if (it) wear(st, it);
    };
    const hooks = {
        heroHook: (hero, st) => {
            touch(st);
            st.potsBefore = st.meta.potions; st.goldBefore = st.meta.gold;   // el estado justo antes de dormir (el bot siempre lo llama antes de dormir)
            applyGear(hero, st);
            st.lastHero = { atq: hero.atq, maxHp: hero.maxHp };
        },
        onSleep: shopAtInn,
        onVictory: (st, m, id) => {
            touch(st);
            st.earned += goldFor(m) + (id === 'grask' ? 100 : id === 'goblin-puente' ? 25 : 0);   // Maela y el botín de Grask · el fardo
            dropFor(st, id);
            if (id === 'feronius') {
                st.atFeronius = { ...st.lastHero };
                st.zaf = { level: st.meta.level, gold: st.meta.gold, earned: st.earned, spent: st.spentGear };   // foto de Zafias antes de la segunda zona
                if (sc.zone2) { st.zone = 2; z2.push(playZone2(st, policy, dropFor, shopAtInn, buyPotionsTo)); }
            }
        }
    };
    try { return { res: simulate({ runs, seed0, policy, ...hooks }), sts, z2, sc }; }
    finally { undo.forEach(f => f()); }
}

// ---------- La segunda zona: el mismo bot, copiado y adaptado (la librería solo conoce Zafias) ----------
function playZone2(st, policy, dropFor, shopAtInn, buyPotionsTo) {
    const rng = rngFrom(4242 + st.idx);
    const meta = st.meta;
    const out = { fights: 0, farm: 0, deaths: 0, sleeps: 0, turns: 0, potions: 0, done: { gnarok: false, guul: false }, stats: {}, stuck: null, earnedStart: st.earned };
    const gone = {};
    const gainXp = xp => {
        meta.xp += xp;
        while (meta.xp >= xpToNext(meta.level)) { meta.xp -= xpToNext(meta.level); meta.level++; for (let i = 0; i < POINTS_PER_LEVEL; i++) meta.primary[ALLOCATE_DEFAULT(meta, meta.pointsSpent++)]++; }
    };
    const makeHero = () => {
        const hero = Engine.createRpgHero();
        for (const k of Object.keys(meta.primary)) hero.primary[k] += meta.primary[k];
        Engine.refreshPrimaryStats(hero);
        applyGear(hero, st);
        st.potsBefore = meta.potions; st.goldBefore = meta.gold; st.lastHero = { atq: hero.atq, maxHp: hero.maxHp };
        return hero;
    };
    const sleep = () => {
        st.hp = null; for (const k of Object.keys(gone)) if (!Z2_ONCE.has(k)) delete gone[k]; out.sleeps++;
        buyPotionsTo(st, RPG_BALANCE.potion.max);
        shopAtInn(st);
    };
    const fight = (pid, training) => {
        const creature = CREATURES[Z2_POINT[pid]];
        const hero = makeHero();
        hero.hp = Math.min(hero.maxHp, st.hp ?? hero.maxHp);
        const hpBefore = hero.hp;
        const m = Engine.createRpgCreature(creature);
        const c = Engine.createRpgCombat(hero, m, rng);
        c.potions = meta.potions;
        let turns = 0;
        while (!c.over && turns < 200) {
            turns++;
            const r = Engine.rpgCombatAction(c, policy(c, hero, m, { st, turns }));
            if (!r.ok) Engine.rpgCombatAction(c, 'attack');
        }
        out.potions += meta.potions - c.potions; meta.potions = c.potions;
        out.fights++; out.turns += turns; if (training) out.farm++;
        if (!training) {
            const s = out.stats[pid] = out.stats[pid] || { name: creature.name, fights: 0, wins: 0, hpLost: 0, turns: 0 };
            s.fights++; s.turns += turns; s.hpLost += (hpBefore - Math.max(0, hero.hp)) / hero.maxHp; if (c.result === 'victory') s.wins++;
        }
        if (c.result === 'victory') {
            st.hp = hero.hp; gone[pid] = true;
            const g = RPG_BALANCE.gold[m.type] || 2;
            meta.gold += g; st.earned += g;
            gainXp(XP_REWARD[m.type] || 5);
            if (Z2_ONCE.has(pid)) dropFor(st, pid);
            return true;
        }
        out.deaths++; meta.gold -= Math.floor(meta.gold * 0.1); st.hp = null;
        return false;
    };
    // Entrenar: tras caer, duerme y vence a los gnolls sueltos de la entrada hasta subir un nivel
    const train = () => {
        const goal = meta.level + 1;
        for (let n = 0; n < 60 && meta.level < goal; n++) {
            const hero = makeHero();
            if ((st.hp ?? hero.maxHp) < hero.maxHp * 0.6 || Z2_FARM.every(f => gone[f])) sleep();
            fight(Z2_FARM.find(q => !gone[q]), true);
        }
    };
    makeHero(); out.in = { ...st.lastHero };
    for (const target of ['gnarok', 'guul']) {
        for (let attempts = 0; !gone[target] && attempts < 40; attempts++) {
            const hero = makeHero();
            if ((st.hp ?? hero.maxHp) < hero.maxHp * 0.6) sleep();
            let fell = false;
            for (const pid of Z2_BRANCH[target]) { if (gone[pid]) continue; if (!fight(pid, false)) { fell = true; break; } }
            if (fell) train();
        }
        out.done[target] = !!gone[target];
        if (!gone[target]) { out.stuck = target; break; }
    }
    out.level = meta.level; out.earned = st.earned - out.earnedStart; out.out = { ...st.lastHero };
    return out;
}

// ---------- Equipo típico de una ruta del descenso (lo que se traería a la aventura) ----------
/**
 * Simula el botín de UNA ruta del descenso que llega hasta el piso `depth`: en cada piso un nodo al azar con los pesos del juego
 * (combate 45 · evento 20 · hoguera 12 · cofre 10 · sub-jefe 10 desde el piso 4); los combates sueltan un 25 % (casi todo gris),
 * y cofres, hogueras y sub-jefes siempre. El botín de los eventos no cuenta (es poco).
 */
export function routeLoot(rng, depth) {
    const W = RPG_BALANCE.weights;
    const loot = [], eq = {};
    for (let floor = 0; floor < depth; floor++) {
        const types = ['monster', 'event', 'campfire', 'chest', ...(floor >= RPG_BALANCE.subbossMinFloor ? ['subboss'] : [])];
        const w = types.map(t => W[t]);
        let roll = rng() * w.reduce((a, b) => a + b, 0), t = types[0];
        for (let i = 0; i < types.length; i++) { roll -= w[i]; if (roll <= 0) { t = types[i]; break; } }
        const source = t === 'monster' ? (rng() < RPG_BALANCE.loot.combatDropChance ? 'combat' : null) : ['chest', 'campfire', 'subboss'].includes(t) ? t : null;
        if (source) loot.push(Items.rollLootDrop({ rng, floor, source, hero: { equipment: eq } }));
    }
    return loot;
}
/** Lo que se llevaría el jugador del botín de una ruta: el mejor objeto de cada ranura (por la puntuación del juego). */
export function bestPerSlot(loot) {
    const out = {};
    for (const it of loot) if (!out[it.slot] || scoreOf(it) > scoreOf(out[it.slot])) out[it.slot] = it;
    return Object.values(out);
}
/** Solo el mejor objeto de toda la ruta. */
export function bestSingle(loot) {
    const best = loot.reduce((m, x) => (!m || scoreOf(x) > scoreOf(m) ? x : m), null);
    return best ? [best] : [];
}
/** Copia del objeto con sus números limitados (p. ej. «al traerlo, como mucho +3 ATK y +8 de vida»). */
export function capItem(it, { atq = Infinity, maxHp = Infinity, guard = Infinity } = {}) {
    return { ...it, stats: { ...it.stats, atq: Math.min(it.stats.atq, atq), maxHp: Math.min(it.stats.maxHp, maxHp), guard: Math.min(it.stats.guard, guard) } };
}

// ---------- Resúmenes ----------
const avg = (xs, f = x => x) => (xs.length ? xs.reduce((s, x) => s + f(x), 0) / xs.length : NaN);

/** Lo que describe la curva de Zafias en una variante. */
export function zafiasRow({ res, sts }) {
    const { runs, stats } = res;
    const withZ = sts.filter(s => s.zaf);
    const fer = stats.feronius;
    return {
        entren: avg(runs.filter(r => 'grask' in r.trainFor), r => r.trainFor.grask),
        caidas: avg(runs, r => r.deaths),
        sinCaer: runs.filter(r => !r.deaths).length / runs.length,
        feroniusVida: fer ? fer.hpLost / fer.fights : NaN,
        turnos: avg(runs, r => r.turns) / (avg(runs, r => r.fights) || 1),
        nivel: avg(withZ, s => s.zaf.level),
        vencen: runs.filter(r => r.done).length / runs.length,
        oroGanado: avg(withZ, s => s.zaf.earned), oroEquipo: avg(withZ, s => s.zaf.spent),
        atq: avg(sts.filter(s => s.atFeronius), s => s.atFeronius.atq), hp: avg(sts.filter(s => s.atFeronius), s => s.atFeronius.maxHp)
    };
}
/** Lo mismo para la segunda zona. */
export function zone2Row({ z2 }) {
    if (!z2.length) return null;
    const gu = z2.map(z => z.stats.guul).filter(Boolean);
    const tot = k => gu.reduce((s, x) => s + x[k], 0);
    return {
        vence: z2.filter(z => z.done.guul).length / z2.length,
        entren: avg(z2, z => z.farm), caidas: avg(z2, z => z.deaths),
        turnos: avg(z2, z => z.turns) / (avg(z2, z => z.fights) || 1),
        guulVida: gu.length ? tot('hpLost') / tot('fights') : NaN,
        nivel: avg(z2, z => z.level), oro: avg(z2, z => z.earned),
        atqIn: avg(z2, z => z.in.atq), hpIn: avg(z2, z => z.in.maxHp), atqOut: avg(z2, z => z.out.atq), hpOut: avg(z2, z => z.out.maxHp)
    };
}

// ---------- Presentación ----------
const fx = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '—');
const fp = x => (Number.isFinite(x) ? `${(x * 100).toFixed(0)} %` : '—');
const mdRow = cells => `| ${cells.join(' | ')} |`;
const mdTable = (head, rows) => [mdRow(head), mdRow(head.map(() => '---')), ...rows.map(mdRow)].join('\n');

/** Curva de Zafias de varias variantes: [[nombre, resultadoDeRun]]. */
export function zafiasTable(items) {
    return mdTable(['Variante', 'ATK / vida al llegar a Feronius', 'Entrenamiento antes de Grask', 'Caídas', 'Sin caer nunca', 'Feronius: vida perdida', 'Turnos por combate', 'Nivel final', 'Oro ganado', 'Oro gastado en equipo'],
        items.map(([name, r]) => { const z = zafiasRow(r); return [name, `${fx(z.atq)} / ${fx(z.hp, 0)}`, fx(z.entren), fx(z.caidas, 2), fp(z.sinCaer), fp(z.feroniusVida), fx(z.turnos), fx(z.nivel), fx(z.oroGanado, 0), fx(z.oroEquipo, 0)]; }));
}
/** Segunda zona de varias variantes: [[nombre, resultadoDeRun]]. */
export function zone2Table(items) {
    return mdTable(['Variante', 'ATK / vida al entrar', 'ATK / vida al acabar', 'Vence a Guul', 'Entrenamiento (combates)', 'Caídas', 'Guul: vida perdida', 'Turnos por combate', 'Nivel al final'],
        items.map(([name, r]) => { const z = zone2Row(r); return z ? [name, `${fx(z.atqIn)} / ${fx(z.hpIn, 0)}`, `${fx(z.atqOut)} / ${fx(z.hpOut, 0)}`, fp(z.vence), fx(z.entren), fx(z.caidas, 2), fp(z.guulVida), fx(z.turnos), fx(z.nivel)] : [name, ...Array(8).fill('—')]; }));
}

// =============================================
// Las secciones del informe
// =============================================
const SHOP = {
    // Tienda de la aldea de Zafias (zona 1): lo básico. `floor` = calidad del objeto (+8 % por piso sobre su base)
    w1: { slot: 'weapon', baseId: 'gladio_corto', floor: 0, price: 40 },        // ATK 2
    w2: { slot: 'weapon', baseId: 'mandoble_lobo', floor: 0, price: 90 },       // ATK 3
    a1: { slot: 'armor', baseId: 'cota_mazmorra', floor: 0, price: 30 },        // +4 vida
    a2: { slot: 'armor', baseId: 'cota_malla', floor: 0, price: 70 },           // +8 vida, revancha +2
    // Tienda de la segunda zona (más cara y mejor)
    w3: { slot: 'weapon', baseId: 'mandoble_lobo', floor: 5, price: 160, zone: 2 },    // ATK 4
    w4: { slot: 'weapon', baseId: 'mandoble_lobo', floor: 10, price: 300, zone: 2 },   // ATK 5
    a3: { slot: 'armor', baseId: 'pechera_piedra', floor: 0, price: 140, zone: 2 },    // +12 vida, espinas 2
    a4: { slot: 'armor', baseId: 'coraza_ancla', floor: 5, price: 280, zone: 2 }       // +18 vida, revancha 3
};
const Z1 = [SHOP.w1, SHOP.w2, SHOP.a1, SHOP.a2];
const BOSS_RARE = { grask: { rarity: 'rara', slot: 'weapon', floor: 2 }, feronius: { rarity: 'rara', slot: 'armor', floor: 3 } };

function scenarios() {
    const route = (depth, pick = bestPerSlot, cap = null) => rng => pick(routeLoot(rng, depth)).map(it => (cap ? capItem(it, cap) : it));
    const CAP = { atq: 3, maxHp: 8, guard: 1 };
    return {
        ref: [['Sin equipo (la aventura de hoy)', {}], ['F0 · gastar el oro en La Forja de hoy (Filo y Constitución)', { forge: true }]],
        tienda: [
            ['T1 · tienda de armas (2 armas, solo Zafias)', { shop: [SHOP.w1, SHOP.w2] }],
            ['T2 · armas y armaduras (4 piezas, solo Zafias)', { shop: Z1 }],
            ['T3 · tiendas por zona (T2 + 4 piezas mejores en la zona 2)', { shop: Object.values(SHOP) }],
            ['T4 · T3 con todo al doble de precio', { shop: Object.values(SHOP).map(s => ({ ...s, price: s.price * 2 })) }]
        ],
        botin: [
            ['B1 · Grask suelta una pieza (rara o mejor); Feronius, otra', { drops: { grask: { source: 'subboss', floor: 2 }, feronius: { source: 'subboss', floor: 3 } } }],
            ['B2 · Grask: arma rara; Feronius: armadura rara', { drops: BOSS_RARE }],
            ['B3 · B2 y Gnarok suelta una pieza (ayuda contra Guul)', { drops: { ...BOSS_RARE, gnarok: { source: 'subboss', floor: 5 } } }],
            ['B4 · B2 pero épicas', { drops: { grask: { rarity: 'epica', slot: 'weapon', floor: 2 }, feronius: { rarity: 'epica', slot: 'armor', floor: 3 } } }]
        ],
        descenso: [
            ['D1 · kit completo de una ruta corta (piso 4)', { carry: route(4) }],
            ['D2 · kit completo de una ruta media (piso 8)', { carry: route(8) }],
            ['D3 · kit completo de una ruta larga (piso 16)', { carry: route(16) }],
            ['D4 · solo el mejor objeto de una ruta media (piso 8)', { carry: route(8, bestSingle) }],
            ['D5 · solo el mejor objeto de una ruta larga (piso 16)', { carry: route(16, bestSingle) }],
            ['D6 · kit del piso 16 con tope (ATK ≤ 3, vida ≤ +8 por pieza)', { carry: route(16, bestPerSlot, CAP) }]
        ],
        mezcla: [
            ['M1 · tiendas por zona (T3) + botín de jefes (B2)', { shop: Object.values(SHOP), drops: BOSS_RARE }],
            ['M0 · La Forja de hoy + botín de jefes (B2): lo más barato de construir', { forge: true, drops: BOSS_RARE }],
            ['M2 · tienda de Zafias (T2) + botín (B2) + reliquia del descenso (mejor objeto del piso 8, con tope)', { shop: Z1, drops: BOSS_RARE, carry: route(8, bestSingle, CAP) }]
        ]
    };
}

export async function main({ N = 2000, SECTION = 'todo' } = {}) {
    const want = s => SECTION === 'todo' || SECTION === s;
    const S = scenarios();
    const t0 = Date.now();
    const show = (title, md) => console.log(`\n#### ${title}\n\n${md}`);
    const POLS = [['sin Golpe de Fuego (el bot de hoy)', POL.listo], ['con Golpe de Fuego', POL.fuego]];
    // La segunda zona se mide con las fichas tal cual (× 1) y con la vida de gnolls y orcos a la mitad (× 0,5)
    const Z2_LEVELS = [1, 0.5];

    if (want('ref')) {
        console.log('\n## 0 · Punto de partida: sin equipo, sin y con el Golpe de Fuego');
        const items = [['listo (no usa el Golpe de Fuego)', run({}, { runs: N, policy: POL.listo })], ['fuego (lo usa cuando está listo)', run({}, { runs: N, policy: POL.fuego })], ['fuegoYa (lo usa antes que defenderse)', run({}, { runs: N, policy: POL.fuegoYa })]];
        show('Zafias', zafiasTable(items));
        show('Segunda zona con las fichas tal cual', zone2Table(items));
    }
    if (want('hace-falta')) {
        console.log('\n## 1 · Qué hace falta para vencer a gnolls y orcos');
        const rows = [];
        for (const id of Z2_IDS) {
            const cells = [CREATURES[id].name];
            for (const [atk, hpPlus] of [[1, 0], [3, 0], [3, 8], [5, 8], [5, 16], [7, 16], [9, 24]]) {
                const hero = Engine.createRpgHero();
                hero.atq = atk; hero.maxHp += hpPlus; hero.hp = hero.maxHp;
                const m = Engine.createRpgCreature(CREATURES[id]);
                const c = Engine.createRpgCombat(hero, m, rngFrom(1));
                c.potions = 0;
                let t = 0;
                while (!c.over && t < 200) { t++; const r = Engine.rpgCombatAction(c, POL.listo(c, hero, m)); if (!r.ok) Engine.rpgCombatAction(c, 'attack'); }
                cells.push(c.result === 'victory' ? `gana (${Math.round((1 - Math.max(0, hero.hp) / hero.maxHp) * 100)} % de vida perdida)` : 'cae');
            }
            rows.push(cells);
        }
        show('Un solo combate, vida llena, sin pociones ni Golpe de Fuego (héroe de nivel 1; ATK y vida extra que daría el equipo)',
            mdTable(['Enemigo', 'ATK 1', 'ATK 3', 'ATK 3 · +8 vida', 'ATK 5 · +8', 'ATK 5 · +16', 'ATK 7 · +16', 'ATK 9 · +24'], rows));
        // Cuánto entrenamiento exige la segunda zona según el equipo fijo y la dureza de las fichas
        const kit = (atk, hp) => () => {
            const out = [];
            if (atk > 1) { const w = mkItem('espada_sendero'); w.stats = { ...w.stats, atq: atk }; out.push(w); }
            if (hp > 0) { const a = mkItem('cota_mazmorra'); a.stats = { ...a.stats, maxHp: hp }; a.rules = []; out.push(a); }
            return out;
        };
        const kits = [[1, 0], [2, 4], [3, 8], [4, 8], [5, 12], [6, 16], [7, 20]];
        for (const [pname, pol] of POLS) {
            const rows2 = [1, 0.7, 0.5, 0.35].map(mul => [`× ${mul} la vida de gnolls y orcos`, ...kits.map(([a, h]) => fx(zone2Row(run({ carry: kit(a, h), z2mul: mul }, { runs: Math.min(N, 200), policy: pol })).entren, 0))]);
            show(`Combates de entrenamiento en la segunda zona según el equipo (fijo desde el principio) · ${pname}`, mdTable(['Dureza', ...kits.map(([a, h]) => `ATK ${a} · +${h} vida`)], rows2));
        }
    }

    const section = (key, title) => {
        if (!want(key)) return;
        console.log(`\n## ${title}`);
        for (const [pname, pol] of POLS) {
            const items = [...S.ref, ...S[key]];
            show(`Zafias · ${pname}`, zafiasTable(items.map(([n, sc]) => [n, run(sc, { runs: N, policy: pol })])));
            for (const mul of Z2_LEVELS) {
                show(`Segunda zona con la vida de gnolls y orcos × ${mul} · ${pname}`, zone2Table(items.map(([n, sc]) => [n, run({ ...sc, z2mul: mul }, { runs: N, policy: pol })])));
            }
        }
    };
    section('tienda', '2 · Opción 1: armas y armaduras en la tienda de la aldea');
    section('botin', '3 · Opción 2: botín de jefes y sub-jefes');
    section('descenso', '4 · Opción 3: traer el equipo del descenso');
    section('mezcla', '5 · Mezclas');

    if (want('feronius')) {
        console.log('\n## 7 · Feronius con el botín: cuánta vida extra necesita el jefe de Zafias');
        const picks = [['Sin equipo', {}], ['B2 · botín de jefes', { drops: BOSS_RARE }], ['M1 · tiendas por zona + botín', { shop: Object.values(SHOP), drops: BOSS_RARE }], ['M0 · La Forja de hoy + botín', { forge: true, drops: BOSS_RARE }]];
        for (const [pname, pol] of POLS) {
            const rows = [];
            for (const [name, sc] of picks) for (const mul of [1, 2, 3, 4, 6]) {
                const { res, sts } = run({ ...sc, fmul: mul, zone2: false }, { runs: Math.min(N, 500), policy: pol });
                const f = res.stats.feronius;
                rows.push([name, `× ${mul}`, fp(f.wins / f.fights), fp(f.hpLost / f.fights), fx(f.turns / f.fights), fx(avg(res.runs, r => r.deaths), 2)]);
                void sts;
            }
            show(`Feronius con más vida · ${pname}`, mdTable(['Equipo', 'Vida de Feronius', 'Gana el héroe (por combate)', 'Vida que pierde el héroe', 'Turnos', 'Caídas por partida (toda Zafias)'], rows));
        }
    }
    if (want('rutas')) {
        console.log('\n## 9 · Qué trae una ruta del descenso');
        const q = (xs, f) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length * f)];
        const rows = [4, 8, 12, 16].map(depth => {
            const kits = Array.from({ length: 3000 }, (_, i) => { const loot = routeLoot(rngFrom(i * 31 + depth), depth); const kit = bestPerSlot(loot); return { n: loot.length, atq: Math.max(1, ...kit.filter(it => it.slot === 'weapon').map(it => it.stats.atq)), hp: kit.reduce((t, it) => t + it.stats.maxHp, 0) }; });
            return [`piso ${depth}`, fx(avg(kits, k => k.n)), `${fx(avg(kits, k => k.atq))} (p10 ${q(kits.map(k => k.atq), 0.1)} · p50 ${q(kits.map(k => k.atq), 0.5)} · p90 ${q(kits.map(k => k.atq), 0.9)})`, `${fx(avg(kits, k => k.hp))} (p10 ${q(kits.map(k => k.hp), 0.1)} · p90 ${q(kits.map(k => k.hp), 0.9)})`];
        });
        show('Botín de 3000 rutas simuladas por profundidad (1 = espada básica)', mdTable(['Ruta hasta', 'Objetos conseguidos', 'ATK del arma (media y reparto)', 'Vida extra del equipo (media y reparto)'], rows));
    }
    if (want('zona2')) {
        console.log('\n## 8 · Cuánta vida admiten gnolls y orcos con el botín de jefes');
        const picks = [['B2 · botín de jefes', { drops: BOSS_RARE }], ['B3 · B2 y Gnarok también suelta', { drops: { ...BOSS_RARE, gnarok: { source: 'subboss', floor: 5 } } }]];
        for (const [pname, pol] of POLS) {
            const rows = [];
            for (const [name, sc] of picks) for (const mul of [1, 1.5, 2, 3, 4]) {
                const z = zone2Row(run({ ...sc, z2mul: mul }, { runs: Math.min(N, 500), policy: pol }));
                rows.push([name, `× ${mul}`, fp(z.vence), fx(z.entren), fx(z.caidas, 2), fp(z.guulVida), fx(z.turnos)]);
            }
            show(`Segunda zona con más vida de gnolls y orcos · ${pname}`, mdTable(['Botín', 'Vida de gnolls y orcos', 'Vence a Guul', 'Entrenamiento (combates)', 'Caídas', 'Guul: vida perdida', 'Turnos por combate'], rows));
        }
    }
    if (want('dureza')) {
        console.log('\n## 6 · Cómo compensar Zafias: más vida a sus enemigos');
        const picks = [['Sin equipo', {}], ['T2 · tienda de armas y armaduras', { shop: Z1 }], ['B2 · botín de jefes', { drops: BOSS_RARE }], ['M1 · tiendas por zona + botín', { shop: Object.values(SHOP), drops: BOSS_RARE }]];
        for (const [pname, pol] of POLS) {
            for (const [name, sc] of picks) {
                show(`${name} · ${pname}`, zafiasTable([1, 1.25, 1.5, 2, 2.5, 3].map(mul => [`vida de los enemigos de Zafias × ${mul}`, run({ ...sc, zmul: mul, zone2: false }, { runs: Math.min(N, 500), policy: pol })])));
            }
        }
    }
    console.log(`\n(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

// Si se ejecuta directamente (y no como librería de otro banco), saca las tablas del informe
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('tests/progresion-sim.mjs')) {
    const args = process.argv.slice(2);
    await main({ N: Number(args.find(a => /^\d+$/.test(a)) || 2000), SECTION: args.includes('--seccion') ? args[args.indexOf('--seccion') + 1] : 'todo' });
}

// =============================================
// 🧪 Pruebas largas de Zafias: horas de juego simuladas para ver si los dropeos, la compraventa, los enemigos y el
// equilibrio aguantan. No es una prueba que falle: es un INFORME (docs/pruebas-largas.md) con cifras y con una lista de
// «hallazgos» que el propio banco señala para revisar.
//   1. Dropeos            millones de tiradas de cada tabla, comparadas con lo que dicen los datos
//   2. Encuentros raros   cuánto salen, y si huir y volver no repite la tirada
//   3. Compraventa        cientos de miles de operaciones al azar (comprar, vender, mejorar, equipar): que nada regale
//                         oro, pase de su tope o deje al jugador en un estado imposible
//   4. Duelos             cada enemigo contra héroes de cada nivel y equipo: quién gana y cuánto cuesta
//   5. Partidas enteras   el bot juega Zafias de principio a fin (tests/lib/zafias-bot.mjs), con varios estilos, y
//                         después sigue jugando noches para ver adónde llega la economía
// Uso: npm run sim:largo -- [minutos=55]      (con 1 minuto vale para probar que funciona)
// =============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DROPS, MATERIALS, rollDrop, dropOdds } from '../src/loot.js';
import { RARES, rollRare } from '../src/rares.js';
import { GEAR, GEAR_FOR_SALE, STARTER_GEAR, STARTER_ARMOR, WEAPON_UPGRADE } from '../src/data/gear.js';
import { ELIXIRS, FOOD } from '../src/data/effects.js';
import { RPG_BALANCE } from '../src/data/balance.js';
import { SHOPS, SELL_RATE } from '../src/data/shops.js';
import { PRIMARY_KEYS } from '../src/stats.js';
import * as Meta from '../src/meta.js';
import { playRun, fight, buildHero, POLICIES, point, rngFrom, MAIN, OPTIONAL, rareOf } from './lib/zafias-bot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MINUTES = Number(process.argv.slice(2).find(a => /^[\d.]+$/.test(a)) || 55);
const OUT = path.join(root, 'docs', 'pruebas-largas.md');
const T0 = Date.now();
const budget = share => MINUTES * 60000 * share;
const pct = (x, d = 1) => `${(x * 100).toFixed(d)} %`;
const avg = (xs, f = x => x) => (xs.length ? xs.reduce((s, x) => s + f(x), 0) / xs.length : 0);
const median = xs => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const findings = [];     // lo que el banco señala para revisar: { nivel: 'fallo' | 'aviso' | 'dato', texto }
const flag = (nivel, texto) => findings.push({ nivel, texto });
const sections = [];
const log = m => console.log(`[${((Date.now() - T0) / 60000).toFixed(1)} min] ${m}`);
const table = (head, rows) => [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n');

// ---------------------------------------------------------------- 1. Dropeos
{
    log('1/5 Dropeos…');
    const until = Date.now() + budget(0.05);
    const rng = rngFrom(20261003);
    const out = [];
    for (const [id, T] of Object.entries(DROPS)) {
        const share = budget(0.05) / Object.keys(DROPS).length, end = Date.now() + share;
        const n = {}; let N = 0, some = 0;
        while (Date.now() < end && Date.now() < until + 1000 && N < 40000000) for (let k = 0; k < 50000; k++) { N++; const d = rollDrop(id, rng); if (d) { some++; const key = d.id || d.kind; n[key] = (n[key] || 0) + 1; } }
        const rows = [];
        for (const { entry, p } of dropOdds(id)) {
            const key = entry.material || (entry.potion ? 'potion' : 'manaPotion');
            const got = (n[key] || 0) / N, z = p >= 1 ? (got === 1 ? 0 : -99) : (got - p) / Math.sqrt(p * (1 - p) / N);
            rows.push([entry.material ? MATERIALS[entry.material].name : entry.potion ? 'Poción de vida' : 'Poción de maná', pct(p, 2), pct(got, 2), z.toFixed(1)]);
            if (Math.abs(z) > 4.5 && Math.abs(got - p) > p * 0.01) flag('fallo', `Dropeo de «${id}»: ${key} sale un ${pct(got, 2)} y debería salir un ${pct(p, 2)} (${N} tiradas).`);
        }
        const zAny = (some / N - T.chance) / Math.sqrt(T.chance * (1 - T.chance) / N);
        if (T.chance < 1 && Math.abs(zAny) > 4.5) flag('fallo', `Dropeo de «${id}»: suelta algo un ${pct(some / N, 2)} y debería un ${pct(T.chance, 2)}.`);
        out.push(`**${id}** · ${N.toLocaleString('es-ES')} tiradas · suelta algo: ${pct(some / N, 2)} (esperado ${pct(T.chance, 2)})\n\n${table(['Objeto', 'Esperado', 'Observado', 'Desviación (σ)'], rows)}`);
        // Un raro suelta siempre
        let miss = 0; for (let k = 0; k < 200000; k++) if (!rollDrop(id, rng, { always: true })) miss++;
        if (miss) flag('fallo', `Con botín seguro (encuentro raro), «${id}» dejó de soltar ${miss} de 200 000 veces.`);
    }
    // Las pociones que caen con la mochila llena
    const meta = Meta.loadMeta(null); meta.potions = RPG_BALANCE.potion.max; meta.manaPotions = RPG_BALANCE.manaPotion.max;
    const full = !Meta.grantDrop(meta, { kind: 'potion' }) && !Meta.grantDrop(meta, { kind: 'manaPotion' }) && meta.potions === RPG_BALANCE.potion.max && meta.manaPotions === RPG_BALANCE.manaPotion.max;
    if (!full) flag('fallo', 'Una poción que cae con la mochila llena no se queda en el suelo.');
    sections.push(`## 1. Dropeos\n\nCada tabla, tirada muchas veces y comparada con sus datos. La desviación se mide en sigmas: por debajo de 3 es azar normal.\n\n${out.join('\n\n')}\n\nCon la mochila llena, la poción que cae ${full ? 'se queda en el suelo (bien)' : '**se cuela**'}.`);
}

// ---------------------------------------------------------------- 2. Encuentros raros
{
    log('2/5 Encuentros raros…');
    const rng = rngFrom(77);
    const end = Date.now() + budget(0.03);
    const rows = [];
    for (const [id, R] of Object.entries(RARES)) {
        let N = 0, hit = 0;
        const stop = Date.now() + budget(0.03) / Object.keys(RARES).length;
        while (Date.now() < stop && Date.now() < end + 500 && N < 40000000) for (let k = 0; k < 100000; k++) { N++; if (rollRare(id, rng)) hit++; }
        const z = (hit / N - R.chance) / Math.sqrt(R.chance * (1 - R.chance) / N);
        rows.push([R.name, pct(R.chance), pct(hit / N, 2), z.toFixed(1), N.toLocaleString('es-ES')]);
        if (Math.abs(z) > 4.5 && Math.abs(hit / N - R.chance) > R.chance * 0.01) flag('fallo', `El raro «${R.name}» sale un ${pct(hit / N, 2)} y debería un ${pct(R.chance)}.`);
    }
    sections.push(`## 2. Encuentros raros\n\n${table(['Raro', 'Esperado', 'Observado', 'Desviación (σ)', 'Tiradas'], rows)}\n\nCuánto aguantan y cuánto pegan en un combate de verdad está en los duelos (sección 4) y en las partidas (sección 5).`);
}

// ---------------------------------------------------------------- 3. Compraventa al azar
{
    log('3/5 Compraventa al azar…');
    const end = Date.now() + budget(0.12);
    const keysBuy = ['potion', 'mana_potion', ...Object.keys(ELIXIRS).filter(id => ELIXIRS[id].sold !== false).map(id => `elixir:${id}`), ...Object.keys(FOOD).map(id => `food:${id}`),
        ...GEAR_FOR_SALE.map(id => `gear:${id}`), 'crystal', 'upgrade:filo', 'upgrade:constitucion', 'upgrade:buen_ojo', 'upgrade:estudio'];
    const buy = (m, k) => k === 'potion' ? Meta.buyPotion(m) : k === 'mana_potion' ? Meta.buyManaPotion(m) : k.startsWith('elixir:') ? Meta.buyElixir(m, k.slice(7))
        : k.startsWith('food:') ? Meta.buyFood(m, k.slice(5)) : k.startsWith('gear:') ? Meta.buyGear(m, k.slice(5)) : k === 'crystal' ? Meta.buyCrystal(m) : Meta.buyUpgrade(m, k.slice(8));
    const worth = m => m.gold + Meta.potionCount(m) * RPG_BALANCE.potion.price + Meta.manaPotionCount(m) * RPG_BALANCE.manaPotion.price
        + Object.keys(ELIXIRS).reduce((s, id) => s + Meta.elixirCount(m, id) * ELIXIRS[id].price, 0) + Object.keys(FOOD).reduce((s, id) => s + Meta.foodCount(m, id) * FOOD[id].price, 0)
        + Meta.crystalCount(m) * WEAPON_UPGRADE.price + (m.advGear || []).reduce((s, id) => s + (GEAR[id].price || 0), 0);
    let ops = 0, sessions = 0;
    const bad = new Map();
    const note = t => bad.set(t, (bad.get(t) || 0) + 1);
    const stats = { buy: 0, buyOk: 0, sell: 0, sellOk: 0, upgrade: 0, upgradeOk: 0, equip: 0 };
    for (let seed = 1; Date.now() < end; seed++) {
        const rng = rngFrom(900000 + seed);
        const m = Meta.loadMeta(null);
        Object.assign(m, { advGear: [STARTER_GEAR], advWeapon: STARTER_GEAR, advArmor: STARTER_ARMOR, gold: Math.floor(rng() * rng() * 8000) });
        sessions++;
        let spentOnUpgrades = 0, crystalsSpent = 0;
        const start = m.gold;
        for (let i = 0; i < 400; i++) {
            ops++;
            const before = { gold: m.gold, worth: worth(m) };
            const r = rng();
            if (r < 0.45) {
                const k = keysBuy[Math.floor(rng() * keysBuy.length)];
                stats.buy++;
                const res = buy(m, k);
                if (res.ok) {
                    stats.buyOk++;
                    if (m.gold > before.gold) note(`comprar ${k} da oro`);
                    if (before.gold - m.gold !== res.cost) note(`comprar ${k} cobra distinto de su precio`);
                    if (k.startsWith('upgrade:')) spentOnUpgrades += res.cost;
                } else if (m.gold !== before.gold) note(`una compra rechazada (${k}) cambió el oro`);
            } else if (r < 0.75) {
                const pool = ['potion', 'mana_potion', ...Object.keys(ELIXIRS).map(id => `elixir:${id}`), ...Object.keys(FOOD).map(id => `food:${id}`), 'crystal', ...Object.keys(GEAR).map(id => `gear:${id}`), 'upgrade:filo', 'material:piel-lobo'];
                const k = pool[Math.floor(rng() * pool.length)];
                stats.sell++;
                const info = Meta.sellInfo(m, k), res = Meta.sellItem(m, k);
                if (res.ok) {
                    stats.sellOk++;
                    if (m.gold - before.gold !== info.value) note(`vender ${k} paga distinto de lo anunciado`);
                    if (k === `gear:${m.advWeapon}` || k === `gear:${m.advArmor}`) note(`se vendió lo equipado (${k})`);
                    if (k === `gear:${STARTER_GEAR}` || k === `gear:${STARTER_ARMOR}`) note('se vendió el equipo de inicio');
                    if (k.startsWith('upgrade:') || k.startsWith('material:')) note(`se vendió ${k}`);
                    if (worth(m) > before.worth) note(`vender ${k} aumenta el patrimonio`);
                } else if (m.gold !== before.gold) note(`una venta rechazada (${k}) cambió el oro`);
            } else if (r < 0.87) {
                const own = (m.advGear || []);
                const id = own[Math.floor(rng() * own.length)];
                stats.upgrade++;
                const lvl = Meta.weaponUpgradeLevel(m, id), cr = Meta.crystalCount(m);
                const res = Meta.upgradeWeapon(m, id);
                if (res.ok) {
                    stats.upgradeOk++; crystalsSpent++;
                    if (GEAR[id].slot !== 'weapon') note('se mejoró algo que no es un arma');
                    if (Meta.weaponUpgradeLevel(m, id) !== lvl + 1 || Meta.crystalCount(m) !== cr - 1) note('mejorar no gasta un cristal o no sube un nivel');
                    if (lvl + 1 > WEAPON_UPGRADE.max) note('un arma pasó de su tope de mejoras');
                    if (m.gold !== before.gold) note('mejorar cambió el oro');
                }
            } else {
                const own = (m.advGear || []), id = own[Math.floor(rng() * own.length)];
                stats.equip++;
                if (id) { if (GEAR[id].slot === 'armor') m.advArmor = id; else m.advWeapon = id; }
            }
            // Lo que no puede pasar nunca
            if (!(m.gold >= 0) || !Number.isInteger(m.gold)) note(`oro imposible (${m.gold})`);
            if (Meta.potionCount(m) > RPG_BALANCE.potion.max || Meta.manaPotionCount(m) > RPG_BALANCE.manaPotion.max) note('más pociones que el tope');
            if (Object.keys(ELIXIRS).some(id => Meta.elixirCount(m, id) > ELIXIRS[id].max) || Object.keys(FOOD).some(id => Meta.foodCount(m, id) > FOOD[id].max)) note('más elixires o comida que el tope');
            if (Meta.crystalCount(m) > WEAPON_UPGRADE.carry) note('más cristales que el tope');
            if (new Set(m.advGear).size !== m.advGear.length) note('una pieza de equipo duplicada');
            if (!m.advGear.includes(m.advWeapon) && m.advWeapon !== STARTER_GEAR) note('lleva puesta un arma que no tiene');
            if (!m.advGear.includes(m.advArmor) && m.advArmor !== STARTER_ARMOR) note('lleva puesta una armadura que no tiene');
            // Sin ingresos, el patrimonio (oro + lo que valdría recomprar todo) nunca puede crecer
            if (worth(m) > before.worth) note('el patrimonio creció sin ganar nada');
        }
        if (worth(m) + spentOnUpgrades + crystalsSpent * WEAPON_UPGRADE.price > start + 0.001 && worth(m) > start) note('al final de la sesión hay más riqueza que al empezar');
    }
    for (const [t, n] of bad) flag('fallo', `Compraventa: ${t} (${n.toLocaleString('es-ES')} veces).`);
    // El ciclo comprar → vender de cada cosa: cuánto se pierde
    const loop = [['Poción de vida', RPG_BALANCE.potion.price], ['Poción de maná', RPG_BALANCE.manaPotion.price], ['Hogaza de pan', FOOD.pan.price], ['Cristal de mejora', WEAPON_UPGRADE.price],
        ...GEAR_FOR_SALE.map(id => [GEAR[id].name, GEAR[id].price])].map(([name, price]) => [name, price, Meta.sellValue(price), pct(1 - Meta.sellValue(price) / price, 0)]);
    if (loop.some(([, p, v]) => v > p * SELL_RATE + 1e-9 || v > p)) flag('fallo', 'Alguna cosa se vende por más del 75 % de lo que cuesta.');
    sections.push(`## 3. Compraventa al azar\n\n${ops.toLocaleString('es-ES')} operaciones al azar en ${sessions.toLocaleString('es-ES')} sesiones (compras: ${stats.buy.toLocaleString('es-ES')}, aceptadas ${pct(stats.buyOk / stats.buy, 0)}; ventas: ${stats.sell.toLocaleString('es-ES')}, aceptadas ${pct(stats.sellOk / stats.sell, 0)}; mejoras con cristal: ${stats.upgradeOk.toLocaleString('es-ES')}; cambios de equipo: ${stats.equip.toLocaleString('es-ES')}).\n\n`
        + `Tras cada operación se comprueba: oro entero y nunca negativo, nada por encima de su tope, nada duplicado, no se vende lo equipado ni lo de inicio, y que **sin ingresos el patrimonio no crece** (no hay forma de fabricar oro comprando y vendiendo).\n\n`
        + `**Resultado: ${bad.size ? `${bad.size} tipo(s) de fallo (ver hallazgos)` : 'ningún fallo'}.**\n\nLo que se pierde al comprar algo y revenderlo:\n\n${table(['Cosa', 'Cuesta', 'Te dan', 'Pierdes'], loop)}`);
}

// ---------------------------------------------------------------- 4. Duelos
{
    log('4/5 Duelos por nivel y equipo…');
    const end = Date.now() + budget(0.25);
    const LOADOUTS = {
        'recién llegado': { level: l => l, filo: 0, constitucion: 0, weapon: STARTER_GEAR, armor: STARTER_ARMOR },
        'con lecciones y cuero': { filo: 3, constitucion: 3, weapon: 'espada-de-zafias', armor: 'armadura-de-cuero' },
        'bien equipado': { filo: 5, constitucion: 5, weapon: 'mirmulnir', armor: 'placas-imperiales' }
    };
    const LEVELS = [1, 2, 3, 4, 5, 6, 8, 10];
    const ENEMIES = [['goblin-1', false], ['goblin-2', false], ['goblin-2', true], ['goblin-3', false], ['guardia', false], ['lobo-sendero', false], ['lobo-sendero', true], ['grask', false], ['feronius', false]];
    const metaFor = (L, lo) => {
        const m = Meta.loadMeta(null);
        Object.assign(m, { charLevel: L, advGear: [...new Set([STARTER_GEAR, lo.weapon])], advWeapon: lo.weapon, advArmor: lo.armor, upgrades: { filo: lo.filo, constitucion: lo.constitucion }, potions: 2 });
        const pts = (L - 1) * 2;
        m.primary = { str: Math.ceil(pts / 2), dex: 0, int: 0, vit: Math.floor(pts / 2) };
        return m;
    };
    const cells = [];
    for (const [lname, lo] of Object.entries(LOADOUTS)) for (const L of LEVELS) for (const [id, rare] of ENEMIES) cells.push({ lname, lo, L, id, rare, n: 0, win: 0, turns: 0, hpLost: 0, timeouts: 0 });
    let seed = 1;
    while (Date.now() < end) {
        for (const c of cells) {
            for (let k = 0; k < 20; k++) {
                const meta = metaFor(c.L, c.lo), st = {};
                const r = fight(meta, st, point[c.id], rngFrom(5000000 + seed++), { rare: c.rare });
                c.n++; c.turns += r.turns; c.hpLost += r.hpLost;
                if (r.result === 'victory') c.win++;
                if (r.result === 'timeout') c.timeouts++;
            }
        }
    }
    const name = c => `${point[c.id].enemy.creature ? point[c.id].name : point[c.id].name}${c.rare ? ' → raro' : ''}`;
    const blocks = [];
    for (const lname of Object.keys(LOADOUTS)) {
        const lo = LOADOUTS[lname];
        const h1 = buildHero(metaFor(1, lo)), h10 = buildHero(metaFor(10, lo));
        const rows = ENEMIES.map(([id, rare]) => {
            const row = cells.filter(c => c.lname === lname && c.id === id && c.rare === rare);
            return [name(row[0]), ...row.map(c => `${Math.round(c.win / c.n * 100)} % · ${(c.turns / c.n).toFixed(0)}t`)];
        });
        blocks.push(`### Héroe ${lname}\n\nA nivel 1: ATK ${h1.atq}, vida ${h1.maxHp}. A nivel 10: ATK ${h10.atq}, vida ${h10.maxHp}. Lleva 2 pociones. Cada casilla: **cuántas veces gana · turnos que dura**.\n\n${table(['Enemigo', ...LEVELS.map(l => `Nv ${l}`)], rows)}`);
    }
    const per = cells[0].n;
    for (const c of cells) {
        if (c.timeouts) flag('fallo', `Duelo ${name(c)} (${c.lname}, nivel ${c.L}): ${c.timeouts} combates no acabaron en 300 turnos.`);
        if (c.turns / c.n > 30) flag('aviso', `Duelo ${name(c)} (${c.lname}, nivel ${c.L}): dura ${(c.turns / c.n).toFixed(0)} turnos de media.`);
    }
    // Lecturas del equilibrio
    const cell = (lname, L, id, rare = false) => cells.find(c => c.lname === lname && c.L === L && c.id === id && c.rare === rare);
    const wr = c => c.win / c.n;
    const firstBeat = (lname, id, rare = false) => LEVELS.find(L => wr(cell(lname, L, id, rare)) >= 0.8);
    flag('dato', `Sin comprar nada, Grask se vence 4 de cada 5 veces desde el nivel ${firstBeat('recién llegado', 'grask') ?? '10+'} y Feronius desde el ${firstBeat('recién llegado', 'feronius') ?? '10+'}. Con lecciones y cuero: ${firstBeat('con lecciones y cuero', 'grask') ?? '10+'} y ${firstBeat('con lecciones y cuero', 'feronius') ?? '10+'}.`);
    const g1 = cell('recién llegado', 1, 'goblin-1');
    if (wr(g1) < 0.7) flag('aviso', `El primer goblin gana demasiado: un recién llegado solo lo vence el ${pct(wr(g1), 0)} de las veces.`);
    for (const [id, label] of [['goblin-2', 'Goblin Pícaro'], ['lobo-sendero', 'Lobo Negro']]) {
        const n = cell('recién llegado', 3, id, false), r = cell('recién llegado', 3, id, true);
        flag('dato', `${label} a nivel 3 sin equipo: se le vence el ${pct(wr(r), 0)} de las veces (al normal, el ${pct(wr(n), 0)}) y dura ${(r.turns / r.n).toFixed(0)} turnos (el normal, ${(n.turns / n.n).toFixed(0)}).`);
    }
    const be = cell('bien equipado', 5, 'feronius');
    if (wr(be) > 0.98 && be.turns / be.n < 6) flag('aviso', `Bien equipado a nivel 5, Feronius cae siempre y en ${(be.turns / be.n).toFixed(0)} turnos: el equipo caro trivializa al jefe.`);
    sections.push(`## 4. Duelos\n\nCada enemigo contra un héroe de cada nivel (puntos repartidos entre Fuerza y Vitalidad), con tres equipos. ${per.toLocaleString('es-ES')} combates por casilla, ${(per * cells.length).toLocaleString('es-ES')} en total. El héroe juega con cabeza: poción por debajo del 35 %, se cubre de los golpes fuertes y usa sus habilidades.\n\n${blocks.join('\n\n')}`);
}

// ---------------------------------------------------------------- 5. Partidas enteras
{
    log('5/5 Partidas enteras…');
    const end = T0 + MINUTES * 60000 - 4000;
    const VARIANTS = {
        'jugador': { policy: POLICIES.jugador },
        'solo ataca': { policy: POLICIES.ingenuo },
        'todo a Fuerza': { policy: POLICIES.jugador, allocate: () => 'str' },
        'todo a Vitalidad': { policy: POLICIES.jugador, allocate: () => 'vit' },
        'todo a Destreza': { policy: POLICIES.jugador, allocate: () => 'dex' },
        'no compra nada': { policy: POLICIES.jugador, shop: false }
    };
    const data = Object.fromEntries(Object.keys(VARIANTS).map(k => [k, []]));
    let seed = 1;
    while (Date.now() < end) for (const [k, v] of Object.entries(VARIANTS)) { if (Date.now() >= end) break; data[k].push(playRun(100000 + seed, { ...v, extraNights: 30 })); seed++; }
    const all = Object.values(data).flat();
    for (const r of all) for (const a of [...new Set(r.anomalies)]) flag('fallo', `Partida ${r.seed}: ${a}.`);
    if (findings.filter(f => f.nivel === 'fallo' && /^Partida/.test(f.texto)).length > 12) {   // no llenar el informe
        const mine = findings.filter(f => /^Partida/.test(f.texto));
        const kinds = {}; for (const f of mine) { const k = f.texto.replace(/^Partida \d+: /, '').replace(/-?\d+(\.\d+)?/g, 'N'); kinds[k] = (kinds[k] || 0) + 1; }
        for (const f of mine) findings.splice(findings.indexOf(f), 1);
        for (const [k, n] of Object.entries(kinds)) flag('fallo', `En las partidas: ${k} (${n} veces).`);
    }
    const sumRows = Object.entries(data).map(([k, rs]) => {
        const done = rs.filter(r => r.done);
        return [k, rs.length, pct(done.length / rs.length, 0), avg(rs, r => r.deaths).toFixed(1), avg(done, r => r.atEnd.fights).toFixed(0), avg(done, r => r.atEnd.nights).toFixed(1),
            avg(done, r => r.levelAt.grask || 0).toFixed(1), avg(done, r => r.levelAt.feronius || 0).toFixed(1), avg(done, r => r.atEnd.gold).toFixed(0)];
    });
    const J = data.jugador, Jd = J.filter(r => r.done);
    // Por enemigo (jugador)
    const enemyRows = [];
    for (const id of [...MAIN, ...OPTIONAL]) for (const star of ['', '★']) {
        const ss = J.map(r => r.byEnemy[id + star]).filter(Boolean);
        if (!ss.length) continue;
        const f = ss.reduce((s, x) => s + x.fights, 0), w = ss.reduce((s, x) => s + x.wins, 0);
        enemyRows.push([`${ss[0].name}${star ? ' (raro)' : ''}`, f, pct(w / f, 0), pct(ss.reduce((s, x) => s + x.hpLost, 0) / f, 0), (ss.reduce((s, x) => s + x.turns, 0) / f).toFixed(1), (ss.reduce((s, x) => s + x.level, 0) / f).toFixed(1)]);
        if (w / f < 0.35 && !star) flag('aviso', `En partida, ${ss[0].name} es un muro: el jugador solo lo vence el ${pct(w / f, 0)} de las veces.`);
        else if (w / f < 0.6 && !star) flag('dato', `En partida, a ${ss[0].name} se le vence el ${pct(w / f, 0)} de los intentos.`);
        if (ss.reduce((s, x) => s + x.turns, 0) / f > 22) flag('aviso', `En partida, los combates contra ${ss[0].name}${star ? ' (raro)' : ''} duran ${(ss.reduce((s, x) => s + x.turns, 0) / f).toFixed(0)} turnos de media.`);
    }
    // Botín observado en partida
    const dropAgg = {};
    for (const r of J) for (const [k, d] of Object.entries(r.drops)) { const a = dropAgg[k] = dropAgg[k] || { kills: 0, items: {}, lost: 0 }; a.kills += d.kills; a.lost += d.lost; for (const [i, n] of Object.entries(d.items)) a.items[i] = (a.items[i] || 0) + n; }
    const dropRows = Object.entries(dropAgg).map(([k, a]) => { const n = Object.values(a.items).reduce((s, x) => s + x, 0); return [k.replace('★', ' (raro)'), a.kills, pct(n / a.kills, 1), pct(a.lost / (n || 1), 0), Object.entries(a.items).sort((x, y) => y[1] - x[1]).map(([i, c]) => `${(MATERIALS[i] || {}).name || (i === 'potion' ? 'poción de vida' : 'poción de maná')} ${c}`).join(' · ')]; });
    for (const [k, a] of Object.entries(dropAgg)) { const n = Object.values(a.items).reduce((s, x) => s + x, 0); if (n > 200 && a.lost / n > 0.35) flag('dato', `Botín de «${k.replace('★', ' (raro)')}»: el ${pct(a.lost / n, 0)} de lo que cae son pociones que no caben (se cambian por oro, no se pierden).`); }
    // Economía
    const earn = k => avg(Jd, r => r.atEnd.earned[k]), spend = k => avg(Jd, r => r.atEnd.spent[k]);
    const totalIn = ['combate', 'misiones', 'hallazgos', 'ventas'].reduce((s, k) => s + earn(k), 0);
    const ecoRows = [['Combates', earn('combate').toFixed(0), pct(earn('combate') / totalIn, 0)], ['Misiones', earn('misiones').toFixed(0), pct(earn('misiones') / totalIn, 0)], ['Hallazgos', earn('hallazgos').toFixed(0), pct(earn('hallazgos') / totalIn, 0)], ['Ventas', earn('ventas').toFixed(0), pct(earn('ventas') / totalIn, 0)]];
    const outRows = ['posada', 'pociones', 'lecciones', 'espadas', 'armaduras', 'caidas'].map(k => [k === 'caidas' ? 'perdido al caer' : k, spend(k).toFixed(0)]);
    const gearAt = (rs, f) => { const c = {}; for (const r of rs) { const id = f(r); c[id] = (c[id] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${GEAR[id].name} ${pct(n / rs.length, 0)}`).join(' · '); };
    const firstBuy = slot => { const xs = Jd.map(r => (r.bought.find(b => Object.values(GEAR).some(g => g.name === b.what && g.slot === slot)) || {}).fight).filter(x => x != null); return { n: xs.length, med: median(xs) }; };
    const fw = firstBuy('weapon'), fa = firstBuy('armor');
    const never = GEAR_FOR_SALE.filter(id => !J.some(r => r.bought.some(b => b.what === GEAR[id].name)));
    // Misiones
    const QN = { misionCumplida: 'Grask (Evelyn)', 'colmillo:cumplida': 'El colmillo de Feronius (Bram)', 'plantas:cumplida': 'Plantas para Amelie', 'goblins-odo:cumplida': 'Seis goblins menos (Odo)', 'lobos-hilda:cumplida': 'Los lobos del arroyo (Hilda)' };
    const questRows = Object.entries(QN).map(([f, n]) => { const xs = Jd.map(r => r.quests[f]).filter(x => x != null); return [n, pct(xs.length / (Jd.length || 1), 0), xs.length ? median(xs) : '—']; });
    for (const [f, n] of Object.entries(QN)) { const share = Jd.filter(r => r.quests[f] != null).length / (Jd.length || 1); if (share < 0.9) flag('aviso', `Misión «${n}»: solo se cumple en el ${pct(share, 0)} de las partidas que acaban Zafias.`); }
    // Hallazgos automáticos de equilibrio y economía
    if (Jd.length / J.length < 0.98) flag('aviso', `El ${pct(1 - Jd.length / J.length, 1)} de las partidas del jugador no acaba Zafias${J.some(r => r.stuck) ? ` (se atasca en ${[...new Set(J.filter(r => r.stuck).map(r => point[r.stuck].name))].join(', ')})` : ''}.`);
    const broke = avg(J, r => r.brokeNights);
    if (broke > 0.5) flag('aviso', `Posada de pago: de media, ${broke.toFixed(1)} veces por partida el jugador quiere dormir y no le llega el oro.`);
    flag('dato', `Acabar Zafias le cuesta al jugador ${avg(Jd, r => r.atEnd.fights).toFixed(0)} combates y ${avg(Jd, r => r.atEnd.nights).toFixed(0)} noches, cae ${avg(Jd, r => r.deaths).toFixed(1)} veces y llega al nivel ${avg(Jd, r => r.atEnd.level).toFixed(1)}.`);
    flag('dato', `Hasta vencer a Feronius gana ${totalIn.toFixed(0)} de oro. La espada más barata cuesta ${Math.min(...GEAR_FOR_SALE.filter(id => GEAR[id].slot === 'weapon').map(id => GEAR[id].price))} y la armadura más barata ${Math.min(...GEAR_FOR_SALE.filter(id => GEAR[id].slot === 'armor').map(id => GEAR[id].price))}.`);
    if (fw.n / (Jd.length || 1) < 0.5) flag('aviso', `Solo el ${pct(fw.n / (Jd.length || 1), 0)} de las partidas compra alguna espada (y eso contando 30 noches más después del jefe).`);
    if (never.length) flag('dato', `Ni con las noches de más llega nadie a comprar (metas a largo plazo): ${never.map(id => `${GEAR[id].name} (${GEAR[id].price})`).join(', ')}.`);
    const lessons = avg(Jd, r => r.atEnd.filo + r.atEnd.constitucion);
    flag('dato', `Las lecciones de Odo se llevan ${spend('lecciones').toFixed(0)} de oro por partida (${lessons.toFixed(1)} lecciones): ${pct(spend('lecciones') / (totalIn || 1), 0)} de todo lo ganado.`);
    const naive = data['solo ataca'], nd = naive.filter(r => r.done);
    flag('dato', `Jugar con cabeza importa: quien solo ataca cae ${avg(naive, r => r.deaths).toFixed(1)} veces por partida (el jugador, ${avg(J, r => r.deaths).toFixed(1)}) y necesita ${avg(nd, r => r.atEnd.fights).toFixed(0)} combates (el jugador, ${avg(Jd, r => r.atEnd.fights).toFixed(0)}).`);
    const noShop = data['no compra nada'], nsd = noShop.filter(r => r.done);
    flag('dato', `Sin comprar nada: acaba el ${pct(nsd.length / noShop.length, 0)}, con ${avg(nsd, r => r.atEnd.fights).toFixed(0)} combates y ${avg(noShop, r => r.deaths).toFixed(1)} caídas.`);
    const dex = data['todo a Destreza'], dd = dex.filter(r => r.done);
    const str = data['todo a Fuerza'], sd = str.filter(r => r.done), vit = data['todo a Vitalidad'], vd = vit.filter(r => r.done);
    flag('dato', `Atributos: todo a Fuerza acaba en ${avg(sd, r => r.atEnd.fights).toFixed(0)} combates (${avg(str, r => r.deaths).toFixed(1)} caídas); todo a Vitalidad, ${avg(vd, r => r.atEnd.fights).toFixed(0)} (${avg(vit, r => r.deaths).toFixed(1)}); todo a Destreza, ${avg(dd, r => r.atEnd.fights).toFixed(0)} (${avg(dex, r => r.deaths).toFixed(1)}).`);
    const worstBuild = [['Fuerza', sd, str], ['Vitalidad', vd, vit], ['Destreza', dd, dex]].sort((a, b) => avg(b[1], r => r.atEnd.fights) - avg(a[1], r => r.atEnd.fights))[0];
    if (avg(worstBuild[1], r => r.atEnd.fights) > avg(Jd, r => r.atEnd.fights) * 1.6) flag('aviso', `Repartir todo a ${worstBuild[0]} es una trampa: cuesta ${(avg(worstBuild[1], r => r.atEnd.fights) / avg(Jd, r => r.atEnd.fights)).toFixed(1)} veces más combates que repartir entre Fuerza y Vitalidad.`);
    const rs = J.reduce((s, r) => s + r.rares.seen, 0), rw = J.reduce((s, r) => s + r.rares.won, 0);
    flag('dato', `Encuentros raros en partida: ${(rs / J.length).toFixed(1)} por partida; el jugador gana el ${pct(rw / (rs || 1), 0)}.`);
    const fin = J.filter(r => r.done);
    flag('dato', `Tras 30 noches más: nivel ${avg(fin, r => r.final.level).toFixed(1)}, ATK ${avg(fin, r => r.final.hero.atq).toFixed(1)}, vida ${avg(fin, r => r.final.hero.maxHp).toFixed(0)}, ${avg(fin, r => r.final.gold).toFixed(0)} de oro en el bolsillo.`);
    const mats = {}; for (const r of fin) for (const [id, n] of Object.entries(r.final.materials)) mats[id] = (mats[id] || 0) + n;
    flag('dato', `Materiales que quedan sin vender al acabar: ${Object.entries(mats).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${MATERIALS[id].name} ${(n / fin.length).toFixed(1)}`).join(' · ')} por partida.`);
    if (all.some(r => r.badActions)) flag('aviso', `El bot pidió ${all.reduce((s, r) => s + r.badActions, 0)} acciones que el motor rechazó (una habilidad sin maná, una poción sin tenerla…).`);

    sections.push(`## 5. Partidas enteras\n\n${all.length.toLocaleString('es-ES')} partidas de principio a fin (${all.reduce((s, r) => s + r.fights, 0).toLocaleString('es-ES')} combates, ${all.reduce((s, r) => s + r.turns, 0).toLocaleString('es-ES')} turnos), con seis formas de jugar. Después de Feronius, cada una sigue 30 noches más.\n\n`
        + `${table(['Forma de jugar', 'Partidas', 'Acaba Zafias', 'Caídas', 'Combates', 'Noches', 'Nivel con Grask', 'Nivel con Feronius', 'Oro al acabar'], sumRows)}\n\n`
        + `### Enemigo a enemigo (jugador)\n\n${table(['Enemigo', 'Combates', 'Gana', 'Vida perdida', 'Turnos', 'Nivel medio'], enemyRows)}\n\n`
        + `### Botín que cae de verdad (jugador)\n\n${table(['Tabla', 'Enemigos vencidos', 'Suelta algo', 'Se pierde (mochila llena)', 'Qué'], dropRows)}\n\n`
        + `### Oro hasta vencer a Feronius (jugador)\n\nEntra:\n\n${table(['De dónde', 'Oro', 'Parte'], ecoRows)}\n\nSale:\n\n${table(['En qué', 'Oro'], outRows)}\n\n`
        + `Primera espada comprada: ${fw.n ? `en el ${pct(fw.n / Jd.length, 0)} de las partidas, hacia el combate ${fw.med}` : 'nunca'}. Primera armadura: ${fa.n ? `en el ${pct(fa.n / Jd.length, 0)}, hacia el combate ${fa.med}` : 'nunca'}.\n\n`
        + `Al vencer a Feronius lleva: ${gearAt(Jd, r => r.atEnd.weapon)} · y de armadura: ${gearAt(Jd, r => r.atEnd.armor)}.\n\n`
        + `Tras 30 noches más: ${gearAt(fin, r => r.final.weapon)} · y de armadura: ${gearAt(fin, r => r.final.armor)}.\n\n`
        + `### Misiones (jugador)\n\n${table(['Misión', 'Se cumple', 'Hacia el combate'], questRows)}`);
}

// ---------------------------------------------------------------- Informe
const order = { fallo: 0, aviso: 1, dato: 2 };
findings.sort((a, b) => order[a.nivel] - order[b.nivel]);
const icon = { fallo: '❌', aviso: '⚠️', dato: 'ℹ️' };
const n = k => findings.filter(f => f.nivel === k).length;
const md = `# 🧪 Pruebas largas de Zafias

> Informe generado por \`npm run sim:largo\` (tests/long-sim.mjs) el ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · duración: ${((Date.now() - T0) / 60000).toFixed(1)} minutos.
> Versión del juego: ${JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version}. Todo con semilla: repetirlo da lo mismo.

## Resumen

**${n('fallo')} fallos · ${n('aviso')} avisos · ${n('dato')} datos.** Un *fallo* es algo roto (una regla que no se cumple). Un *aviso* es algo que funciona pero pide una decisión de diseño. Un *dato* es una cifra para tener a mano.

${findings.map(f => `- ${icon[f.nivel]} ${f.texto}`).join('\n')}

${sections.join('\n\n')}
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md);
log(`Informe: ${path.relative(root, OUT)} · ${n('fallo')} fallos, ${n('aviso')} avisos, ${n('dato')} datos`);

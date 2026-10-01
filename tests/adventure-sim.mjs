// =============================================
// 🧭 Banco de la aventura: miles de partidas de Zafias jugadas por un bot, de jugador nuevo a jefe de la zona.
// Usa el grafo REAL de la zona (escenas, salidas, enemigos que cortan el paso, marcas de la historia) y el motor de
// combate de verdad. Mide, por enemigo, cuánto se gana, cuánta vida cuesta y cuántas veces se cae; y por partida, el
// nivel, el oro, las pociones y las veces que hay que dormir. No es una prueba que falle: es un informe.
// Uso: node tests/adventure-sim.mjs [partidas=2000] [--bot listo|ingenuo]
// =============================================
import { ZAFIAS } from '../src/data/zones/zafias.js';
import { CREATURES } from '../src/data/creatures.js';
import * as Engine from '../src/engine.js';
import { XP_REWARD, POINTS_PER_LEVEL, xpToNext } from '../src/stats.js';
import { RPG_BALANCE } from '../src/data/balance.js';

const args = process.argv.slice(2);
const N = Number(args.find(a => /^\d+$/.test(a)) || 2000);
const BOT = args.includes('--bot') ? args[args.indexOf('--bot') + 1] : 'listo';

// Generador con semilla (mulberry32): cada partida es reproducible
function rngFrom(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Para probar equilibrios sin tocar los datos: SHIFT=-1 baja un piso a todos los enemigos de la zona y criaturas
const SHIFT = Number(process.env.SHIFT || 0);
if (SHIFT) {
    for (const sc of Object.values(ZAFIAS.scenes)) for (const p of sc.points) if (p.enemy && p.enemy.floor != null) p.enemy.floor = Math.max(0, p.enemy.floor + SHIFT);
    for (const c of Object.values(CREATURES)) c.floor = Math.max(0, c.floor + SHIFT);
}

// --- El grafo de toda la zona: nodo = «escena:parada», con las salidas como puentes entre escenas ---
const zone = ZAFIAS;
const point = {};      // id → { ...parada, scene }
for (const [sid, sc] of Object.entries(zone.scenes)) for (const p of sc.points) point[p.id] = { ...p, scene: sid };
const has = (st, flags) => (flags || []).every(f => st.flags[f]);
function neighbours(st, sid, id) {
    const sc = zone.scenes[sid];
    const out = [];
    for (const [a, b] of sc.links) {
        const other = a === id ? b : b === id ? a : null;
        if (!other) continue;
        const p = sc.points.find(q => q.id === other);
        if (p && !has(st, p.requires)) continue;
        out.push([sid, other]);
    }
    const p = sc.points.find(q => q.id === id);
    if (p && p.kind === 'exit' && has(st, p.requires)) out.push([p.to, p.arriveAt]);
    return out;
}
const cleared = (st, p) => !!st.gone[p.id] || !!(p.once && st.flags[`defeated:${p.id}`]);
/** Los enemigos que hay que vencer, en orden, para llegar desde la aldea hasta `targetId` (el camino con menos). */
function enemiesOnWay(st, targetId) {
    const start = `aldea:${zone.scenes.aldea.startAt}`;
    const dist = { [start]: 0 }, prev = {};
    const queue = [[0, 'aldea', zone.scenes.aldea.startAt]];
    while (queue.length) {
        queue.sort((x, y) => x[0] - y[0]);
        const [d, sid, id] = queue.shift();
        if (id === targetId) break;
        const p = point[id];
        for (const [nsid, nid] of neighbours(st, sid, id)) {
            const q = point[nid];
            const nd = d + (q && q.kind === 'enemy' && !cleared(st, q) ? 1 : 0) + 0.001;
            const key = `${nsid}:${nid}`;
            if (dist[key] === undefined || nd < dist[key]) { dist[key] = nd; prev[key] = `${sid}:${id}`; queue.push([nd, nsid, nid]); }
        }
    }
    const end = `${point[targetId].scene}:${targetId}`;
    if (dist[end] === undefined) return null;
    const path = [];
    for (let k = end; k; k = prev[k]) path.unshift(k.split(':')[1]);
    return path.filter(id => point[id] && point[id].kind === 'enemy' && !cleared(st, point[id]));
}

// --- El héroe de la aventura: el de siempre, con los puntos de nivel repartidos (fuerza y vitalidad a medias) ---
function makeHero(meta) {
    const hero = Engine.createRpgHero();
    for (const k of Object.keys(meta.primary)) hero.primary[k] += meta.primary[k];
    Engine.refreshPrimaryStats(hero);
    return hero;
}
function gainXp(meta, xp) {
    meta.xp += xp;
    while (meta.xp >= xpToNext(meta.level)) {
        meta.xp -= xpToNext(meta.level); meta.level++;
        for (let i = 0; i < POINTS_PER_LEVEL; i++) meta.primary[i % 2 ? 'vit' : 'str']++;
    }
}
function makeEnemy(p) {
    const c = p.enemy && p.enemy.creature && CREATURES[p.enemy.creature];
    if (c) return Engine.createRpgCreature(c);
    const def = p.enemy || { type: 'monster', floor: 0 };
    const m = Engine.createRpgMonster(def.type, def.floor, 0);
    m.name = p.name;
    return m;
}

// Un combate con la política del bot. Devuelve lo que ha pasado
function fight(st, p, rng) {
    const hero = makeHero(st.meta);
    hero.hp = Math.min(hero.maxHp, st.hp ?? hero.maxHp);
    const hpBefore = hero.hp;
    const m = makeEnemy(p);
    const c = Engine.createRpgCombat(hero, m, rng);
    c.potions = st.meta.potions;
    let turns = 0;
    while (!c.over && turns < 200) {
        turns++;
        let action = 'attack';
        if (BOT === 'listo') {
            const it = m.intent;
            if (hero.hp <= hero.maxHp * 0.35 && c.potions > 0) action = 'potion';
            else if (it && it.k === 'attack' && it.m >= 1.8) action = 'defend';
        }
        Engine.rpgCombatAction(c, action);
    }
    const used = st.meta.potions - c.potions;
    st.meta.potions = c.potions;
    return { result: c.result, turns, hpLost: (hpBefore - Math.max(0, hero.hp)) / hero.maxHp, hpLeft: hero.hp, maxHp: hero.maxHp, used, enemy: m };
}

// --- Una partida: lo que haría un jugador que sigue la misión y luego limpia lo opcional hasta el jefe ---
const MAIN = ['goblin-1', 'goblin-2', 'goblin-3', 'guardia', 'grask'];
const OPTIONAL = ['lobo-sendero', 'goblin-puente', 'lobo-ruinas', 'centinela', 'rezagado', 'lobo-guarida', 'feronius'];
const FARM = ['goblin-1', 'lobo-sendero', 'goblin-2'];   // lo fácil y cercano para entrenar
const FINDS = { pozo: { gold: 10 }, fardo: { gold: 25 }, ruinas: { potions: 1 } };
const stats = {};     // por enemigo
const runs = [];

function play(seed) {
    const rng = rngFrom(seed);
    const st = { flags: { misionAceptada: true }, gone: {}, hp: null,
        meta: { gold: 0, potions: 0, level: 1, xp: 0, primary: { str: 0, dex: 0, int: 0, vit: 0 } } };
    const run = { deaths: 0, sleeps: 0, fights: 0, farmFights: 0, potionsUsed: 0, deathsBy: {}, trainFor: {}, levelAt: {}, done: false };
    const sleep = () => {
        st.hp = null; st.gone = {}; run.sleeps++;
        // En la aldea: compra pociones si llega (precio fijo)
        while (st.meta.gold >= RPG_BALANCE.potion.price && st.meta.potions < RPG_BALANCE.potion.max) { st.meta.gold -= RPG_BALANCE.potion.price; st.meta.potions++; }
    };
    const loot = id => { const f = FINDS[id]; if (f && !st.flags[`visto:${id}`]) { st.flags[`visto:${id}`] = true; st.meta.gold += f.gold || 0; st.meta.potions = Math.min(RPG_BALANCE.potion.max, st.meta.potions + (f.potions || 0)); } };
    loot('pozo');
    // Un combate de verdad: cuenta en las estadísticas del enemigo (o no, si es de entrenamiento)
    const battle = (id, train = false) => {
        const p = point[id];
        const r = fight(st, p, rng);
        run.fights++; run.potionsUsed += r.used;
        if (train) run.farmFights++;
        else {
            const s = stats[id] = stats[id] || { name: p.name, fights: 0, wins: 0, hpLost: 0, turns: 0, falls: 0, level: 0 };
            s.fights++; s.turns += r.turns; s.hpLost += r.hpLost; s.level += st.meta.level;
            if (r.result === 'victory') s.wins++; else s.falls++;
        }
        if (r.result === 'victory') {
            st.hp = r.hpLeft; st.gone[id] = true; st.flags[`defeated:${id}`] = true;
            const m = r.enemy;
            st.meta.gold += Math.round((RPG_BALANCE.gold[m.type] || 2) * (m.goldMul || 1));
            gainXp(st.meta, Math.round((XP_REWARD[m.type] || 5) * (m.xpMul || 1)));
            if (id === 'goblin-puente') loot('fardo');
            if (id === 'lobo-ruinas') loot('ruinas');
            return true;
        }
        run.deaths++; run.deathsBy[id] = (run.deathsBy[id] || 0) + 1;
        st.meta.gold -= Math.floor(st.meta.gold * 0.1); st.hp = null;   // despiertas en la posada
        return false;
    };
    // Entrenar: tras caer, duerme y vence a los enemigos fáciles de cerca (reaparecen al dormir) hasta subir un nivel
    const train = () => {
        const goal = st.meta.level + 1;
        for (let n = 0; n < 60 && st.meta.level < goal; n++) {
            const hero = makeHero(st.meta);
            if ((st.hp ?? hero.maxHp) < hero.maxHp * 0.6 || FARM.every(id => st.gone[id])) sleep();
            const id = FARM.find(q => !st.gone[q]);
            const way = enemiesOnWay(st, id) || [];
            for (const w of way) if (!battle(w, true)) break;
        }
    };
    for (const target of [...MAIN, ...OPTIONAL]) {
        let attempts = 0;
        const farmBefore = run.farmFights;
        while (!st.flags[`defeated:${target}`] && attempts < 40) {
            attempts++;
            const hero = makeHero(st.meta);
            if ((st.hp ?? hero.maxHp) < hero.maxHp * 0.6) sleep();   // descansar antes de ir a por el siguiente
            const way = enemiesOnWay(st, target);
            if (!way) { attempts = 99; break; }
            let fell = false;
            for (const id of way) if (!battle(id)) { fell = true; break; }
            if (fell && BOT !== 'terco') train();
        }
        if (!st.flags[`defeated:${target}`]) { run.stuck = target; break; }
        run.trainFor[target] = run.farmFights - farmBefore;
        run.levelAt[target] = st.meta.level;
        if (target === 'grask') { st.meta.gold += 60 + 40; st.meta.potions = Math.min(RPG_BALANCE.potion.max, st.meta.potions + 2); }   // Maela y el botín
    }
    run.done = !!st.flags['defeated:feronius'];
    run.level = st.meta.level; run.gold = st.meta.gold;
    runs.push(run);
}

const t0 = Date.now();
for (let i = 0; i < N; i++) play(1000 + i);

// --- Informe ---
const avg = (xs, f) => xs.reduce((s, x) => s + f(x), 0) / (xs.length || 1);
const pct = x => `${(x * 100).toFixed(0)} %`;
console.log(`\n🧭 Banco de la aventura · Zafias · ${N} partidas · bot ${BOT} (${((Date.now() - t0) / 1000).toFixed(1)} s)\n`);
console.log('Enemigo                 combates  gana   vida perdida  turnos  nivel');
for (const id of [...MAIN, ...OPTIONAL]) {
    const s = stats[id];
    if (!s) { console.log(`${id.padEnd(24)} (no se llegó)`); continue; }
    console.log(`${s.name.slice(0, 23).padEnd(24)}${String(s.fights).padStart(8)}  ${pct(s.wins / s.fights).padStart(5)}  ${pct(s.hpLost / s.fights).padStart(12)}  ${(s.turns / s.fights).toFixed(1).padStart(6)}  ${(s.level / s.fights).toFixed(1).padStart(5)}`);
}
const done = runs.filter(r => r.done);
console.log(`\nPartidas que vencen a Feronius: ${pct(done.length / N)} · se atascan: ${pct(runs.filter(r => r.stuck).length / N)}` +
    (runs.some(r => r.stuck) ? ` (en ${[...new Set(runs.filter(r => r.stuck).map(r => r.stuck))].join(', ')})` : ''));
console.log(`Caídas por partida: ${avg(runs, r => r.deaths).toFixed(2)} · sin caer nunca: ${pct(runs.filter(r => !r.deaths).length / N)}`);
console.log(`Combates por partida: ${avg(runs, r => r.fights).toFixed(1)} · noches en la posada: ${avg(runs, r => r.sleeps).toFixed(1)} · pociones bebidas: ${avg(runs, r => r.potionsUsed).toFixed(1)}`);
console.log(`Nivel al vencer a Grask: ${avg(runs.filter(r => r.levelAt.grask), r => r.levelAt.grask).toFixed(1)} · a Feronius: ${avg(done, r => r.levelAt.feronius).toFixed(1)} · al final: ${avg(runs, r => r.level).toFixed(1)}`);
console.log(`Combates de entrenamiento antes de cada objetivo (media): ${[...MAIN, ...OPTIONAL].map(id => [id, avg(runs.filter(r => id in r.trainFor), r => r.trainFor[id])]).filter(([, v]) => v >= 0.5).map(([id, v]) => `${point[id].name} ${v.toFixed(1)}`).join(' · ') || 'ninguno'} · total: ${avg(runs, r => r.farmFights).toFixed(1)}`);
console.log(`Oro al final: ${avg(runs, r => r.gold).toFixed(0)} 🪙`);
const deathsBy = {};
for (const r of runs) for (const [id, n] of Object.entries(r.deathsBy)) deathsBy[id] = (deathsBy[id] || 0) + n;
const worst = Object.entries(deathsBy).sort((a, b) => b[1] - a[1]).slice(0, 5);
if (worst.length) console.log(`Donde más se cae: ${worst.map(([id, n]) => `${point[id].name} (${(n / N).toFixed(2)}/partida)`).join(' · ')}`);

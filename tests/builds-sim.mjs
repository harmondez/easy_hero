// =============================================
// 🧬 Banco de builds y atributos de la aventura (encargo de investigación, issue #8)
//
// Responde con partidas simuladas de Zafias (el bot de tests/lib/adventure-bot.mjs, sin modificarlo) y del descenso:
//   1. ¿Cuánto cambia la curva de Zafias si el bot usa el Golpe de Fuego?        node tests/builds-sim.mjs fuego
//   2. ¿Qué builds funcionan (todo STR, todo VIT, mixtos…)?                       node tests/builds-sim.mjs builds
//   3. ¿Cuánto poder da cada punto? ¿Cuánto se nota subir de nivel?               node tests/builds-sim.mjs poder
//   4. ¿Y con cada propuesta nueva de `derivePrimary`?                            node tests/builds-sim.mjs propuestas
//   5. ¿Qué pasa en el descenso? (los atributos también valen allí)               node tests/builds-sim.mjs descenso
//   6. ¿Aguanta el resultado con otras semillas?                                  node tests/builds-sim.mjs semillas
//   Todo junto: node tests/builds-sim.mjs todo   (unos 30 minutos)
//
// Opciones: --runs N (partidas por variante con azar en Zafias, 2000) · --det-runs N (partidas por variante SIN azar, 200:
//           sin puntos en DEX no se tira ningún dado y todas salen idénticas; la sección «semillas» lo demuestra) ·
//           --descenso-runs N (partidas por celda del descenso con el bot sensato, 600; el experto usa la mitad) · --seed S ·
//           --bot sensato|experto (solo ese bot en la sección del descenso)
//
// Nada de esto toca el juego: las fórmulas nuevas de los atributos se aplican EN MEMORIA sobre el héroe, justo antes de
// cada combate (`applyDerive`); los pisos de los enemigos se suben en memoria (`withShift`) y se devuelven al terminar.
// La salida son tablas en Markdown: las de docs/informes/builds-y-atributos.md salen literalmente de aquí.
// =============================================
import { pathToFileURL } from 'node:url';
import * as Engine from '../src/engine.js';
import { PRIMARY_BASE, derivePrimary as derivePrimaryReal, POINTS_PER_LEVEL } from '../src/stats.js';
import { createRpgItem, equipItem, rollLootDrop, discardItem, itemScore, ruleSum } from '../src/items.js';
import * as Events from '../src/events.js';
import { createRng } from '../src/rng.js';
import { RPG_BALANCE } from '../src/data/balance.js';
import { ZAFIAS } from '../src/data/zones/zafias.js';
import { CREATURES } from '../src/data/creatures.js';
import { simulate, POLICIES, point, makeEnemy, rngFrom } from './lib/adventure-bot.mjs';
import { BOTS, fightWith, playRun } from '../tools/sim.mjs';

// ---------------------------------------------
// Argumentos
// ---------------------------------------------
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? Number(args[i + 1]) : def; };
const sopt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
export const RUNS = opt('runs', 2000);
export const DET_RUNS = opt('det-runs', 200);
export const DESC_RUNS = opt('descenso-runs', 600);
export const SEED0 = opt('seed', 1000);

// ---------------------------------------------
// Políticas de combate. Firma del bot: (combate, héroe, monstruo, { st, turns }) → acción del motor.
// ---------------------------------------------
const skillReady = c => Engine.rpgSkillReady(c, 'fire_strike');
const heavy = m => !!(m.intent && m.intent.k === 'attack' && m.intent.m >= 1.8);
const lowHp = (hero, pct) => hero.hp <= hero.maxHp * pct;

/**
 * Políticas con Golpe de Fuego. Todas beben poción por debajo de `pot` de vida (35 % por defecto, como el bot «listo»).
 *   fuego          el golpe en cuanto está listo; si no, lo de «listo» (defender los golpes fuertes, si no atacar)
 *   fuego-guardia  defiende ante un golpe fuerte aunque el Golpe de Fuego esté listo; si no, lo usa
 *   fuego-solo     el golpe en cuanto está listo, si no ataca; nunca se defiende (las pociones sí)
 */
export const FIRE = {
    fuego: (pot = 0.35) => (c, hero, m) => {
        if (lowHp(hero, pot) && c.potions > 0) return 'potion';
        if (skillReady(c)) return 'skill';
        if (heavy(m)) return 'defend';
        return 'attack';
    },
    'fuego-guardia': (pot = 0.35) => (c, hero, m) => {
        if (lowHp(hero, pot) && c.potions > 0) return 'potion';
        if (heavy(m)) return 'defend';
        if (skillReady(c)) return 'skill';
        return 'attack';
    },
    'fuego-solo': (pot = 0.35) => (c, hero) => {
        if (lowHp(hero, pot) && c.potions > 0) return 'potion';
        return skillReady(c) ? 'skill' : 'attack';
    }
};

/** Las políticas con nombre: las de siempre (tests/lib/adventure-bot.mjs) y las nuevas. */
export const POLS = {
    ingenuo: POLICIES.ingenuo,
    listo: POLICIES.listo,
    fuego: FIRE.fuego(),
    'fuego-guardia': FIRE['fuego-guardia'](),
    'fuego-solo': FIRE['fuego-solo']()
};

// ---------------------------------------------
// Fórmulas de los atributos: la real y las propuestas, aplicadas en memoria
// ---------------------------------------------
/**
 * Fórmula parametrizada, con la misma forma que `derivePrimary` de src/stats.js; con `CURRENT` da exactamente lo mismo
 * (se comprueba al arrancar). Cada propuesta es solo un juego de números.
 *   strStart / strPerAtk  puntos de STR para el primer +1 ATK (arma física) y para cada uno de los siguientes
 *   vitHp / vitRes   vida y resistencia física por punto de VIT
 *   dexCrit / dexDodge probabilidad de crítico / esquiva por DEX   critMult         multiplicador del crítico
 *   intElem / intRes   daño elemental por punto (con arma elemental) y resistencia por punto de INT
 *   intSkill / intStart  puntos de INT por +1 al Golpe de Fuego (0 = no hace nada, que es lo que pasa hoy) y para el primero. Es una regla NUEVA:
 *                      el motor actual no la tiene; aquí se aplica por `skillMods` del héroe, que el motor ya respeta.
 *   dexCritCap / dexDodgeCap   topes (hoy no hay)
 */
export const CURRENT = { strStart: 10, strPerAtk: 10, intStart: 10, vitHp: 4, vitRes: 0.004, dexCrit: 0.004, dexDodge: 0.003, critMult: 1.5, intElem: 0.1, intRes: 0.004, intSkill: 0, dexCritCap: 1, dexDodgeCap: 1 };
/** Bono escalonado: el primero llega a los `start` puntos y luego uno más cada `step`. Con start = step es el `floor(d / step)` de hoy. */
const stepBonus = (d, start, step) => (d < start ? 0 : 1 + Math.floor((d - start) / step));
export const deriveWith = f => (primary, weaponType) => {
    const p = { ...PRIMARY_BASE, ...primary };
    const phys = ['filo', 'contundente', 'perforante'].includes(weaponType);
    const elem = ['veneno', 'fuego', 'rayo'].includes(weaponType);
    const d = k => Math.max(0, p[k] - PRIMARY_BASE[k]);
    return {
        maxHpBonus: (p.vit - PRIMARY_BASE.vit) * f.vitHp,
        atqBonus: phys ? stepBonus(d('str'), f.strStart, f.strPerAtk) : 0,
        elemDmgBonus: elem ? Math.floor(d('int') * f.intElem) : 0,
        critChance: Math.min(f.dexCritCap, d('dex') * f.dexCrit),
        critMult: f.critMult,
        dodgeChance: Math.min(f.dexDodgeCap, d('dex') * f.dexDodge),
        physResist: d('vit') * f.vitRes,
        elemResist: d('int') * f.intRes,
        skillBonus: f.intSkill ? stepBonus(d('int'), f.intStart, f.intSkill) : 0
    };
};

/** Pone en el héroe los efectos de una fórmula distinta a la del juego (deshace antes los de la real). */
export function applyDerive(hero, f) {
    const weapon = hero.equipment && hero.equipment.weapon;
    const b = deriveWith(f)(hero.primary, weapon && weapon.damaged);
    const old = hero._primaryBonus || { atq: 0, maxHp: 0 };
    hero.atq = Math.max(1, hero.atq - old.atq + b.atqBonus);
    const dHp = b.maxHpBonus - old.maxHp;
    if (dHp) {
        hero.maxHp = Math.max(1, hero.maxHp + dHp);
        hero.hp = Math.min(hero.maxHp, Math.max(1, hero.hp + Math.max(0, dHp)));
    }
    hero._primaryBonus = { atq: b.atqBonus, maxHp: b.maxHpBonus };
    Object.assign(hero, { elemDmgBonus: b.elemDmgBonus, critChance: b.critChance, critMult: b.critMult, dodgeChance: b.dodgeChance, physResist: b.physResist, elemResist: b.elemResist });
    const before = hero._skillBonus || 0;   // lo que ya se sumó al Golpe de Fuego: se aplica solo la diferencia
    if (b.skillBonus !== before) {
        hero.skillMods = hero.skillMods || {};
        const m = hero.skillMods.fire_strike = { ...(hero.skillMods.fire_strike || {}) };
        m.damage = (m.damage || 0) + b.skillBonus - before;
        hero._skillBonus = b.skillBonus;
    }
    return hero;
}

// Comprobación de cordura: la fórmula con los números actuales es EXACTAMENTE la del juego
{
    const a = deriveWith(CURRENT), probe = { str: 17, dex: 23, int: 12, vit: 31 };
    for (const w of ['filo', 'fuego', null]) {
        const x = a(probe, w), y = derivePrimaryReal(probe, w);
        for (const k of Object.keys(y)) if (Math.abs(x[k] - y[k]) > 1e-12) throw new Error(`deriveWith(CURRENT) difiere de derivePrimary en ${k} (${x[k]} ≠ ${y[k]})`);
    }
}

/**
 * Las propuestas, de menos a más cambios (cada una incluye las anteriores):
 *   A  arreglar la fuerza: +1 ATK a los 2 puntos y uno más cada 3 (hoy: el primero a los 10 y luego cada 10)
 *   B  A + hacer útiles INT (+1 al Golpe de Fuego cada 2 puntos) y DEX (4 % de crítico y 2 % de esquiva por
 *      punto, con topes de 60 % y 50 %; hoy 0,4 % y 0,3 % sin tope)
 *   C  B + suavizar la vida: VIT da +3 de vida y 0,3 % de resistencia por punto (hoy 4 y 0,4 %)   ← la recomendada
 */
const A = { ...CURRENT, strStart: 2, strPerAtk: 3 };
const B = { ...A, intStart: 2, intSkill: 2, dexCrit: 0.04, dexDodge: 0.02, dexCritCap: 0.6, dexDodgeCap: 0.5 };
const C = { ...B, vitHp: 3, vitRes: 0.003 };
export const PROPOSALS = { 'Actual': CURRENT, 'A': A, 'B': B, 'C': C };
export const PROPOSAL_NAMES = { 'Actual': 'Actual', 'A': 'A · fuerza arreglada', 'B': 'B · A + INT y DEX útiles', 'C': 'C · B + vida suavizada' };

// ---------------------------------------------
// Builds: cómo se reparten los puntos de nivel (el bot llama a `allocate(meta, n)` por cada punto, n = 0, 1, 2…)
// ---------------------------------------------
const cycle = keys => (meta, n) => keys[n % keys.length];
export const BUILDS = {
    'todo STR': () => 'str', 'todo VIT': () => 'vit', 'todo DEX': () => 'dex', 'todo INT': () => 'int',
    'STR+VIT (el de hoy)': cycle(['str', 'vit']),
    'STR+DEX': cycle(['str', 'dex']), 'STR+INT': cycle(['str', 'int']),
    'DEX+VIT': cycle(['dex', 'vit']), 'INT+VIT': cycle(['int', 'vit']), 'DEX+INT': cycle(['dex', 'int']),
    '4 por igual': cycle(['str', 'dex', 'int', 'vit'])
};
const PURE = ['todo VIT', 'todo STR', 'todo DEX', 'todo INT'];
const usesDex = build => Array.from({ length: 64 }, (_, n) => build({ primary: {} }, n)).includes('dex');

/**
 * Opciones de `simulate` para una variante: fórmula (null = la del juego), reparto de puntos, política, puntos por nivel
 * (el motor da 2; los de más se emulan sumando extras al mismo atributo) y arma.
 */
export function variant({ formula = null, build = BUILDS['STR+VIT (el de hoy)'], policy = POLS.fuego, pointsPerLevel = POINTS_PER_LEVEL, weapon = null } = {}) {
    const total = n => Math.round(n * pointsPerLevel / POINTS_PER_LEVEL);   // puntos acumulados tras n repartos del motor
    return {
        policy,
        random: usesDex(build),   // solo DEX tira dados (crítico y esquiva): sin él, todas las partidas salen iguales
        allocate: (meta, n) => {
            const key = build(meta, n);
            const extra = total(n + 1) - total(n) - 1;
            if (extra > 0) meta.primary[key] += extra;
            return key;
        },
        heroHook: hero => {
            if (weapon) equipItem(hero, createRpgItem({ baseId: weapon, rarityId: 'comun', floor: 0 }));
            if (formula) applyDerive(hero, formula);
            else if (weapon) Engine.refreshPrimaryStats(hero);
        }
    };
}

// ---------------------------------------------
// Escenarios: con qué bot y con qué dificultad de Zafias
// ---------------------------------------------
/**
 * Sube (o baja) `k` pisos a todos los enemigos de Zafias, EN MEMORIA, mientras dura `fn` (como el SHIFT de
 * tests/adventure-sim.mjs, pero se deshace al terminar para poder encadenar variantes).
 */
export function withShift(k, fn) {
    const saved = [];
    for (const sc of Object.values(ZAFIAS.scenes)) for (const p of sc.points) if (p.enemy && p.enemy.floor != null) saved.push([p.enemy, p.enemy.floor]);
    for (const c of Object.values(CREATURES)) saved.push([c, c.floor]);
    for (const [o] of saved) o.floor = Math.max(0, o.floor + k);
    try { return fn(); } finally { for (const [o, f] of saved) o.floor = f; }
}
export const WORLDS = {
    W0: { label: 'W0 · Zafias de hoy, bot «listo» (sin Golpe de Fuego)', policy: POLS.listo, shift: 0 },
    W1: { label: 'W1 · Zafias de hoy, bot «fuego»', policy: POLS.fuego, shift: 0 },
    W2: { label: 'W2 · Zafias +2 pisos, bot «fuego» (la dificultad vuelve)', policy: POLS.fuego, shift: 2 }
};

// ---------------------------------------------
// Medidas y tablas
// ---------------------------------------------
const avg = (xs, f = x => x) => xs.reduce((s, x) => s + f(x), 0) / (xs.length || 1);
const nan = (x, s) => (Number.isFinite(x) ? s : '—');
const pct = (x, d = 0) => nan(x, `${(x * 100).toFixed(d)} %`);
const f1 = x => nan(x, x.toFixed(1));
const f2 = x => nan(x, x.toFixed(2));

const TRACKED = { 'Feronius el Feroz': 'fer', 'Grask, jefe goblin': 'gra' };
/**
 * Juega una variante. Además de lo que mide el bot, anota por combate contra Grask y Feronius la vida perdida BRUTA
 * (lo que te quitan, aunque bebas poción: la «neta» del bot resta lo curado) y las veces que se usa el Golpe de Fuego.
 * Todo desde fuera: envuelve la política y `onVictory`, sin tocar la librería. Las variantes sin azar juegan `DET_RUNS`.
 */
export function play(v, runs = null, seed0 = SEED0) {
    const n = runs || (v.random ? RUNS : DET_RUNS);
    const tele = { fer: [], gra: [] };
    let cur = null;
    const close = () => { if (cur) { tele[cur.key].push(cur); cur = null; } };
    const inner = v.policy;
    const policy = (c, hero, m, ctx) => {
        if (ctx.turns === 1) {
            close();
            const key = TRACKED[m.name];
            cur = key ? { key, hp0: hero.hp, maxHp: hero.maxHp, healed: 0, skills: 0, potions: 0, won: false, finalHp: 0 } : null;
        }
        const a = inner(c, hero, m, ctx);
        if (cur) {
            if (a === 'potion') { cur.potions++; cur.healed += Math.min(hero.maxHp - hero.hp, Math.max(1, Math.round(hero.maxHp * RPG_BALANCE.potion.heal))); }
            if (a === 'skill') cur.skills++;
        }
        return a;
    };
    const onVictory = (st, enemy, id) => { if (cur) { cur.won = true; cur.finalHp = st.hp; } if (v.onVictory) v.onVictory(st, enemy, id); };
    const { random, ...rest } = v;
    const res = simulate({ runs: n, seed0, ...rest, policy, onVictory });
    close();
    for (const k of ['fer', 'gra']) {
        const xs = tele[k];
        res[`${k}Gross`] = xs.length ? avg(xs, x => (x.hp0 - (x.won ? x.finalHp : 0) + x.healed) / x.maxHp) : NaN;
        res[`${k}Skills`] = xs.length ? avg(xs, x => x.skills) : NaN;
        res[`${k}Potions`] = xs.length ? avg(xs, x => x.potions) : NaN;
    }
    return res;
}

/** Las medidas de una variante, en un objeto plano. */
export function measure(res) {
    const { stats, runs } = res;
    const N = runs.length;
    const done = runs.filter(r => r.done);
    const fer = stats.feronius, gra = stats.grask;
    const deathsBy = id => runs.reduce((s, r) => s + (r.deathsBy[id] || 0), 0) / N;
    const fights = runs.reduce((s, r) => s + r.fights, 0);
    return {
        n: N,
        done: done.length / N,
        stuck: runs.filter(r => r.stuck).length / N,
        trainGrask: avg(runs, r => r.trainFor.grask ?? 0),
        trainTotal: avg(runs, r => r.farmFights),
        deaths: avg(runs, r => r.deaths),
        deathsGrask: deathsBy('grask'),
        noDeath: runs.filter(r => !r.deaths).length / N,
        lvGrask: runs.some(r => r.levelAt.grask) ? avg(runs.filter(r => r.levelAt.grask), r => r.levelAt.grask) : NaN,
        lvFer: done.length ? avg(done, r => r.levelAt.feronius) : NaN,
        ferWin: fer ? fer.wins / fer.fights : NaN,            // victorias por intento contra Feronius
        ferNet: fer ? fer.hpLost / fer.fights : NaN,          // vida neta perdida (si bebe, resta lo curado)
        ferGross: res.ferGross, ferSkills: res.ferSkills, ferPotions: res.ferPotions, grGross: res.graGross,
        turns: runs.reduce((s, r) => s + r.turns, 0) / (fights || 1),
        fights: fights / N,
        sleeps: avg(runs, r => r.sleeps),
        potions: avg(runs, r => r.potionsUsed),
        level: avg(runs, r => r.level)
    };
}

/** Tabla en Markdown. `rows` = [[nombre, medidas]]; `cols` = [[título, función(medidas)]]. */
export function table(rows, cols, first = 'Variante') {
    const out = [`| ${first} | ${cols.map(c => c[0]).join(' | ')} |`, `|${'---|'.repeat(cols.length + 1)}`];
    for (const [name, m] of rows) out.push(`| ${name} | ${cols.map(c => c[1](m)).join(' | ')} |`);
    return out.join('\n');
}
const COLS_MAIN = [
    ['Entrenan antes de Grask', m => f1(m.trainGrask)],
    ['Caídas / partida', m => f2(m.deaths)],
    ['Nivel en Grask', m => f1(m.lvGrask)],
    ['Nivel en Feronius', m => f1(m.lvFer)],
    ['Vida perdida ante Feronius', m => pct(m.ferGross)],
    ['Turnos / combate', m => f1(m.turns)],
    ['Se atascan', m => pct(m.stuck, 1)]
];

const t0 = Date.now();
const secs = () => `${((Date.now() - t0) / 1000).toFixed(0)} s`;
const h = t => console.log(`\n### ${t}\n`);
const log = s => console.log(s);

// ---------------------------------------------
// Duelos sueltos: cuánto poder da cada punto, sin la política de entrenamiento del bot
// ---------------------------------------------
/**
 * Un duelo: un héroe con `points` puntos repartidos según `build` (y la fórmula pedida) contra un enemigo de Zafias,
 * con la vida llena y SIN pociones, `n` veces con semillas distintas. Devuelve { win, hpLost (media, en victorias), turns }.
 */
export function duel({ enemy = 'grask', points = 0, build = BUILDS['STR+VIT (el de hoy)'], formula = null, policy = POLS.fuego, weapon = null, n = 100 } = {}) {
    let wins = 0, lost = 0, turns = 0;
    for (let i = 0; i < n; i++) {
        const hero = Engine.createRpgHero();
        if (weapon) equipItem(hero, createRpgItem({ baseId: weapon, rarityId: 'comun', floor: 0 }));
        for (let k = 0; k < points; k++) hero.primary[build({ primary: hero.primary }, k)]++;
        Engine.refreshPrimaryStats(hero);
        if (formula) applyDerive(hero, formula);
        hero.hp = hero.maxHp;
        const m = makeEnemy(point[enemy]);
        const c = Engine.createRpgCombat(hero, m, rngFrom(777 + i));
        let t = 0;
        while (!c.over && t < 200) { t++; const r = Engine.rpgCombatAction(c, policy(c, hero, m, { turns: t })); if (!r.ok) Engine.rpgCombatAction(c, 'attack'); }
        if (c.result === 'victory') { wins++; lost += (hero.maxHp - hero.hp) / hero.maxHp; }
        turns += t;
    }
    return { win: wins / n, hpLost: wins ? lost / wins : NaN, turns: turns / n };
}
/** Los cinco combates que miden el poder: tres muros de la historia y dos intermedios. */
export const WALLS = ['goblin-3', 'guardia', 'grask', 'lobo-guarida', 'feronius'];
/** Vida perdida media en los cinco combates (un combate perdido cuenta como 100 %) y la peor tasa de victorias. */
export function power(opts, world = WORLDS.W2) {
    return withShift(world.shift, () => {
        let lost = 0, win = 1;
        for (const e of WALLS) {
            const r = duel({ ...opts, enemy: e, policy: world.policy, n: usesDex(opts.build || BUILDS['STR+VIT (el de hoy)']) ? 150 : 3 });
            lost += Number.isFinite(r.hpLost) ? r.hpLost : 1;
            win = Math.min(win, r.win);
        }
        return { lost: lost / WALLS.length, win };
    });
}
const powerCell = r => `${r.win < 1 ? '*' : ''}${(r.lost * 100).toFixed(0)} %`;

// ---------------------------------------------
// 1. El Golpe de Fuego
// ---------------------------------------------
export function secFuego() {
    h(`1a. Políticas de combate, con el reparto de hoy (STR+VIT alterno) y Zafias como está · ${DET_RUNS} partidas por fila`);
    const rows = [];
    for (const [name, policy] of Object.entries(POLS)) rows.push([name, measure(play(variant({ policy })))]);
    log(table(rows, [...COLS_MAIN, ['Pociones / partida', m => f1(m.potions)], ['Combates / partida', m => f1(m.fights)]], 'Política'));

    h('1b. Combate a combate (reparto de hoy): «listo» frente a «fuego»');
    const ids = ['goblin-1', 'goblin-3', 'guardia', 'grask', 'lobo-sendero', 'centinela', 'feronius'];
    const names = ['Goblin vigía', 'Goblin ladrón', 'Goblin de guardia', 'Grask', 'Lobo de Zafias', 'Goblin centinela', 'Feronius'];
    log(`| Política | ${names.join(' | ')} |\n|${'---|'.repeat(names.length + 1)}`);
    for (const pol of ['listo', 'fuego']) {
        const s = play(variant({ policy: POLS[pol] })).stats;
        log(`| ${pol} | ${ids.map(id => (s[id] ? `${f1(s[id].turns / s[id].fights)} t · ${pct(s[id].wins / s[id].fights)}` : '—')).join(' | ')} |`);
    }
    log('\n(Cada celda: turnos por combate · victorias por intento.)');

    h('1c. ¿Cuántos pisos hay que subir a Zafias para devolverle la dificultad? (reparto de hoy)');
    log('Se suben `k` pisos a todos los enemigos, en memoria. «listo» a +0 es la curva con la que se calibró Zafias.\n');
    const rows2 = [];
    for (const pol of ['listo', 'fuego']) for (const k of [0, 1, 2, 3]) rows2.push([`${pol} · +${k} pisos`, withShift(k, () => measure(play(variant({ policy: POLS[pol] }))))]);
    log(table(rows2, [...COLS_MAIN, ['Combates / partida', m => f1(m.fights)]], 'Política · dificultad'));

    h('1d. Combinar con defender y pociones: cuándo beber (política «fuego», W2: Zafias +2 pisos)');
    const rows3 = [];
    for (const pot of [0.2, 0.35, 0.5, 0.65]) rows3.push([`beber por debajo del ${pct(pot)}`, withShift(2, () => measure(play(variant({ policy: FIRE.fuego(pot) }))))]);
    log(table(rows3, [...COLS_MAIN, ['Pociones / partida', m => f1(m.potions)]], 'Umbral'));
}

// ---------------------------------------------
// 2. Builds
// ---------------------------------------------
export function secBuilds() {
    for (const [id, w] of Object.entries(WORLDS)) {
        h(`2${id.slice(1) === '0' ? 'a' : id.slice(1) === '1' ? 'b' : 'c'}. Builds · ${w.label}`);
        const rows = Object.entries(BUILDS).map(([name, build]) => [name, withShift(w.shift, () => measure(play(variant({ build, policy: w.policy }))))]);
        log(table(rows, COLS_MAIN, 'Build'));
    }
    h('2d. INT con un arma elemental: Varita de ceniza (Fuego, ATK 1: igual que la espada del sendero) · W2');
    const rows = [];
    for (const name of ['todo INT', 'INT+VIT', 'STR+VIT (el de hoy)']) {
        for (const [arma, weapon] of [['espada', null], ['varita de fuego', 'varita_ceniza']]) {
            rows.push([`${name} · ${arma}`, withShift(2, () => measure(play(variant({ build: BUILDS[name], policy: POLS.fuego, weapon }))))]);
        }
    }
    log(table(rows, COLS_MAIN, 'Build · arma'));
}

// ---------------------------------------------
// 3. Poder por punto y por nivel
// ---------------------------------------------
const POINTS = [0, 2, 4, 6, 8, 10, 12, 16, 20];
export function secPoder() {
    h('3a. Poder de cada punto: vida perdida media en cinco combates de Zafias (goblin ladrón, goblin de guardia, Grask, lobo de la guarida, Feronius)');
    log('Héroe con la vida llena, sin pociones, política «fuego». Cuanto **menos** se pierde, más poder. `*` = pierde algún combate. Fórmulas de hoy.\n');
    for (const wid of ['W2', 'W1']) {
        log(`**${WORLDS[wid].label}**\n`);
        log(`| Build \\ puntos | ${POINTS.join(' | ')} |\n|${'---|'.repeat(POINTS.length + 1)}`);
        for (const name of PURE) log(`| ${name} | ${POINTS.map(p => powerCell(power({ points: p, build: BUILDS[name] }, WORLDS[wid]))).join(' | ')} |`);
        log('');
    }

    h('3b. ¿Cuánto se nota subir de nivel? Lo mismo, por nivel del héroe (2 puntos por nivel) · W2');
    const levels = [1, 2, 3, 4, 5, 6, 8, 10];
    log(`| Build \\ nivel | ${levels.join(' | ')} |\n|${'---|'.repeat(levels.length + 1)}`);
    for (const [pname, f] of [['Actual', null], ['C', C]]) {
        for (const name of ['STR+VIT (el de hoy)', 'todo VIT', 'todo STR', 'todo DEX', 'todo INT']) {
            log(`| ${pname === 'Actual' ? '' : 'C · '}${name} | ${levels.map(l => powerCell(power({ points: (l - 1) * POINTS_PER_LEVEL, build: BUILDS[name], formula: f }))).join(' | ')} |`);
        }
    }
    log('\n(Las filas sin prefijo son las fórmulas de hoy; las de «C · …», la propuesta C.)');
}

// ---------------------------------------------
// 4. Propuestas
// ---------------------------------------------
export function secPropuestas() {
    h('4a. Qué cambia cada propuesta');
    const diff = f => Object.entries(f).filter(([k, v]) => v !== CURRENT[k]).map(([k, v]) => `${k} ${v}`).join(' · ') || '—';
    log('| Propuesta | Números respecto a hoy |\n|---|---|');
    for (const [k, f] of Object.entries(PROPOSALS)) log(`| ${PROPOSAL_NAMES[k]} | ${k === 'Actual' ? 'strPerAtk 10 · vitHp 4 · vitRes 0.004 · dexCrit 0.004 · dexDodge 0.003 · intSkill 0 (INT no toca el Golpe de Fuego)' : diff(f)} |`);

    h('4b. Poder por punto de cada build puro con cada propuesta (vida perdida media en cinco combates · W2)');
    log(`| Propuesta · build \\ puntos | ${POINTS.join(' | ')} |\n|${'---|'.repeat(POINTS.length + 1)}`);
    for (const [k, f] of Object.entries(PROPOSALS)) {
        for (const name of PURE) log(`| ${k} · ${name} | ${POINTS.map(p => powerCell(power({ points: p, build: BUILDS[name], formula: k === 'Actual' ? null : f }))).join(' | ')} |`);
    }

    h(`4c. Partidas completas de Zafias en W2 con cada propuesta · ${RUNS}/${DET_RUNS} partidas por fila`);
    const names = [...PURE, 'STR+VIT (el de hoy)', 'DEX+VIT', 'INT+VIT', '4 por igual'];
    for (const [k, f] of Object.entries(PROPOSALS)) {
        log(`\n**${PROPOSAL_NAMES[k]}**\n`);
        const rows = names.map(name => [name, withShift(2, () => measure(play(variant({ build: BUILDS[name], formula: k === 'Actual' ? null : f }))))]);
        log(table(rows, COLS_MAIN, 'Build'));
    }

    h('4d. Puntos por nivel: 2 (hoy), 3 y 4 · reparto de hoy y «4 por igual» · fórmulas de hoy y propuesta C · W2');
    const rows = [];
    for (const [k, f] of [['Actual', null], ['C', C]]) {
        for (const name of ['STR+VIT (el de hoy)', '4 por igual']) {
            for (const ppl of [2, 3, 4]) rows.push([`${k} · ${name} · ${ppl} pts/nivel`, withShift(2, () => measure(play(variant({ build: BUILDS[name], formula: f, pointsPerLevel: ppl }))))]);
        }
    }
    log(table(rows, COLS_MAIN, 'Fórmulas · build · puntos'));

    h('4e. DEX: cuánto crítico y esquiva por punto (propuesta C, cambiando solo esto) · W2 y descenso');
    const dexes = [[0.03, 0.015], [0.04, 0.02], [0.05, 0.025]];
    const rows5 = [];
    for (const [crit, dodge] of dexes) {
        for (const name of ['todo DEX', 'DEX+VIT']) {
            rows5.push([`${(crit * 100).toFixed(0)} % / ${(dodge * 100).toFixed(1)} % · ${name}`, withShift(2, () => measure(play(variant({ build: BUILDS[name], formula: { ...C, dexCrit: crit, dexDodge: dodge } }))))]);
        }
    }
    log(table(rows5, COLS_MAIN, 'Crítico / esquiva por punto · build'));
    log(`\nDescenso con el bot sensato (${DESC_RUNS} partidas por celda), «todo DEX»: victorias % / llegadas al jefe %\n`);
    log('| Crítico / esquiva por punto | 6 puntos | 12 puntos | 20 puntos | 30 puntos |\n|---|---|---|---|---|');
    for (const [crit, dodge] of dexes) {
        const cells = [6, 12, 20, 30].map(pts => { const r = descentBatch('sensato', DESC_RUNS, { points: pts, build: BUILDS['todo DEX'], formula: { ...C, dexCrit: crit, dexDodge: dodge } }); return `${pct(r.won)} / ${pct(r.reached)}`; });
        log(`| ${(crit * 100).toFixed(0)} % / ${(dodge * 100).toFixed(1)} % | ${cells.join(' | ')} |`);
    }
}

// ---------------------------------------------
// 5. El descenso (copia del bucle de tools/sim.mjs `playRun`, con un héroe ya «subido de nivel»)
// ---------------------------------------------
/** Como `playRun` de tools/sim.mjs, pero el héroe sale con `points` puntos invertidos y la fórmula pedida (null = la del juego). */
export function playDescent(botName, seed, { points = 0, build = BUILDS['STR+VIT (el de hoy)'], formula = null } = {}) {
    const bot = BOTS[botName];
    const rng = createRng(seed);
    const hero = Engine.createRpgHero();
    for (let i = 0; i < points; i++) hero.primary[build({ primary: hero.primary }, i)]++;
    Engine.refreshPrimaryStats(hero);
    if (formula) { applyDerive(hero, formula); hero.hp = hero.maxHp; }
    const map = Engine.generateRpgMap(rng, Engine.RPG_MAP_CONFIG);
    const byId = new Map(map.nodes.map(n => [n.id, n]));
    const used = [];
    const res = { won: false, reachedBoss: false, deathFloor: null };
    const loot = (source, floor) => {
        const it = rollLootDrop({ rng, floor, source, hero });
        if (botName === 'torpe') equipItem(hero, it);
        else if (itemScore(it) - itemScore(hero.equipment[it.slot]) > 0) equipItem(hero, it);
        else discardItem(hero, it);
        // Como hace main.js al equipar: el bono de STR/INT depende del tipo de daño del arma, así que se recalcula.
        // (tools/sim.mjs no lo hace; con 0 puntos da igual, y con puntos así se parece más al juego de verdad.)
        if (formula) applyDerive(hero, formula); else Engine.refreshPrimaryStats(hero);
    };
    let cur = null, skip = false;
    for (;;) {
        const useSkip = skip; skip = false;
        const options = Engine.rpgAvailableNodes(map, cur, useSkip);
        if (!options.length) break;
        const node = byId.get(bot.chooseNode({ options, byId, hero, rng, map }));
        if (node.type === 'boss') res.reachedBoss = true;
        if (Engine.RPG_COMBAT_TYPES.includes(node.type)) {
            const m = Engine.createRpgMonster(node.type, node.floor);
            const out = fightWith(bot.policy, hero, m, rng);
            if (out.result !== 'victory') { res.deathFloor = node.floor; return res; }
            Engine.applyRpgReward(hero, Engine.rpgVictoryReward(node.type));
            if (node.type === 'subboss') loot('subboss', node.floor);
            else if (node.type === 'monster' && rng() < RPG_BALANCE.loot.combatDropChance) loot('combat', node.floor);
        } else if (node.type === 'chest') {
            hero.hp = Math.min(hero.maxHp, hero.hp + ruleSum(hero, 'treasure_heal'));
            loot('chest', node.floor);
        } else if (node.type === 'campfire') {
            const session = Events.startRpgEvent('hoguera', rng, node.floor);
            const out = Events.resolveRpgEventChoice(session, bot.campfire({ hero, rng }), hero, rng);
            if (out.loot) loot(out.loot, node.floor);
        } else if (node.type === 'event') {
            const evId = Events.pickRpgEvent(used, node.floor, rng, Engine.RPG_MAP_CONFIG);
            used.push(evId);
            const session = Events.startRpgEvent(evId, rng, node.floor);
            let r = Events.resolveRpgEventChoice(session, bot.chooseOption({ session, hero, rng }), hero, rng);
            let guard = 10;
            while (r.next && guard--) r = Events.resolveRpgEventChoice(session, bot.chooseOption({ session, hero, rng }), hero, rng);
            if (r.skipFloor) skip = true;
            if (r.combat) {
                const m = Events.createEventMonster(r.combat.monster, hero, node.floor, r.combat.hpFactor);
                const out = fightWith(bot.policy, hero, m, rng);
                if (out.result !== 'victory') { res.deathFloor = node.floor; return res; }
                if (r.combat.onWin) Events.applyRpgFx(hero, r.combat.onWin);
            }
        }
        cur = node.id;
        if (node.type === 'boss') { res.won = true; return res; }
    }
    return res;
}

export function descentBatch(botName, n, opts) {
    let won = 0, reached = 0;
    for (let i = 0; i < n; i++) { const r = playDescent(botName, 20000 + i, opts); if (r.won) won++; if (r.reachedBoss) reached++; }
    return { won: won / n, reached: reached / n };
}

/** Comprobación: con 0 puntos, `playDescent` hace exactamente lo mismo que `playRun` de tools/sim.mjs (mismas semillas). */
export function checkDescent(n = 200) {
    const out = [];
    for (const botName of ['sensato', 'experto']) {
        let same = 0;
        for (let i = 0; i < n; i++) {
            const a = playRun(botName, 20000 + i), b = playDescent(botName, 20000 + i);
            if (a.won === b.won && a.reachedBoss === b.reachedBoss && a.deathFloor === b.deathFloor) same++;
        }
        out.push(`${botName}: ${same}/${n}`);
    }
    return out.join(' · ');
}

export function secDescenso() {
    h('5. Descenso (16 pisos): victorias % / llegadas al jefe % con `puntos` puntos de nivel ya repartidos');
    log(`El héroe empieza sin equipo extra, como una ruta nueva (el equipo lo encuentra por el camino). Con 0 puntos todas las fórmulas dan lo mismo: es el control, y es lo que mira \`npm run balance\`. Sensato: ${DESC_RUNS} partidas por celda; experto: ${Math.round(DESC_RUNS / 2)}.\n`);
    log(`Control: con 0 puntos, la copia del bucle coincide con \`playRun\` de tools/sim.mjs en las mismas semillas (partidas idénticas) → ${checkDescent()}.\n`);
    const points = [0, 6, 12, 20, 30];
    const builds = ['todo VIT', 'todo STR', 'todo DEX', 'todo INT', 'STR+VIT (el de hoy)', 'INT+VIT', 'DEX+VIT', '4 por igual'];
    for (const botName of sopt('bot', 'sensato,experto').split(',')) {
        const n = botName === 'sensato' ? DESC_RUNS : Math.round(DESC_RUNS / 2);
        log(`\n**Bot «${botName}»**\n`);
        log(`| Propuesta · build | ${points.join(' puntos | ')} puntos |\n|${'---|'.repeat(points.length + 1)}`);
        const zero = descentBatch(botName, n, { points: 0 });
        for (const [k, f] of Object.entries(PROPOSALS)) {
            for (const name of builds) {
                const cells = points.map(p => { if (p === 0) return `${pct(zero.won)} / ${pct(zero.reached)}`; const r = descentBatch(botName, n, { points: p, build: BUILDS[name], formula: k === 'Actual' ? null : f }); return `${pct(r.won)} / ${pct(r.reached)}`; });
                log(`| ${k} · ${name} | ${cells.join(' | ')} |`);
            }
        }
    }
    log(`\n(${secs()})`);
}

// ---------------------------------------------
// 6. Otras semillas
// ---------------------------------------------
export function secSemillas() {
    h('6a. Sin azar, las partidas salen idénticas: el mismo build jugado con 100, 200 y 2000 partidas (Actual, STR+VIT, W2)');
    const rows = [100, 200, 2000].map(n => [`${n} partidas`, withShift(2, () => measure(play(variant({}), n)))]);
    log(table(rows, COLS_MAIN, 'Partidas'));

    h(`6b. Con azar (DEX), el resultado se mueve poco entre bloques de ${RUNS} partidas distintas · W2`);
    const rows2 = [];
    for (const [k, f] of [['Actual', null], ['C', C]]) {
        for (const name of ['todo DEX', 'DEX+VIT']) {
            for (const seed of [1000, 500000, 9000000]) rows2.push([`${k} · ${name} · semilla ${seed}`, withShift(2, () => measure(play(variant({ build: BUILDS[name], formula: f }), RUNS, seed)))]);
        }
    }
    log(table(rows2, COLS_MAIN, 'Variante'));
}

// ---------------------------------------------
// Principal
// ---------------------------------------------
const SECTIONS = { fuego: secFuego, builds: secBuilds, poder: secPoder, propuestas: secPropuestas, descenso: secDescenso, semillas: secSemillas };
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const which = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || 'todo';
    const list = which === 'todo' ? Object.keys(SECTIONS) : [which];
    if (list.some(s => !SECTIONS[s])) { console.error(`Sección desconocida «${which}». Usa: ${Object.keys(SECTIONS).join(' · ')} · todo`); process.exit(1); }
    log(`# Banco de builds y atributos · Zafias · ${RUNS} partidas por variante con azar, ${DET_RUNS} sin azar (semilla ${SEED0})`);
    for (const s of list) SECTIONS[s]();
    log(`\nTiempo total: ${secs()}`);
}

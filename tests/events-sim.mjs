// =============================================
// 🎲 RPG-pack — eventos (src/events.js + src/data/events.js, puro)
// =============================================
import {
    createRpgHero, createRpgCombat, rpgCombatAction, rpgCanFlee, rpgSkillReady, rpgSkillInfo,
    generateRpgMap, rpgAvailableNodes, RPG_COMBAT_TYPES, RPG_MAP_CONFIG,
    rpgVictoryReward, applyRpgReward, createRpgMonster, rpgMonsterStats
} from '../src/engine.js';
import { playRun } from '../tools/sim.mjs';
import {
    RPG_EVENTS, EVENT_MONSTERS, getRpgEvent, applyRpgFx, pickRpgEvent, startRpgEvent,
    rpgEventScreen, resolveRpgEventChoice, createEventMonster
} from '../src/events.js';
import { LECTOR_RIDDLES } from '../src/data/events.js';

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
const fixed = v => () => v;               // siempre el mismo número
const heroWith = (o = {}) => Object.assign(createRpgHero(), { hp: 20, maxHp: 25, atq: 3 }, o);

/** Juega un evento entero: decisiones = índices; devuelve el resultado final. */
function play(id, choices, { hero = heroWith(), rng = fixed(0.1), floor = 5 } = {}) {
    const session = startRpgEvent(id, rng, floor);
    let res = null;
    const all = { lines: [], changes: [] };
    for (const c of choices) {
        res = resolveRpgEventChoice(session, c, hero, rng);
        all.lines.push(...res.lines); all.changes.push(...res.changes);
        if (!res.next) break;
    }
    return { ...res, lines: all.lines, changes: all.changes, hero, session };
}

// ---------------------------------------------
console.log('\n📚 Catálogo: 15 eventos, cada uno con una situación y 2 decisiones');
assert('hay exactamente 15 eventos', RPG_EVENTS.length === 15);
assert('los ids son únicos', new Set(RPG_EVENTS.map(e => e.id)).size === 15);
assert('todos tienen icono, título y situación', RPG_EVENTS.every(e => e.icon && e.title && e.text));
assert('la pantalla inicial de cada evento tiene exactamente 2 decisiones con nombre', RPG_EVENTS.every(e => {
    const scr = rpgEventScreen(startRpgEvent(e.id, mulberry32(1)));
    return scr.options.length === 2 && scr.options.every(o => typeof o === 'string' && o.length > 0) && scr.text.length > 20;
}));
assert('hay 15 títulos distintos', new Set(RPG_EVENTS.map(e => e.title)).size === 15);
assert('el altar de sangre, el pacto y la usurera ya no existen',
    !RPG_EVENTS.some(e => /altar|pacto|usurera/i.test(e.id + e.title)));
assert('existen el extraño encapuchado, el derrumbe y el Lector',
    ['extrano_encapuchado', 'derrumbe', 'lector'].every(id => !!getRpgEvent(id)));
assert('todos los monstruos que citan los eventos existen', (() => {
    const found = new Set();
    for (let seed = 1; seed <= 300; seed++) for (const e of RPG_EVENTS) for (const opt of [0, 1]) {
        const r = play(e.id, [opt, 0, 0, 0], { hero: heroWith({ atq: 1 + seed % 6 }), rng: mulberry32(seed) });
        if (r.combat) found.add(r.combat.monster);
    }
    return [...found].every(m => EVENT_MONSTERS[m]) && found.size === Object.keys(EVENT_MONSTERS).length;
})());

// ---------------------------------------------
console.log('\n🧮 Efectos (applyRpgFx)');
{
    let h = heroWith({ hp: 10, maxHp: 25 });
    const labels = applyRpgFx(h, { hp: 5 });
    assert('curar suma HP y da etiqueta', h.hp === 15 && labels.includes('+5 HP'));
    h = heroWith({ hp: 20, maxHp: 25 }); applyRpgFx(h, { hp: 50 });
    assert('curar nunca supera el máximo', h.hp === 25);
    h = heroWith({ hp: 6, maxHp: 25 }); const l2 = applyRpgFx(h, { hp: -8 });
    assert('el daño de un evento nunca mata: mínimo 1 HP', h.hp === 1 && l2.includes('−5 HP'));
    h = heroWith({ hp: 10, maxHp: 25 }); applyRpgFx(h, { maxHp: 6 });
    assert('+HP máx también cura esa cantidad', h.maxHp === 31 && h.hp === 16);
    h = heroWith({ hp: 10, maxHp: 25 }); applyRpgFx(h, { hp: -5, maxHp: 8 });
    assert('esfuerzo y colgante (−5 HP, +8 HP máx): máx 33 y HP 13', h.maxHp === 33 && h.hp === 13);
    h = heroWith({ hp: 10, maxHp: 25 }); const l3 = applyRpgFx(h, { hp: -5, maxHp: 8 });
    assert('las etiquetas cuentan −5 HP y +8 HP máx (no el neto)', l3.includes('−5 HP') && l3.includes('+8 HP máx'));
    h = heroWith({ hp: 3, maxHp: 25 }); applyRpgFx(h, { heal: 'full' });
    assert('curación completa', h.hp === 25);
    h = heroWith({ atq: 1 }); applyRpgFx(h, { atq: -1 });
    assert('el ATK nunca baja de 1', h.atq === 1);
    h = heroWith({ atq: 3, level: 1 }); applyRpgFx(h, { atq: 2 });
    assert('ganar ATK sube el nivel', h.atq === 5 && h.level === 2);
    h = heroWith(); applyRpgFx(h, { vows: { noFlee: true } });
    assert('un voto queda anotado en el héroe', h.vows.noFlee === true);
    h = heroWith(); applyRpgFx(h, { skillMods: { fire_strike: { damage: 3, cooldown: -1 } } }); applyRpgFx(h, { skillMods: { fire_strike: { damage: 1 } } });
    assert('las mejoras de habilidad se acumulan', h.skillMods.fire_strike.damage === 4 && h.skillMods.fire_strike.cooldown === -1);
    h = heroWith(); applyRpgFx(h, { affinity: { guerrero: 2 } }); applyRpgFx(h, { affinity: { guerrero: 2, elementalista: 1 } });
    assert('las afinidades se acumulan', h.affinity.guerrero === 4 && h.affinity.elementalista === 1 && h.affinity.picaro === 0);
}

// ---------------------------------------------
console.log('\n🩹 Los 10 primeros: resultados de cada decisión');
{
    let r = play('chica_herida', [0]);
    assert('1A. ayudar a la chica: emboscada de bandidos con premio de +1 ATK', r.combat && r.combat.monster === 'jefe_bandidos' && r.combat.onWin.atq === 1 && r.lines.join(' ').includes('emboscada'));
    r = play('chica_herida', [1]);
    assert('1B. ignorarla: no pasa nada', !r.combat && r.changes.length === 0);

    r = play('extrano_encapuchado', [0], { rng: fixed(0.1) });
    assert('2A. confiar (suerte): +1 ATK y +8 HP', r.hero.atq === 4 && r.hero.hp === 25 && r.changes.includes('+1 ATK'));
    r = play('extrano_encapuchado', [0], { rng: fixed(0.9) });
    assert('2A. confiar (mala suerte): era un ladrón, −8 HP', r.hero.hp === 12 && r.hero.atq === 3);
    r = play('extrano_encapuchado', [1]);
    assert('2B. rechazarlo: nada', r.changes.length === 0 && r.hero.hp === 20);

    r = play('cofre_susurrante', [0], { rng: fixed(0.1) });
    assert('3A. cofre (bueno): +2 ATK', r.hero.atq === 5 && !r.combat);
    r = play('cofre_susurrante', [0], { rng: fixed(0.9) });
    assert('3A. cofre (mímico): combate', r.combat && r.combat.monster === 'mimico');
    r = play('cofre_susurrante', [1]);
    assert('3B. dejarlo: nada', r.changes.length === 0);

    r = play('campamento_abandonado', [0], { rng: fixed(0.1) });
    assert('4A. descansar (tranquilo): +5 HP hasta el máximo y sin combate', r.hero.hp === 25 && !r.combat);
    r = play('campamento_abandonado', [0], { rng: fixed(0.9) });
    assert('4A. descansar (emboscada): cura 10 y luego pelea con un merodeador', r.combat && r.combat.monster === 'merodeador' && r.hero.hp === 25 - 0);
    r = play('campamento_abandonado', [1]);
    assert('4B. registrar: +1 ATK y −4 HP', r.hero.atq === 4 && r.hero.hp === 16);

    r = play('espejo_oscuro', [0]);
    assert('5A. enfrentar el espejo: duelo contra tu reflejo, +1 ATK y +5 HP máx si ganas', r.combat.monster === 'reflejo' && r.combat.onWin.atq === 1 && r.combat.onWin.maxHp === 5);
    r = play('espejo_oscuro', [1]);
    assert('5B. apartar la mirada: nada', !r.combat && r.changes.length === 0);

    r = play('caballero_caido', [0]);
    assert('6A. honores: +6 HP máx', r.hero.maxHp === 31 && r.hero.atq === 3);
    r = play('caballero_caido', [1]);
    assert('6B. saquear: +2 ATK y −8 HP', r.hero.atq === 5 && r.hero.hp === 12);

    r = play('pozo_deseos', [0]);
    assert('7A. desear salud: +12 HP', r.hero.hp === 25);
    r = play('pozo_deseos', [1]);
    assert('7B. desear poder: +1 ATK y −4 HP', r.hero.atq === 4 && r.hero.hp === 16);

    r = play('puente_cuerdas', [0], { rng: fixed(0.1) });
    assert('8A. puente (aguanta): te saltas un piso', r.skipFloor === true && r.hero.hp === 20);
    r = play('puente_cuerdas', [0], { rng: fixed(0.9) });
    assert('8A. puente (cede): −6 HP y sin salto', !r.skipFloor && r.hero.hp === 14);
    r = play('puente_cuerdas', [1]);
    assert('8B. rodearlo: nada', !r.skipFloor && r.changes.length === 0);

    r = play('puerta_sellada', [0], { hero: heroWith({ atq: 4 }) });
    assert('9A. forzar con ATK 4: +2 ATK y +5 HP máx', r.hero.atq === 6 && r.hero.maxHp === 30);
    r = play('puerta_sellada', [0], { hero: heroWith({ atq: 3 }) });
    assert('9A. forzar con ATK 3: solo pierdes 6 HP', r.hero.atq === 3 && r.hero.hp === 14 && r.hero.maxHp === 25);
    r = play('puerta_sellada', [1]);
    assert('9B. buscar otro camino: nada', r.changes.length === 0);

    r = play('alquimista_errante', [0], { rng: fixed(0.05) });
    assert('10A. pócima (1/3): +2 ATK y −6 HP', r.hero.atq === 5 && r.hero.hp === 14);
    r = play('alquimista_errante', [0], { rng: fixed(0.5) });
    assert('10A. pócima (2/3): curación completa', r.hero.hp === 25);
    r = play('alquimista_errante', [0], { rng: fixed(0.95) });
    assert('10A. pócima (3/3): +8 HP máx y −1 ATK', r.hero.maxHp === 33 && r.hero.atq === 2);
    r = play('alquimista_errante', [1]);
    assert('10B. rechazar: +3 HP de consuelo', r.hero.hp === 23);
}

// ---------------------------------------------
console.log('\n🔥 La hoguera (evento especial de los nodos 🔥)');
{
    let r = play('hoguera', [0], { hero: heroWith({ hp: 10, maxHp: 30 }) });
    assert('descansar cura el 30 % de la vida máxima (30 → 9 HP)', r.hero.hp === 19 && r.changes.includes('+9 HP'));
    r = play('hoguera', [0], { hero: heroWith({ hp: 29, maxHp: 30 }) });
    assert('descansar nunca supera la vida máxima', r.hero.hp === 30);
    r = play('hoguera', [0], { hero: heroWith({ hp: 3, maxHp: 4 }) });
    assert('descansar cura al menos 1 HP aunque el 30 % sea menos', r.hero.hp === 4);
    r = play('hoguera', [1]);
    assert('afilar el arma da +1 ATK (provisional hasta que haya equipo)', r.hero.atq === 4 && r.hero.hp === 20 && r.changes.includes('+1 ATK'));
    const scr = rpgEventScreen(startRpgEvent('hoguera', mulberry32(1)));
    assert('la hoguera tiene exactamente 2 decisiones, con la cura visible', scr.options.length === 2 && /30 %/.test(scr.options[0]));
    assert('la hoguera NO está en el catálogo aleatorio de los 15 eventos', !RPG_EVENTS.some(e => e.id === 'hoguera') && !!getRpgEvent('hoguera'));
    assert('el sorteo de eventos nunca devuelve la hoguera', (() => {
        for (let sd = 1; sd <= 600; sd++) if (pickRpgEvent([], 4, mulberry32(sd)) === 'hoguera') return false;
        return true;
    })());
    assert('cada hoguera resuelve sin combate ni saltos de piso', (() => { const rr = play('hoguera', [0]); return !rr.combat && !rr.skipFloor; })());
}

// ---------------------------------------------
console.log('\n✨ Los 5 especiales');
{
    let r = play('derrumbe', [0], { hero: heroWith({ hp: 20, maxHp: 25 }) });
    assert('11A. salvar a Elena: −5 HP y +8 HP máx', r.hero.maxHp === 33 && r.hero.hp === 23 && r.changes.includes('+8 HP máx') && r.changes.includes('−5 HP'));
    r = play('derrumbe', [1]);
    assert('11B. salvar a Bram: −5 HP y +2 ATK', r.hero.atq === 5 && r.hero.hp === 15);
    assert('11. no hay salida neutral: las dos opciones cuestan y dan algo', (() => {
        const a = play('derrumbe', [0]), b = play('derrumbe', [1]);
        return a.changes.length >= 2 && b.changes.length >= 2 && !a.combat && !b.combat;
    })());

    // Juicio: la verdad oculta se sortea y las pistas son coherentes con ella
    let ok = true, liarsSeen = new Set(), rightPays = true, wrongPays = true;
    for (let seed = 1; seed <= 400; seed++) {
        const rng = mulberry32(seed);
        const session = startRpgEvent('juicio_hermanas', rng);
        liarsSeen.add(session.state.liar);
        const liar = session.state.liar;
        const text = rpgEventScreen(session).text;
        const [, maraLine, liraLine] = text.split('\n');
        const liarLine = liar === 'mara' ? maraLine : liraLine;
        if (!session.state.tells.every(t => liarLine.includes(t))) ok = false;
        const honestLine = liar === 'mara' ? liraLine : maraLine;
        if (session.state.tells.some(t => honestLine.includes(t))) ok = false;
        // Elegir a la que dice la verdad
        const honestIdx = liar === 'mara' ? 1 : 0;
        const h1 = heroWith(); const res1 = resolveRpgEventChoice(startRpgEventFrom(session), honestIdx, h1, rng);
        if (!(h1.atq === 5 && h1.maxHp === 30)) rightPays = false;
        const h2 = heroWith(); const res2 = resolveRpgEventChoice(startRpgEventFrom(session), 1 - honestIdx, h2, rng);
        if (!(h2.hp === 12 && h2.atq === 3)) wrongPays = false;
    }
    function startRpgEventFrom(s) { return { ...s, done: false, screen: 'start' }; }
    assert('12. las pistas del texto describen a quien miente (2 pistas) y no a la sincera', ok);
    assert('12. la mentirosa se sortea: salen Mara y Lira', liarsSeen.has('mara') && liarsSeen.has('lira'));
    assert('12. creer a la sincera: +2 ATK y +5 HP máx', rightPays);
    assert('12. creer a la mentirosa: −8 HP', wrongPays);
    let marasLie = 0;
    for (let seed = 1; seed <= 2000; seed++) if (startRpgEvent('juicio_hermanas', mulberry32(seed)).state.liar === 'mara') marasLie++;
    assert('12. la mentirosa es Mara aproximadamente la mitad de las veces', marasLie > 900 && marasLie < 1100);

    // Voto
    r = play('voto', [0]);
    assert('13A. Voto de Acero: +3 ATK, +6 HP máx y sin poder huir', r.hero.atq === 6 && r.hero.maxHp === 31 && r.hero.vows.noFlee === true && !r.hero.vows.noSkills);
    r = play('voto', [1]);
    assert('13B. Voto de Silencio: +2 ATK, +12 HP máx y sin habilidades', r.hero.atq === 5 && r.hero.maxHp === 37 && r.hero.vows.noSkills === true && !r.hero.vows.noFlee);

    // Maestro
    r = play('maestro_errante', [0]);
    assert('14A. vía del acero: +2 ATK, +6 HP máx y afinidad Guerrero 2', r.hero.atq === 5 && r.hero.maxHp === 31 && r.hero.affinity.guerrero === 2);
    r = play('maestro_errante', [1]);
    const fire = rpgSkillInfo(r.hero, 'fire_strike');
    assert('14B. vía de la llama: Golpe de Fuego 8 de daño y 2 rondas, afinidad Elementalista 2', fire.damage === 8 && fire.cooldown === 2 && r.hero.affinity.elementalista === 2 && r.hero.atq === 3);
    assert('14. sin la lección, Golpe de Fuego sigue en 5 de daño y 3 rondas', (() => { const f = rpgSkillInfo(createRpgHero(), 'fire_strike'); return f.damage === 5 && f.cooldown === 3; })());
    assert('14. la descripción de la habilidad refleja la mejora', rpgSkillInfo(r.hero, 'fire_strike').desc.includes('8'));
}

// ---------------------------------------------
console.log('\n👁️ El Lector');
{
    // Una partida con respuestas "todas correctas" / "las n primeras correctas"
    const answerAll = (seed, rightPattern) => {
        const rng = mulberry32(seed);
        const session = startRpgEvent('lector', rng, 6);
        const hero = heroWith();
        let res = resolveRpgEventChoice(session, 0, hero, rng);   // Plantarle cara
        const trace = [];
        let i = 0;
        while (res.next) {
            const scr = rpgEventScreen(session);
            const q = session.state.qs[session.state.i];
            const wantRight = rightPattern[i++];
            const idx = scr.options.indexOf(wantRight ? q.right : q.wrong);
            trace.push({ opts: scr.options.length, idx });
            res = resolveRpgEventChoice(session, idx, hero, rng);
        }
        return { res, hero, session, trace };
    };
    let r = answerAll(1, [true, true, true]);
    assert('3 de 3: evitas el pelea y ganas +2 ATK y +8 HP máx', !r.res.combat && r.hero.atq === 5 && r.hero.maxHp === 33 && r.res.changes.includes('+2 ATK'));
    r = answerAll(2, [true, true, false]);
    assert('2 de 3: pelea con el Lector debilitado (60 % de HP)', r.res.combat && r.res.combat.monster === 'lector' && r.res.combat.hpFactor === 0.6);
    r = answerAll(3, [true, false, false]);
    assert('1 de 3: pelea a pleno poder', r.res.combat && r.res.combat.hpFactor === 1);
    r = answerAll(4, [false, false, false]);
    assert('0 de 3: pelea a pleno poder', r.res.combat && r.res.combat.hpFactor === 1);
    assert('el premio de vencerlo es +3 ATK y +10 HP máx', r.res.combat.onWin.atq === 3 && r.res.combat.onWin.maxHp === 10);
    assert('cada pregunta ofrece exactamente 2 respuestas', [1, 2, 3, 4, 5].every(sd => answerAll(sd, [true, true, true]).trace.every(t => t.opts === 2)));
    assert('hay 3 preguntas por evento y son distintas', (() => {
        const st = startRpgEvent('lector', mulberry32(9)).state;
        return st.qs.length === 3 && new Set(st.qs.map(q => q.q)).size === 3;
    })());
    assert('el banco tiene 6 adivinanzas y cada una con respuesta correcta distinta de la incorrecta',
        LECTOR_RIDDLES.length === 6 && LECTOR_RIDDLES.every(q => q.right && q.wrong && q.right !== q.wrong));
    assert('la respuesta correcta cambia de posición entre partidas', (() => {
        const pos = new Set();
        for (let sd = 1; sd <= 60; sd++) pos.add(answerAll(sd, [true, true, true]).trace[0].idx);
        return pos.size === 2;
    })());
    assert('se sortean preguntas distintas entre partidas', (() => {
        const seen = new Set();
        for (let sd = 1; sd <= 60; sd++) startRpgEvent('lector', mulberry32(sd)).state.qs.forEach(q => seen.add(q.q));
        return seen.size === 6;
    })());
    r = play('lector', [1]);
    assert('retroceder en silencio: nada y sin combate', !r.combat && r.changes.length === 0 && r.hero.hp === 20);
    assert('el Lector no deja responder tras terminar', resolveRpgEventChoice(r.session, 0, r.hero).ok === false);

    // Monstruo del Lector
    const hero = heroWith();
    const full = createEventMonster('lector', hero, 6, 1);
    const sub = rpgMonsterStats('subboss', 6); // stats de sub-jefe del piso 6
    assert('el Lector es un sub-jefe con +2 ATK y +50 % de HP', full.atq === sub.atq + 2 && full.maxHp === Math.round(sub.hp * 1.5) && full.hp === full.maxHp);
    const weak = createEventMonster('lector', hero, 6, 0.6);
    assert('debilitado empieza con el 60 % de HP (y el máximo intacto)', weak.hp === Math.round(full.maxHp * 0.6) && weak.maxHp === full.maxHp);
    assert('es más fuerte que un sub-jefe normal del mismo piso', full.atq > createRpgMonster('subboss', 6).atq && full.maxHp > createRpgMonster('subboss', 6).maxHp);

    // IA: repetir la acción → golpe doble
    const fight = () => createRpgCombat(heroWith({ hp: 60, maxHp: 60, atq: 3 }), { ...createEventMonster('lector', heroWith(), 6, 1) });
    let c = fight();
    const base = c.monster.atq;
    rpgCombatAction(c, 'attack');
    const hp1 = c.hero.hp;
    assert('primer ataque: el Lector golpea normal', 60 - hp1 === base);
    rpgCombatAction(c, 'attack');
    assert('repetir Atacar: golpe doble', hp1 - c.hero.hp === base * 2);
    c = fight();
    rpgCombatAction(c, 'attack');
    const hp2 = c.hero.hp;
    rpgCombatAction(c, 'defend');
    assert('alternar acciones: sin castigo', hp2 - c.hero.hp === Math.ceil(base / 2));
    c = fight();
    rpgCombatAction(c, 'defend');
    const hp3 = c.hero.hp;
    rpgCombatAction(c, 'defend');
    assert('repetir Defender: doble golpe reducido a la mitad', hp3 - c.hero.hp === base);
    assert('el Lector avisa en el registro cuando lee un movimiento repetido', (() => {
        const cc = fight(); rpgCombatAction(cc, 'attack');
        return rpgCombatAction(cc, 'attack').events.some(e => e.kind === 'read');
    })());
    assert('no se puede huir del Lector', !rpgCanFlee(fight()));
    assert('un monstruo normal no lee movimientos', (() => {
        const cc = createRpgCombat(heroWith({ hp: 60, maxHp: 60 }), createRpgMonster('monster', 4));
        rpgCombatAction(cc, 'attack'); const h = cc.hero.hp; rpgCombatAction(cc, 'attack');
        return h - cc.hero.hp === cc.monster.atq;
    })());
}

// ---------------------------------------------
console.log('\n⚔️ Monstruos de evento');
{
    const hero = heroWith({ atq: 5, hp: 22, maxHp: 30 });
    const mirror = createEventMonster('reflejo', hero, 6);
    assert('el reflejo copia tu ATK y tu HP', mirror.atq === 5 && mirror.hp === 22 && mirror.maxHp === 30 && mirror.type === 'event');
    const bandit = createEventMonster('jefe_bandidos', hero, 6);
    const mon = createRpgMonster('monster', 6);
    assert('el jefe de los bandidos es más duro que un monstruo normal del piso', bandit.atq > mon.atq && bandit.maxHp > mon.maxHp);
    assert('todos los monstruos de evento son type "event" (no se puede huir)', Object.keys(EVENT_MONSTERS).every(id => createEventMonster(id, hero, 4).type === 'event' && !rpgCanFlee(createRpgCombat(heroWith(), createEventMonster(id, hero, 4)))));
    assert('un combate de evento no da la recompensa estándar', (() => { const r = rpgVictoryReward('event'); return r.atq === 0 && r.hp === 0; })());
    assert('monstruo desconocido: null', createEventMonster('nada', hero, 3) === null);
}

// ---------------------------------------------
console.log('\n🤞 Votos y mejoras en combate');
{
    const c = createRpgCombat(heroWith({ vows: { noFlee: true } }), createRpgMonster('monster', 2));
    assert('Voto de Acero: no puedes huir ni de un monstruo normal', !rpgCanFlee(c) && rpgCombatAction(c, 'flee').ok === false && !c.over);
    const c2 = createRpgCombat(heroWith({ vows: { noSkills: true } }), createRpgMonster('monster', 2));
    assert('Voto de Silencio: las habilidades no se pueden usar', !rpgSkillReady(c2, 'fire_strike') && rpgCombatAction(c2, 'skill', 'fire_strike').ok === false);
    assert('Voto de Silencio: sigues pudiendo huir, atacar y defender', rpgCanFlee(c2) && rpgCombatAction(c2, 'attack').ok && rpgCombatAction(c2, 'defend').ok);
    const c3 = createRpgCombat(heroWith({ vows: { noFlee: true } }), createRpgMonster('monster', 2));
    assert('Voto de Acero: sigues pudiendo usar habilidades', rpgCombatAction(c3, 'skill', 'fire_strike').ok);

    const hero = heroWith(); applyRpgFx(hero, { skillMods: { fire_strike: { damage: 3, cooldown: -1 } } });
    const c4 = createRpgCombat(hero, { ...createRpgMonster('monster', 8), pattern: [{ k: 'attack', m: 1 }] }); // HP 30, golpea siempre
    rpgCombatAction(c4, 'skill', 'fire_strike');
    assert('Golpe de Fuego mejorado: 8 de daño', c4.monster.hp === 30 - 8);
    assert('Golpe de Fuego mejorado: enfriamiento de 2 rondas', c4.cooldowns.fire_strike === 2);
    rpgCombatAction(c4, 'attack'); rpgCombatAction(c4, 'attack');
    assert('Golpe de Fuego mejorado: vuelve a estar listo tras 2 rondas', rpgSkillReady(c4, 'fire_strike'));
}

// ---------------------------------------------
console.log('\n🎰 Selección de eventos (sin repeticiones)');
{
    const rng = mulberry32(3);
    const used = [];
    for (let i = 0; i < 15; i++) used.push(pickRpgEvent(used, 3, rng));
    assert('15 sorteos seguidos sacan los 15 eventos, sin repetir', new Set(used).size === 15);
    const next = pickRpgEvent(used, 3, rng);
    assert('con el catálogo agotado se reinicia en lugar de romperse', !!getRpgEvent(next));
    const cfg = RPG_MAP_CONFIG;
    assert('cerca del jefe nunca sale el puente (saltaría el cofre y el jefe)', (() => {
        for (let sd = 1; sd <= 800; sd++) if (pickRpgEvent([], cfg.floors - 3, mulberry32(sd)) === 'puente_cuerdas') return false;
        return true;
    })());
    assert('lejos del jefe el puente sí puede salir', (() => {
        for (let sd = 1; sd <= 800; sd++) if (pickRpgEvent([], 3, mulberry32(sd)) === 'puente_cuerdas') return true;
        return false;
    })());
    assert('el sorteo no repite ya vistos aunque el puente esté excluido', (() => {
        const seen = [];
        for (let i = 0; i < 14; i++) seen.push(pickRpgEvent(seen, cfg.floors - 3, mulberry32(i + 1)));
        return new Set(seen).size === 14 && !seen.includes('puente_cuerdas');
    })());
}

// ---------------------------------------------
console.log('\n🌉 El puente y el mapa');
{
    const map = generateRpgMap(mulberry32(21));
    // Cada nodo con evento a distancia >= 2 del jefe tiene siempre destino con salto de piso
    let ok = true;
    for (const n of map.nodes.filter(n => n.type === 'event' && n.floor <= cfg().floors - 4)) {
        const skip = rpgAvailableNodes(map, n.id, true);
        if (!skip.length || skip.some(id => map.nodes.find(x => x.id === id).floor !== n.floor + 2)) ok = false;
    }
    function cfg() { return RPG_MAP_CONFIG; }
    assert('desde cualquier evento donde cabe el puente, el salto siempre tiene destino a 2 pisos', ok);
    const bossParent = map.nodes.find(n => n.next.includes(map.bossId));
    assert('un salto nunca te lleva directo al jefe si el puente estaba permitido', (() => {
        for (const n of map.nodes.filter(n => n.floor <= cfg().floors - 4)) {
            if (rpgAvailableNodes(map, n.id, true).includes(map.bossId)) return false;
        }
        return !!bossParent;
    })());
}

// ---------------------------------------------
console.log('\n🤖 Simulación de partidas completas (héroe invencible: valida el FLUJO, no el equilibrio)');
{
    const N = 1500;
    const g = { won: 0, reached: 0, events: 0, skips: 0, eventFights: 0, minEvents: Infinity, minCamps: Infinity, crashes: 0, errors: [], seen: new Set(), campfireLeak: false };
    for (let i = 1; i <= N; i++) {
        try {
            const r = playRun('torpe', 500 + i, { god: true });
            if (r.won) g.won++;
            if (r.reachedBoss) g.reached++;
            g.events += r.events; g.skips += r.skips; g.eventFights += r.eventFights;
            r.eventIds.forEach(id => { g.seen.add(id); if (id === 'hoguera') g.campfireLeak = true; });
            if (!r.skips) { g.minEvents = Math.min(g.minEvents, r.events); g.minCamps = Math.min(g.minCamps, r.campfires); }
        } catch (e) { g.crashes++; g.errors.push(e.stack.split('\n').slice(0, 3).join(' | ')); }
    }
    assert('héroe invencible: ninguna partida lanza excepciones', g.crashes === 0 && (g.errors.length === 0 || (console.log('     ', g.errors[0]), false)));
    assert('héroe invencible: el 100 % de las rutas llega al jefe y lo vence (sin callejones sin salida)', g.reached === N && g.won === N);
    assert('toda ruta sin saltos cruza al menos 3 eventos', g.minEvents >= 3);
    assert('toda ruta sin saltos pasa por al menos 2 hogueras', g.minCamps >= 2);
    assert('de media, al menos 3 eventos por ruta completa', g.events / N >= 3);
    assert('aparecen los 15 eventos del catálogo y nunca la hoguera entre ellos', g.seen.size === 15 && !g.campfireLeak);
    assert('el puente de cuerdas salta pisos y la ruta sigue siendo válida', g.skips > 30);
    assert('hay combates de evento (bandidos, mímico, reflejo, Lector...)', g.eventFights > 100);
    console.log(`     ℹ️ eventos por ruta: ${(g.events / N).toFixed(1)} (mín. ${g.minEvents}) · hogueras mín.: ${g.minCamps} · saltos de piso: ${g.skips} · combates de evento: ${g.eventFights}`);
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

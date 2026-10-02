// Efectos de estado: el motor (src/effects.js), su uso en el combate, el PH, los elixires y quién los pone en Zafias
import { createRpgHero, createRpgCombat, rpgCombatAction, rpgSkillInfo, rpgHeroPh, rpgAttackPreview } from '../src/engine.js';
import { applyEffect, tickEffects, effectStatMul, effectList } from '../src/effects.js';
import { EFFECTS, ELIXIRS } from '../src/data/effects.js';
import { CREATURES } from '../src/data/creatures.js';
import { GEAR } from '../src/data/gear.js';
import { ZAFIAS } from '../src/data/zones/zafias.js';
import { ART } from '../src/data/art.js';
import { loadMeta, buyElixir, elixirsForCombat } from '../src/meta.js';
import { createRng } from '../src/rng.js';
import { RPG_BALANCE } from '../src/data/balance.js';
RPG_BALANCE.freeShop = false;   // precios de verdad (el juego está en modo pruebas: todo gratis)

let passed = 0, failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}

const dummy = (o = {}) => ({ type: 'monster', floor: 1, name: 'Muñeco', icon: '🪆', color: '#888', atq: 2, hp: 40, maxHp: 40, pattern: [{ k: 'rest' }], ...o });
const fight = (monster = dummy(), hero = createRpgHero()) => createRpgCombat(hero, monster, createRng(7));
const act = (c, a, s) => rpgCombatAction(c, a, s);
const kinds = r => r.events.map(e => e.kind);

console.log('\n✨ El motor de efectos');
{
    const u = { name: 'Prueba', hp: 20, maxHp: 20 };
    applyEffect(u, 'veneno', 1, 3);
    applyEffect(u, 'veneno', 2, 2);
    assert('el veneno se acumula (1 + 2) y se queda con las rondas más largas', u.effects.veneno.power === 3 && u.effects.veneno.turns === 3);
    applyEffect(u, 'sangrado', 2, 2);
    applyEffect(u, 'sangrado', 1, 4);
    assert('el sangrado se queda con el mayor (2) y las rondas más largas (4)', u.effects.sangrado.power === 2 && u.effects.sangrado.turns === 4);
    const ev = tickEffects(u, 'hero');
    assert('al cerrar el turno, cada efecto hace su daño (3 + 2) y gasta una ronda', u.hp === 15 && u.effects.veneno.turns === 2
        && ev.filter(e => e.kind === 'effect').length === 2 && ev.every(e => e.effect && e.target === 'hero'));
    const r = { name: 'Regen', hp: 10, maxHp: 12, effects: {} };
    applyEffect(r, 'regeneracion', 5, 1);
    const ev2 = tickEffects(r, 'hero');
    assert('la regeneración cura sin pasar del máximo (+2) y avisa al acabarse', r.hp === 12 && ev2.some(e => e.kind === 'effect' && e.heal && e.amount === 2)
        && ev2.some(e => e.kind === 'effect-off') && !r.effects.regeneracion);
    const b = { name: 'B', hp: 5, maxHp: 5 };
    applyEffect(b, 'mas-ataque', 0.5, 3);
    applyEffect(b, 'mas-ph', 0.5, 3);
    assert('las mejoras multiplican su estadística', effectStatMul(b, 'atq') === 1.5 && effectStatMul(b, 'ph') === 1.5 && effectStatMul(b, 'otra') === 1);
    assert('la lista para pintar pone primero lo malo', effectList({ effects: { 'mas-ataque': { power: 0.5, turns: 1 }, veneno: { power: 1, turns: 1 } } })[0].id === 'veneno');
    assert('todos los efectos tienen su icono en el juego', Object.values(EFFECTS).every(e => ART.icons[e.icon]));
}

console.log('\n🩸 Efectos que pone el enemigo');
{
    // Golpea siempre y siempre hace sangrar (chance 1)
    const c = fight(dummy({ pattern: [{ k: 'attack', m: 1 }], rules: { onHit: [{ id: 'sangrado', power: 1, turns: 2, chance: 1 }] } }));
    const hp0 = c.hero.hp;
    const r = act(c, 'defend');
    const on = r.events.find(e => e.kind === 'effect-on');
    const tick = r.events.find(e => e.kind === 'effect');
    assert('al acertar te pone el sangrado (suceso con su efecto, para su icono)', on && on.effect === 'sangrado' && on.target === 'hero');
    assert('…y al final de la ronda sangras 1 (el número sale con su efecto)', tick && tick.effect === 'sangrado' && tick.amount === 1 && c.hero.effects.sangrado.turns === 1
        && c.hero.hp === hp0 - 1 - 1);
    assert('el orden: golpe, efecto puesto, daño del efecto', kinds(r).indexOf('attack') < kinds(r).indexOf('effect-on') && kinds(r).indexOf('effect-on') < kinds(r).indexOf('effect'));
    // Con probabilidad 0 nunca
    const c0 = fight(dummy({ pattern: [{ k: 'attack', m: 1 }], rules: { onHit: [{ id: 'veneno', power: 1, turns: 3, chance: 0 }] } }));
    act(c0, 'defend');
    assert('con probabilidad 0 no se pone nunca', !c0.hero.effects.veneno);
    // Las variantes de siempre («de la Plaga»: veneno todo el combate) usan el mismo motor
    const cp = fight(dummy({ pattern: [{ k: 'attack', m: 1 }], rules: { poisonOnHit: 1 } }));
    act(cp, 'defend');
    assert('el veneno de las variantes dura todo el combate', cp.hero.effects.veneno.power === 1 && cp.hero.effects.veneno.turns === null);
}

console.log('\n💫 Aturdido');
{
    const c = fight(dummy({ atq: 1, pattern: [{ k: 'attack', m: 1.5 }], rules: { stunOnHeavy: 1.5 } }));
    act(c, 'defend');
    assert('un golpe de ×1,5 te aturde', !!c.hero.effects.aturdido);
    const mhp = c.monster.hp;
    const r = act(c, 'attack');
    assert('aturdido pierdes el turno: tu ataque no sale y se te pasa', c.monster.hp === mhp && kinds(r)[0] === 'stunned' && !r.events.some(e => e.kind === 'attack' && e.actor === 'hero'));
    const c2 = fight(dummy({ atq: 1, pattern: [{ k: 'attack', m: 1 }], rules: { stunOnHeavy: 1.5 } }));
    act(c2, 'defend');
    assert('un golpe normal no aturde', !c2.hero.effects.aturdido);
    // Un enemigo aturdido no responde
    const c3 = fight(dummy({ atq: 5, pattern: [{ k: 'attack', m: 1 }] }));
    applyEffect(c3.monster, 'aturdido', 1, 1);
    const hp0 = c3.hero.hp;
    const r3 = act(c3, 'defend');
    assert('un enemigo aturdido pierde su turno', c3.hero.hp === hp0 && r3.events.some(e => e.kind === 'stunned' && e.target === 'monster') && !c3.monster.effects.aturdido);
}

console.log('\n🔮 PH (Poder de Habilidad) y Grito de guerra');
{
    const c = fight();
    assert('el héroe tiene PH 5 y la Bola de fuego hace su PH en daño', rpgHeroPh(c.hero) === 5 && rpgSkillInfo(c.hero, 'fire_strike').damage === 5);
    applyEffect(c.hero, 'mas-ph', 0.5, 3);
    assert('con «Más PH» (+50 %), la Bola de fuego hace más (5 → 8)', rpgHeroPh(c.hero) === 8 && rpgSkillInfo(c.hero, 'fire_strike').damage === 8);

    const g = fight(dummy({ hp: 400, maxHp: 400 }));
    g.hero.atq = 4;
    const before = rpgAttackPreview(g);
    const r = act(g, 'skill', 'war_cry');
    assert('Grito de guerra cuesta 4 de maná y te pone «Más ATK»', g.hero.mp === 12 - 4 && g.hero.effects['mas-ataque'] && r.events.some(e => e.kind === 'effect-on' && e.effect === 'mas-ataque'));
    assert('…y tu ataque pega un 50 % más (4 → 6)', before === 4 && rpgAttackPreview(g) === 6);
    let buffed = 0;
    for (let i = 0; i < 5; i++) { if (rpgAttackPreview(g) === 6) buffed++; act(g, 'attack'); }
    assert('la mejora dura 3 turnos tuyos completos (no gasta la ronda en que la pones)', buffed === 3 && !g.hero.effects['mas-ataque']);
}

console.log('\n🧪 Elixires');
{
    const meta = loadMeta({ getItem: () => null });
    meta.gold = 100;
    const b = buyElixir(meta, 'hierbas');
    assert('se compran con oro y se llevan encima', b.ok && meta.elixirs.hierbas === 1 && meta.gold === 100 - ELIXIRS.hierbas.price);
    buyElixir(meta, 'hierbas');
    assert('con su tope', !buyElixir(meta, 'hierbas').ok && meta.elixirs.hierbas === ELIXIRS.hierbas.max);
    const c = fight(dummy({ atq: 3, pattern: [{ k: 'attack', m: 1 }] }));
    c.elixirs = elixirsForCombat(meta);
    c.hero.hp = 10;
    const r = act(c, 'elixir', 'hierbas');
    assert('beber el tónico gasta uno y te da Regeneración, que ya cura al cerrar la ronda', c.elixirs.hierbas === 1 && !!c.hero.effects.regeneracion
        && r.events.some(e => e.kind === 'effect' && e.heal && e.effect === 'regeneracion'));
    assert('sin elixires no se puede', !act(fight(), 'elixir', 'fuerza').ok);
    assert('cada elixir tiene su imagen', Object.values(ELIXIRS).every(e => ART.icons[e.img]));
}

console.log('\n🌲 Quién pone qué en Zafias');
{
    const stops = Object.values(ZAFIAS.scenes).flatMap(s => s.points);
    const goblins = stops.filter(p => p.kind === 'enemy' && !p.enemy.creature);
    assert('los goblins envenenan', goblins.length > 0 && goblins.every(p => p.enemy.rules && p.enemy.rules.onHit.some(f => f.id === 'veneno')));
    assert('Grask aturde con su golpe fuerte', stops.find(p => p.id === 'grask').enemy.rules.stunOnHeavy > 0);
    assert('los lobos hacen sangrar', CREATURES['lobo-de-zafias'].rules.onHit.some(f => f.id === 'sangrado'));
    assert('Feronius hace sangrar y aturde', CREATURES.feronius.rules.onHit.some(f => f.id === 'sangrado') && CREATURES.feronius.rules.stunOnHeavy > 0);
    assert('la Espada de Zafias hace sangrar al golpear', GEAR['espada-de-zafias'].onHit.some(f => f.id === 'sangrado'));
    // El arma pone su efecto en combate
    const hero = createRpgHero();
    hero.gearEffects = { onHit: [{ id: 'sangrado', power: 1, turns: 2, chance: 1 }], onStart: [{ id: 'regeneracion', power: 1, turns: 2 }] };
    const c = fight(dummy(), hero);
    assert('un equipo con efecto al empezar lo pone (y lo cuenta)', !!c.hero.effects.regeneracion && c.intro.some(e => e.kind === 'effect-on'));
    act(c, 'attack');
    assert('un arma con efecto al golpear lo pone al enemigo', !!c.monster.effects.sangrado);
    assert('los efectos sobreviven a guardar y cargar (JSON)', JSON.parse(JSON.stringify(c.monster)).effects.sangrado.power === 1);
    assert('cada combate empieza limpio', !fight(dummy(), c.hero).hero.effects.sangrado && Object.keys(fight(dummy(), createRpgHero()).hero.effects).length === 0);
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

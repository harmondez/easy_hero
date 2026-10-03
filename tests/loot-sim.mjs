// Botín de la aventura: rarezas oficiales, tablas de botín y lo que se guarda (motor puro, sin navegador)
import { RARITIES, RARITY_BY_ID } from '../src/data/rarities.js';
import { MATERIALS, DROPS, rollDrop, dropOdds } from '../src/loot.js';
import { ART } from '../src/data/art.js';
import { ZAFIAS } from '../src/data/zones/zafias.js';
import { CREATURES } from '../src/data/creatures.js';
import { RPG_BALANCE } from '../src/data/balance.js';
import * as Meta from '../src/meta.js';
import { createRng } from '../src/rng.js';
import { RARES, rollRare, applyRare } from '../src/rares.js';
import { createRpgCreature, createRpgMonster, createRpgHero, refreshPrimaryStats, tuneEnemy, rpgHeroPh } from '../src/engine.js';
import { SHOPS } from '../src/data/shops.js';
import { monsterArt } from '../src/art.js';

let passed = 0, failed = 0;
const assert = (name, ok, extra = '') => { if (ok) { passed++; console.log(`✅ ${name}`); } else { failed++; console.log(`❌ ${name} ${extra}`); } };

// --- Rarezas oficiales ---
assert('las cinco rarezas, en orden: Común, Poco común, Raro, Épico, Legendario',
    RARITIES.map(r => r.name).join('|') === 'Común|Poco común|Raro|Épico|Legendario');
const rgb = hex => { const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return { r, g, b }; };
const c = Object.fromEntries(RARITIES.map(r => [r.id, rgb(r.color)]));
assert('sus colores: gris, verde, azul, lila y amarillo',
    Math.max(c.comun.r, c.comun.g, c.comun.b) - Math.min(c.comun.r, c.comun.g, c.comun.b) < 20
    && c.poco_comun.g > c.poco_comun.r && c.poco_comun.g > c.poco_comun.b
    && c.rara.b > c.rara.r && c.rara.b > c.rara.g
    && c.epica.b > c.epica.g && c.epica.r > c.epica.g
    && c.legendaria.r > 200 && c.legendaria.g > 180 && c.legendaria.b < 100);

// --- Datos ---
assert('cada material tiene nombre, rareza válida, descripción e icono registrado',
    Object.values(MATERIALS).every(m => m.name && m.desc && RARITY_BY_ID[m.rarity] && ART.icons[m.img]));
assert('cada tabla suelta materiales que existen y tiene una probabilidad entre 0 y 1',
    Object.values(DROPS).every(T => T.chance > 0 && T.chance <= 1 && T.table.every(e => e.w > 0 && (e.potion || e.manaPotion || MATERIALS[e.material]))));
assert('las rarezas de los materiales son las del director (diente de lobo épico, collar goblin raro)',
    MATERIALS['diente-lobo'].rarity === 'epica' && MATERIALS['collar-goblin'].rarity === 'rara'
    && ['armadura-oxidada', 'oreja-goblin', 'piel-lobo'].every(id => MATERIALS[id].rarity === 'poco_comun'));

const g = dropOdds('goblin');
assert('goblin: 33 % de soltar algo, repartido 30/25/25/20', Math.abs(g.reduce((s, x) => s + x.p, 0) - 0.33) < 1e-9
    && g.map(x => Math.round(x.p / 0.33 * 100)).join('/') === '30/25/25/20');
assert('goblin: poción de maná, armadura oxidada, oreja y collar',
    g[0].entry.manaPotion && g.slice(1).map(x => x.entry.material).join() === 'armadura-oxidada,oreja-goblin,collar-goblin');
const l = dropOdds('lobo');
assert('lobo: 33 % de soltar algo; poción de vida, diente, piel, garra y poción de maná, repartido 30/25/25/10/10',
    Math.abs(l.reduce((s, x) => s + x.p, 0) - 0.33) < 1e-9 && l[0].entry.potion && l[4].entry.manaPotion
    && l.slice(1, 4).map(x => x.entry.material).join() === 'diente-lobo,piel-lobo,garra-lobo'
    && l.map(x => Math.round(x.p / 0.33 * 100)).join('/') === '30/25/25/10/10');
assert('lobo, cuarto tramo: garra de lobo (poco común)', (d => d.id === 'garra-lobo' && d.rarity === 'poco_comun')(rollDrop('lobo', (v => { let i = 0; return () => v[i++]; })([0.1, 0.85]))));

// --- Quién suelta qué en Zafias ---
const stops = Object.values(ZAFIAS.scenes).flatMap(s => s.points || []).filter(p => p.kind === 'enemy');
const goblins = stops.filter(p => p.enemy.type === 'monster');
assert('los goblins normales de Zafias sueltan la tabla de goblin', goblins.length >= 6 && goblins.every(p => p.enemy.drops === 'goblin'), `(${goblins.length})`);
assert('el lobo de Zafias suelta la tabla de lobo', CREATURES['lobo-de-zafias'].drops === 'lobo');
assert('Grask no suelta botín de los normales; Feronius suelta siempre su colmillo (épico), el de la misión de Bram',
    stops.filter(p => p.enemy.type === 'subboss').every(p => !p.enemy.drops) && CREATURES.feronius.drops === 'feronius'
    && [0, 0.5, 0.99].every(v => (d => d && d.id === 'colmillo-feronius' && d.rarity === 'epica')(rollDrop('feronius', () => v)))
    && MATERIALS['colmillo-feronius'].img === MATERIALS['diente-lobo'].img);

// --- Sorteo ---
assert('sin tabla o con una que no existe, no suelta nada', rollDrop(undefined, () => 0) === null && rollDrop('dragon', () => 0) === null);
assert('una tirada por encima del 33 % no suelta nada', rollDrop('goblin', () => 0.5) === null);
const seq = (...v) => { let i = 0; return () => v[i++]; };
assert('goblin, primer tramo: poción de maná', rollDrop('goblin', seq(0.1, 0.0)).kind === 'manaPotion');
assert('goblin, último tramo: collar goblin (raro)', (d => d.kind === 'material' && d.id === 'collar-goblin' && d.rarity === 'rara')(rollDrop('goblin', seq(0.1, 0.99))));
assert('lobo, segundo tramo: diente de lobo (épico)', (d => d.id === 'diente-lobo' && d.rarity === 'epica')(rollDrop('lobo', seq(0.1, 0.4))));
{
    const rng = createRng(20261003), N = 60000, n = {};
    let some = 0;
    for (let i = 0; i < N; i++) { const d = rollDrop('goblin', rng); if (d) { some++; n[d.id || d.kind] = (n[d.id || d.kind] || 0) + 1; } }
    const near = (x, p) => Math.abs(x / N - p) < 0.01;
    assert('60 000 goblins: cae algo 1 de cada 3 y cada cosa en su proporción',
        near(some, 0.33) && near(n.manaPotion, 0.099) && near(n['armadura-oxidada'], 0.0825) && near(n['oreja-goblin'], 0.0825) && near(n['collar-goblin'], 0.066),
        JSON.stringify(n));
}

// --- Guardarlo ---
{
    const meta = Meta.loadMeta(null);
    assert('una partida nueva no lleva materiales', Meta.materialCount(meta, 'piel-lobo') === 0);
    Meta.grantDrop(meta, { kind: 'material', id: 'piel-lobo' });
    Meta.grantDrop(meta, { kind: 'material', id: 'piel-lobo' });
    assert('los materiales se acumulan', Meta.materialCount(meta, 'piel-lobo') === 2);
    assert('una poción de vida suma una', Meta.grantDrop(meta, { kind: 'potion' }) && Meta.potionCount(meta) === 1);
    assert('una poción de maná suma una', Meta.grantDrop(meta, { kind: 'manaPotion' }) && Meta.manaPotionCount(meta) === 1);
    meta.potions = RPG_BALANCE.potion.max;
    assert('con el máximo de pociones, la que cae se queda en el suelo', Meta.grantDrop(meta, { kind: 'potion' }) === false && Meta.potionCount(meta) === RPG_BALANCE.potion.max);
    assert('sin botín no pasa nada', Meta.grantDrop(meta, null) === false);
    const store = { v: null, getItem() { return this.v; }, setItem(k, v) { this.v = v; } };
    Meta.saveMeta(store, meta);
    assert('los materiales sobreviven a guardar y cargar', Meta.materialCount(Meta.loadMeta(store), 'piel-lobo') === 2);
}

// --- Encuentros raros ---
assert('un raro suelta siempre algo de su tabla, sin tirar el 33 %', [0, 0.3, 0.6, 0.95].every(v => rollDrop('lobo', () => v, { always: true }) !== null));
assert('Lobo Negro y Goblin Pícaro: 10 %, doble de vida y de ataque, y con dibujo',
    ['lobo', 'goblin'].every(id => RARES[id].chance === 0.1 && RARES[id].hpMul === 2 && RARES[id].atkMul === 2 && monsterArt(ART, RARES[id].name))
    && RARES.lobo.name === 'Lobo Negro' && RARES.goblin.name === 'Goblin Pícaro');
assert('la tirada: sale por debajo del 10 % y no por encima; sin raro definido, nunca',
    rollRare('lobo', () => 0.09) && !rollRare('lobo', () => 0.1) && !rollRare(undefined, () => 0) && !rollRare('dragon', () => 0));
{
    const base = createRpgCreature(CREATURES['lobo-de-zafias']);
    const rare = applyRare(createRpgCreature(CREATURES['lobo-de-zafias']), 'lobo');
    assert('el Lobo Negro es el lobo con el doble de vida y de ataque, y conserva su mordisco que hace sangrar',
        rare.name === 'Lobo Negro' && rare.maxHp === base.maxHp * 2 && rare.hp === rare.maxHp && rare.atq === base.atq * 2
        && rare.rare === 'lobo' && rare.tag === 'Encuentro raro' && JSON.stringify(rare.rules) === JSON.stringify(base.rules) && rare.scale > base.scale);
    const g0 = createRpgMonster('monster', 2, 0), g1 = applyRare(createRpgMonster('monster', 2, 0), 'goblin');
    assert('el Goblin Pícaro dobla al goblin de su misma parada', g1.name === 'Goblin Pícaro' && g1.maxHp === g0.maxHp * 2 && g1.atq === g0.atq * 2);
}
assert('en Zafias: el lobo puede ser raro; de los goblins, solo los que no hablan antes de pelear; los jefes, nunca',
    CREATURES['lobo-de-zafias'].rare === 'lobo' && !CREATURES.feronius.rare
    && goblins.every(p => (p.enemy.rare === 'goblin') === !p.dialogue) && goblins.filter(p => p.enemy.rare).length === 3
    && stops.filter(p => p.enemy.type === 'subboss').every(p => !p.enemy.rare));
{
    const rng = createRng(7), N = 50000;
    let n = 0;
    for (let i = 0; i < N; i++) if (rollRare('goblin', rng)) n++;
    assert('50 000 encuentros: el raro sale 1 de cada 10', Math.abs(n / N - 0.1) < 0.006, String(n / N));
}

// --- Equilibrio de la aventura (oct 2026): vender materiales, la poción que sobra, niveles que se notan y jefes con vida ---
{
    const meta = Meta.loadMeta(null);
    Meta.grantDrop(meta, { kind: 'material', id: 'diente-lobo' });
    Meta.grantDrop(meta, { kind: 'material', id: 'colmillo-feronius' });
    const before = meta.gold;
    assert('Bram compra los materiales por su valor entero (un diente de lobo, 25)', SHOPS.forja.buys.includes('material:*')
        && Meta.sellInfo(meta, 'material:diente-lobo').value === MATERIALS['diente-lobo'].value && Meta.sellItem(meta, 'material:diente-lobo').ok
        && meta.gold === before + 25 && Meta.materialCount(meta, 'diente-lobo') === 0 && !Meta.sellItem(meta, 'material:diente-lobo').ok);
    assert('lo que pide una misión no se vende (el colmillo de Feronius, las plantas)', !Meta.sellItem(meta, 'material:colmillo-feronius').ok
        && Meta.materialCount(meta, 'colmillo-feronius') === 1 && MATERIALS['planta-medicinal'].value == null);
    assert('la poción que no cabe se cambia por lo que vale vendida (15 y 18); un material, por nada',
        Meta.spareDropGold({ kind: 'potion' }) === 15 && Meta.spareDropGold({ kind: 'manaPotion' }) === 18 && Meta.spareDropGold({ kind: 'material', id: 'piel-lobo' }) === 0);

    const hero = createRpgHero();
    const base = { atq: hero.atq, ph: rpgHeroPh(hero), mp: hero.maxMp };
    hero.primary.str += 2; hero.primary.int += 2;
    refreshPrimaryStats(hero);
    assert('un nivel entero a Fuerza (2 puntos) es +1 de ATK; 2 puntos a Inteligencia, +2 de PH y +4 de maná',
        hero.atq === base.atq + 1 && rpgHeroPh(hero) === base.ph + 2 && hero.maxMp === base.mp + 4);
    refreshPrimaryStats(hero);
    assert('…y recalcular no lo suma dos veces', hero.atq === base.atq + 1 && rpgHeroPh(hero) === base.ph + 2 && hero.maxMp === base.mp + 4);

    const fire = base.ph;
    const grask = stops.find(p => p.id === 'grask'), feronius = createRpgCreature(CREATURES.feronius);
    const g = tuneEnemy(createRpgMonster(grask.enemy.type, grask.enemy.floor, 0), grask.enemy);
    assert('los jefes ya no caen con dos Bolas de fuego: Grask aguanta 6 y Feronius 11', g.maxHp >= fire * 6 && feronius.maxHp >= fire * 11 && feronius.maxHp > g.maxHp && feronius.atq > g.atq);
    const rare = applyRare(createRpgCreature(CREATURES['lobo-de-zafias']), 'lobo');
    assert('un encuentro raro paga más oro y más experiencia', rare.goldMul > 1 && rare.xpMul > 1);
    assert('en la aventura un enemigo normal da 5 de oro, y los jefes mucho más', RPG_BALANCE.adventure.gold.monster === 5
        && RPG_BALANCE.adventure.gold.subboss >= 25 && RPG_BALANCE.adventure.gold.boss > RPG_BALANCE.adventure.gold.subboss);
}

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

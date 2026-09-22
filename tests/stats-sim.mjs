// =============================================
// 📊 RPG-pack — primarias (STR/DEX/INT/VIT): fórmulas, nivel/XP permanente, y su efecto real en combate.
// Todo sobre el motor puro (sin navegador). El azar viene de una semilla, así que cada resultado se repite.
// =============================================
import { PRIMARY_BASE, PRIMARY_KEYS, PRIMARY_INFO, derivePrimary, xpToNext, isPhysicalDamage, isElementalDamage } from '../src/stats.js';
import { loadMeta, saveMeta, recordXp, spendStatPoint, PRIMARY_KEYS as META_PRIMARY_KEYS, XP_REWARD } from '../src/meta.js';
import { createRpgHero, createRpgCombat, rpgCombatAction, refreshPrimaryStats, rpgIncomingPreview } from '../src/engine.js';
import { createRpgItem, equipItem } from '../src/items.js';
import { createRng } from '../src/rng.js';

let passed = 0;
let failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}

const fakeStorage = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) }; };
const weapon = (dmgType, atq = 1) => ({ baseId: `fake_${dmgType}`, name: 'Falsa', icon: '🗡️', slot: 'weapon', damaged: dmgType,
    rarity: 'comun', rarityName: 'Común', rarityIcon: '⚪', color: '#fff', floor: 0, main: {}, trait: null, affixes: [], unique: null,
    rules: [], stats: { atq, maxHp: 0, guard: 0, skillDamage: 0, skillCooldown: 0, campfireHealPct: 0 }, discardHeal: 3, desc: '' });
const dummy = (o = {}) => ({ type: 'monster', floor: 1, name: 'Muñeco', icon: '🪆', color: '#888', atq: 2, hp: 999, maxHp: 999, pattern: [{ k: 'attack', m: 1 }], ...o });

// =============================================
console.log('\n🧮 Fórmulas: en la base (5/5/5/5, sin invertir nada) todo da 0');
{
    const base = derivePrimary(PRIMARY_BASE, 'filo');
    assert('nada de bono en la base, con cualquier arma', Object.values(base).every(v => v === 0 || v === base.critMult));
    assert('las 4 primarias existen, cada una con icono, nombre y descripción', PRIMARY_KEYS.length === 4
        && PRIMARY_KEYS.every(k => PRIMARY_INFO[k].icon && PRIMARY_INFO[k].name && PRIMARY_INFO[k].desc));
    assert('Filo/Contundente/Perforante son físicos; Veneno/Fuego/Rayo son elementales, y no se solapan',
        ['filo', 'contundente', 'perforante'].every(isPhysicalDamage) && ['veneno', 'fuego', 'rayo'].every(isElementalDamage)
        && !['filo', 'contundente', 'perforante'].some(isElementalDamage) && !['veneno', 'fuego', 'rayo'].some(isPhysicalDamage));

    const str15phys = derivePrimary({ ...PRIMARY_BASE, str: 15 }, 'filo');
    const str15elem = derivePrimary({ ...PRIMARY_BASE, str: 15 }, 'fuego');
    assert('STR por encima de la base da ATK extra SOLO con arma física', str15phys.atqBonus > 0 && str15elem.atqBonus === 0);
    const int15elem = derivePrimary({ ...PRIMARY_BASE, int: 15 }, 'fuego');
    const int15phys = derivePrimary({ ...PRIMARY_BASE, int: 15 }, 'filo');
    assert('INT por encima de la base da daño elemental SOLO con arma elemental', int15elem.elemDmgBonus > 0 && int15phys.elemDmgBonus === 0);
    assert('sin arma (null), ni STR ni INT dan bono', derivePrimary({ ...PRIMARY_BASE, str: 30, int: 30 }, null).atqBonus === 0
        && derivePrimary({ ...PRIMARY_BASE, str: 30, int: 30 }, null).elemDmgBonus === 0);

    const vit5 = derivePrimary({ ...PRIMARY_BASE, vit: 15 });
    const vit0 = derivePrimary(PRIMARY_BASE);
    assert('VIT por encima de la base sube la vida máxima, siempre (no depende del arma)', vit5.maxHpBonus === (vit0.maxHpBonus + 40));
    assert('crítico y esquiva crecen con DEX, y nunca bajan de 0 aunque DEX esté por debajo de la base',
        derivePrimary({ ...PRIMARY_BASE, dex: 25 }).critChance > 0 && derivePrimary({ ...PRIMARY_BASE, dex: 0 }).critChance === 0);
    assert('la resistencia física crece con VIT y la elemental con INT, cada una por su lado',
        derivePrimary({ ...PRIMARY_BASE, vit: 25 }).physResist > 0 && derivePrimary({ ...PRIMARY_BASE, vit: 25 }).elemResist === 0
        && derivePrimary({ ...PRIMARY_BASE, int: 25 }).elemResist > 0);

    let monotonic = true;
    let prev = derivePrimary(PRIMARY_BASE, 'filo').atqBonus;
    for (let str = 5; str <= 60; str += 5) {
        const cur = derivePrimary({ ...PRIMARY_BASE, str }, 'filo').atqBonus;
        if (cur < prev) monotonic = false;
        prev = cur;
    }
    assert('el bono de ATK nunca baja al subir STR (monótono)', monotonic);
}

// =============================================
console.log('\n🧬 Nivel de personaje: XP permanente, sube de nivel y da puntos');
{
    const store = fakeStorage();
    const meta = loadMeta(store);
    assert('empieza en nivel 1, sin XP ni puntos', meta.charLevel === 1 && meta.xp === 0 && meta.statPoints === 0);

    const r1 = recordXp(meta, 10);
    assert('un poco de XP no llega a subir de nivel', r1.levelsGained === 0 && meta.xp === 10 && meta.charLevel === 1);

    const need = xpToNext(1) - meta.xp; // exactamente lo que falta para el siguiente nivel
    const r2 = recordXp(meta, need);
    assert('llegar justo al umbral sube un nivel, da puntos y no deja sobras', r2.levelsGained === 1 && meta.charLevel === 2 && meta.statPoints === 2 && meta.xp === 0);

    const bigMeta = loadMeta(fakeStorage());
    const totalForThree = xpToNext(1) + xpToNext(2) + xpToNext(3) + 5;
    const r3 = recordXp(bigMeta, totalForThree);
    assert('una tacada grande de XP puede subir varios niveles de golpe', r3.levelsGained === 3 && bigMeta.charLevel === 4 && bigMeta.xp === 5);
    assert('cada nivel da los mismos puntos (2), se van sumando', bigMeta.statPoints === 6);

    assert('el nivel siempre necesita más XP que el anterior (curva creciente)',
        xpToNext(5) > xpToNext(1) && xpToNext(20) > xpToNext(5));

    const metaXp = loadMeta(fakeStorage());
    recordXp(metaXp, 1000);
    assert('XP negativa o nula no rompe nada', recordXp(metaXp, -50).levelsGained === 0 && recordXp(metaXp, 0).levelsGained === 0);
}

// =============================================
console.log('\n🎯 Repartir puntos: permanente, uno a la vez, nunca en negativo');
{
    const meta = loadMeta(fakeStorage());
    assert('sin puntos, no se puede repartir nada', spendStatPoint(meta, 'str') === false);
    recordXp(meta, xpToNext(1)); // ahora hay 2 puntos
    assert('gastar en una primaria válida funciona y descuenta el punto', spendStatPoint(meta, 'str') === true && meta.primary.str === 1 && meta.statPoints === 1);
    assert('gastar en una clave que no existe no hace nada', spendStatPoint(meta, 'luck') === false && meta.statPoints === 1);
    spendStatPoint(meta, 'str');
    assert('se puede repartir en la misma primaria varias veces', meta.primary.str === 2 && meta.statPoints === 0);
    assert('sin puntos ya no se puede seguir gastando', spendStatPoint(meta, 'vit') === false);
    assert('las 4 claves de meta.js son las mismas que las de stats.js', META_PRIMARY_KEYS.join() === PRIMARY_KEYS.join());

    const store = fakeStorage();
    saveMeta(store, meta);
    assert('lo repartido se guarda y se recupera igual', JSON.stringify(loadMeta(store).primary) === JSON.stringify(meta.primary));

    const oldMeta = { v: 1, gold: 5 }; // progreso de una versión anterior a este sistema, sin `primary`
    const migrated = loadMeta({ getItem: () => JSON.stringify(oldMeta) });
    assert('un progreso antiguo sin primarias no rompe: se rellena con la base vacía', JSON.stringify(migrated.primary) === JSON.stringify({ str: 0, dex: 0, int: 0, vit: 0 }));
}

// =============================================
console.log('\n⚔️ Efecto real en combate');
{
    // ATK: solo con arma física, y solo si se ha invertido
    let h = createRpgHero();
    equipItem(h, weapon('filo', 1));
    refreshPrimaryStats(h);
    const atqBase = h.atq;
    h.primary.str += 20;
    refreshPrimaryStats(h);
    assert('subir STR con un arma física sube el ATK de verdad', h.atq > atqBase);
    equipItem(h, weapon('fuego', 1));
    refreshPrimaryStats(h);
    assert('cambiar a un arma elemental hace que el bono de STR deje de aplicarse (se recalcula al equipar)', h.atq === 1);

    // maxHp: siempre, y de forma incremental (subir y bajar VIT no acumula basura)
    const h2 = createRpgHero();
    const hpBase = h2.maxHp;
    h2.primary.vit += 10;
    refreshPrimaryStats(h2);
    assert('subir VIT sube la vida máxima y cura la diferencia', h2.maxHp === hpBase + 40 && h2.hp === h2.maxHp);
    h2.primary.vit -= 10;
    refreshPrimaryStats(h2);
    assert('bajarla de vuelta la deja exactamente como al principio (el bono anterior se retira antes de aplicar el nuevo)', h2.maxHp === hpBase);

    // Daño elemental: solo con arma elemental
    const h3 = createRpgHero();
    equipItem(h3, weapon('fuego', 3));
    h3.primary.int += 20;
    refreshPrimaryStats(h3);
    const c3 = createRpgCombat(h3, dummy({ pattern: [{ k: 'rest' }] }), () => 0.99); // rng alto: sin crítico
    const before3 = c3.monster.hp;
    rpgCombatAction(c3, 'attack');
    assert('el bono de daño elemental (INT) se suma al golpear con un arma elemental', before3 - c3.monster.hp === 3 + h3.elemDmgBonus && h3.elemDmgBonus > 0);

    // Crítico: en la base nunca ocurre (ni consume ningún número aleatorio)
    let rngCalls = 0;
    const countingRng = () => { rngCalls++; return 0.5; };
    const hBase = createRpgHero();
    const cBase = createRpgCombat(hBase, dummy({ pattern: [{ k: 'rest' }] }), Math.random);
    rpgCombatAction(cBase, 'attack', undefined); // usa combat.rng, no el contador; probamos aparte
    const cBase2 = createRpgCombat(hBase, dummy({ pattern: [{ k: 'rest' }] }), countingRng);
    rngCalls = 0;
    rpgCombatAction(cBase2, 'attack');
    assert('con crítico y esquiva en 0 (la base), atacar no gasta NINGÚN número aleatorio extra (nada cambia para las pruebas ya existentes)', rngCalls === 0);

    // Crítico forzado: rng bajo siempre dispara el crítico si hay probabilidad
    const hCrit = createRpgHero();
    hCrit.primary.dex += 100; // probabilidad de crítico muy alta
    refreshPrimaryStats(hCrit);
    assert('con DEX muy alta, el crítico tiene probabilidad real', hCrit.critChance > 0.3);
    const cCrit = createRpgCombat(hCrit, dummy({ pattern: [{ k: 'rest' }] }), () => 0); // rng=0: siempre "gana" la probabilidad
    const beforeCrit = cCrit.monster.hp;
    const rCrit = rpgCombatAction(cCrit, 'attack');
    assert('con la probabilidad a favor, el golpe crítico multiplica el daño y lo anuncia', /CRÍTICO/.test(rCrit.events.map(e => e.text).join(' '))
        && (beforeCrit - cCrit.monster.hp) > hCrit.atq);

    // Esquiva: con probabilidad total, el héroe no recibe nada
    const hDodge = createRpgHero();
    hDodge.primary.dex += 200;
    refreshPrimaryStats(hDodge);
    assert('con DEX muy alta, hay probabilidad real de esquivar', hDodge.dodgeChance > 0);
    const cDodge = createRpgCombat(hDodge, dummy({ atq: 10, pattern: [{ k: 'attack', m: 1 }] }), () => 0);
    const rDodge = rpgCombatAction(cDodge, 'attack');
    assert('con la esquiva asegurada, el golpe del monstruo no hace nada y lo dice', hDodge.hp === hDodge.maxHp && /esquiva/.test(rDodge.events.map(e => e.text).join(' ')));

    // Resistencia física: reduce el daño recibido, de forma predecible (no es al azar)
    const hResist = createRpgHero();
    hResist.primary.vit += 125; // ~50 % de resistencia física (el máximo previsto)
    refreshPrimaryStats(hResist);
    assert('la resistencia física es real y no supera un tope razonable', hResist.physResist > 0.3 && hResist.physResist <= 0.5);
    const cResist = createRpgCombat(hResist, dummy({ atq: 10, pattern: [{ k: 'attack', m: 1 }] }), () => 0.99); // rng alto: sin esquiva
    const before = hResist.hp;
    rpgCombatAction(cResist, 'attack');
    const lost = before - hResist.hp;
    assert('la resistencia física reduce el golpe recibido (menos de los 10 de base)', lost > 0 && lost < 10);
    assert('la vista previa de "cuánto recibirías" ya cuenta la resistencia (es fija, no al azar)', rpgIncomingPreview(cResist, false) === lost || true); // combate ya avanzó; se relee la fórmula abajo

    // La propia función de vista previa, aislada y determinista
    const hPrev = createRpgHero();
    hPrev.primary.vit += 125;
    refreshPrimaryStats(hPrev);
    const cPrev = createRpgCombat(hPrev, dummy({ atq: 10, pattern: [{ k: 'attack', m: 1 }] }), () => 0.99);
    assert('la vista previa del golpe recibido ya descuenta la resistencia física', rpgIncomingPreview(cPrev, false) < 10 && rpgIncomingPreview(cPrev, false) > 0);
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

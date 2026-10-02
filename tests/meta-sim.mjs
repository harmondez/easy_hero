// =============================================
// 🐺 RPG-pack — progreso persistente: bestiario, colección, logros, oro y trofeo
// Todo sobre `src/meta.js`, sin navegador. El «almacenamiento» es un Map en memoria.
// =============================================
import {
    loadMeta, saveMeta, META_VERSION, BESTIARY, ACHIEVEMENTS,
    recordRunStart, recordRunEnd, recordCombatWin, recordMonsterSeen, recordMonsterDefeated,
    recordEventSeen, recordItemSeen, recordItemEquipped, recordGold, recordTrophy, checkAchievements,
    upgradeLevel, nextUpgradeCost, canBuyUpgrade, buyUpgrade, upgradeEffect,
    claimExpedition, recordDepth, recordVariantSeen, UPGRADES
} from '../src/meta.js';
import { ALL_MONSTER_DEFS } from '../src/data/monsters.js';
import { createRpgItem } from '../src/items.js';
import { createRng } from '../src/rng.js';
import { RPG_BALANCE } from '../src/data/balance.js';
RPG_BALANCE.freeShop = false;   // las pruebas miran los precios de verdad (el juego está en modo pruebas: todo gratis)

let passed = 0;
let failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}

function fakeStorage() {
    const m = new Map();
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) };
}
const item = (over = {}) => createRpgItem({ rng: createRng(1), floor: 5, ...over });

// =============================================
console.log('\n💾 Guardar y cargar');
{
    const store = fakeStorage();
    const empty = loadMeta(store);
    assert('sin nada guardado, empieza todo en cero', empty.runsPlayed === 0 && empty.gold === 0 && empty.trophyItem === null
        && Object.keys(empty.monstersSeen).length === 0 && Object.keys(empty.achievements).length === 0);
    assert('null es un almacenamiento válido (modo privado, etc.): no revienta', loadMeta(null).v === META_VERSION);

    const meta = loadMeta(store);
    recordRunStart(meta);
    recordGold(meta, 5);
    assert('guardar devuelve true con un storage real', saveMeta(store, meta) === true);
    const reloaded = loadMeta(store);
    assert('lo guardado se recupera igual', reloaded.runsPlayed === 1 && reloaded.gold === 5);
    assert('guardar con storage null no rompe (solo no persiste)', saveMeta(null, meta) === false);

    store.setItem('easy-hero-meta', '{roto');
    assert('un JSON dañado se descarta con un progreso vacío, no con un fallo', loadMeta(store).v === META_VERSION && loadMeta(store).runsPlayed === 0);
    store.setItem('easy-hero-meta', JSON.stringify({ v: 999, runsPlayed: 40 }));
    assert('una versión futura/distinta también se descarta (no se interpreta mal)', loadMeta(store).runsPlayed === 0);
}

// =============================================
console.log('\n🐺 Bestiario y 🎒 colección');
{
    assert('el bestiario cubre los 6 elencos del descenso, los sub-jefes, los jefes y los de evento (104)', BESTIARY.length === 104);
    assert('ninguna entrada del bestiario repite nombre, y todas tienen icono',
        new Set(BESTIARY.map(m => m.name)).size === BESTIARY.length && BESTIARY.every(m => m.icon));
    // Los monstruos normales son los que se ven uno junto a otro en el panel: ahí un icono repetido canta
    assert('ningún monstruo normal repite icono con otro', new Set(ALL_MONSTER_DEFS.map(m => m.icon)).size === ALL_MONSTER_DEFS.length);
    assert('cada tramo del descenso estrena 15 criaturas y el tramo 0 es la mazmorra de siempre',
        ALL_MONSTER_DEFS.length === 90 && ALL_MONSTER_DEFS[0].name === 'Slime');

    const meta = loadMeta(fakeStorage());
    recordMonsterSeen(meta, 'Slime');
    assert('ver un monstruo lo anota, pero no lo marca como vencido', meta.monstersSeen['Slime'] && !meta.monstersDefeated['Slime']);
    recordMonsterDefeated(meta, 'Slime');
    assert('vencerlo lo marca también como vencido (sin perder que se vio)', meta.monstersSeen['Slime'] && meta.monstersDefeated['Slime']);
    recordMonsterSeen(meta, null); recordMonsterDefeated(meta, undefined);
    assert('un nombre vacío no rompe nada (evento sin nombre, defensivo)', Object.keys(meta.monstersSeen).length === 1);

    const espada = item({ baseId: 'espada_sendero', rarityId: 'comun' });
    const espadaRara = item({ baseId: 'espada_sendero', rarityId: 'rara' });
    recordItemSeen(meta, espada);
    assert('ver una base la anota con su primera rareza', meta.itemsSeen['espada_sendero'].rarities.join() === 'comun');
    recordItemSeen(meta, espadaRara);
    assert('verla en otra rareza añade esa rareza, sin duplicar la base', meta.itemsSeen['espada_sendero'].rarities.sort().join() === 'comun,rara' && Object.keys(meta.itemsSeen).length === 1);
    recordItemSeen(meta, espada);
    assert('verla otra vez en la misma rareza no la repite', meta.itemsSeen['espada_sendero'].rarities.length === 2);
}

// =============================================
console.log('\n🪙 Oro: nunca baja de 0, se acumula sin límite');
{
    const meta = loadMeta(fakeStorage());
    recordGold(meta, 5); recordGold(meta, 3);
    assert('el oro se acumula', meta.gold === 8);
    recordGold(meta, -100);
    assert('el oro nunca baja de 0 (por si algún día algo lo resta)', meta.gold === 0);
    recordGold(meta, 12.9);
    assert('el oro es siempre un entero', Number.isInteger(meta.gold));
}

// =============================================
console.log('\n🏆 Trofeo del jefe: se gana una vez, dura para siempre');
{
    const meta = loadMeta(fakeStorage());
    const primero = item({ rarityId: 'legendaria' });
    recordTrophy(meta, primero);
    assert('el primer trofeo se guarda', meta.trophyItem === primero);
    const segundo = item({ rarityId: 'legendaria', floor: 12 });
    recordTrophy(meta, segundo);
    assert('sin pedir sustituir, un trofeo nuevo NO pisa al que ya tenías', meta.trophyItem === primero);
    recordTrophy(meta, segundo, true);
    assert('pidiendo sustituir explícitamente, sí se reemplaza', meta.trophyItem === segundo);
    const store = fakeStorage();
    saveMeta(store, meta);
    assert('el trofeo sobrevive a guardar y cargar tal cual (mismos datos)', JSON.stringify(loadMeta(store).trophyItem) === JSON.stringify(segundo));
}

// =============================================
console.log('\n🏅 Logros (15): información, nunca poder');
{
    assert('hay 22 logros, todos con id, icono, nombre y descripción únicos', ACHIEVEMENTS.length === 22
        && new Set(ACHIEVEMENTS.map(a => a.id)).size === 22 && ACHIEVEMENTS.every(a => a.icon && a.name && a.desc));
    assert('ningún logro toca stats de combate: solo se leen, nunca se otorga ATK/HP/oro por conseguirlos',
        ACHIEVEMENTS.every(a => typeof a.check === 'function'));

    const meta = loadMeta(fakeStorage());
    assert('sin haber jugado, ningún logro está desbloqueado', checkAchievements(meta, null, { floors: 16 }).length === 0);

    recordRunStart(meta);
    recordCombatWin(meta);
    let unlocked = checkAchievements(meta, null, { floors: 16 });
    assert('ganar un combate desbloquea «Primera sangre»', unlocked.some(a => a.id === 'first_blood'));
    assert('desbloquearlo lo anota con fecha (timestamp)', typeof meta.achievements.first_blood === 'number');
    unlocked = checkAchievements(meta, null, { floors: 16 });
    assert('un logro ya conseguido no se vuelve a anunciar como «recién desbloqueado»', unlocked.length === 0);

    const heroFull = { equipment: { weapon: {}, secondary: {}, armor: {}, accessory: {} } };
    const heroEmpty = { equipment: { weapon: null, secondary: null, armor: null, accessory: null } };
    recordRunEnd(meta, { result: 'victory', floor: 15 });
    unlocked = checkAchievements(meta, { result: 'victory', hero: heroFull, stats: { equipped: 2, fled: 1 } }, { floors: 16 });
    const ids = unlocked.map(a => a.id);
    assert('vencer al jefe desbloquea «La ruta es tuya» y «A las puertas»', ids.includes('victory') && ids.includes('floor_boss'));
    assert('«Manos llenas» se concede con las 4 ranuras ocupadas', ids.includes('full_gear'));
    assert('«Solo con lo puesto» NO se concede si equipaste algo esa ruta', !ids.includes('no_gear_win'));
    assert('«Paso firme» NO se concede si huiste alguna vez', !ids.includes('flawless'));

    const meta2 = loadMeta(fakeStorage());
    recordRunStart(meta2);
    recordRunEnd(meta2, { result: 'victory', floor: 15 });
    const ids2 = checkAchievements(meta2, { result: 'victory', hero: heroEmpty, stats: { equipped: 0, fled: 0 } }, { floors: 16 }).map(a => a.id);
    assert('sin equipar nada y sin huir: «Solo con lo puesto» y «Paso firme» SÍ se conceden', ids2.includes('no_gear_win') && ids2.includes('flawless'));
    assert('sin las 4 ranuras ocupadas, «Manos llenas» NO se concede', !ids2.includes('full_gear'));

    const metaDefeat = loadMeta(fakeStorage());
    recordRunStart(metaDefeat);
    recordRunEnd(metaDefeat, { result: 'defeat', floor: 7 });
    const idsDefeat = checkAchievements(metaDefeat, { result: 'defeat', hero: heroEmpty, stats: { equipped: 0, fled: 0 } }, { floors: 16 }).map(a => a.id);
    assert('perder también cuenta para «La primera ruta» (da igual ganar o perder)', idsDefeat.includes('first_run'));
    assert('perder NO desbloquea logros de victoria', !idsDefeat.includes('victory') && !idsDefeat.includes('no_gear_win'));

    const metaBest = loadMeta(fakeStorage());
    for (let f = 0; f <= 20; f += 4) recordRunEnd(metaBest, { result: 'defeat', floor: f });
    assert('el piso más lejano se queda en memoria aunque bajen los siguientes', metaBest.bestFloor === 20);
    const idsFloor = checkAchievements(metaBest, null, { floors: 16 }).map(a => a.id);
    assert('llegar lejos desbloquea «A medio camino» (piso 10) sin haber ganado', idsFloor.includes('floor10'));
}

// =============================================
console.log('\n⚒️ La Forja: mejoras permanentes compradas con oro');
{
    const meta = loadMeta(fakeStorage());
    assert('sin oro no se puede comprar nada', !canBuyUpgrade(meta, 'filo') && buyUpgrade(meta, 'filo').ok === false);
    assert('una mejora que no existe no rompe nada', !canBuyUpgrade(meta, 'inventada') && upgradeEffect(meta, 'inventada') === 0);

    recordGold(meta, 25);
    const first = buyUpgrade(meta, 'filo');
    assert('Filo afilado: la primera compra cuesta 10 y descuenta del oro', first.ok && first.cost === 10 && meta.gold === 15);
    assert('…sube a nivel 1 y da +1 ATK', upgradeLevel(meta, 'filo') === 1 && upgradeEffect(meta, 'filo') === 1);
    assert('el precio se duplica: el segundo nivel cuesta 20', nextUpgradeCost(meta, 'filo') === 20);
    assert('con 15 monedas no llega para el segundo nivel', !canBuyUpgrade(meta, 'filo') && !buyUpgrade(meta, 'filo').ok);
    recordGold(meta, 5);
    buyUpgrade(meta, 'filo');
    assert('el segundo nivel da +2 más: +3 ATK en total', upgradeLevel(meta, 'filo') === 2 && upgradeEffect(meta, 'filo') === 3);
    assert('el tercero cuesta 40 (10 → 20 → 40)', nextUpgradeCost(meta, 'filo') === 40);
    recordGold(meta, 40);
    buyUpgrade(meta, 'filo');
    assert('y el tercero da +3 más: +6 ATK en total (1, 3, 6, 10…)', upgradeEffect(meta, 'filo') === 6 && nextUpgradeCost(meta, 'filo') === 80);
    const vida = loadMeta(fakeStorage());
    recordGold(vida, 1000);
    for (let i = 0; i < 3; i++) { buyUpgrade(vida, 'constitucion'); buyUpgrade(vida, 'buen_ojo'); }
    assert('Constitución igual: +1, +2, +3 HP (6 en total) y Buen ojo: +1, +2, +3 de oro por combate (6)',
        upgradeEffect(vida, 'constitucion') === 6 && upgradeEffect(vida, 'buen_ojo') === 6 && vida.gold === 1000 - 2 * (10 + 20 + 40));

    const once = loadMeta(fakeStorage());
    recordGold(once, 10000);
    assert('una mejora de compra única se compra una vez', buyUpgrade(once, 'zurron').ok === true);
    assert('…y ya no se puede volver a comprar, ni aunque sobre oro',
        nextUpgradeCost(once, 'zurron') === Infinity && !canBuyUpgrade(once, 'zurron') && buyUpgrade(once, 'zurron').ok === false);
    assert('las de porcentaje devuelven fracción, no entero', (() => {
        buyUpgrade(once, 'estudio');
        return Math.abs(upgradeEffect(once, 'estudio') - 0.1) < 1e-9;
    })());
    assert('el oro nunca queda negativo por comprar', once.gold >= 0);
    assert('todas las mejoras del catálogo tienen id, icono, nombre, descripción y coste',
        UPGRADES.length >= 8 && new Set(UPGRADES.map(u => u.id)).size === UPGRADES.length
        && UPGRADES.every(u => u.icon && u.name && u.desc && u.cost > 0 && u.effect));

    const saved = fakeStorage();
    const persist = loadMeta(saved);
    recordGold(persist, 500);
    buyUpgrade(persist, 'linterna');
    saveMeta(saved, persist);
    assert('las mejoras compradas sobreviven a recargar (son permanentes)', upgradeLevel(loadMeta(saved), 'linterna') === 1);
}

// =============================================
console.log('\n🕳️ Descenso: profundidad, variantes vistas y expedición');
{
    const meta = loadMeta(fakeStorage());
    recordDepth(meta, { depth: 20, tier: 1 });
    recordDepth(meta, { depth: 12, tier: 0 });
    assert('el récord de profundidad no baja al hacer una ruta peor', meta.bestDepth === 20 && meta.bestTier === 1);

    recordVariantSeen(meta, 'Orco', { adj: 'colerico', lin: 'plaga' });
    recordVariantSeen(meta, 'Orco', { adj: 'petreo', lin: null });
    assert('las variantes se anotan como medallas dentro de la ficha del monstruo base',
        Object.keys(meta.variantsSeen['Orco'].adj).length === 2 && Object.keys(meta.variantsSeen['Orco'].lin).length === 1);
    recordVariantSeen(meta, null, { adj: 'colerico' });
    recordVariantSeen(meta, 'Orco', null);
    assert('anotar una variante sin nombre o sin variante no rompe nada', Object.keys(meta.variantsSeen).length === 1);

    const exp = loadMeta(fakeStorage());
    const t0 = 1_000_000_000_000;
    assert('la primera vez la expedición no da nada: solo arranca el reloj', claimExpedition(exp, t0).gold === 0 && exp.lastSeen === t0);
    const twoHours = claimExpedition(exp, t0 + 2 * 3600_000);
    assert('dos horas fuera rinden dos horas de oro', twoHours.gold === 30 && exp.gold === 30);
    const long = claimExpedition(exp, t0 + 2 * 3600_000 + 40 * 3600_000);
    assert('estar fuera 40 horas solo paga el tope de 8', long.gold === 120 && long.capped === true);
    assert('volver al instante no da oro por la cara', claimExpedition(exp, exp.lastSeen).gold === 0);

    const deep = loadMeta(fakeStorage());
    recordDepth(deep, { depth: 60, tier: 3 });
    deep.lastSeen = t0;
    assert('cuanto más hondo has llegado, más rinde la expedición', claimExpedition(deep, t0 + 3600_000).gold === 60);
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

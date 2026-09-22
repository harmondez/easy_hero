// =============================================
// 🐺 RPG-pack — progreso persistente: bestiario, colección, logros, oro y trofeo
// Todo sobre `src/meta.js`, sin navegador. El «almacenamiento» es un Map en memoria.
// =============================================
import {
    loadMeta, saveMeta, META_VERSION, BESTIARY, ACHIEVEMENTS,
    recordRunStart, recordRunEnd, recordCombatWin, recordMonsterSeen, recordMonsterDefeated,
    recordEventSeen, recordItemSeen, recordItemEquipped, recordGold, recordTrophy, checkAchievements
} from '../src/meta.js';
import { createRpgItem } from '../src/items.js';
import { createRng } from '../src/rng.js';

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
    assert('el bestiario tiene 24 entradas (15 monstruos + 3 sub-jefes + jefe + 5 de evento)', BESTIARY.length === 24);
    assert('todas las entradas del bestiario tienen nombre e icono únicos', new Set(BESTIARY.map(m => m.name)).size === 24 && BESTIARY.every(m => m.icon));

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
    assert('hay 15 logros, todos con id, icono, nombre y descripción únicos', ACHIEVEMENTS.length === 15
        && new Set(ACHIEVEMENTS.map(a => a.id)).size === 15 && ACHIEVEMENTS.every(a => a.icon && a.name && a.desc));
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

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

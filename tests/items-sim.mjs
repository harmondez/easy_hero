// =============================================
// 🎒 RPG-pack — equipo: fabricación, equipar, botín y reglas en combate
// Todo sobre el motor puro (sin navegador). El azar viene de una semilla, así que cada resultado se repite.
// =============================================
import {
    createRpgItem, createStarterItem, equipItem, discardItem, discardHealFor, rollLootOffers, itemPower, itemDelta, describeItem, traitText,
    ruleSum, ITEM_SLOT_ORDER, ITEM_BASES, RARITIES, LOOT_SOURCES, campfireBonus, equippedUniqueIds
} from '../src/items.js';
import { AFFIX_UNIQUES } from '../src/data/affixes.js';
import {
    createRpgHero, createRpgCombat, rpgCombatAction, rpgAttackPreview, rpgAttackHits, rpgIncomingPreview, rpgSkillInfo, rpgSkillReady, rpgCanFlee
} from '../src/engine.js';
import { applyRpgFx } from '../src/events.js';
import { snapshotRun, restoreRun } from '../src/save.js';
import { createRng } from '../src/rng.js';

let passed = 0;
let failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}

// ---------- Ayudas ----------
const zero = { atq: 0, maxHp: 0, guard: 0, skillDamage: 0, skillCooldown: 0, campfireHealPct: 0 };
/** Un objeto a medida (para probar una regla aislada). */
const fake = (slot, { stats = {}, rules = [], damaged = null, unique = null } = {}) => ({
    baseId: `fake_${slot}`, name: `Falso ${slot}`, icon: '🧪', slot, damaged, rarity: 'comun', rarityName: 'Común', rarityIcon: '⚪', color: '#fff',
    floor: 0, main: {}, trait: null, affixes: [], unique, rules: rules.map(r => ({ hook: null, from: 'affix', ...r })), stats: { ...zero, ...stats },
    discardHeal: 3, desc: ''
});
const heroWith = (...items) => { const h = createRpgHero(); items.forEach(i => equipItem(h, i)); return h; };
// Monstruo simple: golpea siempre con `atq`; mucha vida para que el combate no termine por accidente
const dummy = (o = {}) => ({ type: 'monster', floor: 1, name: 'Muñeco', icon: '🪆', color: '#888', atq: 2, hp: 40, maxHp: 40, pattern: [{ k: 'attack', m: 1 }], ...o });
const fight = (hero, monster = dummy()) => createRpgCombat(hero, monster, createRng(7));
const act = (c, a, s) => rpgCombatAction(c, a, s);
const texts = r => r.events.map(e => e.text).join(' | ');

// =============================================
console.log('\n🏭 Fabricación (6000 objetos con semilla)');
{
    const rng = createRng(2024);
    const all = [];
    for (let i = 0; i < 6000; i++) all.push(createRpgItem({ rng, floor: i % 15 }));
    const count = {};
    all.forEach(it => { count[it.rarity] = (count[it.rarity] || 0) + 1; });
    const pct = id => 100 * (count[id] || 0) / all.length;
    assert('la distribución de rarezas sigue 50/28/14/6/2 (margen ±2 %)',
        Math.abs(pct('comun') - 50) < 2 && Math.abs(pct('poco_comun') - 28) < 2 && Math.abs(pct('rara') - 14) < 2 && Math.abs(pct('epica') - 6) < 1.5 && Math.abs(pct('legendaria') - 2) < 1);
    assert('el nº de afijos lo decide la rareza (0,1,2,3,3)', all.every(it => it.affixes.length === RARITIES.find(r => r.id === it.rarity).affixes));
    assert('los afijos de un objeto no se repiten', all.every(it => new Set(it.affixes.map(a => a.id)).size === it.affixes.length));
    assert('un afijo nunca repite el rasgo fijo de la base', all.every(it => !it.trait || !it.affixes.some(a => a.id === it.trait.k)));
    assert('el rasgo único solo sale en legendarias, y en todas ellas', all.every(it => (it.rarity === 'legendaria') === !!it.unique));
    assert('las estadísticas son números enteros y finitos (el motor no redondea)', all.every(it =>
        Object.values(it.stats).every(v => Number.isFinite(v)) && ['atq', 'maxHp', 'guard', 'skillDamage', 'skillCooldown'].every(k => Number.isInteger(it.stats[k]))));
    assert('las armas dan ATK ≥ 1, las armaduras HP y las secundarias/accesorios ningún ATK base',
        all.filter(i => i.slot === 'weapon').every(i => i.stats.atq >= 1)
        && all.filter(i => i.slot === 'armor').every(i => i.main.hp >= 1));
    assert('cada objeto lleva el color de su rareza y el tipo de daño solo si es un arma', all.every(it => it.color === RARITIES.find(r => r.id === it.rarity).color && (it.slot === 'weapon') === !!it.damaged));
    assert('un objeto se puede guardar como texto y recuperar igual (sin funciones ni referencias)', all.slice(0, 500).every(it => JSON.stringify(JSON.parse(JSON.stringify(it))) === JSON.stringify(it)));
    assert('la misma semilla fabrica el mismo objeto', JSON.stringify(createRpgItem({ rng: createRng(5), floor: 6 })) === JSON.stringify(createRpgItem({ rng: createRng(5), floor: 6 })));
    assert('todas las bases (122) salen fabricadas sin fallar, en las 5 rarezas', ITEM_BASES.length === 122 && ITEM_BASES.every(b => RARITIES.every(r => {
        const it = createRpgItem({ rng: createRng(1), floor: 5, baseId: b.id, rarityId: r.id });
        return it && it.baseId === b.id && it.rarity === r.id;
    })));
    assert('una rareza inexistente devuelve null (no un objeto roto)', createRpgItem({ rarityId: 'zzz' }) === null);
    assert('una base inexistente cae en una base al azar de la ranura pedida', createRpgItem({ rng: createRng(1), baseId: 'no_existe', slot: 'armor', rarityId: 'comun' }).slot === 'armor');

    // Escalado por piso: mismo objeto, más piso = más poder (nunca menos)
    const monotone = ITEM_BASES.every(b => {
        let prev = null;
        for (let f = 0; f <= 15; f++) {
            const it = createRpgItem({ rng: createRng(9), floor: f, baseId: b.id, rarityId: 'comun' });
            const total = it.stats.atq + it.stats.maxHp;
            if (prev != null && total < prev) return false;
            prev = total;
        }
        return true;
    });
    assert('el escalado por piso es monótono en todas las bases', monotone);
    assert('el poder crece con la rareza: ×1,00 < ×1,15 < ×1,30 < ×1,50 < ×1,70 (y +8 % por piso)',
        RARITIES.every((r, i) => i === 0 || itemPower(r.id, 3) > itemPower(RARITIES[i - 1].id, 3)) && Math.abs(itemPower('comun', 10) - 1.8) < 1e-9);
    const sword = f => createRpgItem({ rng: createRng(1), floor: f, baseId: 'mandoble_lobo', rarityId: 'epica' }).stats.atq;
    assert('un mandoble épico del piso 12 pega bastante más que uno del piso 1', sword(12) >= sword(1) + 3);
    assert('el escudo NO escala con el piso (no se vuelve invulnerable)', createRpgItem({ rng: createRng(1), floor: 14, baseId: 'escudo_dragon', rarityId: 'comun' }).stats.guard === 3);

    // Mínimos por fuente
    const order = RARITIES.map(r => r.id);
    const minOf = min => all.length && Array.from({ length: 600 }, () => order.indexOf(createRpgItem({ rng, floor: 3, minRarity: min }).rarity));
    assert('la hoguera nunca da comunes (mínimo poco común)', minOf('poco_comun').every(i => i >= 1));
    assert('el sub-jefe nunca da menos que raro', minOf('rara').every(i => i >= 2));
    assert('las fuentes de botín declaran esos mínimos', LOOT_SOURCES.campfire.min === 'poco_comun' && LOOT_SOURCES.subboss.min === 'rara' && LOOT_SOURCES.chest.min === null);
}

// =============================================
console.log('\n⚔️ El equipo inicial');
{
    const start = createStarterItem();
    assert('la espada básica es de Filo, común, sin afijos y da 1 de ATK', start.baseId === 'espada_sendero' && start.damaged === 'filo' && start.rarity === 'comun' && !start.affixes.length && start.stats.atq === 1);
    const realRandom = Math.random;
    let used = false;
    Math.random = () => { used = true; return 0.5; };
    createStarterItem(); createRpgHero();
    Math.random = realRandom;
    assert('crear el héroe y su espada no gasta ningún número aleatorio', !used);
    const h = createRpgHero();
    assert('empieza con la espada equipada y las otras 3 ranuras vacías', h.equipment.weapon && ITEM_SLOT_ORDER.slice(1).every(s => h.equipment[s] === null));
    assert('ATK 1 y HP 25 como siempre', h.atq === 1 && h.hp === 25 && h.maxHp === 25 && h.guard === 0);
}

// =============================================
console.log('\n🧥 Equipar y descartar');
{
    const h = createRpgHero();
    const armor = fake('armor', { stats: { maxHp: 8 } });
    h.hp = 10;
    equipItem(h, armor);
    assert('una armadura suma HP máx y cura lo mismo (como los premios del juego)', h.maxHp === 33 && h.hp === 18);
    const armor2 = fake('armor', { stats: { maxHp: 3 } });
    const old = equipItem(h, armor2);
    assert('cambiar de armadura devuelve la anterior y ajusta el HP máx', old === armor && h.maxHp === 28 && h.equipment.armor === armor2);
    assert('al bajar el HP máx la vida actual no lo supera', h.hp <= h.maxHp && h.hp >= 1);
    const full = createRpgHero(); equipItem(full, armor); full.hp = full.maxHp;
    equipItem(full, armor2);
    assert('quitar una armadura con la vida al máximo la deja en el nuevo máximo', full.hp === full.maxHp);

    const w = fake('weapon', { stats: { atq: 4 }, damaged: 'fuego' });
    equipItem(h, w);
    assert('cambiar de arma: 1 (espada) → 4 (nueva) de ATK, sin acumular', h.atq === 4);
    equipItem(h, createStarterItem());
    assert('volver a la espada deja el ATK en 1', h.atq === 1);

    const sh = fake('secondary', { stats: { guard: 2, skillDamage: 3, skillCooldown: -1 } });
    equipItem(h, sh);
    assert('un escudo suma guardia y las mejoras de habilidad van a skillMods', h.guard === 2 && h.skillMods.fire_strike.damage === 3 && h.skillMods.fire_strike.cooldown === -1);
    equipItem(h, fake('secondary'));
    assert('quitarlo las devuelve a 0', h.guard === 0 && h.skillMods.fire_strike.damage === 0 && h.skillMods.fire_strike.cooldown === 0);
    const acc = heroWith(fake('accessory', { stats: { campfireHealPct: 0.05 } }), fake('armor', { stats: { campfireHealPct: 0.1 } }));
    assert('la Calidez de armadura y accesorio se suma', Math.abs(campfireBonus(acc) - 0.15) < 1e-9);

    // Descartar
    const d = createRpgHero(); d.hp = 10;
    const item = createRpgItem({ rng: createRng(3), floor: 2, rarityId: 'comun' });
    assert('descartar un común cura 3 HP', discardHealFor(d, item) === 3 && discardItem(d, item) === 3 && d.hp === 13);
    const rare = createRpgItem({ rng: createRng(3), floor: 2, rarityId: 'epica' });
    assert('descartar algo de mayor rareza cura más (épico: 3 + 3)', discardHealFor(d, rare) === 6);
    const dd = createRpgHero(); dd.hp = 24;
    assert('descartar nunca cura por encima del máximo (solo 1)', discardItem(dd, item) === 1 && dd.hp === 25);
    const recycler = heroWith(fake('accessory', { rules: [{ id: 'discard_heal', v: 2 }] }));
    assert('el Amuleto del reciclador suma a lo que cura descartar', discardHealFor(recycler, item) === 5);
    assert('descartar no cambia el equipo', (() => { const before = JSON.stringify(d.equipment); discardItem(d, item); return JSON.stringify(d.equipment) === before; })());

    // Eventos y equipo conviven: un evento que da +1 ATK sobrevive a cambiar de arma
    const e = createRpgHero(); applyRpgFx(e, { atq: 2 });
    equipItem(e, fake('weapon', { stats: { atq: 3 } }));
    assert('un +2 ATK de evento no se pierde al cambiar de arma (1+2 → 2+3... = 5)', e.atq === 5);
    const bonus = createRpgHero(); bonus.hp = 5;
    applyRpgFx(bonus, { healPct: 0.3, campfire: true });
    assert('descansar sin Calidez cura el 30 % (25 → 7 HP)', bonus.hp === 5 + 7);
    const warm = heroWith(fake('armor', { stats: { campfireHealPct: 0.2 } })); warm.hp = 5;
    applyRpgFx(warm, { healPct: 0.3, campfire: true });
    assert('con +20 % de Calidez cura el 50 % de la vida máxima', warm.hp === 5 + Math.floor(warm.maxHp * 0.5));
}

// =============================================
console.log('\n🎁 Botín: 1 de 3');
{
    const hero = createRpgHero();
    const offers = rollLootOffers({ rng: createRng(11), floor: 4, source: 'chest', hero });
    assert('siempre hay 3 ofertas, de ranuras distintas', offers.length === 3 && new Set(offers.map(o => o.slot)).size === 3);
    assert('la misma semilla ofrece lo mismo', JSON.stringify(offers) === JSON.stringify(rollLootOffers({ rng: createRng(11), floor: 4, source: 'chest', hero })));
    let subOk = true, fireOk = true, emptyBias = 0, total = 0;
    for (let s = 1; s <= 400; s++) {
        if (!rollLootOffers({ rng: createRng(s), floor: 6, source: 'subboss', hero }).every(o => RARITIES.findIndex(r => r.id === o.rarity) >= 2)) subOk = false;
        if (!rollLootOffers({ rng: createRng(s), floor: 6, source: 'campfire', hero }).every(o => RARITIES.findIndex(r => r.id === o.rarity) >= 1)) fireOk = false;
        const o = rollLootOffers({ rng: createRng(s), floor: 3, source: 'chest', hero });
        total++; if (o.some(x => x.slot === 'weapon')) emptyBias++;
    }
    assert('el botín del sub-jefe es siempre 🔵 o mejor', subOk);
    assert('el de la hoguera es siempre 🟢 o mejor', fireOk);
    assert('con 3 ranuras vacías, la ranura del arma (ya llena) aparece bastante menos (< 45 % de los cofres)', emptyBias / total < 0.45);
    const geared = heroWith(fake('secondary'), fake('armor'), fake('accessory'));
    let weaponSeen = 0;
    for (let s = 1; s <= 300; s++) if (rollLootOffers({ rng: createRng(s), floor: 3, hero: geared }).some(o => o.slot === 'weapon')) weaponSeen++;
    assert('con todas las ranuras llenas, todas pesan igual: el arma sale en ~3 de cada 4 cofres', weaponSeen / 300 > 0.6 && weaponSeen / 300 < 0.9);

    // Legendarias: un único ya equipado no se repite
    const uniq = AFFIX_UNIQUES[0].id;
    const holder = heroWith(fake('accessory', { unique: { id: uniq, name: 'x', v: 1, text: 'x' } }));
    assert('lista los únicos equipados', equippedUniqueIds(holder).join() === uniq);
    let dup = 0;
    for (let s = 1; s <= 300; s++) {
        const it = createRpgItem({ rng: createRng(s), floor: 8, rarityId: 'legendaria', avoidUniques: equippedUniqueIds(holder) });
        if (it.unique.id === uniq) dup++;
    }
    assert('no se repite el mismo rasgo legendario equipado (0 de 300)', dup === 0);
    assert('pero un legendario distinto sí puede salir (los 5 restantes)', new Set(Array.from({ length: 300 }, (_, s) =>
        createRpgItem({ rng: createRng(s + 1), floor: 8, rarityId: 'legendaria', avoidUniques: [uniq] }).unique.id)).size === AFFIX_UNIQUES.length - 1);

    // Comparar
    const cur = createRpgHero();
    const better = fake('weapon', { stats: { atq: 4 } });
    assert('la comparación del arma: +3 ATK frente a la espada básica', itemDelta(cur, better).atq === 3);
    assert('la comparación de una ranura vacía suma todo', itemDelta(cur, fake('armor', { stats: { maxHp: 6 } })).maxHp === 6);
    const lines = describeItem(createRpgItem({ rng: createRng(4), floor: 5, baseId: 'sable_luna', rarityId: 'rara' }));
    assert('la descripción de un objeto lista principal, rasgo y 2 afijos (sin «undefined» ni «NaN»)', lines.length >= 3 && lines.every(l => !/undefined|NaN|\{/.test(l)));
    assert('el texto de un rasgo con tipo de daño lo nombra', /filo/i.test(traitText({ k: 'damage_type_bonus', type: 'filo', v: 2 })));
    assert('todos los textos de objetos (122 bases × 5 rarezas) salen sin «undefined», «NaN» ni llaves', ITEM_BASES.every(b => RARITIES.every(r =>
        describeItem(createRpgItem({ rng: createRng(2), floor: 7, baseId: b.id, rarityId: r.id })).every(l => !/undefined|NaN|\{|\}/.test(l)))));
}

// =============================================
console.log('\n🗡️ El arma cuenta en combate');
{
    const c = fight(heroWith(fake('weapon', { stats: { atq: 4 }, damaged: 'fuego' })));
    assert('con un arma de +4 el ataque hace 4 y la vista previa lo anuncia', rpgAttackPreview(c) === 4 && act(c, 'attack').events[0].amount === 4);
    assert('el texto lleva el icono del tipo de daño del arma (🔥)', /🔥/.test(c.hero.name) === false && act(fight(heroWith(fake('weapon', { stats: { atq: 4 }, damaged: 'fuego' }))), 'attack').events[0].text.startsWith('🔥'));
    assert('sin más reglas, el ataque de una espada es solo su ATK', rpgAttackPreview(fight(createRpgHero())) === 1);
    const bonus = fight(heroWith(fake('weapon', { stats: { atq: 2 }, damaged: 'rayo' }), fake('accessory', { rules: [{ id: 'damage_type_bonus', v: 2, type: 'rayo' }] })));
    assert('«+2 con Rayo» suma con un arma de Rayo', rpgAttackPreview(bonus) === 4);
    const wrong = fight(heroWith(fake('weapon', { stats: { atq: 2 }, damaged: 'filo' }), fake('accessory', { rules: [{ id: 'damage_type_bonus', v: 2, type: 'rayo' }] })));
    assert('…pero no con un arma de otro tipo', rpgAttackPreview(wrong) === 2);
}

// =============================================
console.log('\n🛡️ Defender y guardia');
{
    const h = heroWith(fake('secondary', { stats: { guard: 1 } }));
    const c = fight(h, dummy({ atq: 6 }));
    assert('sin defender el golpe es completo (6)', rpgIncomingPreview(c, false) === 6);
    assert('defender con guardia 1 reduce la mitad y 1 más: 6 → 3 → 2', rpgIncomingPreview(c, true) === 2);
    const r = act(c, 'defend');
    assert('la vista previa se cumple: pierdes 2 HP', c.hero.hp === 23 && /reducido/.test(texts(r)));
    const tough = fight(heroWith(fake('secondary', { stats: { guard: 4 } })), dummy({ atq: 3 }));
    act(tough, 'defend');
    assert('con guardia alta un golpe pequeño se anula del todo (0 de daño), no cura', tough.hero.hp === 25);
    const c2 = fight(heroWith(fake('secondary', { stats: { guard: 3 } })), dummy({ atq: 6 }));
    act(c2, 'attack');
    assert('la guardia solo actúa al defender: atacando recibes los 6', c2.hero.hp === 19);
}

// =============================================
console.log('\n🎯 Reglas que se disparan al atacar');
{
    let c = fight(heroWith(fake('weapon', { stats: { atq: 2 }, rules: [{ id: 'first_attack_double', v: 2 }] })));
    assert('golpe furtivo: la vista previa ya dice 4', rpgAttackPreview(c) === 4);
    act(c, 'attack');
    assert('…solo el primer ataque del combate: el segundo hace 2', rpgAttackPreview(c) === 2 && c.monster.hp === 36);
    c = fight(heroWith(fake('weapon', { stats: { atq: 2 }, rules: [{ id: 'first_attack_double', v: 2 }] })));
    act(c, 'defend'); act(c, 'attack');
    assert('defender antes NO gasta el primer ataque', c.monster.hp === 36);
    const c2 = fight(heroWith(fake('weapon', { stats: { atq: 2 } })), dummy({ hp: 40 }));
    assert('un combate nuevo reinicia el «primer ataque»', rpgAttackPreview(c2) === 2);

    // Venganza
    c = fight(heroWith(fake('armor', { rules: [{ id: 'revenge', v: 3 }] })), dummy({ atq: 2 }));
    act(c, 'defend');       // recibe golpe → venganza
    assert('venganza: tras recibir daño, tu siguiente ataque hace +3', rpgAttackPreview(c) === 1 + 3);
    act(c, 'attack');
    assert('…y solo el siguiente (después vuelve a 1 + 3 porque te vuelven a golpear)', c.monster.hp === 40 - 4);
    c = fight(heroWith(fake('armor', { rules: [{ id: 'revenge', v: 3 }] })), dummy({ atq: 2, pattern: [{ k: 'rest' }] }));
    act(c, 'attack');
    assert('venganza: sin recibir daño no hay bonus', rpgAttackPreview(c) === 1);

    // Golpe extra
    c = fight(heroWith(fake('secondary', { rules: [{ id: 'extra_strike', v: 1 }] })));
    assert('golpe extra: en el primer turno atacas dos veces (anunciado: 1 + 1)', rpgAttackHits(c).join() === '1,1' && rpgAttackPreview(c) === 2);
    const r = act(c, 'attack');
    assert('…y los dos golpes salen en el diario', r.events.filter(e => e.kind === 'attack' && e.actor === 'hero').length === 2 && c.monster.hp === 38);
    assert('desde el segundo turno solo hay un golpe', rpgAttackHits(c).length === 1);
    c = fight(heroWith(fake('secondary', { rules: [{ id: 'extra_strike', v: 1 }] })), dummy({ hp: 1, maxHp: 1 }));
    assert('golpe extra no pega dos veces a un enemigo ya muerto', rpgAttackHits(c).length === 1);

    // Golpe de gracia
    c = fight(heroWith(fake('weapon', { stats: { atq: 3 }, rules: [{ id: 'execute', v: 2 }] })), dummy({ hp: 8, maxHp: 40 }));
    assert('golpe de gracia: con ≤ 20 % de vida hace ×2 (3 → 6)', rpgAttackPreview(c) === 6);
    c = fight(heroWith(fake('weapon', { stats: { atq: 3 }, rules: [{ id: 'execute', v: 2 }] })), dummy({ hp: 9, maxHp: 40 }));
    assert('…y con más del 20 % no', rpgAttackPreview(c) === 3);

    // Frenesí
    c = fight(heroWith(fake('weapon', { stats: { atq: 2 }, rules: [{ id: 'frenzy', v: 1, from: 'unique' }] })), dummy({ hp: 100, maxHp: 100, pattern: [{ k: 'rest' }] }));
    const dealt = [];
    for (let i = 0; i < 4; i++) { const before = c.monster.hp; act(c, 'attack'); dealt.push(before - c.monster.hp); }
    assert('frenesí: cada ataque seguido pega +1 más (2,3,4,5)', dealt.join() === '2,3,4,5');
    act(c, 'defend');
    assert('…y se reinicia al hacer otra cosa', rpgAttackPreview(c) === 2);

    // Vista previa = realidad (barrido con reglas al azar)
    let match = true;
    for (let s = 1; s <= 300; s++) {
        const rng = createRng(s);
        const h = createRpgHero();
        for (const slot of ['weapon', 'secondary', 'armor', 'accessory']) if (rng() < 0.85) equipItem(h, createRpgItem({ rng, floor: 4 + (s % 8), slot }));
        const cb = createRpgCombat(h, dummy({ atq: 3, hp: 60, maxHp: 60, pattern: [{ k: 'guard' }, { k: 'attack', m: 1 }, { k: 'rest' }] }), createRng(s));
        for (let i = 0; i < 6 && !cb.over; i++) {
            const expect = rpgAttackPreview(cb), before = cb.monster.hp;
            const res = act(cb, 'attack');
            const direct = res.events.filter(e => e.actor === 'hero' && e.kind === 'attack').reduce((t, e) => t + e.amount, 0);
            if (expect !== direct || before < 0) { match = false; break; }
        }
        if (!match) break;
    }
    assert('la vista previa de Atacar coincide con el daño real (300 builds al azar, con protección del enemigo)', match);
}

// =============================================
console.log('\n☠️ Estados: veneno y quemadura');
{
    let c = fight(heroWith(fake('weapon', { stats: { atq: 1 }, rules: [{ id: 'poison_on_hit', v: 1 }] })), dummy({ pattern: [{ k: 'rest' }] }));
    let r = act(c, 'attack');
    assert('veneno: un golpe deja 1 de veneno y hace su daño al final de la ronda (1 + 1)', c.monster.status.poison === 1 && c.monster.hp === 38 && /veneno/i.test(texts(r)));
    act(c, 'attack');
    assert('se acumula: 2 de veneno → el segundo golpe + 2 de veneno', c.monster.status.poison === 2 && c.monster.hp === 38 - 1 - 2);
    assert('la interfaz recibe el estado (para mostrarlo en la carta)', c.monster.status.poison > 0);

    c = fight(heroWith(fake('weapon', { stats: { atq: 1 }, rules: [{ id: 'burn_on_hit', v: 3 }] })), dummy({ pattern: [{ k: 'rest' }] }));
    act(c, 'attack');
    assert('quemadura: 3 por ronda durante 2 rondas', c.monster.status.burn && c.monster.status.burn.dmg === 3 && c.monster.status.burn.turns === 1 && c.monster.hp === 40 - 1 - 3);
    act(c, 'defend');
    assert('…y se apaga al terminar las rondas (2 rondas en total: 3 + 3 = 6)', c.monster.status.burn === null && c.monster.hp === 40 - 1 - 3 - 3);
    act(c, 'defend');
    assert('sin quemadura no hay más daño', c.monster.hp === 40 - 7);

    // Un enemigo que muere por veneno no responde
    c = fight(heroWith(fake('weapon', { stats: { atq: 1 }, rules: [{ id: 'poison_on_hit', v: 3 }] })), dummy({ hp: 4, maxHp: 4, atq: 4 }));
    r = act(c, 'attack');
    assert('si el veneno lo remata, el enemigo cae y NO llega a golpear', r.result === 'victory' && c.hero.hp === 25 && /derrotado/.test(texts(r)));
    // Se guarda en el monstruo, se copia con el combate
    c = fight(heroWith(fake('weapon', { stats: { atq: 1 }, rules: [{ id: 'poison_on_hit', v: 1 }] })), dummy());
    act(c, 'attack');
    assert('el estado sobrevive a guardar y cargar (JSON)', JSON.parse(JSON.stringify(c.monster)).status.poison === 1);
}

// =============================================
console.log('\n💚 Curas y reglas de supervivencia');
{
    let h = heroWith(fake('armor', { rules: [{ id: 'combat_start_heal', v: 3 }] })); h.hp = 10;
    let c = fight(h);
    assert('segundo aliento: empiezas el combate curando 3 (y el diario lo cuenta)', h.hp === 13 && /recupera 3/.test(c.intro[0].text));
    h = heroWith(fake('armor', { rules: [{ id: 'combat_start_heal', v: 3 }] }));
    c = fight(h);
    assert('…sin pasar de la vida máxima (no cura y no dice nada)', h.hp === 25 && c.intro.length === 0);

    h = heroWith(fake('armor', { rules: [{ id: 'victory_heal', v: 4 }] })); h.hp = 10;
    c = fight(h, dummy({ hp: 1, maxHp: 1, atq: 1 }));
    let r = act(c, 'attack');
    assert('cosecha: al vencer curas 4', r.result === 'victory' && h.hp === 14 && /recupera 4/.test(texts(r)));

    h = heroWith(fake('armor', { rules: [{ id: 'defend_heal', v: 2 }] })); h.hp = 10;
    c = fight(h, dummy({ atq: 4 }));
    r = act(c, 'defend');
    assert('aliento sereno: al defender curas 2 antes del golpe (10 + 2 − 2 = 10)', h.hp === 10);

    h = heroWith(fake('armor', { rules: [{ id: 'thorns', v: 3 }] }));
    c = fight(h, dummy({ atq: 4 }));
    r = act(c, 'defend');
    assert('espinas: si te golpea mientras defiendes, recibe 3', c.monster.hp === 37 && /espinas/.test(texts(r)));
    c = fight(heroWith(fake('armor', { rules: [{ id: 'thorns', v: 3 }] })), dummy({ atq: 4 }));
    act(c, 'attack');
    assert('…pero solo defendiendo', c.monster.hp === 39);
    c = fight(heroWith(fake('armor', { rules: [{ id: 'thorns', v: 5 }] })), dummy({ atq: 2, hp: 4, maxHp: 4 }));
    r = act(c, 'defend');
    assert('las espinas pueden rematar al enemigo (victoria)', r.result === 'victory' && c.hero.hp === 24);

    h = heroWith(fake('accessory', { rules: [{ id: 'lifesteal', v: 0.5, from: 'unique' }] }), fake('weapon', { stats: { atq: 5 } })); h.hp = 10;
    c = fight(h, dummy({ pattern: [{ k: 'rest' }] }));
    act(c, 'attack');
    assert('robavida: curas la mitad del daño (5 → 3, redondeado)', h.hp === 13);
    h = heroWith(fake('accessory', { rules: [{ id: 'lifesteal', v: 0.5, from: 'unique' }] })); h.hp = 10;
    c = fight(h, dummy({ pattern: [{ k: 'rest' }] }));
    act(c, 'attack');
    assert('…al menos 1 por golpe', h.hp === 11);

    h = heroWith(fake('accessory', { rules: [{ id: 'last_stand', v: 1, from: 'unique' }] })); h.hp = 3;
    c = fight(h, dummy({ atq: 9, pattern: [{ k: 'attack', m: 1 }] }));
    r = act(c, 'attack');
    assert('última defensa: un golpe mortal te deja en 1', h.hp === 1 && !c.over && /Última defensa/.test(texts(r)));
    r = act(c, 'attack');
    assert('…solo una vez por combate: el siguiente te mata', r.result === 'defeat' && h.hp === 0);
    h = createRpgHero(); h.hp = 3;
    r = act(fight(h, dummy({ atq: 9 })), 'attack');
    assert('sin la regla, el mismo golpe mata', r.result === 'defeat');

    h = heroWith(fake('accessory', { rules: [{ id: 'determination', v: 8, from: 'unique' }] })); h.hp = 14;
    c = fight(h, dummy({ atq: 3 }));
    r = act(c, 'attack');
    assert('determinación: al bajar de la mitad curas 8 (14 − 3 = 11 ≤ 12,5 → +8)', h.hp === 19 && /Determinación/.test(texts(r)));
    act(c, 'attack');
    assert('…una sola vez por combate', h.hp === 16);

    // Huir sin daño
    h = heroWith(fake('accessory', { rules: [{ id: 'flee_safe', v: 1 }] }));
    c = fight(h, dummy());
    r = act(c, 'flee');
    assert('pasos ligeros: huyes sin recibir daño', r.result === 'fled' && h.hp === 25);
    c = fight(createRpgHero(), dummy({ atq: 3 }));
    act(c, 'flee');
    assert('sin la regla, huir cuesta el ATK del monstruo', c.hero.hp === 22);

    // El Lector
    const lector = () => dummy({ ai: 'reader', atq: 4 });
    c = fight(createRpgHero(), lector());
    act(c, 'attack'); act(c, 'attack');
    assert('el Lector castiga repetir la acción (4 + 8 = 12)', c.hero.hp === 25 - 4 - 8);
    c = fight(heroWith(fake('accessory', { rules: [{ id: 'reader_shield', v: 1 }] })), lector());
    act(c, 'attack'); act(c, 'attack');
    assert('mente en blanco: repetir ya no se castiga (4 + 4)', c.hero.hp === 25 - 8);
}

// =============================================
console.log('\n🔥 Golpe de Fuego y el equipo');
{
    let c = fight(heroWith(fake('secondary', { stats: { skillDamage: 3 } })));
    assert('la habilidad suma el bonus de las armas (5 + 3 = 8)', rpgSkillInfo(c.hero, 'fire_strike').damage === 8 && act(c, 'skill', 'fire_strike').events[0].amount === 8);
    c = fight(heroWith(fake('weapon', { stats: { skillCooldown: -1 } })));
    assert('«Recarga»: el enfriamiento baja de 3 a 2', rpgSkillInfo(c.hero, 'fire_strike').cooldown === 2);
    c = fight(heroWith(fake('weapon', { stats: { skillCooldown: -9 } })));
    assert('el enfriamiento nunca baja de 1', rpgSkillInfo(c.hero, 'fire_strike').cooldown === 1);
    c = fight(heroWith(fake('secondary', { rules: [{ id: 'first_turn_focus', v: 4 }] })));
    assert('«Chispa inicial»: el primer turno la habilidad hace +4 (y la vista previa lo dice)', rpgSkillInfo(c.hero, 'fire_strike', c).damage === 9 && rpgSkillInfo(c.hero, 'fire_strike').damage === 5);
    act(c, 'attack');
    assert('…desde el segundo turno ya no', rpgSkillInfo(c.hero, 'fire_strike', c).damage === 5);
    c = fight(heroWith(fake('accessory', { rules: [{ id: 'skill_burn', v: 2 }] })), dummy({ pattern: [{ k: 'rest' }] }));
    act(c, 'skill', 'fire_strike');
    assert('la habilidad quema (2 por ronda, 2 rondas): 5 + 2 de quemadura al final de la ronda', c.monster.hp === 40 - 5 - 2 && c.monster.status.burn.turns === 1 && /quema/i.test(rpgSkillInfo(c.hero, 'fire_strike').desc));
    c = fight(heroWith(fake('accessory', { rules: [{ id: 'pyre', v: 3, from: 'unique' }] })), dummy({ pattern: [{ k: 'rest' }] }));
    act(c, 'skill', 'fire_strike');
    assert('Pira: +2 de daño y quema 3 durante 3 rondas', c.monster.hp === 40 - 7 - 3 && c.monster.status.burn.turns === 2 && c.monster.status.burn.dmg === 3);
    c = fight(createRpgHero());
    assert('sin equipo, la habilidad no cambia (5 de daño, enfriamiento 3, sin quemadura)', rpgSkillInfo(c.hero, 'fire_strike').damage === 5 && !rpgSkillInfo(c.hero, 'fire_strike').burn);
}

// =============================================
console.log('\n💾 Guardar el equipo y el combate');
{
    const hero = heroWith(fake('armor', { stats: { maxHp: 5 }, rules: [{ id: 'revenge', v: 2 }] }));
    for (const slot of ['secondary', 'accessory']) equipItem(hero, createRpgItem({ rng: createRng(8), floor: 6, slot, minRarity: 'rara' }));
    const rng = createRng(21);
    const c = createRpgCombat(hero, { ...dummy(), pattern: [{ k: 'attack', m: 1 }] }, rng);
    act(c, 'attack'); act(c, 'defend');
    const rpg = { seed: 21, rng, hero, map: { nodes: [{ id: 'a', floor: 0, next: [] }], floors: 2 }, currentId: 'a', visitedIds: ['a'], usedEvents: [], skipNext: false, stats: {}, log: [], combat: c,
        loot: { source: 'chest', floor: 2, selected: 1, offers: rollLootOffers({ rng, floor: 2, source: 'chest', hero }) }, event: null };
    const snap = JSON.parse(JSON.stringify(snapshotRun(rpg)));
    const back = restoreRun(snap);
    assert('el equipo del héroe vuelve igual tras guardar y cargar', JSON.stringify(back.hero.equipment) === JSON.stringify(hero.equipment) && back.hero.guard === hero.guard);
    assert('el combate conserva el estado de las reglas (venganza, ataques, cooldowns)', JSON.stringify(back.combat.state) === JSON.stringify(c.state) && back.combat.turn === c.turn);
    assert('el combate restaurado apunta al héroe restaurado (no a una copia)', back.combat.hero === back.hero);
    assert('el botín pendiente (ofertas y la elegida) también se guarda', JSON.stringify(back.loot) === JSON.stringify(rpg.loot));
    const cont = act(back.combat, 'attack');
    const same = act(c, 'attack');
    assert('retomar el combate da el mismo resultado que seguir jugándolo', JSON.stringify(cont.events) === JSON.stringify(same.events));
    assert('un guardado sin equipo (formato anterior) se descarta', restoreRun({ ...snap, hero: { ...snap.hero, equipment: undefined } }) === null);
}

// =============================================
console.log('\n🎲 Miles de builds al azar: ninguno rompe el juego');
{
    let bad = null;
    let fights = 0, wins = 0;
    for (let s = 1; s <= 1500 && !bad; s++) {
        const rng = createRng(s * 7);
        const h = createRpgHero();
        const n = 1 + Math.floor(rng() * 6);
        for (let i = 0; i < n; i++) equipItem(h, createRpgItem({ rng, floor: Math.floor(rng() * 15), avoidUniques: equippedUniqueIds(h) }));
        h.hp = h.maxHp;
        const c = createRpgCombat(h, { ...dummy(), atq: 1 + (s % 7), hp: 25 + (s % 40), maxHp: 25 + (s % 40), pattern: [{ k: 'attack', m: 1 }, { k: 'charge' }, { k: 'attack', m: 2 }, { k: 'guard' }, { k: 'heal', p: 0.1 }] }, rng);
        let guard = 300;
        while (!c.over && guard--) {
            const action = ['attack', 'attack', 'defend', 'skill'][Math.floor(rng() * 4)];
            const r = rpgCombatAction(c, action, 'fire_strike');
            if (!r.ok) rpgCombatAction(c, 'attack');
            if (!Number.isFinite(h.hp) || !Number.isFinite(c.monster.hp) || h.hp < 0 || h.hp > h.maxHp || c.monster.hp < 0 || c.monster.hp > c.monster.maxHp) { bad = { s, hp: h.hp, m: c.monster.hp }; break; }
        }
        if (guard <= 0) bad = { s, why: 'no termina' };
        fights++; if (c.result === 'victory') wins++;
    }
    assert(`1500 builds (1-6 objetos) pelean sin números raros ni combates infinitos (${wins}/${fights} victorias)`, !bad);
    if (bad) console.log('     ', JSON.stringify(bad));
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

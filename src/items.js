import { RARITIES, RARITY_BY_ID, RARITY_MIN, rollRarity, discardHeal } from './data/rarities.js?v=1.1.0';
import { ITEM_BASES, ITEM_BASE_BY_ID, ITEM_SLOTS, DAMAGE_TYPES, BASIC_WEAPON_ID, basesBySlot } from './data/items.js?v=1.1.0';
import { AFFIX_POOL, AFFIX_UNIQUES, affixText } from './data/affixes.js?v=1.1.0';

// =============================================
// 🎒 RPG-pack — equipo (puro, sin DOM)
// Fabrica objetos (base + rareza + afijos + piso), los equipa en las 4 ranuras y ofrece el botín (cofre, hoguera, sub-jefe).
// El contenido (bases, afijos, rarezas) vive en src/data/ y viene del taller `item-world/`.
// Todo el azar llega por el parámetro `rng`.
// =============================================
export { RARITIES, RARITY_BY_ID, ITEM_SLOTS, DAMAGE_TYPES, ITEM_BASES, ITEM_BASE_BY_ID, AFFIX_POOL, AFFIX_UNIQUES };

export const ITEM_SLOT_ORDER = ['weapon', 'secondary', 'armor', 'accessory'];
export const ITEM_FLOOR_SCALE = 0.08;             // +8 % de poder por piso
export const LOOT_OFFERS = 3;                      // «1 de 3»
export const LOOT_SOURCES = {
    chest:    { id: 'chest',    title: 'Cofre',                  icon: '🧰', min: null },
    campfire: { id: 'campfire', title: 'Junto a la hoguera',     icon: '🔥', min: RARITY_MIN.hoguera },
    subboss:  { id: 'subboss',  title: 'El botín del sub-jefe',  icon: '💀', min: RARITY_MIN.subboss }
};

// Reglas cuyo valor NO crece con el piso: multiplicadores, interruptores y rondas
const NO_SCALE = new Set([
    'first_attack_double', 'execute', 'frenzy', 'extra_strike', 'flee_safe', 'reader_shield',
    'lifesteal', 'last_stand', 'pyre', 'poison_on_hit', 'skill_burn', 'skill_cd', 'guard'
]);

/** Multiplicador de poder de un objeto: rareza × piso. */
export function itemPower(rarityId, floor) {
    const r = RARITY_BY_ID[rarityId];
    return (r ? r.power : 1) * (1 + ITEM_FLOOR_SCALE * Math.max(0, floor | 0));
}

const scaleInt = (v, fac) => Math.max(1, Math.round(v * fac));
const scaleValue = (id, v, fac) => {
    if (NO_SCALE.has(id) || v <= 0) return v;
    return Number.isInteger(v) ? scaleInt(v, fac) : Math.round(v * fac * 100) / 100;
};

function _draw(rng, list, n) {
    if (n <= 0) return [];
    const idx = list.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx.slice(0, n).map(i => list[i]);
}

// Lo que un objeto suma a las estadísticas del héroe (enteros; los ganchos se leen de `rules`)
const emptyStats = () => ({ atq: 0, maxHp: 0, guard: 0, skillDamage: 0, skillCooldown: 0, campfireHealPct: 0 });
const STAT_OF = {
    atq: 'atq', maxHp: 'maxHp', guard: 'guard', campfireHealPct: 'campfireHealPct',
    'skillMods.fire_strike.damage': 'skillDamage', 'skillMods.fire_strike.cooldown': 'skillCooldown'
};

/**
 * Fabrica un objeto real: { baseId, name, icon, slot, damaged, rarity, color, floor, main, trait, affixes, unique,
 *                          rules, stats, discardHeal, desc }. Es un objeto plano y se puede guardar tal cual.
 * opts: { rng, floor, slot, baseId, minRarity, rarityId, avoidUniques: [ids] }
 */
export function createRpgItem({ rng = Math.random, floor = 0, slot = null, baseId = null, minRarity = null, rarityId = null, avoidUniques = [] } = {}) {
    let base = baseId ? ITEM_BASE_BY_ID[baseId] : null;
    if (!base) {
        const pool = slot ? basesBySlot(slot) : ITEM_BASES;
        base = pool[Math.floor(rng() * pool.length)];
    }
    if (!base) return null;
    const rarity = rarityId ? RARITY_BY_ID[rarityId] : rollRarity(rng, { min: minRarity });
    if (!rarity) return null;
    const fac = itemPower(rarity.id, floor);

    const stats = emptyStats();
    const rules = [];

    // Base: estadística principal y rasgo fijo
    const main = {};
    for (const [k, v] of Object.entries(base.main || {})) main[k] = k === 'guard' ? v : scaleInt(v, fac);
    if (main.atq) stats.atq += main.atq;
    if (main.hp) stats.maxHp += main.hp;
    if (main.guard) stats.guard += main.guard;

    let trait = null;
    if (base.trait) {
        const v = scaleValue(base.trait.k, base.trait.v ?? 0, fac);
        trait = { ...base.trait, v };
        _addEffect(stats, rules, base.trait.k, v, base.trait.type, 'trait');
    }

    // Afijos: sin repetirse, sin repetir el rasgo de la base y respetando las ranuras permitidas
    const pool = AFFIX_POOL.filter(a => (!a.slots || a.slots.includes(base.slot)) && !(base.trait && base.trait.k === a.id));
    const affixes = _draw(rng, pool, rarity.affixes).map(a => {
        const v = scaleValue(a.id, a.v, fac);
        if (a.kind === 'number') { const key = STAT_OF[a.stat]; if (key) stats[key] += v; }
        else rules.push({ id: a.id, hook: a.hook, v, from: 'affix' });
        return { id: a.id, kind: a.kind, v, text: affixText(a, v) };
    });

    // Rasgo único (solo legendarias): nunca uno que ya lleves equipado
    let unique = null;
    if (rarity.unique) {
        const free = AFFIX_UNIQUES.filter(u => !avoidUniques.includes(u.id));
        const list = free.length ? free : AFFIX_UNIQUES;
        const u = list[Math.floor(rng() * list.length)];
        const v = scaleValue(u.id, u.v, fac);
        rules.push({ id: u.id, hook: u.hook, v, from: 'unique' });
        unique = { id: u.id, name: u.name, v, text: affixText(u, v) };
    }

    return {
        baseId: base.id, name: base.name, icon: base.icon, slot: base.slot, damaged: base.damaged || null,
        rarity: rarity.id, rarityName: rarity.name, rarityIcon: rarity.icon, color: rarity.color,
        floor: floor | 0, main, trait, affixes, unique, rules, stats,
        discardHeal: discardHeal(rarity.id), desc: base.desc || ''
    };
}

// El rasgo fijo de la base puede ser un número (habilidad) o una regla (gancho)
function _addEffect(stats, rules, key, v, type, from) {
    if (key === 'skill_dmg') { stats.skillDamage += v; return; }
    if (key === 'skill_cd') { stats.skillCooldown += v; return; }
    rules.push({ id: key, hook: null, v, type: type || null, from });
}

/** Equipo inicial: la espada básica (sin azar: no gasta números de la partida). */
export function createStarterItem() {
    return createRpgItem({ baseId: BASIC_WEAPON_ID, rarityId: 'comun', floor: 0 });
}

export function emptyEquipment() {
    return { weapon: null, secondary: null, armor: null, accessory: null };
}

// ---------- Equipar, descartar y leer las reglas ----------
export function equippedItems(hero) {
    const eq = (hero && hero.equipment) || {};
    return ITEM_SLOT_ORDER.map(s => eq[s]).filter(Boolean);
}

// Aplica la DIFERENCIA de estadísticas entre el objeto nuevo y el que sale (así el ATK nunca baja de 1 a medias)
function _applyStats(hero, gain, lose) {
    const d = k => (gain ? gain[k] : 0) - (lose ? lose[k] : 0);
    hero.atq = Math.max(1, hero.atq + d('atq'));
    if (d('maxHp')) {
        hero.maxHp = Math.max(1, hero.maxHp + d('maxHp'));
        hero.hp = Math.min(hero.maxHp, Math.max(1, hero.hp + Math.max(0, d('maxHp'))));
    }
    hero.guard = Math.max(0, (hero.guard || 0) + d('guard'));
    if (d('skillDamage') || d('skillCooldown')) {
        hero.skillMods = hero.skillMods || {};
        const m = hero.skillMods.fire_strike = hero.skillMods.fire_strike || {};
        m.damage = (m.damage || 0) + d('skillDamage');
        m.cooldown = (m.cooldown || 0) + d('skillCooldown');
    }
}

/** Equipa `item` en su ranura y devuelve el objeto que había (o null). */
export function equipItem(hero, item) {
    hero.equipment = hero.equipment || emptyEquipment();
    const old = hero.equipment[item.slot] || null;
    _applyStats(hero, item.stats, old && old.stats);
    hero.equipment[item.slot] = item;
    return old;
}

/** Vida que da descartar `item`: la de su rareza y lo que sumen los accesorios «reciclador». */
export function discardHealFor(hero, item) {
    return (item ? item.discardHeal : 3) + ruleSum(hero, 'discard_heal');
}

export function discardItem(hero, item) {
    const heal = discardHealFor(hero, item);
    const before = hero.hp;
    hero.hp = Math.min(hero.maxHp, hero.hp + heal);
    return hero.hp - before;
}

// Reglas activas: suman lo que dé cada objeto equipado
export function ruleSum(hero, id, type = null) {
    let total = 0;
    for (const it of equippedItems(hero)) for (const r of it.rules || []) if (r.id === id && (!type || r.type === type)) total += r.v;
    return total;
}
export function ruleMax(hero, id) {
    let best = 0;
    for (const it of equippedItems(hero)) for (const r of it.rules || []) if (r.id === id) best = Math.max(best, r.v);
    return best;
}
export const hasRule = (hero, id) => equippedItems(hero).some(it => (it.rules || []).some(r => r.id === id));
export function equippedUniqueIds(hero) {
    return equippedItems(hero).map(it => it.unique && it.unique.id).filter(Boolean);
}

/** Cuánto suman las hogueras por el equipo (p. ej. +0,05 = 5 % más de cura). */
export function campfireBonus(hero) {
    return equippedItems(hero).reduce((t, it) => t + (it.stats.campfireHealPct || 0), 0);
}

// ---------- Botín ----------
/**
 * Las 3 ofertas de una fuente («chest», «campfire», «subboss»): ranuras distintas, con preferencia por las vacías.
 */
export function rollLootOffers({ rng, floor, source = 'chest', hero = null, count = LOOT_OFFERS }) {
    const min = (LOOT_SOURCES[source] || LOOT_SOURCES.chest).min;
    const avoidUniques = hero ? equippedUniqueIds(hero) : [];
    const eq = (hero && hero.equipment) || {};
    const slots = [];
    const left = ITEM_SLOT_ORDER.map(s => ({ s, w: eq[s] ? 1 : 3 }));
    const want = Math.min(count, left.length);
    while (slots.length < want) {
        const total = left.reduce((t, x) => t + x.w, 0);
        let roll = rng() * total, k = 0;
        for (; k < left.length - 1; k++) { roll -= left[k].w; if (roll < 0) break; }
        slots.push(left.splice(k, 1)[0].s);
    }
    return slots.map(slot => createRpgItem({ rng, floor, slot, minRarity: min, avoidUniques }));
}

// ---------- Textos y comparaciones ----------
const TRAIT_TEXT = {
    defend_heal: 'Al Defender, curas {v}',
    first_attack_double: 'Tu primer ataque de cada combate hace ×{v}',
    revenge: 'Al recibir daño, tu siguiente ataque hace +{v}',
    combat_start_heal: 'Curas {v} al empezar cada combate',
    victory_heal: 'Al vencer un combate, curas {v}',
    extra_strike: 'Golpeas una vez más en tu primer turno de cada combate',
    poison_on_hit: 'Envenenas al golpear ({v} por golpe, se acumula)',
    skill_dmg: 'Golpe de Fuego hace +{v} de daño',
    skill_cd: 'Golpe de Fuego se enfría 1 ronda antes',
    skill_burn: 'Golpe de Fuego quema al enemigo {v} rondas',
    damage_type_bonus: 'Tus ataques de {type} hacen +{v} de daño',
    discard_heal: 'Al descartar un objeto, curas {v} más',
    flee_safe: 'Al huir de un combate, no recibes daño',
    thorns: 'Devuelves {v} de daño a quien te golpea mientras defiendes',
    burn_on_hit: 'Quemas al enemigo al golpear ({v} por ronda, 2 rondas)',
    reader_shield: 'El Lector no castiga que repitas tu acción',
    first_turn_focus: 'En tu primer turno, Golpe de Fuego hace +{v}'
};

export function traitText(trait) {
    if (!trait) return '';
    const tpl = TRAIT_TEXT[trait.k];
    if (!tpl) return trait.desc || trait.k;
    const type = DAMAGE_TYPES[trait.type] ? DAMAGE_TYPES[trait.type].name.toLowerCase() : (trait.type || '');
    return tpl.replace('{v}', trait.v).replace('{type}', type);
}

const MAIN_LABEL = { atq: 'ATK', hp: 'HP máx', guard: 'Defender: −' };

/** Líneas legibles: estadística principal, rasgo, afijos y rasgo único. */
export function describeItem(item) {
    if (!item) return [];
    const lines = [];
    for (const [k, v] of Object.entries(item.main || {})) lines.push(k === 'guard' ? `Defender reduce ${v} más` : `+${v} ${MAIN_LABEL[k] || k}`);
    if (item.trait) lines.push(traitText(item.trait));
    for (const a of item.affixes || []) lines.push(a.text);
    if (item.unique) lines.push(`★ ${item.unique.name}: ${item.unique.text}`);
    return lines;
}

/** Cuánto cambiarían las estadísticas del héroe si equipara `item` (frente a lo que lleva en esa ranura). */
export function itemDelta(hero, item) {
    const cur = ((hero.equipment || {})[item.slot] || {}).stats || emptyStats();
    const d = {};
    for (const k of ['atq', 'maxHp', 'guard']) d[k] = item.stats[k] - cur[k];
    return d;
}

/** Puntuación aproximada para que los bots y el banco de equilibrio comparen objetos. */
export function itemScore(item) {
    if (!item) return 0;
    const s = item.stats;
    let score = 3 * s.atq + 0.6 * s.maxHp + 2 * s.guard + 2 * s.skillDamage + 2 * s.skillCooldown * -1;
    for (const r of item.rules || []) score += r.from === 'unique' ? 7 : 3;
    return score;
}

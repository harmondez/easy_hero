// =============================================
// 🏭 Fabricación de objetos — lógica pura (sin DOM, sin motor del juego)
//
// Convierte una base + una rareza + el azar en un OBJETO REAL listo para revisar y, más adelante, equipar:
//
//   1. Se elige la base (de una ranura concreta o de todo el catálogo).
//   2. Se sortea la rareza (respetando un mínimo si la fuente lo pide: hoguera 🟢, sub-jefe 🔵).
//   3. La rareza decide cuántos afijos se sortean del pool, sin repetirse.
//   4. Las legendarias añaden UN rasgo único al final.
//   5. TODO se escala con el piso: valor = base × (1 + 0,08 × piso) × rareza.power
//
// El resultado (`item`) es un objeto plano y serializable: puede guardarse tal cual.
// =============================================
import { RARITY_BY_ID, rollRarity, discardHeal } from './rarities.js';
import { ITEM_BASES, ITEM_BASE_BY_ID, basesBySlot, basicItem } from './items.js';
import { AFFIX_POOL, AFFIX_UNIQUES, affixText } from './affixes.js';

// Escalado cerrado en planning.md: +8 % de poder por piso
export const ITEM_FLOOR_SCALE = 0.08;

/** Multiplicador de poder total de un objeto: rareza × piso. */
export function itemPower(rarityId, floor) {
    const r = RARITY_BY_ID[rarityId];
    if (!r) return 1;
    return r.power * (1 + ITEM_FLOOR_SCALE * Math.max(0, floor | 0));
}

/** Escala un valor numérico de piso 0 a su valor en el objeto (redondea los enteros). */
export function scaleValue(v, factor) {
    return Math.round(v * factor * 100) / 100;
}

function _draw(rng, list, n) {
    const pool = list.map((x, i) => i);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, n).map(i => list[i]);
}

function _affixSlot(aff) { return aff.slots || null; }

/**
 * Fabrica un objeto.
 * @param {object} opts  { rng, floor, slot?, baseId?, minRarity?, rarityId?, withUnique? }
 *                        `rarityId` fuerza una rareza (pruebas); `minRarity` fija el mínimo (fuentes).
 * @returns {object|null} el objeto fabricado (null solo si `baseId` no existe).
 */
export function createRpgItem({ rng = Math.random, floor = 0, slot = null, baseId = null,
    minRarity = null, rarityId = null, withUnique = true } = {}) {
    // 1. Base
    let base = baseId ? ITEM_BASE_BY_ID[baseId] : null;
    if (!base && slot) {
        const pool = basesBySlot(slot);
        base = pool[Math.floor(rng() * pool.length)];
    }
    if (!base) {
        const pool = slot ? basesBySlot(slot) : ITEM_BASES;
        base = pool[Math.floor(rng() * pool.length)];
    }
    if (!base) return null;

    // 2. Rareza
    const rarity = rarityId ? RARITY_BY_ID[rarityId] : rollRarity(rng, { min: minRarity });
    if (!rarity) return null;
    const fac = itemPower(rarity.id, floor);

    // 3. Afijos (sin repetir y respetando la ranura de cada afijo si la tiene)
    const pool = AFFIX_POOL.filter(a => !a.slots || a.slots.includes(base.slot));
    const picked = _draw(rng, pool, rarity.affixes);
    const affixes = picked.map(a => {
        const v = scaleValue(a.v, fac);
        return { id: a.id, kind: a.kind, stat: a.stat || null, hook: a.hook || null, v, text: affixText(a, v) };
    });

    // 4. Rasgo único (solo legendarias)
    let unique = null;
    if (rarity.unique && withUnique && AFFIX_UNIQUES.length) {
        const u = AFFIX_UNIQUES[Math.floor(rng() * AFFIX_UNIQUES.length)];
        const v = scaleValue(u.v, fac);
        unique = { id: u.id, kind: u.kind, hook: u.hook || null, v, text: affixText(u, v) };
    }

    // 5. Ensamblar
    const main = {};
    for (const [k, v] of Object.entries(base.main || {})) main[k] = scaleValue(v, fac);

    return {
        baseId: base.id,
        name: base.name, icon: base.icon, slot: base.slot,
        damaged: base.damaged || null,
        rarity: rarity.id, rarityName: rarity.name, color: rarity.color,
        floor: floor | 0,
        main,                                  // { atq?, hp?, guard? } ya escalados
        trait: base.trait ? { ...base.trait, v: scaleValue(base.trait.v ?? 0, fac) } : null,
        affixes, unique,
        power: fac,
        discardHeal: discardHeal(rarity.id),
        desc: base.desc
    };
}

/** Objeto de comparación: el mismo objeto en su forma base (piso 0, común, sin afijos). */
export function compareWith(baseId) {
    return basicItem(baseId);
}

// Las bases anotan sólo la clave del rasgo; aquí vive el texto visible de cada uno.
const TRAIT_TEXT = {
    defend_heal: 'Al Defender, curas {v}',
    first_attack_double: 'Tu primer ataque de cada combate hace ×{v}',
    revenge: 'Al recibir daño, tu siguiente ataque hace +{v}',
    combat_start_heal: 'Curas {v} al empezar cada combate',
    victory_heal: 'Al vencer un combate, curas {v}',
    extra_strike: 'Golpeas una vez más en tu primer turno de cada combate',
    poison_on_hit: 'Envenenas al golpear ({v} por ronda, se acumula)',
    skill_dmg: 'Golpe de Fuego hace +{v} de daño',
    skill_cd: 'Golpe de Fuego se enfría 1 ronda antes',
    skill_burn: 'Golpe de Fuego quema al enemigo {v} rondas',
    damage_type_bonus: 'Tus ataques de {type} hacen +{v} de daño',
    discard_heal: 'Al descartar un objeto, curas {v} más',
    flee_safe: 'Al huir de un combate, no recibes daño',
    thorns: 'Devuelves {v} de daño a quien te golpea mientras defiendes',
    burn_on_hit: 'Quemas al enemigo al golpear ({v} por ronda, se acumula)',
    reader_shield: 'El Lector no castiga que repitas tu acción',
    first_turn_focus: 'En tu primer turno, Golpe de Fuego hace +{v}'
};

/** Texto del rasgo fijo de una base (su clave + valores ya escalados). */
export function traitText(trait) {
    const tpl = TRAIT_TEXT[trait && trait.k];
    if (!tpl) return trait && (trait.desc || trait.k);
    return tpl
        .replace('{v}', trait.v)
        .replace('{type}', trait.type || '');
}

// ---------- Vistas útiles ----------

/** Líneas legibles de un objeto (para pantallas y pruebas). */
export function describeItem(item) {
    if (!item) return [];
    const lines = [`${item.icon} ${item.name}`];
    lines.push(item.damaged ? `Tipo de daño: ${item.damaged}` : `Ranura: ${item.slot}`);
    for (const [k, v] of Object.entries(item.main || {})) lines.push(`${k}: ${v}`);
    if (item.trait) lines.push(`Rasgo: ${traitText(item.trait)}`);
    for (const a of item.affixes) lines.push(`· ${a.text}`);
    if (item.unique) lines.push(`★ ${item.unique.text}`);
    return lines;
}

/** Resumen de poder de un objeto, para el banco de equilibrio. */
export function itemPoints(item) {
    const pts = { atq: 0, maxHp: 0, guard: 0, campfireHealPct: 0 };
    for (const [k, v] of Object.entries(item.main || {})) if (k in pts) pts[k] += v;
    for (const a of item.affixes || []) {
        if (a.kind === 'number' && a.stat && a.stat in pts) pts[a.stat] += a.v;
        if (a.id === 'campfire_heal') pts.campfireHealPct += a.v;
        if (a.id === 'atk') pts.atq += a.v;
        if (a.id === 'hp') pts.maxHp += a.v;
        if (a.id === 'guard') pts.guard += a.v;
    }
    pts.atq = Math.round(pts.atq);
    pts.maxHp = Math.round(pts.maxHp);
    pts.guard = Math.round(pts.guard);
    return pts;
}

/** Reglas activas de un objeto: rasgo fijo + afijos de regla + rasgo único. */
export function itemRules(item) {
    const rules = [];
    if (item.trait) rules.push({ id: item.trait.k, hook: ruleHookOf(item.trait.k), v: item.trait.v, from: 'trait' });
    for (const a of item.affixes || []) if (a.kind === 'rule') rules.push({ id: a.id, hook: a.hook, v: a.v, from: 'affix' });
    if (item.unique) rules.push({ id: item.unique.id, hook: item.unique.hook, v: item.unique.v, from: 'unique' });
    return rules;
}

/** Ganchos a los que pertenece cada rasgo fijo de base (el motor los consumirá en B1). */
const TRAIT_HOOKS = {
    extra_strike: 'onCombatStart', poison_on_hit: 'onAttack', skill_dmg: 'onSkill', skill_cd: 'onSkill', skill_burn: 'onSkill',
    defend_heal: 'onDefend', first_attack_double: 'onAttack', revenge: 'onDamaged',
    combat_start_heal: 'onCombatStart', victory_heal: 'onVictory',
    damage_type_bonus: 'onAttack', discard_heal: 'global', flee_safe: 'global',
    thorns: 'onDefend', burn_on_hit: 'onAttack', reader_shield: 'global', first_turn_focus: 'onCombatStart'
};
function ruleHookOf(id) { return TRAIT_HOOKS[id] || 'global'; }
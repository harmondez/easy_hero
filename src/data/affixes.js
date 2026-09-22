// =============================================
// 🎲 Afijos — el pool del que sale el botín (24)
//
// Tras elegir la base, la rareza sortea CUÁNTOS afijos se añaden (0-3 + 1 único si es legendaria).
// Hay dos clases:
//
//   kind: 'number'  → suma a una estadística. `stat` nombra la clave del motor; `v` es su valor en piso 0.
//   kind: 'rule'    → altera una REGLA mediante un gancho (`hook`) del motor. `v` es la intensidad (escala igual).
//
// Todos los valores numéricos (`v`) se escalan con el objeto: valor = v × (1 + 0,08 × piso) × rareza.power.
// `slots` (opcional) limita a qué ranuras puede caer el afijo para no fabricar combinaciones absurdas.
// `rarity: 'legendaria'` marca los RASGOS ÚNICOS: solo pueden salir en objetos legendarios y a lo sumo 1 por objeto.
// =============================================

// --- Números (6): suman a una estadística ---
export const AFFIX_NUMBERS = [
    { id: 'atk',           name: 'Filo firme',     icon: '⚔️', kind: 'number', stat: 'atq', v: 2,
      desc: '+{v} ATK' },
    { id: 'hp',            name: 'Vigor',          icon: '❤️', kind: 'number', stat: 'maxHp', v: 6,
      desc: '+{v} HP máx' },
    { id: 'skill_dmg',     name: 'Pirotécnica',    icon: '🔥', kind: 'number', stat: 'skillMods.fire_strike.damage', v: 3,
      desc: 'Golpe de Fuego hace +{v} de daño' },
    { id: 'skill_cd',      name: 'Recarga',        icon: '⏱️', kind: 'number', stat: 'skillMods.fire_strike.cooldown', v: -1,
      desc: 'Golpe de Fuego se enfría 1 ronda antes' },
    { id: 'guard',         name: 'Templado',       icon: '🛡️', kind: 'number', stat: 'guard', v: 1, slots: ['secondary'],
      desc: 'Defender reduce 1 punto más' },
    { id: 'campfire_heal', name: 'Calidez',        icon: '🔥', kind: 'number', stat: 'campfireHealPct', v: 0.05, slots: ['armor', 'accessory'],
      desc: 'Las hogueras curan un 5 % más' }
];

// --- Reglas (12): cambian cómo se juega mediante ganchos del motor ---
export const AFFIX_RULES = [
    { id: 'first_attack_double', name: 'Golpe furtivo',    icon: '🥇', kind: 'rule', hook: 'onAttack', v: 2,
      desc: 'Tu primer ataque de cada combate hace ×2' },
    { id: 'defend_heal',         name: 'Aliento sereno',   icon: '💚', kind: 'rule', hook: 'onDefend', v: 2,
      desc: 'Al Defender, curas {v}' },
    { id: 'thorns',              name: 'Piel de espinas',  icon: '🌹', kind: 'rule', hook: 'onDefend', v: 2,
      desc: 'Devuelves {v} de daño a quien te golpea mientras defiendes' },
    { id: 'combat_start_heal',   name: 'Segundo aliento',  icon: '✨', kind: 'rule', hook: 'onCombatStart', v: 3,
      desc: 'Curas {v} al empezar cada combate' },
    { id: 'revenge',             name: 'Renacer',          icon: '💢', kind: 'rule', hook: 'onDamaged', v: 2,
      desc: 'Al recibir daño, tu siguiente ataque hace +{v}' },
    { id: 'victory_heal',        name: 'Cosecha',          icon: '🌿', kind: 'rule', hook: 'onVictory', v: 3,
      desc: 'Al vencer un combate, curas {v}' },
    { id: 'burn_on_hit',         name: 'Brasas',           icon: '🔥', kind: 'rule', hook: 'onAttack', v: 2,
      desc: 'Al golpear, quemas ({v} por ronda, 2 rondas)' },
    { id: 'poison_on_hit',       name: 'Filo envenenado',  icon: '☠️', kind: 'rule', hook: 'onAttack', v: 1,
      desc: 'Al golpear, envenenas ({v} por golpe, se acumula)' },
    { id: 'execute',             name: 'Golpe de gracia',  icon: '💀', kind: 'rule', hook: 'onAttack', v: 2,
      desc: 'Tus golpes a objetivos con ≤ 20 % de vida hacen ×{v}' },
    { id: 'flee_safe',           name: 'Pasos ligeros',    icon: '🏃', kind: 'rule', hook: 'global', v: 1,
      desc: 'Al huir de un combate, no recibes daño' },
    { id: 'reader_shield',       name: 'Mente en blanco',  icon: '👁️', kind: 'rule', hook: 'global', v: 1,
      desc: 'El Lector no castiga que repitas tu acción' },
    { id: 'first_turn_focus',    name: 'Chispa inicial',   icon: '🔮', kind: 'rule', hook: 'onCombatStart', v: 4,
      desc: 'En tu primer turno, Golpe de Fuego hace +{v}' }
];

// --- Rasgos únicos de legendaria (6): solo en legendarias, 1 por objeto ---
export const AFFIX_UNIQUES = [
    { id: 'lifesteal',        name: 'Robavida',      icon: '🩸', rarity: 'legendaria', kind: 'rule', hook: 'onAttack', v: 0.5,
      desc: 'Curas la mitad del daño de cada golpe (mín. 1)' },
    { id: 'last_stand',       name: 'Última defensa', icon: '🛡️', rarity: 'legendaria', kind: 'rule', hook: 'onDamaged', v: 1,
      desc: 'Cuando un golpe te dejaría a 0, quedas en 1 (una vez por combate)' },
    { id: 'frenzy',           name: 'Frenesí',       icon: '🤯', rarity: 'legendaria', kind: 'rule', hook: 'onAttack', v: 1,
      desc: 'Cada ataque seguido hace +{v} más que el anterior (se reinicia si haces otra cosa)' },
    { id: 'pyre',             name: 'Pira',          icon: '🔥', rarity: 'legendaria', kind: 'rule', hook: 'onSkill', v: 3,
      desc: 'Golpe de Fuego hace +2 y quema {v} por ronda durante 3 rondas' },
    { id: 'determination',    name: 'Determinación', icon: '💞', rarity: 'legendaria', kind: 'rule', hook: 'onDamaged', v: 8,
      desc: 'Al bajar a la mitad de vida en un combate, curas {v} (una vez)' },
    { id: 'treasure_heal',    name: 'Corazón de ladrón', icon: '🧰', rarity: 'legendaria', kind: 'rule', hook: 'global', v: 10,
      desc: 'Al abrir un cofre, curas {v}' }
];

// --- Pool con el que se sortean los afijos normales del objeto ---
export const AFFIX_POOL = [...AFFIX_NUMBERS, ...AFFIX_RULES];
export const AFFIX_BY_ID = Object.fromEntries([...AFFIX_POOL, ...AFFIX_UNIQUES].map(a => [a.id, a]));

export const AFFIX_HOOKS = [...new Set([...AFFIX_RULES, ...AFFIX_UNIQUES].map(a => a.hook))];

/**
 * Texto visible de un afijo con su valor ya escalado (`v`). Si el afijo no escala números, devuelve `desc` tal cual.
 * Ejemplo: `+2 ATK` (v=2) · `Curas 5 al empezar cada combate` (v=3 escalado a 5).
 */
export function affixText(affix, scaledV = affix.v) {
    const v = typeof scaledV === 'number' ? Math.round(scaledV * 100) / 100 : scaledV;
    if (typeof affix.desc === 'string' && affix.desc.includes('{v}')) {
        return affix.desc.replace('{v}', typeof v === 'number' && Number.isInteger(v) ? v : String(v));
    }
    return affix.desc;
}

// --- Requisitos invariantes (los vigila tools/print-items.mjs) ---
export const AFFIX_COUNTS = {
    numbers: AFFIX_NUMBERS.length,
    rules: AFFIX_RULES.length,
    uniques: AFFIX_UNIQUES.length,
    total: AFFIX_POOL.length
};
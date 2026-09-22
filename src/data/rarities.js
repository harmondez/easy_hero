// =============================================
// 💎 Rarezas — la UNICA tabla para todo el botín (equipo y, más adelante, mejoras)
//
// La rareza decide, de un vistazo, lo que vale un objeto:
//   - afijos: cuántos efectos extra se sortean del pool (src/affixes.js)
//   - power:   multiplicador del escalado por piso (valor = base × (1 + 0,08 × piso) × power)
//   - weight:  probabilidad base de que un objeto salga con esta rareza
//
// Una sola tabla para todo: el borde del objeto se pinta con `color` y el jugador lee la rareza sin pensar.
// =============================================
export const RARITIES = [
    { id: 'comun',       name: 'Común',        icon: '⚪', color: '#e2e8f0', affixes: 0, power: 1.00, weight: 50 },
    { id: 'poco_comun',  name: 'Poco común',   icon: '🟢', color: '#22c55e', affixes: 1, power: 1.15, weight: 28 },
    { id: 'rara',        name: 'Rara',         icon: '🔵', color: '#3b82f6', affixes: 2, power: 1.30, weight: 14 },
    { id: 'epica',       name: 'Épica',        icon: '🟣', color: '#a855f7', affixes: 3, power: 1.50, weight: 6 },
    { id: 'legendaria',  name: 'Legendaria',   icon: '🟠', color: '#f97316', affixes: 3, unique: true, power: 1.70, weight: 2 }
];

export const RARITY_BY_ID = Object.fromEntries(RARITIES.map(r => [r.id, r]));

export const RARITY_MIN = { hoguera: 'poco_comun', subboss: 'rara' };

/** Probabilidad de cada rareza, en tanto por uno (suma 1). */
export const RARITY_WEIGHTS = RARITIES.map(r => r.weight);

/**
 * Sorteo de una rareza con el generador del juego (`rng() → [0,1)`).
 * Un objeto solo puede pedir una rareza de partida o un mínimo (p. ej. la hoguera nunca da comunes).
 */
export function rollRarity(rng = Math.random, { min = null } = {}) {
    const start = min ? RARITIES.findIndex(r => r.id === min) : 0;
    const pool = RARITIES.slice(start);
    const total = pool.reduce((s, r) => s + r.weight, 0);
    let roll = rng() * total;
    for (const r of pool) { roll -= r.weight; if (roll <= 0) return r; }
    return pool[pool.length - 1];
}

/** Curación al DESCARTAR un objeto equipado (regla cerrada: «cura 3 HP, algo más con mayor rareza»). */
export const DISCARD_HEAL = { base: 3, perRarity: 1 };
export function discardHeal(rarityId) {
    const r = RARITY_BY_ID[rarityId];
    if (!r) return DISCARD_HEAL.base;
    return DISCARD_HEAL.base + DISCARD_HEAL.perRarity * (RARITIES.indexOf(r));
}
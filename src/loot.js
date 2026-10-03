import { MATERIALS, DROPS } from './data/loot.js?v=1.11.0';

// =============================================
// 🎒 Botín (motor puro): sortea lo que suelta un enemigo. El azar llega por parámetro.
// =============================================
export { MATERIALS, DROPS };

/**
 * Sortea la tabla `tableId` de DROPS. Devuelve null (no suelta nada) o
 * { kind: 'potion' | 'manaPotion' | 'material', id?, name, img, rarity }.
 * Con `always` suelta siempre algo de la tabla (los encuentros raros), sin tirar la probabilidad.
 */
export function rollDrop(tableId, rng = Math.random, { always = false } = {}) {
    const T = DROPS[tableId];
    if (!T || !T.table.length) return null;
    if (!always && rng() >= T.chance) return null;
    const total = T.table.reduce((s, e) => s + e.w, 0);
    let r = rng() * total;
    const e = T.table.find(x => (r -= x.w) < 0) || T.table[T.table.length - 1];
    if (e.potion) return { kind: 'potion', name: 'Poción de vida', img: 'pocion-vida', rarity: 'comun' };
    if (e.manaPotion) return { kind: 'manaPotion', name: 'Poción de maná menor', img: 'pocion-mana', rarity: 'comun' };
    const m = MATERIALS[e.material];
    return m ? { kind: 'material', id: e.material, name: m.name, img: m.img, rarity: m.rarity } : null;
}

/** La probabilidad real de cada entrada de una tabla (para pruebas y para enseñarla): [{ entry, p }], suma = chance. */
export function dropOdds(tableId) {
    const T = DROPS[tableId];
    if (!T) return [];
    const total = T.table.reduce((s, e) => s + e.w, 0);
    return T.table.map(entry => ({ entry, p: T.chance * entry.w / total }));
}

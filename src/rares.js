import { RARES } from './data/rares.js?v=1.10.0';

// =============================================
// ✨ Encuentros raros (motor puro): sortea si sale el raro y lo monta sobre el enemigo normal
// =============================================
export { RARES };

/** ¿Sale el encuentro raro `id`? (false si no existe). El azar llega por parámetro. */
export function rollRare(id, rng = Math.random) {
    const R = RARES[id];
    return !!R && rng() < R.chance;
}

/** Convierte al monstruo `m` (ya creado) en su versión rara: nombre, dibujo y fuerza. Devuelve el mismo `m`. */
export function applyRare(m, id) {
    const R = RARES[id];
    if (!R || !m) return m;
    m.name = m.baseName = R.name;
    if (R.icon) m.icon = R.icon;
    m.maxHp = m.hp = Math.max(1, Math.round(m.maxHp * (R.hpMul || 1)));
    m.atq = Math.max(1, Math.round(m.atq * (R.atkMul || 1)));
    if (R.scaleMul) m.scale = (m.scale || 1) * R.scaleMul;
    m.tag = R.tag || m.tag;
    m.rare = id;
    return m;
}

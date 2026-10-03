// =============================================
// 📊 RPG-pack — estadísticas primarias (puro, sin DOM)
//
// STR / DEX / INT / VIT no sustituyen a ATK/HP por dentro: los GENERAN. Así el resto del motor (combate,
// objetos, monstruos, banco de equilibrio) sigue funcionando sin tocarlo. Todas las fórmulas dan EXACTAMENTE
// 0 de bonus en la base (5/5/5/5, sin inversión): un héroe recién creado se comporta igual que antes de que
// existiera este sistema. Solo cambia algo cuando el jugador invierte puntos de nivel (permanentes, en meta.js).
//
// Física (Filo/Contundente/Perforante) la potencia STR; elemental (Veneno/Fuego/Rayo) la potencia INT — así el
// arma que empuñas decide qué estadística importa, y conecta con la afinidad de clase (P7: guerrero/pícaro/
// elementalista).
// =============================================
export const PRIMARY_BASE = { str: 5, dex: 5, int: 5, vit: 5 };
export const PRIMARY_KEYS = ['str', 'dex', 'int', 'vit'];
export const PRIMARY_INFO = {
    str: { icon: '💪', name: 'Fuerza', short: 'STR', desc: 'Cada 2 puntos, +1 de ATK: tu golpe pega más.' },
    dex: { icon: '🏹', name: 'Destreza', short: 'DEX', desc: 'Cada punto, +3 % de golpe crítico (daño doble) y +1,5 % de esquivar.' },
    int: { icon: '🧠', name: 'Inteligencia', short: 'INT', desc: 'Cada punto, +1 de PH (tus habilidades pegan más) y +2 de maná.' },
    vit: { icon: '❤️', name: 'Vitalidad', short: 'VIT', desc: 'Cada punto, +4 de vida máxima y algo menos de daño recibido.' }
};

const PHYSICAL_TYPES = new Set(['filo', 'contundente', 'perforante']);
const ELEMENTAL_TYPES = new Set(['veneno', 'fuego', 'rayo']);
export function isPhysicalDamage(typeId) { return PHYSICAL_TYPES.has(typeId); }
export function isElementalDamage(typeId) { return ELEMENTAL_TYPES.has(typeId); }

// --- Nivel del personaje (permanente: vive en meta.js, no en la partida) ---
export const XP_REWARD = { monster: 5, subboss: 15, boss: 50 };
export const POINTS_PER_LEVEL = 2;
// Cuántos puntos hacen falta para +1 de ATK (Fuerza) y +1 de PH (Inteligencia): con 2 puntos por nivel, un nivel
// entero a Fuerza es +1 de ATK en cada golpe; el PH sube el doble de rápido, pero lo limita el maná.
// Antes eran 10 puntos para cada uno y subir de nivel no se notaba
export const STR_PER_ATK = 2;
export const INT_PER_PH = 1;
/** XP que hace falta para pasar del nivel `level` al siguiente. Curva de relleno: se recalibra cuando haga falta. */
export function xpToNext(level) { return 40 + Math.max(1, level) * 20; }

/**
 * Estadísticas que genera un juego de primarias, según el tipo de daño del arma equipada (o ninguna).
 * Todo da 0/0/0/0/0 en la base (5/5/5/5): sin inversión, el héroe es idéntico al de antes de este sistema.
 */
export function derivePrimary(primary, weaponDamageType) {
    const p = { ...PRIMARY_BASE, ...primary };
    const isPhys = isPhysicalDamage(weaponDamageType);
    const isElem = isElementalDamage(weaponDamageType);
    return {
        maxHpBonus: (p.vit - PRIMARY_BASE.vit) * 4,
        atqBonus: isPhys ? Math.max(0, Math.floor((p.str - PRIMARY_BASE.str) / STR_PER_ATK)) : 0,
        phBonus: Math.max(0, Math.floor((p.int - PRIMARY_BASE.int) / INT_PER_PH)),   // el PH: lo que pegan las habilidades
        maxMpBonus: Math.max(0, (p.int - PRIMARY_BASE.int) * 2),                      // y más maná para lanzarlas
        elemDmgBonus: isElem ? Math.floor((p.int - PRIMARY_BASE.int) / 10) : 0,
        critChance: Math.max(0, (p.dex - PRIMARY_BASE.dex) * 0.03),   // +3 %/DEX por encima de la base
        critMult: 2,
        dodgeChance: Math.min(0.5, Math.max(0, (p.dex - PRIMARY_BASE.dex) * 0.015)),  // +1,5 %/DEX (tope: la mitad de los golpes)
        physResist: Math.max(0, (p.vit - PRIMARY_BASE.vit) * 0.004),   // +0,4 %/VIT, reduce el daño recibido
        elemResist: Math.max(0, (p.int - PRIMARY_BASE.int) * 0.004)    // +0,4 %/INT (a la espera de monstruos con tipo de daño)
    };
}

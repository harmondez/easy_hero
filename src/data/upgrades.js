// =============================================
// ⚒️ La Forja — mejoras permanentes que se compran con oro (solo datos)
//
// Es el sumidero del oro y el motor del bucle: mueres, vuelves con las manos llenas, compras algo
// y el muro retrocede un poco. Las mejoras NO se pierden nunca, ni al morir ni al empezar otra ruta.
//
// Dos clases de mejora, a propósito:
//   · de nivel infinito (`growth`): el coste crece en progresión geométrica, así que siempre hay
//     algo barato a mano y algo caro por lo que ahorrar. Ese vaivén es lo que engancha.
//   · de compra única (`max: 1`): hitos que se recuerdan («ahora empiezo con arma»).
//
// El efecto no se aplica aquí (esto son datos puros): cada sistema pregunta por el suyo con
// `upgradeEffect()` de meta.js. `effect` dice qué cambia y `perLevel` cuánto por nivel comprado.
// =============================================

export const UPGRADES = [
    {
        id: 'filo', icon: '💪', name: 'Filo afilado',
        desc: 'Empiezas cada ruta con más fuerza de ataque.',
        effect: 'atk', perLevel: 1, unit: 'ATK',
        cost: 40, growth: 1.6
    },
    {
        id: 'constitucion', icon: '❤️', name: 'Constitución',
        desc: 'Empiezas cada ruta con más vida máxima.',
        effect: 'maxHp', perLevel: 4, unit: 'HP',
        cost: 30, growth: 1.5
    },
    {
        id: 'buen_ojo', icon: '🪙', name: 'Buen ojo',
        desc: 'Encuentras más oro en todo lo que vences.',
        effect: 'gold', perLevel: 0.1, unit: 'oro', percent: true,
        cost: 60, growth: 1.7
    },
    {
        id: 'estudio', icon: '✨', name: 'Estudio',
        desc: 'Aprendes más de cada combate.',
        effect: 'xp', perLevel: 0.1, unit: 'XP', percent: true,
        cost: 50, growth: 1.7
    },
    {
        id: 'herencia', icon: '🗡️', name: 'Herencia',
        desc: 'Empiezas con un arma poco común en vez de la espada básica.',
        effect: 'startWeapon', perLevel: 1,
        cost: 200, max: 1
    },
    {
        id: 'linterna', icon: '🕯️', name: 'Ojo de linterna',
        desc: 'La niebla de guerra se aleja un piso: ves más lejos en el mapa.',
        effect: 'fogRange', perLevel: 1,
        cost: 150, max: 1
    },
    {
        id: 'zurron', icon: '🎒', name: 'Zurrón ancho',
        desc: 'Cinco ranuras más de inventario (de 10 a 15).',
        effect: 'invSlots', perLevel: 5,
        cost: 250, max: 1
    },
    {
        id: 'suerte', icon: '🧰', name: 'Suerte del novato',
        desc: 'El primer cofre de cada ruta ofrece objetos raros o mejores.',
        effect: 'firstChestRare', perLevel: 1,
        cost: 400, max: 1
    }
];

export const UPGRADES_BY_ID = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

/** Cuántas veces se puede comprar (Infinity en las de nivel). */
export const upgradeMax = def => (def.max == null ? Infinity : def.max);

/** Lo que cuesta el SIGUIENTE nivel de una mejora que ya está al nivel `level` (0 = sin comprar). */
export function upgradeCost(def, level = 0) {
    if (!def) return Infinity;
    const lv = Math.max(0, level | 0);
    if (lv >= upgradeMax(def)) return Infinity;
    return Math.round(def.cost * Math.pow(def.growth || 1, lv));
}

/** Texto de lo que da ahora mismo («+3 ATK», «+20 % oro»), para la pantalla de La Forja. */
export function upgradeAmountText(def, level) {
    if (!def || !level) return '';
    if (def.percent) return `+${Math.round(def.perLevel * level * 100)} %${def.unit ? ` ${def.unit}` : ''}`;
    // Las de compra única no llevan unidad: el propio botón ya dice «COMPRADA», no hace falta repetirlo
    return def.unit ? `+${def.perLevel * level} ${def.unit}` : '';
}

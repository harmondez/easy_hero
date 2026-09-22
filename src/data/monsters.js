// =============================================
// 👾 Monstruos — quién es cada uno y CÓMO ataca (solo datos)
//
// Cada monstruo tiene un patrón de movimientos que se repite en ciclo. El jugador ve el siguiente movimiento
// ANTES de elegir su acción (intención visible), y ese movimiento es exactamente el que se ejecuta.
//
//   { k: 'attack', m: 1.5 }   golpea con m × su ATK
//   { k: 'charge' }           reúne fuerzas (no daña; suele preceder a un golpe fuerte)
//   { k: 'guard' }            se protege: el daño que reciba esta ronda se reduce a la mitad
//   { k: 'heal', p: 0.12 }    se cura un p de su vida máxima
//   { k: 'rest' }             descansa (no hace nada)
// =============================================
export const atk = m => ({ k: 'attack', m });
export const heal = p => ({ k: 'heal', p });
export const CHARGE = { k: 'charge' };
export const GUARD = { k: 'guard' };
export const REST = { k: 'rest' };

// Un monstruo distinto por piso (0-14). Los tres primeros son el «grupo fácil».
export const MONSTER_ROSTER = [
    { name: 'Slime',            icon: '🟢', pattern: [atk(0.7), REST] },
    { name: 'Rata Gigante',     icon: '🐀', pattern: [atk(0.7), atk(0.7), atk(1.3)] },
    { name: 'Goblin',           icon: '👺', pattern: [CHARGE, atk(2)] },
    { name: 'Murciélago',       icon: '🦇', pattern: [atk(0.8), atk(0.8), heal(0.12)] },
    { name: 'Lobo',             icon: '🐺', pattern: [atk(1), atk(1), atk(1.5)] },
    { name: 'Esqueleto',        icon: '🦴', pattern: [GUARD, atk(1.6), atk(1.4)] },
    { name: 'Araña Venenosa',   icon: '🕷️', pattern: [atk(0.8), atk(1.2)] },
    { name: 'Orco',             icon: '👾', pattern: [CHARGE, atk(2.5)] },
    { name: 'Gólem',            icon: '🗿', pattern: [GUARD, atk(2.2), REST] },
    { name: 'Cazador Sombrío',  icon: '🏹', pattern: [atk(1), atk(1), CHARGE, atk(2.5)] },
    { name: 'Necrófago',        icon: '🧟', pattern: [atk(1.2), heal(0.15), atk(1.2)] },
    { name: 'Serpiente Gigante', icon: '🐍', pattern: [atk(0.8), atk(1.6), GUARD] },
    { name: 'Espectro',         icon: '👻', pattern: [CHARGE, atk(3), REST] },
    { name: 'Jabalí Colosal',   icon: '🐗', pattern: [atk(1.5), atk(1.5), CHARGE, atk(3)] },
    { name: 'Elemental de Lava', icon: '🌋', pattern: [GUARD, atk(2.5), atk(1.5)] }
];

export const SUBBOSS_ROSTER = [
    { name: 'Minotauro',         icon: '🐂', pattern: [CHARGE, atk(2.2), atk(1.2)] },
    { name: 'Bruja del Pantano', icon: '🧙', pattern: [atk(1), heal(0.1), atk(1.5), GUARD] },
    { name: 'Caballero Caído',   icon: '⚔️', pattern: [GUARD, atk(1.6), atk(1.6)] }
];

export const BOSS_DEF = {
    name: 'Dragón Ancestral', icon: '🐉',
    pattern: [atk(1), atk(1), CHARGE, atk(2.5), GUARD, atk(1.5)]
};

/** Definición de monstruo para un tipo de nodo y un piso. */
export function pickMonsterDef(type, floor) {
    const f = Math.max(0, floor | 0);
    if (type === 'boss') return BOSS_DEF;
    if (type === 'subboss') return SUBBOSS_ROSTER[f % SUBBOSS_ROSTER.length];
    return MONSTER_ROSTER[Math.min(f, MONSTER_ROSTER.length - 1)];
}

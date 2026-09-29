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

// --- Arquetipos de comportamiento -------------------------------------------------
// Los 15 patrones originales, con nombre. Cada monstruo apunta a uno en vez de repetir el
// literal: así se pueden escribir cientos de criaturas sin inventar cientos de patrones.
// Nunca se modifican en sitio (las variantes devuelven un patrón nuevo), así que compartirlos es seguro.
export const PATTERNS = {
    lento:        [atk(0.7), REST],
    hostigador:   [atk(0.7), atk(0.7), atk(1.3)],
    cargadorLeve: [CHARGE, atk(2)],
    sanador:      [atk(0.8), atk(0.8), heal(0.12)],
    agresivo:     [atk(1), atk(1), atk(1.5)],
    defensor:     [GUARD, atk(1.6), atk(1.4)],
    rapido:       [atk(0.8), atk(1.2)],
    cargador:     [CHARGE, atk(2.5)],
    tanque:       [GUARD, atk(2.2), REST],
    acosador:     [atk(1), atk(1), CHARGE, atk(2.5)],
    carronero:    [atk(1.2), heal(0.15), atk(1.2)],
    astuto:       [atk(0.8), atk(1.6), GUARD],
    brutal:       [CHARGE, atk(3), REST],
    embestida:    [atk(1.5), atk(1.5), CHARGE, atk(3)],
    implacable:   [GUARD, atk(2.5), atk(1.5)]
};
const M = (name, icon, arch) => ({ name, icon, pattern: PATTERNS[arch] });

// Un monstruo distinto por piso (0-14). Los tres primeros son el «grupo fácil».
// Este es el elenco del TRAMO 0: no cambia nunca, es la mazmorra que todo el mundo conoce.
export const MONSTER_ROSTER = [
    M('Slime',            '🟢', 'lento'),
    M('Rata Gigante',     '🐀', 'hostigador'),
    M('Goblin',           '👺', 'cargadorLeve'),
    M('Murciélago',       '🦇', 'sanador'),
    M('Lobo',             '🐺', 'agresivo'),
    M('Esqueleto',        '🦴', 'defensor'),
    M('Araña Venenosa',   '🕷️', 'rapido'),
    M('Orco',             '👾', 'cargador'),
    M('Gólem',            '🗿', 'tanque'),
    M('Cazador Sombrío',  '🏹', 'acosador'),
    M('Necrófago',        '🧟', 'carronero'),
    M('Serpiente Gigante', '🐍', 'astuto'),
    M('Espectro',         '👻', 'brutal'),
    M('Jabalí Colosal',   '🐗', 'embestida'),
    M('Elemental de Lava', '🌋', 'implacable')
];

// --- Elencos de profundidad ---------------------------------------------------------
// Cada tramo nuevo estrena 15 criaturas que no se han visto nunca. A partir del último
// tramo escrito se reciclan, pero para entonces casi todos los monstruos llevan variante
// (data/variants.js), así que un «Devorador Colérico de la Plaga» nunca es el de la vez anterior.
export const DEEP_ROSTERS = [
    // Tramo 1 · La Cripta
    [
        M('Escarabajo Sepulcral', '🪲', 'lento'),
        M('Rata Pestilente',      '🐁', 'hostigador'),
        M('Trasgo Carroñero',     '🧌', 'cargadorLeve'),
        M('Chupasangre',          '🦟', 'sanador'),
        M('Perro de Tumba',       '🐕', 'agresivo'),
        M('Osario Andante',       '☠️', 'defensor'),
        M('Escolopendra',         '🐛', 'rapido'),
        M('Bruto Encadenado',     '⛓️', 'cargador'),
        M('Estatua Rota',         '🪨', 'tanque'),
        M('Ballestero Muerto',    '🏴', 'acosador'),
        M('Devorador de Sudarios', '🪦', 'carronero'),
        M('Cobra de Cripta',      '🦎', 'astuto'),
        M('Lamento',              '😶‍🌫️', 'brutal'),
        M('Toro Sepulcral',       '🐃', 'embestida'),
        M('Brasa Viviente',       '🕯️', 'implacable')
    ],
    // Tramo 2 · El Abismo
    [
        M('Larva Abisal',         '🪱', 'lento'),
        M('Enjambre Ciego',       '🦗', 'hostigador'),
        M('Acechante',            '🫥', 'cargadorLeve'),
        M('Medusa Pálida',        '🪼', 'sanador'),
        M('Sabueso del Vacío',    '🐩', 'agresivo'),
        M('Coraza Hueca',         '🛡', 'defensor'),
        M('Alacrán Negro',        '🦂', 'rapido'),
        M('Rompehuesos',          '🦏', 'cargador'),
        M('Monolito',             '🗼', 'tanque'),
        M('Cazador de Ecos',      '🎯', 'acosador'),
        M('Glotón',               '🦛', 'carronero'),
        M('Sierpe Abisal',        '🐊', 'astuto'),
        M('Aullido',              '🌪️', 'brutal'),
        M('Bestia de Carga',      '🦬', 'embestida'),
        M('Fragua Errante',       '⚒️', 'implacable')
    ],
    // Tramo 3 · La Hondonada
    [
        M('Moho Reptante',        '🍄', 'lento'),
        M('Prole de Quitina',     '🦀', 'hostigador'),
        M('Duende Retorcido',     '🃏', 'cargadorLeve'),
        M('Pólipo',               '🪸', 'sanador'),
        M('Pantera de Obsidiana', '🐆', 'agresivo'),
        M('Guardián Sellado',     '🔒', 'defensor'),
        M('Avispa Cadavérica',    '🐝', 'rapido'),
        M('Machacador',           '🔨', 'cargador'),
        M('Coloso de Sal',        '🧂', 'tanque'),
        M('Sombra Larga',         '🌑', 'acosador'),
        M('Banquete',             '🍖', 'carronero'),
        M('Anguila de Pozo',      '🐟', 'astuto'),
        M('Tormenta Encerrada',   '⛈️', 'brutal'),
        M('Mamut Fósil',          '🦣', 'embestida'),
        M('Corazón de Horno',     '🫀', 'implacable')
    ],
    // Tramo 4 · Las Raíces
    [
        M('Raíz Palpitante',      '🌿', 'lento'),
        M('Camada Hambrienta',    '🐖', 'hostigador'),
        M('Tejedor Ciego',        '🕸️', 'cargadorLeve'),
        M('Flor Sanguina',        '🌺', 'sanador'),
        M('Lince de Ceniza',      '🐅', 'agresivo'),
        M('Muro Viviente',        '🧱', 'defensor'),
        M('Mosca Cadáver',        '🪰', 'rapido'),
        M('Simio de Guerra',      '🦍', 'cargador'),
        M('Yunque Animado',       '⚙️', 'tanque'),
        M('Ojo Errante',          '👁', 'acosador'),
        M('Buitre Osario',        '🦅', 'carronero'),
        M('Basilisco Menor',      '🦖', 'astuto'),
        M('Grito de Piedra',      '🗯️', 'brutal'),
        M('Rinoceronte Óseo',     '🐏', 'embestida'),
        M('Crisol',               '🔆', 'implacable')
    ],
    // Tramo 5 · El Silencio
    [
        M('Cosa Sin Nombre',      '🫧', 'lento'),
        M('Coro de Dientes',      '🦷', 'hostigador'),
        M('Heraldo de Ceniza',    '🜂', 'cargadorLeve'),
        M('Cáliz Roto',           '🏺', 'sanador'),
        M('Lebrel del Fin',       '🐕‍🦺', 'agresivo'),
        M('Portón Final',         '🚪', 'defensor'),
        M('Aguijón Pálido',       '🪡', 'rapido'),
        M('Titán Hueco',          '🗽', 'cargador'),
        M('Losa Eterna',          '🪧', 'tanque'),
        M('El Que Observa',       '🔭', 'acosador'),
        M('Fosa Común',           '🕳️', 'carronero'),
        M('Quimera Pálida',       '🦚', 'astuto'),
        M('Silencio',             '🤫', 'brutal'),
        M('Behemot',              '🐘', 'embestida'),
        M('Última Llama',         '🔱', 'implacable')
    ]
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

// Cada tramo tiene su propio guardián: vencer seis veces al mismo dragón no sería una recompensa.
// Comparten el patrón del jefe (ya calibrado); lo que cambia es quién es y cuánto pega, por el tramo.
export const DEEP_BOSSES = [
    { name: 'Guardián de la Cripta', icon: '⚱️', pattern: BOSS_DEF.pattern },
    { name: 'Devorador del Abismo',  icon: '🦈', pattern: BOSS_DEF.pattern },
    { name: 'Rey en la Hondonada',   icon: '👑', pattern: BOSS_DEF.pattern },
    { name: 'Madre de las Raíces',   icon: '🌳', pattern: BOSS_DEF.pattern },
    { name: 'Aquello que Calla',     icon: '🌌', pattern: BOSS_DEF.pattern }
];

/** Todos los monstruos que existen, para el bestiario. */
export const ALL_MONSTER_DEFS = [...MONSTER_ROSTER, ...DEEP_ROSTERS.flat()];

// Cómo se llama cada tramo del descenso. Pasado el último escrito, se numera por profundidad.
export const TIER_NAMES = ['La Mazmorra', 'La Cripta', 'El Abismo', 'La Hondonada', 'Las Raíces', 'El Silencio'];
export const tierName = tier => TIER_NAMES[tier] || `Profundidad ${(tier | 0) + 1}`;

/** El elenco de monstruos normales de un tramo. El tramo 0 es siempre la mazmorra de siempre. */
export function rosterForTier(tier) {
    const t = Math.max(0, tier | 0);
    return t === 0 ? MONSTER_ROSTER : DEEP_ROSTERS[(t - 1) % DEEP_ROSTERS.length];
}

/** Definición de monstruo para un tipo de nodo, un piso y un tramo (0 = la mazmorra de siempre). */
export function pickMonsterDef(type, floor, tier = 0) {
    const f = Math.max(0, floor | 0);
    const t = Math.max(0, tier | 0);
    if (type === 'boss') return t === 0 ? BOSS_DEF : DEEP_BOSSES[(t - 1) % DEEP_BOSSES.length];
    if (type === 'subboss') return SUBBOSS_ROSTER[f % SUBBOSS_ROSTER.length];
    const roster = rosterForTier(t);
    return roster[Math.min(f, roster.length - 1)];
}

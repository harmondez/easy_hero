// =============================================
// ⚖️ Números de equilibrio — todos en un sitio
// El banco de equilibrio (`npm run balance`) puede cambiarlos para probar variantes sin tocar el motor.
// Los valores de aquí son los que se juegan.
// =============================================
// Un ÚNICO objeto compartido: el navegador y las pruebas cargan los módulos con y sin `?v=`, y JavaScript los trata como
// copias distintas; así todas las copias ven (y el banco de equilibrio puede cambiar) los mismos números.
globalThis.__RPG_BALANCE__ = globalThis.__RPG_BALANCE__ || {
    // Estadísticas de un monstruo normal en el piso f (empezando en 0)
    monster: {
        // Recalibrados en la 1.4.0: con el descenso sin fin, vencer al primer jefe dejó de ser la meta
        // del juego y pasó a ser la PUERTA al bucle de verdad, así que tiene que cruzarla mucha más gente.
        atkBase: 1, atkPerFloor: 0.34,   // ATK = atkBase + ⌊f × atkPerFloor⌋
        hpBase: 6, hpPerFloor: 2.9,      // HP  = hpBase + hpPerFloor × f
        easyFloors: 3,                  // los primeros pisos son un «grupo fácil»
        easyFactor: 1                   // multiplicador de sus estadísticas
    },
    subboss: { hpMul: 1.3, atkBonus: 1 },   // opcional y vencible con la vida completa
    boss: { hpMul: 1.5, atkBonus: 2 },      // más vida y más ATK que cualquier sub-jefe; su patrón castiga no defenderse

    // Ya no se gana fuerza por vencer: el poder viene del equipo (y, en la entrega B2, de las mejoras). `level` solo cuenta victorias
    victory: { monster: { atq: 0, hp: 0, level: 1 }, subboss: { atq: 0, hp: 0, level: 1 } },

    // Peso de cada tipo de nodo en los pisos intermedios
    weights: { monster: 45, event: 20, campfire: 12, chest: 10, subboss: 10 },
    subbossMinFloor: 4,

    // Hoguera
    campfire: { healPct: 0.3 },

    // Oro por victoria. Ya es una moneda de verdad: se gasta en La Forja (data/upgrades.js)
    gold: { monster: 2, subboss: 6, boss: 18 },

    // Descenso sin fin: al vencer al jefe se genera otro tramo de 16 pisos, más duro y más rico.
    // `tierMul` es ACUMULATIVO por tramo (tramo 0 → ×1, tramo 1 → ×1,5, tramo 2 → ×2,25…). En el tramo 0
    // vale exactamente 1, así que el juego de siempre se comporta igual que antes de que esto existiera.
    depth: { tierMul: 1.5, goldMul: 1.6 },

    // Expedición: lo que rinde la mazmorra mientras no juegas. Rinde bastante menos que jugar
    // (una ruta da mucho más por hora), así que nunca sustituye a jugar: solo premia volver.
    // El ritmo sube con la profundidad alcanzada para que siga significando algo en tramos hondos.
    expedition: { goldPerHour: 15, maxHours: 8 },

    // Variantes de monstruo (data/variants.js): un adjetivo y/o un linaje sobre el nombre base.
    // La probabilidad crece con el tramo: `base + porTramo × tramo`, con tope.
    variants: {
        adjChance: { base: 0.12, perTier: 0.07, max: 0.45 },
        lineageChance: { base: 0.06, perTier: 0.05, max: 0.32 }
    }
};

export const RPG_BALANCE = globalThis.__RPG_BALANCE__;

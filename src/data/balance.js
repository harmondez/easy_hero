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
        // Recalibrados en la 1.4.0 (descenso sin fin) y de nuevo en la 1.4.1 (el botín ya no se
        // elige 1 de 3, así que el equipo llega más débil y hpPerFloor bajó para compensarlo).
        atkBase: 1, atkPerFloor: 0.34,   // ATK = atkBase + ⌊f × atkPerFloor⌋
        hpBase: 6, hpPerFloor: 2.0,      // HP  = hpBase + hpPerFloor × f
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

    // Botín: probabilidad de que un combate normal suelte un objeto (los sub-jefes y jefes siempre sueltan).
    // Casi todo lo que cae así es gris: lo bueno se gana en cofres y sub-jefes (ver RARITY_BIAS).
    loot: { combatDropChance: 0.25 },

    // Expedición: lo que rinde la mazmorra mientras no juegas. Rinde bastante menos que jugar
    // (una ruta da mucho más por hora), así que nunca sustituye a jugar: solo premia volver.
    // El ritmo sube con la profundidad alcanzada para que siga significando algo en tramos hondos.
    expedition: { goldPerHour: 15, maxHours: 8 },

    // Pociones: curan una parte de la vida máxima y gastan el turno (el enemigo responde). Son tuyas entre
    // partidas, con un tope, y se compran con oro a precio fijo en La Forja (en la aldea, cuando exista).
    potion: { heal: 0.4, max: 3, price: 20 },
    // Maná: el héroe empieza con la mitad de su vida inicial (25 → 12). La poción de maná menor devuelve la mitad
    manaFromHp: 0.5,
    inn: { price: 5 },   // lo que cobra la posada por dormir (hasta que Evelyn te deja quedarte gratis)
    manaPotion: { restore: 0.5, max: 3, price: 25 },

    // ⚡ Energía (barra amarilla): se llena peleando y se guarda de un combate a otro hasta el máximo; solo se vacía al
    // dormir en la posada. La gastan las técnicas (Golpe poderoso).
    //   onAttack: al atacar · onHit: al recibir daño · onDefend: al defenderte (además de lo que ganes si te golpean)
    energy: { max: 100, onAttack: 5, onHit: 5, onDefend: 10 },

    // Ranuras de la barra de habilidades del combate (las que no tienen habilidad salen cerradas)
    skillSlots: 6,

    // 🧪 Modo pruebas: true = la tienda lo da todo gratis (para probar armas y efectos en local). Publicado: false
    freeShop: false,

    // Variantes de monstruo (data/variants.js): un adjetivo y/o un linaje sobre el nombre base.
    // La probabilidad crece con el tramo: `base + porTramo × tramo`, con tope.
    variants: {
        adjChance: { base: 0.12, perTier: 0.07, max: 0.45 },
        lineageChance: { base: 0.06, perTier: 0.05, max: 0.32 }
    }
};

export const RPG_BALANCE = globalThis.__RPG_BALANCE__;

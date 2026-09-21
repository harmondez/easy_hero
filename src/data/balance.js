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
        atkBase: 1, atkPerFloor: 0.28,   // ATK = atkBase + ⌊f × atkPerFloor⌋
        hpBase: 6, hpPerFloor: 3,       // HP  = hpBase + hpPerFloor × f
        easyFloors: 3,                  // los primeros pisos son un «grupo fácil»
        easyFactor: 1                   // multiplicador de sus estadísticas
    },
    subboss: { hpMul: 1.3, atkBonus: 1 },   // opcional y vencible con la vida completa
    boss: { hpMul: 1.5, atkBonus: 2 },      // más vida y más ATK que cualquier sub-jefe; su patrón castiga no defenderse

    // Recompensa provisional por victoria (se sustituirá por equipo y mejoras)
    victory: { monster: { atq: 1, hp: 4 }, subboss: { atq: 2, hp: 8 } },

    // Peso de cada tipo de nodo en los pisos intermedios
    weights: { monster: 45, event: 20, campfire: 12, chest: 10, subboss: 10 },
    subbossMinFloor: 4,

    // Hoguera
    campfire: { healPct: 0.3 }
};

export const RPG_BALANCE = globalThis.__RPG_BALANCE__;

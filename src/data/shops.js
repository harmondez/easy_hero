// =============================================
// 🛒 Las tiendas de la aventura (solo datos): qué vende cada tendero
//
// Una parada abre la suya con `shop: '<id>'`. Cada tienda vende solo lo de `sells` y compra lo mismo que vende,
// al SELL_RATE de su precio (lo que te sobre se lo puedes devolver al 75 %).
//   name    el rótulo de la tienda
//   note    una línea bajo el rótulo
//   sells   en orden: 'potion' · 'mana_potion' · 'elixir:<id>' · 'food:<id>' (src/data/effects.js) ·
//           'gear:<id>' o 'gear:*' para todo el equipo a la venta: espadas y armaduras (src/data/gear.js) · 'crystal' (el cristal de mejora) ·
//           'upgrade:<id>' o 'upgrade:*' (las mejoras permanentes de src/data/upgrades.js: no se devuelven)
//   buys    lo que además te compra sin venderlo: 'material:<id>' o 'material:*' (todo material con `value` de
//           src/data/loot.js; se paga ese valor entero)
// =============================================
export const SELL_RATE = 0.75;

export const SHOPS = {
    forja: {
        name: 'La Forja de Bram',
        note: 'Espadas, armaduras y cristales de mejora. Con un cristal, Bram le saca más filo a tu espada (pídele «Mejorar»). También compra lo que sueltan los goblins y los lobos.',
        sells: ['gear:*', 'crystal'],
        buys: ['material:*']
    },
    botica: {
        name: 'La botica de Amelie',
        note: 'Pociones, elixires y frascos. Se usan en combate, a cambio de tu turno.',
        sells: ['potion', 'mana_potion', 'elixir:fuerza', 'elixir:arcano', 'elixir:veneno']
    },
    posada: {
        name: 'La despensa de la posada',
        note: 'Pan del día. Se come por el camino, desde el inventario.',
        sells: ['food:pan']
    },
    instructor: {
        name: 'Las lecciones de Odo',
        note: 'Lo que aprendes aquí es para siempre. Cada lección cuesta más que la anterior.',
        sells: ['upgrade:filo', 'upgrade:constitucion', 'upgrade:buen_ojo', 'upgrade:estudio']
    }
};

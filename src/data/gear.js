// =============================================
// 🎒 El equipo de la aventura (solo datos): lo que guarda el inventario de tu héroe en Zafias.
// Es permanente (no se pierde al caer) y aparte del botín del descenso, que se reinicia en cada ruta.
//
//   name, slot ('weapon'), atq (ATK que da), desc (la historia del objeto), from (de dónde sale)
//   rarity   id de rareza (src/data/rarities.js): el color de su nombre en el inventario
//   element  id de ELEMENTS: el color de fondo de su icono en el inventario (como en DragonFable)
//   price    lo que pide el mercader (sin `price`, no se vende: solo se gana)
//   onHit    efectos de estado al golpear (src/data/effects.js): [{ id, power, turns, chance }]
//   onStart  efectos que te pone al empezar cada combate: [{ id, power, turns }]
//   sprite   id en src/data/art.js de la imagen del héroe con esa arma (arma_<id>): al equiparla, el héroe cambia
//            de dibujo en el mapa y en el combate. Sin sprite, el dibujo de siempre.
// Imágenes: en el inventario, cada fila lleva el icono de su ranura (ranura-arma…) sobre el color de su elemento; el
// detalle enseña la pieza tal cual, ART.icons['objeto-<id>'] (de img/weapons/weapon_sword-<Nombre>.png con
// `npm run icons`). El héroe con el arma en la mano: img/weapons/<Nombre>.png → `npm run sprites` (arma_<id>).
// =============================================
export const STARTER_GEAR = 'espada-de-hierro';

/** Los elementos del equipo: el color de fondo del icono y, si lo hay, su icono (ART.icons). */
export const ELEMENTS = {
    neutro: { name: 'Sin elemento', color: '#8c7b66' },
    fuego:  { name: 'Fuego',  color: '#e0612a', icon: 'fuego' },
    hielo:  { name: 'Hielo',  color: '#4fb3e8', icon: 'hielo' },
    rayo:   { name: 'Rayo',   color: '#e8c93a', icon: 'rayo' },
    veneno: { name: 'Veneno', color: '#6dbf3a' },
    sangre: { name: 'Sangre', color: '#c4303c' },
    sombra: { name: 'Sombra', color: '#7b4fc9' },
    luz:    { name: 'Luz',    color: '#f2d27a' }
};

/** El icono de cada ranura (ART.icons). */
export const SLOT_ICONS = { weapon: 'ranura-arma', armor: 'ranura-armadura', helmet: 'ranura-casco', gloves: 'ranura-guantes',
    boots: 'ranura-botas', belt: 'ranura-cinturon', necklace: 'ranura-collar', ring: 'ranura-anillo' };

export const GEAR = {
    'espada-de-hierro': {
        name: 'Espada de hierro', slot: 'weapon', rarity: 'comun', element: 'neutro', atq: 1,
        desc: 'La encontraste a tu lado al despertar en las ruinas. Mellada, pero tuya.',
        from: 'Con ella empezó todo'
    },
    'espada-de-zafias': {
        name: 'Espada de Zafias', slot: 'weapon', rarity: 'poco_comun', element: 'neutro', atq: 2,
        desc: 'Forjada por Bram con acero templado en dientes de lobo molidos. Más larga y con más filo que una espada de hierro.',
        from: 'Recompensa de Bram: «Dientes de lobo»',
        onHit: [{ id: 'sangrado', power: 1, turns: 2, chance: 0.3 }],   // el filo dentado hace sangrar
        sprite: 'arma_espada-de-zafias'
    },
    // --- Lo que vende el mercader de Zafias ---
    aguijon: {
        name: 'Aguijón', slot: 'weapon', rarity: 'poco_comun', element: 'veneno', atq: 2, price: 300,
        desc: 'Una hoja verde envuelta en zarzas. Lo que corta, se pudre.',
        from: 'El mercader de Zafias',
        onHit: [{ id: 'veneno', power: 1, turns: 3, chance: 0.5 }]
    },
    'espada-imperial': {
        name: 'Espada imperial', slot: 'weapon', rarity: 'rara', element: 'neutro', atq: 3, price: 650,
        desc: 'Acero del castillo, con el zafiro de la guardia en la cruz. Empuñarla da coraje.',
        from: 'El mercader de Zafias',
        onStart: [{ id: 'mas-ataque', power: 0.3, turns: 2 }]
    },
    'espada-negra': {
        name: 'Espada negra', slot: 'weapon', rarity: 'rara', element: 'sombra', atq: 3, price: 750,
        desc: 'Hierro oscuro, sin brillo. Sus muescas desgarran.',
        from: 'El mercader de Zafias',
        onHit: [{ id: 'sangrado', power: 2, turns: 2, chance: 0.35 }]
    },
    cryovain: {
        name: 'Cryovain', slot: 'weapon', rarity: 'rara', element: 'hielo', atq: 3, price: 900,
        desc: 'Hielo que no se funde. Un buen tajo deja al enemigo helado, sin poder moverse.',
        from: 'El mercader de Zafias',
        onHit: [{ id: 'aturdido', power: 1, turns: 1, chance: 0.2 }]
    },
    mirmulnir: {
        name: 'Mirmulnir', slot: 'weapon', rarity: 'epica', element: 'fuego', atq: 4, price: 1300,
        desc: 'Lleva el nombre de un dragón y arde como él. Sus heridas siguen quemando.',
        from: 'El mercader de Zafias',
        onHit: [{ id: 'quemadura', power: 2, turns: 2, chance: 0.5 }]
    },
    sanguine: {
        name: 'Sanguine', slot: 'weapon', rarity: 'epica', element: 'sangre', atq: 4, price: 1300,
        desc: 'Roja hasta la empuñadura. Dicen que tiene sed.',
        from: 'El mercader de Zafias',
        onHit: [{ id: 'sangrado', power: 2, turns: 3, chance: 0.5 }]
    },
    shadowvain: {
        name: 'Shadowvain', slot: 'weapon', rarity: 'epica', element: 'sombra', atq: 3, price: 1400,
        desc: 'Cristal violeta que susurra. Al desenvainarla, tus habilidades despiertan.',
        from: 'El mercader de Zafias',
        onStart: [{ id: 'mas-ph', power: 0.5, turns: 3 }]
    },
    quebrantaamaneceres: {
        name: 'Quebrantaamaneceres', slot: 'weapon', rarity: 'legendaria', element: 'luz', atq: 5, price: 2000,
        desc: 'Una hoja dorada con un sol en la cruz. Cierra tus heridas y quema lo que toca.',
        from: 'El mercader de Zafias',
        onStart: [{ id: 'regeneracion', power: 2, turns: 3 }],
        onHit: [{ id: 'quemadura', power: 1, turns: 2, chance: 0.3 }]
    }
};

/** Lo que vende el mercader, por precio. */
export const GEAR_FOR_SALE = Object.keys(GEAR).filter(id => GEAR[id].price != null).sort((a, b) => GEAR[a].price - GEAR[b].price);

/** Cuánto ATK suma cada cristal de mejora, y cuántos admite cada arma. */
export const WEAPON_UPGRADE = { atq: 1, max: 3, price: 250, name: 'Cristal de mejora', img: 'mejora-arma' };

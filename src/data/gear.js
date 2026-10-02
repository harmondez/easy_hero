// =============================================
// 🎒 El equipo de la aventura (solo datos): lo que guarda el inventario de tu héroe en Zafias.
// Es permanente (no se pierde al caer) y aparte del botín del descenso, que se reinicia en cada ruta.
//
//   name, icon, slot ('weapon'), rarity (texto), atq (ATK que da), desc (la historia del objeto), from (de dónde sale)
//   sprite   id en src/data/art.js de la imagen del héroe con esa arma (arma_<id>): al equiparla, el héroe cambia
//            de dibujo en el mapa y en el combate. Sin sprite, el dibujo de siempre.
// El original de cada imagen va en img/weapons/<Nombre>.png (no se sube); `npm run sprites` lo pasa al juego
// desde img/entrantes/arma_<id>.png.
// =============================================
export const STARTER_GEAR = 'espada-de-hierro';

export const GEAR = {
    'espada-de-hierro': {
        name: 'Espada de hierro', icon: '🗡️', slot: 'weapon', rarity: 'Común', atq: 1,
        desc: 'La encontraste a tu lado al despertar en las ruinas. Mellada, pero tuya.',
        from: 'Con ella empezó todo'
    },
    'espada-de-zafias': {
        name: 'Espada de Zafias', icon: '⚔️', slot: 'weapon', rarity: 'Poco común', atq: 2,
        desc: 'Forjada por Bram con acero templado en dientes de lobo molidos. Más larga y con más filo que una espada de hierro.',
        from: 'Recompensa de Bram: «Dientes de lobo»',
        sprite: 'arma_espada-de-zafias'
    }
};

// =============================================
// 🖼️ Registro de imágenes del juego — LO ESCRIBE `npm run sprites` (tools/sprites.mjs); no se edita a mano.
//   sprites: enemigo_<id> y heroe_<id>, ya recortados (los pies tocan el borde inferior)
//   bg: fondos de combate · zones: mapas de zona (sin recortar)
// Cada entrada: { src, w, h }. El combate usa estas imágenes si existen; si no, el goblin teñido de siempre.
// =============================================
export const ART = {
    "sprites": {
        "enemigo_orco": {
            "src": "img/sprites/enemigo_orco.webp",
            "w": 186,
            "h": 256
        }
    },
    "bg": {},
    "zones": {}
};

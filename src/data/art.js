// =============================================
// 🖼️ Registro de imágenes del juego — LO ESCRIBE `npm run sprites` (tools/sprites.mjs); no se edita a mano.
//   sprites: enemigo_<id> y heroe_<id>, ya recortados (los pies tocan el borde inferior)
//   bg: fondos de combate · zones: mapas de zona (sin recortar)
// Cada entrada: { src, w, h }. El combate usa estas imágenes si existen; si no, el goblin teñido de siempre.
// =============================================
export const ART = {
    "sprites": {
        "enemigo_feronius-el-feroz": {
            "src": "img/sprites/enemigo_feronius-el-feroz.webp",
            "w": 398,
            "h": 256
        },
        "enemigo_gnarok-el-jefe-gnoll": {
            "src": "img/sprites/enemigo_gnarok-el-jefe-gnoll.webp",
            "w": 226,
            "h": 256
        },
        "enemigo_gnoll-berserker": {
            "src": "img/sprites/enemigo_gnoll-berserker.webp",
            "w": 261,
            "h": 256
        },
        "enemigo_gnoll-de-zafias": {
            "src": "img/sprites/enemigo_gnoll-de-zafias.webp",
            "w": 253,
            "h": 256
        },
        "enemigo_grask": {
            "src": "img/sprites/enemigo_grask.webp",
            "w": 196,
            "h": 256
        },
        "enemigo_guul-el-rey-orco": {
            "src": "img/sprites/enemigo_guul-el-rey-orco.webp",
            "w": 224,
            "h": 256
        },
        "enemigo_lobo-de-zafias": {
            "src": "img/sprites/enemigo_lobo-de-zafias.webp",
            "w": 433,
            "h": 256
        },
        "enemigo_orco": {
            "src": "img/sprites/enemigo_orco.webp",
            "w": 186,
            "h": 256
        },
        "enemigo_orco-chaman": {
            "src": "img/sprites/enemigo_orco-chaman.webp",
            "w": 187,
            "h": 256
        },
        "enemigo_orco-de-zafias": {
            "src": "img/sprites/enemigo_orco-de-zafias.webp",
            "w": 214,
            "h": 256
        },
        "enemigo_orco-guerrero": {
            "src": "img/sprites/enemigo_orco-guerrero.webp",
            "w": 195,
            "h": 256
        }
    },
    "bg": {},
    "zones": {}
};

// =============================================
// 🖼️ Registro de imágenes del juego — LO ESCRIBE `npm run sprites` (tools/sprites.mjs); no se edita a mano.
//   sprites: enemigo_<id> y heroe_<id>, ya recortados (los pies tocan el borde inferior)
//   bg: fondos de combate · zones: mapas de zona (sin recortar) · icons: iconos y objetos (npm run icons)
//   portraits: retratos de los diálogos (npm run icons, de img/characters)
// Cada entrada: { src, w, h }. El combate usa estas imágenes si existen; si no, el goblin teñido de siempre.
// =============================================
export const ART = {
    "sprites": {
        "arma_espada-de-zafias": {
            "src": "img/sprites/arma_espada-de-zafias.webp",
            "w": 289,
            "h": 256
        },
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
    "bg": {
        "ruinas": {
            "src": "img/bg/ruinas.webp",
            "w": 1376,
            "h": 768
        }
    },
    "zones": {},
    "icons": {
        "agilidad": {
            "src": "img/ui/agilidad.webp",
            "w": 100,
            "h": 128
        },
        "barra-mana": {
            "src": "img/ui/barra-mana.webp",
            "w": 359,
            "h": 126
        },
        "barra-vacia": {
            "src": "img/ui/barra-vacia.webp",
            "w": 355,
            "h": 126
        },
        "barra-vida": {
            "src": "img/ui/barra-vida.webp",
            "w": 358,
            "h": 126
        },
        "bolsa-oro": {
            "src": "img/ui/bolsa-oro.webp",
            "w": 128,
            "h": 124
        },
        "comida": {
            "src": "img/ui/comida.webp",
            "w": 128,
            "h": 95
        },
        "defensa": {
            "src": "img/ui/defensa.webp",
            "w": 100,
            "h": 128
        },
        "derrota": {
            "src": "img/ui/derrota.webp",
            "w": 105,
            "h": 128
        },
        "efecto-aturdido": {
            "src": "img/ui/efecto-aturdido.webp",
            "w": 128,
            "h": 124
        },
        "efecto-mas-ataque": {
            "src": "img/ui/efecto-mas-ataque.webp",
            "w": 128,
            "h": 118
        },
        "efecto-mas-ph": {
            "src": "img/ui/efecto-mas-ph.webp",
            "w": 128,
            "h": 110
        },
        "efecto-quemadura": {
            "src": "img/ui/efecto-quemadura.webp",
            "w": 96,
            "h": 128
        },
        "efecto-regeneracion": {
            "src": "img/ui/efecto-regeneracion.webp",
            "w": 128,
            "h": 125
        },
        "efecto-sangrado": {
            "src": "img/ui/efecto-sangrado.webp",
            "w": 84,
            "h": 128
        },
        "efecto-veneno": {
            "src": "img/ui/efecto-veneno.webp",
            "w": 97,
            "h": 128
        },
        "forja-estudio": {
            "src": "img/ui/forja-estudio.webp",
            "w": 126,
            "h": 128
        },
        "forja-filo": {
            "src": "img/ui/forja-filo.webp",
            "w": 117,
            "h": 128
        },
        "forja-herencia": {
            "src": "img/ui/forja-herencia.webp",
            "w": 128,
            "h": 128
        },
        "forja-linterna": {
            "src": "img/ui/forja-linterna.webp",
            "w": 73,
            "h": 128
        },
        "forja-suerte": {
            "src": "img/ui/forja-suerte.webp",
            "w": 109,
            "h": 128
        },
        "fuego": {
            "src": "img/ui/fuego.webp",
            "w": 104,
            "h": 128
        },
        "habilidad-golpe-poderoso": {
            "src": "img/ui/habilidad-golpe-poderoso.webp",
            "w": 128,
            "h": 128
        },
        "habilidad-grito": {
            "src": "img/ui/habilidad-grito.webp",
            "w": 128,
            "h": 127
        },
        "hielo": {
            "src": "img/ui/hielo.webp",
            "w": 109,
            "h": 128
        },
        "ingrediente-hierba": {
            "src": "img/ui/ingrediente-hierba.webp",
            "w": 124,
            "h": 128
        },
        "inventario": {
            "src": "img/ui/inventario.webp",
            "w": 128,
            "h": 126
        },
        "libro-hechizos": {
            "src": "img/ui/libro-hechizos.webp",
            "w": 128,
            "h": 115
        },
        "mana": {
            "src": "img/ui/mana.webp",
            "w": 93,
            "h": 128
        },
        "mapa": {
            "src": "img/ui/mapa.webp",
            "w": 128,
            "h": 108
        },
        "marco-boton": {
            "src": "img/ui/marco-boton.webp",
            "w": 413,
            "h": 115
        },
        "marco-boton-luz": {
            "src": "img/ui/marco-boton-luz.webp",
            "w": 416,
            "h": 117
        },
        "marco-boton-oscuro": {
            "src": "img/ui/marco-boton-oscuro.webp",
            "w": 413,
            "h": 115
        },
        "marco-mini": {
            "src": "img/ui/marco-mini.webp",
            "w": 115,
            "h": 108
        },
        "marco-mini-luz": {
            "src": "img/ui/marco-mini-luz.webp",
            "w": 147,
            "h": 127
        },
        "marco-ranura": {
            "src": "img/ui/marco-ranura.webp",
            "w": 189,
            "h": 188
        },
        "marco-ranura-bloqueada": {
            "src": "img/ui/marco-ranura-bloqueada.webp",
            "w": 210,
            "h": 208
        },
        "marco-ranura-cerrada": {
            "src": "img/ui/marco-ranura-cerrada.webp",
            "w": 201,
            "h": 204
        },
        "marco-ranura-epica": {
            "src": "img/ui/marco-ranura-epica.webp",
            "w": 202,
            "h": 210
        },
        "marco-ranura-luz": {
            "src": "img/ui/marco-ranura-luz.webp",
            "w": 224,
            "h": 216
        },
        "mejora-arma": {
            "src": "img/ui/mejora-arma.webp",
            "w": 87,
            "h": 128
        },
        "menu-bestiario": {
            "src": "img/ui/menu-bestiario.webp",
            "w": 117,
            "h": 128
        },
        "menu-coleccion": {
            "src": "img/ui/menu-coleccion.webp",
            "w": 125,
            "h": 128
        },
        "menu-logros": {
            "src": "img/ui/menu-logros.webp",
            "w": 128,
            "h": 114
        },
        "menu-opciones": {
            "src": "img/ui/menu-opciones.webp",
            "w": 128,
            "h": 128
        },
        "moneda": {
            "src": "img/ui/moneda.webp",
            "w": 126,
            "h": 128
        },
        "objeto-aguijon": {
            "src": "img/ui/objeto-aguijon.webp",
            "w": 80,
            "h": 256
        },
        "objeto-cryovain": {
            "src": "img/ui/objeto-cryovain.webp",
            "w": 87,
            "h": 256
        },
        "objeto-espada-de-zafias": {
            "src": "img/ui/objeto-espada-de-zafias.webp",
            "w": 85,
            "h": 256
        },
        "objeto-espada-imperial": {
            "src": "img/ui/objeto-espada-imperial.webp",
            "w": 94,
            "h": 256
        },
        "objeto-espada-negra": {
            "src": "img/ui/objeto-espada-negra.webp",
            "w": 89,
            "h": 256
        },
        "objeto-mirmulnir": {
            "src": "img/ui/objeto-mirmulnir.webp",
            "w": 88,
            "h": 256
        },
        "objeto-quebrantaamaneceres": {
            "src": "img/ui/objeto-quebrantaamaneceres.webp",
            "w": 86,
            "h": 256
        },
        "objeto-sanguine": {
            "src": "img/ui/objeto-sanguine.webp",
            "w": 86,
            "h": 256
        },
        "objeto-shadowvain": {
            "src": "img/ui/objeto-shadowvain.webp",
            "w": 88,
            "h": 256
        },
        "parada-hablar": {
            "src": "img/ui/parada-hablar.webp",
            "w": 128,
            "h": 109
        },
        "parada-mirar": {
            "src": "img/ui/parada-mirar.webp",
            "w": 117,
            "h": 128
        },
        "parada-posada": {
            "src": "img/ui/parada-posada.webp",
            "w": 128,
            "h": 124
        },
        "parada-salida": {
            "src": "img/ui/parada-salida.webp",
            "w": 100,
            "h": 128
        },
        "pocion-mana": {
            "src": "img/ui/pocion-mana.webp",
            "w": 99,
            "h": 128
        },
        "pocion-veneno": {
            "src": "img/ui/pocion-veneno.webp",
            "w": 97,
            "h": 128
        },
        "pocion-vida": {
            "src": "img/ui/pocion-vida.webp",
            "w": 98,
            "h": 128
        },
        "ranura-anillo": {
            "src": "img/ui/ranura-anillo.webp",
            "w": 113,
            "h": 128
        },
        "ranura-arma": {
            "src": "img/ui/ranura-arma.webp",
            "w": 121,
            "h": 128
        },
        "ranura-armadura": {
            "src": "img/ui/ranura-armadura.webp",
            "w": 128,
            "h": 117
        },
        "ranura-botas": {
            "src": "img/ui/ranura-botas.webp",
            "w": 128,
            "h": 118
        },
        "ranura-casco": {
            "src": "img/ui/ranura-casco.webp",
            "w": 125,
            "h": 128
        },
        "ranura-cinturon": {
            "src": "img/ui/ranura-cinturon.webp",
            "w": 128,
            "h": 81
        },
        "ranura-collar": {
            "src": "img/ui/ranura-collar.webp",
            "w": 95,
            "h": 128
        },
        "ranura-guantes": {
            "src": "img/ui/ranura-guantes.webp",
            "w": 128,
            "h": 115
        },
        "rayo": {
            "src": "img/ui/rayo.webp",
            "w": 90,
            "h": 128
        },
        "victoria": {
            "src": "img/ui/victoria.webp",
            "w": 128,
            "h": 113
        },
        "vida": {
            "src": "img/ui/vida.webp",
            "w": 128,
            "h": 116
        }
    },
    "portraits": {
        "enemy-goblin-minion": {
            "src": "img/portraits/enemy-goblin-minion.webp",
            "w": 517,
            "h": 640
        },
        "enemy-grask-boss": {
            "src": "img/portraits/enemy-grask-boss.webp",
            "w": 602,
            "h": 640
        },
        "hero": {
            "src": "img/portraits/hero.webp",
            "w": 618,
            "h": 640
        },
        "herrero-braum": {
            "src": "img/portraits/herrero-braum.webp",
            "w": 348,
            "h": 640
        },
        "tabernera-maela": {
            "src": "img/portraits/tabernera-maela.webp",
            "w": 376,
            "h": 640
        }
    }
};

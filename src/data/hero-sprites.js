// Generado por el Sprite Factory (npm run sprite-factory). No editar a mano: se cambia en tools/sprite-factory/.
// anims: por animación, el lienzo (w × h), los pies (cx, baseline), la altura del héroe de pie y la mano en cada
// fotograma (x, y, giro del arma).
// armors: cada armadura es una carpeta con <anim>_<n>.webp. La espada no está dibujada: se coloca en la mano.
export const HERO_SPRITES = {
    "sword": {
        "length": 0.62,
        "grip": 0.11,
        "fist": 0.045
    },
    "idle": {
        "anim": "walk",
        "frame": 1
    },
    "anims": {
        "walk": {
            "w": 404,
            "h": 496,
            "cx": 238,
            "baseline": 492,
            "heroHeight": 447,
            "fps": 6,
            "loop": true,
            "order": [
                0,
                1,
                2,
                3
            ],
            "frames": [
                {
                    "x": 217,
                    "y": 303,
                    "angle": 19.9
                },
                {
                    "x": 224,
                    "y": 302,
                    "angle": 19.9
                },
                {
                    "x": 228,
                    "y": 298,
                    "angle": 18.9
                },
                {
                    "x": 231,
                    "y": 301,
                    "angle": 19.3
                }
            ]
        },
        "attack": {
            "w": 415,
            "h": 457,
            "cx": 214,
            "baseline": 453,
            "heroHeight": 411,
            "fps": 8,
            "loop": false,
            "order": [
                0,
                1,
                2,
                3
            ],
            "hold": [
                90,
                140,
                70,
                220
            ],
            "frames": [
                {
                    "x": 213,
                    "y": 267,
                    "angle": 11.1
                },
                {
                    "x": 204,
                    "y": 79,
                    "angle": -146.9
                },
                {
                    "x": 350,
                    "y": 268,
                    "angle": 23.9
                },
                {
                    "x": 303,
                    "y": 331,
                    "angle": 38.7
                }
            ]
        },
        "cast": {
            "w": 476,
            "h": 479,
            "cx": 227,
            "baseline": 475,
            "heroHeight": 423,
            "fps": 8,
            "loop": false,
            "order": [
                0,
                1,
                2,
                3
            ],
            "hold": [
                110,
                160,
                220,
                140
            ],
            "frames": [
                {
                    "x": 337,
                    "y": 292,
                    "angle": 34
                },
                {
                    "x": 333,
                    "y": 193,
                    "angle": -90
                },
                {
                    "x": 413,
                    "y": 212,
                    "angle": -0.2
                },
                {
                    "x": 232,
                    "y": 289,
                    "angle": 25.5
                }
            ]
        }
    },
    "armors": {
        "acero": {
            "name": "Armadura de acero",
            "dir": "img/hero/acero"
        },
        "negra": {
            "name": "Armadura negra",
            "dir": "img/hero/negra",
            "tint": "negra",
            "from": "acero"
        },
        "oro": {
            "name": "Armadura dorada",
            "dir": "img/hero/oro",
            "tint": "oro",
            "from": "acero"
        },
        "cuero": {
            "name": "Armadura de cuero",
            "dir": "img/hero/cuero"
        },
        "malla": {
            "name": "Cota de malla",
            "dir": "img/hero/malla"
        },
        "imperial": {
            "name": "Placas imperiales",
            "dir": "img/hero/imperial"
        },
        "escamas": {
            "name": "Armadura de escamas de dragón",
            "dir": "img/hero/escamas"
        },
        "imperial-negra": {
            "name": "Placas imperiales negras",
            "dir": "img/hero/imperial-negra",
            "tint": "negra",
            "from": "imperial"
        }
    }
};

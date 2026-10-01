// =============================================
// 🧭 Zafias — la primera zona del Modo Aventura
// Coordenadas en píxeles lógicos del mapa (1434×1097), vista cenital. La imagen img/zones/zafias.webp va a ×3
// (recompuesta en HD con tools/assemble-map.mjs) y se estira a ese tamaño: las coordenadas no cambian.
// Cada escena es un recuadro del mapa que la cámara encuadra; los puntos son lo que se puede pulsar.
//   `startAt`  parada donde apareces al entrar en la escena · `forks` cruces de camino (sin parada)
//   `links`    caminos a trazos entre paradas/cruces: [desde, hasta, recodos opcionales]. Los recodos siguen la
//              tierra pintada del mapa, para que la línea vaya por el camino y no a través de los árboles
//   `arriveAt` (en las salidas) la parada de la escena de destino donde apareces
//   `kind`     npc · enemy · exit · inn · shop · cave · poi (punto de interés: se mira o se registra, con `dialogue`
//              o con `talk`, como un NPC; un hallazgo da su `reward` una sola vez con la marca `visto:<id>`)
//   `enemy`    contra qué se pelea (tipo y piso fijan su fuerza: la dificultad es fija por zona)
//   `once`     el enemigo no vuelve nunca (jefes de misión); los demás reaparecen al dormir en la posada
//   `sprite`   (enemigos) con qué id se busca su imagen en src/data/art.js (enemigo_<sprite>); si no, por su nombre
//   `requires` marcas de la historia que hacen falta para que el punto aparezca (todas)
//   `talk`     lo que dice un NPC según la historia: gana la primera entrada cuyas marcas `when` se cumplen
//              (`set` pone una marca al terminar de hablar; `reward` da oro y pociones una sola vez)
// Marcas: `defeated:<id>` al vencer a ese enemigo (permanente) y las que pongan los diálogos.
// =============================================
import { ZAFIAS_PATHS } from './zafias-paths.js?v=1.7.1';

const GOBLINS_DEL_BOSQUE = ['defeated:goblin-1', 'defeated:goblin-2', 'defeated:goblin-3'];

export const ZAFIAS = {
    id: 'zafias',
    name: 'Zafias',
    image: 'img/zones/zafias.webp',
    width: 1434,
    height: 1097,
    number: 1,                 // mundo 1: sus paradas se numeran 1-1, 1-2…
    startScene: 'aldea',
    scenes: {
        aldea: {
            name: 'La aldea de Zafias',
            box: { x: 10, y: 290, w: 400, h: 530 },   // hasta la cueva del sur
            startAt: 'plaza',
            // El camino real baja de norte a sur por la aldea; la calle de la posada sale hacia el oeste
            forks: {
                plaza: { x: 345, y: 518 }, 'cruce-norte': { x: 300, y: 434 },
                'cruce-sur': { x: 306, y: 628 }, escalones: { x: 350, y: 708 }
            },
            points: [
                { id: 'posadera', kind: 'npc', name: 'Maela, la posadera', x: 190, y: 430, talk: [
                    { when: ['misionCumplida'], dialogue: 'posadera-despues' },
                    { when: ['defeated:grask'], dialogue: 'posadera-fin', set: 'misionCumplida', reward: { gold: 60, potions: 1 } },
                    { when: ['misionAceptada'], dialogue: 'posadera-espera' },
                    { dialogue: 'posadera-mision', set: 'misionAceptada' }
                ] },
                // Lugares: la posada (dormir cura y hace volver a los enemigos), la tienda y la cueva al descenso
                { id: 'posada', kind: 'inn', name: 'Posada: dormir', x: 150, y: 410 },
                { id: 'pozo', kind: 'poi', name: 'El pozo de la plaza', x: 226, y: 458, talk: [
                    { when: ['visto:pozo'], dialogue: 'pozo-visto' },
                    { dialogue: 'pozo', set: 'visto:pozo', reward: { gold: 10 } }
                ] },
                { id: 'tienda', kind: 'shop', name: 'Tienda y forja', x: 236, y: 525 },
                { id: 'herrero', kind: 'npc', name: 'Bram, el herrero', x: 268, y: 556, dialogue: 'herrero' },
                { id: 'mercado', kind: 'poi', name: 'Puestos del mercado', x: 268, y: 612, dialogue: 'mercado' },
                { id: 'cueva', kind: 'cave', name: 'Cueva del sur: bajar al descenso', x: 258, y: 806 },
                // Dos salidas al bosque: el camino real por el norte y el sendero del sur, junto a los escalones
                { id: 'al-bosque', kind: 'exit', name: 'Al bosque', x: 345, y: 352, to: 'bosque', arriveAt: 'a-la-aldea' },
                { id: 'al-bosque-sur', kind: 'exit', name: 'Al bosque (sur)', x: 402, y: 700, to: 'bosque', arriveAt: 'sendero-aldea' }
            ],
            links: [
                ['plaza', 'cruce-norte'],
                ['cruce-norte', 'al-bosque'],
                ['cruce-norte', 'pozo'],
                ['pozo', 'posadera'],
                ['posadera', 'posada'],
                ['plaza', 'tienda'],
                ['tienda', 'herrero'],
                ['plaza', 'cruce-sur'],
                ['cruce-sur', 'mercado'],
                ['cruce-sur', 'escalones'],
                ['escalones', 'al-bosque-sur'],
                // De los escalones viejos, monte abajo hasta el arco de la cueva
                ['escalones', 'cueva', [{ x: 336, y: 748 }, { x: 300, y: 782 }]]
            ]
        },
        bosque: {
            name: 'El bosque de los cruces',
            box: { x: 420, y: 262, w: 480, h: 478 },
            startAt: 'a-la-aldea',
            // El sendero de la valla sube al camino viejo, que cruza el bosque en diagonal hasta el este. Del poste
            // salen el sendero de la aldea (oeste) y el del puente (sur); por las ruinas se sube al cruce de la cascada
            forks: {
                'cruce-valla': { x: 548, y: 338 }, 'cruce-ruinas': { x: 702, y: 470 },
                'cruce-cascada': { x: 790, y: 304 }, 'orilla-este': { x: 798, y: 622 }
            },
            points: [
                { id: 'a-la-aldea', kind: 'exit', name: 'A la aldea', x: 438, y: 368, to: 'aldea', arriveAt: 'al-bosque' },
                { id: 'sendero-aldea', kind: 'exit', name: 'A la aldea (sur)', x: 432, y: 606, to: 'aldea', arriveAt: 'al-bosque-sur' },
                { id: 'goblin-1', kind: 'enemy', name: 'Goblin vigía', x: 500, y: 367,
                    enemy: { type: 'monster', floor: 0 }, dialogue: 'goblin-vigia' },
                { id: 'senda-santuario', kind: 'poi', name: 'La senda del santuario', x: 488, y: 284, dialogue: 'senda-santuario' },
                { id: 'goblin-2', kind: 'enemy', name: 'Goblin del camino', x: 636, y: 432, enemy: { type: 'monster', floor: 0 } },
                { id: 'poste', kind: 'poi', name: 'El poste de los cruces', x: 610, y: 530, dialogue: 'poste' },
                // Lobos: criaturas con nombre (src/data/creatures.js), con su dibujo y su forma de pelear
                { id: 'lobo-sendero', kind: 'enemy', name: 'Lobo de Zafias', x: 492, y: 592, enemy: { creature: 'lobo-de-zafias' } },
                { id: 'lobo-ruinas', kind: 'enemy', name: 'Lobo de Zafias', x: 752, y: 396, enemy: { creature: 'lobo-de-zafias' } },
                { id: 'goblin-puente', kind: 'enemy', name: 'Goblin del puente', x: 728, y: 616,
                    enemy: { type: 'monster', floor: 0 }, dialogue: 'goblin-puente' },
                { id: 'fardo', kind: 'poi', name: 'Un fardo en la orilla', x: 846, y: 596, talk: [
                    { when: ['visto:fardo'], dialogue: 'fardo-visto' },
                    { dialogue: 'fardo', set: 'visto:fardo', reward: { gold: 25 } }
                ] },
                { id: 'ruinas', kind: 'poi', name: 'Las ruinas del vigía', x: 736, y: 330, talk: [
                    { when: ['visto:ruinas'], dialogue: 'ruinas-visto' },
                    { dialogue: 'ruinas', set: 'visto:ruinas', reward: { potions: 1 } }
                ] },
                { id: 'camino-norte', kind: 'poi', name: 'El camino del norte', x: 772, y: 276, dialogue: 'camino-norte' },
                { id: 'goblin-3', kind: 'enemy', name: 'Goblin ladrón', x: 790, y: 508, enemy: { type: 'monster', floor: 1 } },
                // Limpio el bosque (y aceptada la misión), el sendero del este lleva al campamento goblin
                { id: 'al-campamento', kind: 'exit', name: 'Al campamento', x: 895, y: 534,
                    requires: ['misionAceptada', ...GOBLINS_DEL_BOSQUE], to: 'campamento', arriveAt: 'al-bosque-desde-campamento' }
            ],
            links: [
                ['a-la-aldea', 'goblin-1'],
                ['goblin-1', 'cruce-valla'],
                ['cruce-valla', 'senda-santuario'],
                ['cruce-valla', 'goblin-2'],
                ['goblin-2', 'cruce-ruinas'],
                ['cruce-ruinas', 'goblin-3'],
                ['goblin-3', 'al-campamento'],
                ['cruce-ruinas', 'poste'],
                ['poste', 'lobo-sendero'],
                ['lobo-sendero', 'sendero-aldea'],
                ['poste', 'goblin-puente', [{ x: 660, y: 554 }, { x: 700, y: 562 }, { x: 716, y: 592 }]],
                ['goblin-puente', 'orilla-este'],
                ['orilla-este', 'fardo'],
                ['fardo', 'al-campamento'],
                // Por las ruinas se sube al cruce de la cascada: el camino del norte, las ruinas y el puente del castillo
                ['cruce-ruinas', 'lobo-ruinas'],
                ['lobo-ruinas', 'cruce-cascada'],
                ['cruce-cascada', 'ruinas'],
                ['cruce-cascada', 'camino-norte']
            ]
        },
        campamento: {
            name: 'El campamento goblin',
            box: { x: 900, y: 430, w: 400, h: 340 },
            startAt: 'al-bosque-desde-campamento',
            forks: { claro: { x: 1092, y: 618 } },
            points: [
                { id: 'al-bosque-desde-campamento', kind: 'exit', name: 'Al bosque', x: 912, y: 548, to: 'bosque', arriveAt: 'al-campamento' },
                { id: 'guardia', kind: 'enemy', name: 'Goblin de guardia', x: 1012, y: 616,
                    enemy: { type: 'monster', floor: 2 }, dialogue: 'guardia' },
                { id: 'grask', kind: 'enemy', name: 'Grask, jefe goblin', sprite: 'grask', x: 1185, y: 640, once: true,
                    requires: ['defeated:guardia'], enemy: { type: 'subboss', floor: 1 }, dialogue: 'grask' },
                // Al norte del claro, la puerta de estandartes y el camino a la escalinata del castillo
                { id: 'estandartes', kind: 'poi', name: 'Los estandartes de Grask', x: 1138, y: 562, dialogue: 'estandartes' },
                { id: 'centinela', kind: 'enemy', name: 'Goblin centinela', x: 1146, y: 494,
                    enemy: { type: 'monster', floor: 2 }, dialogue: 'centinela' },
                { id: 'escalinata', kind: 'poi', name: 'La escalinata del castillo', x: 1150, y: 448, dialogue: 'escalinata' },
                // Al sureste, por donde huyen los rezagados: el botín de Grask (solo cuando ha caído)
                { id: 'rezagado', kind: 'enemy', name: 'Goblin rezagado', x: 1262, y: 700, enemy: { type: 'monster', floor: 2 } },
                { id: 'botin', kind: 'poi', name: 'El botín de Grask', x: 1284, y: 742, requires: ['defeated:grask'], talk: [
                    { when: ['visto:botin'], dialogue: 'botin-visto' },
                    { dialogue: 'botin', set: 'visto:botin', reward: { gold: 40, potions: 1 } }
                ] },
                { id: 'a-la-guarida', kind: 'exit', name: 'Bajar al barranco', x: 1302, y: 768, requires: ['defeated:grask'],
                    to: 'guarida', arriveAt: 'al-campamento-desde-guarida' }
            ],
            links: [
                ['al-bosque-desde-campamento', 'guardia'],
                ['guardia', 'claro'],
                ['claro', 'grask', [{ x: 1140, y: 634 }]],
                ['claro', 'estandartes'],
                ['estandartes', 'centinela'],
                ['centinela', 'escalinata'],
                ['grask', 'rezagado', [{ x: 1226, y: 652 }, { x: 1252, y: 674 }]],
                ['rezagado', 'botin'],
                ['botin', 'a-la-guarida']
            ]
        },
        // El jefe de Zafias: Feronius, el lobo alfa, en su cueva al fondo del barranco. Se llega tras vencer a Grask
        guarida: {
            name: 'La guarida del lobo',
            box: { x: 1150, y: 770, w: 284, h: 320 },
            startAt: 'al-campamento-desde-guarida',
            points: [
                { id: 'al-campamento-desde-guarida', kind: 'exit', name: 'Al campamento', x: 1306, y: 786,
                    to: 'campamento', arriveAt: 'a-la-guarida' },
                { id: 'lobo-guarida', kind: 'enemy', name: 'Lobo de Zafias', x: 1344, y: 842, enemy: { creature: 'lobo-de-zafias' } },
                { id: 'huesos', kind: 'poi', name: 'Huesos roídos', x: 1236, y: 930, dialogue: 'huesos' },
                { id: 'feronius', kind: 'enemy', name: 'Feronius el Feroz', x: 1290, y: 1008, once: true,
                    enemy: { creature: 'feronius' }, dialogue: 'feronius' }
            ],
            links: [
                ['al-campamento-desde-guarida', 'lobo-guarida'],
                ['lobo-guarida', 'huesos'],
                ['huesos', 'feronius']
            ]
        }
    }
};

// Los caminos sin recodos escritos aquí toman los que traza `node tools/trace-paths.mjs` siguiendo la tierra del mapa
// (zafias-paths.js). Llevan la marca 'auto' para que la herramienta sepa que puede volver a trazarlos.
for (const [sid, sc] of Object.entries(ZAFIAS.scenes)) {
    sc.links = sc.links.map(([a, b, via]) => {
        const auto = !via && ZAFIAS_PATHS[sid] && ZAFIAS_PATHS[sid][`${a}>${b}`];
        return auto ? [a, b, auto, 'auto'] : [a, b, via];
    });
}

// Diálogos: solo historia, «Siguiente» hasta el final. Borrador para corregir.
export const ZAFIAS_DIALOGUES = {
    'posadera-mision': [
        { who: 'Maela, la posadera', text: 'Otro que llega por el camino del norte… Tienes cara de no haber dormido en días.' },
        { who: 'Maela, la posadera', text: 'Desde que los goblins bajaron al bosque, nadie cruza hasta el castillo. Ni los mercaderes.' },
        { who: 'Maela, la posadera', text: 'Tres de ellos vigilan los cruces. Si los echas, el sendero del este te llevará hasta su campamento.' },
        { who: 'Maela, la posadera', text: 'Su jefe se hace llamar Grask. Acaba con él y esta posada te deberá algo más que una cama.' }
    ],
    'posadera-espera': [
        { who: 'Maela, la posadera', text: '¿Todavía aquí? Los goblins siguen en el bosque, y Grask en su campamento.' },
        { who: 'Maela, la posadera', text: 'Si vuelves herido, bebe algo. Y si caes… ya te recogeremos.' }
    ],
    'posadera-fin': [
        { who: 'Maela, la posadera', text: '¿Grask? ¿De verdad? ¡Los mercaderes volverán a pasar!' },
        { who: 'Maela, la posadera', text: 'Toma, es lo que pude juntar con los vecinos. Y una poción de las buenas, por si acaso.' }
    ],
    'posadera-despues': [
        { who: 'Maela, la posadera', text: 'El bosque respira otra vez. Pero dicen que de las cuevas del sur salen cosas peores…' },
        { who: 'Maela, la posadera', text: 'Y los leñadores juran que, pasado el campamento, aúlla algo más grande que un lobo.' }
    ],
    'posada-dormir': [
        { who: 'Posada de Zafias', text: 'Te dejas caer en la cama. Afuera, el bosque cruje toda la noche…' },
        { who: 'Posada de Zafias', text: 'Despiertas descansado. Pero en los caminos vuelven a oírse pasos de goblin.' }
    ],
    herrero: [
        { who: 'Bram, el herrero', text: '¿Esa espada? Ha visto días mejores. Y peores, a juzgar por las mellas.' },
        { who: 'Bram, el herrero', text: 'Tráeme hierro de las cuevas y te forjo algo que merezca la pena.' }
    ],
    pozo: [
        { who: 'El pozo de la plaza', text: 'El agua está tan clara que se ven monedas en el fondo. Alguien pidió muchos deseos.' },
        { who: 'El pozo de la plaza', text: 'Una se ha quedado en el borde, a tu alcance. Nadie mira… (+10 🪙)' }
    ],
    'pozo-visto': [
        { who: 'El pozo de la plaza', text: 'Las monedas del fondo siguen ahí. Las del borde, ya no.' }
    ],
    mercado: [
        { who: 'Puestos del mercado', text: 'Pan duro, cuerda, hierbas secas. Los mercaderes del castillo no llegan desde que los goblins cortan el bosque.' }
    ],
    'goblin-vigia': [
        { who: 'Goblin vigía', text: '¡Grrr! Este camino es nuestro. ¡Paga o sangra!' }
    ],
    'senda-santuario': [
        { who: 'La senda del santuario', text: 'La senda sube hacia unas piedras azuladas que brillan entre los árboles.' },
        { who: 'La senda del santuario', text: 'Se te eriza la piel. Todavía no es momento de subir.' }
    ],
    poste: [
        { who: 'El poste de los cruces', text: 'Al oeste: Zafias. Al sur: el puente viejo. Al este alguien ha tachado «castillo» y ha escrito «GRASK» con barro.' }
    ],
    'goblin-puente': [
        { who: 'Goblin del puente', text: '¡El puente es de pago! ¿No tienes monedas? ¡Pues pagas con la piel!' }
    ],
    fardo: [
        { who: 'Un fardo en la orilla', text: 'Un fardo de mercader, rajado a cuchillo. Los goblins se llevaron lo grande…' },
        { who: 'Un fardo en la orilla', text: '…pero no vieron la bolsa cosida en el forro. (+25 🪙)' }
    ],
    'fardo-visto': [
        { who: 'Un fardo en la orilla', text: 'Solo quedan trapos mojados.' }
    ],
    ruinas: [
        { who: 'Las ruinas del vigía', text: 'Una torre de vigía comida por el musgo. Dentro, un petate y un frasco olvidados.' },
        { who: 'Las ruinas del vigía', text: 'El frasco aún huele a hierbas buenas. (+1 🧪)' }
    ],
    'ruinas-visto': [
        { who: 'Las ruinas del vigía', text: 'Desde lo alto se ve el castillo. Las banderas siguen en las almenas.' }
    ],
    'camino-norte': [
        { who: 'El camino del norte', text: 'El camino sube junto a la cascada hasta un portón de madera. Está atrancado desde dentro.' }
    ],
    huesos: [
        { who: 'Huesos roídos', text: 'Huesos de ciervo, de jabalí… y una hebilla de goblin. Todos partidos por la mitad.' },
        { who: 'Huesos roídos', text: 'Lo que vive en esa cueva no come por hambre. Come porque puede.' }
    ],
    feronius: [
        { who: 'Feronius el Feroz', text: 'Entre las rocas de la cascada brillan dos ojos rojos. Un lobo enorme, con un collar de huesos, se levanta despacio.' },
        { who: 'Feronius el Feroz', text: 'No gruñe. No avisa. Solo baja la cabeza… y salta.' }
    ],
    guardia: [
        { who: 'Goblin de guardia', text: '¡Nadie entra en el campamento sin permiso de Grask!' }
    ],
    estandartes: [
        { who: 'Los estandartes de Grask', text: 'Dos estandartes rojos y una cadena de huesos. Al otro lado, el claro donde Grask reparte el botín.' }
    ],
    centinela: [
        { who: 'Goblin centinela', text: '¡Alto! Por aquí se va al castillo, ¡y el castillo es cosa de Grask!' }
    ],
    escalinata: [
        { who: 'La escalinata del castillo', text: 'Una escalinata enorme sube hasta las puertas del castillo de Zafias.' },
        { who: 'La escalinata del castillo', text: 'Arriba, un guardia te hace un gesto: «Cerrado hasta nueva orden». Otro día.' }
    ],
    grask: [
        { who: 'Grask, jefe goblin', text: '¿Así que tú eres quien anda cazando a mis chicos?' },
        { who: 'Grask, jefe goblin', text: 'Este bosque es de Grask. ¡Y tu cabeza también lo será!' }
    ],
    botin: [
        { who: 'El botín de Grask', text: 'Bajo una lona, lo que Grask robó a los mercaderes. Casi todo es chatarra…' },
        { who: 'El botín de Grask', text: '…casi. (+40 🪙, +1 🧪)' }
    ],
    'botin-visto': [
        { who: 'El botín de Grask', text: 'Ya solo quedan cacharros rotos.' }
    ]
};

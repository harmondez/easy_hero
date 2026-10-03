// =============================================
// 🧭 Zafias — la primera zona del Modo Aventura
// Coordenadas en píxeles lógicos del mapa (1434×1097), vista cenital. La imagen img/zones/zafias.webp va a ×3
// (recompuesta en HD con tools/assemble-map.mjs) y se estira a ese tamaño: las coordenadas no cambian.
// Cada escena es un recuadro del mapa que la cámara encuadra (o un cuadro propio: la aldea y las casas del camino);
// los puntos son lo que se puede pulsar.
//   `startAt`  parada donde apareces al entrar en la escena · `forks` cruces de camino (sin parada)
//   `links`    caminos a trazos entre paradas/cruces: [desde, hasta, recodos opcionales]. Los recodos siguen la
//              tierra pintada del mapa, para que la línea vaya por el camino y no a través de los árboles
//   `arriveAt` (en las salidas) la parada de la escena de destino donde apareces
//   `kind`     npc · enemy · exit · inn · shop · cave · poi (punto de interés: se mira o se registra, con `dialogue`
//              o con `talk`, como un NPC; un hallazgo da su `reward` una sola vez con la marca `visto:<id>`)
//   `enemy`    contra qué se pelea (tipo y piso fijan su fuerza: la dificultad es fija por zona); `enemy.rules` le
//              añade reglas de combate, como las de creatures.js (p. ej. los efectos de estado que pone al golpear)
//   `once`     el enemigo no vuelve nunca (jefes de misión); los demás reaparecen al dormir en la posada
//   `sprite`   (enemigos) con qué id se busca su imagen en src/data/art.js (enemigo_<sprite>); si no, por su nombre
//   `requires` marcas de la historia que hacen falta para que el punto aparezca (todas)
//   `talk`     lo que dice un NPC según la historia: gana la primera entrada cuyas marcas `when` se cumplen
//              (`set` pone una marca al terminar de hablar; `reward` da oro y pociones una sola vez;
//              `reward.item` da un objeto del equipo de la aventura, src/data/gear.js;
//              `whenCount: { creature, n }` exige además haber vencido n criaturas de ese tipo para una misión)
//              `whenItem: { material, n }` exige llevar n de ese material; `unless: [marcas]` descarta la entrada si ya
//              tienes alguna; `take: { material, n }` se queda con lo que entregas; `reward` admite además `xp`,
//              `material` (uno, de src/data/loot.js) y `food` (una, de src/data/effects.js))
//   `menu`     lo que se puede hacer en la parada: 'talk' · 'sleep' · 'shop' · 'upgrade' · 'leave'. Con `talkFirst`,
//              primero habla y luego sale el menú. `shop` = su tienda (src/data/shops.js); sin menú, se abre al
//              terminar de hablar. `menuText`, `shopLabel` y `who` (cómo se llama quien atiende) son opcionales
//   Una escena puede tener su propio cuadro: `image`, `width`, `height` (sus coordenadas van de 0 a ese tamaño)
// Marcas: `defeated:<id>` al vencer a ese enemigo (permanente) y las que pongan los diálogos.
// =============================================
import { ZAFIAS_PATHS } from './zafias-paths.js?v=1.10.0';

// Los goblins de Zafias pelean con cuchillos sucios: a veces envenenan (src/data/effects.js)
const GOBLIN = { onHit: [{ id: 'veneno', power: 1, turns: 3, chance: 0.35 }] };

const GOBLINS_DEL_BOSQUE = ['defeated:goblin-1', 'defeated:goblin-2', 'defeated:goblin-3'];

export const ZAFIAS = {
    id: 'zafias',
    name: 'Zafias',
    image: 'img/zones/zafias.webp',
    width: 1434,
    height: 1097,
    startScene: 'aldea',
    scenes: {
        aldea: {
            name: 'La aldea de Zafias',
            // Cuadro propio (hecho con la fábrica, tipo `scene`): la imagen va a ×2 de estas coordenadas
            image: 'img/zones/zafias-aldea.webp', width: 600, height: 448,
            box: { x: 0, y: 0, w: 600, h: 448 },
            startAt: 'plaza',
            // La calle da la vuelta a la plaza del pozo: la posada y la forja al oeste, la botica al este, el mercado al sur
            forks: {
                plaza: { x: 300, y: 298 }, 'cruce-norte': { x: 300, y: 152 },
                'esquina-posada': { x: 218, y: 168 }, 'esquina-botica': { x: 402, y: 164 },
                'esquina-forja': { x: 214, y: 292 }, 'esquina-sendero': { x: 406, y: 296 }, escalones: { x: 92, y: 306 }
            },
            points: [
                // La posada: Evelyn (la misión de Grask), dormir (de pago hasta que acabas con él) y el pan
                { id: 'posada', kind: 'inn', name: 'La posada', who: 'Evelyn', x: 197, y: 158,
                    menu: ['talk', 'sleep', 'shop', 'leave'], shop: 'posada', shopLabel: 'Comprar pan',
                    menuText: 'Sofás, estanterías hasta el techo y olor a papel. Evelyn te mira por encima de un libro.',
                    talk: [
                        { when: ['misionCumplida'], dialogue: 'posadera-despues' },
                        { when: ['defeated:grask'], dialogue: 'posadera-fin', set: 'misionCumplida', reward: { gold: 60, potions: 1 } },
                        { when: ['misionAceptada'], dialogue: 'posadera-espera' },
                        { dialogue: 'posadera-mision', set: 'misionAceptada' }
                    ] },
                // La forja: Bram habla (su misión) y después pregunta: Comprar · Mejorar · Salir
                { id: 'herrero', kind: 'npc', name: 'Bram, el herrero', x: 152, y: 282,
                    talkFirst: true, menu: ['shop', 'upgrade', 'leave'], shop: 'forja', menuText: '«¿Qué va a ser?»',
                    talk: [
                        { when: ['colmillo:cumplida'], dialogue: 'herrero-despues' },
                        { when: ['colmillo:aceptada'], whenItem: { material: 'colmillo-feronius', n: 1 }, dialogue: 'herrero-colmillo-fin',
                            set: 'colmillo:cumplida', take: { material: 'colmillo-feronius', n: 1 }, reward: { gold: 30, item: 'espada-de-zafias' } },
                        { when: ['colmillo:aceptada'], dialogue: 'herrero-colmillo-espera' },
                        { dialogue: 'herrero', set: 'colmillo:aceptada' }
                    ] },
                // La botica: Amelie habla (su misión) y abre la tienda
                { id: 'boticaria', kind: 'npc', name: 'Amelie, la boticaria', x: 410, y: 238, shop: 'botica',
                    talk: [
                        { when: ['plantas:cumplida'], dialogue: 'boticaria-despues' },
                        { when: ['plantas:aceptada'], whenItem: { material: 'planta-medicinal', n: 3 }, dialogue: 'boticaria-fin',
                            set: 'plantas:cumplida', take: { material: 'planta-medicinal', n: 3 }, reward: { gold: 40, xp: 30, potions: 2 } },
                        { when: ['plantas:aceptada'], dialogue: 'boticaria-espera' },
                        { dialogue: 'boticaria', set: 'plantas:aceptada' }
                    ] },
                { id: 'pozo', kind: 'poi', name: 'El pozo de la plaza', x: 300, y: 262, talk: [
                    { when: ['visto:pozo'], dialogue: 'pozo-visto' },
                    { dialogue: 'pozo', set: 'visto:pozo', reward: { gold: 10 } }
                ] },
                { id: 'mercado', kind: 'poi', name: 'Puestos del mercado', x: 342, y: 300, dialogue: 'mercado' },
                { id: 'cueva', kind: 'poi', name: 'Cueva del sur', x: 128, y: 420, dialogue: 'cueva' },
                // Salidas: el camino real por el norte, el sendero del sureste y el camino de las casas
                { id: 'al-bosque', kind: 'exit', name: 'Al bosque', x: 300, y: 20, to: 'bosque', arriveAt: 'a-la-aldea' },
                { id: 'al-bosque-sur', kind: 'exit', name: 'Al bosque (sur)', x: 590, y: 432, to: 'bosque', arriveAt: 'sendero-aldea' },
                { id: 'a-las-casas', kind: 'exit', name: 'A las casas', x: 584, y: 78, to: 'casas', arriveAt: 'a-la-aldea-desde-casas' }
            ],
            links: [
                ['al-bosque', 'cruce-norte'],
                ['cruce-norte', 'esquina-posada'],
                ['esquina-posada', 'posada'],
                ['cruce-norte', 'esquina-botica'],
                ['esquina-botica', 'a-las-casas'],
                ['esquina-botica', 'boticaria'],
                ['boticaria', 'esquina-sendero'],
                ['esquina-sendero', 'al-bosque-sur'],
                ['esquina-sendero', 'mercado'],
                ['mercado', 'plaza'],
                ['plaza', 'pozo'],
                ['plaza', 'esquina-forja'],
                ['esquina-forja', 'herrero'],
                ['esquina-forja', 'esquina-posada'],
                ['esquina-forja', 'escalones'],
                // Por los escalones viejos, peña abajo hasta el arco de la cueva
                ['escalones', 'cueva', [{ x: 62, y: 350 }, { x: 50, y: 400 }, { x: 84, y: 428 }]]
            ]
        },
        // Tres casas en el camino del este: Odo (lecciones y los goblins), Hilda (los lobos) y Nell
        casas: {
            name: 'Las casas del camino',
            image: 'img/zones/zafias-casas.webp', width: 600, height: 448,
            box: { x: 0, y: 0, w: 600, h: 448 },
            startAt: 'a-la-aldea-desde-casas',
            forks: { patio: { x: 300, y: 228 } },
            points: [
                { id: 'a-la-aldea-desde-casas', kind: 'exit', name: 'A la aldea', x: 16, y: 228, to: 'aldea', arriveAt: 'a-las-casas' },
                // Odo habla (su misión) y abre sus lecciones: las mejoras permanentes
                { id: 'odo', kind: 'npc', name: 'Odo, el veterano', x: 296, y: 170, shop: 'instructor', talk: [
                    { when: ['goblins-odo:cumplida'], dialogue: 'odo-despues' },
                    { when: ['goblins-odo:aceptada'], whenCount: { creature: 'goblin', n: 6 }, dialogue: 'odo-fin',
                        set: 'goblins-odo:cumplida', reward: { gold: 50, xp: 40 } },
                    { when: ['goblins-odo:aceptada'], dialogue: 'odo-espera' },
                    { dialogue: 'odo', set: 'goblins-odo:aceptada' }
                ] },
                { id: 'hilda', kind: 'npc', name: 'Hilda, la curtidora', x: 432, y: 228, talk: [
                    { when: ['lobos-hilda:cumplida'], dialogue: 'hilda-despues' },
                    { when: ['lobos-hilda:aceptada'], whenCount: { creature: 'lobo-de-zafias', n: 4 }, dialogue: 'hilda-fin',
                        set: 'lobos-hilda:cumplida', reward: { gold: 45, xp: 40 } },
                    { when: ['lobos-hilda:aceptada'], dialogue: 'hilda-espera' },
                    { dialogue: 'hilda', set: 'lobos-hilda:aceptada' }
                ] },
                { id: 'nell', kind: 'npc', name: 'Nell, la abuela', x: 262, y: 276, talk: [
                    { when: ['nell:pan'], dialogue: 'nell-despues' },
                    { dialogue: 'nell', set: 'nell:pan', reward: { food: 'pan' } }
                ] },
                { id: 'camino-viejo', kind: 'poi', name: 'El camino viejo', x: 452, y: 290, dialogue: 'camino-viejo' }
            ],
            links: [
                ['a-la-aldea-desde-casas', 'patio'],
                ['patio', 'odo'],
                ['patio', 'hilda'],
                ['patio', 'nell'],
                ['patio', 'camino-viejo']
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
                    enemy: { type: 'monster', floor: 0, rules: GOBLIN, drops: 'goblin' }, dialogue: 'goblin-vigia' },
                { id: 'senda-santuario', kind: 'poi', name: 'La senda del santuario', x: 488, y: 284, talk: [
                    { when: ['plantas:aceptada'], unless: ['planta:senda'], dialogue: 'planta-senda', set: 'planta:senda', reward: { material: 'planta-medicinal' } },
                    { dialogue: 'senda-santuario', set: 'visto:senda-santuario' }
                ] },
                { id: 'goblin-2', kind: 'enemy', name: 'Goblin del camino', x: 636, y: 432, enemy: { type: 'monster', floor: 0, rules: GOBLIN, drops: 'goblin', rare: 'goblin' } },
                { id: 'poste', kind: 'poi', name: 'El poste de los cruces', x: 610, y: 530, dialogue: 'poste' },
                // Lobos: criaturas con nombre (src/data/creatures.js), con su dibujo y su forma de pelear
                { id: 'lobo-sendero', kind: 'enemy', name: 'Lobo de Zafias', x: 492, y: 592, enemy: { creature: 'lobo-de-zafias' } },
                { id: 'lobo-ruinas', kind: 'enemy', name: 'Lobo de Zafias', x: 752, y: 396, enemy: { creature: 'lobo-de-zafias' } },
                { id: 'goblin-puente', kind: 'enemy', name: 'Goblin del puente', x: 728, y: 616,
                    enemy: { type: 'monster', floor: 0, rules: GOBLIN, drops: 'goblin' }, dialogue: 'goblin-puente' },
                { id: 'fardo', kind: 'poi', name: 'Un fardo en la orilla', x: 846, y: 596, talk: [
                    { when: ['visto:fardo'], dialogue: 'fardo-visto' },
                    { dialogue: 'fardo', set: 'visto:fardo', reward: { gold: 25 } }
                ] },
                { id: 'ruinas', kind: 'poi', name: 'Las ruinas del vigía', x: 736, y: 330, talk: [
                    { when: ['plantas:aceptada', 'visto:ruinas'], unless: ['planta:ruinas'], dialogue: 'planta-ruinas', set: 'planta:ruinas', reward: { material: 'planta-medicinal' } },
                    { when: ['visto:ruinas'], dialogue: 'ruinas-visto' },
                    { dialogue: 'ruinas', set: 'visto:ruinas', reward: { potions: 1 } }
                ] },
                { id: 'camino-norte', kind: 'poi', name: 'El camino del norte', x: 772, y: 276, dialogue: 'camino-norte' },
                { id: 'goblin-3', kind: 'enemy', name: 'Goblin ladrón', x: 790, y: 508, enemy: { type: 'monster', floor: 1, rules: GOBLIN, drops: 'goblin', rare: 'goblin' } },
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
                    enemy: { type: 'monster', floor: 2, rules: GOBLIN, drops: 'goblin' }, dialogue: 'guardia' },
                { id: 'grask', kind: 'enemy', name: 'Grask, jefe goblin', sprite: 'grask', x: 1185, y: 640, once: true,
                    requires: ['defeated:guardia'], enemy: { type: 'subboss', floor: 1, rules: { ...GOBLIN, stunOnHeavy: 1.5 } }, dialogue: 'grask' },
                // Al norte del claro, la puerta de estandartes y el camino a la escalinata del castillo
                { id: 'estandartes', kind: 'poi', name: 'Los estandartes de Grask', x: 1138, y: 562, dialogue: 'estandartes' },
                { id: 'centinela', kind: 'enemy', name: 'Goblin centinela', x: 1146, y: 494,
                    enemy: { type: 'monster', floor: 2, rules: GOBLIN, drops: 'goblin' }, dialogue: 'centinela' },
                { id: 'escalinata', kind: 'poi', name: 'La escalinata del castillo', x: 1150, y: 448, talk: [
                    { when: ['plantas:aceptada'], unless: ['planta:escalinata'], dialogue: 'planta-escalinata', set: 'planta:escalinata', reward: { material: 'planta-medicinal' } },
                    { dialogue: 'escalinata', set: 'visto:escalinata' }
                ] },
                // Al sureste, por donde huyen los rezagados: el botín de Grask (solo cuando ha caído)
                { id: 'rezagado', kind: 'enemy', name: 'Goblin rezagado', x: 1262, y: 700, enemy: { type: 'monster', floor: 2, rules: GOBLIN, drops: 'goblin', rare: 'goblin' } },
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

// Diálogos: solo historia, «Siguiente» hasta el final. {heroe} = el nombre del jugador.
// Las líneas de narración (lo que pasa, no lo que se dice) llevan como `who` el lugar: «Posada de Zafias», «La fragua»…
// Estilo: gente de pueblo, frases llanas. Evelyn, seca y recta; Bram, poco y al grano; Amelie, tímida, a trompicones;
// Odo, como un sargento; Hilda, directa y con guasa; Nell, charlatana; los goblins, a gritos.
export const ZAFIAS_DIALOGUES = {
    // --- La posada: Evelyn, posadera y bibliotecaria ---
    'posadera-mision': [
        { who: 'Evelyn, la posadera', text: 'Límpiate las botas antes de pisar la alfombra. Y no toques los libros con esas manos.' },
        { who: 'Evelyn, la posadera', text: 'Soy Evelyn. Llevo la posada y la biblioteca de Zafias, que son la misma casa. La cama cuesta cinco monedas la noche. Aquí no se fía.' },
        { who: '{heroe}', text: 'Desperté en unas ruinas, en el bosque. No sé cómo llegué hasta allí. No recuerdo nada, solo que me llamo {heroe}.' },
        { who: 'Evelyn, la posadera', text: '¿Las ruinas de la loma? Allí no sube nadie. Lo siento por ti, pero la cama sigue costando cinco monedas.' },
        { who: 'Evelyn, la posadera', text: 'Te voy a ser clara, {heroe}. Antes tenía las camas llenas cada noche. Ahora no viene nadie: un goblin que se hace llamar Grask asalta a los viajeros en el bosque, y ya nadie se atreve a pasar.' },
        { who: 'Evelyn, la posadera', text: 'Tiene tres vigías en los cruces. Si los echas, se abre el sendero del este, el que lleva a su campamento.' },
        { who: 'Evelyn, la posadera', text: 'Encárgate de él, por favor. No te lo pediría si tuviera a quién.' }
    ],
    'posadera-espera': [
        { who: 'Evelyn, la posadera', text: 'Grask sigue en el bosque y mis camas siguen vacías.' },
        { who: 'Evelyn, la posadera', text: 'Si necesitas descansar, ya sabes lo que cuesta. Y si coges un libro, lo dejas donde estaba.' }
    ],
    'posadera-fin': [
        { who: 'Evelyn, la posadera', text: '¿Grask? ¿Estás seguro? ¿Lo has visto caer?' },
        { who: '{heroe}', text: 'Lo he visto caer. No volverá a asaltar a nadie en el bosque.' },
        { who: 'Posada de Zafias', text: 'Evelyn cierra el libro que tenía en las manos. Es la primera vez que la ves sonreír.' },
        { who: 'Evelyn, la posadera', text: 'Toma. Es lo que hemos juntado entre los vecinos, y una poción que tenía guardada. (+60 🪙, +1 🧪)' },
        { who: 'Evelyn, la posadera', text: 'Y otra cosa: desde hoy no pagas por dormir aquí. Tu cama es gratis, todas las noches que quieras.' }
    ],
    'posadera-despues': [
        { who: 'Evelyn, la posadera', text: 'Han vuelto los viajeros. Anoche tuve cuatro camas ocupadas, y uno hasta devolvió el libro que se había llevado.' },
        { who: 'Evelyn, la posadera', text: 'Los leñadores dicen que pasado el campamento, hacia el sureste, aúlla algo. Más grande que un lobo. Nadie quiere ir a mirar.' },
        { who: 'Evelyn, la posadera', text: 'Y otra cosa, {heroe}. Ayer un buhonero preguntó si había llegado alguien que no recordara nada. No quiso decir para qué. No me gustó cómo lo preguntaba.' }
    ],
    'posada-dormir': [
        { who: 'Posada de Zafias', text: 'Subes a la habitación del fondo. La cama cruje y la manta huele a humo. Te duermes sin quitarte las botas.' },
        { who: 'Posada de Zafias', text: 'Sueñas con unas piedras azules que brillan en la oscuridad. Alguien dice tu nombre.' },
        { who: 'Posada de Zafias', text: 'Te despierta el gallo. Estás como nuevo. Por la ventana se oyen los cuernos de los goblins: han vuelto a los caminos.' }
    ],

    // --- La forja: Bram ---
    herrero: [
        { who: 'Bram, el herrero', text: 'A ver esa espada. … Está mellada, mal templada y tiene una costra en la cruz que no es óxido.' },
        { who: 'Bram, el herrero', text: 'El hierro es de fragua pobre. Pero la empuñadura no es de aquí. Ni de ninguna fragua que yo conozca, y conozco todas las del valle.' },
        { who: 'Bram, el herrero', text: 'Te propongo un trato. Pasado el campamento goblin, al sureste, tiene su guarida un lobo enorme. Los cazadores lo llaman Feronius.' },
        { who: 'Bram, el herrero', text: 'Tráeme un colmillo suyo. Molido con el carbón da un temple que no se consigue con nada más. No me preguntes por qué funciona.' },
        { who: 'Bram, el herrero', text: 'Y te forjo una hoja que no se doble al primer golpe. Mientras tanto, vendo espadas y cristales de mejora. Con un cristal le saco más filo a la que lleves.' }
    ],
    'herrero-colmillo-espera': [
        { who: 'Bram, el herrero', text: 'El colmillo de Feronius, entero. Cuando lo tengas, hablamos de tu espada.' }
    ],
    'herrero-colmillo-fin': [
        { who: 'Bram, el herrero', text: '¿Este es el colmillo? Es más largo que mi mano. A ver… Sí. Con esto el acero va a cantar.' },
        { who: 'La forja', text: 'Bram trabaja toda la tarde sin hablar. Suena el martillo, resopla el fuelle y chilla el agua cada vez que la hoja entra en el barril.' },
        { who: 'Bram, el herrero', text: 'Aquí la tienes. La primera hoja de este temple: la Espada de Zafias.' },
        { who: 'Bram, el herrero', text: 'Es más larga y tiene más filo, y el borde dentado abre heridas que tardan en cerrar. Cuídala. Y toma esto por el colmillo. (+30 🪙, ⚔️ Espada de Zafias)' }
    ],
    'herrero-despues': [
        { who: 'Bram, el herrero', text: 'El acero me sale mejor que nunca. Si algún día bajas a las cuevas del sur y vuelves con hierro de allí, tráemelo.' }
    ],

    // --- La botica: Amelie ---
    boticaria: [
        { who: 'La botica', text: 'La tienda huele a menta y a alcohol. Detrás del mostrador, una chica joven ordena frascos sin levantar la vista.' },
        { who: 'Amelie, la boticaria', text: 'Ah… perdona, no te había oído entrar. Soy Amelie. La botica era de mis padres. Ahora la llevo yo sola.' },
        { who: 'Amelie, la boticaria', text: 'Mi hermana pequeña está enferma y no puedo dejarla mucho rato. Y me estoy quedando sin plantas para su medicina.' },
        { who: 'Amelie, la boticaria', text: 'Antes las recogía yo en el bosque, pero con los goblins ya no me atrevo. ¿Podrías… podrías traerme tres plantas medicinales?' },
        { who: 'Amelie, la boticaria', text: 'Crecen junto a las piedras viejas: en la senda del santuario, en las ruinas del vigía y en la escalinata del castillo. Tienen la flor blanca.' },
        { who: 'Amelie, la boticaria', text: 'Te lo pagaré, de verdad. Y si necesitas pociones… es lo que vendo.' }
    ],
    'boticaria-espera': [
        { who: 'Amelie, la boticaria', text: 'Hola otra vez… ¿Has encontrado alguna planta? Me hacen falta tres. Mira lo que necesites.' }
    ],
    'boticaria-fin': [
        { who: 'Amelie, la boticaria', text: '¿Las tres? ¡Y con la raíz entera!' },
        { who: 'La botica', text: 'Amelie las envuelve en un paño húmedo con mucho cuidado. Desde la trastienda llega una tos, y una voz pequeña pregunta quién ha venido.' },
        { who: 'Amelie, la boticaria', text: 'Con esto tengo medicina para todo el invierno. Gracias, {heroe}. Toma, no es mucho. (+40 🪙, +30 XP, +2 🧪)' }
    ],
    'boticaria-despues': [
        { who: 'Amelie, la boticaria', text: 'Mi hermana ha dormido la noche entera. Hacía semanas que no. Mira lo que necesites.' }
    ],
    'planta-senda': [
        { who: 'La senda del santuario', text: 'Entre los helechos, al pie de una piedra, crece una mata de hojas anchas y flores blancas. Es la planta que te describió Amelie. La arrancas con la raíz. (+1 Planta medicinal)' }
    ],
    'planta-ruinas': [
        { who: 'Las ruinas del vigía', text: 'En una grieta del muro, al abrigo del viento, hay una mata de flores blancas. La sacas con cuidado, con la raíz. (+1 Planta medicinal)' }
    ],
    'planta-escalinata': [
        { who: 'La escalinata del castillo', text: 'Entre dos escalones rotos ha salido una mata de flores blancas. Nadie la ha pisado en mucho tiempo. Te la llevas. (+1 Planta medicinal)' }
    ],

    // --- Las casas del camino: Odo, Hilda y Nell ---
    odo: [
        { who: 'Las casas del camino', text: 'Un hombre de pelo gris golpea un muñeco de paja con una espada de madera. Se apoya en un bastón, pero pega fuerte.' },
        { who: 'Odo, el veterano', text: 'Coges mal la espada. No te ofendas: casi todo el mundo la coge mal.' },
        { who: 'Odo, el veterano', text: 'Soy Odo. Fui soldado treinta años, hasta que la rodilla dijo basta.' },
        { who: 'Odo, el veterano', text: 'Yo ya no puedo salir a los caminos, pero los goblins siguen ahí. Tumba a seis y te pago por ello. Me da igual cuáles.' },
        { who: 'Odo, el veterano', text: 'Y si quieres aprender a pelear mejor, enseño. No es gratis.' }
    ],
    'odo-espera': [
        { who: 'Odo, el veterano', text: 'Seis goblins. Cuando los tengas, vuelves. ¿Una lección mientras tanto?' }
    ],
    'odo-fin': [
        { who: 'Odo, el veterano', text: '¿Seis? Bien. Se te nota en cómo andas: ya no miras al suelo.' },
        { who: 'Odo, el veterano', text: 'Lo prometido. (+50 🪙, +40 XP)' }
    ],
    'odo-despues': [
        { who: 'Odo, el veterano', text: 'Los caminos están algo mejor. ¿Una lección?' }
    ],
    hilda: [
        { who: 'Hilda, la curtidora', text: 'Cuidado con las tinas, que eso no es agua. Soy Hilda. Curto pieles. Si algo huele mal por aquí, soy yo.' },
        { who: 'Hilda, la curtidora', text: 'Lavo las pieles en el arroyo del bosque, pero los lobos han bajado y ya me han seguido dos veces.' },
        { who: 'Hilda, la curtidora', text: 'Quítame cuatro de en medio y te pago bien. Andan por el sendero y por las ruinas.' }
    ],
    'hilda-espera': [
        { who: 'Hilda, la curtidora', text: 'Cuatro lobos. Vuelven al bosque cada noche: si te faltan, duerme y mañana habrá más.' }
    ],
    'hilda-fin': [
        { who: 'Hilda, la curtidora', text: '¿Cuatro? Pues mañana vuelvo al arroyo.' },
        { who: 'Hilda, la curtidora', text: 'Toma. Te lo has ganado. (+45 🪙, +40 XP)' }
    ],
    'hilda-despues': [
        { who: 'Hilda, la curtidora', text: 'Hoy he lavado en el arroyo sin mirar atrás ni una vez.' }
    ],
    nell: [
        { who: 'Nell, la abuela', text: '¡Uy, una cara nueva! Acércate, que de lejos no veo bien.' },
        { who: 'Nell, la abuela', text: 'Soy Nell. Tengo abejas, un huerto y demasiado tiempo. Tú debes de ser quien apareció en las ruinas. Aquí se sabe todo.' },
        { who: 'Nell, la abuela', text: 'Estás en los huesos. Toma, pan de esta mañana. Cómetelo por el camino, cuando te flaqueen las piernas. (+1 Hogaza de pan)' }
    ],
    'nell-despues': [
        { who: 'Nell, la abuela', text: 'Evelyn parece seca, pero deja una luz encendida toda la noche por si llega alguien. No le digas que te lo he dicho.' }
    ],
    'camino-viejo': [
        { who: 'El camino viejo', text: 'El camino sigue hacia el sureste y se pierde entre los árboles. Las rodadas están llenas de hierba: hace mucho que no pasa un carro.' }
    ],

    // --- La aldea ---
    pozo: [
        { who: 'El pozo de la plaza', text: 'El brocal está gastado de tanto cubo. Abajo el agua es clara y se ven las monedas del fondo: los deseos de toda la aldea.' },
        { who: 'El pozo de la plaza', text: 'Una moneda se ha quedado en el borde de piedra, a tu alcance. Miras alrededor. Nadie mira. (+10 🪙)' }
    ],
    'pozo-visto': [
        { who: 'El pozo de la plaza', text: 'Las monedas del fondo siguen ahí. La del borde, ya no.' }
    ],
    cueva: [
        { who: 'Cueva del sur', text: 'De la cueva sube un aire frío que huele a piedra mojada.' },
        { who: 'Cueva del sur', text: 'Das un paso dentro. Está muy oscuro, y notas que hay algo al fondo.' },
        { who: 'Cueva del sur', text: 'Algo te dice que todavía no estás preparado para entrar aquí. Retrocedes despacio.' }
    ],
    mercado: [
        { who: 'Puestos del mercado', text: 'Pan de ayer, cuerda, manojos de hierbas secas colgados de un clavo. La mitad de los puestos están vacíos.' },
        { who: 'Puestos del mercado', text: 'Una vendedora ve tu espada y baja la voz: «Desde que los goblins cortan el bosque no llega nada del castillo. Ni sal ni noticias».' }
    ],

    // --- El bosque de los cruces ---
    'goblin-vigia': [
        { who: 'Goblin vigía', text: '¡Eh, tú! ¡Alto ahí! Este camino es de Grask.' },
        { who: 'Goblin vigía', text: '¿Llevas monedas? ¿No? Pues pagas con sangre.' }
    ],
    'senda-santuario': [
        { who: 'La senda del santuario', text: 'La senda sube entre helechos hasta unas piedras azuladas que brillan con una luz suave.' },
        { who: 'La senda del santuario', text: 'Al acercarte la luz se hace más fuerte. Por un momento te parece oír tu nombre, muy bajito.' },
        { who: 'La senda del santuario', text: 'Todavía no. No sabes por qué, pero lo sabes. Das media vuelta y la luz se apaga.' }
    ],
    poste: [
        { who: 'El poste de los cruces', text: 'Un poste torcido con tres tablas. Al oeste: «Zafias». Al sur: «Puente viejo».' },
        { who: 'El poste de los cruces', text: 'La tabla del este decía «Castillo». Alguien la ha tachado y ha escrito encima con barro: «GRASK».' }
    ],
    'goblin-puente': [
        { who: 'Goblin del puente', text: '¡Puente de pago! Una moneda por pasar y dos por volver.' },
        { who: 'Goblin del puente', text: '¿No llevas? ¡Pues te cobro en dientes!' }
    ],
    fardo: [
        { who: 'Un fardo en la orilla', text: 'Un fardo de mercader tirado en el barro, rajado de arriba abajo. Los goblins se llevaron las telas y las especias…' },
        { who: 'Un fardo en la orilla', text: '…pero nadie miró el forro. Cosida por dentro hay una bolsa pequeña y pesada. (+25 🪙)' }
    ],
    'fardo-visto': [
        { who: 'Un fardo en la orilla', text: 'Solo quedan trapos empapados y olor a canela.' }
    ],
    ruinas: [
        { who: 'Las ruinas del vigía', text: 'Una torre de vigía medio caída, con raíces por todas partes. Dentro hay un petate podrido y un frasco que alguien dejó.' },
        { who: 'Las ruinas del vigía', text: 'El tapón aguanta. Huele a hierbas y a aguardiente: una poción. (+1 🧪)' }
    ],
    'ruinas-visto': [
        { who: 'Las ruinas del vigía', text: 'Desde lo alto de la torre se ve el castillo de Zafias. Las banderas siguen en las almenas, pero no se asoma nadie.' }
    ],
    'camino-norte': [
        { who: 'El camino del norte', text: 'El camino sube junto a la cascada hasta un portón de troncos, atrancado por dentro.' },
        { who: 'El camino del norte', text: 'Pegas la oreja a la madera. No se oye nada, ni pasos ni voces.' }
    ],

    // --- La guarida del lobo ---
    huesos: [
        { who: 'Huesos roídos', text: 'Huesos de ciervo, de jabalí y la hebilla de un cinturón goblin. Todos partidos a lo largo para sacarles el tuétano.' },
        { who: 'Huesos roídos', text: 'Las marcas de dientes son más anchas que tu mano. Lo que vive en esa cueva es muy grande.' }
    ],
    feronius: [
        { who: 'Feronius el Feroz', text: 'Entre las rocas de la cascada se encienden dos ojos rojos, demasiado altos para ser de un lobo cualquiera.' },
        { who: 'Feronius el Feroz', text: 'Sale de la sombra sin prisa. Es enorme y gris como la ceniza, y lleva un collar de huesos que suenan al andar. Algunos son de goblin.' },
        { who: 'Feronius el Feroz', text: 'No gruñe ni avisa. Baja la cabeza y salta.' }
    ],

    // --- El campamento goblin ---
    guardia: [
        { who: 'Goblin de guardia', text: '¡Alto! Nadie entra en el campamento sin permiso de Grask.' },
        { who: 'Goblin de guardia', text: 'Y Grask no da permisos. Da palos.' }
    ],
    estandartes: [
        { who: 'Los estandartes de Grask', text: 'Dos estandartes de tela roja mal cosidos y, entre ellos, una cadena con huesos y cascabeles colgados.' },
        { who: 'Los estandartes de Grask', text: 'Más allá, en el claro, se oyen risas y monedas: Grask reparte lo que ha robado.' }
    ],
    centinela: [
        { who: 'Goblin centinela', text: '¡Alto! Por ahí se sube al castillo.' },
        { who: 'Goblin centinela', text: 'Y el castillo es cosa de Grask. Bueno, lo será. Cuando él quiera.' }
    ],
    escalinata: [
        { who: 'La escalinata del castillo', text: 'Una escalinata de piedra blanca sube hasta las puertas del castillo de Zafias.' },
        { who: 'La escalinata del castillo', text: 'Arriba, un guardia con la armadura abollada te ve llegar y cruza la lanza delante de la puerta.' },
        { who: 'La escalinata del castillo', text: '«Cerrado hasta nueva orden», dice sin mirarte. Detrás de él se ven tablones clavados por dentro.' }
    ],
    grask: [
        { who: 'Grask, jefe goblin', text: '¿Así que tú eres el que anda matando a mis chicos por el bosque?' },
        { who: 'El campamento goblin', text: 'Grask se levanta de un trono hecho con sillas de taberna. Es dos cabezas más alto que cualquier goblin y lleva placas de armadura arrancadas a soldados muertos.' },
        { who: 'Grask, jefe goblin', text: 'Bonita espada. Quedará mejor colgada en mi tienda, junto a tu cabeza.' },
        { who: 'Grask, jefe goblin', text: '¡Este bosque es mío! ¡Y todo lo que entra en él también!' }
    ],
    botin: [
        { who: 'El botín de Grask', text: 'Bajo una lona sucia está lo que Grask robó a los mercaderes: ollas, botas desparejadas, un arpa sin cuerdas…' },
        { who: 'El botín de Grask', text: '…y al fondo, un cofre pequeño que nadie consiguió abrir. Tú sí. (+40 🪙, +1 🧪)' }
    ],
    'botin-visto': [
        { who: 'El botín de Grask', text: 'Solo quedan cacharros rotos y el arpa sin cuerdas.' }
    ]
};

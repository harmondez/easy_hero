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
//   `enemy`    contra qué se pelea (tipo y piso fijan su fuerza: la dificultad es fija por zona); `enemy.rules` le
//              añade reglas de combate, como las de creatures.js (p. ej. los efectos de estado que pone al golpear)
//   `once`     el enemigo no vuelve nunca (jefes de misión); los demás reaparecen al dormir en la posada
//   `sprite`   (enemigos) con qué id se busca su imagen en src/data/art.js (enemigo_<sprite>); si no, por su nombre
//   `requires` marcas de la historia que hacen falta para que el punto aparezca (todas)
//   `talk`     lo que dice un NPC según la historia: gana la primera entrada cuyas marcas `when` se cumplen
//              (`set` pone una marca al terminar de hablar; `reward` da oro y pociones una sola vez;
//              `reward.item` da un objeto del equipo de la aventura, src/data/gear.js;
//              `whenCount: { creature, n }` exige además haber vencido n criaturas de ese tipo para una misión)
// Marcas: `defeated:<id>` al vencer a ese enemigo (permanente) y las que pongan los diálogos.
// =============================================
import { ZAFIAS_PATHS } from './zafias-paths.js?v=1.9.0';

// Los goblins de Zafias pelean con cuchillos sucios: a veces envenenan (src/data/effects.js)
const GOBLIN = { onHit: [{ id: 'veneno', power: 1, turns: 3, chance: 0.35 }] };

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
                // Lugares: la posada (dormir cura y hace volver a los enemigos), la tienda y la cueva del sur (sellada por ahora)
                { id: 'posada', kind: 'inn', name: 'Posada: dormir', x: 150, y: 410 },
                { id: 'pozo', kind: 'poi', name: 'El pozo de la plaza', x: 226, y: 458, talk: [
                    { when: ['visto:pozo'], dialogue: 'pozo-visto' },
                    { dialogue: 'pozo', set: 'visto:pozo', reward: { gold: 10 } }
                ] },
                { id: 'tienda', kind: 'shop', name: 'Tienda y forja', x: 236, y: 525 },
                { id: 'herrero', kind: 'npc', name: 'Bram, el herrero', x: 268, y: 556, talk: [
                    { when: ['dientes:cumplida'], dialogue: 'herrero-despues' },
                    { when: ['dientes:aceptada'], whenCount: { creature: 'lobo-de-zafias', n: 5 }, dialogue: 'herrero-dientes-fin',
                        set: 'dientes:cumplida', reward: { gold: 30, item: 'espada-de-zafias' } },
                    { when: ['dientes:aceptada'], dialogue: 'herrero-dientes-espera' },
                    { dialogue: 'herrero', set: 'dientes:aceptada' }
                ] },
                { id: 'mercado', kind: 'poi', name: 'Puestos del mercado', x: 268, y: 612, dialogue: 'mercado' },
                { id: 'cueva', kind: 'poi', name: 'Cueva del sur', x: 258, y: 806, dialogue: 'cueva' },
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
                    enemy: { type: 'monster', floor: 0, rules: GOBLIN }, dialogue: 'goblin-vigia' },
                { id: 'senda-santuario', kind: 'poi', name: 'La senda del santuario', x: 488, y: 284, dialogue: 'senda-santuario' },
                { id: 'goblin-2', kind: 'enemy', name: 'Goblin del camino', x: 636, y: 432, enemy: { type: 'monster', floor: 0, rules: GOBLIN } },
                { id: 'poste', kind: 'poi', name: 'El poste de los cruces', x: 610, y: 530, dialogue: 'poste' },
                // Lobos: criaturas con nombre (src/data/creatures.js), con su dibujo y su forma de pelear
                { id: 'lobo-sendero', kind: 'enemy', name: 'Lobo de Zafias', x: 492, y: 592, enemy: { creature: 'lobo-de-zafias' } },
                { id: 'lobo-ruinas', kind: 'enemy', name: 'Lobo de Zafias', x: 752, y: 396, enemy: { creature: 'lobo-de-zafias' } },
                { id: 'goblin-puente', kind: 'enemy', name: 'Goblin del puente', x: 728, y: 616,
                    enemy: { type: 'monster', floor: 0, rules: GOBLIN }, dialogue: 'goblin-puente' },
                { id: 'fardo', kind: 'poi', name: 'Un fardo en la orilla', x: 846, y: 596, talk: [
                    { when: ['visto:fardo'], dialogue: 'fardo-visto' },
                    { dialogue: 'fardo', set: 'visto:fardo', reward: { gold: 25 } }
                ] },
                { id: 'ruinas', kind: 'poi', name: 'Las ruinas del vigía', x: 736, y: 330, talk: [
                    { when: ['visto:ruinas'], dialogue: 'ruinas-visto' },
                    { dialogue: 'ruinas', set: 'visto:ruinas', reward: { potions: 1 } }
                ] },
                { id: 'camino-norte', kind: 'poi', name: 'El camino del norte', x: 772, y: 276, dialogue: 'camino-norte' },
                { id: 'goblin-3', kind: 'enemy', name: 'Goblin ladrón', x: 790, y: 508, enemy: { type: 'monster', floor: 1, rules: GOBLIN } },
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
                    enemy: { type: 'monster', floor: 2, rules: GOBLIN }, dialogue: 'guardia' },
                { id: 'grask', kind: 'enemy', name: 'Grask, jefe goblin', sprite: 'grask', x: 1185, y: 640, once: true,
                    requires: ['defeated:guardia'], enemy: { type: 'subboss', floor: 1, rules: { ...GOBLIN, stunOnHeavy: 1.5 } }, dialogue: 'grask' },
                // Al norte del claro, la puerta de estandartes y el camino a la escalinata del castillo
                { id: 'estandartes', kind: 'poi', name: 'Los estandartes de Grask', x: 1138, y: 562, dialogue: 'estandartes' },
                { id: 'centinela', kind: 'enemy', name: 'Goblin centinela', x: 1146, y: 494,
                    enemy: { type: 'monster', floor: 2, rules: GOBLIN }, dialogue: 'centinela' },
                { id: 'escalinata', kind: 'poi', name: 'La escalinata del castillo', x: 1150, y: 448, dialogue: 'escalinata' },
                // Al sureste, por donde huyen los rezagados: el botín de Grask (solo cuando ha caído)
                { id: 'rezagado', kind: 'enemy', name: 'Goblin rezagado', x: 1262, y: 700, enemy: { type: 'monster', floor: 2, rules: GOBLIN } },
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
export const ZAFIAS_DIALOGUES = {
    // --- La posada: Maela ---
    'posadera-mision': [
        { who: 'Maela, la posadera', text: 'Siéntate antes de que te caigas. Traes barro hasta las cejas y sangre en el pelo.' },
        { who: 'Maela, la posadera', text: '¿De dónde sales? Por el camino del norte no baja nadie desde hace semanas.' },
        { who: '{heroe}', text: 'Desperté en unas ruinas, en el bosque. No sé cómo llegué allí. No recuerdo nada… salvo que me llamo {heroe}.' },
        { who: 'Maela, la posadera', text: '¿Las piedras viejas de la loma? Allí no sube nadie. Ni los cazadores, y esos no le tienen miedo a casi nada.' },
        { who: 'Maela, la posadera', text: 'Pues, {heroe}, sin memoria y con una espada al cinto… En otro tiempo te habría puesto un plato caliente y te habría dejado en paz. Ahora no puedo permitírmelo.' },
        { who: 'Maela, la posadera', text: 'Los goblins bajaron de los montes con las primeras lluvias. Se han quedado los cruces del bosque y ya no pasa nadie: ni los carros del castillo, ni la sal, ni las medicinas.' },
        { who: 'Maela, la posadera', text: 'Tres de esas alimañas vigilan los caminos. Échalos y quedará libre el sendero del este, el que lleva a su campamento. Allí manda uno que se hace llamar Grask.' },
        { who: 'Maela, la posadera', text: 'Tráeme la noticia de que Grask ya no respira y aquí tendrás cama y comida mientras quieras. Y quién sabe: puede que en el camino alguien te reconozca.' }
    ],
    'posadera-espera': [
        { who: 'Maela, la posadera', text: 'Sigues aquí. Los goblins también siguen allí, por si te lo preguntabas.' },
        { who: 'Maela, la posadera', text: 'Esta mañana volvió el hijo del molinero con una flecha en el hombro. Había salido a por leña. A por leña, {heroe}.' },
        { who: 'Maela, la posadera', text: 'Si te hieren, bebe. Si te tumban, alguien te traerá a rastras hasta esta puerta; no serías el primero. Pero no me hagas acostumbrarme.' }
    ],
    'posadera-fin': [
        { who: 'Maela, la posadera', text: '¿Grask? ¿Muerto? ¿Lo has visto tú, con tus propios ojos?' },
        { who: '{heroe}', text: 'Lo vi caer. No volverá a cobrar peaje en el bosque.' },
        { who: 'Posada de Zafias', text: 'Maela se queda quieta. Luego se seca las manos en el delantal, muy despacio, como si temiera que la noticia se le escapase entre los dedos.' },
        { who: 'Maela, la posadera', text: 'Esta noche nadie en Zafias va a echar el cerrojo. Toma: lo han juntado los vecinos, moneda a moneda. Y esta poción, que guardaba para un día malo. (+60 🪙, +1 🧪)' }
    ],
    'posadera-despues': [
        { who: 'Maela, la posadera', text: 'El bosque respira otra vez. Han vuelto los carros, y con ellos las habladurías.' },
        { who: 'Maela, la posadera', text: 'Los leñadores dicen que, pasado el campamento, hacia el sureste, algo aúlla por las noches. Algo más grande que un lobo. Nadie quiere ir a comprobarlo.' },
        { who: 'Maela, la posadera', text: 'Y otra cosa, {heroe}. Ayer un buhonero preguntó si había llegado al pueblo alguien que no recordase nada. No dijo para qué. No me gustó cómo lo preguntaba.' }
    ],
    'posada-dormir': [
        { who: 'Posada de Zafias', text: 'Subes a la habitación del fondo. La cama cruje, la manta huele a humo y a lavanda. Te duermes antes de quitarte las botas.' },
        { who: 'Posada de Zafias', text: 'Sueñas con piedras azules que laten en la oscuridad, y con una voz que pronuncia tu nombre como si llevara mucho tiempo esperándote.' },
        { who: 'Posada de Zafias', text: 'Te despierta el gallo. Tienes el cuerpo entero otra vez. Por la ventana llegan, lejanos, los cuernos de los goblins: han vuelto a los caminos.' }
    ],

    // --- La fragua: Bram ---
    herrero: [
        { who: 'Bram, el herrero', text: 'Déjame ver esa espada. … Mellada, mal templada y con una costra en la cruz que no es óxido.' },
        { who: 'Bram, el herrero', text: 'El hierro es de fragua pobre. Pero esta empuñadura… no es de aquí. Ni de ninguna fragua que yo conozca, y conozco todas las del valle.' },
        { who: 'Bram, el herrero', text: 'Te propongo un trato. Para templar bien el acero muelo dientes de lobo con el carbón. No me preguntes por qué funciona. Funciona.' },
        { who: 'Bram, el herrero', text: 'Desde que hay goblins en el bosque no me los trae nadie. Consígueme cinco. Los lobos rondan el sendero del oeste y las ruinas del vigía.' },
        { who: 'Bram, el herrero', text: 'Hazlo y te forjaré una hoja que no se doble al primer golpe.' }
    ],
    'herrero-dientes-espera': [
        { who: 'Bram, el herrero', text: 'Cinco dientes, ni uno menos. Los lobos vuelven al bosque cada noche: duerme en la posada y por la mañana tendrás donde elegir.' }
    ],
    'herrero-dientes-fin': [
        { who: 'Bram, el herrero', text: '¿Cinco? Y enteros. Déjame ver… Sí. Con esto el acero va a cantar.' },
        { who: 'La fragua', text: 'Bram trabaja toda la tarde sin decir palabra. El martillo marca el ritmo, el fuelle respira y el agua chilla cada vez que la hoja entra en el barril.' },
        { who: 'Bram, el herrero', text: 'Aquí la tienes: la primera hoja de este temple. La llamo Espada de Zafias, porque es igual de terca que la gente de este pueblo.' },
        { who: 'Bram, el herrero', text: 'Más larga, más filo, y el borde dentado abre heridas que tardan en cerrarse. Cuídala. Y llévate esto por los dientes. (+30 🪙, ⚔️ Espada de Zafias)' }
    ],
    'herrero-despues': [
        { who: 'Bram, el herrero', text: 'El acero sale mejor que nunca. Si algún día bajas a las cuevas del sur y vuelves con hierro de allí abajo, tráemelo.' },
        { who: 'Bram, el herrero', text: 'Y si no vuelves… bueno. Ya me enteraré.' }
    ],

    // --- La aldea ---
    pozo: [
        { who: 'El pozo de la plaza', text: 'El brocal está gastado por mil cubos. Abajo, el agua es tan clara que se ven las monedas del fondo: los deseos de toda una aldea.' },
        { who: 'El pozo de la plaza', text: 'Una moneda se ha quedado en el borde de piedra, a tu alcance. Miras alrededor. Nadie mira. (+10 🪙)' }
    ],
    'pozo-visto': [
        { who: 'El pozo de la plaza', text: 'Las monedas del fondo siguen ahí, brillando bajo el agua. La del borde, ya no. Ojalá su dueño no pidiera nada importante.' }
    ],
    cueva: [
        { who: 'Cueva del sur', text: 'La boca de la cueva exhala un aire helado que huele a piedra mojada y a algo mucho más viejo.' },
        { who: 'Cueva del sur', text: 'Das un paso dentro. La oscuridad no se mueve, pero tienes la certeza de que te está mirando. Se te eriza la nuca.' },
        { who: 'Cueva del sur', text: 'Algo te dice que todavía no estás preparado para entrar aquí. Retrocedes despacio, sin darle la espalda.' }
    ],
    mercado: [
        { who: 'Puestos del mercado', text: 'Pan de ayer, cuerda, manojos de hierbas secas colgados de un clavo. La mitad de los puestos están vacíos.' },
        { who: 'Puestos del mercado', text: 'Una vendedora se fija en tu espada y baja la voz: «Desde que los goblins cortan el bosque no llega nada del castillo. Ni sal, ni noticias. Ni a los que se fueron a buscarlas».' }
    ],

    // --- El bosque de los cruces ---
    'goblin-vigia': [
        { who: 'Goblin vigía', text: '¡Eh, eh, eh! ¡Quieto ahí, larguirucho! Este camino es de Grask.' },
        { who: 'Goblin vigía', text: '¿Llevas monedas? ¿No? Pues pagas con sangre. Mejor. Me gusta más.' }
    ],
    'senda-santuario': [
        { who: 'La senda del santuario', text: 'La senda trepa entre helechos hacia unas piedras azuladas que laten con una luz suave, como brasas bajo la ceniza.' },
        { who: 'La senda del santuario', text: 'Al acercarte, la luz se aviva. Se te eriza la piel y, durante un instante, juras haber oído tu nombre.' },
        { who: 'La senda del santuario', text: 'Todavía no. Lo sabes sin saber por qué. Das media vuelta, y la luz se apaga a tu espalda.' }
    ],
    poste: [
        { who: 'El poste de los cruces', text: 'Un poste torcido con tres tablas clavadas. Al oeste: «Zafias». Al sur: «Puente viejo».' },
        { who: 'El poste de los cruces', text: 'La tabla del este decía «Castillo». Alguien la ha tachado y ha escrito encima, con barro y peor letra: «GRASK».' }
    ],
    'goblin-puente': [
        { who: 'Goblin del puente', text: '¡Puente de pago! Una moneda por pasar, dos por volver y tres por mirarme así.' },
        { who: 'Goblin del puente', text: '¿Que no llevas? ¡Pues te cobro en dientes!' }
    ],
    fardo: [
        { who: 'Un fardo en la orilla', text: 'Un fardo de mercader tirado en el barro, rajado de arriba abajo. Los goblins se llevaron las telas y las especias…' },
        { who: 'Un fardo en la orilla', text: '…pero nadie palpó el forro. Cosida por dentro, una bolsa pequeña y pesada. (+25 🪙)' }
    ],
    'fardo-visto': [
        { who: 'Un fardo en la orilla', text: 'Solo quedan trapos empapados y un olor a canela que el río no ha conseguido llevarse.' }
    ],
    ruinas: [
        { who: 'Las ruinas del vigía', text: 'Lo que queda de una torre de vigía, estrujada por las raíces. Dentro, un petate podrido y un frasco que alguien no tuvo tiempo de recoger.' },
        { who: 'Las ruinas del vigía', text: 'El tapón aguanta. Huele a hierbas buenas y a aguardiente: una poción. (+1 🧪)' }
    ],
    'ruinas-visto': [
        { who: 'Las ruinas del vigía', text: 'Desde lo alto de la torre se ve el castillo de Zafias. Las banderas siguen en las almenas, pero no se asoma nadie.' }
    ],
    'camino-norte': [
        { who: 'El camino del norte', text: 'El camino sube pegado a la cascada hasta un portón de troncos, atrancado desde dentro.' },
        { who: 'El camino del norte', text: 'Pegas la oreja a la madera. Al otro lado no hay pasos, ni voces, ni nada. Demasiado silencio para un camino real.' }
    ],

    // --- La guarida del lobo ---
    huesos: [
        { who: 'Huesos roídos', text: 'Huesos de ciervo, de jabalí y la hebilla de un cinturón goblin. Todos partidos a lo largo para sacarles el tuétano.' },
        { who: 'Huesos roídos', text: 'Las marcas de los dientes son más anchas que tu mano.' },
        { who: 'Huesos roídos', text: 'Lo que vive en esa cueva no come por hambre. Come porque puede.' }
    ],
    feronius: [
        { who: 'Feronius el Feroz', text: 'Entre las rocas de la cascada se encienden dos ojos rojos, a una altura en la que no debería haber ojos.' },
        { who: 'Feronius el Feroz', text: 'El lobo sale de la sombra sin prisa. Es enorme, gris como la ceniza, con un collar de huesos que tintinea a cada paso. Algunos son de goblin. Otros no.' },
        { who: 'Feronius el Feroz', text: 'No gruñe. No avisa. Solo baja la cabeza… y salta.' }
    ],

    // --- El campamento goblin ---
    guardia: [
        { who: 'Goblin de guardia', text: '¡Quieto! Nadie pisa el campamento sin permiso de Grask.' },
        { who: 'Goblin de guardia', text: 'Y Grask no da permisos. Grask da palos.' }
    ],
    estandartes: [
        { who: 'Los estandartes de Grask', text: 'Dos estandartes de tela roja, mal cosidos, y entre ellos una cadena de la que cuelgan huesos y cascabeles robados.' },
        { who: 'Los estandartes de Grask', text: 'Más allá, en el claro, se oyen risas roncas y el tintineo de monedas: Grask reparte lo que ha robado.' }
    ],
    centinela: [
        { who: 'Goblin centinela', text: '¡Alto! Por ahí se sube al castillo.' },
        { who: 'Goblin centinela', text: '¡Y el castillo es cosa de Grask! Bueno… lo será. ¡Cuando Grask quiera!' }
    ],
    escalinata: [
        { who: 'La escalinata del castillo', text: 'Una escalinata de piedra blanca sube hasta las puertas del castillo de Zafias. Cada peldaño tiene el borde gastado por siglos de botas.' },
        { who: 'La escalinata del castillo', text: 'Arriba, un guardia con la armadura abollada te ve llegar y cruza la lanza delante de la puerta.' },
        { who: 'La escalinata del castillo', text: '«Cerrado hasta nueva orden», dice, sin mirarte a los ojos. Detrás de él, alguien ha clavado tablones por dentro.' }
    ],
    grask: [
        { who: 'Grask, jefe goblin', text: '¿Así que tú eres el que anda cazando a mis chicos por el bosque?' },
        { who: 'El campamento goblin', text: 'Grask se levanta de un trono hecho con sillas de taberna. Le saca dos cabezas a cualquier goblin y lleva una armadura de cazos martillados.' },
        { who: 'Grask, jefe goblin', text: 'Bonita espada. Quedará mejor colgada en mi tienda… al lado de tu cabeza.' },
        { who: 'Grask, jefe goblin', text: '¡Este bosque es de Grask! ¡Y todo lo que entra en él, también!' }
    ],
    botin: [
        { who: 'El botín de Grask', text: 'Bajo una lona sucia se amontona lo que Grask arrancó a los mercaderes: ollas, botas desparejadas, un arpa sin cuerdas…' },
        { who: 'El botín de Grask', text: '…y, al fondo, un cofrecillo que nadie consiguió abrir. Tú sí. (+40 🪙, +1 🧪)' }
    ],
    'botin-visto': [
        { who: 'El botín de Grask', text: 'Ya solo quedan cacharros rotos y el arpa sin cuerdas, que nadie quiere ni regalada.' }
    ]
};

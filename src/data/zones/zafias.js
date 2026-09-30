// =============================================
// 🧭 Zafias — la primera zona del Modo Aventura
// Coordenadas en píxeles de img/zones/zafias.webp (1434×1097), vista cenital.
// Cada escena es un recuadro del mapa que la cámara encuadra; los puntos son lo que se puede pulsar.
//   `startAt`  parada donde apareces al entrar en la escena · `forks` cruces de camino (sin parada)
//   `links`    caminos a trazos entre paradas/cruces: [desde, hasta, recodos opcionales]
//   `arriveAt` (en las salidas) la parada de la escena de destino donde apareces
//   `enemy`    contra qué se pelea (tipo y piso fijan su fuerza: la dificultad es fija por zona)
//   `once`     el enemigo no vuelve nunca (jefes de misión); los demás reaparecen al dormir en la posada
//   `requires` marcas de la historia que hacen falta para que el punto aparezca (todas)
//   `talk`     lo que dice un NPC según la historia: gana la primera entrada cuyas marcas `when` se cumplen
//              (`set` pone una marca al terminar de hablar; `reward` da oro y pociones una sola vez)
// Marcas: `defeated:<id>` al vencer a ese enemigo (permanente) y las que pongan los diálogos.
// =============================================
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
            box: { x: 10, y: 290, w: 400, h: 520 },   // hasta la cueva del sur
            startAt: 'plaza',
            forks: { plaza: { x: 300, y: 530 }, 'cruce-norte': { x: 312, y: 470 } },
            points: [
                { id: 'posadera', kind: 'npc', name: 'Maela, la posadera', x: 190, y: 420, talk: [
                    { when: ['misionCumplida'], dialogue: 'posadera-despues' },
                    { when: ['defeated:grask'], dialogue: 'posadera-fin', set: 'misionCumplida', reward: { gold: 60, potions: 1 } },
                    { when: ['misionAceptada'], dialogue: 'posadera-espera' },
                    { dialogue: 'posadera-mision', set: 'misionAceptada' }
                ] },
                // Lugares: la posada (dormir cura y hace volver a los enemigos), la tienda y la cueva al descenso
                { id: 'posada', kind: 'inn', name: 'Posada: dormir', x: 150, y: 400 },
                { id: 'tienda', kind: 'shop', name: 'Tienda y forja', x: 236, y: 525 },
                { id: 'herrero', kind: 'npc', name: 'Bram, el herrero', x: 268, y: 556, dialogue: 'herrero' },
                { id: 'cueva', kind: 'cave', name: 'Cueva del sur: bajar al descenso', x: 255, y: 790 },
                // El camino de la aldea sube hasta la valla y de ahí sale el sendero del bosque hacia el este
                { id: 'al-bosque', kind: 'exit', name: 'Al bosque', x: 328, y: 386, to: 'bosque', arriveAt: 'a-la-aldea' }
            ],
            links: [
                ['plaza', 'tienda'],
                ['tienda', 'herrero'],
                ['plaza', 'cruce-norte'],
                ['cruce-norte', 'posadera', [{ x: 250, y: 455 }]],
                ['posadera', 'posada'],
                ['cruce-norte', 'al-bosque'],
                ['plaza', 'cueva', [{ x: 300, y: 600 }, { x: 270, y: 700 }]]
            ]
        },
        bosque: {
            name: 'El bosque de los cruces',
            box: { x: 420, y: 300, w: 480, h: 440 },
            startAt: 'a-la-aldea',
            forks: { 'cruce-valla': { x: 610, y: 388 } },
            points: [
                { id: 'a-la-aldea', kind: 'exit', name: 'A la aldea', x: 425, y: 388, to: 'aldea', arriveAt: 'al-bosque' },
                { id: 'goblin-1', kind: 'enemy', name: 'Goblin vigía', x: 540, y: 390,
                    enemy: { type: 'monster', floor: 0 }, dialogue: 'goblin-vigia' },
                { id: 'goblin-2', kind: 'enemy', name: 'Goblin del camino', x: 640, y: 505, enemy: { type: 'monster', floor: 1 } },
                { id: 'goblin-3', kind: 'enemy', name: 'Goblin ladrón', x: 720, y: 560, enemy: { type: 'monster', floor: 2 } },
                // Limpio el bosque (y aceptada la misión), el sendero del este lleva al campamento goblin
                { id: 'al-campamento', kind: 'exit', name: 'Al campamento', x: 895, y: 540,
                    requires: ['misionAceptada', ...GOBLINS_DEL_BOSQUE], to: 'campamento', arriveAt: 'al-bosque-desde-campamento' }
            ],
            // Por el sendero de la valla y bajando al cruce, no a través de los árboles
            links: [
                ['a-la-aldea', 'goblin-1'],
                ['goblin-1', 'cruce-valla'],
                ['cruce-valla', 'goblin-2', [{ x: 640, y: 450 }]],
                ['goblin-2', 'goblin-3', [{ x: 680, y: 530 }]],
                ['goblin-2', 'al-campamento', [{ x: 700, y: 485 }, { x: 820, y: 522 }]]
            ]
        },
        campamento: {
            name: 'El campamento goblin',
            box: { x: 900, y: 440, w: 400, h: 320 },
            startAt: 'al-bosque-desde-campamento',
            points: [
                { id: 'al-bosque-desde-campamento', kind: 'exit', name: 'Al bosque', x: 935, y: 548, to: 'bosque', arriveAt: 'al-campamento' },
                // Sobre los marcadores rojos pintados en el mapa
                { id: 'guardia', kind: 'enemy', name: 'Goblin de guardia', x: 1060, y: 568,
                    enemy: { type: 'monster', floor: 3 }, dialogue: 'guardia' },
                { id: 'grask', kind: 'enemy', name: 'Grask, jefe goblin', x: 1185, y: 628, once: true,
                    requires: ['defeated:guardia'], enemy: { type: 'subboss', floor: 3 }, dialogue: 'grask' }
            ],
            links: [
                ['al-bosque-desde-campamento', 'guardia', [{ x: 1000, y: 560 }]],
                ['guardia', 'grask', [{ x: 1120, y: 600 }]]
            ]
        }
    }
};

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
        { who: 'Maela, la posadera', text: 'El bosque respira otra vez. Pero dicen que de las cuevas del sur salen cosas peores…' }
    ],
    'posada-dormir': [
        { who: 'Posada de Zafias', text: 'Te dejas caer en la cama. Afuera, el bosque cruje toda la noche…' },
        { who: 'Posada de Zafias', text: 'Despiertas descansado. Pero en los caminos vuelven a oírse pasos de goblin.' }
    ],
    herrero: [
        { who: 'Bram, el herrero', text: '¿Esa espada? Ha visto días mejores. Y peores, a juzgar por las mellas.' },
        { who: 'Bram, el herrero', text: 'Tráeme hierro de las cuevas y te forjo algo que merezca la pena.' }
    ],
    'goblin-vigia': [
        { who: 'Goblin vigía', text: '¡Grrr! Este camino es nuestro. ¡Paga o sangra!' }
    ],
    guardia: [
        { who: 'Goblin de guardia', text: '¡Nadie entra en el campamento sin permiso de Grask!' }
    ],
    grask: [
        { who: 'Grask, jefe goblin', text: '¿Así que tú eres quien anda cazando a mis chicos?' },
        { who: 'Grask, jefe goblin', text: 'Este bosque es de Grask. ¡Y tu cabeza también lo será!' }
    ]
};

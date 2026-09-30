// =============================================
// 🧭 Zafias — la primera zona del Modo Aventura (prueba de concepto)
// Coordenadas en píxeles de img/zones/zafias.webp (1434×1097), vista cenital.
// Cada escena es un recuadro del mapa que la cámara encuadra; los puntos son lo que se puede pulsar.
// `via`: recodos del camino que el héroe sigue para llegar al punto (en la prueba, solo los que hacen falta).
// =============================================
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
            box: { x: 10, y: 290, w: 400, h: 430 },
            start: { x: 300, y: 530 },
            points: [
                { id: 'posadera', kind: 'npc', name: 'Maela, la posadera', x: 190, y: 420, dialogue: 'posadera' },
                { id: 'herrero', kind: 'npc', name: 'Bram, el herrero', x: 268, y: 556, dialogue: 'herrero' },
                // El camino de la aldea sube hasta la valla y de ahí sale el sendero del bosque hacia el este
                { id: 'al-bosque', kind: 'exit', name: 'Camino del bosque', x: 328, y: 386, via: [{ x: 312, y: 470 }], to: 'bosque', arrive: { x: 445, y: 388 } }
            ]
        },
        bosque: {
            name: 'El bosque de los cruces',
            box: { x: 420, y: 300, w: 480, h: 440 },
            start: { x: 445, y: 388 },
            points: [
                { id: 'a-la-aldea', kind: 'exit', name: 'Volver a la aldea', x: 425, y: 388, to: 'aldea', arrive: { x: 312, y: 440 } },
                // Por el sendero de la valla y bajando al cruce, no a través de los árboles
                { id: 'goblin-1', kind: 'enemy', name: 'Goblin del camino', x: 640, y: 505, via: [{ x: 610, y: 388 }, { x: 640, y: 450 }], dialogue: 'goblin-poc' }
            ]
        }
    }
};

// Diálogos: solo historia, «Siguiente» hasta el final. Borrador para corregir.
export const ZAFIAS_DIALOGUES = {
    posadera: [
        { who: 'Maela, la posadera', text: 'Otro que llega por el camino del norte… Tienes cara de no haber dormido en días.' },
        { who: 'Maela, la posadera', text: 'Desde que los goblins bajaron al bosque, nadie cruza hasta el castillo. Ni los mercaderes.' },
        { who: 'Maela, la posadera', text: 'Si vas a meterte ahí, vuelve vivo. Aquí siempre habrá una cama para ti.' }
    ],
    herrero: [
        { who: 'Bram, el herrero', text: '¿Esa espada? Ha visto días mejores. Y peores, a juzgar por las mellas.' },
        { who: 'Bram, el herrero', text: 'Tráeme hierro de las cuevas y te forjo algo que merezca la pena.' }
    ],
    'goblin-poc': [
        { who: 'Goblin del camino', text: '¡Grrr! Este camino es nuestro. ¡Paga o sangra!' },
        { who: 'Prueba de concepto', text: 'Aquí empezará el combate de lado, con la misma pantalla que ya usa el descenso.' }
    ]
};

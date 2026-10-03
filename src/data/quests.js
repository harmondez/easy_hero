// =============================================
// 📜 Misiones (solo datos): lo que sale en el diario de misiones de la aventura
//
//   id, kind ('main' principal · 'side' secundaria), title, desc
//   giver      parada del NPC que la da: su punto sale AZUL mientras la misión esté por empezar o en marcha, y gris al
//              cumplirla (los NPC sin misión salen amarillos, como los puntos de interés)
//   start      marca con la que empieza (la pone el diálogo del NPC con `set`); sin `start`, empieza siempre
//   done       marca con la que se cumple (sin `done`, no se cumple todavía: la historia sigue)
//   steps      objetivos en orden; el diario muestra el primero sin cumplir. Cada paso se cumple con:
//                when: [marcas]                  todas las marcas
//                count: { creature, n }          vencer n criaturas de ese tipo (cuentan desde que empieza la misión;
//                                                los goblins cuentan como 'goblin', su tabla de botín)
//                item: { material, n }           llevar encima n de ese material (src/data/loot.js)
//              y opcionalmente progress: [marcas] para mostrar «2/3»
// Las cuentas viven en el guardado de la aventura (`counts`); las marcas, en `flags`.
// =============================================
const GOBLINS = ['defeated:goblin-1', 'defeated:goblin-2', 'defeated:goblin-3'];

export const QUESTS = [
    {
        id: 'quien-soy', kind: 'main',
        title: 'Descubre quién eres',
        desc: 'Despertaste en unas ruinas del bosque, con sangre seca en la frente y sin recordar nada, salvo tu nombre.',
        steps: [
            { text: 'Habla con la gente de Zafias: quizá alguien te reconozca' }
        ]
    },
    {
        id: 'goblins', kind: 'side', giver: 'posada',
        title: 'Grask, el goblin del bosque',
        desc: 'Un goblin que se hace llamar Grask asalta a los viajeros en el bosque, y a la posada ya no llega nadie. Evelyn, la posadera, te ha pedido que te encargues de él.',
        start: 'misionAceptada', done: 'misionCumplida',
        steps: [
            { text: 'Echa a los goblins del bosque', when: GOBLINS, progress: GOBLINS },
            { text: 'Entra en el campamento goblin y acaba con Grask', when: ['defeated:grask'] },
            { text: 'Vuelve con Evelyn, a la posada', when: ['misionCumplida'] }
        ]
    },
    {
        id: 'colmillo', kind: 'side', giver: 'herrero',
        title: 'El colmillo de Feronius',
        desc: 'Bram, el herrero, quiere un colmillo de Feronius, el lobo enorme que tiene su guarida pasado el campamento goblin. Si se lo llevas, te forjará una espada.',
        start: 'colmillo:aceptada', done: 'colmillo:cumplida',
        steps: [
            { text: 'Consigue el colmillo de Feronius', item: { material: 'colmillo-feronius', n: 1 } },
            { text: 'Llévaselo a Bram, a la forja', when: ['colmillo:cumplida'] }
        ]
    },
    {
        id: 'plantas', kind: 'side', giver: 'boticaria',
        title: 'Plantas para Amelie',
        desc: 'Amelie, la boticaria, cuida sola de su hermana pequeña, que está enferma, y se ha quedado sin plantas para su medicina. Crecen en la senda del santuario, en las ruinas del vigía y en la escalinata del castillo.',
        start: 'plantas:aceptada', done: 'plantas:cumplida',
        steps: [
            { text: 'Encuentra plantas medicinales', item: { material: 'planta-medicinal', n: 3 } },
            { text: 'Llévaselas a Amelie, a la botica', when: ['plantas:cumplida'] }
        ]
    },
    {
        id: 'goblins-odo', kind: 'side', giver: 'odo',
        title: 'Seis goblins menos',
        desc: 'Odo, el veterano de las casas del camino, ya no puede salir a pelear. Paga por cada seis goblins que quites de los caminos.',
        start: 'goblins-odo:aceptada', done: 'goblins-odo:cumplida',
        steps: [
            { text: 'Vence goblins', count: { creature: 'goblin', n: 6 } },
            { text: 'Vuelve con Odo, a las casas del camino', when: ['goblins-odo:cumplida'] }
        ]
    },
    {
        id: 'lobos-hilda', kind: 'side', giver: 'hilda',
        title: 'Los lobos del arroyo',
        desc: 'Hilda, la curtidora, lava sus pieles en el arroyo del bosque, pero los lobos la siguen. Te paga si le quitas cuatro de en medio.',
        start: 'lobos-hilda:aceptada', done: 'lobos-hilda:cumplida',
        steps: [
            { text: 'Vence lobos', count: { creature: 'lobo-de-zafias', n: 4 } },
            { text: 'Vuelve con Hilda, a las casas del camino', when: ['lobos-hilda:cumplida'] }
        ]
    }
];

export const QUESTS_BY_ID = Object.fromEntries(QUESTS.map(q => [q.id, q]));

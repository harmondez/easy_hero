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
//                count: { creature, n }          vencer n criaturas de ese tipo (cuentan desde que empieza la misión)
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
        id: 'goblins', kind: 'side', giver: 'posadera',
        title: 'Los goblins del bosque',
        desc: 'Los goblins de Grask han tomado los cruces del bosque y a Zafias ya no llegan carros. Maela, la posadera, te ha pedido que los eches.',
        start: 'misionAceptada', done: 'misionCumplida',
        steps: [
            { text: 'Echa a los goblins del bosque', when: GOBLINS, progress: GOBLINS },
            { text: 'Entra en el campamento goblin y acaba con Grask', when: ['defeated:grask'] },
            { text: 'Vuelve con Maela a la aldea', when: ['misionCumplida'] }
        ]
    },
    {
        id: 'dientes', kind: 'side', giver: 'herrero',
        title: 'Dientes de lobo',
        desc: 'Bram, el herrero, templa el acero con dientes de lobo molidos. Si le llevas cinco, te forjará una espada.',
        start: 'dientes:aceptada', done: 'dientes:cumplida',
        steps: [
            { text: 'Consigue dientes de lobo', count: { creature: 'lobo-de-zafias', n: 5 } },
            { text: 'Llévaselos a Bram, en la aldea', when: ['dientes:cumplida'] }
        ]
    }
];

export const QUESTS_BY_ID = Object.fromEntries(QUESTS.map(q => [q.id, q]));

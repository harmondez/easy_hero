// =============================================
// 🎲 Eventos — contenido (solo datos; la lógica vive en src/events.js)
//
// Un evento = una situación + exactamente 2 decisiones. Cada decisión lleva un `outcome`:
//
//   outcome := {
//     text:      string | string[]                    líneas que se cuentan al jugador
//     fx:        { hp, maxHp, atq, heal: 'full',      cambios sobre el héroe
//                  healPct, vows, skillMods, affinity }   (healPct: cura ese % de la vida máxima)
//     chance:    [{ w, outcome }]                     sorteo ponderado de un resultado
//     ifStat:    { stat, min, then, else }            depende de un atributo del héroe
//     combat:    { monster, hpFactor, onWin, onWinText }
//     skipFloor: true                                 el siguiente movimiento se salta un piso
//     next:      'pantalla'                           pasa a otra pantalla del mismo evento
//   }
//
// Un outcome también puede ser una función `(ctx) => outcome` con ctx = { hero, rng, state, floor }.
// `maxHp` positivo también cura esa cantidad (igual que las recompensas del resto del juego).
// El daño de un evento nunca mata: deja al héroe como mínimo en 1 HP.
// =============================================

import { RPG_BALANCE } from './balance.js?v=20260922a';
import { atk, CHARGE } from './monsters.js?v=20260922a';

// `pattern` = los movimientos que repite en ciclo (ver data/monsters.js); el jugador ve el siguiente antes de actuar.
export const EVENT_MONSTERS = {
    jefe_bandidos: { name: 'Jefe de los bandidos', icon: '🥷', color: '#ef4444', tag: 'Emboscada', base: 'monster', atqBonus: 1, hpMul: 2, pattern: [atk(1), CHARGE, atk(2)] },
    mimico:        { name: 'Mímico', icon: '📦', color: '#f59e0b', tag: 'Mímico', base: 'monster', atqBonus: 1, hpMul: 1.5, pattern: [atk(1.5), atk(0.75)] },
    merodeador:    { name: 'Merodeador nocturno', icon: '🐺', color: '#ef4444', tag: 'Emboscada', base: 'monster', atqBonus: 1, hpMul: 1.3, pattern: [atk(1)] },
    reflejo:       { name: 'Tu reflejo', icon: '🪞', color: '#94a3b8', tag: 'Duelo', copyHero: true, pattern: [atk(1)] },
    lector:        { name: 'El Lector', icon: '👁️', color: '#c084fc', tag: 'Enemigo inteligente', base: 'subboss', atqBonus: 2, hpMul: 1.5, ai: 'reader', pattern: [atk(1)] }
};

// Eventos que NO forman parte del catálogo aleatorio de 15: los provocan nodos concretos del mapa.
export const RPG_SPECIAL_EVENTS = [
    {
        id: 'hoguera', icon: '🔥', title: 'Hoguera',
        text: 'Un fuego crepita en un rincón tranquilo de la mazmorra. Por un momento, nadie te persigue.',
        options: [
            { label: `Descansar (cura el ${Math.round(RPG_BALANCE.campfire.healPct * 100)} %)`, outcome: {
                text: 'Te sientas junto al fuego y recuperas las fuerzas.',
                fx: { healPct: RPG_BALANCE.campfire.healPct }
            } },
            { label: 'Afilar tu arma (+1 ATK)', outcome: {
                text: 'Pasas la piedra por el filo hasta que brilla. Tu próximo golpe será más certero.',
                fx: { atq: 1 }
            } }
        ]
    }
];

// --- Banco de adivinanzas del Lector (se sortean 3 por evento) ---
export const LECTOR_RIDDLES = [
    { q: 'Cuanto más me quitas, más grande soy. ¿Qué soy?', right: 'Un agujero', wrong: 'Una montaña' },
    { q: 'Tengo ciudades pero no casas, ríos pero no agua. ¿Qué soy?', right: 'Un mapa', wrong: 'Un espejo' },
    { q: 'Si me nombras, dejo de existir. ¿Qué soy?', right: 'El silencio', wrong: 'La oscuridad' },
    { q: 'Cuanto más me secas, más mojada me quedo. ¿Qué soy?', right: 'Una toalla', wrong: 'Una nube' },
    { q: 'Tengo manos pero no puedo aplaudir. ¿Qué soy?', right: 'Un reloj', wrong: 'Un río' },
    { q: 'Vuelo sin alas y lloro sin ojos. ¿Qué soy?', right: 'Una nube', wrong: 'Un pájaro' }
];

// --- Pistas del juicio de las hermanas ---
const LIAR_TELLS = [
    'tiene barro fresco en las botas y evita hablar del pasillo sur',
    'cambia su versión cuando le preguntas a qué hora desapareció el amuleto',
    'se toca el cuello cada vez que nombra el amuleto',
    'sonríe justo cuando su hermana rompe a llorar'
];
const HONEST_QUIRKS = [
    'sostiene tu mirada sin pestañear',
    'está tan nerviosa que se le enredan las frases',
    'insiste en que la registres ahora mismo'
];

function shuffled(list, rng) {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const SISTER_NAMES = { mara: 'Mara', lira: 'Lira' };

function sisterVerdict(chosen) {
    return ctx => {
        const liar = ctx.state.liar;
        if (chosen === liar) {
            return {
                text: [`${SISTER_NAMES[chosen]} sonríe con calma… y te clava un puñal en el costado. Era ella quien mentía.`],
                fx: { hp: -8 }
            };
        }
        return {
            text: [`${SISTER_NAMES[liar]} se derrumba y confiesa. ${SISTER_NAMES[chosen]} te agradece la fe con parte del tesoro familiar.`],
            fx: { atq: 2, maxHp: 5 }
        };
    };
}

function lectorAnswer(isRight) {
    return ctx => {
        const s = ctx.state;
        if (isRight) s.correct++;
        s.i++;
        const feedback = isRight ? '✅ «Correcto.»' : '❌ «Falso.»';
        if (s.i < s.qs.length) return { text: feedback, next: 'q' };
        if (s.correct === s.qs.length) {
            return {
                text: [feedback, 'Los cientos de ojos se cierran a la vez. «Puedes pasar. Llévate esto».'],
                fx: { atq: 2, maxHp: 8 }
            };
        }
        if (s.correct === s.qs.length - 1) {
            return {
                text: [feedback, '«Dudas… pero no del todo. Veamos cuánto vales».'],
                combat: { monster: 'lector', hpFactor: 0.6, onWin: { atq: 3, maxHp: 10 }, onWinText: 'El Lector se apaga, ojo a ojo, y te deja lo que guardaba.' }
            };
        }
        return {
            text: [feedback, '«Ignorante. Ahora, cae».'],
            combat: { monster: 'lector', hpFactor: 1, onWin: { atq: 3, maxHp: 10 }, onWinText: 'Contra todo pronóstico, el Lector se apaga y te deja lo que guardaba.' }
        };
    };
}

export const RPG_EVENTS = [
    // ---------- Los 10 primeros ----------
    {
        id: 'chica_herida', icon: '🩹', title: 'La chica herida',
        text: 'Una joven herida yace junto a la pared de la mazmorra. Te tiende la mano: «Por favor, ayúdame».',
        options: [
            { label: 'Ayudarla', outcome: {
                text: 'La joven sonríe… y detrás de ti aparecen tres bandidos. ¡Era una emboscada!',
                combat: { monster: 'jefe_bandidos', onWin: { atq: 1 }, onWinText: 'Los bandidos dejan caer su botín.' }
            } },
            { label: 'Ignorarla', outcome: { text: 'Sigues tu camino. Sus ojos te acompañan hasta que la oscuridad se la traga.' } }
        ]
    },
    {
        id: 'extrano_encapuchado', icon: '🥷', title: 'El extraño encapuchado',
        text: 'Una figura encapuchada te hace una seña: «Conozco esta mazmorra. Dame la mano y te enseñaré el camino».',
        options: [
            { label: 'Confiar en él', outcome: { chance: [
                { w: 2, outcome: { text: 'El extraño te guía por un pasaje seguro y comparte contigo su botín.', fx: { atq: 1, hp: 8 } } },
                { w: 1, outcome: { text: 'Era un ladrón: te ha vaciado los bolsillos y, de paso, te ha hecho daño.', fx: { hp: -8 } } }
            ] } },
            { label: 'Rechazarlo', outcome: { text: 'Se encoge de hombros y se desvanece en la penumbra.' } }
        ]
    },
    {
        id: 'cofre_susurrante', icon: '📦', title: 'El cofre susurrante',
        text: 'Un cofre de hierro murmura tu nombre. La cerradura está abierta.',
        options: [
            { label: 'Abrirlo', outcome: { chance: [
                { w: 1, outcome: { text: 'Dentro hay un arma reluciente. Es tuya.', fx: { atq: 2 } } },
                { w: 1, outcome: { text: '¡Era un mímico! El cofre se abre en una boca llena de dientes.',
                    combat: { monster: 'mimico', onWin: { atq: 1 }, onWinText: 'Entre sus restos brillan unas monedas y una hoja afilada.' } } }
            ] } },
            { label: 'Dejarlo', outcome: { text: 'Le das la espalda. Los susurros cesan.' } }
        ]
    },
    {
        id: 'campamento_abandonado', icon: '🏕️', title: 'El campamento abandonado',
        text: 'Brasas todavía calientes, un petate y ni rastro de nadie. El sitio parece seguro. Parece.',
        options: [
            { label: 'Descansar', outcome: {
                text: 'Te tumbas junto a las brasas.',
                fx: { hp: 10 },
                chance: [
                    { w: 2, outcome: { text: 'Duermes sin sobresaltos y te levantas mejor.' } },
                    { w: 1, outcome: { text: 'Algo te encuentra dormido. ¡A las armas!',
                        combat: { monster: 'merodeador', onWinText: 'El merodeador huye herido. Ya no hay quien te moleste.' } } }
                ]
            } },
            { label: 'Registrarlo', outcome: {
                text: 'Bajo el petate encuentras un arma en buen estado… y una trampa que se cierra sobre tu mano.',
                fx: { atq: 1, hp: -4 }
            } }
        ]
    },
    {
        id: 'espejo_oscuro', icon: '🪞', title: 'El espejo oscuro',
        text: 'Tu reflejo te sostiene la mirada… y se mueve solo. Después te hace una seña para que te acerques.',
        options: [
            { label: 'Enfrentarlo', outcome: {
                text: 'Tu reflejo sale del cristal con tu misma cara y tus mismos golpes.',
                combat: { monster: 'reflejo', onWin: { atq: 1, maxHp: 5 }, onWinText: 'El espejo se resquebraja. Lo que eras antes se ha quedado en él.' }
            } },
            { label: 'Apartar la mirada', outcome: { text: 'Bajas la vista y sigues adelante. Notas cómo te observa hasta el final del pasillo.' } }
        ]
    },
    {
        id: 'caballero_caido', icon: '🗿', title: 'La estatua del caballero caído',
        text: 'Una estatua de caballero sostiene una espada con un brillo extraño. A sus pies, unas flores marchitas.',
        options: [
            { label: 'Rendirle honores', outcome: { text: 'Inclinas la cabeza. Algo cálido te recorre el pecho: el caballero te concede su aguante.', fx: { maxHp: 6 } } },
            { label: 'Saquear la espada', outcome: { text: 'La espada es tuya, pero una maldición te muerde la mano al tomarla.', fx: { atq: 2, hp: -8 } } }
        ]
    },
    {
        id: 'pozo_deseos', icon: '⛲', title: 'El pozo de los deseos',
        text: 'Un pozo antiguo con monedas en el fondo. Una voz suave dice: «Pide, pero piénsalo».',
        options: [
            { label: 'Desear salud', outcome: { text: 'Un calor reparador te recorre el cuerpo.', fx: { hp: 12 } } },
            { label: 'Desear poder', outcome: { text: 'Sientes cómo tus músculos se endurecen… a costa de tu vigor.', fx: { atq: 1, hp: -4 } } }
        ]
    },
    {
        id: 'puente_cuerdas', icon: '🌉', title: 'El puente de cuerdas',
        text: 'Un puente medio podrido cruza el abismo. Ahorraría un buen trecho de ruta, si aguanta.',
        skipsFloor: true,
        options: [
            { label: 'Cruzarlo', outcome: { chance: [
                { w: 2, outcome: { text: 'Cruzas con el corazón en la boca. El puente aguanta y te ahorras un tramo.', skipFloor: true } },
                { w: 1, outcome: { text: 'Las cuerdas ceden a medio camino. Logras agarrarte, pero llegas magullado y de vuelta al punto de partida.', fx: { hp: -6 } } }
            ] } },
            { label: 'Rodearlo', outcome: { text: 'Prefieres no jugártela y sigues el camino de siempre.' } }
        ]
    },
    {
        id: 'puerta_sellada', icon: '🚪', title: 'La puerta sellada',
        text: 'Una puerta de piedra, sellada por una fuerza antigua. Al otro lado se oye algo que brilla.',
        options: [
            { label: 'Forzarla', outcome: { ifStat: { stat: 'atq', min: 4,
                then: { text: 'Tu fuerza basta. La puerta cede y revela un pequeño tesoro.', fx: { atq: 2, maxHp: 5 } },
                else: { text: 'Empujas hasta el agotamiento, pero la puerta no se mueve. Solo consigues hacerte daño.', fx: { hp: -6 } }
            } } },
            { label: 'Buscar otro camino', outcome: { text: 'La puerta sigue sellada. Ya volverá otro con más fuerza.' } }
        ]
    },
    {
        id: 'alquimista_errante', icon: '⚗️', title: 'El alquimista errante',
        text: 'Un anciano de manos manchadas te ofrece una pócima sin etiqueta: «Buena para lo que te aflige. O casi».',
        options: [
            { label: 'Beberla', outcome: { chance: [
                { w: 1, outcome: { text: 'Un fuego te recorre las venas: más fuerza, pero también un dolor sordo.', fx: { atq: 2, hp: -6 } } },
                { w: 1, outcome: { text: 'Sientes cómo todas tus heridas se cierran de golpe.', fx: { heal: 'full' } } },
                { w: 1, outcome: { text: 'Tu cuerpo se ensancha, pero tus manos tiemblan.', fx: { maxHp: 8, atq: -1 } } }
            ] } },
            { label: 'Rechazarla', outcome: { text: 'El anciano ríe y, a cambio, te da un tónico de consuelo.', fx: { hp: 3 } } }
        ]
    },

    // ---------- Los 5 especiales ----------
    {
        id: 'derrumbe', icon: '🪨', title: 'El derrumbe',
        text: 'El techo cede y atrapa a dos personas bajo las vigas: Elena, una niña de ocho años, y Bram, un herrero que conoce el oficio de reforjar armas.\nSolo te da tiempo de levantar una viga. No hay tiempo para dudar.',
        options: [
            { label: 'Salvar a Elena', outcome: {
                text: 'Levantas la viga con todas tus fuerzas. Elena llora y se aferra a ti. Bram deja de gritar. Ella te regala el colgante de su madre.',
                fx: { hp: -5, maxHp: 8 }
            } },
            { label: 'Salvar a Bram', outcome: {
                text: 'Levantas la viga y sacas a Bram a rastras. Elena deja de llamar. El herrero, roto de dolor y agradecido, reforja tu arma sin decir palabra.',
                fx: { hp: -5, atq: 2 }
            } }
        ]
    },
    {
        id: 'juicio_hermanas', icon: '⚖️', title: 'El juicio de las hermanas',
        setup: rng => {
            const liar = rng() < 0.5 ? 'mara' : 'lira';
            const tells = shuffled(LIAR_TELLS, rng).slice(0, 2);
            const quirk = shuffled(HONEST_QUIRKS, rng)[0];
            return { liar, tells, quirk };
        },
        text: s => {
            const of = who => who === s.liar ? `${s.tells[0]}; además, ${s.tells[1]}` : s.quirk;
            return `Mara y Lira se acusan mutuamente de haber robado el amuleto familiar. Una de las dos miente.\n`
                + `Mara ${of('mara')}.\nLira ${of('lira')}.`;
        },
        options: [
            { label: 'Creer a Mara', outcome: sisterVerdict('mara') },
            { label: 'Creer a Lira', outcome: sisterVerdict('lira') }
        ]
    },
    {
        id: 'voto', icon: '🤞', title: 'El voto',
        text: 'Un monje sin rostro te ofrece poder a cambio de renunciar a algo para siempre.',
        options: [
            { label: 'Voto de Acero', outcome: {
                text: 'Juras no volver a huir jamás. El acero responde: sientes más fuerza y más aguante.',
                fx: { atq: 3, maxHp: 6, vows: { noFlee: true } }
            } },
            { label: 'Voto de Silencio', outcome: {
                text: 'Juras renunciar a toda habilidad. Tu cuerpo se endurece, pero tus manos ya no recuerdan las técnicas.',
                fx: { atq: 2, maxHp: 12, vows: { noSkills: true } }
            } }
        ]
    },
    {
        id: 'maestro_errante', icon: '🥋', title: 'El maestro errante',
        text: 'Un maestro de ojos serenos te enseñará una sola lección. Elige bien.',
        options: [
            { label: 'La vía del acero', outcome: {
                text: 'Entrenas el cuerpo hasta que el sudor te ciega.',
                fx: { atq: 2, maxHp: 6, affinity: { guerrero: 2 } }
            } },
            { label: 'La vía de la llama', outcome: {
                text: 'Aprendes a canalizar el fuego con precisión.',
                fx: { skillMods: { fire_strike: { damage: 3, cooldown: -1 } }, affinity: { elementalista: 2 } }
            } }
        ]
    },
    {
        id: 'lector', icon: '👁️', title: 'El Lector',
        setup: rng => ({
            qs: shuffled(LECTOR_RIDDLES, rng).slice(0, 3),
            flips: [rng() < 0.5, rng() < 0.5, rng() < 0.5],
            i: 0,
            correct: 0
        }),
        text: 'Un ser de cientos de ojos bloquea el paso. Todos parpadean a la vez.\n«Nadie cruza sin responderme… o sin vencerme».',
        options: [
            { label: 'Plantarle cara', outcome: () => ({ text: '«Tres preguntas, pues».', next: 'q' }) },
            { label: 'Retroceder en silencio', outcome: { text: 'Das un paso atrás… y otro. Los ojos te siguen hasta que doblas la esquina.' } }
        ],
        screens: {
            q: s => {
                const q = s.qs[s.i];
                const answers = [
                    { label: q.right, outcome: lectorAnswer(true) },
                    { label: q.wrong, outcome: lectorAnswer(false) }
                ];
                if (s.flips[s.i]) answers.reverse();
                return { text: `Pregunta ${s.i + 1} de ${s.qs.length}:\n«${q.q}»`, options: answers };
            }
        }
    }
];

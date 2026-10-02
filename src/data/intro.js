// =============================================
// 🌅 La introducción: lo que ve quien entra en Easy Hero por primera vez (solo datos)
// Un aventurero despierta sin memoria en unas ruinas del bosque, recuerda su nombre, encuentra su espada y se
// pone en marcha hacia el pueblo más cercano: la aldea de Zafias, donde empieza la aventura.
//
// Pasos (`kind`), en orden; se avanza con clic, Intro o Espacio salvo los que van solos:
//   thought   una frase sobre negro (pensamiento, letra grabada)
//   wake      se abren los ojos: aparecen las ruinas, enfocándose (va sola)
//   say       una frase del héroe en el cuadro de pergamino
//   stand     el héroe se incorpora (va sola)
//   name      el héroe recuerda su nombre: el jugador lo escribe (vacío = «Héroe»)
//   item      una frase y el objeto que lleva, a la vista
//   leave     fundido a negro (va sola)
//   title     el nombre del lugar al que llega, sobre negro
// En los textos, {heroe} es el nombre que haya escrito el jugador.
// =============================================
export const INTRO_STEPS = [
    { kind: 'thought', text: '…' },
    { kind: 'thought', text: 'Frío. Tierra mojada contra la mejilla.' },
    { kind: 'thought', text: 'La cabeza me late como si alguien hubiera estado golpeándola desde dentro.' },
    { kind: 'thought', text: 'Busco el último recuerdo… y no hay nada. Ni una cara, ni un camino. Solo esta oscuridad.' },
    { kind: 'wake' },
    { kind: 'say', text: 'Columnas partidas. Musgo hasta las rodillas. Unas ruinas, en mitad del bosque.' },
    { kind: 'say', text: 'Me llevo la mano a la frente y vuelve manchada. Sangre seca. No mucha.' },
    { kind: 'say', text: 'Alguien me trajo hasta aquí. O vine por mi propio pie y lo he olvidado. No sé qué me asusta más.' },
    { kind: 'stand' },
    { kind: 'name', text: 'Un nombre. Eso tiene que seguir en alguna parte… ¿Cómo me llamo?' },
    { kind: 'say', text: '{heroe}. Me llamo {heroe}. Lo digo en voz alta y suena a verdad. Es lo único que suena a verdad.' },
    { kind: 'item', text: 'Junto a mi mano, medio hundida entre las hojas, una espada de hierro. Mellada y sin vaina. La empuñadura encaja en mis dedos como si llevara años en ellos.',
        item: { icon: '🗡️', img: 'img/ui/ranura-arma.webp', name: 'Espada de hierro', detail: 'ATK 1' } },
    { kind: 'say', text: 'Entre los árboles sube un hilo de humo. Leña quemada, pan… gente.' },
    { kind: 'say', text: 'Si alguien sabe qué me ha pasado, estará allí. Y si nadie lo sabe, al menos habrá un techo.' },
    { kind: 'say', text: 'A mi espalda cruje la maleza. Algo grande se mueve entre los helechos. No me quedo a averiguar qué es.' },
    { kind: 'leave' },
    { kind: 'title', text: 'Zafias' }
];

/** Nombre por defecto si el jugador no escribe ninguno, y largo máximo. */
export const DEFAULT_HERO_NAME = 'Héroe';
export const HERO_NAME_MAX = 16;

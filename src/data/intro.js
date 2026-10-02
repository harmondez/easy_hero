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
    { kind: 'thought', text: 'Me duele la cabeza.' },
    { kind: 'thought', text: 'Tengo frío. Estoy tumbado sobre tierra mojada.' },
    { kind: 'thought', text: 'No sé dónde estoy ni cómo he llegado aquí.' },
    { kind: 'wake' },
    { kind: 'say', text: 'Unas ruinas. Columnas rotas, piedra con musgo. Estoy en mitad de un bosque.' },
    { kind: 'say', text: 'Tengo sangre seca en la frente. No es mucha.' },
    { kind: 'say', text: 'No sé si me trajeron hasta aquí o vine yo solo.' },
    { kind: 'stand' },
    { kind: 'name', text: 'Tengo que acordarme de mi nombre. ¿Cómo me llamo?' },
    { kind: 'say', text: '{heroe}. Me llamo {heroe}. Eso sí lo recuerdo.' },
    { kind: 'item', text: 'Junto a mi mano, entre las hojas, hay una espada de hierro. Está mellada y no tiene vaina. Es lo único que llevo.',
        item: { icon: '🗡️', img: 'img/ui/ranura-arma.webp', name: 'Espada de hierro', detail: 'ATK 1' } },
    { kind: 'say', text: 'Entre los árboles sube humo. Tiene que haber un pueblo cerca.' },
    { kind: 'say', text: 'Iré hasta allí. Si alguien sabe algo de mí, estará en el pueblo.' },
    { kind: 'say', text: 'Algo se mueve entre los helechos, detrás de mí. No pienso quedarme a ver qué es.' },
    { kind: 'leave' },
    { kind: 'title', text: 'Zafias' }
];

/** Nombre por defecto si el jugador no escribe ninguno, y largo máximo. */
export const DEFAULT_HERO_NAME = 'Héroe';
export const HERO_NAME_MAX = 16;

// =============================================
// 🌅 La introducción: lo que ve quien entra en Easy Hero por primera vez (solo datos; borrador para corregir)
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
    { kind: 'thought', text: 'Agh… mi cabeza…' },
    { kind: 'thought', text: 'No recuerdo nada. ¿Dónde estoy?' },
    { kind: 'wake' },
    { kind: 'say', text: 'Piedras viejas, musgo… Unas ruinas en mitad del bosque.' },
    { kind: 'say', text: '¿Cómo he llegado hasta aquí?' },
    { kind: 'stand' },
    { kind: 'name', text: '¿Y quién soy yo…? Mi nombre. ¿Cómo me llamaba?' },
    { kind: 'say', text: '{heroe}. Eso es. Al menos recuerdo eso.' },
    { kind: 'item', text: 'A mi lado, en la hierba, una espada de hierro. Es todo lo que tengo.',
        item: { icon: '🗡️', name: 'Espada de hierro', detail: 'ATK 1' } },
    { kind: 'say', text: 'Huele a humo de chimenea. Tiene que haber un pueblo cerca.' },
    { kind: 'say', text: 'He de ponerme en marcha hacia el pueblo más cercano…' },
    { kind: 'leave' },
    { kind: 'title', text: 'Zafias' }
];

/** Nombre por defecto si el jugador no escribe ninguno, y largo máximo. */
export const DEFAULT_HERO_NAME = 'Héroe';
export const HERO_NAME_MAX = 16;

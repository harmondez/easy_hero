// =============================================
// ✨ Efectos de estado (solo datos): lo que puede llevar encima un combatiente, héroe o enemigo.
// Las reglas viven en src/effects.js; aquí, qué es cada uno y cómo se ve.
//
//   name    cómo se llama en la interfaz
//   icon    id del icono en ART.icons (img/ui/<id>.webp, de img/icons/effects con `npm run icons`)
//   emoji   para el diario del combate
//   bad     true = perjudica (lo pone el rival); false = mejora (pociones, habilidades, equipo)
//   tick    'damage' (quita `power` de vida cada ronda) · 'heal' (cura `power`) · nada (no hace nada por ronda)
//   stat    'atq' (ATK) o 'ph' (PH, Poder de Habilidad): los multiplica por 1 + power mientras dure
//   skip    pierde su siguiente turno (y se le pasa)
//   stack   'add' (el power se suma al repetirlo) · 'max' (se queda el mayor; las rondas, las más largas)
//   color   el de los números que salen sobre el personaje (color funcional, como las rarezas)
//   desc    qué hace, con el efecto concreto { power, turns }
// Duración: `turns` rondas; null = hasta que acabe el combate.
// =============================================
// ⏱️ De momento TODOS los efectos duran 3 rondas (lo que digan los datos de cada uno se ignora). El aturdimiento no
// cuenta: dura hasta que se pierde el turno. Para volver a duraciones propias, poner EFFECT_TURNS = null.
export const EFFECT_TURNS = 3;

const pct = p => `${Math.round(p * 100)} %`;

export const EFFECTS = {
    veneno: {
        name: 'Veneno', icon: 'efecto-veneno', emoji: '☠️', bad: true, tick: 'damage', stack: 'add', color: '#7ed957',
        desc: e => `Pierde ${e.power} de vida cada ronda`
    },
    quemadura: {
        name: 'Quemadura', icon: 'efecto-quemadura', emoji: '🔥', bad: true, tick: 'damage', stack: 'max', color: '#ff8a3d',
        desc: e => `Arde: ${e.power} de daño cada ronda`
    },
    sangrado: {
        name: 'Sangrado', icon: 'efecto-sangrado', emoji: '🩸', bad: true, tick: 'damage', stack: 'max', color: '#ff4b4b',
        desc: e => `Sangra: ${e.power} de daño cada ronda`
    },
    aturdido: {
        name: 'Aturdido', icon: 'efecto-aturdido', emoji: '💫', bad: true, skip: true, stack: 'max', color: '#f2d36b',
        desc: () => 'Pierde su próximo turno'
    },
    'mas-ataque': {
        name: 'Más ATK', icon: 'efecto-mas-ataque', emoji: '💪', bad: false, stat: 'atq', stack: 'max', color: '#ffb347',
        desc: e => `+${pct(e.power)} de ATK (Poder de Ataque)`
    },
    'mas-ph': {
        name: 'Más PH', icon: 'efecto-mas-ph', emoji: '✨', bad: false, stat: 'ph', stack: 'max', color: '#b48cff',
        desc: e => `+${pct(e.power)} de PH (Poder de Habilidad)`
    },
    regeneracion: {
        name: 'Regeneración', icon: 'efecto-regeneracion', emoji: '💚', bad: false, tick: 'heal', stack: 'max', color: '#8fd46a',
        desc: e => `Recupera ${e.power} de vida cada ronda`
    }
};

// =============================================
// 🧪 Elixires: se compran en la tienda, se llevan encima (como las pociones) y en combate dan un efecto a cambio
// del turno. `effect` = { id, power, turns } · `img` = icono en ART.icons para su botón y su carta.
// =============================================
// `target: 'enemy'` = se lanza al enemigo (el efecto es para él); sin target, te lo bebes tú. `sold: false` = no se vende.
export const ELIXIRS = {
    fuerza: {
        name: 'Elixir de fuerza', img: 'efecto-mas-ataque', price: 30, max: 2,
        effect: { id: 'mas-ataque', power: 0.5, turns: 3 },
        desc: 'Tus golpes pegan más durante unas rondas.'
    },
    arcano: {
        name: 'Elixir arcano', img: 'efecto-mas-ph', price: 30, max: 2,
        effect: { id: 'mas-ph', power: 0.5, turns: 3 },
        desc: 'Tus habilidades (la Bola de fuego) hacen más daño durante unas rondas.'
    },
    hierbas: {
        name: 'Tónico de hierbas', img: 'ingrediente-hierba', price: 25, max: 2, sold: false,   // ya no se vende (sí se usa el que tengas)
        effect: { id: 'regeneracion', power: 2, turns: 3 },
        desc: 'Cierra tus heridas poco a poco, ronda tras ronda.'
    },
    veneno: {
        name: 'Frasco de veneno', img: 'pocion-veneno', price: 20, max: 3, target: 'enemy',
        effect: { id: 'veneno', power: 2, turns: 3 },
        desc: 'Se lanza al enemigo: el veneno hace el resto.'
    }
};

// =============================================
// 🍞 Comida: se come fuera del combate, desde el inventario. `heal` = parte de la vida máxima que cura.
// =============================================
export const FOOD = {
    pan: { name: 'Hogaza de pan', img: 'comida', price: 5, max: 5, heal: 0.4,
        desc: 'Pan de la tahona de Zafias. Comerlo en el camino te devuelve fuerzas.' }
};

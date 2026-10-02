// =============================================
// 🎭 Retratos de los diálogos (solo datos): quién habla → su retrato en ART.portraits (img/portraits/<id>.webp, de
// img/characters/<id>-profile.png con `npm run icons`).
// La clave es el `who` de la línea de diálogo, tal cual («{heroe}» es tu héroe). Quien no está aquí habla sin retrato
// (las líneas de narración, firmadas con el lugar, tampoco lo llevan).
// El héroe sale a la derecha, mirando hacia dentro; los demás, a la izquierda.
// Valor: el id del retrato, o { id, scale } para que se vea más grande (Grask, ×1,25: que se note lo que abulta).
// =============================================
export const HERO_WHO = '{heroe}';

const GOBLIN = 'enemy-goblin-minion';

export const PORTRAITS = {
    '{heroe}': 'hero',
    'Maela, la posadera': 'tabernera-maela',
    'Bram, el herrero': 'herrero-braum',
    'Grask, jefe goblin': { id: 'enemy-grask-boss', scale: 1.25 },
    // Los esbirros de Grask comparten cara (para ellos, todos los goblins son iguales)
    'Goblin vigía': GOBLIN,
    'Goblin del puente': GOBLIN,
    'Goblin de guardia': GOBLIN,
    'Goblin centinela': GOBLIN
};

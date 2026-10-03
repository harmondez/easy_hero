// =============================================
// ✨ Encuentros raros (solo datos): de vez en cuando, en lugar del enemigo de siempre aparece otro mucho más duro
//
// Un enemigo los usa con `rare: '<id>'` (en su criatura o en su parada de la zona). El raro es el mismo enemigo
// (mismas reglas, misma forma de pelear y misma tabla de botín) con otro nombre, otro dibujo y más fuerza.
// Un raro suelta SIEMPRE algo de su tabla de botín (no tira el 33 %).
//   chance   probabilidad de que salga en lugar del normal
//   name     su nombre (y con el que se busca su dibujo: img/sprites/enemigo_<nombre>.webp)
//   hpMul / atkMul   multiplican la vida y el ataque del enemigo normal de esa parada
//   goldMul / xpMul  multiplican lo que da al caer: es más duro, y paga más
//   scaleMul tamaño en pantalla respecto al normal
//   tag      etiqueta bajo su nombre en el combate
// La tirada se hace la primera vez que te cruzas con la parada y se queda hasta que duermes: huir no la repite.
// =============================================
export const RARES = {
    lobo: { chance: 0.1, name: 'Lobo Negro', icon: '🐺', hpMul: 2, atkMul: 2, goldMul: 4, xpMul: 3, scaleMul: 1.2, tag: 'Encuentro raro' },
    goblin: { chance: 0.1, name: 'Goblin Pícaro', icon: '👺', hpMul: 2, atkMul: 2, goldMul: 4, xpMul: 3, scaleMul: 1.1, tag: 'Encuentro raro' }
};

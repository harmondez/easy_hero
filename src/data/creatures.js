// =============================================
// 🐺 Criaturas con nombre propio — enemigos fijos del Modo Aventura (solo datos)
//
// Un monstruo de la mazmorra sale de su piso al azar; una criatura es siempre la misma: su nombre, su dibujo
// (img/sprites/enemigo_<artSlug(nombre)>.webp) y su forma de pelear. Una parada de una zona la usa con
//   enemy: { creature: 'gnoll-berserker' }
//
// Campos:
//   name      nombre que se ve (y con el que se busca su dibujo)
//   type      monster · subboss · boss (los jefes pegan y aguantan más, y dan más botín)
//   floor     piso de referencia: fija la fuerza base (ver rpgMonsterStats en engine.js)
//   pattern   arquetipo de movimientos de PATTERNS (monsters.js)
//   atkMul / hpMul   multiplican el daño y la vida respecto a su piso
//   rules     reglas de combate, las mismas que las variantes (variants.js): physResist (defensa), rageBelow…
// =============================================
import { PATTERNS } from './monsters.js?v=1.7.0';

export const CREATURES = {
    // --- Lobos ---
    'lobo-de-zafias': {
        name: 'Lobo de Zafias', icon: '🐺', type: 'monster', floor: 1, pattern: 'rapido'
    },
    feronius: {
        name: 'Feronius el Feroz', icon: '🐺', type: 'boss', floor: 1, pattern: 'agresivo',
        atkMul: 0.8, hpMul: 0.85,
        rules: { rageBelow: 0.3, rageAtkMul: 1.5 },
        desc: 'El lobo alfa y jefe de Zafias: no deja de morder y, herido, se vuelve loco.'
    },
    // --- Gnolls ---
    'gnoll-de-zafias': {
        name: 'Gnoll de Zafias', icon: '🐾', type: 'monster', floor: 2, pattern: 'agresivo'
    },
    'gnoll-berserker': {
        name: 'Gnoll Berserker', icon: '🪓', type: 'monster', floor: 3, pattern: 'hostigador',
        atkMul: 1.4, hpMul: 0.7,
        desc: 'Menos vida, mucho más daño: o cae rápido o te tumba.'
    },
    gnarok: {
        name: 'Gnarok, el Jefe Gnoll', icon: '🐾', type: 'subboss', floor: 5, pattern: 'acosador',
        atkMul: 1.25, rules: { bloodlust: 0.5 },
        desc: 'El jefe de la manada: cuanta menos vida le queda, más fuerte pega.'
    },
    // --- Orcos ---
    'orco-de-zafias': {
        name: 'Orco de Zafias', icon: '👾', type: 'monster', floor: 3, pattern: 'cargador'
    },
    'orco-guerrero': {
        name: 'Orco Guerrero', icon: '🛡️', type: 'monster', floor: 4, pattern: 'defensor',
        hpMul: 1.15, rules: { physResist: 0.3 },
        desc: 'Armadura negra: el daño físico le hace mucho menos.'
    },
    'orco-chaman': {
        name: 'Orco Chamán', icon: '🔥', type: 'monster', floor: 4, pattern: 'sanador',
        atkMul: 1.25, hpMul: 1.25, rules: { burnOnHit: { dmg: 2, turns: 2 } },
        desc: 'Más daño y más vida; su fuego quema y se cura entre conjuros.'
    },
    guul: {
        name: 'Guul, el Rey Orco', icon: '👑', type: 'boss', floor: 6, pattern: 'implacable',
        hpMul: 1.3, rules: { physResist: 0.15 },
        desc: 'El rey de los orcos: se cubre, golpea fuerte y vuelve a golpear.'
    }
};

/** El patrón de movimientos de una criatura (el arquetipo con nombre de monsters.js). */
export const creaturePattern = c => PATTERNS[c.pattern];

/** La criatura de una parada de zona (`enemy: { creature: id }`), o null si es un monstruo de piso. */
export const creatureFor = p => (p && p.enemy && p.enemy.creature && CREATURES[p.enemy.creature]) || null;

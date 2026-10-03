// =============================================
// ✨ Motor de efectos de estado (puro, sin DOM). Los datos en src/data/effects.js.
//
// Cada combatiente (héroe o enemigo) lleva `unit.effects = { <id>: { power, turns, fresh? } }`. Se vacía al
// empezar cada combate. Cuándo cuenta cada cosa:
//   · daño y curación por ronda: al cerrar el turno de quien lo lleva (el del enemigo, tras tu acción; el tuyo,
//     al final de la ronda), y entonces gasta una ronda.
//   · ATK / PH: multiplican mientras dure. Una mejora recién puesta por tu propia acción no gasta esa ronda
//     (`fresh`): «3 rondas» son 3 turnos tuyos con la mejora.
//   · aturdido: no gasta rondas; se consume al perder el turno.
// =============================================
import { EFFECTS, EFFECT_TURNS } from './data/effects.js?v=1.11.0';

const _fx = unit => (unit.effects = unit.effects || {});

export const hasEffect = (unit, id) => !!(unit && unit.effects && unit.effects[id]);

/**
 * Pone (o refuerza) un efecto. Devuelve el efecto tal como queda, o null si no existe.
 * `fresh`: lo pone el propio portador en su turno (sus mejoras no gastan esa ronda).
 */
export function applyEffect(unit, id, power = 1, turns = null, fresh = false) {
    const def = EFFECTS[id];
    if (!def || !unit) return null;
    // De momento todos los efectos duran lo mismo (EFFECT_TURNS); el aturdimiento no: se gasta al perder el turno
    if (!def.skip && EFFECT_TURNS) turns = EFFECT_TURNS;
    const fx = _fx(unit);
    const cur = fx[id];
    const longest = (a, b) => (a == null || b == null) ? null : Math.max(a, b);   // null = todo el combate
    if (!cur) fx[id] = { power, turns };
    else fx[id] = {
        power: def.stack === 'add' ? cur.power + power : Math.max(cur.power, power),
        turns: longest(cur.turns, turns)
    };
    if (fresh && !def.bad && def.stat) fx[id].fresh = true;
    return fx[id];
}

export function removeEffect(unit, id) {
    if (unit && unit.effects) delete unit.effects[id];
}

/** Multiplicador de una estadística ('atq' o 'ph') por las mejoras que lleva. */
export function effectStatMul(unit, stat) {
    let mul = 1;
    for (const [id, e] of Object.entries((unit && unit.effects) || {})) {
        if (EFFECTS[id] && EFFECTS[id].stat === stat) mul += e.power;
    }
    return mul;
}

/**
 * Cierra el turno de quien lleva los efectos: hace el daño y la curación por ronda y gasta una ronda.
 * `who` = 'hero' | 'monster' (para los sucesos). Devuelve los sucesos:
 *   { actor, target, kind: 'effect', effect, amount, heal?, text }  y  { kind: 'effect-off', effect, ... } al acabarse.
 */
export function tickEffects(unit, who, events = []) {
    const fx = (unit && unit.effects) || {};
    const other = who === 'hero' ? 'monster' : 'hero';
    for (const id of Object.keys(fx)) {
        const def = EFFECTS[id];
        const e = fx[id];
        if (!def) { delete fx[id]; continue; }
        if (def.skip) continue;   // el aturdimiento se gasta al perder el turno
        if (e.fresh) { delete e.fresh; continue; }
        if (def.tick === 'damage' && unit.hp > 0) {
            const dmg = Math.min(unit.hp, e.power);
            unit.hp -= dmg;
            if (dmg > 0) events.push({ actor: other, target: who, kind: 'effect', effect: id, amount: dmg,
                text: `${def.emoji} ${unit.name} sufre ${dmg} de ${def.name.toLowerCase()}.` });
        } else if (def.tick === 'heal' && unit.hp > 0) {
            const healed = Math.min(unit.maxHp - unit.hp, e.power);
            unit.hp += healed;
            if (healed > 0) events.push({ actor: who, target: who, kind: 'effect', effect: id, amount: healed, heal: true,
                text: `${def.emoji} ${unit.name} se regenera: +${healed} de vida.` });
        }
        if (e.turns != null && --e.turns <= 0) {
            delete fx[id];
            events.push({ actor: who, target: who, kind: 'effect-off', effect: id, amount: 0,
                text: `${def.emoji} Se acaba: ${def.name} (${unit.name}).` });
        }
    }
    return events;
}

/** Si está aturdido, gasta el aturdimiento y devuelve true (pierde este turno). */
export function consumeStun(unit) {
    if (!hasEffect(unit, 'aturdido')) return false;
    removeEffect(unit, 'aturdido');
    return true;
}

/** El suceso de «le ponen un efecto» (para el diario y para que salga su icono sobre el personaje). */
export function effectAppliedEvent(unit, who, by, id) {
    const def = EFFECTS[id];
    const e = unit.effects[id];
    const turns = e.turns == null ? '' : ` (${e.turns} ${e.turns === 1 ? 'ronda' : 'rondas'})`;
    return { actor: by, target: who, kind: 'effect-on', effect: id, amount: 0,
        text: `${def.emoji} ${unit.name}: ${def.name}. ${def.desc(e)}${turns}.` };
}

/** Lo que lleva encima, para pintarlo: [{ id, name, icon, color, bad, power, turns, desc }]. Primero lo malo. */
export function effectList(unit) {
    return Object.entries((unit && unit.effects) || {})
        .filter(([id]) => EFFECTS[id])
        .map(([id, e]) => ({ id, ...EFFECTS[id], power: e.power, turns: e.turns, desc: EFFECTS[id].desc(e) }))
        .sort((a, b) => (b.bad === true) - (a.bad === true));
}

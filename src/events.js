import * as Engine from './engine.js?v=20260921b';
import { RPG_EVENTS, EVENT_MONSTERS } from './data/events.js?v=20260921b';

// =============================================
// 🎲 RPG-pack — motor de eventos (puro, sin DOM)
// Interpreta los datos de src/data/events.js: efectos, azar, condiciones,
// varias pantallas y combates. El generador aleatorio se recibe por parámetro.
// =============================================
export { RPG_EVENTS, EVENT_MONSTERS };

const EVENT_BY_ID = new Map(RPG_EVENTS.map(e => [e.id, e]));
export function getRpgEvent(id) { return EVENT_BY_ID.get(id) || null; }

const AFFINITY_LABELS = { guerrero: '⚔️ Guerrero', picaro: '🗡️ Pícaro', elementalista: '🔥 Elementalista' };
const VOW_LABELS = { noFlee: 'Voto de Acero: ya no puedes huir', noSkills: 'Voto de Silencio: ya no puedes usar habilidades' };

const signed = n => `${n > 0 ? '+' : '−'}${Math.abs(n)}`;

/**
 * Aplica los efectos de un evento sobre el héroe y devuelve las etiquetas de lo que cambió.
 * fx: { hp, maxHp, atq, heal: 'full', vows, skillMods, affinity }
 * - `maxHp` positivo también cura esa cantidad (como las recompensas del resto del juego).
 * - El daño nunca mata: el HP no baja de 1.
 */
export function applyRpgFx(hero, fx = {}) {
    const before = { hp: hero.hp, maxHp: hero.maxHp, atq: hero.atq };
    const labels = [];

    if (fx.maxHp) {
        hero.maxHp = Math.max(1, hero.maxHp + fx.maxHp);
        if (fx.maxHp > 0) hero.hp += fx.maxHp;
        hero.hp = Math.min(hero.hp, hero.maxHp);
    }
    if (fx.atq) hero.atq = Math.max(1, hero.atq + fx.atq);
    if (fx.heal === 'full') hero.hp = hero.maxHp;
    if (fx.hp) hero.hp = Math.min(hero.maxHp, Math.max(1, hero.hp + fx.hp));

    if (fx.vows) {
        hero.vows = { ...(hero.vows || {}), ...fx.vows };
        Object.keys(fx.vows).forEach(v => VOW_LABELS[v] && labels.push(VOW_LABELS[v]));
    }
    if (fx.skillMods) {
        hero.skillMods = hero.skillMods || {};
        for (const [skillId, mods] of Object.entries(fx.skillMods)) {
            const cur = hero.skillMods[skillId] || {};
            hero.skillMods[skillId] = {};
            for (const k of new Set([...Object.keys(cur), ...Object.keys(mods)])) {
                hero.skillMods[skillId][k] = (cur[k] || 0) + (mods[k] || 0);
            }
            const skill = Engine.RPG_SKILLS[skillId];
            if (skill) labels.push(`${skill.icon} ${skill.name} mejorado`);
        }
    }
    if (fx.affinity) {
        hero.affinity = hero.affinity || { guerrero: 0, picaro: 0, elementalista: 0 };
        for (const [k, v] of Object.entries(fx.affinity)) {
            hero.affinity[k] = (hero.affinity[k] || 0) + v;
            labels.push(`${AFFINITY_LABELS[k] || k} ${signed(v)}`);
        }
    }

    // Etiquetas numéricas según lo que cambió de verdad (por ejemplo, un daño limitado por el mínimo de 1 HP)
    const dMax = hero.maxHp - before.maxHp;
    const dAtq = hero.atq - before.atq;
    const dHp = (hero.hp - before.hp) - Math.max(0, dMax);
    const nums = [];
    if (dAtq) nums.push(`${signed(dAtq)} ATK`);
    if (dMax) nums.push(`${signed(dMax)} HP máx`);
    if (dHp) nums.push(`${signed(dHp)} HP`);
    if (dAtq > 0 || dMax > 0) hero.level += 1;
    return [...nums, ...labels];
}

// --- Selección de evento (sin repetirse en la misma partida) ---
export function pickRpgEvent(usedIds = [], floor = 1, rng = Math.random, cfg = Engine.RPG_MAP_CONFIG) {
    const used = new Set(usedIds);
    // Un evento que salta un piso solo cabe si quedan al menos dos pisos normales por delante
    const fits = e => !e.skipsFloor || floor <= cfg.floors - 4;
    let pool = RPG_EVENTS.filter(e => !used.has(e.id) && fits(e));
    if (!pool.length) pool = RPG_EVENTS.filter(fits); // catálogo agotado: se reinicia
    return pool[Math.floor(rng() * pool.length)].id;
}

// --- Sesión de un evento (puede tener varias pantallas) ---
export function startRpgEvent(eventId, rng = Math.random, floor = 1) {
    const ev = getRpgEvent(eventId);
    if (!ev) return null;
    return { eventId, floor, screen: 'start', state: ev.setup ? ev.setup(rng) : {}, done: false };
}

/** Lo que se muestra ahora: { icon, title, text, options: [label, label] } */
export function rpgEventScreen(session) {
    const ev = session && getRpgEvent(session.eventId);
    if (!ev) return null;
    let screen;
    if (session.screen === 'start') screen = { text: ev.text, options: ev.options };
    else {
        const s = ev.screens && ev.screens[session.screen];
        screen = typeof s === 'function' ? s(session.state) : s;
    }
    if (!screen) return null;
    const text = typeof screen.text === 'function' ? screen.text(session.state) : screen.text;
    return { icon: ev.icon, title: ev.title, text, options: screen.options.map(o => o.label) };
}

function weightedPick(list, rng) {
    const total = list.reduce((s, c) => s + c.w, 0);
    let roll = rng() * total;
    for (const c of list) { roll -= c.w; if (roll < 0) return c; }
    return list[list.length - 1];
}

function resolveOutcome(outcome, ctx, acc) {
    const o = typeof outcome === 'function' ? outcome(ctx) : outcome;
    if (!o) return;
    if (o.text) acc.lines.push(...[].concat(o.text));
    if (o.fx) acc.changes.push(...applyRpgFx(ctx.hero, o.fx));
    if (o.chance && o.chance.length) resolveOutcome(weightedPick(o.chance, ctx.rng).outcome, ctx, acc);
    if (o.ifStat) {
        const { stat, min } = o.ifStat;
        resolveOutcome((ctx.hero[stat] || 0) >= min ? o.ifStat.then : o.ifStat.else, ctx, acc);
    }
    if (o.combat) acc.combat = o.combat;
    if (o.skipFloor) acc.skipFloor = true;
    if (o.next) acc.next = o.next;
}

/**
 * Resuelve la decisión `index` (0 o 1) de la pantalla actual.
 * Devuelve { ok, lines, changes, next, combat, skipFloor }:
 *  - next: true si el evento continúa en otra pantalla (usa rpgEventScreen otra vez)
 *  - combat: { monster, hpFactor, onWin, onWinText } si el evento acaba en pelea
 */
export function resolveRpgEventChoice(session, index, hero, rng = Math.random) {
    const ev = session && getRpgEvent(session.eventId);
    if (!ev || session.done) return { ok: false, error: 'El evento ya terminó.' };
    const options = session.screen === 'start'
        ? ev.options
        : (() => { const s = ev.screens[session.screen]; return (typeof s === 'function' ? s(session.state) : s).options; })();
    const option = options[index];
    if (!option) return { ok: false, error: 'Decisión no válida.' };

    const acc = { lines: [], changes: [], combat: null, skipFloor: false, next: null };
    resolveOutcome(option.outcome, { hero, rng, state: session.state, floor: session.floor }, acc);

    if (acc.next) {
        session.screen = acc.next;
        return { ok: true, lines: acc.lines, changes: acc.changes, next: true, combat: null, skipFloor: false };
    }
    session.done = true;
    return { ok: true, lines: acc.lines, changes: acc.changes, next: false, combat: acc.combat, skipFloor: acc.skipFloor };
}

// --- Monstruos de evento ---
/** Crea el enemigo de un combate de evento. hpFactor < 1 lo empieza debilitado. */
export function createEventMonster(monsterId, hero, floor, hpFactor = 1) {
    const def = EVENT_MONSTERS[monsterId];
    if (!def) return null;
    const f = Math.max(0, floor | 0);
    let atq, maxHp, hp;
    if (def.copyHero) {
        atq = hero.atq; maxHp = hero.maxHp; hp = hero.hp;
    } else {
        const base = Engine.rpgMonsterStats(def.base || 'monster', f);
        atq = base.atq + (def.atqBonus || 0);
        maxHp = Math.round(base.hp * (def.hpMul || 1));
        hp = maxHp;
    }
    hp = Math.max(1, Math.round(hp * hpFactor));
    const monster = { type: 'event', floor: f, name: def.name, icon: def.icon, color: def.color, tag: def.tag, atq, hp, maxHp };
    if (def.ai) monster.ai = def.ai;
    return monster;
}

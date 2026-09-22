import { createRng } from './rng.js?v=1.2.0';
import { GAME_VERSION } from './version.js?v=1.2.0';

// =============================================
// 💾 Guardado de partida (puro: recibe el almacenamiento por parámetro, así se prueba sin navegador)
//
// Se guarda TODO lo necesario para retomar justo donde estabas: el mapa, tu posición, el héroe, el evento o el
// combate a medias y el estado del generador aleatorio. Con la misma semilla y las mismas decisiones, la partida se repite igual.
// El guardado lleva una versión: si el formato cambia en el futuro, uno antiguo se descarta con aviso en lugar de romper el juego.
// =============================================
export const SAVE_KEY = 'easy-hero-save';
export const SAVE_VERSION = 2;   // 2: el héroe lleva equipo y hay botín pendiente

const clone = o => JSON.parse(JSON.stringify(o));

// Del combate se guarda todo menos el héroe y el generador aleatorio (esos se restauran aparte)
function _combatData(c) {
    const { hero, rng, ...rest } = c;
    return rest;
}

/** Convierte el estado de la partida en algo que se puede guardar como texto (o null si no hay partida). */
export function snapshotRun(rpg) {
    if (!rpg || !rpg.hero || !rpg.map || rpg.seed == null) return null;
    const c = rpg.combat;
    return clone({
        v: SAVE_VERSION,
        gameVersion: GAME_VERSION, // con qué versión del juego se guardó (solo para diagnosticar; la compatibilidad la decide `v`)
        savedAt: Date.now(),
        seed: rpg.seed,
        rngState: rpg.rng ? rpg.rng.state : null,
        hero: rpg.hero,
        map: rpg.map,
        currentId: rpg.currentId,
        visitedIds: rpg.visitedIds,
        usedEvents: rpg.usedEvents,
        skipNext: rpg.skipNext,
        stats: rpg.stats,
        log: rpg.log,
        combatMenu: rpg.combatMenu,
        pendingNodeId: rpg.pendingNodeId,
        eventCombat: rpg.eventCombat,
        combatResult: rpg.combatResult,
        loot: rpg.loot || null,
        // El héroe y el generador aleatorio se restauran aparte: el combate solo guarda lo suyo
        combat: c ? _combatData(c) : null,
        event: rpg.event ? { nodeId: rpg.event.node.id, session: rpg.event.session, result: rpg.event.result, view: rpg.event.view } : null
    });
}

/** Reconstruye el estado de la partida desde un guardado. Devuelve null si no es válido o es de otra versión. */
export function restoreRun(data) {
    try {
        if (!data || data.v !== SAVE_VERSION) return null;
        if (!data.hero || !data.map || !Array.isArray(data.map.nodes) || typeof data.seed !== 'number') return null;
        if (!Number.isFinite(data.hero.hp) || !Number.isFinite(data.hero.maxHp) || !Number.isFinite(data.hero.atq)) return null;
        if (!data.hero.equipment) return null;
        const rng = createRng(data.seed);
        if (data.rngState != null) rng.state = data.rngState;
        const rpg = {
            seed: data.seed, rng,
            hero: data.hero, map: data.map,
            currentId: data.currentId || null,
            visitedIds: data.visitedIds || [],
            usedEvents: data.usedEvents || [],
            skipNext: !!data.skipNext,
            stats: data.stats || { combatsWon: 0, events: [], campfires: 0, chests: 0 },
            log: data.log || [],
            combatMenu: data.combatMenu || 'main',
            pendingNodeId: data.pendingNodeId || null,
            eventCombat: data.eventCombat || null,
            combatResult: data.combatResult || null,
            loot: data.loot || null,
            combat: null, event: null
        };
        if (data.combat) rpg.combat = { ...data.combat, hero: rpg.hero, rng };
        if (data.event) {
            const node = rpg.map.nodes.find(n => n.id === data.event.nodeId);
            if (!node) return null;
            rpg.event = { node, session: data.event.session, result: data.event.result || null, view: data.event.view || null };
        }
        return rpg;
    } catch {
        return null;
    }
}

/** Guarda la partida. Devuelve true si se pudo. */
export function saveRun(storage, rpg) {
    try {
        const snap = snapshotRun(rpg);
        if (!snap || !storage) return false;
        storage.setItem(SAVE_KEY, JSON.stringify(snap));
        return true;
    } catch {
        return false; // almacenamiento lleno, bloqueado o modo privado: el juego sigue sin guardar
    }
}

/** Carga la partida guardada (o null). */
export function loadRun(storage) {
    try {
        const raw = storage && storage.getItem(SAVE_KEY);
        return raw ? restoreRun(JSON.parse(raw)) : null;
    } catch {
        return null;
    }
}

export function clearRun(storage) {
    try { if (storage) storage.removeItem(SAVE_KEY); } catch { /* nada que hacer */ }
}

/**
 * Mira el guardado sin construir la partida entera. Devuelve:
 *  - null si no hay nada guardado,
 *  - { outdated: true } si es de otra versión o está dañado,
 *  - { floor, floors, hp, maxHp, seed } si se puede retomar.
 */
export function peekRun(storage) {
    try {
        const raw = storage && storage.getItem(SAVE_KEY);
        if (!raw) return null;
        const d = JSON.parse(raw);
        if (!d || d.v !== SAVE_VERSION || !d.hero || !d.map || !Array.isArray(d.map.nodes)) return { outdated: true };
        const node = d.map.nodes.find(n => n.id === d.currentId);
        return { floor: node ? node.floor + 1 : 0, floors: d.map.floors - 1, hp: d.hero.hp, maxHp: d.hero.maxHp, seed: d.seed };
    } catch {
        return { outdated: true };
    }
}

import { ALL_MONSTER_DEFS, SUBBOSS_ROSTER, BOSS_DEF, DEEP_BOSSES } from './data/monsters.js?v=1.4.0';
import { EVENT_MONSTERS, RPG_EVENTS } from './data/events.js?v=1.4.0';
import { DAMAGE_TYPES } from './items.js?v=1.4.0';
import { PRIMARY_KEYS, XP_REWARD, POINTS_PER_LEVEL, xpToNext } from './stats.js?v=1.4.0';
import { UPGRADES, UPGRADES_BY_ID, upgradeCost, upgradeMax } from './data/upgrades.js?v=1.4.0';
import { RPG_BALANCE } from './data/balance.js?v=1.4.0';
export { PRIMARY_KEYS, XP_REWARD, POINTS_PER_LEVEL, xpToNext };
export { UPGRADES, UPGRADES_BY_ID, upgradeCost, upgradeMax };

// =============================================
// 🐺 Progreso persistente — bestiario, colección de objetos y logros.
// A diferencia de save.js (una partida a medias), esto sobrevive a TODAS las partidas: es la
// «crónica» del jugador (P10 de planning.md), aunque solo la parte que se puede construir ya
// con lo que existe hoy (sin desbloqueos de contenido todavía). Nunca da poder: solo información.
// =============================================
export const META_KEY = 'easy-hero-meta';
export const META_VERSION = 1;

// --- Bestiario: todo lo que puede aparecer en un combate, con una clave estable (el nombre base).
// «Ogro Colérico de la Plaga» se anota como «Ogro»: las variantes son medallas dentro de su ficha
// (meta.variantsSeen), no entradas nuevas, o el panel tendría miles de casillas. ---
export const BESTIARY = [
    ...ALL_MONSTER_DEFS.map(m => ({ ...m, kind: 'monster' })),
    ...SUBBOSS_ROSTER.map(m => ({ ...m, kind: 'subboss' })),
    { ...BOSS_DEF, kind: 'boss' },
    ...DEEP_BOSSES.map(m => ({ ...m, kind: 'boss' })),
    ...Object.values(EVENT_MONSTERS).map(m => ({ name: m.name, icon: m.icon, kind: 'event', tag: m.tag }))
];
export const BESTIARY_BY_NAME = Object.fromEntries(BESTIARY.map(m => [m.name, m]));

const emptyMeta = () => ({
    v: META_VERSION,
    runsPlayed: 0, runsWon: 0, bestFloor: 0,
    combatsWonTotal: 0,
    legendaryEquipped: false,
    monstersSeen: {}, monstersDefeated: {},
    itemsSeen: {},              // baseId -> { name, icon, rarities: [id,...] }
    damageTypesEquipped: {},    // 'filo' | 'contundente' | ... -> true
    eventsSeenEver: {},
    achievements: {},           // id -> timestamp (ms) del desbloqueo
    gold: 0,                    // nunca se pierde, ni al morir: es lo que se gasta en La Forja
    trophyItem: null,           // el objeto legendario del jefe final: una vez ganado, para siempre
    upgrades: {},               // id de La Forja -> nivel comprado (permanente)
    bestDepth: 0,               // profundidad absoluta máxima alcanzada (el récord del descenso)
    bestTier: 0,                // tramo más hondo al que se ha llegado
    variantsSeen: {},           // nombre base -> { adj: {id: true}, lin: {id: true} }: medallas del bestiario
    lastSeen: null,             // marca de tiempo de la última vez que se jugó (para la expedición)
    // --- Nivel de personaje: PERMANENTE, sobrevive a la muerte y a todas las rutas (decisión explícita del
    // usuario: reabre a propósito la meta-progresión «solo horizontal» — ver historial.md) ---
    charLevel: 1, xp: 0, statPoints: 0,
    primary: { str: 0, dex: 0, int: 0, vit: 0 }   // puntos YA INVERTIDOS, por encima de la base (5/5/5/5)
});

export function loadMeta(storage) {
    try {
        const raw = storage && storage.getItem(META_KEY);
        if (!raw) return emptyMeta();
        const data = JSON.parse(raw);
        if (!data || data.v !== META_VERSION) return emptyMeta();
        return { ...emptyMeta(), ...data };
    } catch {
        return emptyMeta();
    }
}

export function saveMeta(storage, meta) {
    if (!storage) return false;
    try { storage.setItem(META_KEY, JSON.stringify(meta)); return true; } catch { return false; }
}

// --- Registrar lo que va ocurriendo (todo es idempotente: llamar dos veces no rompe nada) ---
export function recordRunStart(meta) { meta.runsPlayed++; }
export function recordRunEnd(meta, { result, floor }) {
    if (result === 'victory') meta.runsWon++;
    meta.bestFloor = Math.max(meta.bestFloor, floor | 0);
}
export function recordCombatWin(meta) { meta.combatsWonTotal++; }
export function recordGold(meta, amount) { meta.gold = Math.max(0, meta.gold + (amount | 0)); }

/** Guarda el récord del descenso: profundidad absoluta y en qué tramo se logró. */
export function recordDepth(meta, { depth, tier }) {
    meta.bestDepth = Math.max(meta.bestDepth || 0, depth | 0);
    meta.bestTier = Math.max(meta.bestTier || 0, tier | 0);
}

/** Anota que has visto a un monstruo con esa variante (las medallas de su ficha del bestiario). */
export function recordVariantSeen(meta, baseName, variants) {
    if (!baseName || !variants) return;
    const cur = meta.variantsSeen[baseName] || { adj: {}, lin: {} };
    if (variants.adj) cur.adj[variants.adj] = true;
    if (variants.lin) cur.lin[variants.lin] = true;
    meta.variantsSeen[baseName] = cur;
}

// --- ⚒️ La Forja: mejoras permanentes que se compran con el oro acumulado ---

export const upgradeLevel = (meta, id) => (meta.upgrades && meta.upgrades[id]) || 0;

/** Lo que cuesta la SIGUIENTE compra de esa mejora (Infinity si ya está al máximo). */
export function nextUpgradeCost(meta, id) {
    const def = UPGRADES_BY_ID[id];
    return def ? upgradeCost(def, upgradeLevel(meta, id)) : Infinity;
}

export function canBuyUpgrade(meta, id) {
    const cost = nextUpgradeCost(meta, id);
    return Number.isFinite(cost) && meta.gold >= cost;
}

/** Compra una mejora. Devuelve { ok, cost, level }; `ok: false` si no llega el oro o está al máximo. */
export function buyUpgrade(meta, id) {
    const cost = nextUpgradeCost(meta, id);
    if (!canBuyUpgrade(meta, id)) return { ok: false, cost, level: upgradeLevel(meta, id) };
    meta.gold -= cost;
    meta.upgrades[id] = upgradeLevel(meta, id) + 1;
    return { ok: true, cost, level: meta.upgrades[id] };
}

/** Lo que aporta ahora mismo una mejora (nivel × lo de cada nivel). 0 si no se ha comprado. */
export function upgradeEffect(meta, id) {
    const def = UPGRADES_BY_ID[id];
    return def ? upgradeLevel(meta, id) * def.perLevel : 0;
}

/**
 * Cobra lo que ha rendido la expedición mientras no jugabas, al abrir el juego.
 * Devuelve { gold, hours, capped }. La primera vez no da nada: solo pone el reloj en marcha.
 */
export function claimExpedition(meta, now = Date.now()) {
    const E = RPG_BALANCE.expedition;
    const since = meta.lastSeen;
    meta.lastSeen = now;
    if (!since || now <= since) return { gold: 0, hours: 0, capped: false };
    const rawHours = (now - since) / 3600000;
    const hours = Math.min(E.maxHours, rawHours);
    const rate = E.goldPerHour * (1 + (meta.bestTier || 0));   // cuanto más hondo has llegado, más rinde
    const gold = Math.floor(hours * rate);
    if (gold > 0) recordGold(meta, gold);
    return { gold, hours, capped: rawHours > E.maxHours };
}

/**
 * Suma XP y sube de nivel las veces que hagan falta (permanente: no se reinicia nunca).
 * Devuelve cuántos niveles se ganaron ahora mismo y cuántos puntos quedan por repartir en total.
 */
export function recordXp(meta, amount) {
    meta.xp += Math.max(0, amount | 0);
    let levelsGained = 0;
    while (meta.xp >= xpToNext(meta.charLevel)) {
        meta.xp -= xpToNext(meta.charLevel);
        meta.charLevel++;
        meta.statPoints += POINTS_PER_LEVEL;
        levelsGained++;
    }
    return { levelsGained, newLevel: meta.charLevel, statPoints: meta.statPoints };
}

/** Gasta un punto de nivel en una primaria (str/dex/int/vit). Devuelve `false` si no quedan puntos. */
export function spendStatPoint(meta, key) {
    if (!PRIMARY_KEYS.includes(key) || meta.statPoints <= 0) return false;
    meta.statPoints--;
    meta.primary[key] = (meta.primary[key] || 0) + 1;
    return true;
}
/** Ganar un trofeo nuevo del jefe: solo se guarda si no había uno, o si `replace` es explícito. */
export function recordTrophy(meta, item, replace = false) {
    if (!meta.trophyItem || replace) meta.trophyItem = item;
}
export function recordMonsterSeen(meta, name) { if (name) meta.monstersSeen[name] = true; }
export function recordMonsterDefeated(meta, name) { if (name) meta.monstersDefeated[name] = true; }
export function recordEventSeen(meta, eventId) { if (eventId) meta.eventsSeenEver[eventId] = true; }
export function recordItemSeen(meta, item) {
    if (!item) return;
    const cur = meta.itemsSeen[item.baseId] || { name: item.name, icon: item.icon, slot: item.slot, rarities: [] };
    if (!cur.rarities.includes(item.rarity)) cur.rarities.push(item.rarity);
    meta.itemsSeen[item.baseId] = cur;
}
export function recordItemEquipped(meta, item) {
    if (!item) return;
    recordItemSeen(meta, item);
    if (item.rarity === 'legendaria') meta.legendaryEquipped = true;
    if (item.damaged) meta.damageTypesEquipped[item.damaged] = true;
}

// --- Logros: cada uno es información, nunca poder (coherente con la meta-progresión horizontal) ---
export const ACHIEVEMENTS = [
    { id: 'first_blood', icon: '🩸', name: 'Primera sangre', desc: 'Gana tu primer combate.',
        check: (m) => m.combatsWonTotal >= 1 },
    { id: 'first_run', icon: '🔚', name: 'La primera ruta', desc: 'Termina una partida, ganes o pierdas.',
        check: (m) => m.runsPlayed >= 1 },
    { id: 'victory', icon: '🏆', name: 'La ruta es tuya', desc: 'Vence al jefe final.',
        check: (m) => m.runsWon >= 1 },
    { id: 'no_gear_win', icon: '👑', name: 'Solo con lo puesto', desc: 'Vence al jefe sin haber equipado ni un objeto.',
        check: (m, ctx) => !!ctx && !!ctx.stats && ctx.result === 'victory' && ctx.stats.equipped === 0 },
    { id: 'flawless', icon: '🏃', name: 'Paso firme', desc: 'Vence al jefe sin huir de ningún combate.',
        check: (m, ctx) => !!ctx && !!ctx.stats && ctx.result === 'victory' && (ctx.stats.fled || 0) === 0 },
    { id: 'lector', icon: '👁️', name: 'El Lector, leído', desc: 'Vence a El Lector.',
        check: (m) => !!m.monstersDefeated['El Lector'] },
    { id: 'dragon', icon: '🐉', name: 'Cazador de dragones', desc: 'Vence al Dragón Ancestral.',
        check: (m) => !!m.monstersDefeated['Dragón Ancestral'] },
    { id: 'legendary', icon: '🟠', name: 'Toque de leyenda', desc: 'Equipa tu primer objeto legendario.',
        check: (m) => m.legendaryEquipped },
    { id: 'full_gear', icon: '🎒', name: 'Manos llenas', desc: 'Termina una ruta con las 4 ranuras ocupadas.',
        check: (m, ctx) => !!ctx && !!ctx.hero && !!ctx.hero.equipment && ['weapon', 'secondary', 'armor', 'accessory'].every(s => ctx.hero.equipment[s]) },
    { id: 'arsenal', icon: '⚔️', name: 'Arsenal completo', desc: 'Equipa alguna vez un arma de cada tipo de daño.',
        check: (m) => Object.keys(m.damageTypesEquipped).length >= Object.keys(DAMAGE_TYPES).length },
    { id: 'floor10', icon: '🗺️', name: 'A medio camino', desc: 'Llega al piso 10.',
        check: (m) => m.bestFloor >= 10 },
    { id: 'floor_boss', icon: '🚪', name: 'A las puertas', desc: 'Llega hasta el jefe final.',
        check: (m, ctx, cfg) => m.bestFloor >= (cfg.floors - 1) },
    // El bestiario pasó de 24 a más de cien fichas con el descenso: los hitos van escalonados para que
    // haya siempre una meta cerca y otra lejísimos, en vez de una sola imposible.
    { id: 'bestiary_25', icon: '📖', name: 'Estudioso', desc: 'Descubre 25 criaturas distintas.',
        check: (m) => Object.keys(m.monstersSeen).length >= 25 },
    { id: 'bestiary_50', icon: '🐺', name: 'Naturalista', desc: 'Descubre 50 criaturas distintas.',
        check: (m) => Object.keys(m.monstersSeen).length >= 50 },
    { id: 'bestiary_full', icon: '🏅', name: 'Archivero', desc: `Descubre las ${BESTIARY.length} criaturas del bestiario.`,
        check: (m) => Object.keys(m.monstersSeen).length >= BESTIARY.length },
    { id: 'variants_10', icon: '🧬', name: 'Coleccionista de rarezas', desc: 'Encuentra 10 variantes distintas de monstruo.',
        check: (m) => {
            const ids = new Set();
            for (const v of Object.values(m.variantsSeen || {})) {
                Object.keys(v.adj || {}).forEach(id => ids.add(`a:${id}`));
                Object.keys(v.lin || {}).forEach(id => ids.add(`l:${id}`));
            }
            return ids.size >= 10;
        } },
    // --- El descenso sin fin ---
    { id: 'depth_tier1', icon: '🕳️', name: 'Más abajo', desc: 'Vence al Dragón y sigue bajando al segundo tramo.',
        check: (m) => (m.bestTier || 0) >= 1 },
    { id: 'depth_tier3', icon: '🌑', name: 'Sin fondo', desc: 'Llega al cuarto tramo de la mazmorra.',
        check: (m) => (m.bestTier || 0) >= 3 },
    { id: 'depth_50', icon: '⛏️', name: 'Cincuenta pisos', desc: 'Alcanza la profundidad 50.',
        check: (m) => (m.bestDepth || 0) >= 50 },
    { id: 'forge_first', icon: '⚒️', name: 'La primera chispa', desc: 'Compra tu primera mejora en La Forja.',
        check: (m) => Object.keys(m.upgrades || {}).length >= 1 },
    { id: 'forge_rich', icon: '💰', name: 'Fondo de guerra', desc: 'Acumula 1000 monedas de oro.',
        check: (m) => (m.gold || 0) >= 1000 },
    { id: 'events_full', icon: '🎲', name: 'Sin secretos', desc: `Vive los ${RPG_EVENTS.length} eventos del catálogo.`,
        check: (m) => Object.keys(m.eventsSeenEver).length >= RPG_EVENTS.length }
];

/** Revisa todos los logros y desbloquea los que tocan. Devuelve los que se acaban de desbloquear ahora mismo. */
export function checkAchievements(meta, ctx = null, cfg = { floors: 16 }) {
    const unlocked = [];
    for (const a of ACHIEVEMENTS) {
        if (meta.achievements[a.id]) continue;
        if (a.check(meta, ctx, cfg)) { meta.achievements[a.id] = Date.now(); unlocked.push(a); }
    }
    return unlocked;
}

import { ALL_MONSTER_DEFS, SUBBOSS_ROSTER, BOSS_DEF, DEEP_BOSSES } from './data/monsters.js?v=1.12.0';
import { EVENT_MONSTERS, RPG_EVENTS } from './data/events.js?v=1.12.0';
import { DAMAGE_TYPES } from './items.js?v=1.12.0';
import { PRIMARY_KEYS, XP_REWARD, POINTS_PER_LEVEL, xpToNext } from './stats.js?v=1.12.0';
import { UPGRADES, UPGRADES_BY_ID, upgradeCost, upgradeMax, upgradeTotal } from './data/upgrades.js?v=1.12.0';
import { RPG_BALANCE } from './data/balance.js?v=1.12.0';
import { ELIXIRS, FOOD } from './data/effects.js?v=1.12.0';
import { GEAR, STARTER_GEAR, WEAPON_UPGRADE } from './data/gear.js?v=1.12.0';
import { SELL_RATE } from './data/shops.js?v=1.12.0';
import { MATERIALS } from './data/loot.js?v=1.12.0';
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
    potions: 0,                 // pociones que llevas encima: son tuyas entre partidas (tope en RPG_BALANCE.potion.max)
    manaPotions: 0,             // pociones de maná menor, igual (tope en RPG_BALANCE.manaPotion.max)
    elixirs: {},                // elixires que llevas encima ({ fuerza: 1, … }; src/data/effects.js, cada uno con su tope)
    bestDepth: 0,               // profundidad absoluta máxima alcanzada (el récord del descenso)
    bestTier: 0,                // tramo más hondo al que se ha llegado
    variantsSeen: {},           // nombre base -> { adj: {id: true}, lin: {id: true} }: medallas del bestiario
    lastSeen: null,             // marca de tiempo de la última vez que se jugó (para la expedición)
    // --- Nivel de personaje: PERMANENTE, sobrevive a la muerte y a todas las rutas (decisión explícita del
    // usuario: reabre a propósito la meta-progresión «solo horizontal» — ver historial.md) ---
    charLevel: 1, xp: 0, statPoints: 0,
    heroName: '',               // el nombre que el jugador escribe al despertar en la introducción ('' = «Héroe»)
    introSeen: false,           // ya vio la introducción: al entrar, directo a la aventura
    advGear: ['espada-de-hierro'],   // el inventario de la aventura (ids de src/data/gear.js): permanente
    advWeapon: 'espada-de-hierro',   // el arma equipada en la aventura
    advArmor: 'armadura-de-acero',   // la armadura equipada (una sola pieza: es la que se le ve puesta)
    advUpgrades: {},            // cristales de mejora puestos en cada arma de la aventura ({ id: n }, +1 ATK cada uno)
    crystals: 0,                // cristales de mejora que llevas (se compran en la forja y Bram los gasta al mejorar un arma)
    materials: {},              // materiales que sueltan los enemigos ({ 'piel-lobo': 2 }), src/data/loot.js
    food: {},                   // comida que llevas ({ pan: 2 }), src/data/effects.js FOOD: se come desde el inventario
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
// --- 🪙 Precios de la tienda: en modo pruebas (RPG_BALANCE.freeShop) todo sale gratis ---
export const shopPrice = n => (RPG_BALANCE.freeShop ? 0 : n);

export function nextUpgradeCost(meta, id) {
    const def = UPGRADES_BY_ID[id];
    const cost = def ? upgradeCost(def, upgradeLevel(meta, id)) : Infinity;
    return Number.isFinite(cost) ? shopPrice(cost) : cost;
}

// --- ⚔️ El mercader de la aventura: armas (src/data/gear.js) y cristales de mejora ---
export const ownsGear = (meta, id) => (meta.advGear || []).includes(id);
export function canBuyGear(meta, id) {
    const g = GEAR[id];
    return !!g && g.price != null && !ownsGear(meta, id) && meta.gold >= shopPrice(g.price);
}
export function buyGear(meta, id) {
    const cost = GEAR[id] ? shopPrice(GEAR[id].price) : 0;
    if (!canBuyGear(meta, id)) return { ok: false, cost };
    meta.gold -= cost;
    meta.advGear = [...(meta.advGear || []), id];
    return { ok: true, cost };
}
export const weaponUpgradeLevel = (meta, id) => Math.max(0, ((meta.advUpgrades || {})[id]) | 0);
// El cristal de mejora: se compra (y se lleva encima) y se gasta al mejorar un arma
export const crystalCount = meta => Math.max(0, meta.crystals | 0);
export function canBuyCrystal(meta) {
    return crystalCount(meta) < WEAPON_UPGRADE.carry && meta.gold >= shopPrice(WEAPON_UPGRADE.price);
}
export function buyCrystal(meta) {
    const cost = shopPrice(WEAPON_UPGRADE.price);
    if (!canBuyCrystal(meta)) return { ok: false, cost };
    meta.gold -= cost;
    meta.crystals = crystalCount(meta) + 1;
    return { ok: true, cost, count: meta.crystals };
}
export function canUpgradeWeapon(meta, id) {
    return !!GEAR[id] && GEAR[id].slot === 'weapon' && ownsGear(meta, id) && weaponUpgradeLevel(meta, id) < WEAPON_UPGRADE.max && crystalCount(meta) >= 1;
}
/** Gasta un cristal en el arma `id`: +1 ATK para siempre, hasta WEAPON_UPGRADE.max. */
export function upgradeWeapon(meta, id) {
    if (!canUpgradeWeapon(meta, id)) return { ok: false };
    meta.crystals = crystalCount(meta) - 1;
    meta.advUpgrades = { ...(meta.advUpgrades || {}), [id]: weaponUpgradeLevel(meta, id) + 1 };
    return { ok: true, level: meta.advUpgrades[id] };
}

// --- 💰 Vender: cada tienda te compra lo que vende, al SELL_RATE de su precio (src/data/shops.js) ---
// Claves: 'potion' · 'mana_potion' · 'elixir:<id>' · 'food:<id>' · 'crystal' · 'gear:<id>'
export const sellValue = price => Math.floor(shopPrice(price) * SELL_RATE);
/** Lo que tienes de `key` y lo que te dan por una unidad: { have, value } (have 0 = no hay nada que vender). */
export function sellInfo(meta, key) {
    const [kind, id] = String(key).split(':');
    if (kind === 'potion') return { have: potionCount(meta), value: sellValue(RPG_BALANCE.potion.price) };
    if (kind === 'mana_potion') return { have: manaPotionCount(meta), value: sellValue(RPG_BALANCE.manaPotion.price) };
    if (kind === 'elixir' && ELIXIRS[id]) return { have: elixirCount(meta, id), value: sellValue(ELIXIRS[id].price) };
    if (kind === 'food' && FOOD[id]) return { have: foodCount(meta, id), value: sellValue(FOOD[id].price) };
    if (kind === 'crystal') return { have: crystalCount(meta), value: sellValue(WEAPON_UPGRADE.price) };
    // Un arma o una armadura se puede vender si es tuya, tiene precio y no es la que llevas puesta (ni la de inicio)
    if (kind === 'gear' && GEAR[id] && GEAR[id].price != null) {
        const equipped = (meta.advWeapon || STARTER_GEAR) === id || meta.advArmor === id;
        return { have: ownsGear(meta, id) && !equipped && id !== STARTER_GEAR ? 1 : 0, value: sellValue(GEAR[id].price), equipped: ownsGear(meta, id) && equipped };
    }
    // Un material se vende por su valor entero (los de misión no tienen valor: no se venden)
    if (kind === 'material' && MATERIALS[id] && MATERIALS[id].value != null) return { have: materialCount(meta, id), value: shopPrice(MATERIALS[id].value) };
    return { have: 0, value: 0 };
}
/** Vende una unidad de `key`. Un arma vendida pierde sus cristales de mejora. */
export function sellItem(meta, key) {
    const { have, value } = sellInfo(meta, key);
    if (have <= 0) return { ok: false, value };
    const [kind, id] = String(key).split(':');
    if (kind === 'potion') meta.potions = potionCount(meta) - 1;
    else if (kind === 'mana_potion') meta.manaPotions = manaPotionCount(meta) - 1;
    else if (kind === 'elixir') meta.elixirs = { ...(meta.elixirs || {}), [id]: elixirCount(meta, id) - 1 };
    else if (kind === 'food') meta.food = { ...(meta.food || {}), [id]: foodCount(meta, id) - 1 };
    else if (kind === 'crystal') meta.crystals = crystalCount(meta) - 1;
    else if (kind === 'material') meta.materials = { ...(meta.materials || {}), [id]: materialCount(meta, id) - 1 };
    else if (kind === 'gear') {
        meta.advGear = (meta.advGear || []).filter(g => g !== id);
        const { [id]: _gone, ...rest } = meta.advUpgrades || {};
        meta.advUpgrades = rest;
    }
    meta.gold += value;
    return { ok: true, value };
}

/** Gasta `n` materiales (entregarlos en una misión). Devuelve false si no hay bastantes. */
export function takeMaterial(meta, id, n = 1) {
    if (materialCount(meta, id) < n) return false;
    meta.materials = { ...(meta.materials || {}), [id]: materialCount(meta, id) - n };
    return true;
}

// --- 🎒 Botín de los enemigos (src/data/loot.js) ---
export const materialCount = (meta, id) => Math.max(0, ((meta.materials || {})[id]) | 0);
/**
 * Guarda lo que soltó un enemigo (un resultado de rollDrop). Las pociones respetan su tope: si ya llevas el máximo,
 * se queda en el suelo. Devuelve true si te lo llevas.
 */
export function grantDrop(meta, drop) {
    if (!drop) return false;
    if (drop.kind === 'potion') {
        if (potionCount(meta) >= RPG_BALANCE.potion.max) return false;
        meta.potions = potionCount(meta) + 1;
        return true;
    }
    if (drop.kind === 'manaPotion') {
        if (manaPotionCount(meta) >= RPG_BALANCE.manaPotion.max) return false;
        meta.manaPotions = manaPotionCount(meta) + 1;
        return true;
    }
    if (drop.kind === 'material' && drop.id) {
        meta.materials = { ...(meta.materials || {}), [drop.id]: materialCount(meta, drop.id) + 1 };
        return true;
    }
    return false;
}

/** Lo que te dan por una poción que cae y no te cabe: lo mismo que si la vendieras (0 si no es una poción). */
export function spareDropGold(drop) {
    if (!drop) return 0;
    if (drop.kind === 'potion') return sellValue(RPG_BALANCE.potion.price);
    if (drop.kind === 'manaPotion') return sellValue(RPG_BALANCE.manaPotion.price);
    return 0;
}

// --- 🍞 Comida (src/data/effects.js FOOD) ---
export const foodCount = (meta, id) => Math.max(0, ((meta.food || {})[id]) | 0);
export function canBuyFood(meta, id) {
    const F = FOOD[id];
    return !!F && foodCount(meta, id) < F.max && meta.gold >= shopPrice(F.price);
}
export function buyFood(meta, id) {
    const cost = FOOD[id] ? shopPrice(FOOD[id].price) : 0;
    if (!canBuyFood(meta, id)) return { ok: false, cost };
    meta.gold -= cost;
    meta.food = { ...(meta.food || {}), [id]: foodCount(meta, id) + 1 };
    return { ok: true, cost, count: meta.food[id] };
}
/** Gasta una de comida (si queda). Devuelve true si se la comió. */
export function eatFood(meta, id) {
    if (foodCount(meta, id) <= 0) return false;
    meta.food = { ...(meta.food || {}), [id]: foodCount(meta, id) - 1 };
    return true;
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

// --- 🧪 Elixires (src/data/effects.js): se compran y se llevan encima; en combate dan un efecto ---
export const elixirCount = (meta, id) => Math.max(0, ((meta.elixirs || {})[id]) | 0);
export function canBuyElixir(meta, id) {
    const E = ELIXIRS[id];
    return !!E && E.sold !== false && elixirCount(meta, id) < E.max && meta.gold >= shopPrice(E.price);
}
export function buyElixir(meta, id) {
    const E = ELIXIRS[id];
    const cost = E ? shopPrice(E.price) : 0;
    if (!canBuyElixir(meta, id)) return { ok: false, cost, count: elixirCount(meta, id) };
    meta.gold -= cost;
    meta.elixirs = { ...(meta.elixirs || {}), [id]: elixirCount(meta, id) + 1 };
    return { ok: true, cost, count: meta.elixirs[id] };
}
/** Los elixires para un combate (una copia: el combate los gasta y quien lo creó recoge los que sobren). */
export const elixirsForCombat = meta => Object.fromEntries(Object.keys(ELIXIRS).map(id => [id, elixirCount(meta, id)]));

// --- 💧 Pociones de maná menor: igual que las de vida, con su propio tope y precio ---
export const manaPotionCount = meta => Math.max(0, meta.manaPotions | 0);
export function canBuyManaPotion(meta) {
    const P = RPG_BALANCE.manaPotion;
    return manaPotionCount(meta) < P.max && meta.gold >= shopPrice(P.price);
}
export function buyManaPotion(meta) {
    const cost = shopPrice(RPG_BALANCE.manaPotion.price);
    if (!canBuyManaPotion(meta)) return { ok: false, cost, count: manaPotionCount(meta) };
    meta.gold -= cost;
    meta.manaPotions = manaPotionCount(meta) + 1;
    return { ok: true, cost, count: meta.manaPotions };
}

// --- 🧪 Pociones: se compran con oro a precio fijo y se llevan encima entre partidas ---
export const potionCount = meta => Math.max(0, meta.potions | 0);

export function canBuyPotion(meta) {
    const P = RPG_BALANCE.potion;
    return potionCount(meta) < P.max && meta.gold >= shopPrice(P.price);
}

/** Compra una poción. Devuelve { ok, cost, count }; `ok: false` si no llega el oro o ya llevas el máximo. */
export function buyPotion(meta) {
    const cost = shopPrice(RPG_BALANCE.potion.price);
    if (!canBuyPotion(meta)) return { ok: false, cost, count: potionCount(meta) };
    meta.gold -= cost;
    meta.potions = potionCount(meta) + 1;
    return { ok: true, cost, count: meta.potions };
}

/** Lo que aporta ahora mismo una mejora (con `ramp`, +1 +2 +3…). 0 si no se ha comprado. */
export function upgradeEffect(meta, id) {
    const def = UPGRADES_BY_ID[id];
    return def ? upgradeTotal(def, upgradeLevel(meta, id)) : 0;
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

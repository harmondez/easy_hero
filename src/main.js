import * as UI from './ui.js?v=1.12.0';
import * as Engine from './engine.js?v=1.12.0';
import * as Events from './events.js?v=1.12.0';
import * as Save from './save.js?v=1.12.0';
import * as Items from './items.js?v=1.12.0';
import * as Meta from './meta.js?v=1.12.0';
import * as AdventureMode from './adventure.js?v=1.12.0';
import { playIntro } from './intro.js?v=1.12.0';
import { ART } from './data/art.js?v=1.12.0';
import { heroArt } from './art.js?v=1.12.0';
import { RPG_BALANCE } from './data/balance.js?v=1.12.0';
import { tierName } from './data/monsters.js?v=1.12.0';
import { createRng, newSeed, seedToCode, codeToSeed } from './rng.js?v=1.12.0';
import { GAME_VERSION } from './version.js?v=1.12.0';

// Expuesto para depuración y para los tests del navegador
window.Engine = Engine;
window.Events = Events;
window.UI = UI;
window.Save = Save;
window.Items = Items;
window.Meta = Meta;
window.openLoot = (source, floor) => _rpgOpenLoot(source, floor);   // para pruebas y depuración
window.GAME_VERSION = GAME_VERSION;

// El guardado vive en el navegador; si está bloqueado (modo privado, etc.) el juego sigue funcionando sin guardar
const storage = (() => {
    try { const s = window.localStorage; s.getItem('easy-hero-probe'); return s; } catch { return null; }
})();

// --- 🐺 Progreso persistente: bestiario, colección y logros (sobrevive a todas las partidas) ---
const meta = Meta.loadMeta(storage);
window.gameMeta = meta;
function persistMeta() { Meta.saveMeta(storage, meta); }

const newStats = () => ({ combatsWon: 0, events: [], campfires: 0, chests: 0, equipped: 0, discarded: 0, fled: 0 });

const gameState = {
    rpg: {
        seed: null,
        rng: null,            // generador aleatorio de TODA la partida (se guarda y se retoma)
        hero: null,
        map: null,
        currentId: null,
        visitedIds: [],
        combat: null,
        combatMenu: 'main',
        combatResult: null,   // panel de fin de combate que está a la vista (para retomarlo)
        loot: null,           // botín abierto: { source, floor, offers: [objetos], selected }
        pendingNodeId: null,
        pendingBossMonster: null, // el jefe, mientras se decide el trofeo antes de ir al resumen
        charSelection: null,  // { from: 'equipment'|'inventory', slot? , index? } en la pantalla de Personaje
        // Eventos
        event: null,          // { node, session, result, view } mientras hay un evento abierto
        eventCombat: null,    // spec del combate de evento en curso ({ onWin, onWinText, ... })
        usedEvents: [],       // ids ya vistos en esta partida (no se repiten)
        skipNext: false,      // el puente de cuerdas: el próximo movimiento se salta un piso
        // Resumen y diario
        stats: newStats(),
        log: [],
        ended: false
    }
};
window.gameState = gameState;

function safeListener(id, eventType, callback) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(eventType, callback);
    } else {
        console.warn(`Aviso: no se encontró el ID '${id}'.`);
    }
}

// --- Guardado ---
function persist() {
    const r = gameState.rpg;
    if (r.hero && r.map && !r.ended) Save.saveRun(storage, r);
}

function refreshContinueButton() {
    const notice = document.getElementById('rpgStartNotice');
    if (notice) { notice.style.display = 'none'; notice.textContent = ''; }
    const peek = Save.peekRun(storage);
    if (peek && peek.outdated) {
        Save.clearRun(storage);
        if (notice) { notice.textContent = 'La partida guardada era de otra versión del juego y se ha descartado.'; notice.style.display = ''; }
        UI.renderRpgContinue(null);
        return;
    }
    UI.renderRpgContinue(peek ? {
        floorText: peek.floor
            ? `${tierName(peek.tier || 0)} · Piso ${peek.floor} / ${peek.floors}`
            : `${tierName(peek.tier || 0)} · al inicio del tramo`,
        hpText: `HP ${peek.hp} / ${peek.maxHp}`,
        seedCode: seedToCode(peek.seed)
    } : null);
}

/** Aviso bajo la carta del héroe en la pantalla de inicio (lo borra `refreshContinueButton`). */
function startNotice(text) {
    const el = document.getElementById('rpgStartNotice');
    if (!el) return;
    el.textContent = text;
    el.style.display = '';
}

// El diario de la ruta se guarda para poder retomarlo
function log(msg, type = 'system') {
    const r = gameState.rpg;
    UI.addRpgLog(msg, type);
    r.log.push({ msg, type });
    if (r.log.length > 40) r.log.shift();
}

// =============================================
// 🗡️ MODO RPG — un solo héroe → recorrer la ruta → jefe final
// Solo atributos básicos (ATK/HP).
// =============================================
function _rpgProgressText() {
    const r = gameState.rpg;
    if (!r.map) return '';
    const where = tierName(r.map.tier || 0);
    if (!r.currentId) return `${where} · elige tu primer paso`;
    const node = r.map.nodes.find(n => n.id === r.currentId);
    if (!node) return where;
    return node.type === 'boss' ? `${where} · jefe` : `${where} · piso ${node.floor + 1} / ${r.map.floors - 1}`;
}

function _rpgRefreshMap(animate) {
    const r = gameState.rpg;
    UI.renderRpgHeroPanel(r.hero, _rpgProgressText(), meta);
    UI.renderGearPanel(r.hero);   // el equipo va siempre a la vista, no tras un botón
    UI.renderRpgMap(r.map, {
        currentId: r.currentId,
        visitedIds: r.visitedIds,
        heroIcon: r.hero ? r.hero.icon : '',
        skip: r.skipNext,
        animate: !!animate
    });
}

function _rpgResetRun() {
    const r = gameState.rpg;
    r.combat = null;
    r.combatResult = null;
    r.loot = null;
    r.pendingNodeId = null;
    r.event = null;
    r.eventCombat = null;
    r.usedEvents = [];
    r.skipNext = false;
    r.tier = 0;
    r.stats = newStats();
    r.log = [];
    r.ended = false;
    UI.hideRpgCombatResult();
}

/**
 * Lo que has comprado en La Forja, aplicado al héroe recién creado. Es permanente entre rutas.
 * El arma de «Herencia» se sortea con un generador APARTE (derivado de la semilla) para no mover
 * el azar de la ruta: con la misma semilla, el mapa y los eventos siguen siendo los mismos.
 */
function _rpgApplyForgeUpgrades(hero, seed) {
    const atk = Meta.upgradeEffect(meta, 'filo');
    if (atk) hero.atq += atk;
    const hp = Meta.upgradeEffect(meta, 'constitucion');
    if (hp) { hero.maxHp += hp; hero.hp = hero.maxHp; }
    const slots = Meta.upgradeEffect(meta, 'zurron');
    if (slots) hero.invSlots = slots;
    if (Meta.upgradeLevel(meta, 'herencia')) {
        const sideRng = createRng((seed ^ 0x9e3779b9) >>> 0);
        const weapon = Items.createRpgItem({ rng: sideRng, floor: 0, slot: 'weapon', rarityId: 'poco_comun' });
        if (weapon) { Items.equipItem(hero, weapon); Meta.recordItemEquipped(meta, weapon); }
    }
}

function _rpgStartRun(seed) {
    const r = gameState.rpg;
    _rpgResetRun();
    r.seed = seed == null ? newSeed() : seed;
    r.rng = createRng(r.seed);
    r.tier = 0;
    r.hero = Engine.createRpgHero();
    r.hero.name = meta.heroName || r.hero.name;
    r.hero.trophy = meta.trophyItem ? { ...meta.trophyItem } : null; // una copia: nunca se pierde, esté equipado o no
    for (const k of Meta.PRIMARY_KEYS) r.hero.primary[k] += meta.primary[k] || 0; // puntos de nivel YA invertidos, permanentes
    _rpgApplyForgeUpgrades(r.hero, r.seed);
    Engine.refreshPrimaryStats(r.hero);
    r.map = Engine.generateRpgMap(r.rng, Engine.RPG_MAP_CONFIG, 0);
    r.currentId = null;
    r.visitedIds = [];
    UI.toggleRpgView('rpgMapView');
    UI.renderRpgLegend();
    UI.clearRpgLog();
    log(`${r.hero.icon} ${r.hero.name} entra en la ruta con ATK ${r.hero.atq} · HP ${r.hero.hp}. Semilla ${seedToCode(r.seed)}. Elige por dónde empezar.`, 'system');
    _rpgRefreshMap(true);
    Meta.recordRunStart(meta);
    persistMeta();
    persist();
}

// --- ⚒️ La Forja ---

/** El héroe con el que empezarías AHORA (con lo comprado y los puntos de nivel): la carta del inicio. */
function _rpgPreviewHero() {
    const hero = Engine.createRpgHero();
    hero.name = meta.heroName || hero.name;   // el nombre que recordó al despertar
    for (const k of Meta.PRIMARY_KEYS) hero.primary[k] += meta.primary[k] || 0;
    _rpgApplyForgeUpgrades(hero, 0);
    Engine.refreshPrimaryStats(hero);
    return hero;
}

// shopId: la tienda de un tendero de la aventura (src/data/shops.js); sin él, La Forja del descenso
const _rpgShopOpts = () => ({ from: gameState.rpg.shopFrom, shop: gameState.rpg.shopId, tab: gameState.rpg.shopTab });
function _rpgOpenShop(from, shopId = null) {
    gameState.rpg.shopFrom = from || 'start';
    gameState.rpg.shopId = shopId;
    gameState.rpg.shopTab = 'buy';
    UI.renderShop(meta, _rpgShopOpts());
    UI.toggleRpgView('rpgShopView');
}

function _rpgCloseShop() {
    if (gameState.rpg.shopFrom === 'end') { UI.toggleRpgView('rpgEndView'); return; }
    if (gameState.rpg.shopFrom === 'adventure') { AdventureMode.open(); return; }
    UI.toggleRpgView('rpgStartView');
    UI.renderRpgHeroCard(_rpgPreviewHero());
    _refreshShopButton();
}

function _rpgBuyUpgrade(id) {
    const bought = id === 'potion' ? Meta.buyPotion(meta) : id === 'mana_potion' ? Meta.buyManaPotion(meta)
        : id.startsWith('elixir:') ? Meta.buyElixir(meta, id.slice(7))
        : id.startsWith('gear:') ? Meta.buyGear(meta, id.slice(5))
        : id.startsWith('food:') ? Meta.buyFood(meta, id.slice(5))
        : id === 'crystal' ? Meta.buyCrystal(meta)
        : Meta.buyUpgrade(meta, id);
    if (!bought.ok) return;
    Meta.checkAchievements(meta, null, { floors: Engine.RPG_MAP_CONFIG.floors });
    persistMeta();
    UI.renderShop(meta, _rpgShopOpts());
}

function _rpgSell(key) {
    if (!Meta.sellItem(meta, key).ok) return;
    persistMeta();
    UI.renderShop(meta, _rpgShopOpts());
}

function _refreshShopButton() {
    const el = document.getElementById('rpgShopGold');
    if (el) el.textContent = ` · 🪙 ${meta.gold}`;
}

function _rpgBackToStart() {
    const r = gameState.rpg;
    _rpgResetRun();
    r.seed = null; r.rng = null; r.hero = null; r.map = null;
    r.currentId = null; r.visitedIds = [];
    Save.clearRun(storage);
    UI.toggleRpgView('rpgStartView');
    UI.renderRpgHeroCard(_rpgPreviewHero());
    _refreshShopButton();
    refreshContinueButton();
}

// Retoma la partida guardada exactamente donde estaba (mapa, evento o combate a medias)
function _rpgResume() {
    const loaded = Save.loadRun(storage);
    if (!loaded) { refreshContinueButton(); return; }
    Object.assign(gameState.rpg, loaded, { ended: false });
    const r = gameState.rpg;
    UI.renderRpgLegend();
    UI.clearRpgLog();
    r.log.forEach(l => UI.addRpgLog(l.msg, l.type));
    if (r.combat) {
        r.combat.potions = Meta.potionCount(meta);   // la fuente de verdad es el progreso, no la partida guardada
        r.combat.manaPotions = Meta.manaPotionCount(meta);
        r.combat.elixirs = Meta.elixirsForCombat(meta);
        UI.toggleRpgView('rpgCombatView');
        UI.clearRpgCombatLog();
        UI.addRpgCombatLog('▶️ Retomas el combate donde lo dejaste.', 'system');
        _rpgRefreshCombat();
        if (r.combat.over && r.combatResult) UI.showRpgCombatResult(r.combatResult);
    } else if (r.loot) {
        UI.toggleRpgView('rpgLootView');
        UI.renderRpgLoot(_rpgLootView());
    } else if (r.event) {
        UI.toggleRpgView('rpgEventView');
        if (r.event.result && r.event.view) UI.renderRpgEventResult(r.event.view);
        else UI.renderRpgEventScreen(_rpgEventView(r.event.session));
    } else {
        UI.toggleRpgView('rpgMapView');
        _rpgRefreshMap(false);
    }
}

function _rpgAdvanceTo(nodeId) {
    const r = gameState.rpg;
    r.currentId = nodeId;
    r.visitedIds.push(nodeId);
    r.skipNext = false;
}

function _rpgEnterNode(nodeId) {
    const r = gameState.rpg;
    if (!r.map || !r.hero || r.combat || r.event || r.ended) return;
    if (!Engine.rpgAvailableNodes(r.map, r.currentId, r.skipNext).includes(nodeId)) return;
    const node = r.map.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (Engine.RPG_COMBAT_TYPES.includes(node.type)) {
        _rpgStartCombat(node);
        return;
    }
    if (node.type === 'event') { _rpgStartEvent(node); return; }
    if (node.type === 'campfire') { _rpgStartEvent(node, 'hoguera'); return; }
    // Cofre: siempre da un objeto
    _rpgAdvanceTo(nodeId);
    r.stats.chests++;
    log(`🧰 ${r.hero.name} abre un cofre (piso ${node.floor + 1}).`, 'victory');
    const heal = Items.ruleSum(r.hero, 'treasure_heal');
    if (heal) {
        const healed = Math.min(r.hero.maxHp - r.hero.hp, heal);
        r.hero.hp += healed;
        if (healed) log(`🧰 El botín te reconforta: +${healed} HP.`, 'victory');
    }
    _rpgOpenLoot('chest', node.floor);
}

// --- 🎁 Botín: cae UN objeto y decides qué hacer con él (equipar, guardar o descartar, que cura) ---

/** La profundidad real a la que se fabrica el botín: en el tramo 3, el piso 8 es el piso 56. */
function _rpgLootDepth(floor) {
    const r = gameState.rpg;
    return Engine.rpgAbsoluteFloor((r.map && r.map.tier) || 0, floor);
}

function _rpgOpenLoot(source, floor) {
    const r = gameState.rpg;
    const depth = _rpgLootDepth(floor);
    const item = source === 'boss'
        // Un único objeto legendario garantizado: el trofeo del jefe, para siempre en meta.js
        ? Items.createRpgItem({ rng: r.rng, floor: depth, rarityId: 'legendaria' })
        : Items.rollLootDrop({ rng: r.rng, floor: depth, source, hero: r.hero });
    if (source !== 'boss') {
        Meta.recordItemSeen(meta, item);
        persistMeta();
    }
    r.loot = { source, floor, offers: [item], selected: 0 };
    UI.toggleRpgView('rpgLootView');
    UI.renderRpgLoot(_rpgLootView());
    persist();
}

function _rpgLootView() {
    const r = gameState.rpg;
    const loot = r.loot;
    const isBoss = loot.source === 'boss';
    const src = Items.LOOT_SOURCES[loot.source] || Items.LOOT_SOURCES.chest;
    const item = loot.offers[0];
    const offer = {
        item,
        delta: isBoss ? { atq: 0, maxHp: 0, guard: 0 } : Items.itemDelta(r.hero, item),
        current: isBoss ? meta.trophyItem : (r.hero.equipment[item.slot] || null)
    };
    return {
        icon: src.icon, title: src.title,
        text: isBoss
            ? (meta.trophyItem ? 'Ya tienes un trofeo. ¿Te quedas con el nuevo (sustituye al anterior para siempre) o conservas el que ya tenías?' : 'Tu primer trofeo: se queda contigo en todas las rutas futuras, para siempre.')
            : 'Compáralo con lo que llevas y decide: equiparlo, guardarlo en el inventario o descartarlo (te cura).',
        offers: [offer], selected: 0, isBoss,
        hero: r.hero,
        canStore: !isBoss && Items.hasInventoryRoom(r.hero),
        discardHeal: Items.discardHealFor(r.hero, item)
    };
}

function _rpgLootClose() {
    const r = gameState.rpg;
    const wasBoss = r.loot && r.loot.source === 'boss';
    r.loot = null;
    // Vencer al jefe ya no acaba la partida: abre el tramo siguiente del descenso
    if (wasBoss) { r.pendingBossMonster = null; _rpgShowTierGate(); return; }
    UI.toggleRpgView('rpgMapView');
    _rpgRefreshMap(false);
    persist();
}

// action: 'equip' | 'store' | 'discard'
function _rpgLootDecide(action) {
    const r = gameState.rpg;
    const loot = r.loot;
    if (!loot || loot.selected == null) return;
    const item = loot.offers[loot.selected];

    if (loot.source === 'boss') {
        if (action === 'equip') {
            Meta.recordTrophy(meta, item, true); // sustitución explícita: es una elección consciente
            persistMeta();
            log(`🐉 ${r.hero.name} se queda ${item.icon} ${item.name} como trofeo para siempre.`, 'victory');
        } else {
            log(`🐉 ${r.hero.name} conserva su trofeo de antes.`, 'system');
        }
        _rpgLootClose();
        return;
    }

    if (action === 'equip') {
        const { old, stored } = Items.equipAndStash(r.hero, item);
        Engine.refreshPrimaryStats(r.hero); // el bono de STR/INT depende del tipo de daño del arma equipada
        r.stats.equipped++;
        Meta.recordItemEquipped(meta, item);
        persistMeta();
        const oldNote = old ? (stored ? ` (guarda ${old.icon} ${old.name} en el inventario)` : ` (deja ${old.icon} ${old.name}: no había hueco en el inventario, así que cura)`) : '';
        log(`${item.rarityIcon} ${r.hero.name} equipa ${item.icon} ${item.name}${oldNote}.`, 'victory');
    } else if (action === 'store') {
        if (!Items.storeInInventory(r.hero, item)) { log('⚠️ El inventario está lleno.', 'system'); return; }
        log(`🎒 ${r.hero.name} guarda ${item.icon} ${item.name} en el inventario.`, 'victory');
    } else {
        const healed = Items.discardItem(r.hero, item);
        r.stats.discarded++;
        log(`♻️ ${r.hero.name} descarta ${item.icon} ${item.name}${healed ? ` y recupera ${healed} HP` : ''}.`, 'victory');
    }
    _rpgLootClose();
}

// --- 🧍 Personaje: equipo, inventario de 10 ranuras, trofeo del jefe y oro ---
function _rpgRefreshCharView() {
    const r = gameState.rpg;
    UI.renderCharacterView(r.hero, meta, r.charSelection);
}

function _rpgOpenCharView() {
    const r = gameState.rpg;
    if (!r.hero || r.combat || r.event || r.loot) return;
    r.charSelection = null;
    UI.toggleRpgView('rpgCharView');
    _rpgRefreshCharView();
}

// Gastar un punto de nivel (permanente: se queda en meta.js para siempre) en una primaria de esta ruta
function _rpgSpendPoint(key) {
    const r = gameState.rpg;
    if (!r.hero || !Meta.spendStatPoint(meta, key)) return;
    r.hero.primary[key] += 1;
    Engine.refreshPrimaryStats(r.hero);
    persistMeta();
    log(`📈 ${r.hero.name} invierte un punto en ${key.toUpperCase()} (para siempre).`, 'victory');
    _rpgRefreshCharView();
    persist();
}

function _rpgCharSelect(from, extra) {
    const r = gameState.rpg;
    const next = from === 'equipment' ? { from, slot: extra } : from === 'inventory' ? { from, index: extra } : { from: 'trophy' };
    const sel = r.charSelection;
    const same = sel && sel.from === next.from && sel.slot === next.slot && sel.index === next.index;
    r.charSelection = same ? null : next;
    _rpgRefreshCharView();
}

// action: 'equip' | 'store' | 'discard', sobre lo que haya seleccionado en r.charSelection
function _rpgCharAction(action) {
    const r = gameState.rpg;
    const sel = r.charSelection;
    if (!sel) return;
    const hero = r.hero;
    let item = null;
    if (sel.from === 'equipment') item = hero.equipment[sel.slot];
    else if (sel.from === 'inventory') item = hero.inventory[sel.index];
    else if (sel.from === 'trophy') item = hero.trophy;
    if (!item) return;

    if (action === 'equip' && sel.from === 'inventory') {
        Items.equipFromInventory(hero, sel.index);
        Meta.recordItemEquipped(meta, item);
        persistMeta();
        log(`${item.rarityIcon} ${hero.name} equipa ${item.icon} ${item.name}.`, 'victory');
        r.charSelection = { from: 'equipment', slot: item.slot };
    } else if (action === 'equip' && sel.from === 'trophy') {
        const { old, stored } = Items.equipAndStash(hero, { ...item }); // una copia: el trofeo nunca se consume
        Meta.recordItemEquipped(meta, item);
        persistMeta();
        const note = old ? (stored ? ` (guarda ${old.icon} ${old.name})` : ` (descarta ${old.icon} ${old.name}: sin hueco)`) : '';
        log(`🐉 ${hero.name} empuña su trofeo: ${item.icon} ${item.name}${note}.`, 'victory');
        r.charSelection = { from: 'equipment', slot: item.slot };
    } else if (action === 'store' && sel.from === 'equipment') {
        if (!Items.hasInventoryRoom(hero)) { log('⚠️ El inventario está lleno: no hay hueco.', 'system'); return; }
        const removed = Items.unequipSlot(hero, sel.slot);
        if (removed) { Items.storeInInventory(hero, removed); log(`🎒 ${hero.name} guarda ${removed.icon} ${removed.name} en el inventario.`, 'victory'); }
        r.charSelection = null;
    } else if (action === 'discard') {
        let healed = 0;
        if (sel.from === 'equipment') {
            const removed = Items.unequipSlot(hero, sel.slot);
            if (removed) healed = Items.discardItem(hero, removed);
        } else if (sel.from === 'inventory') {
            healed = Items.removeFromInventory(hero, sel.index);
        } else return;
        r.stats.discarded++;
        log(`♻️ ${hero.name} descarta ${item.icon} ${item.name}${healed ? ` y recupera ${healed} HP` : ''}.`, 'victory');
        r.charSelection = null;
    } else {
        return;
    }
    Engine.refreshPrimaryStats(hero); // el bono de STR/INT depende del tipo de daño del arma equipada
    _rpgRefreshCharView();
    persist();
}

// --- 🎲 Eventos (y hogueras, que usan la misma pantalla) ---
// La hoguera se pinta en naranja; el resto de eventos, en el color de los eventos
function _rpgEventView(session) {
    return { ...Events.rpgEventScreen(session), accent: session.eventId === 'hoguera' ? '#fb923c' : undefined };
}

function _rpgStartEvent(node, forcedId) {
    const r = gameState.rpg;
    const eventId = forcedId || Events.pickRpgEvent(r.usedEvents, node.floor, r.rng);
    if (!forcedId) {
        r.usedEvents.push(eventId);
        r.stats.events.push(eventId);
        Meta.recordEventSeen(meta, eventId);
        persistMeta();
    }
    const session = Events.startRpgEvent(eventId, r.rng, node.floor);
    r.event = { node, session, result: null, view: null };
    UI.toggleRpgView('rpgEventView');
    UI.renderRpgEventScreen(_rpgEventView(session));
    log(`${forcedId ? '🔥' : '🎲'} ${Events.getRpgEvent(eventId).title} (piso ${node.floor + 1}).`, 'system');
    persist();
}

function _rpgEventChoose(index) {
    const r = gameState.rpg;
    const ev = r.event;
    if (!ev || ev.result) return;
    const res = Events.resolveRpgEventChoice(ev.session, index, r.hero, r.rng);
    if (!res.ok) return;

    res.lines.forEach(l => log(l, 'system'));
    if (res.changes.length) log(`🎲 ${res.changes.join(' · ')}`, 'victory');

    if (res.next) {
        // El evento continúa: siguiente pantalla con lo que acaba de pasar como introducción
        UI.renderRpgEventScreen({ ..._rpgEventView(ev.session), intro: res.lines });
        persist();
        return;
    }
    ev.result = res;
    const def = Events.getRpgEvent(ev.session.eventId);
    ev.view = {
        icon: def.icon,
        title: def.title,
        lines: res.lines,
        changes: res.changes,
        button: res.combat ? '⚔️ ¡A COMBATIR!' : 'CONTINUAR LA RUTA'
    };
    UI.renderRpgEventResult(ev.view);
    persist();
}

function _rpgEventContinue() {
    const r = gameState.rpg;
    const ev = r.event;
    if (!ev || !ev.result) return;
    const { node, result } = ev;

    if (result.combat) {
        const spec = result.combat;
        const monster = Events.createEventMonster(spec.monster, r.hero, node.floor, spec.hpFactor);
        r.event = null;
        r.eventCombat = spec;
        _rpgStartCombat(node, monster);
        return;
    }

    r.event = null;
    if (ev.session.eventId === 'hoguera') r.stats.campfires++;
    _rpgAdvanceTo(node.id);
    if (result.skipFloor) {
        r.skipNext = true;
        log('🌉 Te saltas un piso: el próximo paso puede ir dos pisos más allá.', 'victory');
    }
    if (result.loot) { _rpgOpenLoot(result.loot, node.floor); return; }
    UI.toggleRpgView('rpgMapView');
    _rpgRefreshMap(false);
    persist();
}

// --- ⚔️ Combate ---
function _rpgRefreshCombat() {
    const r = gameState.rpg;
    if (r.combat) UI.renderRpgCombat(r.combat, { menu: r.combatMenu });
}

function _rpgStartCombat(node, customMonster) {
    const r = gameState.rpg;
    const tier = (r.map && r.map.tier) || 0;
    // Las variantes salen de un hash del nodo y la semilla, no del azar de la partida
    const variants = customMonster ? null : Engine.pickMonsterVariants(r.seed, node.id, tier, node.floor);
    const monster = customMonster || Engine.createRpgMonster(node.type, node.floor, tier, variants);
    r.combat = Engine.createRpgCombat(r.hero, monster, r.rng);
    r.combat.potions = Meta.potionCount(meta);   // las pociones son tuyas: entran al combate las que lleves
    r.combat.manaPotions = Meta.manaPotionCount(meta);
    r.combat.elixirs = Meta.elixirsForCombat(meta);
    r.hero.mp = r.hero.maxMp;   // en el descenso (aparcado) cada combate empieza con el maná lleno, como antes la recarga
    r.combatMenu = 'main';
    r.pendingNodeId = node.id;
    Meta.recordMonsterSeen(meta, monster.baseName || monster.name);
    if (monster.variants) Meta.recordVariantSeen(meta, monster.baseName, monster.variants);
    persistMeta();
    UI.toggleRpgView('rpgCombatView');
    UI.hideRpgCombatResult();
    UI.clearRpgCombatLog();
    UI.addRpgCombatLog(customMonster
        ? `${monster.icon} ${monster.name} te corta el paso. ¡Elige tu acción!`
        : `${monster.icon} ${monster.name} bloquea el camino. ¡Elige tu acción!`, 'system');
    r.combat.intro.forEach(ev => UI.addRpgCombatLog(ev.text, 'player'));
    r.combat.intro = [];
    _rpgRefreshCombat();
    persist();
}

function _rpgCombatAct(action, skillId) {
    const r = gameState.rpg;
    const c = r.combat;
    if (!c || c.over) return;
    const res = Engine.rpgCombatAction(c, action, skillId);
    if (!res.ok) {
        UI.addRpgCombatLog(`⚠️ ${res.error}`, 'system');
        return;
    }
    r.combatMenu = 'main';
    if (action === 'potion') { meta.potions = c.potions; persistMeta(); }
    if (action === 'mana_potion') { meta.manaPotions = c.manaPotions; persistMeta(); }
    if (action === 'elixir') { meta.elixirs = { ...c.elixirs }; persistMeta(); }
    res.events.forEach(ev => UI.addRpgCombatLog(ev.text, ev.actor === 'hero' ? 'player' : 'enemy'));
    if (action === 'attack') UI.startAttackCooldown();
    _rpgRefreshCombat();
    const fxMs = UI.playRpgCombatFx(res.events) || 0;
    // Aturdido: el turno se pierde solo y el enemigo vuelve a actuar
    if (!c.over && c.hero.effects && c.hero.effects.aturdido) {
        setTimeout(() => { if (gameState.rpg.combat === c && !c.over) _rpgCombatAct('attack'); }, fxMs + 900);
    }
    if (c.over) _rpgFinishCombat();
    persist();
}

function _rpgShowCombatResult(info) {
    gameState.rpg.combatResult = info;
    UI.showRpgCombatResult(info);
}

function _rpgFinishCombat() {
    const r = gameState.rpg;
    const c = r.combat;
    const m = c.monster;
    if (c.result === 'victory') {
        const isBoss = m.type === 'boss';
        let detail;
        if (r.eventCombat) {
            // Combate de evento: solo cuenta lo que promete el propio evento
            const changes = r.eventCombat.onWin ? Events.applyRpgFx(r.hero, r.eventCombat.onWin) : [];
            detail = [r.eventCombat.onWinText, changes.length ? changes.join(' · ') : ''].filter(Boolean).join(' ');
        } else {
            const reward = Engine.rpgVictoryReward(m.type);
            Engine.applyRpgReward(r.hero, reward);
            const parts = [reward.atq && `+${reward.atq} ATK`, reward.hp && `+${reward.hp} HP`].filter(Boolean);
            detail = isBoss ? `${r.hero.name} derrota al ${m.name}.` : (parts.length ? `${r.hero.name} se hace más fuerte: ${parts.join(', ')}.` : '');
        }
        _rpgShowCombatResult({
            result: 'victory',
            title: isBoss ? '¡Ruta completada!' : '¡Victoria!',
            detail,
            button: isBoss ? 'VER RESUMEN' : 'CONTINUAR LA RUTA'
        });
    } else if (c.result === 'fled') {
        _rpgShowCombatResult({ result: 'fled', title: 'Has huido', detail: 'Vuelves al mapa sin avanzar: puedes elegir otro camino.', button: 'VOLVER AL MAPA' });
    } else {
        _rpgShowCombatResult({ result: 'defeat', title: 'Has caído', detail: `${m.name} pone fin a tu ruta.`, button: 'VER RESUMEN' });
    }
}

// --- 🏁 Fin de partida ---
function _rpgBuildSummary(result, monster) {
    const r = gameState.rpg;
    const win = result === 'victory';
    const s = r.stats;
    const pct = Math.round(100 * monster.hp / Math.max(1, monster.maxHp));
    const eventLabels = s.events.map(id => { const d = Events.getRpgEvent(id); return d ? `${d.icon} ${d.title}` : id; });
    return {
        result,
        title: win ? '¡Ruta completada!' : 'Has caído',
        cause: win ? `${r.hero.name} derrota al ${monster.name}. ¡La ruta es tuya!` : `${monster.icon} ${monster.name} puso fin a tu ruta.`,
        almost: win ? '' : (pct <= 25
            ? `¡Casi! A ${monster.name} solo le quedaba un ${pct} % de vida.`
            : `${monster.name} aún conservaba un ${pct} % de su vida.`),
        floorText: win ? '🐉 Jefe final vencido' : `Caíste en el piso ${monster.floor + 1} de ${r.map.floors - 1}`,
        stats: [
            { icon: '⚔️', value: s.combatsWon, label: 'combates ganados' },
            { icon: '🎲', value: s.events.length, label: 'eventos vividos' },
            { icon: '🔥', value: s.campfires, label: 'hogueras' },
            { icon: '🧰', value: s.chests, label: 'cofres' },
            { icon: '🗡️', value: r.hero.atq, label: 'ATK' },
            { icon: '❤️', value: r.hero.maxHp, label: 'HP máx' },
            { icon: '🪙', value: meta.gold, label: 'oro acumulado' }
        ],
        build: UI.rpgHeroTags(r.hero).map(t => `${t.icon} ${t.text}`),
        gear: Items.ITEM_SLOT_ORDER.map(s => r.hero.equipment[s]).filter(Boolean).map(it => ({ icon: it.icon, name: it.name, rarity: it.rarityIcon, color: it.color })),
        events: eventLabels,
        seedCode: seedToCode(r.seed)
    };
}

/** Tras vencer al jefe: pantalla de tramo superado, con lo ganado y la puerta al siguiente. */
function _rpgShowTierGate() {
    const r = gameState.rpg;
    const next = (r.tier || 0) + 1;
    Meta.recordDepth(meta, { depth: Engine.rpgAbsoluteFloor(r.tier || 0, r.map.floors - 1), tier: r.tier || 0 });
    // Vencer al PRIMER jefe sigue contando como ganar una ruta (es lo que era «ganar» antes del descenso);
    // los jefes de los tramos siguientes ya no suman otra victoria, solo profundidad.
    Meta.recordRunEnd(meta, { result: (r.tier || 0) === 0 ? 'victory' : 'tier', floor: r.map.floors - 1 });
    const unlocked = Meta.checkAchievements(meta, { result: 'victory', hero: r.hero, stats: r.stats }, { floors: r.map.floors });
    persistMeta();
    UI.renderRpgTierGate({
        clearedName: tierName(r.tier || 0),
        nextName: tierName(next),
        nextTier: next,
        nextDepth: Engine.rpgAbsoluteFloor(next, 0) + 1,
        bestDepth: meta.bestDepth,
        gold: meta.gold,
        hero: r.hero,
        newAchievements: unlocked
    });
    UI.toggleRpgView('rpgTierView');
    persist();
}

/** Baja un tramo: mapa nuevo, más duro y más rico, con la vida al completo y el equipo intacto. */
function _rpgDescend() {
    const r = gameState.rpg;
    r.tier = (r.tier || 0) + 1;
    r.map = Engine.generateRpgMap(r.rng, Engine.RPG_MAP_CONFIG, r.tier);
    r.currentId = null;
    r.visitedIds = [];
    r.usedEvents = [];        // el tramo nuevo vuelve a ofrecer todo el catálogo de eventos
    r.skipNext = false;
    r.hero.hp = r.hero.maxHp; // vida completa al entrar en un tramo nuevo
    Meta.recordDepth(meta, { depth: Engine.rpgAbsoluteFloor(r.tier, 0), tier: r.tier });
    persistMeta();
    UI.toggleRpgView('rpgMapView');
    log(`🕳️ ${r.hero.name} desciende a ${tierName(r.tier)}. Vida restaurada: ${r.hero.hp}/${r.hero.maxHp}.`, 'victory');
    _rpgRefreshMap(true);
    persist();
}

function _rpgEndRun(result, monster) {
    const r = gameState.rpg;
    const floorReached = result === 'victory' ? r.map.floors - 1 : monster.floor;
    Meta.recordRunEnd(meta, { result, floor: floorReached });
    const newAchievements = Meta.checkAchievements(meta, { result, hero: r.hero, stats: r.stats }, { floors: r.map.floors });
    persistMeta();
    const summary = _rpgBuildSummary(result, monster);
    summary.newAchievements = newAchievements;
    r.ended = true;
    Save.clearRun(storage); // la partida ya terminó: no hay nada que retomar
    UI.toggleRpgView('rpgEndView');
    UI.renderRpgEnd(summary);
}

/** Oro y XP de una victoria (descenso y aventura). Se multiplican por la profundidad, la variante y La Forja. */
function _rpgGrantVictory(m) {
    const depthMul = Math.pow(RPG_BALANCE.depth.goldMul, m.tier || 0);
    const gold = Math.max(1, Math.round((m.gold != null ? m.gold : RPG_BALANCE.gold[m.type] || RPG_BALANCE.gold.monster)
        * depthMul * (m.goldMul || 1))) + Meta.upgradeEffect(meta, 'buen_ojo');   // Buen ojo: oro fijo por combate
    Meta.recordGold(meta, gold);
    const xp = Math.max(1, Math.round((m.xp != null ? m.xp : Meta.XP_REWARD[m.type] || Meta.XP_REWARD.monster)
        * depthMul * (m.xpMul || 1) * (1 + Meta.upgradeEffect(meta, 'estudio'))));
    const lvl = Meta.recordXp(meta, xp);
    return { gold, xp, lvl };
}

function _rpgCombatContinue() {
    const r = gameState.rpg;
    const c = r.combat;
    if (!c || !c.over) return;
    const m = c.monster;
    const result = c.result;
    const eventFight = r.eventCombat;   // los combates de evento tienen su propia recompensa: no sueltan botín
    r.combat = null;
    r.eventCombat = null;
    r.combatResult = null;
    UI.hideRpgCombatResult();

    if (result === 'defeat') {
        log(`💀 ${r.hero.name} cae ante ${m.name} en el piso ${m.floor + 1}. Fin de la ruta.`, 'system');
        _rpgEndRun('defeat', m);
        return;
    }

    if (result === 'victory') {
        r.stats.combatsWon++;
        Meta.recordMonsterDefeated(meta, m.baseName || m.name);
        Meta.recordCombatWin(meta);
        const { gold, xp, lvl } = _rpgGrantVictory(m);
        Meta.recordDepth(meta, { depth: Engine.rpgAbsoluteFloor(m.tier || 0, m.floor), tier: m.tier || 0 });
        persistMeta();
        _rpgAdvanceTo(r.pendingNodeId);
        log(m.type === 'boss'
            ? `🐉 ${r.hero.name} derrota al ${m.name}. ¡Tramo superado! (+${gold} 🪙 · +${xp} XP)`
            : `${m.icon} ${r.hero.name} vence a ${m.name} (piso ${m.floor + 1}). +${gold} 🪙 · +${xp} XP`, 'victory');
        if (lvl.levelsGained > 0) log(`✨ ¡Subes a nivel de personaje ${lvl.newLevel}! Tienes ${lvl.statPoints} puntos por repartir (pantalla de Personaje).`, 'victory');
        if (m.type === 'boss') {
            r.pendingNodeId = null;
            r.pendingBossMonster = m;
            _rpgOpenLoot('boss', m.floor);
            return;
        }
    } else {
        r.stats.fled++;
        log(`🏃 ${r.hero.name} huye de ${m.name} y elige otro rumbo.`, 'system');
    }
    const wasEventFight = !!eventFight;
    r.pendingNodeId = null;
    if (result === 'victory' && m.type === 'subboss') {
        log('💀 El sub-jefe deja un botín valioso.', 'victory');
        _rpgOpenLoot('subboss', m.floor);
        return;
    }
    // Goteo: un combate normal suelta algo de vez en cuando (casi siempre gris). Los de evento no.
    if (result === 'victory' && m.type === 'monster' && !wasEventFight && r.rng() < RPG_BALANCE.loot.combatDropChance) {
        log(`🩸 ${m.name} deja algo entre los restos.`, 'victory');
        _rpgOpenLoot('combat', m.floor);
        return;
    }
    UI.toggleRpgView('rpgMapView');
    _rpgRefreshMap(false);
    persist();
}


// =============================================
// 🚀 INIT
// =============================================
function initEvents() {
    // --- 🗡️ RPG ---
    safeListener('btnRpgStart', 'click', () => {
        const input = document.getElementById('rpgSeedInput');
        _rpgStartRun(input ? codeToSeed(input.value) : null);
    });
    safeListener('btnRpgContinue', 'click', () => _rpgResume());
    safeListener('rpgMap', 'click', (e) => {
        const btn = e.target.closest('[data-rpg-node]');
        if (btn && !btn.disabled) _rpgEnterNode(btn.dataset.rpgNode);
    });
    safeListener('btnRpgNewMap', 'click', () => {
        if (!gameState.rpg.hero) return;
        _rpgStartRun();
    });
    safeListener('btnRpgChar', 'click', () => _rpgOpenCharView());
    safeListener('btnCharBack', 'click', () => { UI.toggleRpgView('rpgMapView'); _rpgRefreshMap(false); });
    safeListener('charBody', 'click', (e) => {
        const spend = e.target.closest('[data-char-spend]');
        if (spend) { _rpgSpendPoint(spend.dataset.charSpend); return; }
        const action = e.target.closest('[data-char-action]');
        if (action) { _rpgCharAction(action.dataset.charAction); return; }
        const pick = e.target.closest('[data-char-pick]');
        if (pick) _rpgCharSelect(pick.dataset.charPick, pick.dataset.charSlot ?? (pick.dataset.charIndex != null ? Number(pick.dataset.charIndex) : undefined));
    });
    safeListener('rpgEventView', 'click', (e) => {
        const opt = e.target.closest('[data-rpg-event-opt]');
        if (opt) { _rpgEventChoose(Number(opt.dataset.rpgEventOpt)); return; }
        if (e.target.closest('#btnRpgEventContinue')) _rpgEventContinue();
    });
    safeListener('rpgLootView', 'click', (e) => {
        if (e.target.closest('#btnRpgLootEquip')) _rpgLootDecide('equip');
        else if (e.target.closest('#btnRpgLootStore')) _rpgLootDecide('store');
        else if (e.target.closest('#btnRpgLootDiscard')) _rpgLootDecide('discard');
    });
    const onCombatAction = (e) => {
        const btn = e.target.closest('[data-rpg-action]');
        if (!btn || btn.disabled) return;
        const action = btn.dataset.rpgAction;
        // La misma pantalla sirve a los dos modos: si hay un combate de la aventura en curso, es suyo
        if (AdventureMode.inCombat()) AdventureMode.combatAct(action, btn.dataset.rpgSkill);
        else _rpgCombatAct(action, btn.dataset.rpgSkill);
    };
    safeListener('rpgCombatActions', 'click', onCombatAction);
    safeListener('rpgSkillBar', 'click', onCombatAction);   // la barra de habilidades
    safeListener('rpgCombatResult', 'click', (e) => {
        if (!e.target.closest('#btnRpgCombatContinue')) return;
        if (AdventureMode.inCombat()) AdventureMode.combatContinue();
        else _rpgCombatContinue();
    });
    safeListener('rpgEndView', 'click', (e) => {
        if (e.target.closest('#btnRpgEndForge')) { _rpgOpenShop('end'); return; }
        if (e.target.closest('#btnRpgEndNew')) { _rpgStartRun(); return; }
        if (e.target.closest('#btnRpgEndRepeat')) { _rpgStartRun(gameState.rpg.seed); return; }
        if (e.target.closest('#btnRpgEndHome')) { _rpgBackToStart(); return; }
        const copy = e.target.closest('#btnRpgCopySeed');
        if (copy) {
            const code = document.getElementById('rpgEndSeed');
            try { navigator.clipboard.writeText(code ? code.textContent : ''); copy.textContent = '¡Copiado!'; }
            catch { copy.textContent = 'Selecciona y copia'; }
        }
    });
    safeListener('btnRpgAbandon', 'click', () => _rpgBackToStart());

    // --- 🕳️ Descenso y ⚒️ La Forja ---
    safeListener('rpgTierView', 'click', (e) => {
        if (e.target.closest('#btnRpgDescend')) _rpgDescend();
    });
    safeListener('btnRpgShop', 'click', () => _rpgOpenShop('start'));

    // --- 🧭 Modo Aventura ---
    safeListener('btnRpgAdventure', 'click', () => AdventureMode.open());
    safeListener('btnShopBack', 'click', () => _rpgCloseShop());
    safeListener('shopBody', 'click', (e) => {
        const btn = e.target.closest('[data-shop-buy]');
        if (btn && !btn.disabled) _rpgBuyUpgrade(btn.dataset.shopBuy);
        const sell = e.target.closest('[data-shop-sell]');
        if (sell && !sell.disabled) _rpgSell(sell.dataset.shopSell);
        const tab = e.target.closest('[data-shop-tab]');
        if (tab) { gameState.rpg.shopTab = tab.dataset.shopTab; UI.renderShop(meta, _rpgShopOpts()); }
    });

    // --- 📖🎒🏆⚙️ Cabecera: bestiario, colección, logros y opciones ---
    safeListener('gameNav', 'click', (e) => {
        const btn = e.target.closest('[data-panel]');
        if (btn) _openPanel(btn.dataset.panel);
    });
    safeListener('btnPanelClose', 'click', () => UI.closePanel());
    safeListener('panelOverlay', 'click', (e) => { if (e.target.id === 'panelOverlay') UI.closePanel(); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('panelOverlay').style.display !== 'none') UI.closePanel();
    });
}

function _openPanel(kind) {
    UI.openPanel();
    if (kind === 'bestiary') UI.renderBestiaryPanel(meta);
    else if (kind === 'collection') UI.renderCollectionPanel(meta);
    else if (kind === 'achievements') UI.renderAchievementsPanel(meta);
    else if (kind === 'options') {
        const r = gameState.rpg;
        UI.renderOptionsPanel({
            seedCode: r.seed != null ? seedToCode(r.seed) : null,
            onExport: _exportProgress,
            onImport: _importProgress,
            onReplayIntro: () => { UI.closePanel(); _playIntro(); },
            onWipe: _wipeProgress
        });
    }
}
window.openPanel = _openPanel; // para pruebas y depuración
window.gameCombat = () => (AdventureMode.inCombat() ? AdventureMode.currentCombat() : gameState.rpg.combat);   // ídem

/** Borra todo lo guardado (claves easy-hero-*) y vuelve a empezar: sin progreso, se abre la introducción. */
function _wipeProgress() {
    try {
        if (storage) for (const k of Object.keys(storage)) if (k.startsWith('easy-hero-')) storage.removeItem(k);
    } catch { /* sin almacenamiento: no había nada guardado */ }
    window.location.href = window.location.pathname;   // sin ?inicio ni nada: entrada de jugador nuevo
}

// --- 💾 Importar / exportar: tu ruta en curso (si hay) + todo lo descubierto, en un solo texto ---
const EXPORT_PREFIX = 'EH1:';
function _exportProgress() {
    const payload = { gameVersion: GAME_VERSION, exportedAt: Date.now(), save: Save.snapshotRun(gameState.rpg), meta };
    return EXPORT_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}
function _importProgress(text) {
    const raw = (text || '').trim();
    if (!raw) return { ok: false, error: 'Pega primero un texto exportado.' };
    if (!raw.startsWith(EXPORT_PREFIX)) return { ok: false, error: 'Ese texto no es un código de Easy Hero válido.' };
    let payload;
    try { payload = JSON.parse(decodeURIComponent(escape(atob(raw.slice(EXPORT_PREFIX.length))))); }
    catch { return { ok: false, error: 'El texto está incompleto o dañado.' }; }
    if (!payload || typeof payload !== 'object') return { ok: false, error: 'El texto está incompleto o dañado.' };
    try {
        if (payload.meta) Meta.saveMeta(storage, { ...Meta.loadMeta(null), ...payload.meta });
        if (payload.save) storage.setItem(Save.SAVE_KEY, JSON.stringify(payload.save));
        else Save.clearRun(storage);
    } catch { return { ok: false, error: 'No se pudo guardar (¿almacenamiento bloqueado?).' }; }
    return { ok: true, message: '✅ Importado. Recargando…', reload: true };
}

initEvents();
const versionLabel = document.querySelector('.game-version');
if (versionLabel) versionLabel.textContent = `v${GAME_VERSION} · en desarrollo`;

// La expedición: lo que ha rendido la mazmorra desde la última vez que jugaste
const expedition = Meta.claimExpedition(meta);
Meta.checkAchievements(meta, null, { floors: Engine.RPG_MAP_CONFIG.floors });
Meta.saveMeta(storage, meta);

// La aventura recibe lo que necesita del descenso y del progreso permanente
AdventureMode.init({
    storage, meta, persistMeta,
    rpgPreviewHero: _rpgPreviewHero,
    rpgGrantVictory: _rpgGrantVictory,
    rpgOpenShop: _rpgOpenShop,
    refreshShopButton: _refreshShopButton
});
// --- La puerta de entrada: la aventura. La primera vez, la introducción; después, directo a Zafias ---
/** Reproduce la introducción y, al terminar, entra en la aventura (en la aldea si es la primera vez). */
function _playIntro() {
    const sprite = heroArt(ART);
    playIntro({
        heroSrc: sprite ? sprite.src : 'img/sprites/hero_right.png',
        name: meta.heroName,
        onDone: name => {
            meta.heroName = name;
            meta.introSeen = true;
            persistMeta();
            AdventureMode.open();
        }
    });
}
UI.renderRpgHeroCard(_rpgPreviewHero());
_refreshShopButton();
refreshContinueButton();
// ?inicio abre la pantalla de la mazmorra como antes (pruebas y depuración)
const hadProgress = meta.runsPlayed > 0 || !!(storage && storage.getItem('easy-hero-adventure'));
// ?vn=<clave> abre ese diálogo de Zafias al momento, sin introducción ni efectos (npm run vn: probar diálogos y retratos)
const vnKey = new URLSearchParams(location.search).get('vn');
if (/[?&]inicio\b/.test(location.search)) UI.toggleRpgView('rpgStartView');
else if (vnKey) { AdventureMode.open(); AdventureMode.previewDialogue(vnKey); }
else if (!meta.introSeen && !hadProgress) _playIntro();
else {
    if (!meta.introSeen) { meta.introSeen = true; persistMeta(); }   // quien ya jugaba no la ve de golpe
    AdventureMode.open();
}
if (expedition.gold > 0) {
    startNotice(`⛏️ Tu expedición ha traído ${expedition.gold} 🪙 mientras no estabas`
        + `${expedition.capped ? ' (el tope son 8 horas)' : ''}. Gástalo en La Forja.`);
}

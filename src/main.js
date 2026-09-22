import * as UI from './ui.js?v=1.1.0';
import * as Engine from './engine.js?v=1.1.0';
import * as Events from './events.js?v=1.1.0';
import * as Save from './save.js?v=1.1.0';
import * as Items from './items.js?v=1.1.0';
import * as Meta from './meta.js?v=1.1.0';
import { createRng, newSeed, seedToCode, codeToSeed } from './rng.js?v=1.1.0';
import { GAME_VERSION } from './version.js?v=1.1.0';

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
        floorText: peek.floor ? `Piso ${peek.floor} / ${peek.floors}` : 'Al inicio de la ruta',
        hpText: `HP ${peek.hp} / ${peek.maxHp}`,
        seedCode: seedToCode(peek.seed)
    } : null);
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
    if (!r.currentId) return 'Elige tu primer nodo';
    const node = r.map.nodes.find(n => n.id === r.currentId);
    if (!node) return '';
    return node.type === 'boss' ? 'Jefe final' : `Piso ${node.floor + 1} / ${r.map.floors - 1}`;
}

function _rpgRefreshMap(animate) {
    const r = gameState.rpg;
    UI.renderRpgHeroPanel(r.hero, _rpgProgressText());
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
    r.stats = newStats();
    r.log = [];
    r.ended = false;
    UI.hideRpgCombatResult();
}

function _rpgStartRun(seed) {
    const r = gameState.rpg;
    _rpgResetRun();
    r.seed = seed == null ? newSeed() : seed;
    r.rng = createRng(r.seed);
    r.hero = Engine.createRpgHero();
    r.map = Engine.generateRpgMap(r.rng);
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

function _rpgBackToStart() {
    const r = gameState.rpg;
    _rpgResetRun();
    r.seed = null; r.rng = null; r.hero = null; r.map = null;
    r.currentId = null; r.visitedIds = [];
    Save.clearRun(storage);
    UI.toggleRpgView('rpgStartView');
    UI.renderRpgHeroCard(Engine.createRpgHero());
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
    // Cofre: solo da objetos (1 de 3)
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

// --- 🎁 Botín: 1 de 3 objetos; equipar (se pierde el anterior) o descartar (cura) ---
function _rpgOpenLoot(source, floor) {
    const r = gameState.rpg;
    const offers = Items.rollLootOffers({ rng: r.rng, floor, source, hero: r.hero });
    r.loot = { source, floor, selected: null, offers };
    offers.forEach(item => Meta.recordItemSeen(meta, item));
    persistMeta();
    UI.toggleRpgView('rpgLootView');
    UI.renderRpgLoot(_rpgLootView());
    persist();
}

function _rpgLootView() {
    const r = gameState.rpg;
    const loot = r.loot;
    const src = Items.LOOT_SOURCES[loot.source] || Items.LOOT_SOURCES.chest;
    const offers = loot.offers.map(item => ({ item, delta: Items.itemDelta(r.hero, item), current: r.hero.equipment[item.slot] || null }));
    const picked = loot.selected != null ? offers[loot.selected] : null;
    return {
        icon: src.icon, title: src.title,
        text: picked ? 'Compara y decide: equiparlo (pierdes lo que llevas en esa ranura) o descartarlo (te cura).' : 'Elige 1 de 3 objetos. Los otros dos se quedan atrás.',
        offers, selected: loot.selected,
        discardHeal: picked ? Items.discardHealFor(r.hero, picked.item) : 0
    };
}

function _rpgLootSelect(index) {
    const r = gameState.rpg;
    if (!r.loot || !r.loot.offers[index]) return;
    r.loot.selected = r.loot.selected === index ? null : index;
    UI.renderRpgLoot(_rpgLootView());
    persist();
}

function _rpgLootClose() {
    const r = gameState.rpg;
    r.loot = null;
    UI.toggleRpgView('rpgMapView');
    _rpgRefreshMap(false);
    persist();
}

function _rpgLootDecide(equip) {
    const r = gameState.rpg;
    const loot = r.loot;
    if (!loot || loot.selected == null) return;
    const item = loot.offers[loot.selected];
    if (equip) {
        const old = Items.equipItem(r.hero, item);
        r.stats.equipped++;
        Meta.recordItemEquipped(meta, item);
        persistMeta();
        log(`${item.rarityIcon} ${r.hero.name} equipa ${item.icon} ${item.name}${old ? ` (deja ${old.icon} ${old.name})` : ''}.`, 'victory');
    } else {
        const healed = Items.discardItem(r.hero, item);
        r.stats.discarded++;
        log(`♻️ ${r.hero.name} descarta ${item.icon} ${item.name}${healed ? ` y recupera ${healed} HP` : ''}.`, 'victory');
    }
    _rpgLootClose();
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
    const monster = customMonster || Engine.createRpgMonster(node.type, node.floor);
    r.combat = Engine.createRpgCombat(r.hero, monster, r.rng);
    r.combatMenu = 'main';
    r.pendingNodeId = node.id;
    Meta.recordMonsterSeen(meta, monster.name);
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
    res.events.forEach(ev => UI.addRpgCombatLog(ev.text, ev.actor === 'hero' ? 'player' : 'enemy'));
    _rpgRefreshCombat();
    UI.playRpgCombatFx(res.events);
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
            { icon: '❤️', value: r.hero.maxHp, label: 'HP máx' }
        ],
        build: UI.rpgHeroTags(r.hero).map(t => `${t.icon} ${t.text}`),
        gear: Items.ITEM_SLOT_ORDER.map(s => r.hero.equipment[s]).filter(Boolean).map(it => ({ icon: it.icon, name: it.name, rarity: it.rarityIcon, color: it.color })),
        events: eventLabels,
        seedCode: seedToCode(r.seed)
    };
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

function _rpgCombatContinue() {
    const r = gameState.rpg;
    const c = r.combat;
    if (!c || !c.over) return;
    const m = c.monster;
    const result = c.result;
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
        Meta.recordMonsterDefeated(meta, m.name);
        Meta.recordCombatWin(meta);
        persistMeta();
        _rpgAdvanceTo(r.pendingNodeId);
        log(m.type === 'boss'
            ? `🐉 ${r.hero.name} derrota al ${m.name}. ¡Ruta completada!`
            : `${m.icon} ${r.hero.name} vence a ${m.name} (piso ${m.floor + 1}).`, 'victory');
        if (m.type === 'boss') {
            r.pendingNodeId = null;
            _rpgEndRun('victory', m);
            return;
        }
    } else {
        r.stats.fled++;
        log(`🏃 ${r.hero.name} huye de ${m.name} y elige otro rumbo.`, 'system');
    }
    r.pendingNodeId = null;
    if (result === 'victory' && m.type === 'subboss') {
        log('💀 El sub-jefe deja un botín valioso.', 'victory');
        _rpgOpenLoot('subboss', m.floor);
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
    safeListener('rpgEventView', 'click', (e) => {
        const opt = e.target.closest('[data-rpg-event-opt]');
        if (opt) { _rpgEventChoose(Number(opt.dataset.rpgEventOpt)); return; }
        if (e.target.closest('#btnRpgEventContinue')) _rpgEventContinue();
    });
    safeListener('rpgLootView', 'click', (e) => {
        const pick = e.target.closest('[data-rpg-loot-pick]');
        if (pick) { _rpgLootSelect(Number(pick.dataset.rpgLootPick)); return; }
        if (e.target.closest('#btnRpgLootEquip')) _rpgLootDecide(true);
        else if (e.target.closest('#btnRpgLootDiscard')) _rpgLootDecide(false);
    });
    safeListener('rpgCombatActions', 'click', (e) => {
        const btn = e.target.closest('[data-rpg-action]');
        if (!btn || btn.disabled) return;
        const action = btn.dataset.rpgAction;
        if (action === 'skills' || action === 'back') {
            gameState.rpg.combatMenu = action === 'skills' ? 'skills' : 'main';
            _rpgRefreshCombat();
            persist();
        } else {
            _rpgCombatAct(action, btn.dataset.rpgSkill);
        }
    });
    safeListener('rpgCombatResult', 'click', (e) => {
        if (e.target.closest('#btnRpgCombatContinue')) _rpgCombatContinue();
    });
    safeListener('rpgEndView', 'click', (e) => {
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
            onImport: _importProgress
        });
    }
}
window.openPanel = _openPanel; // para pruebas y depuración

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
UI.toggleRpgView('rpgStartView');
UI.renderRpgHeroCard(Engine.createRpgHero());
refreshContinueButton();

import * as UI from './ui.js?v=20260921b';
import * as Engine from './engine.js?v=20260921b';
import * as Events from './events.js?v=20260921b';

// Expuesto para depuración y para los tests del navegador
window.Engine = Engine;
window.Events = Events;
window.UI = UI;

const gameState = {
    rpg: {
        hero: null,
        map: null,
        currentId: null,
        visitedIds: [],
        combat: null,
        combatMenu: 'main',
        pendingNodeId: null,
        // Eventos
        event: null,          // { node, session, result } mientras hay un evento abierto
        eventCombat: null,    // spec del combate de evento en curso ({ onWin, onWinText, ... })
        usedEvents: [],       // ids ya vistos en esta partida (no se repiten)
        skipNext: false       // el puente de cuerdas: el próximo movimiento se salta un piso
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

// =============================================
// 🗡️ MODO RPG — un solo héroe → recorrer la ruta → jefe final
// Solo atributos básicos (ATK/HP). Estado en memoria: aún no se persiste.
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
    r.pendingNodeId = null;
    r.event = null;
    r.eventCombat = null;
    r.usedEvents = [];
    r.skipNext = false;
    UI.hideRpgCombatResult();
}

function _rpgNewMap() {
    const r = gameState.rpg;
    r.map = Engine.generateRpgMap();
    r.currentId = null;
    r.visitedIds = [];
}

function _rpgStartRun() {
    const r = gameState.rpg;
    r.hero = Engine.createRpgHero();
    _rpgResetRun();
    _rpgNewMap();
    UI.toggleRpgView('rpgMapView');
    UI.renderRpgLegend();
    UI.clearRpgLog();
    UI.addRpgLog(`${r.hero.icon} ${r.hero.name} entra en la ruta con ATK ${r.hero.atq} · HP ${r.hero.hp}. Elige por dónde empezar.`, 'system');
    _rpgRefreshMap(true);
}

function _rpgBackToStart() {
    const r = gameState.rpg;
    _rpgResetRun();
    r.hero = null;
    r.map = null;
    r.currentId = null;
    r.visitedIds = [];
    UI.toggleRpgView('rpgStartView');
    UI.renderRpgHeroCard(Engine.createRpgHero());
}

// Botín de cofre (provisional): demuestra que el héroe crece durante la ruta.
const RPG_CHEST_REWARDS = [
    { label: '+1 ATK', apply: h => { h.atq += 1; } },
    { label: '+5 HP', apply: h => { h.maxHp += 5; h.hp += 5; } }
];

function _rpgAdvanceTo(nodeId) {
    const r = gameState.rpg;
    r.currentId = nodeId;
    r.visitedIds.push(nodeId);
    r.skipNext = false;
}

function _rpgEnterNode(nodeId) {
    const r = gameState.rpg;
    if (!r.map || !r.hero || r.combat || r.event) return;
    if (!Engine.rpgAvailableNodes(r.map, r.currentId, r.skipNext).includes(nodeId)) return;
    const node = r.map.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (Engine.RPG_COMBAT_TYPES.includes(node.type)) {
        _rpgStartCombat(node);
        return;
    }
    if (node.type === 'event') {
        _rpgStartEvent(node);
        return;
    }
    // Cofre
    _rpgAdvanceTo(nodeId);
    const reward = RPG_CHEST_REWARDS[Math.floor(Math.random() * RPG_CHEST_REWARDS.length)];
    reward.apply(r.hero);
    UI.addRpgLog(`🧰 ${r.hero.name} abre un cofre: ${reward.label}.`, 'victory');
    _rpgRefreshMap(false);
}

// --- 🎲 Eventos ---
function _rpgStartEvent(node) {
    const r = gameState.rpg;
    const eventId = Events.pickRpgEvent(r.usedEvents, node.floor);
    r.usedEvents.push(eventId);
    const session = Events.startRpgEvent(eventId, Math.random, node.floor);
    r.event = { node, session, result: null };
    UI.toggleRpgView('rpgEventView');
    UI.renderRpgEventScreen(Events.rpgEventScreen(session));
    UI.addRpgLog(`🎲 ${Events.getRpgEvent(eventId).title} (piso ${node.floor + 1}).`, 'system');
}

function _rpgEventChoose(index) {
    const r = gameState.rpg;
    const ev = r.event;
    if (!ev || ev.result) return;
    const res = Events.resolveRpgEventChoice(ev.session, index, r.hero);
    if (!res.ok) return;

    res.lines.forEach(l => UI.addRpgLog(l, 'system'));
    if (res.changes.length) UI.addRpgLog(`🎲 ${res.changes.join(' · ')}`, 'victory');

    if (res.next) {
        // El evento continúa: siguiente pantalla con lo que acaba de pasar como introducción
        UI.renderRpgEventScreen({ ...Events.rpgEventScreen(ev.session), intro: res.lines });
        return;
    }
    ev.result = res;
    const screen = Events.getRpgEvent(ev.session.eventId);
    UI.renderRpgEventResult({
        icon: screen.icon,
        title: screen.title,
        lines: res.lines,
        changes: res.changes,
        button: res.combat ? '⚔️ ¡A COMBATIR!' : 'CONTINUAR LA RUTA'
    });
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
    _rpgAdvanceTo(node.id);
    if (result.skipFloor) {
        r.skipNext = true;
        UI.addRpgLog('🌉 Te saltas un piso: el próximo paso puede ir dos pisos más allá.', 'victory');
    }
    UI.toggleRpgView('rpgMapView');
    _rpgRefreshMap(false);
}

// --- ⚔️ Combate ---
function _rpgRefreshCombat() {
    const r = gameState.rpg;
    if (r.combat) UI.renderRpgCombat(r.combat, { menu: r.combatMenu });
}

function _rpgStartCombat(node, customMonster) {
    const r = gameState.rpg;
    const monster = customMonster || Engine.createRpgMonster(node.type, node.floor);
    r.combat = Engine.createRpgCombat(r.hero, monster);
    r.combatMenu = 'main';
    r.pendingNodeId = node.id;
    UI.toggleRpgView('rpgCombatView');
    UI.hideRpgCombatResult();
    UI.clearRpgCombatLog();
    UI.addRpgCombatLog(customMonster
        ? `${monster.icon} ${monster.name} te corta el paso. ¡Elige tu acción!`
        : `${monster.icon} ${monster.name} bloquea el camino. ¡Elige tu acción!`, 'system');
    _rpgRefreshCombat();
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
        UI.showRpgCombatResult({
            result: 'victory',
            title: isBoss ? '¡Ruta completada!' : '¡Victoria!',
            detail,
            button: isBoss ? 'VOLVER AL MAPA' : 'CONTINUAR LA RUTA'
        });
    } else if (c.result === 'fled') {
        UI.showRpgCombatResult({ result: 'fled', title: 'Has huido', detail: 'Vuelves al mapa sin avanzar: puedes elegir otro camino.', button: 'VOLVER AL MAPA' });
    } else {
        UI.showRpgCombatResult({ result: 'defeat', title: 'Has caído', detail: `${m.name} pone fin a tu ruta.`, button: 'VOLVER AL INICIO' });
    }
}

function _rpgCombatContinue() {
    const r = gameState.rpg;
    const c = r.combat;
    if (!c || !c.over) return;
    const m = c.monster;
    const result = c.result;
    r.combat = null;
    r.eventCombat = null;
    UI.hideRpgCombatResult();

    if (result === 'defeat') {
        UI.addRpgLog(`💀 ${r.hero.name} cae ante ${m.name} en el piso ${m.floor + 1}. Fin de la ruta.`, 'system');
        _rpgBackToStart();
        return;
    }

    if (result === 'victory') {
        _rpgAdvanceTo(r.pendingNodeId);
        UI.addRpgLog(m.type === 'boss'
            ? `🐉 ${r.hero.name} derrota al ${m.name}. ¡Ruta completada!`
            : `${m.icon} ${r.hero.name} vence a ${m.name} (piso ${m.floor + 1}).`, 'victory');
    } else {
        UI.addRpgLog(`🏃 ${r.hero.name} huye de ${m.name} y elige otro rumbo.`, 'system');
    }
    r.pendingNodeId = null;
    UI.toggleRpgView('rpgMapView');
    _rpgRefreshMap(false);
}


// =============================================
// 🚀 INIT
// =============================================
function initEvents() {
    // --- 🗡️ RPG ---
    safeListener('btnRpgStart', 'click', () => _rpgStartRun());
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
    safeListener('rpgCombatActions', 'click', (e) => {
        const btn = e.target.closest('[data-rpg-action]');
        if (!btn || btn.disabled) return;
        const action = btn.dataset.rpgAction;
        if (action === 'skills' || action === 'back') {
            gameState.rpg.combatMenu = action === 'skills' ? 'skills' : 'main';
            _rpgRefreshCombat();
        } else {
            _rpgCombatAct(action, btn.dataset.rpgSkill);
        }
    });
    safeListener('rpgCombatResult', 'click', (e) => {
        if (e.target.closest('#btnRpgCombatContinue')) _rpgCombatContinue();
    });
    safeListener('btnRpgAbandon', 'click', () => _rpgBackToStart());
}

initEvents();
UI.toggleRpgView('rpgStartView');
UI.renderRpgHeroCard(Engine.createRpgHero());

import * as UI from './ui.js?v=20260920a';
import * as Engine from './engine.js?v=20260920a';

// Expuesto para depuración y para los tests del navegador
window.Engine = Engine;
window.UI = UI;

const gameState = {
    rpg: {
        hero: null,
        map: null,
        currentId: null,
        visitedIds: [],
        combat: null,
        combatMenu: 'main',
        pendingNodeId: null
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
// Solo atributos básicos (ATK/HP/DEF). Estado en memoria: aún no se persiste.
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
        animate: !!animate
    });
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
    r.combat = null;
    r.pendingNodeId = null;
    UI.hideRpgCombatResult();
    _rpgNewMap();
    UI.toggleRpgView('rpgMapView');
    UI.renderRpgLegend();
    UI.clearRpgLog();
    UI.addRpgLog(`${r.hero.icon} ${r.hero.name} entra en la ruta con ATK ${r.hero.atq} · HP ${r.hero.hp} · DEF ${r.hero.def}. Elige por dónde empezar.`, 'system');
    _rpgRefreshMap(true);
}

// Botín de cofre (provisional): demuestra que el héroe crece durante la ruta.
const RPG_CHEST_REWARDS = [
    { label: '+1 ATK', apply: h => { h.atq += 1; } },
    { label: '+5 HP', apply: h => { h.maxHp += 5; h.hp += 5; } },
    { label: '+1 DEF', apply: h => { h.def += 1; } }
];

function _rpgAdvanceTo(nodeId) {
    const r = gameState.rpg;
    r.currentId = nodeId;
    r.visitedIds.push(nodeId);
}

function _rpgEnterNode(nodeId) {
    const r = gameState.rpg;
    if (!r.map || !r.hero || r.combat) return;
    if (!Engine.rpgAvailableNodes(r.map, r.currentId).includes(nodeId)) return;
    const node = r.map.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (Engine.RPG_COMBAT_TYPES.includes(node.type)) {
        _rpgStartCombat(node);
        return;
    }
    // Cofre (el único nodo sin combate)
    _rpgAdvanceTo(nodeId);
    const reward = RPG_CHEST_REWARDS[Math.floor(Math.random() * RPG_CHEST_REWARDS.length)];
    reward.apply(r.hero);
    UI.addRpgLog(`🧰 ${r.hero.name} abre un cofre: ${reward.label}.`, 'victory');
    _rpgRefreshMap(false);
}

// --- ⚔️ Combate ---
function _rpgRefreshCombat() {
    const r = gameState.rpg;
    if (r.combat) UI.renderRpgCombat(r.combat, { menu: r.combatMenu });
}

function _rpgStartCombat(node) {
    const r = gameState.rpg;
    const monster = Engine.createRpgMonster(node.type, node.floor);
    r.combat = Engine.createRpgCombat(r.hero, monster);
    r.combatMenu = 'main';
    r.pendingNodeId = node.id;
    UI.toggleRpgView('rpgCombatView');
    UI.hideRpgCombatResult();
    UI.clearRpgCombatLog();
    UI.addRpgCombatLog(`${monster.icon} ${monster.name} bloquea el camino. ¡Elige tu acción!`, 'system');
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
        const reward = Engine.rpgVictoryReward(m.type);
        Engine.applyRpgReward(r.hero, reward);
        const parts = [reward.atq && `+${reward.atq} ATK`, reward.hp && `+${reward.hp} HP`, reward.def && `+${reward.def} DEF`].filter(Boolean);
        const isBoss = m.type === 'boss';
        UI.showRpgCombatResult({
            result: 'victory',
            title: isBoss ? '¡Ruta completada!' : '¡Victoria!',
            detail: isBoss ? `${r.hero.name} derrota al ${m.name}.` : (parts.length ? `${r.hero.name} se hace más fuerte: ${parts.join(', ')}.` : ''),
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
    UI.hideRpgCombatResult();

    if (result === 'defeat') {
        UI.addRpgLog(`💀 ${r.hero.name} cae ante ${m.name} en el piso ${m.floor + 1}. Fin de la ruta.`, 'system');
        r.hero = null;
        r.map = null;
        r.currentId = null;
        r.visitedIds = [];
        r.pendingNodeId = null;
        UI.toggleRpgView('rpgStartView');
        UI.renderRpgHeroCard(Engine.createRpgHero());
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
    safeListener('btnRpgAbandon', 'click', () => {
        const r = gameState.rpg;
        r.combat = null;
        r.pendingNodeId = null;
        UI.hideRpgCombatResult();
        r.hero = null;
        r.map = null;
        r.currentId = null;
        r.visitedIds = [];
        UI.toggleRpgView('rpgStartView');
        UI.renderRpgHeroCard(Engine.createRpgHero());
    });
}

initEvents();
UI.toggleRpgView('rpgStartView');
UI.renderRpgHeroCard(Engine.createRpgHero());

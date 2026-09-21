import * as UI from './ui.js?v=1.0.1';
import * as Engine from './engine.js?v=1.0.1';
import * as Events from './events.js?v=1.0.1';
import * as Save from './save.js?v=1.0.1';
import { createRng, newSeed, seedToCode, codeToSeed } from './rng.js?v=1.0.1';
import { GAME_VERSION } from './version.js?v=1.0.1';

// Expuesto para depuración y para los tests del navegador
window.Engine = Engine;
window.Events = Events;
window.UI = UI;
window.Save = Save;
window.GAME_VERSION = GAME_VERSION;

// El guardado vive en el navegador; si está bloqueado (modo privado, etc.) el juego sigue funcionando sin guardar
const storage = (() => {
    try { const s = window.localStorage; s.getItem('easy-hero-probe'); return s; } catch { return null; }
})();

const newStats = () => ({ combatsWon: 0, events: [], campfires: 0, chests: 0 });

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
    } else if (r.event) {
        UI.toggleRpgView('rpgEventView');
        if (r.event.result && r.event.view) UI.renderRpgEventResult(r.event.view);
        else UI.renderRpgEventScreen(_rpgEventView(r.event.session));
    } else {
        UI.toggleRpgView('rpgMapView');
        _rpgRefreshMap(false);
    }
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
    // Cofre
    _rpgAdvanceTo(nodeId);
    const reward = RPG_CHEST_REWARDS[Math.floor(r.rng() * RPG_CHEST_REWARDS.length)];
    reward.apply(r.hero);
    r.stats.chests++;
    log(`🧰 ${r.hero.name} abre un cofre: ${reward.label}.`, 'victory');
    _rpgRefreshMap(false);
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
    UI.toggleRpgView('rpgCombatView');
    UI.hideRpgCombatResult();
    UI.clearRpgCombatLog();
    UI.addRpgCombatLog(customMonster
        ? `${monster.icon} ${monster.name} te corta el paso. ¡Elige tu acción!`
        : `${monster.icon} ${monster.name} bloquea el camino. ¡Elige tu acción!`, 'system');
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
        events: eventLabels,
        seedCode: seedToCode(r.seed)
    };
}

function _rpgEndRun(result, monster) {
    const r = gameState.rpg;
    const summary = _rpgBuildSummary(result, monster);
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
        log(`🏃 ${r.hero.name} huye de ${m.name} y elige otro rumbo.`, 'system');
    }
    r.pendingNodeId = null;
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
}

initEvents();
const versionLabel = document.querySelector('.game-version');
if (versionLabel) versionLabel.textContent = `v${GAME_VERSION} · en desarrollo`;
UI.toggleRpgView('rpgStartView');
UI.renderRpgHeroCard(Engine.createRpgHero());
refreshContinueButton();

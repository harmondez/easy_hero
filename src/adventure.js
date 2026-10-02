// =============================================
// 🧭 Modo Aventura (controlador): Zafias con el héroe de siempre (nivel, primarias, Forja, oro y pociones compartidos).
// Su vida y lo que ya has vencido se guardan aparte, para no pisar una partida del descenso a medias.
// =============================================
import * as UI from './ui.js?v=1.8.0';
import * as Engine from './engine.js?v=1.8.0';
import * as Meta from './meta.js?v=1.8.0';
import * as Adventure from './adventure-view.js?v=1.8.0';
import { RPG_BALANCE } from './data/balance.js?v=1.8.0';
import { ZAFIAS } from './data/zones/zafias.js?v=1.8.0';
import { creatureFor } from './data/creatures.js?v=1.8.0';
import { QUESTS } from './data/quests.js?v=1.8.0';
import { GEAR, STARTER_GEAR } from './data/gear.js?v=1.8.0';
import { ART } from './data/art.js?v=1.8.0';
import * as Items from './items.js?v=1.8.0';
import { questLog, npcQuestMark, countingCreatures } from './quests.js?v=1.8.0';

// Lo que la aventura necesita del resto del juego (main.js se lo da al arrancar): el almacenamiento, el progreso
// permanente y algunas piezas del descenso (el héroe base, las recompensas, La Forja, bajar a la mazmorra).
let ctx = null;
export function init(context) { ctx = context; }

/** ¿Hay un combate de la aventura en curso? (la pantalla de combate es compartida con el descenso) */
export const inCombat = () => !!adv.combat;

const ADV_KEY = 'easy-hero-adventure';
const ADV_DEFEAT_GOLD_LOSS = 0.1;   // caer en la aventura cuesta el 10 % del oro que llevas
const adv = { state: null, hero: null, combat: null, point: null };

function _advLoad() {
    try {
        const d = JSON.parse((ctx.storage && ctx.storage.getItem(ADV_KEY)) || 'null');
        if (d && d.v === 1) return { gone: {}, flags: {}, counts: {}, ...d };
    } catch { /* guardado dañado: se empieza de cero */ }
    // gone: vencidos que vuelven al dormir · flags: marcas de la historia (permanentes)
    return { v: 1, scene: ZAFIAS.startScene, hp: null, gone: {}, flags: {}, counts: {} };
}
function _advSave() {
    try { if (ctx.storage) ctx.storage.setItem(ADV_KEY, JSON.stringify(adv.state)); } catch { /* sin almacenamiento */ }
}

// --- 🎒 El equipo de la aventura (src/data/gear.js): permanente y aparte del botín del descenso ---
const _advOwned = () => (ctx.meta.advGear && ctx.meta.advGear.length ? ctx.meta.advGear : [STARTER_GEAR]);
const _advWeaponId = () => (GEAR[ctx.meta.advWeapon] && _advOwned().includes(ctx.meta.advWeapon) ? ctx.meta.advWeapon : STARTER_GEAR);

/** El arma equipada como objeto del motor (la espada inicial, con el nombre, el ATK y el dibujo de la ficha). */
function _advWeaponItem(id) {
    const g = GEAR[id];
    const item = Items.createStarterItem();
    return { ...item, id: `aventura-${id}`, name: g.name, icon: g.icon, desc: g.desc, stats: { ...item.stats, atq: g.atq } };
}

/** El dibujo del héroe según su arma (null = el de siempre). */
const _advHeroSprite = () => { const g = GEAR[_advWeaponId()]; return (g.sprite && ART.sprites[g.sprite]) || null; };

function _advGiveItem(id) {
    if (!GEAR[id]) return;
    ctx.meta.advGear = _advOwned().includes(id) ? _advOwned() : [..._advOwned(), id];
    ctx.persistMeta();
    Adventure.inventoryNotice(`🎁 Nuevo objeto: ${GEAR[id].name}`);
}

function _advEquip(id) {
    if (!GEAR[id] || !_advOwned().includes(id)) return;
    ctx.meta.advWeapon = id;
    ctx.persistMeta();
    adv.hero = _advHero();
    Adventure.setHeroSprite(_advHeroSprite());
    _advRefreshHud();
    _advOpenInventory(id);
}

function _advOpenInventory(selected) {
    UI.openPanel();
    UI.renderInventoryPanel({
        items: _advOwned().map(id => ({ id, ...GEAR[id], equipped: id === _advWeaponId(),
            preview: (GEAR[id].sprite && ART.sprites[GEAR[id].sprite]) || null })),
        selected: selected || _advWeaponId(),
        gold: ctx.meta.gold,
        heroAtq: adv.hero ? adv.hero.atq : null,
        onEquip: id => _advEquip(id)
    });
}

function _advHero() {
    const hero = ctx.rpgPreviewHero();
    // El arma de la aventura sustituye a la espada inicial (los puntos de nivel y La Forja se mantienen)
    if (_advWeaponId() !== STARTER_GEAR) { Items.equipItem(hero, _advWeaponItem(_advWeaponId())); Engine.refreshPrimaryStats(hero); }
    hero.sprite = _advHeroSprite();
    if (adv.state.hp != null) hero.hp = Math.max(1, Math.min(hero.maxHp, adv.state.hp));
    return hero;
}

const _advHas = flags => (flags || []).every(f => adv.state.flags[f]);

// Una parada se ve si la historia lo permite
const _advIsShown = p => _advHas(p.requires);

// Un enemigo está vencido (su parada queda con ✓ y se puede cruzar) hasta que duermes en la posada;
// los de misión (`once`), para siempre
const _advIsCleared = p => p.kind === 'enemy' && (!!adv.state.gone[p.id] || !!(p.once && adv.state.flags[`defeated:${p.id}`]));

// Lo que dice un NPC: la primera entrada de su `talk` cuyas marcas se cumplen. Al terminar, marca y recompensa.
// Un punto de interés ya mirado queda «visto» (su parada se pone gris, como un enemigo vencido)
const _advIsSeen = p => p.kind === 'poi' && !!adv.state.flags[`visto:${p.id}`];
function _advMarkSeen(p) {
    if (p.kind !== 'poi' || adv.state.flags[`visto:${p.id}`]) return;
    adv.state.flags[`visto:${p.id}`] = true;
    _advSave();
    Adventure.refresh();
}

function _advTalk(p) {
    if (!p.talk) return p.dialogue ? { dialogue: p.dialogue, onDone: () => _advMarkSeen(p) } : null;
    const entry = p.talk.find(t => _advHas(t.when) && (!t.whenCount || ((adv.state.counts || {})[t.whenCount.creature] || 0) >= t.whenCount.n));
    if (!entry) return null;
    return {
        dialogue: entry.dialogue,
        onDone: () => {
            if (entry.set && !adv.state.flags[entry.set]) {
                adv.state.flags[entry.set] = true;
                if (entry.reward) {
                    if (entry.reward.gold) Meta.recordGold(ctx.meta, entry.reward.gold);
                    if (entry.reward.potions) ctx.meta.potions = Math.min(RPG_BALANCE.potion.max, Meta.potionCount(ctx.meta) + entry.reward.potions);
                    ctx.persistMeta();
                    if (entry.reward.item) _advGiveItem(entry.reward.item);
                }
                _advSave();
                Adventure.refresh();
                _advRefreshHud();
                _advQuestNotice(entry.set);
            }
        }
    };
}

// Una misión que empieza o se cumple con esta marca: aviso y el botón del diario se ilumina
function _advQuestNotice(flag) {
    const started = QUESTS.find(q => q.start === flag);
    const finished = QUESTS.find(q => q.done === flag);
    if (started) Adventure.questNotice(`📜 Nueva misión: ${started.title}`);
    else if (finished) Adventure.questNotice(`✔️ Misión cumplida: ${finished.title}`);
}

function _advOpenQuests() {
    UI.openPanel();
    UI.renderQuestPanel(questLog(adv.state));
}

// Los lugares de la aldea
function _advPlace(p) {
    if (p.kind === 'inn') {
        // Dormir: vida llena y los enemigos normales vuelven a los caminos (los jefes de misión no)
        return {
            dialogue: 'posada-dormir',
            onDone: () => {
                adv.state.hp = null;
                adv.state.gone = {};
                _advSave();
                adv.hero = _advHero();
                Adventure.refresh();
                _advRefreshHud();
            }
        };
    }
    if (p.kind === 'shop') {
        Adventure.close();
        ctx.rpgOpenShop('adventure');
        return null;
    }
    if (p.kind === 'cave') {
        // La cueva baja al descenso de siempre: si hay una partida a medias, se retoma; si no, empieza una.
        // Solo si empieza una nueva desde aquí, al terminarla se vuelve a la aldea (una retomada sigue su origen)
        Adventure.close();
        if (ctx.enterDescent() === 'new') { adv.state.fromCave = true; _advSave(); }
        return null;
    }
    return null;
}

// El objetivo de la misión, a la vista (estilo DragonFable: siempre sabes qué toca)
function _advQuestText() {
    const f = adv.state.flags;
    // Tras Grask, la pista del jefe de la zona: la guarida del lobo, pasado el campamento
    if (f.misionCumplida) return f['defeated:feronius'] ? '📜 Misión cumplida · Zafias está en paz'
        : '📜 Misión cumplida · Algo aúlla pasado el campamento, al sureste';
    if (f['defeated:grask']) return f['defeated:feronius'] ? '📜 Vuelve con Maela a la aldea' : '📜 Vuelve con Maela a la aldea · Algo aúlla al sureste del campamento';
    if (!f.misionAceptada) return '📜 Habla con Maela, la posadera';
    const goblins = ['goblin-1', 'goblin-2', 'goblin-3'].filter(id => f[`defeated:${id}`]).length;
    if (goblins < 3) return `📜 Echa a los goblins del bosque: ${goblins}/3`;
    return '📜 Entra en el campamento goblin y acaba con Grask';
}

function _advRefreshHud() {
    const h = adv.hero;
    Adventure.setHud(`❤️ ${h.hp}/${h.maxHp} · 🪙 ${ctx.meta.gold} · 🧪 ${Meta.potionCount(ctx.meta)}   ${_advQuestText()}`);
}

export function open() {
    if (!adv.state) adv.state = _advLoad();
    adv.hero = _advHero();
    UI.toggleRpgView('rpgAdventureView');
    Adventure.open({
        onExit: () => { UI.toggleRpgView('rpgStartView'); UI.renderRpgHeroCard(ctx.rpgPreviewHero()); ctx.refreshShopButton(); },
        onEnemy: p => _advStartCombat(p),
        onTalk: p => _advTalk(p),
        onPlace: p => _advPlace(p),
        heroName: () => ctx.meta.heroName || 'Héroe',
        onScene: id => { adv.state.scene = id; _advSave(); },
        isShown: p => _advIsShown(p),
        isCleared: p => _advIsCleared(p),
        isSeen: p => _advIsSeen(p),
        npcMark: p => npcQuestMark(p.id, adv.state),
        onQuests: () => _advOpenQuests(),
        onInventory: () => _advOpenInventory()
    }, adv.state.scene);
    Adventure.setHeroSprite(_advHeroSprite());
    _advRefreshHud();
}

/** El descenso terminó (caíste o abandonaste). Si lo bajaste desde la cueva, vuelves a la aldea; devuelve si lo hizo. */
export function returnFromDescent() {
    if (!adv.state) adv.state = _advLoad();   // tras recargar la página en mitad del descenso
    if (!adv.state.fromCave) return false;
    delete adv.state.fromCave;
    _advSave();
    open();
    return true;
}

/** Un descenso empezado desde el inicio no vuelve a la aldea, aunque quedara una marca vieja. */
export function forgetDescentOrigin() {
    if (!adv.state) adv.state = _advLoad();
    if (!adv.state.fromCave) return;
    delete adv.state.fromCave;
    _advSave();
}

function _advRenderCombat() {
    const scene = ZAFIAS.scenes[adv.state.scene];
    UI.renderRpgCombat(adv.combat, { where: scene ? scene.name : ZAFIAS.name });
}

function _advStartCombat(p) {
    const def = p.enemy || { type: 'monster', floor: 0 };
    // Una criatura con nombre (creatures.js) trae su fuerza, su forma de pelear y su dibujo; si no, un monstruo del piso
    const creature = creatureFor(p);
    const m = creature ? Engine.createRpgCreature(creature) : Engine.createRpgMonster(def.type, def.floor, 0);
    // baseName: con qué nombre se busca su arte (p. sprite en los datos de la zona; si no, su nombre)
    if (!creature) { m.name = p.name; m.baseName = p.sprite || p.name; m.icon = '👺'; }
    adv.point = p;
    adv.combat = Engine.createRpgCombat(adv.hero, m, Math.random);
    adv.combat.potions = Meta.potionCount(ctx.meta);
    Adventure.close();
    UI.toggleRpgView('rpgCombatView');
    UI.hideRpgCombatResult();
    UI.clearRpgCombatLog();
    UI.addRpgCombatLog(`👺 ${m.name} te corta el paso. ¡Elige tu acción!`, 'system');
    adv.combat.intro.forEach(ev => UI.addRpgCombatLog(ev.text, 'player'));
    adv.combat.intro = [];
    _advRenderCombat();
}

export function combatAct(action, skillId) {
    const c = adv.combat;
    if (!c || c.over) return;
    const res = Engine.rpgCombatAction(c, action, skillId);
    if (!res.ok) { UI.addRpgCombatLog(`⚠️ ${res.error}`, 'system'); return; }
    if (action === 'potion') { ctx.meta.potions = c.potions; ctx.persistMeta(); }
    res.events.forEach(ev => UI.addRpgCombatLog(ev.text, ev.actor === 'hero' ? 'player' : 'enemy'));
    _advRenderCombat();
    UI.playRpgCombatFx(res.events);
    adv.state.hp = adv.hero.hp;
    _advSave();
    if (c.over) _advFinishCombat();
}

function _advFinishCombat() {
    const c = adv.combat;
    const m = c.monster;
    if (c.result === 'victory') {
        const { gold, xp, lvl } = ctx.rpgGrantVictory(m);
        Meta.recordCombatWin(ctx.meta);
        ctx.persistMeta();
        adv.state.gone[adv.point.id] = true;   // no vuelve hasta que duermas en la posada
        adv.state.flags[`defeated:${adv.point.id}`] = true;   // pero la historia recuerda que lo venciste
        // Si alguna misión en marcha cuenta este tipo de criatura (p. ej. dientes de lobo), suma uno
        const kind = adv.point.enemy && adv.point.enemy.creature;
        if (kind && countingCreatures(adv.state).has(kind)) {
            adv.state.counts = adv.state.counts || {};
            adv.state.counts[kind] = (adv.state.counts[kind] || 0) + 1;
        }
        _advSave();
        UI.showRpgCombatResult({ result: 'victory', title: '¡Victoria!', button: 'SEGUIR EXPLORANDO',
            detail: `+${gold} 🪙 · +${xp} XP${lvl.levelsGained > 0 ? ` · ¡Subes a nivel ${lvl.newLevel}!` : ''}` });
    } else if (c.result === 'fled') {
        UI.showRpgCombatResult({ result: 'fled', title: 'Has huido', detail: `${m.name} sigue en el camino.`, button: 'VOLVER' });
    } else {
        const lost = Math.floor(ctx.meta.gold * ADV_DEFEAT_GOLD_LOSS);
        Meta.recordGold(ctx.meta, -lost);
        ctx.persistMeta();
        adv.state.hp = null;                    // despiertas con la vida llena
        adv.state.scene = ZAFIAS.startScene;
        _advSave();
        UI.showRpgCombatResult({ result: 'defeat', title: 'Has caído', button: 'DESPERTAR EN LA POSADA',
            detail: `Te recogen y despiertas en la posada de Zafias${lost > 0 ? `, con ${lost} 🪙 menos` : ''}.` });
    }
}

export function combatContinue() {
    const c = adv.combat;
    if (!c || !c.over) return;
    const fell = c.result === 'defeat';
    adv.combat = null;
    adv.point = null;
    UI.hideRpgCombatResult();
    open();
    if (fell) Adventure.goTo(ZAFIAS.startScene);
}


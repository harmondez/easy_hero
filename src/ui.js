import * as Engine from './engine.js?v=1.1.0';
import * as Items from './items.js?v=1.1.0';
import * as Meta from './meta.js?v=1.1.0';

// =============================================
// 🖼️ RPG-pack — capa de presentación (DOM)
// =============================================
export function esc(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return '&#39;';
    });
}

// --- Efectos de combate (números flotantes y sacudida) ---
export function spawnDmgFloat(parentSelector, type, value) {
    const dmg = Number(value);
    if (isNaN(dmg) || dmg <= 0) return;
    const parent = document.querySelector(parentSelector);
    if (!parent) return;

    const el = document.createElement('div');
    el.className = `dmg-float ${type}`;
    el.innerText = type === 'heal' ? `+${dmg}` : `-${dmg}`;
    el.style.left = (20 + Math.random() * 40) + '%';
    el.style.top = '10%';
    parent.style.position = 'relative';
    parent.appendChild(el);

    if (typeof gsap !== 'undefined') {
        try {
            gsap.fromTo(el,
                { y: 0, opacity: 1, scale: 0.5 },
                { y: -60, opacity: 0, scale: 1.2, duration: 1.0, ease: "power2.out", onComplete: () => el.remove() }
            );
        } catch (e) { setTimeout(() => el.remove(), 1000); }
    } else {
        setTimeout(() => el.remove(), 1000);
    }
}

export function playHitAnimation(selector, isAlly) {
    const el = document.querySelector(selector);
    if (!el || typeof gsap === 'undefined') return;
    try {
        const color = isAlly ? 'rgba(59,130,246,0.8)' : 'rgba(239,68,68,0.8)';
        gsap.timeline()
            .to(el, { x: isAlly ? 10 : -10, duration: 0.05 })
            .to(el, { x: 0, duration: 0.25, ease: "elastic.out(1,0.3)", boxShadow: `0 0 20px ${color}`, onComplete: () => { el.style.boxShadow = ''; } });
    } catch (e) {}
}

// --- 🗡️ MODO RPG (Carta de Héroe + mapa de ruta) ---

export function toggleRpgView(view) {
    ['rpgStartView', 'rpgMapView', 'rpgEventView', 'rpgLootView', 'rpgCombatView', 'rpgEndView'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === view ? 'block' : 'none';
    });
}

/** Carta del héroe (misma para el inicio y, con panel compacto, para la ruta). */
export function renderRpgHeroCard(hero) {
    const el = document.getElementById('rpgHeroCard');
    if (!el || !hero) return;
    el.style.setProperty('--accent', hero.color);
    el.innerHTML = `
        <div class="rpg-hero-card-icon">${hero.icon}</div>
        <div class="rpg-hero-card-name">${esc(hero.name)}</div>
        <div class="rpg-hero-card-sub">Nivel ${hero.level}</div>
        <div class="rpg-hero-card-stats">
            <div class="rpg-stat atk"><b>ATK</b> ${hero.atq}</div>
            <div class="rpg-stat hp"><b>HP</b> ${hero.hp}</div>
        </div>`;
}

export function renderRpgLegend() {
    const el = document.getElementById('rpgLegend');
    if (!el) return;
    el.innerHTML = Object.values(Engine.RPG_NODE_TYPES).map(t => `
        <span class="rpg-legend-item type-${esc(t.id)}"><span class="rpg-legend-icon">${t.icon}</span>${esc(t.name)}</span>`).join('');
}

/** Etiquetas del héroe: votos, mejoras de habilidad y afinidades (solo las que existen). */
export function rpgHeroTags(hero) {
    const tags = [];
    const vows = (hero && hero.vows) || {};
    if (vows.noFlee) tags.push({ icon: '🚫', text: 'Sin huir' });
    if (vows.noSkills) tags.push({ icon: '🤐', text: 'Sin habilidades' });
    for (const [id, mods] of Object.entries((hero && hero.skillMods) || {})) {
        const skill = Engine.RPG_SKILLS[id];
        if (skill && (mods.damage || mods.cooldown)) tags.push({ icon: skill.icon, text: `${skill.name} mejorado` });
    }
    const names = { guerrero: ['⚔️', 'Guerrero'], picaro: ['🗡️', 'Pícaro'], elementalista: ['🔥', 'Elementalista'] };
    for (const [k, v] of Object.entries((hero && hero.affinity) || {})) {
        if (v > 0 && names[k]) tags.push({ icon: names[k][0], text: `${names[k][1]} ${v}` });
    }
    return tags;
}

// Las 4 ranuras del héroe: el borde tiene el color de la rareza; al pasar el ratón se lee el objeto
function _rpgGearHtml(hero) {
    return Items.ITEM_SLOT_ORDER.map(slot => {
        const def = Items.ITEM_SLOTS[slot];
        const it = hero.equipment && hero.equipment[slot];
        if (!it) return `<span class="rpg-gear-slot is-empty" data-slot="${slot}" title="${esc(def.name)}: vacía">${def.icon}</span>`;
        const tip = [`${it.rarityIcon} ${it.name}`, ...Items.describeItem(it)].join('\n');
        return `<span class="rpg-gear-slot" data-slot="${slot}" data-rarity="${esc(it.rarity)}" style="--rarity:${esc(it.color)}" title="${esc(tip)}">${it.icon}</span>`;
    }).join('');
}

export function renderRpgHeroPanel(hero, progressText) {
    const el = document.getElementById('rpgHeroPanel');
    if (!el || !hero) return;
    const tagsHtml = rpgHeroTags(hero).map(t => `<span class="rpg-hero-tag">${t.icon} ${esc(t.text)}</span>`).join('');
    const hpPct = Math.max(0, Math.min(100, (hero.hp / hero.maxHp) * 100));
    el.style.setProperty('--accent', hero.color);
    el.innerHTML = `
        <div class="rpg-hero-avatar">${hero.icon}</div>
        <div class="rpg-hero-info">
            <div class="rpg-hero-name">${esc(hero.name)}</div>
            <div class="rpg-hero-hp"><div class="rpg-hero-hp-fill" style="width:${hpPct}%"></div><span><b>HP</b> ${hero.hp} / ${hero.maxHp}</span></div>
            <div class="rpg-hero-stats">
                <span class="rpg-stat atk"><b>ATK</b> ${hero.atq}</span>
                ${hero.guard ? `<span class="rpg-stat guard"><b>🛡️</b> −${hero.guard}</span>` : ''}
            </div>
            <div class="rpg-gear" id="rpgGear">${_rpgGearHtml(hero)}</div>
            ${tagsHtml ? `<div class="rpg-hero-tags">${tagsHtml}</div>` : ''}
        </div>
        <div class="rpg-hero-progress">${esc(progressText || '')}</div>`;
}

/**
 * Dibuja el mapa: aristas en un SVG en porcentajes (se estira con el contenedor) y
 * nodos como botones posicionados en % (columna) / % (piso, el piso 0 abajo).
 * state: { currentId, visitedIds, heroIcon, animate }
 */
export function renderRpgMap(map, state = {}) {
    const el = document.getElementById('rpgMap');
    if (!el || !map) return;
    const { floors, cols } = map;
    const visitedIds = state.visitedIds || [];
    const visited = new Set(visitedIds);
    const currentId = state.currentId || null;
    const skip = !!state.skip;
    const available = new Set(Engine.rpgAvailableNodes(map, currentId, skip));
    const byId = new Map(map.nodes.map(n => [n.id, n]));
    const pos = n => ({ x: (n.col + 0.5) / cols * 100, y: (floors - 1 - n.floor + 0.5) / floors * 100 });

    const taken = new Set();
    for (let i = 1; i < visitedIds.length; i++) taken.add(`${visitedIds[i - 1]}>${visitedIds[i]}`);

    const current = byId.get(currentId);
    const openFrom = new Set([currentId]);
    if (skip && current) current.next.forEach(id => openFrom.add(id));

    const lines = map.nodes.flatMap(n => n.next.map(id => {
        const a = pos(n);
        const b = pos(byId.get(id));
        const cls = taken.has(`${n.id}>${id}`) ? 'is-taken' : (openFrom.has(n.id) ? 'is-open' : '');
        return `<line class="rpg-edge ${cls}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" vector-effect="non-scaling-stroke"/>`;
    })).join('');

    const nodesHtml = map.nodes.map((n, i) => {
        const t = Engine.RPG_NODE_TYPES[n.type];
        const p = pos(n);
        const st = n.id === currentId ? 'is-current'
            : visited.has(n.id) ? 'is-visited'
            : available.has(n.id) ? 'is-available' : 'is-locked';
        const hero = st === 'is-current' ? ` data-hero="${esc(state.heroIcon || '')}"` : '';
        let info = t.desc;
        if (n.type === 'monster' || n.type === 'subboss' || n.type === 'boss') {
            const s = Engine.rpgMonsterStats(n.type, n.floor);
            info = `${t.desc} ATK ${s.atq} · HP ${s.hp}`;
        }
        return `<button type="button" class="rpg-node type-${esc(n.type)} ${st}" data-rpg-node="${esc(n.id)}"
            style="left:${p.x}%;top:${p.y}%;--i:${i}" ${st === 'is-available' ? '' : 'disabled'}${hero}
            title="${esc(t.name)} — ${esc(info)}" aria-label="${esc(t.name)}, piso ${n.floor + 1}">${t.icon}</button>`;
    }).join('');

    const boss = byId.get(map.bossId);
    const bp = pos(boss);
    el.style.setProperty('--rpg-floors', floors);
    el.classList.toggle('animate', !!state.animate);
    el.innerHTML = `
        <svg class="rpg-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>
        ${nodesHtml}
        <div class="rpg-boss-tag" style="left:${bp.x}%;top:${bp.y}%">JEFE FINAL</div>`;

    if (state.animate) setTimeout(() => el.classList.remove('animate'), 1200);
}

export function addRpgLog(msg, type = 'system') {
    const el = document.getElementById('rpgLogContent');
    if (!el) return;
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerHTML = esc(msg);
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

export function clearRpgLog() {
    const el = document.getElementById('rpgLogContent');
    if (el) el.innerHTML = '';
}

// --- ⚔️ Combate RPG (héroe a la izquierda, monstruo a la derecha) ---

// La intención del monstruo: lo que va a hacer en su turno, visible ANTES de elegir la acción
function _rpgIntentHtml(monster) {
    const v = Engine.rpgIntentView(monster);
    if (!v) return '';
    const value = v.value != null ? ` <span class="rpg-intent-value">${v.value}</span>` : '';
    return `<div class="rpg-intent is-${esc(v.kind)}" title="${esc(v.hint)}">
        <span class="rpg-intent-icon">${v.icon}</span><span class="rpg-intent-text"><b>${esc(v.label)}</b>${value}</span>
    </div>`;
}

function _rpgFighterCard(f, tag, status, intentHtml = '') {
    const hpPct = Math.max(0, Math.min(100, (f.hp / f.maxHp) * 100));
    return `
        <article class="rpg-fighter-card ${f.hp <= 0 ? 'is-down' : ''}" style="--accent: ${esc(f.color)}">
            <div class="rpg-fighter-tag">${esc(tag)}</div>
            <div class="rpg-fighter-icon">${f.icon}</div>
            <div class="rpg-fighter-name">${esc(f.name)}</div>
            ${intentHtml}
            <div class="rpg-fighter-hpbar"><div class="rpg-fighter-hpfill" style="width:${hpPct}%"></div></div>
            <div class="rpg-fighter-stats">
                <div class="rpg-stat atk"><b>ATK</b> ${f.atq}</div>
                <div class="rpg-stat hp"><b>HP</b> ${f.hp} / ${f.maxHp}</div>
            </div>
            <div class="rpg-fighter-status">${status || '&nbsp;'}</div>
        </article>`;
}

function _rpgActionButton(attrs, icon, label, hint, disabled) {
    return `<button type="button" class="rpg-action" ${attrs} ${disabled ? 'disabled' : ''}>
        <span class="rpg-action-icon">${icon}</span>
        <span class="rpg-action-label">${esc(label)}</span>
        <span class="rpg-action-hint">${esc(hint)}</span>
    </button>`;
}

const RPG_ACTION_NAMES = { attack: 'ATACAR', defend: 'DEFENDER', skill: 'HABILIDADES' };

// Estado del enemigo: quemadura, veneno y, si lee tus movimientos, la acción que ha memorizado (repetirla = golpe doble)
function _rpgMonsterStatus(combat) {
    const m = combat.monster;
    const parts = [];
    if (m.status && m.status.burn) parts.push(`🔥 Arde ${m.status.burn.dmg}×${m.status.burn.turns}`);
    if (m.status && m.status.poison > 0) parts.push(`☠️ Veneno ${m.status.poison}`);
    if (m.ai === 'reader') {
        const last = RPG_ACTION_NAMES[combat.lastAction];
        parts.push(last ? `👁️ Recuerda ${last}: repítela y golpea doble` : '👁️ Lee tus movimientos');
    }
    return parts.join(' · ');
}

function _rpgWeaponIcon(hero) {
    const w = hero.equipment && hero.equipment.weapon;
    return (w && Items.DAMAGE_TYPES[w.damaged] && Items.DAMAGE_TYPES[w.damaged].icon) || '🗡️';
}

/** Dibuja las dos cartas y el menú de acciones. opts.menu: 'main' | 'skills' */
export function renderRpgCombat(combat, opts = {}) {
    if (!combat) return;
    const { hero, monster } = combat;
    const tags = { monster: 'Monstruo', subboss: 'Sub-jefe', boss: 'Jefe final' };

    const title = document.getElementById('rpgCombatTitle');
    if (title) title.textContent = `⚔️ Combate · Piso ${monster.floor + 1} · Ronda ${combat.turn}`;

    const heroSlot = document.getElementById('rpgCombatHero');
    if (heroSlot) heroSlot.innerHTML = _rpgFighterCard(hero, `Nivel ${hero.level}`, combat.defending ? '🛡️ Defendiendo' : '');
    const monSlot = document.getElementById('rpgCombatMonster');
    if (monSlot) monSlot.innerHTML = _rpgFighterCard(monster, monster.tag || tags[monster.type] || 'Monstruo', _rpgMonsterStatus(combat), combat.over ? '' : _rpgIntentHtml(monster));

    const bar = document.getElementById('rpgCombatActions');
    if (!bar) return;
    if (combat.over) { bar.innerHTML = ''; return; }

    if (opts.menu === 'skills') {
        const skillButtons = Object.keys(Engine.RPG_SKILLS).map(id => {
            const s = Engine.rpgSkillInfo(hero, id, combat);
            const cd = combat.cooldowns[s.id];
            const hint = cd > 0 ? `${s.desc} · Enfriando (${cd})` : `${s.desc} · Listo`;
            return _rpgActionButton(`data-rpg-action="skill" data-rpg-skill="${esc(s.id)}"`, s.icon, s.name, hint, cd > 0);
        }).join('');
        bar.innerHTML = skillButtons + _rpgActionButton('data-rpg-action="back"', '↩️', 'VOLVER', 'Elegir otra acción', false);
        return;
    }

    const hits = Engine.rpgAttackHits(combat);
    const dmg = hits.reduce((a, b) => a + b, 0);
    const attackHint = hits.length > 1 ? `Ataco ${hits.length} veces: ${hits.join(' + ')} = ${dmg} de daño` : `Ataco una vez: ${dmg} de daño`;
    const guarded = monster.intent && monster.intent.k === 'guard';
    const incoming = Engine.rpgIncomingPreview(combat, false);
    const defendHint = incoming > 0
        ? `Recibiría ${Engine.rpgIncomingPreview(combat, true)} en vez de ${incoming}`
        : 'Ahora no te ataca: defenderte no aporta nada';
    const canFlee = Engine.rpgCanFlee(combat);
    const noSkills = !!(hero.vows && hero.vows.noSkills);
    const fleeHint = canFlee ? 'Salgo del combate (me golpean al huir)'
        : (hero.vows && hero.vows.noFlee ? 'Tu voto de acero lo impide' : 'No se puede huir de este combate');
    bar.innerHTML =
        _rpgActionButton('data-rpg-action="attack"', _rpgWeaponIcon(hero), 'ATACAR', `${attackHint}${guarded ? ' (se protege)' : ''}`, false) +
        _rpgActionButton('data-rpg-action="defend"', '🛡️', 'DEFENDER', defendHint, false) +
        _rpgActionButton('data-rpg-action="skills"', '✨', 'HABILIDADES', noSkills ? 'Tu voto de silencio lo impide' : 'Golpe de Fuego y más', noSkills) +
        _rpgActionButton('data-rpg-action="flee"', '🏃', 'HUIR', fleeHint, !canFlee);
}

/** Números flotantes y sacudida sobre la carta que recibe el golpe, en secuencia. */
export function playRpgCombatFx(events) {
    (events || []).forEach((ev, i) => {
        if (!ev.amount || ev.amount <= 0) return;
        const selector = (ev.target === 'hero' ? '#rpgCombatHero' : '#rpgCombatMonster') + ' .rpg-fighter-card';
        setTimeout(() => {
            spawnDmgFloat(selector, 'hp', ev.amount);
            playHitAnimation(selector, ev.target === 'hero');
        }, i * 380);
    });
}

export function addRpgCombatLog(msg, type = 'system') {
    const el = document.getElementById('rpgCombatLogContent');
    if (!el) return;
    const div = document.createElement('div');
    div.className = `log-entry ${type}`;
    div.innerHTML = esc(msg);
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

export function clearRpgCombatLog() {
    const el = document.getElementById('rpgCombatLogContent');
    if (el) el.innerHTML = '';
}

/** Panel de fin de combate. info: { result, title, detail, button } */
export function showRpgCombatResult(info) {
    const el = document.getElementById('rpgCombatResult');
    if (!el || !info) return;
    el.className = `rpg-combat-result is-${esc(info.result)}`;
    el.innerHTML = `
        <div class="rpg-result-title">${esc(info.title)}</div>
        <div class="rpg-result-detail">${esc(info.detail || '')}</div>
        <button type="button" id="btnRpgCombatContinue" class="btn-forge">${esc(info.button || 'CONTINUAR')}</button>`;
    el.style.display = 'block';
}

export function hideRpgCombatResult() {
    const el = document.getElementById('rpgCombatResult');
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
}

// --- 🎲 Eventos (una situación, dos decisiones) ---

function _rpgParagraphs(text, cls = '') {
    return String(text || '').split('\n').filter(Boolean).map(t => `<p class="rpg-event-text ${cls}">${esc(t)}</p>`).join('');
}

/** Pantalla de decisión. view: { icon, title, text, options: [label, label], intro?: [líneas] } */
export function renderRpgEventScreen(view) {
    const el = document.getElementById('rpgEventBody');
    if (!el || !view) return;
    const intro = (view.intro || []).map(l => `<p class="rpg-event-text is-intro">${esc(l)}</p>`).join('');
    const options = (view.options || []).map((label, i) =>
        `<button type="button" class="rpg-event-option" data-rpg-event-opt="${i}"><span class="rpg-event-option-key">${i === 0 ? 'A' : 'B'}</span><span>${esc(label)}</span></button>`).join('');
    el.className = 'rpg-event-card';
    if (view.accent) el.style.setProperty('--accent', view.accent); else el.style.removeProperty('--accent');
    el.innerHTML = `
        <div class="rpg-event-icon">${view.icon}</div>
        <div class="rpg-event-title">${esc(view.title)}</div>
        ${intro}
        ${_rpgParagraphs(view.text)}
        <div class="rpg-event-options">${options}</div>`;
}

/** Resultado de la decisión. view: { icon, title, lines, changes, button } */
export function renderRpgEventResult(view) {
    const el = document.getElementById('rpgEventBody');
    if (!el || !view) return;
    const changes = (view.changes || []).map(c => {
        const cls = /^\+/.test(c) ? 'is-good' : (/^−/.test(c) ? 'is-bad' : '');
        return `<span class="rpg-event-chip ${cls}">${esc(c)}</span>`;
    }).join('');
    el.className = 'rpg-event-card is-result';
    el.style.removeProperty('--accent');
    el.innerHTML = `
        <div class="rpg-event-icon">${view.icon}</div>
        <div class="rpg-event-title">${esc(view.title)}</div>
        ${(view.lines || []).map(l => `<p class="rpg-event-text">${esc(l)}</p>`).join('')}
        ${changes ? `<div class="rpg-event-changes">${changes}</div>` : ''}
        <button type="button" id="btnRpgEventContinue" class="btn-forge">${esc(view.button || 'CONTINUAR')}</button>`;
}

// --- 🎁 Botín: 1 de 3 objetos, comparar y equipar o descartar ---

const _signedStat = (n, label) => (n ? `<span class="rpg-event-chip ${n > 0 ? 'is-good' : 'is-bad'}">${n > 0 ? '+' : '−'}${Math.abs(n)} ${label}</span>` : '');

function _rpgItemLinesHtml(item) {
    return Items.describeItem(item).map(l => `<i>${esc(l)}</i>`).join('');
}

function _rpgItemKind(item) {
    const def = Items.ITEM_SLOTS[item.slot];
    const dmg = item.damaged && Items.DAMAGE_TYPES[item.damaged];
    return `${def.icon} ${def.name}${dmg ? ` · ${dmg.icon} ${dmg.name}` : ''}`;
}

/**
 * view: { icon, title, text, offers: [{ item, delta, current }], selected, discardHeal }
 */
export function renderRpgLoot(view) {
    const el = document.getElementById('rpgLootBody');
    if (!el || !view) return;
    const cards = view.offers.map((o, i) => {
        const it = o.item;
        const chips = _signedStat(o.delta.atq, 'ATK') + _signedStat(o.delta.maxHp, 'HP máx') + _signedStat(o.delta.guard, 'guardia');
        return `<button type="button" class="rpg-loot-card ${view.selected === i ? 'is-selected' : ''}" data-rpg-loot-pick="${i}" data-rarity="${esc(it.rarity)}" style="--rarity:${esc(it.color)}">
            <span class="rpg-loot-rarity">${it.rarityIcon} ${esc(it.rarityName)}</span>
            <span class="rpg-loot-icon">${it.icon}</span>
            <span class="rpg-loot-name">${esc(it.name)}</span>
            <span class="rpg-loot-kind">${esc(_rpgItemKind(it))}</span>
            <span class="rpg-loot-lines">${_rpgItemLinesHtml(it)}</span>
            ${chips ? `<span class="rpg-loot-delta">${chips}</span>` : ''}
        </button>`;
    }).join('');
    const picked = view.selected != null ? view.offers[view.selected] : null;
    let detail = '';
    if (picked) {
        const cur = picked.current;
        detail = `<div class="rpg-loot-detail">
            <div class="rpg-loot-current">${cur
                ? `Ahora llevas: <b style="color:${esc(cur.color)}">${cur.rarityIcon} ${cur.icon} ${esc(cur.name)}</b> <span>${esc(Items.describeItem(cur).join(' · '))}</span>`
                : `Tu ranura de ${esc(Items.ITEM_SLOTS[picked.item.slot].name.toLowerCase())} está <b>vacía</b>.`}</div>
            <div class="rpg-loot-buttons">
                <button type="button" id="btnRpgLootEquip" class="btn-forge">EQUIPAR ${picked.item.icon}${cur ? ' (pierdes lo que llevas)' : ''}</button>
                <button type="button" id="btnRpgLootDiscard" class="btn-secondary">DESCARTAR · +${view.discardHeal} ❤️</button>
            </div>
        </div>`;
    }
    el.innerHTML = `
        <div class="rpg-event-icon">${view.icon}</div>
        <div class="rpg-event-title">${esc(view.title)}</div>
        <p class="rpg-event-text">${esc(view.text)}</p>
        <div class="rpg-loot-offers">${cards}</div>
        ${detail}`;
}

// --- ▶️ Inicio: continuar partida guardada ---

/** save: { floorText, hpText, seedCode } o null si no hay partida guardada. */
export function renderRpgContinue(save) {
    const btn = document.getElementById('btnRpgContinue');
    if (!btn) return;
    if (!save) { btn.style.display = 'none'; btn.innerHTML = ''; return; }
    btn.style.display = '';
    btn.innerHTML = `▶️ CONTINUAR LA RUTA <span class="rpg-continue-detail">${esc(save.floorText)} · ${esc(save.hpText)} · semilla ${esc(save.seedCode)}</span>`;
}

// --- 🏁 Fin de partida ---

/**
 * summary: { result: 'victory'|'defeat', title, cause, almost, floorText, stats: [{icon, label, value}],
 *            events: [texto], seedCode, build: [texto] }
 */
export function renderRpgEnd(summary) {
    const el = document.getElementById('rpgEndBody');
    if (!el || !summary) return;
    const win = summary.result === 'victory';
    const stats = (summary.stats || []).map(x =>
        `<div class="rpg-end-stat"><span class="rpg-end-stat-icon">${x.icon}</span><span class="rpg-end-stat-value">${esc(String(x.value))}</span><span class="rpg-end-stat-label">${esc(x.label)}</span></div>`).join('');
    const events = (summary.events || []).length
        ? `<div class="rpg-end-events"><b>Eventos vividos:</b> ${summary.events.map(esc).join(' · ')}</div>` : '';
    const gear = (summary.gear || []).length
        ? `<div class="rpg-end-gear">${summary.gear.map(g => `<span class="rpg-hero-tag" style="border-color:${esc(g.color)}">${g.rarity} ${g.icon} ${esc(g.name)}</span>`).join('')}</div>` : '';
    const build = (summary.build || []).length
        ? `<div class="rpg-end-build">${summary.build.map(b => `<span class="rpg-hero-tag">${esc(b)}</span>`).join('')}</div>` : '';
    const achievements = (summary.newAchievements || []).length
        ? `<div class="rpg-end-achievements"><b>🏆 Logros desbloqueados:</b>
            ${summary.newAchievements.map(a => `<span class="rpg-hero-tag is-achievement" title="${esc(a.desc)}">${a.icon} ${esc(a.name)}</span>`).join('')}
           </div>` : '';
    el.className = `rpg-end-card ${win ? 'is-victory' : 'is-defeat'}`;
    el.innerHTML = `
        <div class="rpg-end-icon">${win ? '🏆' : '💀'}</div>
        <div class="rpg-end-title">${esc(summary.title)}</div>
        <p class="rpg-end-cause">${esc(summary.cause)}</p>
        ${summary.almost ? `<p class="rpg-end-almost">${esc(summary.almost)}</p>` : ''}
        <div class="rpg-end-floor">${esc(summary.floorText)}</div>
        <div class="rpg-end-stats">${stats}</div>
        ${gear}
        ${build}
        ${achievements}
        ${events}
        <div class="rpg-end-seed">Semilla <code id="rpgEndSeed">${esc(summary.seedCode)}</code>
            <button type="button" id="btnRpgCopySeed" class="btn-secondary">Copiar</button></div>
        <div class="rpg-end-actions">
            <button type="button" id="btnRpgEndNew" class="btn-forge">🗡️ NUEVA RUTA</button>
            <button type="button" id="btnRpgEndRepeat" class="btn-secondary">🔁 REPETIR CON LA MISMA SEMILLA</button>
            <button type="button" id="btnRpgEndHome" class="btn-secondary">← INICIO</button>
        </div>`;
}

// =============================================
// 📖🎒🏆⚙️ Paneles de la cabecera — consultables en cualquier momento, sin abandonar la ruta
// =============================================
export function openPanel() {
    const el = document.getElementById('panelOverlay');
    if (el) el.style.display = 'flex';
}
export function closePanel() {
    const el = document.getElementById('panelOverlay');
    if (el) { el.style.display = 'none'; document.getElementById('panelBody').innerHTML = ''; }
}

const _progressBar = (done, total, label) => `
    <div class="panel-progress">
        <div class="panel-progress-bar"><div class="panel-progress-fill" style="width:${total ? Math.round(100 * done / total) : 0}%"></div></div>
        <p class="panel-progress-label">${done} / ${total} ${esc(label)}</p>
    </div>`;

const _panelHeader = (icon, title, sub) => `
    <div class="panel-header"><span class="panel-icon">${icon}</span><div><h3 class="panel-title">${esc(title)}</h3>${sub ? `<p class="panel-sub">${esc(sub)}</p>` : ''}</div></div>`;

/** 📖 Bestiario: todo lo que puede cruzarse en tu camino, revelado a medida que lo ves y lo vences. */
export function renderBestiaryPanel(meta) {
    const el = document.getElementById('panelBody');
    if (!el) return;
    const seen = meta.monstersSeen || {}, defeated = meta.monstersDefeated || {};
    const tiles = Meta.BESTIARY.map(m => {
        const isSeen = !!seen[m.name], isDefeated = !!defeated[m.name];
        if (!isSeen) return `<div class="panel-tile is-locked"><span class="panel-tile-icon">❔</span><span class="panel-tile-name">???</span></div>`;
        return `<div class="panel-tile" style="--rarity:${isDefeated ? 'var(--success)' : 'var(--border-strong)'}">
            <span class="panel-tile-icon">${m.icon}</span><span class="panel-tile-name">${esc(m.name)}</span>
            <span class="panel-tile-sub">${isDefeated ? 'Vencido' : 'Visto con vida'}</span></div>`;
    }).join('');
    const doneCount = Object.keys(seen).length;
    el.innerHTML = _panelHeader('📖', 'Bestiario', 'Se revela cada enemigo que te cruzas; se marca en verde el que has vencido.')
        + _progressBar(doneCount, Meta.BESTIARY.length, 'descubiertos')
        + `<div class="panel-grid">${tiles}</div>`;
}

/** 🎒 Colección: las bases de objeto que has visto (en un cofre, hoguera o botín de sub-jefe), y en qué rarezas. */
export function renderCollectionPanel(meta) {
    const el = document.getElementById('panelBody');
    if (!el) return;
    const seen = meta.itemsSeen || {};
    const bases = Items.ITEM_BASES;
    const tiles = bases.map(b => {
        const s = seen[b.id];
        if (!s) return `<div class="panel-tile is-locked"><span class="panel-tile-icon">❔</span><span class="panel-tile-name">???</span></div>`;
        const dots = Items.RARITIES.map(r => `<span style="color:${s.rarities.includes(r.id) ? r.color : 'var(--border-color)'}">●</span>`).join('');
        return `<div class="panel-tile"><span class="panel-tile-icon">${b.icon}</span><span class="panel-tile-name">${esc(b.name)}</span>
            <span class="panel-tile-sub" style="font-size:0.9rem;letter-spacing:1px">${dots}</span></div>`;
    }).join('');
    const doneCount = Object.keys(seen).length;
    el.innerHTML = _panelHeader('🎒', 'Colección', 'Objetos vistos en cofres, hogueras y botín de sub-jefe. Los puntos son las rarezas en las que ya lo has visto.')
        + _progressBar(doneCount, bases.length, 'bases descubiertas')
        + `<div class="panel-grid">${tiles}</div>`;
}

/** 🏆 Logros: información, nunca poder — coherente con la meta-progresión horizontal del juego. */
export function renderAchievementsPanel(meta) {
    const el = document.getElementById('panelBody');
    if (!el) return;
    const rows = Meta.ACHIEVEMENTS.map(a => {
        const done = !!meta.achievements[a.id];
        return `<div class="panel-row ${done ? 'is-done' : 'is-locked'}">
            <span class="panel-row-icon">${a.icon}</span>
            <div class="panel-row-body"><div class="panel-row-name">${esc(a.name)}</div><div class="panel-row-desc">${esc(a.desc)}</div></div>
            ${done ? '<span class="panel-row-check">✔️</span>' : ''}
        </div>`;
    }).join('');
    const doneCount = Object.keys(meta.achievements).length;
    el.innerHTML = _panelHeader('🏆', 'Logros', 'Solo información y orgullo: ningún logro te hace más fuerte.')
        + _progressBar(doneCount, Meta.ACHIEVEMENTS.length, 'logros')
        + `<div class="panel-list">${rows}</div>`;
}

/**
 * ⚙️ Opciones: semilla de la partida en curso, importar/exportar el progreso y quiénes somos.
 * handlers: { onExport, onImport(text) → {ok, error?}, seedCode }
 */
export function renderOptionsPanel(handlers = {}) {
    const el = document.getElementById('panelBody');
    if (!el) return;
    el.innerHTML = _panelHeader('⚙️', 'Opciones', '')
        + `<div class="panel-section">
            <h4 class="panel-section-title">Semilla de la ruta actual</h4>
            ${handlers.seedCode
                ? `<div class="panel-field-hint">Compártela para que alguien recorra el mismo mapa: <code>${esc(handlers.seedCode)}</code></div>`
                : `<div class="panel-field-hint">No hay ninguna ruta en marcha. La semilla se elige al pulsar «Entrar en la mazmorra».</div>`}
        </div>
        <div class="panel-section">
            <h4 class="panel-section-title">Exportar tu progreso</h4>
            <p class="panel-field-hint" style="margin-bottom:8px;">Copia este texto y guárdalo. Incluye tu ruta en curso (si hay una) y todo lo descubierto (bestiario, colección, logros).</p>
            <div class="panel-field"><textarea id="panelExportText" rows="3" readonly onclick="this.select()"></textarea></div>
            <div class="panel-actions-row"><button type="button" id="btnPanelExport" class="btn-secondary">📋 Generar y copiar</button></div>
        </div>
        <div class="panel-section">
            <h4 class="panel-section-title">Importar</h4>
            <p class="panel-field-hint" style="margin-bottom:8px;">Pega aquí un texto exportado antes. <b>Sustituye</b> tu ruta y tu progreso actuales.</p>
            <div class="panel-field"><textarea id="panelImportText" rows="3" placeholder="Pega aquí el texto exportado…"></textarea></div>
            <div class="panel-actions-row"><button type="button" id="btnPanelImport" class="btn-forge">📥 Importar</button></div>
            <p class="panel-field-hint" id="panelImportStatus"></p>
        </div>
        <div class="panel-section panel-about">
            <h4 class="panel-section-title">Sobre Easy Hero</h4>
            <p>Easy Hero está <b>empezando</b>: esto es una primera ronda de contenido, no el juego terminado.</p>
            <p>La idea es seguir creciendo: más clases y afinidades, debilidades y Ruptura, combates con varios enemigos, más mazmorras y una crónica que recuerde cada partida. El plan completo está en
                <a href="https://github.com/harmondez/easy_hero/blob/main/planning.md" target="_blank" rel="noopener" style="color:var(--primary-light)">planning.md</a>.</p>
            <p>Gratis, sin cuentas, sin anuncios. Todo lo que ves aquí vive solo en tu navegador.</p>
        </div>`;
    const btnExport = document.getElementById('btnPanelExport');
    if (btnExport) btnExport.addEventListener('click', () => {
        const text = handlers.onExport ? handlers.onExport() : '';
        const ta = document.getElementById('panelExportText');
        if (ta) { ta.value = text; ta.select(); }
        Promise.resolve().then(() => navigator.clipboard.writeText(text))
            .then(() => { btnExport.textContent = '✅ Copiado'; })
            .catch(() => { btnExport.textContent = '📋 Generado (selecciona y copia)'; });
    });
    const btnImport = document.getElementById('btnPanelImport');
    if (btnImport) btnImport.addEventListener('click', () => {
        const ta = document.getElementById('panelImportText');
        const status = document.getElementById('panelImportStatus');
        const res = handlers.onImport ? handlers.onImport(ta ? ta.value : '') : { ok: false, error: 'No disponible.' };
        if (status) { status.textContent = res.ok ? (res.message || '✅ Importado.') : `⚠️ ${res.error}`; status.style.color = res.ok ? 'var(--success)' : 'var(--danger)'; }
        if (res.ok && res.reload) setTimeout(() => window.location.reload(), 900);
    });
}

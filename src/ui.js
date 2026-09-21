import * as Engine from './engine.js?v=20260920a';

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
    ['rpgStartView', 'rpgMapView', 'rpgCombatView'].forEach(id => {
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
            <div class="rpg-stat def"><b>DEF</b> ${hero.def}</div>
        </div>`;
}

export function renderRpgLegend() {
    const el = document.getElementById('rpgLegend');
    if (!el) return;
    el.innerHTML = Object.values(Engine.RPG_NODE_TYPES).map(t => `
        <span class="rpg-legend-item type-${esc(t.id)}"><span class="rpg-legend-icon">${t.icon}</span>${esc(t.name)}</span>`).join('');
}

export function renderRpgHeroPanel(hero, progressText) {
    const el = document.getElementById('rpgHeroPanel');
    if (!el || !hero) return;
    const hpPct = Math.max(0, Math.min(100, (hero.hp / hero.maxHp) * 100));
    el.style.setProperty('--accent', hero.color);
    el.innerHTML = `
        <div class="rpg-hero-avatar">${hero.icon}</div>
        <div class="rpg-hero-info">
            <div class="rpg-hero-name">${esc(hero.name)}</div>
            <div class="rpg-hero-hp"><div class="rpg-hero-hp-fill" style="width:${hpPct}%"></div><span><b>HP</b> ${hero.hp} / ${hero.maxHp}</span></div>
            <div class="rpg-hero-stats">
                <span class="rpg-stat atk"><b>ATK</b> ${hero.atq}</span>
                <span class="rpg-stat def"><b>DEF</b> ${hero.def}</span>
            </div>
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
    const available = new Set(Engine.rpgAvailableNodes(map, currentId));
    const byId = new Map(map.nodes.map(n => [n.id, n]));
    const pos = n => ({ x: (n.col + 0.5) / cols * 100, y: (floors - 1 - n.floor + 0.5) / floors * 100 });

    const taken = new Set();
    for (let i = 1; i < visitedIds.length; i++) taken.add(`${visitedIds[i - 1]}>${visitedIds[i]}`);

    const lines = map.nodes.flatMap(n => n.next.map(id => {
        const a = pos(n);
        const b = pos(byId.get(id));
        const cls = taken.has(`${n.id}>${id}`) ? 'is-taken' : (n.id === currentId ? 'is-open' : '');
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
            info = `${t.desc} ATK ${s.atq} · HP ${s.hp} · DEF ${s.def}`;
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

    if (state.animate) setTimeout(() => el.classList.remove('animate'), 1600);
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

function _rpgFighterCard(f, tag, status) {
    const hpPct = Math.max(0, Math.min(100, (f.hp / f.maxHp) * 100));
    return `
        <article class="rpg-fighter-card ${f.hp <= 0 ? 'is-down' : ''}" style="--accent: ${esc(f.color)}">
            <div class="rpg-fighter-tag">${esc(tag)}</div>
            <div class="rpg-fighter-icon">${f.icon}</div>
            <div class="rpg-fighter-name">${esc(f.name)}</div>
            <div class="rpg-fighter-hpbar"><div class="rpg-fighter-hpfill" style="width:${hpPct}%"></div></div>
            <div class="rpg-fighter-stats">
                <div class="rpg-stat atk"><b>ATK</b> ${f.atq}</div>
                <div class="rpg-stat hp"><b>HP</b> ${f.hp} / ${f.maxHp}</div>
                <div class="rpg-stat def"><b>DEF</b> ${f.def}</div>
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
    if (monSlot) monSlot.innerHTML = _rpgFighterCard(monster, tags[monster.type] || 'Monstruo', '');

    const bar = document.getElementById('rpgCombatActions');
    if (!bar) return;
    if (combat.over) { bar.innerHTML = ''; return; }

    if (opts.menu === 'skills') {
        const skillButtons = Object.values(Engine.RPG_SKILLS).map(s => {
            const cd = combat.cooldowns[s.id];
            const hint = cd > 0 ? `${s.desc} · Enfriando (${cd})` : `${s.desc} · Listo`;
            return _rpgActionButton(`data-rpg-action="skill" data-rpg-skill="${esc(s.id)}"`, s.icon, s.name, hint, cd > 0);
        }).join('');
        bar.innerHTML = skillButtons + _rpgActionButton('data-rpg-action="back"', '↩️', 'VOLVER', 'Elegir otra acción', false);
        return;
    }

    const dmg = Math.max(1, hero.atq - monster.def);
    const canFlee = Engine.rpgCanFlee(combat);
    bar.innerHTML =
        _rpgActionButton('data-rpg-action="attack"', '🗡️', 'ATACAR', `Ataco una vez: ${dmg} de daño`, false) +
        _rpgActionButton('data-rpg-action="defend"', '🛡️', 'DEFENDER', 'El próximo golpe me hace la mitad', false) +
        _rpgActionButton('data-rpg-action="skills"', '✨', 'HABILIDADES', 'Golpe de Fuego y más', false) +
        _rpgActionButton('data-rpg-action="flee"', '🏃', 'HUIR', canFlee ? 'Salgo del combate (me golpean al huir)' : 'No se puede huir de este combate', !canFlee);
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

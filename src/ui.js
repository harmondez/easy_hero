import * as Engine from './engine.js?v=1.4.2';
import * as Items from './items.js?v=1.4.2';
import * as Meta from './meta.js?v=1.4.2';
import * as Stats from './stats.js?v=1.4.2';
import { upgradeAmountText } from './data/upgrades.js?v=1.4.2';
import { RPG_BALANCE } from './data/balance.js?v=1.4.2';
import { ADJECTIVES_BY_ID, LINEAGES_BY_ID, MONSTER_ADJECTIVES, MONSTER_LINEAGES } from './data/variants.js?v=1.4.2';

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

// --- 🗡️ MODO RPG (Carta de Héroe + mapa de ruta) ---

export function toggleRpgView(view) {
    ['rpgStartView', 'rpgMapView', 'rpgEventView', 'rpgLootView', 'rpgCharView', 'rpgShopView', 'rpgTierView', 'rpgAdventureView', 'rpgCombatView', 'rpgEndView'].forEach(id => {
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


/**
 * El panel del personaje, a la derecha del mapa y siempre a la vista: dónde estás, vida, ataque,
 * nivel permanente con su experiencia, las 4 primarias y el oro. Solo muestra: repartir puntos
 * se hace en el Inventario, que es donde vive todo lo que se toca.
 */
export function renderRpgHeroPanel(hero, progressText, meta) {
    const el = document.getElementById('rpgHeroPanel');
    if (!el || !hero) return;
    const tagsHtml = rpgHeroTags(hero).map(t => `<span class="rpg-hero-tag">${t.icon} ${esc(t.text)}</span>`).join('');
    const hpPct = Math.max(0, Math.min(100, (hero.hp / hero.maxHp) * 100));
    const level = (meta && meta.charLevel) || 1;
    const need = Stats.xpToNext(level);
    const xp = (meta && meta.xp) || 0;
    const xpPct = Math.max(0, Math.min(100, Math.round(100 * xp / need)));
    const points = (meta && meta.statPoints) || 0;
    const primaries = Stats.PRIMARY_KEYS.map(k => {
        const info = Stats.PRIMARY_INFO[k];
        return `<div class="hero-panel-primary" title="${esc(`${info.name}: ${info.desc}`)}">
            <span aria-hidden="true">${info.icon}</span><b>${info.short}</b><span class="hero-panel-num">${hero.primary[k]}</span>
        </div>`;
    }).join('');
    el.style.setProperty('--accent', hero.color);
    el.innerHTML = `
        <div class="hero-panel-head">
            <div class="rpg-hero-avatar">${hero.icon}</div>
            <div class="hero-panel-id">
                <div class="rpg-hero-name">${esc(hero.name)}</div>
                <div class="hero-panel-where">${esc(progressText || '')}</div>
            </div>
        </div>
        <div class="rpg-hero-hp"><div class="rpg-hero-hp-fill" style="width:${hpPct}%"></div><span><b>HP</b> ${hero.hp} / ${hero.maxHp}</span></div>
        <div class="rpg-hero-stats">
            <span class="rpg-stat atk"><b>ATK</b> ${hero.atq}</span>
            ${hero.guard ? `<span class="rpg-stat guard"><b>🛡️</b> −${hero.guard}</span>` : ''}
            ${meta ? `<span class="rpg-stat gold">🪙 ${meta.gold}</span>` : ''}
        </div>
        <div class="hero-panel-level">
            <div class="hero-panel-level-row"><span>🧬 Nivel ${level}</span><span class="hero-panel-num">${xp} / ${need} XP</span></div>
            <div class="panel-progress-bar"><div class="panel-progress-fill" style="width:${xpPct}%"></div></div>
        </div>
        <div class="hero-panel-primaries">${primaries}</div>
        ${points ? `<div class="hero-panel-points">✨ ${points} punto${points === 1 ? '' : 's'} por repartir en el Inventario</div>` : ''}
        ${tagsHtml ? `<div class="rpg-hero-tags">${tagsHtml}</div>` : ''}`;
}

// Niebla de guerra: cuántos pisos por delante de la posición actual se ven con claridad.
// Piso actual + este número de opciones se ve; a partir de ahí, niebla, y se despeja según avanzas.
const RPG_FOG_AHEAD = 3;

// Desorden del mapa, en % del ancho/alto: rompe la rejilla perfecta para que parezca excavado a mano.
// Medido, no a ojo: con 2 %/1 % se solapaban salas en el 4,7 % de los mapas en un móvil de 390 px (una sala
// junto a un sub-jefe); con estos valores, 0 de 600 mapas. La curva de los pasillos pone el resto del efecto.
const RPG_JITTER_X = 1.2;
const RPG_JITTER_Y = 0.6;
const RPG_CORRIDOR_BEND = 2.6;   // cuánto se curva un pasillo, en unidades del viewBox (0-100)

// Hash estable de un texto a [0, 1): el mapa se descoloca SIEMPRE igual para la misma partida, sin
// tocar el azar del juego (eso cambiaría la semilla y las comprobaciones exactas).
function _hash01(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000003) / 1000003;
}

/**
 * Dibuja el mapa como una mazmorra: pasillos curvos excavados (SVG en porcentajes, que se estira con el
 * contenedor) y salas como botones posicionados en %, el piso 0 arriba (se avanza hacia abajo).
 * Los pisos a más de RPG_FOG_AHEAD opciones de tu posición son un hueco sin dibujar: la niebla de guerra.
 * state: { currentId, visitedIds, heroIcon, animate }
 */
export function renderRpgMap(map, state = {}) {
    const el = document.getElementById('rpgMap');
    if (!el || !map) return;
    const { floors, cols } = map;
    const tier = map.tier || 0;
    const visitedIds = state.visitedIds || [];
    const visited = new Set(visitedIds);
    const currentId = state.currentId || null;
    const skip = !!state.skip;
    const available = new Set(Engine.rpgAvailableNodes(map, currentId, skip));
    const byId = new Map(map.nodes.map(n => [n.id, n]));
    const pos = n => ({
        x: (n.col + 0.5) / cols * 100 + (_hash01(`${n.id}|x`) - 0.5) * 2 * RPG_JITTER_X,
        y: (n.floor + 0.5) / floors * 100 + (_hash01(`${n.id}|y`) - 0.5) * 2 * RPG_JITTER_Y
    });

    const taken = new Set();
    for (let i = 1; i < visitedIds.length; i++) taken.add(`${visitedIds[i - 1]}>${visitedIds[i]}`);

    const current = byId.get(currentId);
    const openFrom = new Set([currentId]);
    if (skip && current) current.next.forEach(id => openFrom.add(id));

    const currentFloor = current ? current.floor : -1;
    const isFogged = n => (n.floor - currentFloor) > RPG_FOG_AHEAD && n.id !== currentId
        && !visited.has(n.id) && !available.has(n.id);

    // Cada pasillo es una curva suave (no una línea recta) con una bóveda excavada debajo. La curva sale del
    // hash de sus dos extremos, así que el mismo pasillo se dobla siempre hacia el mismo lado.
    const tunnels = [], paths = [];
    for (const n of map.nodes) {
        for (const id of n.next) {
            const to = byId.get(id);
            const a = pos(n), b = pos(to);
            const dx = b.x - a.x, dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const bend = (_hash01(`${n.id}>${id}`) - 0.5) * 2 * RPG_CORRIDOR_BEND;
            const cx = (a.x + b.x) / 2 - (dy / len) * bend;
            const cy = (a.y + b.y) / 2 + (dx / len) * bend;
            const d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
            const cls = taken.has(`${n.id}>${id}`) ? 'is-taken' : (openFrom.has(n.id) ? 'is-open' : '');
            const fog = isFogged(to) ? ' is-fog' : '';
            tunnels.push(`<path class="rpg-tunnel${fog}" d="${d}" vector-effect="non-scaling-stroke"/>`);
            paths.push(`<path class="rpg-edge ${cls}${fog}" d="${d}" vector-effect="non-scaling-stroke"/>`);
        }
    }

    const nodesHtml = map.nodes.map((n, i) => {
        const t = Engine.RPG_NODE_TYPES[n.type];
        const p = pos(n);
        const fogged = isFogged(n);
        const st = n.id === currentId ? 'is-current'
            : visited.has(n.id) ? 'is-visited'
            : available.has(n.id) ? 'is-available' : 'is-locked';
        const hero = st === 'is-current' ? ` data-hero="${esc(state.heroIcon || '')}"` : '';
        let icon = t.icon, name = t.name, info = t.desc;
        if (fogged) {
            // Un hueco sin dibujar: ni icono ni tipo. No se sabe qué hay hasta que la luz llega
            icon = ''; name = 'Zona sin explorar'; info = 'Aún no has llegado tan lejos.';
        } else if (n.type === 'monster' || n.type === 'subboss' || n.type === 'boss') {
            const s = Engine.rpgMonsterStats(n.type, n.floor, tier);
            info = `${t.desc} ATK ${s.atq} · HP ${s.hp}`;
        }
        return `<button type="button" class="rpg-node type-${esc(n.type)} ${st}${fogged ? ' is-fog' : ''}" data-rpg-node="${esc(n.id)}"
            style="left:${p.x}%;top:${p.y}%;--i:${i}" ${st === 'is-available' ? '' : 'disabled'}${hero}
            title="${esc(name)} — ${esc(info)}" aria-label="${fogged ? esc(name) : `${esc(name)}, piso ${n.floor + 1}`}">${icon}</button>`;
    }).join('');

    // La antorcha del héroe: la luz que le rodea. Es el único movimiento del mapa que no pide el jugador
    const lit = current ? pos(current) : { x: 50, y: 0 };
    const boss = byId.get(map.bossId);
    const bp = pos(boss);
    const bossFogged = isFogged(boss);
    el.style.setProperty('--rpg-floors', floors);
    el.classList.toggle('animate', !!state.animate);
    el.innerHTML = `
        <div class="rpg-map-light" style="left:${lit.x}%;top:${lit.y}%" aria-hidden="true"></div>
        <svg class="rpg-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${tunnels.join('')}${paths.join('')}</svg>
        ${nodesHtml}
        <div class="rpg-boss-tag${bossFogged ? ' is-fog' : ''}" style="left:${bp.x}%;top:${bp.y}%">${bossFogged ? '???' : 'JEFE FINAL'}</div>`;

    if (state.animate) setTimeout(() => el.classList.remove('animate'), 1200);
}

/** Tramo superado: el jefe ha caído y la mazmorra sigue hacia abajo. */
export function renderRpgTierGate(info) {
    const el = document.getElementById('rpgTierBody');
    if (!el || !info) return;
    const achievements = (info.newAchievements || []).map(a =>
        `<li><span class="rpg-end-ach-icon">${a.icon}</span> <b>${esc(a.name)}</b> · ${esc(a.desc)}</li>`).join('');
    el.innerHTML = `
        <div class="rpg-tier-kicker">Has vencido al guardián de ${esc(info.clearedName)}</div>
        <h2 class="rpg-tier-title">La mazmorra sigue</h2>
        <p class="rpg-tier-text">El suelo se abre bajo la sala del jefe. Más abajo espera <b>${esc(info.nextName)}</b>,
        con criaturas que no has visto nunca y que pegan mucho más fuerte. Bajas con la <b>vida al completo</b>
        y todo tu equipo.</p>
        <div class="rpg-tier-stats">
            <div class="rpg-tier-stat"><span>Profundidad récord</span><b>${info.bestDepth}</b></div>
            <div class="rpg-tier-stat"><span>Oro acumulado</span><b>🪙 ${info.gold}</b></div>
            <div class="rpg-tier-stat"><span>Siguiente piso</span><b>${info.nextDepth}</b></div>
        </div>
        ${achievements ? `<div class="rpg-end-ach-title">🏆 Logros desbloqueados</div><ul class="rpg-end-achievements">${achievements}</ul>` : ''}
        <button type="button" id="btnRpgDescend" class="btn-forge">🕳️ SEGUIR BAJANDO</button>`;
}

/** La Forja: mejoras permanentes que se compran con el oro que nunca se pierde. */
export function renderShop(meta) {
    const el = document.getElementById('shopBody');
    if (!el || !meta) return;
    const cards = Meta.UPGRADES.map(def => {
        const level = Meta.upgradeLevel(meta, def.id);
        const cost = Meta.nextUpgradeCost(meta, def.id);
        const maxed = !Number.isFinite(cost);
        const affordable = !maxed && meta.gold >= cost;
        const amount = upgradeAmountText(def, level);
        const have = amount ? `<span class="shop-have">Ahora: ${esc(amount)}</span>` : '';
        return `
        <article class="shop-card ${maxed ? 'is-maxed' : affordable ? 'is-affordable' : 'is-locked'}">
            <div class="shop-icon">${def.icon}</div>
            <div class="shop-info">
                <div class="shop-name">${esc(def.name)} ${level ? `<span class="shop-level">nivel ${level}</span>` : ''}</div>
                <div class="shop-desc">${esc(def.desc)}</div>
                ${have}
            </div>
            <button type="button" class="shop-buy" data-shop-buy="${esc(def.id)}" ${maxed || !affordable ? 'disabled' : ''}>
                ${maxed ? 'COMPRADA' : `🪙 ${cost}`}
            </button>
        </article>`;
    }).join('');
    // La poción no es una mejora: es un consumible que llevas encima, con tope y precio fijo
    const P = RPG_BALANCE.potion;
    const potions = Meta.potionCount(meta);
    const potionFull = potions >= P.max;
    const potionCard = `
        <article class="shop-card ${potionFull ? 'is-maxed' : meta.gold >= P.price ? 'is-affordable' : 'is-locked'}">
            <div class="shop-icon">🧪</div>
            <div class="shop-info">
                <div class="shop-name">Poción de vida <span class="shop-level">llevas ${potions} de ${P.max}</span></div>
                <div class="shop-desc">En combate cura el ${Math.round(P.heal * 100)} % de tu vida máxima, a cambio de tu turno. Las que no gastes se quedan contigo.</div>
            </div>
            <button type="button" class="shop-buy" data-shop-buy="potion" ${potionFull || meta.gold < P.price ? 'disabled' : ''}>
                ${potionFull ? 'LLENO' : `🪙 ${P.price}`}
            </button>
        </article>`;
    el.innerHTML = `
        <div class="shop-purse">Tu oro: <b>🪙 ${meta.gold}</b></div>
        <p class="shop-note">Lo que compras aquí es <b>para siempre</b>: no se pierde al morir ni al empezar otra ruta.
        Las mejoras con nivel se pueden comprar una y otra vez, cada vez más caras.</p>
        <div class="shop-grid">${potionCard}${cards}</div>`;
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

// --- ⚔️ Combate RPG: escenario de lado + panel de pergamino (héroe · acciones · enemigo) ---
// Estilo DragonFable: lo que hará el enemigo NO se anuncia. Sus patrones siguen ahí (cargar, protegerse,
// curarse) y el diario los delata, pero nada de la interfaz lo predice.

function _rpgHpBar(f) {
    const hpPct = Math.max(0, Math.min(100, (f.hp / f.maxHp) * 100));
    return `<div class="rpg-hud-hp" role="img" aria-label="Vida ${f.hp} de ${f.maxHp}">
        <div class="rpg-hud-hpfill" style="width:${hpPct}%"></div>
        <span class="rpg-stat hp">${f.hp} / ${f.maxHp}</span>
    </div>`;
}

function _rpgHudSide(f, sub, status, side) {
    return `
        <article class="rpg-hud-card is-${side} ${f.hp <= 0 ? 'is-down' : ''}">
            <div class="rpg-hud-name">${esc(f.name)}</div>
            <div class="rpg-hud-sub">${esc(sub)}</div>
            ${_rpgHpBar(f)}
            <div class="rpg-hud-status">${status || '&nbsp;'}</div>
        </article>`;
}

function _rpgActionButton(attrs, icon, label, hint, disabled, extra = '') {
    return `<button type="button" class="rpg-action" ${attrs} ${disabled ? 'disabled' : ''} title="${esc(hint)}">
        <span class="rpg-action-icon" aria-hidden="true">${icon}</span>
        <span class="rpg-action-label">${esc(label)}</span>
        <span class="rpg-action-hint">${esc(hint)}</span>${extra}
    </button>`;
}

const RPG_ACTION_NAMES = { attack: 'ATACAR', defend: 'DEFENDER', skill: 'HABILIDAD', potion: 'POCIÓN' };

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

// Tu estado: defensa, y lo que te hacen las variantes «de la Plaga» y «de las Brasas»
function _rpgHeroStatus(combat) {
    const parts = [];
    if (combat.defending) parts.push('🛡️ Defendiendo');
    const s = combat.heroStatus || {};
    if (s.burn) parts.push(`🔥 Ardes ${s.burn.dmg}×${s.burn.turns}`);
    if (s.poison > 0) parts.push(`☠️ Veneno ${s.poison}`);
    return parts.join(' · ');
}

function _rpgWeaponIcon(hero) {
    const w = hero.equipment && hero.equipment.weapon;
    return (w && Items.DAMAGE_TYPES[w.damaged] && Items.DAMAGE_TYPES[w.damaged].icon) || '🗡️';
}

/** Dibuja el escenario, los dos lados del panel y la barra de acciones. */
export function renderRpgCombat(combat, opts = {}) {
    if (!combat) return;
    const { hero, monster } = combat;
    const tags = { monster: 'Monstruo', subboss: 'Sub-jefe', boss: 'Jefe final' };

    // opts.where: dónde se pelea (en la aventura, el nombre de la escena en vez del piso)
    const title = document.getElementById('rpgCombatTitle');
    if (title) title.textContent = `⚔️ Combate · ${opts.where || `Piso ${monster.floor + 1}`} · Ronda ${combat.turn}`;

    const heroSlot = document.getElementById('rpgCombatHero');
    if (heroSlot) heroSlot.innerHTML = _rpgHudSide(hero, `Nivel ${hero.level}`, _rpgHeroStatus(combat), 'hero');
    const monSlot = document.getElementById('rpgCombatMonster');
    if (monSlot) monSlot.innerHTML = _rpgHudSide(monster, monster.tag || tags[monster.type] || 'Monstruo', _rpgMonsterStatus(combat), 'monster');
    _rpgRenderStage(hero, monster);
    _rpgRenderTelegraph(combat);

    const bar = document.getElementById('rpgCombatActions');
    if (!bar) return;
    if (combat.over) { bar.innerHTML = ''; return; }

    // Tu ataque sí lo conoces (es tu arma), pero sin descontar si el enemigo se protege: eso sería anunciarlo
    const unguarded = { ...combat, monster: { ...monster, intent: null } };
    const hits = Engine.rpgAttackHits(unguarded);
    const dmg = hits.reduce((a, b) => a + b, 0);
    const attackHint = hits.length > 1 ? `Ataco ${hits.length} veces: ${hits.join(' + ')} = ${dmg} de daño` : `Ataco una vez: ${dmg} de daño`;
    const defendHint = `El próximo golpe que recibas hará la mitad${hero.guard ? ` y ${hero.guard} menos` : ''}`;
    const canFlee = Engine.rpgCanFlee(combat);
    const noSkills = !!(hero.vows && hero.vows.noSkills);
    const fleeHint = canFlee ? 'Salgo del combate (me golpean al huir)'
        : (hero.vows && hero.vows.noFlee ? 'Tu voto de acero lo impide' : 'No se puede huir de este combate');
    const potions = combat.potions | 0;
    const potionHeal = Math.max(1, Math.round(hero.maxHp * RPG_BALANCE.potion.heal));
    const potionHint = potions <= 0 ? 'No te quedan pociones (se compran en La Forja)'
        : hero.hp >= hero.maxHp ? 'Ya tienes la vida al máximo'
        : `Recupero hasta ${potionHeal} de vida, pero gasto el turno`;

    const skills = Object.keys(Engine.RPG_SKILLS).map(id => {
        const s = Engine.rpgSkillInfo(hero, id, combat);
        const cd = combat.cooldowns[s.id];
        const hint = noSkills ? 'Tu voto de silencio lo impide' : cd > 0 ? `${s.desc} · Lista en ${cd} ${cd === 1 ? 'ronda' : 'rondas'}` : s.desc;
        const badge = cd > 0 ? `<span class="rpg-action-badge">${cd}</span>` : '';
        // En el icono cabe una palabra: «Golpe de Fuego» → «Fuego» (el nombre completo va en el tooltip)
        const short = s.name.split(' ').pop();
        return _rpgActionButton(`data-rpg-action="skill" data-rpg-skill="${esc(s.id)}"`, s.icon, short, `${s.name}: ${hint}`, noSkills || cd > 0, badge);
    }).join('');

    bar.innerHTML = `
        <div class="rpg-actions-side">
            ${_rpgActionButton('data-rpg-action="defend"', '🛡️', 'Defender', defendHint, false)}
            ${skills}
        </div>
        ${_rpgActionButton('data-rpg-action="attack" data-main', _rpgWeaponIcon(hero), '¡Atacar!', attackHint, false)}
        <div class="rpg-actions-side">
            ${_rpgActionButton('data-rpg-action="potion"', '🧪', 'Poción', potionHint, potions <= 0 || hero.hp >= hero.maxHp, `<span class="rpg-action-badge is-count">${potions}</span>`)}
            ${_rpgActionButton('data-rpg-action="flee"', '🏃', 'Huir', fleeHint, !canFlee)}
        </div>`;
}

// --- 🎭 Escenario: héroe a la izquierda mirando a la derecha, enemigo a la derecha mirando a la izquierda ---
// De momento todos los enemigos usan el goblin; cuando haya más arte, se elige aquí por monstruo.
const RPG_MONSTER_SPRITE = { src: 'img/sprites/goblin_left.png', w: 175, h: 217 };
const RPG_HERO_SPRITE_H = 244;   // alto de img/sprites/hero_right.png
const RPG_LUNGE_MS = 460;        // ida y vuelta de la embestida
const RPG_LUNGE_IMPACT = 0.4;    // punto de la embestida en que llega el golpe (y sale el número)
const RPG_FX_GAP_MS = 140;       // pausa entre un golpe y el siguiente

function _rpgRenderStage(hero, monster) {
    const heroActor = document.getElementById('rpgActorHero');
    const monActor = document.getElementById('rpgActorMonster');
    if (!heroActor || !monActor) return;
    heroActor.classList.toggle('is-down', hero.hp <= 0);
    monActor.classList.toggle('is-down', monster.hp <= 0);
    const img = monActor.querySelector('img');
    if (img && !img.src.endsWith(RPG_MONSTER_SPRITE.src)) {
        img.src = RPG_MONSTER_SPRITE.src;
        img.width = RPG_MONSTER_SPRITE.w;
        img.height = RPG_MONSTER_SPRITE.h;
    }
    // Misma escala de píxel para los dos: la altura del enemigo es relativa a la del héroe (y crece si es jefe)
    const size = RPG_MONSTER_SIZE[monster.type] || 1;
    monActor.style.setProperty('--ratio', (size * RPG_MONSTER_SPRITE.h / RPG_HERO_SPRITE_H).toFixed(3));
    if (img) {
        img.alt = monster.name;
        img.style.filter = rpgMonsterTint(monster);
    }
}

// Mientras no haya arte de cada monstruo, el goblin se tiñe: un color por especie y, si tiene linaje, el suyo
const RPG_MONSTER_SIZE = { subboss: 1.25, boss: 1.5 };
const RPG_SPECIES_TINTS = [
    'hue-rotate(70deg)', 'hue-rotate(150deg)', 'hue-rotate(210deg) saturate(1.2)', 'hue-rotate(290deg)',
    'grayscale(0.8) brightness(1.15)', 'sepia(0.5) hue-rotate(-40deg) saturate(1.5)', 'hue-rotate(110deg) brightness(0.85)'
];
const RPG_LINEAGE_TINTS = {
    plaga: 'hue-rotate(35deg) saturate(1.8)', brasas: 'sepia(1) saturate(4) hue-rotate(-25deg)',
    carrona: 'sepia(0.5) brightness(0.8)', sangre: 'hue-rotate(250deg) saturate(1.8)',
    huesos: 'grayscale(1) brightness(1.3)', forja: 'sepia(0.8) saturate(2) brightness(1.1)',
    abismo: 'hue-rotate(180deg) brightness(0.7) saturate(1.4)', niebla: 'grayscale(0.6) brightness(1.2) opacity(0.85)'
};
export function rpgMonsterTint(monster) {
    const lin = monster.variants && monster.variants.lin;
    if (lin && RPG_LINEAGE_TINTS[lin]) return RPG_LINEAGE_TINTS[lin];
    const name = monster.baseName || monster.name || '';
    if (/goblin|grask/i.test(name)) return 'none';   // los goblins, con su color de siempre
    let h = 0;
    for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return RPG_SPECIES_TINTS[h % RPG_SPECIES_TINTS.length];
}

// Golpe fuerte en camino: frase sobre el escenario y el enemigo brillando en rojo (sin moverse, sin cifras)
function _rpgRenderTelegraph(combat) {
    const cap = document.getElementById('rpgStageCaption');
    const mon = document.getElementById('rpgActorMonster');
    const tell = Engine.rpgTelegraph(combat);
    if (mon) mon.classList.toggle('is-winding', !!tell);
    if (!cap) return;
    if (!tell) { cap.hidden = true; cap.textContent = ''; return; }
    if (cap.textContent !== tell.text) {
        cap.textContent = tell.text;
        cap.classList.remove('is-in');
        void cap.offsetWidth;   // reinicia la entrada si cambia la frase
        cap.classList.add('is-in');
    }
    cap.hidden = false;
}

/** Qué pinta cada suceso del combate: quién embiste, a quién y qué número sale. null = nada visible. */
function _rpgFxStep(ev) {
    if (ev.kind === 'dodge') return { from: 'hero', to: 'monster', text: '¡Esquiva!', cls: 'is-miss' };
    if (!(ev.amount > 0)) return null;
    if (ev.kind === 'heal') return { to: ev.target, text: `+${ev.amount}`, cls: 'is-heal' };
    const lunge = ['attack', 'crit', 'skill'].includes(ev.kind) && ev.actor !== ev.target;
    return { from: lunge ? (ev.target === 'hero' ? 'monster' : 'hero') : null, to: ev.target,
        text: `-${ev.amount}${ev.kind === 'crit' ? '!' : ''}`, cls: ev.kind === 'crit' ? 'is-crit' : '' };
}

function _rpgStageFloat(stage, actor, text, cls) {
    const s = stage.getBoundingClientRect();
    const a = actor.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `rpg-stage-float ${cls}`;
    el.textContent = text;
    el.style.left = `${a.left - s.left + a.width / 2}px`;
    el.style.top = `${a.top - s.top}px`;
    stage.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
}

let _rpgFxRun = 0;
/** Cada golpe: el atacante se lanza rápido hacia el otro, sale el daño encima del golpeado y vuelve a su sitio. En secuencia. */
export function playRpgCombatFx(events) {
    const stage = document.getElementById('rpgStage');
    if (!stage) return;
    const run = ++_rpgFxRun;   // una acción nueva corta la secuencia anterior
    stage.querySelectorAll('.rpg-stage-float').forEach(el => el.remove());
    const actors = { hero: document.getElementById('rpgActorHero'), monster: document.getElementById('rpgActorMonster') };
    Object.values(actors).forEach(a => a && a.getAnimations().forEach(x => x.cancel()));
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let t = 0;
    (events || []).forEach(ev => {
        const step = _rpgFxStep(ev);
        if (!step || !actors[step.to]) return;
        const lunge = step.from && !still;
        setTimeout(() => {
            if (run !== _rpgFxRun) return;
            const target = actors[step.to];
            const hit = () => {
                if (run !== _rpgFxRun) return;
                _rpgStageFloat(stage, target, step.text, step.cls);
                if (step.cls !== 'is-miss' && step.cls !== 'is-heal' && !still) {
                    target.animate([{ filter: 'brightness(2.2) saturate(0.4)' }, { filter: 'none' }], { duration: 220, easing: 'ease-out' });
                }
            };
            if (!lunge) { hit(); return; }
            const attacker = actors[step.from];
            const a = attacker.getBoundingClientRect();
            const b = target.getBoundingClientRect();
            // Hasta meterse un poco en el hueco del otro, no hasta atravesarlo
            const dx = step.from === 'hero' ? (b.left - a.right) + b.width * 0.3 : -((a.left - b.right) + b.width * 0.3);
            attacker.animate([
                { transform: 'translateX(0)', easing: 'cubic-bezier(.55,0,.9,.45)' },
                { transform: `translateX(${dx}px)`, offset: RPG_LUNGE_IMPACT, easing: 'cubic-bezier(.2,.6,.35,1)' },
                { transform: 'translateX(0)' }
            ], { duration: RPG_LUNGE_MS });
            attacker.classList.add('is-attacking');
            setTimeout(hit, RPG_LUNGE_MS * RPG_LUNGE_IMPACT);
            setTimeout(() => attacker.classList.remove('is-attacking'), RPG_LUNGE_MS);
        }, t);
        t += (lunge ? RPG_LUNGE_MS : 260) + RPG_FX_GAP_MS;
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
    // Plegado, el diario enseña solo la última línea
    const last = document.getElementById('rpgCombatLogLast');
    if (last) last.textContent = msg;
}

export function clearRpgCombatLog() {
    const el = document.getElementById('rpgCombatLogContent');
    if (el) el.innerHTML = '';
    const last = document.getElementById('rpgCombatLogLast');
    if (last) last.textContent = '';
}

/** Final del combate: un cartel sobre el escenario (el vencido ya se desvanece). info: { result, title, detail, button } */
export function showRpgCombatResult(info) {
    const el = document.getElementById('rpgCombatResult');
    if (!el || !info) return;
    el.className = `rpg-combat-result is-${esc(info.result)}`;
    el.innerHTML = `
        <div class="rpg-result-plate">
            <div class="rpg-result-title">${esc(info.title)}</div>
            <div class="rpg-result-detail">${esc(info.detail || '')}</div>
            <button type="button" id="btnRpgCombatContinue" class="btn-forge">${esc(info.button || 'CONTINUAR')}</button>
        </div>`;
    el.style.display = 'flex';
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

// --- 🎁 Botín: cae un objeto, se compara con el equipo (siempre visible) y se decide ---

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
/**
 * El equipo del héroe, siempre a la vista: las 4 ranuras con lo que llevas puesto.
 * Se usa en el mapa (columna fija) y en la pantalla de botín (para comparar sin abrir nada).
 */
export function gearPanelHtml(hero, opts = {}) {
    if (!hero) return '';
    const slots = Items.ITEM_SLOT_ORDER.map(slot => {
        const def = Items.ITEM_SLOTS[slot];
        const it = hero.equipment && hero.equipment[slot];
        const highlight = opts.highlightSlot === slot ? ' is-highlight' : '';
        if (!it) {
            return `<li class="gear-slot is-empty${highlight}">
                <span class="gear-slot-icon">${def.icon}</span>
                <span class="gear-slot-body">
                    <span class="gear-slot-label">${esc(def.name)}</span>
                    <span class="gear-slot-name">Vacía</span>
                </span></li>`;
        }
        const lines = Items.describeItem(it);
        return `<li class="gear-slot${highlight}" style="--rarity:${esc(it.color)}" title="${esc([`${it.rarityIcon} ${it.name}`, ...lines].join('\n'))}">
            <span class="gear-slot-icon">${it.icon}</span>
            <span class="gear-slot-body">
                <span class="gear-slot-label">${esc(def.name)}</span>
                <span class="gear-slot-name">${esc(it.name)}</span>
                <span class="gear-slot-stats">${esc(lines.slice(0, 2).join(' · '))}</span>
            </span></li>`;
    }).join('');
    // En el mapa las estadísticas ya están en el panel del personaje; en el botín no hay otro panel, así que van aquí
    const foot = opts.showStats === false ? '' : `
        <div class="gear-panel-foot">
            <span class="rpg-stat atk"><b>ATK</b> ${hero.atq}</span>
            <span class="rpg-stat hp"><b>HP</b> ${hero.hp}/${hero.maxHp}</span>
            ${hero.guard ? `<span class="rpg-stat guard"><b>🛡️</b> −${hero.guard}</span>` : ''}
        </div>`;
    return `
        <div class="gear-panel-title">⚔️ Tu equipo</div>
        <ul class="gear-panel-list">${slots}</ul>${foot}`;
}

/** Pinta el panel de equipo fijo del mapa. */
export function renderGearPanel(hero) {
    const el = document.getElementById('rpgGearPanel');
    if (el) el.innerHTML = gearPanelHtml(hero, { showStats: false });
}

export function renderRpgLoot(view) {
    const el = document.getElementById('rpgLootBody');
    if (!el || !view) return;
    const cards = view.offers.map((o, i) => {
        const it = o.item;
        const chips = _signedStat(o.delta.atq, 'ATK') + _signedStat(o.delta.maxHp, 'HP máx') + _signedStat(o.delta.guard, 'guardia');
        return `<div class="rpg-loot-card is-selected" data-rarity="${esc(it.rarity)}" style="--rarity:${esc(it.color)}">
            <span class="rpg-loot-rarity">${it.rarityIcon} ${esc(it.rarityName)}</span>
            <span class="rpg-loot-icon">${it.icon}</span>
            <span class="rpg-loot-name">${esc(it.name)}</span>
            <span class="rpg-loot-kind">${esc(_rpgItemKind(it))}</span>
            <span class="rpg-loot-lines">${_rpgItemLinesHtml(it)}</span>
            ${chips ? `<span class="rpg-loot-delta">${chips}</span>` : ''}
        </div>`;
    }).join('');
    const picked = view.selected != null ? view.offers[view.selected] : null;
    let detail = '';
    if (picked) {
        const cur = picked.current;
        const currentLine = cur
            ? `${view.isBoss ? 'Tu trofeo actual' : 'Ahora llevas'}: <b style="color:${esc(cur.color)}">${cur.rarityIcon} ${cur.icon} ${esc(cur.name)}</b> <span>${esc(Items.describeItem(cur).join(' · '))}</span>`
            : (view.isBoss ? 'Todavía no tienes ningún trofeo.' : `Tu ranura de ${esc(Items.ITEM_SLOTS[picked.item.slot].name.toLowerCase())} está <b>vacía</b>.`);
        const buttons = view.isBoss
            ? `<button type="button" id="btnRpgLootEquip" class="btn-forge">${cur ? 'QUEDARME CON EL NUEVO' : 'ACEPTAR EL TROFEO'} ${picked.item.icon}</button>
               ${cur ? `<button type="button" id="btnRpgLootDiscard" class="btn-secondary">CONSERVAR EL ANTERIOR</button>` : ''}`
            : `<button type="button" id="btnRpgLootEquip" class="btn-forge">EQUIPAR ${picked.item.icon}${cur ? ' (pierdes lo que llevas)' : ''}</button>
               <button type="button" id="btnRpgLootStore" class="btn-secondary" ${view.canStore ? '' : 'disabled title="El inventario está lleno"'}>GUARDAR EN EL INVENTARIO 🎒</button>
               <button type="button" id="btnRpgLootDiscard" class="btn-secondary">DESCARTAR · +${view.discardHeal} ❤️</button>`;
        detail = `<div class="rpg-loot-detail">
            <div class="rpg-loot-current">${currentLine}</div>
            <div class="rpg-loot-buttons">${buttons}</div>
        </div>`;
    }
    // El equipo, a la vista también aquí: comparar no debería obligar a abrir otra pantalla
    const gear = view.hero
        ? `<aside class="gear-panel gear-panel-loot">${gearPanelHtml(view.hero, { highlightSlot: picked ? picked.item.slot : null })}</aside>`
        : '';
    el.innerHTML = `
        <div class="rpg-event-icon">${view.icon}</div>
        <div class="rpg-event-title">${esc(view.title)}</div>
        <p class="rpg-event-text">${esc(view.text)}</p>
        <div class="rpg-loot-layout">
            ${gear}
            <div class="rpg-loot-main">
                <div class="rpg-loot-offers">${cards}</div>
                ${detail}
            </div>
        </div>`;
}

// =============================================
// 🧍 Personaje — equipo, inventario (10 ranuras) y trofeo del jefe, con oro abajo
// =============================================
const CHAR_SLOT_POS = {
    weapon:    { x: 16, y: 28 },
    secondary: { x: 84, y: 28 },
    armor:     { x: 16, y: 72 },
    accessory: { x: 84, y: 72 }
};

function _charSlotNode(hero, slot, selection) {
    const def = Items.ITEM_SLOTS[slot];
    const it = hero.equipment && hero.equipment[slot];
    const pos = CHAR_SLOT_POS[slot];
    const isSel = selection && selection.from === 'equipment' && selection.slot === slot;
    const rarity = it ? it.color : 'var(--border-strong)';
    return `<button type="button" class="char-doll-slot ${isSel ? 'is-selected' : ''} ${it ? '' : 'is-empty'}"
        style="left:${pos.x}%; top:${pos.y}%; --rarity:${esc(rarity)}"
        data-char-pick="equipment" data-char-slot="${slot}" title="${esc(def.name)}">
        <span class="char-doll-slot-icon">${it ? it.icon : def.icon}</span>
        <span class="char-doll-slot-label">${esc(def.name)}</span>
    </button>`;
}

function _charDollHtml(hero, selection) {
    const lines = Object.values(CHAR_SLOT_POS).map(p => `<line x1="50" y1="50" x2="${p.x}" y2="${p.y}" vector-effect="non-scaling-stroke"/>`).join('');
    const slots = Object.keys(CHAR_SLOT_POS).map(slot => _charSlotNode(hero, slot, selection)).join('');
    return `<div class="char-doll" style="--accent:${esc(hero.color)}">
        <svg class="char-doll-lines" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>
        <div class="char-doll-hero"><span>${hero.icon}</span></div>
        ${slots}
    </div>`;
}

function _charInvTile(item, selected, locked) {
    if (!item) return `<div class="char-inv-slot is-empty"></div>`;
    return `<button type="button" class="char-inv-slot ${selected ? 'is-selected' : ''}" style="--rarity:${esc(item.color)}"
        data-char-pick="${locked ? 'trophy' : 'inventory'}" ${locked ? '' : `data-char-index="${item.__i}"`} title="${esc(item.name)}">
        <span class="char-inv-icon">${item.icon}</span>
    </button>`;
}

function _charDetailHtml(hero, selection) {
    if (!selection) return `<div class="char-detail-empty">👆 Toca una ranura, un objeto del inventario o tu trofeo para verlo aquí.</div>`;
    let item = null;
    if (selection.from === 'equipment') item = hero.equipment[selection.slot];
    else if (selection.from === 'inventory') item = hero.inventory[selection.index];
    else if (selection.from === 'trophy') item = hero.trophy;
    if (!item) return `<div class="char-detail-empty">Ranura vacía. Equipa algo del inventario o encuentra un objeto nuevo.</div>`;

    const lines = _rpgItemLinesHtml(item);
    const actions = [];
    if (selection.from === 'inventory') {
        actions.push(`<button type="button" data-char-action="equip" class="btn-forge">EQUIPAR</button>`);
        actions.push(`<button type="button" data-char-action="discard" class="btn-secondary">DESCARTAR (cura)</button>`);
    } else if (selection.from === 'trophy') {
        actions.push(`<button type="button" data-char-action="equip" class="btn-forge">EMPUÑAR EL TROFEO</button>`);
    } else if (selection.from === 'equipment') {
        actions.push(`<button type="button" data-char-action="store" class="btn-secondary">GUARDAR EN EL INVENTARIO</button>`);
        actions.push(`<button type="button" data-char-action="discard" class="btn-secondary">DESCARTAR (cura)</button>`);
    }
    return `
        <div class="char-detail-rarity" style="color:${esc(item.color)}">${item.rarityIcon || '🏆'} ${esc(item.rarityName || 'Legendaria')}</div>
        <div class="char-detail-icon">${item.icon}</div>
        <div class="char-detail-name">${esc(item.name)}</div>
        <div class="char-detail-kind">${esc(_rpgItemKind(item))}</div>
        <div class="char-detail-lines">${lines}</div>
        ${item.desc ? `<p class="char-detail-desc">${esc(item.desc)}</p>` : ''}
        <div class="char-detail-actions">${actions.join('')}</div>`;
}

// Barra de XP + reparto de puntos (permanente: se guarda en meta.js para siempre, aunque mueras o cambies de ruta)
function _charLevelHtml(hero, meta) {
    const level = meta.charLevel || 1;
    const need = Stats.xpToNext(level);
    const pct = Math.max(0, Math.min(100, Math.round(100 * meta.xp / need)));
    const points = meta.statPoints || 0;
    const primaryRows = Stats.PRIMARY_KEYS.map(k => {
        const info = Stats.PRIMARY_INFO[k];
        return `<div class="char-primary-row">
            <span class="char-primary-icon" title="${esc(info.desc)}">${info.icon}</span>
            <span class="char-primary-name">${info.short}</span>
            <span class="char-primary-value">${hero.primary[k]}</span>
            ${points > 0 ? `<button type="button" class="char-primary-plus" data-char-spend="${k}" title="Invertir un punto en ${esc(info.name)} (para siempre)">+1</button>` : ''}
        </div>`;
    }).join('');
    return `
        <div class="char-level">
            <div class="char-level-header">
                <span class="char-level-badge">🧬 Nivel de personaje ${level}</span>
                ${points > 0 ? `<span class="char-level-points">✨ ${points} punto${points === 1 ? '' : 's'} por repartir</span>` : ''}
            </div>
            <div class="panel-progress-bar"><div class="panel-progress-fill" style="width:${pct}%"></div></div>
            <p class="panel-progress-label">${meta.xp} / ${need} XP</p>
            <div class="char-primary-grid">${primaryRows}</div>
        </div>`;
}

/** view: { hero, meta, selection } */
export function renderCharacterView(hero, meta, selection) {
    const el = document.getElementById('charBody');
    if (!el || !hero) return;
    const inv = hero.inventory || [];
    const invTiles = Array.from({ length: Items.INVENTORY_SIZE }, (_, i) => {
        const it = inv[i] ? { ...inv[i], __i: i } : null;
        const isSel = selection && selection.from === 'inventory' && selection.index === i;
        return _charInvTile(it, isSel, false);
    }).join('');
    const trophySel = selection && selection.from === 'trophy';
    const trophyTile = hero.trophy
        ? `<div class="char-trophy">${_charInvTile({ ...hero.trophy }, trophySel, true)}<span class="char-trophy-label">Trofeo</span></div>`
        : '';
    const extraStats = [
        hero.critChance > 0 ? `<span class="rpg-stat crit">💥 ${Math.round(hero.critChance * 100)}% crítico</span>` : '',
        hero.dodgeChance > 0 ? `<span class="rpg-stat dodge">💨 ${Math.round(hero.dodgeChance * 100)}% esquiva</span>` : '',
        hero.physResist > 0 ? `<span class="rpg-stat resist">🛡️ ${Math.round(hero.physResist * 100)}% resist. física</span>` : '',
        hero.elemDmgBonus > 0 ? `<span class="rpg-stat elem">🔮 +${hero.elemDmgBonus} daño elemental</span>` : ''
    ].filter(Boolean).join('');

    el.innerHTML = `
        <div class="char-detail" id="charDetail">${_charDetailHtml(hero, selection)}</div>
        <div class="char-center">
            ${_charDollHtml(hero, selection)}
            <div class="char-stats-row">
                <span class="rpg-stat atk"><b>ATK</b> ${hero.atq}</span>
                <span class="rpg-stat hp"><b>HP</b> ${hero.hp} / ${hero.maxHp}</span>
                ${hero.guard ? `<span class="rpg-stat guard"><b>🛡️</b> −${hero.guard}</span>` : ''}
                ${extraStats}
            </div>
            ${meta ? _charLevelHtml(hero, meta) : ''}
            <div class="char-inventory">
                <div class="char-inventory-title">🎒 Inventario · ${inv.length} / ${Items.INVENTORY_SIZE}</div>
                <div class="char-inventory-grid">${invTiles}</div>
                ${trophyTile}
            </div>
            <div class="char-gold">🪙 <b>${(meta && meta.gold) || 0}</b> de oro</div>
        </div>`;
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
            <button type="button" id="btnRpgEndForge" class="btn-forge">⚒️ GASTAR EL ORO EN LA FORJA</button>
            <button type="button" id="btnRpgEndNew" class="btn-secondary">🗡️ NUEVA RUTA</button>
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
    const variantsSeen = meta.variantsSeen || {};
    // Las variantes no son fichas propias: son medallas dentro de la ficha del monstruo base
    const variantNames = name => {
        const v = variantsSeen[name];
        if (!v) return [];
        return [
            ...Object.keys(v.adj || {}).map(id => ADJECTIVES_BY_ID[id] && ADJECTIVES_BY_ID[id].name),
            ...Object.keys(v.lin || {}).map(id => LINEAGES_BY_ID[id] && LINEAGES_BY_ID[id].name)
        ].filter(Boolean);
    };
    const tiles = Meta.BESTIARY.map(m => {
        const isSeen = !!seen[m.name], isDefeated = !!defeated[m.name];
        if (!isSeen) return `<div class="panel-tile is-locked"><span class="panel-tile-icon">❔</span><span class="panel-tile-name">???</span></div>`;
        const vars = variantNames(m.name);
        const medals = vars.length
            ? `<span class="panel-tile-variants" title="${esc(vars.map(n => `${m.name} ${n}`).join('\n'))}">🧬 ${vars.length}</span>`
            : '';
        return `<div class="panel-tile" style="--rarity:${isDefeated ? 'var(--success)' : 'var(--border-strong)'}">
            <span class="panel-tile-icon">${m.icon}</span><span class="panel-tile-name">${esc(m.name)}</span>
            <span class="panel-tile-sub">${isDefeated ? 'Vencido' : 'Visto con vida'}${medals}</span></div>`;
    }).join('');
    const doneCount = Object.keys(seen).length;
    const distinctVariants = new Set();
    for (const [, v] of Object.entries(variantsSeen)) {
        Object.keys(v.adj || {}).forEach(id => distinctVariants.add(`a:${id}`));
        Object.keys(v.lin || {}).forEach(id => distinctVariants.add(`l:${id}`));
    }
    const totalVariants = MONSTER_ADJECTIVES.length + MONSTER_LINEAGES.length;
    el.innerHTML = _panelHeader('📖', 'Bestiario',
        'Se revela cada enemigo que te cruzas y se marca en verde el que has vencido. '
        + `Las variantes (🧬) son formas raras del mismo monstruo: llevas ${distinctVariants.size} de ${totalVariants}.`)
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

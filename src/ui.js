import * as Engine from './engine.js?v=1.12.0';
import * as Items from './items.js?v=1.12.0';
import * as Meta from './meta.js?v=1.12.0';
import * as Stats from './stats.js?v=1.12.0';
import { upgradeAmountText } from './data/upgrades.js?v=1.12.0';
import { RPG_BALANCE } from './data/balance.js?v=1.12.0';
import { ART } from './data/art.js?v=1.12.0';
import { EFFECTS, ELIXIRS, FOOD } from './data/effects.js?v=1.12.0';
import { GEAR, GEAR_FOR_SALE, STARTER_GEAR, WEAPON_UPGRADE, ELEMENTS, SLOT_ICONS } from './data/gear.js?v=1.12.0';
import { RARITY_BY_ID } from './data/rarities.js?v=1.12.0';
import { SHOPS } from './data/shops.js?v=1.12.0';
import { MATERIALS } from './data/loot.js?v=1.12.0';
import { HERO_SPRITES } from './data/hero-sprites.js?v=1.12.0';
import { HeroAnimator, HERO_FRAME, prepareHero } from './hero-sprite.js?v=1.12.0';
import { effectList } from './effects.js?v=1.12.0';
import { monsterArt, heroArt } from './art.js?v=1.12.0';
import { ADJECTIVES_BY_ID, LINEAGES_BY_ID, MONSTER_ADJECTIVES, MONSTER_LINEAGES } from './data/variants.js?v=1.12.0';

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
            <div class="rpg-stat ph"><b>PH</b> ${Engine.rpgHeroPh(hero)}</div>
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
            <span class="rpg-stat atk"><b>ATK</b> ${hero.atq}</span> <span class="rpg-stat ph"><b>PH</b> ${Engine.rpgHeroPh(hero)}</span>
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
        ${achievements ? `<div class="rpg-end-ach-title">${UI_IMG('menu-logros')} Logros desbloqueados</div><ul class="rpg-end-achievements">${achievements}</ul>` : ''}
        <button type="button" id="btnRpgDescend" class="btn-forge">🕳️ SEGUIR BAJANDO</button>`;
}

// Mejoras de La Forja que ya tienen arte (las demás, su emoticono hasta que llegue el suyo)
const UPGRADE_IMG = { constitucion: 'vida', buen_ojo: 'moneda', zurron: 'inventario', filo: 'forja-filo', estudio: 'forja-estudio',
    herencia: 'forja-herencia', linterna: 'forja-linterna', suerte: 'forja-suerte' };

// La imagen de un artículo: un icono de ART.icons (por su id) o, si trae ruta, esa imagen (el héroe con una armadura)
const _shopImg = img => (img.includes('/') ? `<img class="shop-icon-img is-piece is-armor" src="${esc(img)}" alt="">`
    : `<img class="shop-icon-img${img.startsWith('objeto-') ? ' is-piece' : ''}" src="${esc(ICON(img))}" alt="">`);

/** Una carta de la tienda. price ya con el modo pruebas aplicado (0 = «GRATIS»); state: 'ok' | 'full' | 'owned' | 'maxed'. */
function _shopCard({ buy, img, icon, name, tag, desc, extra = '', price, state, gold, color }) {
    const blocked = state !== 'ok';
    const affordable = !blocked && gold >= price;
    const label = state === 'full' ? 'LLENO' : state === 'owned' ? 'TUYA' : state === 'maxed' ? 'COMPRADA' : price === 0 ? 'GRATIS' : `🪙 ${price}`;
    return `
        <article class="shop-card ${blocked ? 'is-maxed' : affordable ? 'is-affordable' : 'is-locked'}">
            <div class="shop-icon">${img ? _shopImg(img) : icon}</div>
            <div class="shop-info">
                <div class="shop-name"${color ? ` style="color:${esc(color)}"` : ''}>${esc(name)} ${tag ? `<span class="shop-level">${esc(tag)}</span>` : ''}</div>
                <div class="shop-desc">${esc(desc)}</div>${extra}
            </div>
            <button type="button" class="shop-buy" data-shop-buy="${esc(buy)}" ${blocked || !affordable ? 'disabled' : ''}>${label}</button>
        </article>`;
}

/** Lo que hace un arma de la aventura, en una línea («Al golpear: Sangrado 1×2 · 30 %»). */
export function gearEffectsText(g) {
    const parts = [];
    for (const f of g.onHit || []) parts.push(`Al golpear: ${EFFECTS[f.id].name} ${f.power}×${f.turns}${f.chance != null && f.chance < 1 ? ` · ${Math.round(f.chance * 100)} %` : ''}`);
    for (const f of g.onStart || []) parts.push(`Al empezar: ${EFFECTS[f.id].desc(f)} durante ${f.turns} rondas`);
    return parts.join(' · ');
}

/** Lo que hay que saber de un artículo de tienda (clave de src/data/shops.js) para pintar su carta de compra. */
function _shopItem(meta, key) {
    const price = Meta.shopPrice;
    const [kind, id] = key.split(':');
    if (kind === 'potion') {
        const P = RPG_BALANCE.potion, have = Meta.potionCount(meta);
        return { buy: 'potion', img: 'pocion-vida', name: 'Poción de vida', tag: `llevas ${have} de ${P.max}`,
            desc: `En combate cura el ${Math.round(P.heal * 100)} % de tu vida máxima, a cambio de tu turno. Las que no gastes se quedan contigo.`,
            price: price(P.price), state: have >= P.max ? 'full' : 'ok' };
    }
    if (kind === 'mana_potion') {
        const MP = RPG_BALANCE.manaPotion, have = Meta.manaPotionCount(meta);
        return { buy: 'mana_potion', img: 'pocion-mana', name: 'Poción de maná menor', tag: `llevas ${have} de ${MP.max}`,
            desc: `En combate devuelve el ${Math.round(MP.restore * 100)} % de tu maná máximo, a cambio de tu turno. El maná lanza tus habilidades.`,
            price: price(MP.price), state: have >= MP.max ? 'full' : 'ok' };
    }
    if (kind === 'elixir' && ELIXIRS[id]) {
        const ex = ELIXIRS[id], have = Meta.elixirCount(meta, id), e = EFFECTS[ex.effect.id];
        return { buy: key, img: ex.img, name: ex.name, tag: `llevas ${have} de ${ex.max}`,
            desc: `${ex.desc} En combate${ex.target === 'enemy' ? ', al enemigo' : ''}: ${e.desc(ex.effect)} durante ${ex.effect.turns} rondas, a cambio de tu turno.`,
            price: price(ex.price), state: have >= ex.max ? 'full' : 'ok' };
    }
    if (kind === 'food' && FOOD[id]) {
        const fd = FOOD[id], have = Meta.foodCount(meta, id);
        return { buy: key, img: fd.img, name: fd.name, tag: `llevas ${have} de ${fd.max}`,
            desc: `${fd.desc} Fuera del combate, desde el inventario: cura el ${Math.round(fd.heal * 100)} % de tu vida.`,
            price: price(fd.price), state: have >= fd.max ? 'full' : 'ok' };
    }
    if (kind === 'gear' && GEAR[id]) {
        const g = GEAR[id], rar = RARITY_BY_ID[g.rarity] || RARITY_BY_ID.comun, fx = gearEffectsText(g);
        const armor = g.slot === 'armor', look = armor && HERO_SPRITES.armors[g.look];
        return { buy: key, img: armor ? (look ? `${look.dir}/${HERO_SPRITES.idle.anim}_${HERO_SPRITES.idle.frame + 1}.webp` : 'ranura-armadura') : `objeto-${id}`,
            name: g.name, tag: `${rar.name} · ${armor ? `Vida +${g.hp}` : `ATK ${g.atq}`}`, color: rar.color,
            desc: g.desc, extra: fx ? `<span class="shop-have">${esc(fx)}</span>` : '',
            price: price(g.price), state: Meta.ownsGear(meta, id) ? 'owned' : 'ok' };
    }
    if (kind === 'crystal') {
        const have = Meta.crystalCount(meta);
        return { buy: 'crystal', img: WEAPON_UPGRADE.img, name: WEAPON_UPGRADE.name, tag: `llevas ${have} de ${WEAPON_UPGRADE.carry}`,
            desc: `Bram lo usa para mejorar una espada: +${WEAPON_UPGRADE.atq} de ATK para siempre (hasta +${WEAPON_UPGRADE.max} por espada). Pídele «Mejorar».`,
            price: price(WEAPON_UPGRADE.price), state: have >= WEAPON_UPGRADE.carry ? 'full' : 'ok' };
    }
    if (kind === 'material' && MATERIALS[id]) {
        const mt = MATERIALS[id], rar = RARITY_BY_ID[mt.rarity] || RARITY_BY_ID.comun;
        return { img: mt.img, name: mt.name, color: rar.color, desc: mt.desc, price: 0, state: 'ok' };
    }
    const def = Meta.UPGRADES_BY_ID[kind === 'upgrade' ? id : key];
    if (def) {
        const level = Meta.upgradeLevel(meta, def.id), cost = Meta.nextUpgradeCost(meta, def.id), amount = upgradeAmountText(def, level);
        return { buy: def.id, icon: def.icon, img: UPGRADE_IMG[def.id], name: def.name, tag: level ? `nivel ${level}` : '', desc: def.desc,
            extra: amount ? `<span class="shop-have">Ahora: ${esc(amount)}</span>` : '',
            price: Number.isFinite(cost) ? cost : 0, state: Number.isFinite(cost) ? 'ok' : 'maxed' };
    }
    return null;
}

/** Las claves de una tienda, con los comodines abiertos ('gear:*' → todas las armas a la venta). */
function _shopKeys(sells) {
    return sells.flatMap(k => k === 'gear:*' ? GEAR_FOR_SALE.map(id => `gear:${id}`)
        : k === 'upgrade:*' ? Meta.UPGRADES.map(u => `upgrade:${u.id}`)
        : k === 'material:*' ? Object.keys(MATERIALS).filter(id => MATERIALS[id].value != null).map(id => `material:${id}`) : [k]);
}

/** Carta de venta: lo que llevas de ese artículo y lo que te dan por uno. */
function _shopSellCard(meta, key) {
    const info = Meta.sellInfo(meta, key);
    const it = _shopItem(meta, key);
    if (!it || (info.have <= 0 && !info.equipped)) return '';
    return `
        <article class="shop-card ${info.have > 0 ? 'is-affordable' : 'is-maxed'}">
            <div class="shop-icon">${it.img ? _shopImg(it.img) : it.icon}</div>
            <div class="shop-info">
                <div class="shop-name"${it.color ? ` style="color:${esc(it.color)}"` : ''}>${esc(it.name)} <span class="shop-level">${info.equipped ? 'la llevas puesta' : key.startsWith('gear:') ? 'tuya' : `llevas ${info.have}`}</span></div>
                <div class="shop-desc">${info.equipped ? 'Equipa otra antes de venderla.' : key.startsWith('gear:') ? 'Si vendes una espada, pierde los cristales de mejora que le hayas puesto.' : key.startsWith('material:') ? esc(it.desc) : 'Te doy tres cuartos de lo que cuesta.'}</div>
            </div>
            <button type="button" class="shop-buy shop-sell" data-shop-sell="${esc(key)}" ${info.have > 0 ? '' : 'disabled'}>+${info.value} 🪙</button>
        </article>`;
}

/**
 * La tienda. Con opts.shop (id de src/data/shops.js), la de ese tendero: solo lo suyo, con las pestañas Comprar y
 * Vender (opts.tab). Sin opts.shop, La Forja del descenso: consumibles y mejoras permanentes.
 */
export function renderShop(meta, opts = {}) {
    const el = document.getElementById('shopBody');
    if (!el || !meta) return;
    const gold = meta.gold;
    const shop = opts.shop ? SHOPS[opts.shop] : null;
    const title = document.querySelector('#rpgShopView .char-title');
    if (title) title.textContent = shop ? shop.name : '⚒️ La Forja';
    const card = key => { const it = _shopItem(meta, key); return it ? _shopCard({ ...it, gold }) : ''; };
    const purse = `<div class="shop-purse">Tu oro: ${UI_IMG('moneda')} <b>${gold}</b></div>
        ${RPG_BALANCE.freeShop ? '<p class="shop-note shop-free">🧪 <b>Modo pruebas:</b> todo es gratis.</p>' : ''}`;

    if (shop) {
        const keys = _shopKeys(shop.sells);
        const sellable = [...keys.filter(k => !k.startsWith('upgrade:')), ..._shopKeys(shop.buys || [])];
        const tab = opts.tab === 'sell' && sellable.length ? 'sell' : 'buy';
        const sellCards = sellable.map(k => _shopSellCard(meta, k)).join('');
        el.innerHTML = `${purse}
            <p class="shop-note">${esc(shop.note || '')}</p>
            ${sellable.length ? `<div class="shop-tabs" role="tablist">
                <button type="button" class="shop-tab${tab === 'buy' ? ' is-on' : ''}" data-shop-tab="buy">Comprar</button>
                <button type="button" class="shop-tab${tab === 'sell' ? ' is-on' : ''}" data-shop-tab="sell">Vender</button>
            </div>` : ''}
            <div class="shop-grid">${tab === 'buy' ? keys.map(card).join('')
                : sellCards || '<p class="shop-note shop-empty">No llevas nada que esta tienda quiera comprar.</p>'}</div>`;
        return;
    }

    const section = (title2, cards) => cards ? `<h3 class="shop-section">${title2}</h3><div class="shop-grid">${cards}</div>` : '';
    const consumables = ['potion', 'mana_potion', ...Object.keys(ELIXIRS).filter(id => ELIXIRS[id].sold !== false).map(id => `elixir:${id}`),
        ...Object.keys(FOOD).map(id => `food:${id}`)].map(card).join('');
    const forge = Meta.UPGRADES.map(u => card(`upgrade:${u.id}`)).join('');
    el.innerHTML = `${purse}
        <p class="shop-note">Lo que compras aquí es <b>para siempre</b>: no se pierde al morir ni al empezar otra ruta.
        Las mejoras de La Forja se pueden comprar una y otra vez, cada vez más caras.</p>
        ${section(`${UI_IMG('pocion-vida')} Consumibles`, consumables)}
        ${section('⚒️ La Forja', forge)}`;
}

/**
 * La pantalla de Equipo: el héroe de cuerpo entero entre sus ocho ranuras (cuatro a cada lado), la ficha de la ranura
 * elegida y, debajo, todas sus estadísticas: nivel y experiencia, las de combate y los cuatro atributos (con un «+»
 * por cada uno mientras queden puntos de nivel por repartir).
 * opts: {
 *   name, look (el aspecto del héroe: src/hero-sprite.js), level, xp, xpNext, points, selected (ranura),
 *   slots: [{ slot, label, icon, item: null | { id, name, rarity, element, desc, stat, upgrades, effects, image } }],
 *   stats: [{ id, label, img, value, title }], primaries: [{ key, name, desc, value }],
 *   onSpend(key), onChange(slot)
 * }
 */
// El marco de la ranura según la rareza de lo que lleva (los demás, el de piedra)
const EQUIP_FRAME = { epica: 'marco-ranura-epica', legendaria: 'marco-ranura-luz' };
export function renderEquipPanel(opts) {
    const el = document.getElementById('panelBody');
    if (!el) return;
    let selected = opts.selected;
    let figureUrl = null;
    const slotHtml = sl => {
        const it = sl.item;
        const rar = it ? (RARITY_BY_ID[it.rarity] || RARITY_BY_ID.comun) : null;
        const frame = ICON((it && EQUIP_FRAME[it.rarity]) || 'marco-ranura');
        return `
            <button type="button" class="equip-slot${it ? ' has-item' : ' is-empty'}${sl.slot === selected ? ' is-selected' : ''}" data-equip-slot="${esc(sl.slot)}"
                ${it ? `data-rarity="${esc(it.rarity)}" style="--rarity:${esc(rar.color)}"` : ''} aria-label="${esc(sl.label)}: ${esc(it ? it.name : 'sin equipar')}">
                <span class="equip-slot-frame" style="background-image:url('${esc(frame)}')">
                    <img src="${esc(it && it.image ? it.image : ICON(sl.icon))}" alt="" draggable="false">
                    ${it && it.upgrades ? `<b class="equip-slot-plus">+${it.upgrades}</b>` : ''}
                </span>
                <span class="equip-slot-name">${esc(sl.label)}</span>
            </button>`;
    };
    const draw = () => {
        const sl = opts.slots.find(x => x.slot === selected) || opts.slots[0];
        const it = sl.item;
        const rar = it ? (RARITY_BY_ID[it.rarity] || RARITY_BY_ID.comun) : null;
        const detail = it ? `
            <div class="equip-detail-head">
                <b class="equip-detail-name" style="color:${esc(rar.color)}">${esc(it.name)}${it.upgrades ? ` +${it.upgrades}` : ''}</b>
                <span class="equip-detail-kind">${esc(sl.label)} · ${esc(rar.name)} · ${esc(it.element)}</span>
            </div>
            <p class="equip-detail-text"><b class="equip-num">${esc(it.stat)}</b>${it.upgrades ? ` (+${it.upgrades} de mejora)` : ''}${it.effects ? ` · ${esc(it.effects)}` : ''}</p>
            <p class="equip-detail-text is-desc">${esc(it.desc || '')}</p>
            <button type="button" class="btn-secondary equip-change" data-equip-change="${esc(sl.slot)}">Cambiar</button>`
            : `
            <div class="equip-detail-head">
                <b class="equip-detail-name">${esc(sl.label)}</b>
                <span class="equip-detail-kind">Sin equipar</span>
            </div>
            <p class="equip-detail-text is-desc">Todavía no has encontrado nada para esta ranura.</p>`;
        const pct = opts.xpNext > 0 ? Math.max(0, Math.min(100, opts.xp / opts.xpNext * 100)) : 0;
        el.innerHTML = `
        <div class="equip">
            <h3 class="panel-title">Equipo</h3>
            <div class="equip-stage">
                <div class="equip-col">${opts.slots.slice(0, 4).map(slotHtml).join('')}</div>
                <div class="equip-figure">
                    <img class="is-idle" alt="${esc(opts.name)}" draggable="false" data-equip-figure>
                </div>
                <div class="equip-col">${opts.slots.slice(4).map(slotHtml).join('')}</div>
            </div>
            <div class="equip-detail" data-equip-detail="${esc(sl.slot)}">${detail}</div>
            <div class="equip-sheet">
                <div class="equip-level">
                    <span class="equip-hero-name">${esc(opts.name)}</span>
                    <span class="equip-level-num">Nivel <b class="equip-num" data-equip-stat="level">${opts.level}</b></span>
                    <span class="equip-xp" role="img" aria-label="Experiencia: ${opts.xp} de ${opts.xpNext}"><span class="equip-xp-fill" style="width:${pct.toFixed(1)}%"></span>
                        <span class="equip-xp-text equip-num" data-equip-stat="xp">${opts.xp}/${opts.xpNext} XP</span></span>
                </div>
                <ul class="equip-stats">${opts.stats.map(st => `
                    <li title="${esc(st.title || '')}"><img src="${esc(ICON(st.img))}" alt="" draggable="false"><span>${esc(st.label)}</span><b class="equip-num" data-equip-stat="${esc(st.id)}">${esc(st.value)}</b></li>`).join('')}
                </ul>
                <div class="equip-points${opts.points > 0 ? ' has-points' : ''}">${opts.points > 0
                    ? `Tienes <b class="equip-num" data-equip-stat="points">${opts.points}</b> ${opts.points === 1 ? 'punto' : 'puntos'} de nivel por repartir`
                    : 'Atributos · al subir de nivel ganas puntos para repartir'}</div>
                <ul class="equip-primaries">${opts.primaries.map(p => `
                    <li title="${esc(p.desc)}"><span class="equip-primary-name">${esc(p.name)}</span><b class="equip-num" data-equip-primary="${esc(p.key)}">${p.value}</b>
                        <button type="button" class="equip-plus" data-equip-spend="${esc(p.key)}" aria-label="Subir ${esc(p.name)}"${opts.points > 0 ? '' : ' disabled'}>+</button>
                        <small>${esc(p.desc)}</small></li>`).join('')}
                </ul>
            </div>
        </div>`;
        // El héroe del centro: con la armadura y la espada que lleva (se monta aparte; al llegar, se pone)
        const fig = el.querySelector('[data-equip-figure]');
        if (figureUrl) fig.src = figureUrl;
        else prepareHero(opts.look).then(set => { figureUrl = set.frames[HERO_SPRITES.idle.anim][HERO_SPRITES.idle.frame]; fig.dataset.armor = set.armor; fig.dataset.weapon = opts.look.weaponId || ''; const now = el.querySelector('[data-equip-figure]'); if (now) { now.src = figureUrl; now.dataset.armor = set.armor; now.dataset.weapon = opts.look.weaponId || ''; } });
        if (figureUrl) { fig.dataset.armor = opts.look.armor; fig.dataset.weapon = opts.look.weaponId || ''; }
        el.querySelectorAll('[data-equip-slot]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.equipSlot; draw(); }));
        el.querySelectorAll('[data-equip-spend]').forEach(b => b.addEventListener('click', () => opts.onSpend && opts.onSpend(b.dataset.equipSpend)));
        const ch = el.querySelector('[data-equip-change]');
        if (ch) ch.addEventListener('click', () => opts.onChange && opts.onChange(ch.dataset.equipChange));
    };
    draw();
}

/**
 * «Mejorar» en la forja de Bram: tus espadas, cada una con su nivel, y un botón que gasta un cristal.
 * opts: { weapons: [{ id, name, atq, level, image, equipped, can }], crystals, max }
 */
export function renderUpgradePanel(opts) {
    const el = document.getElementById('panelBody');
    if (!el) return;
    const rows = opts.weapons.map(w => `
        <article class="shop-card ${w.can ? 'is-affordable' : 'is-maxed'}">
            <div class="shop-icon">${w.image ? `<img class="shop-icon-img is-piece" src="${esc(w.image)}" alt="">` : UI_IMG('ranura-arma')}</div>
            <div class="shop-info">
                <div class="shop-name">${esc(w.name)}${w.level ? ` +${w.level}` : ''} <span class="shop-level">${w.equipped ? 'equipada · ' : ''}ATK ${w.atq}</span></div>
                <div class="shop-desc">${w.level >= opts.max ? `Ya no admite más cristales (+${opts.max}).` : `Mejora ${w.level + 1} de ${opts.max}: +${WEAPON_UPGRADE.atq} de ATK para siempre.`}</div>
            </div>
            <button type="button" class="shop-buy" data-upgrade-weapon="${esc(w.id)}" ${w.can ? '' : 'disabled'}>${w.level >= opts.max ? 'AL MÁXIMO' : `${UI_IMG(WEAPON_UPGRADE.img)} 1 cristal`}</button>
        </article>`).join('');
    el.innerHTML = `
        <div class="upgrade-panel">
            <h3 class="panel-title">Mejorar una espada</h3>
            <p class="shop-purse">Cristales de mejora: ${UI_IMG(WEAPON_UPGRADE.img)} <b data-upgrade-crystals>${opts.crystals}</b></p>
            ${opts.crystals > 0 ? '' : '<p class="shop-note">No llevas cristales. Bram los vende: pídele «Comprar».</p>'}
            <div class="shop-grid">${rows}</div>
        </div>`;
    el.querySelectorAll('[data-upgrade-weapon]').forEach(b => b.addEventListener('click', () => opts.onUpgrade && opts.onUpgrade(b.dataset.upgradeWeapon)));
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

// Vida y maná con el arte de la interfaz (img/ui/barra-*.webp): la barra llena se recorta según lo que queda
function _rpgGauge(kind, now, max, label) {
    const pct = Math.max(0, Math.min(100, max > 0 ? (now / max) * 100 : 0));
    return `<div class="ui-gauge is-${kind} rpg-hud-${kind}" role="img" aria-label="${label} ${now} de ${max}" style="--pct:${pct.toFixed(1)}%">
        <span class="ui-gauge-fill"></span><span class="ui-gauge-text rpg-stat ${kind}">${now} / ${max}</span>
    </div>`;
}

function _rpgHpBar(f) {
    return _rpgGauge('hp', f.hp, f.maxHp, 'Vida') + (f.maxMp ? _rpgGauge('mp', f.mp, f.maxMp, 'Maná') : '')
        + (f.maxEnergy ? _rpgGauge('en', f.energy || 0, f.maxEnergy, 'Energía') : '');
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

/** Botón de acción con una imagen (las pociones): sin palabra, el nombre va en el tooltip y para lectores de pantalla. */
function _rpgImageButton(attrs, img, label, hint, disabled, extra = '') {
    return `<button type="button" class="rpg-action is-image" ${attrs} ${disabled ? 'disabled' : ''} title="${esc(`${label}: ${hint}`)}" aria-label="${esc(label)}">
        <img class="rpg-action-img" src="${esc(img)}" alt="" draggable="false">
        <span class="rpg-action-hint">${esc(hint)}</span>${extra}
    </button>`;
}

function _rpgActionButton(attrs, icon, label, hint, disabled, extra = '') {
    return `<button type="button" class="rpg-action" ${attrs} ${disabled ? 'disabled' : ''} title="${esc(hint)}">
        <span class="rpg-action-icon" aria-hidden="true">${icon}</span>
        <span class="rpg-action-label">${esc(label)}</span>
        <span class="rpg-action-hint">${esc(hint)}</span>${extra}
    </button>`;
}

const RPG_ACTION_NAMES = { attack: 'ATACAR', defend: 'DEFENDER', skill: 'HABILIDAD', potion: 'POCIÓN', mana_potion: 'POCIÓN DE MANÁ' };
const ICON = id => (ART.icons && ART.icons[id] && ART.icons[id].src) || '';
/** Un icono de img/ui como <img> (para meterlo donde antes iba un emoticono). */
const UI_IMG = (id, cls = 'ui-icon') => `<img class="${cls}" src="${esc(ICON(id))}" alt="" draggable="false">`;

// Estado del enemigo: si lee tus movimientos, la acción que ha memorizado (repetirla = golpe doble).
// Sus efectos (veneno, quemadura…) se ven como iconos sobre su dibujo
/** Los efectos que lleva, en la carta junto a su vida: icono, nombre y rondas que le quedan (claro, sin pasar el ratón). */
function _rpgEffectChips(unit) {
    return effectList(unit).map(e => `<span class="rpg-fx-chip${e.bad ? ' is-bad' : ''}" data-effect="${esc(e.id)}" style="--fx:${e.color}" title="${esc(e.desc)}">
        <img src="${esc(ICON(e.icon))}" alt="" draggable="false">${esc(e.name)}${e.turns == null ? '' : ` <b>${e.turns}</b>`}</span>`).join('');
}

function _rpgMonsterStatus(combat) {
    const m = combat.monster;
    const parts = [];
    if (m.ai === 'reader') {
        const last = RPG_ACTION_NAMES[combat.lastAction];
        parts.push(last ? `👁️ Recuerda ${last}: repítela y golpea doble` : '👁️ Lee tus movimientos');
    }
    return [esc(parts.join(' · ')), _rpgEffectChips(m)].filter(Boolean).join(' ');
}

// Tu estado: defensa y tus efectos (también como iconos sobre tu dibujo)
function _rpgHeroStatus(combat) {
    return [combat.defending ? '🛡️ Defendiendo' : '', _rpgEffectChips(combat.hero)].filter(Boolean).join(' ');
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
    if (combat.over) { bar.innerHTML = ''; const sb = document.getElementById('rpgSkillBar'); if (sb) sb.innerHTML = ''; return; }

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
    const manaPotions = combat.manaPotions | 0;
    const manaGain = Math.max(1, Math.round((hero.maxMp || 0) * RPG_BALANCE.manaPotion.restore));
    const manaHint = manaPotions <= 0 ? 'No te quedan (se compran en la tienda)'
        : (hero.mp || 0) >= (hero.maxMp || 0) ? 'Ya tienes el maná al máximo'
        : `Recupero hasta ${manaGain} de maná, pero gasto el turno`;

    // Barra de habilidades: una ranura por habilidad (su icono y su coste en maná; el nombre y qué hace, al pasar
    // el ratón) y el resto cerradas. Pulsar una la lanza directamente
    const skillBar = document.getElementById('rpgSkillBar');
    if (skillBar) {
        const ids = Object.keys(Engine.RPG_SKILLS);
        const stunned = !!(hero.effects && hero.effects.aturdido);
        skillBar.innerHTML = Array.from({ length: Math.max(RPG_BALANCE.skillSlots, ids.length) }, (_, i) => {
            if (!ids[i]) return '<span class="rpg-skill is-locked" title="Ranura cerrada: aún no tienes esta habilidad"></span>';
            const s = Engine.rpgSkillInfo(hero, ids[i], combat);
            const ready = Engine.rpgSkillReady(combat, s.id) && !stunned;
            // Se paga con maná (azul) o con energía (amarillo)
            const cost = s.energyCost ? { n: s.energyCost, what: 'energía', have: hero.energy || 0, cls: 'is-energy' }
                : { n: s.manaCost, what: 'maná', have: hero.mp || 0, cls: 'is-mana' };
            const hint = noSkills ? 'Tu voto de silencio lo impide'
                : stunned ? 'Estás aturdido'
                : Engine.rpgSkillReady(combat, s.id) ? `${s.desc} Cuesta ${cost.n} de ${cost.what}.` : `Te falta ${cost.what}: cuesta ${cost.n} y tienes ${cost.have}`;
            return `<button type="button" class="rpg-skill" data-rpg-action="skill" data-rpg-skill="${esc(s.id)}" ${ready ? '' : 'disabled'}
                title="${esc(`${s.name}: ${hint}`)}" aria-label="${esc(s.name)}">
                <img src="${esc(ICON(s.img))}" alt="" draggable="false">
                <span class="rpg-action-badge ${cost.cls}">${cost.n}</span>
            </button>`;
        }).join('');
    }

    // Elixires: solo los que llevas encima, con su imagen (como las pociones)
    const elixirs = Object.entries(ELIXIRS).filter(([id]) => (combat.elixirs || {})[id] > 0).map(([id, ex]) => {
        const e = EFFECTS[ex.effect.id];
        const hint = `${ex.target === 'enemy' ? 'Lo lanzo al enemigo: ' : ''}${e.desc(ex.effect)} durante ${ex.effect.turns} rondas, pero gasto el turno`;
        return _rpgImageButton(`data-rpg-action="elixir" data-rpg-skill="${esc(id)}"`, ICON(ex.img), ex.name, hint, false,
            `<span class="rpg-action-badge is-count">${combat.elixirs[id]}</span>`);
    }).join('');

    // Aturdido: este turno no puedes hacer nada; el botón grande lo dice y pasa el turno
    // Aturdido: la barra de siempre, apagada; el turno se pierde solo (lo resuelve quien controla el combate)
    const stunned = !!(hero.effects && hero.effects.aturdido);

    bar.innerHTML = `
        <div class="rpg-actions-side">
            ${_rpgActionButton('data-rpg-action="defend"', UI_IMG('defensa'), 'Defender', defendHint, false)}
        </div>
        ${_rpgActionButton('data-rpg-action="attack" data-main', UI_IMG('ranura-arma'), '¡Atacar!', attackHint, false)}
        <div class="rpg-actions-side">
            ${_rpgImageButton('data-rpg-action="potion"', ICON('pocion-vida'), 'Poción de vida', potionHint, potions <= 0 || hero.hp >= hero.maxHp, `<span class="rpg-action-badge is-count">${potions}</span>`)}
            ${_rpgImageButton('data-rpg-action="mana_potion"', ICON('pocion-mana'), 'Poción de maná menor', manaHint, manaPotions <= 0 || (hero.mp || 0) >= (hero.maxMp || 0), `<span class="rpg-action-badge is-count">${manaPotions}</span>`)}
            ${elixirs}
            ${_rpgActionButton('data-rpg-action="flee"', UI_IMG('agilidad'), 'Huir', fleeHint, !canFlee)}
        </div>`;
    bar.classList.toggle('is-stunned', stunned);
    if (stunned) bar.querySelectorAll('button').forEach(b => { b.disabled = true; });
    _rpgApplyAttackCooldown(bar);
}

// ⏳ ¡Atacar! espera un poco antes de poder pulsarse otra vez (el combate no se juega a golpe de ratón).
// En las pruebas automáticas no se espera (navigator.webdriver), salvo que se pida con window.__forceAttackCooldown.
export const RPG_ATTACK_COOLDOWN_MS = 2000;
let _rpgAttackReadyAt = 0;
let _rpgCooldownTimer = 0;
export function startAttackCooldown(ms = RPG_ATTACK_COOLDOWN_MS) {
    if (navigator.webdriver && !window.__forceAttackCooldown) return;
    _rpgAttackReadyAt = Date.now() + ms;
}
function _rpgApplyAttackCooldown(bar) {
    const btn = bar.querySelector('[data-rpg-action="attack"]');
    const left = _rpgAttackReadyAt - Date.now();
    if (!btn || left <= 0 || btn.disabled) return;
    btn.disabled = true;
    btn.classList.add('is-cooling');
    btn.style.setProperty('--cd', `${left}ms`);
    clearTimeout(_rpgCooldownTimer);
    _rpgCooldownTimer = setTimeout(() => {
        if (!btn.isConnected) return;
        btn.classList.remove('is-cooling');
        if (!bar.classList.contains('is-stunned')) btn.disabled = false;
    }, left);
}

// --- 🎭 Escenario: héroe a la izquierda mirando a la derecha, enemigo a la derecha mirando a la izquierda ---
// Cada criatura usa su imagen del taller de sprites (src/data/art.js) si la tiene; si no, el goblin de siempre
// (teñido por especie/linaje). Lo mismo el héroe: su heroe_* si existe, si no hero_right.png.
const RPG_MONSTER_SPRITE = { src: 'img/sprites/goblin_left.png', w: 175, h: 217 };
const RPG_HERO_SPRITE = { src: 'img/sprites/hero_right.png', w: 195, h: 244 };
const RPG_LUNGE_MS = 880;        // ida y vuelta de la embestida (pausada: se ve venir el golpe)
const RPG_LUNGE_IMPACT = 0.55;   // punto de la embestida en que llega el golpe (y sale el número)
const RPG_FX_GAP_MS = 220;       // pausa entre un golpe y el siguiente
const RPG_HIT_FLASH_MS = 200;    // parpadeo blanco al recibir un golpe
const RPG_HIT_SHAKE_MS = 260;    // y su temblor

// Las medidas de la imagen del héroe por capas, para el CSS: cuánto más alta es que el héroe (--hero-zoom) y dónde
// quedan sus pies (--hero-fx, --hero-fy). Con ellas se le cuelga de los pies y se le ve a su tamaño en cualquier sitio.
if (typeof document !== 'undefined') {
    const rs = document.documentElement.style;
    rs.setProperty('--hero-zoom', HERO_FRAME.zoom.toFixed(4));
    rs.setProperty('--hero-fx', HERO_FRAME.fx.toFixed(4));
    rs.setProperty('--hero-fy', HERO_FRAME.fy.toFixed(4));
}
let _rpgHeroAnim = null, _rpgHeroLook = null;   // el héroe por capas del combate de la aventura (src/hero-sprite.js)

function _rpgRenderStage(hero, monster) {
    const heroActor = document.getElementById('rpgActorHero');
    const monActor = document.getElementById('rpgActorMonster');
    if (!heroActor || !monActor) return;
    heroActor.classList.toggle('is-down', hero.hp <= 0);
    monActor.classList.toggle('is-down', monster.hp <= 0);
    _rpgRenderEffects(heroActor, hero);
    _rpgRenderEffects(monActor, monster);
    const img = monActor.querySelector(':scope > img');   // el dibujo, no los iconos de efecto (que también son img)
    const own = monsterArt(ART, monster.baseName || monster.name);
    const sprite = own || RPG_MONSTER_SPRITE;
    // En la aventura, el héroe por capas (hero.look: su armadura y su espada); en el descenso, el dibujo de siempre
    const heroImg = heroActor.querySelector(':scope > img');
    const heroSprite = heroArt(ART) || RPG_HERO_SPRITE;
    heroActor.classList.toggle('is-layered', !!hero.look);
    if (hero.look) {
        if (!_rpgHeroAnim || _rpgHeroAnim.img !== heroImg) _rpgHeroAnim = new HeroAnimator(heroImg);
        const key = `${hero.look.armor}|${hero.look.weaponId}`;
        if (_rpgHeroLook !== key) { _rpgHeroLook = key; _rpgHeroAnim.setLook(hero.look); }
    } else {
        if (_rpgHeroAnim) { _rpgHeroAnim._stop(); _rpgHeroAnim = null; _rpgHeroLook = null; heroImg.classList.remove('is-idle'); ['armor', 'weapon', 'anim', 'frame'].forEach(k => delete heroImg.dataset[k]); }
        _rpgSetSprite(heroImg, heroSprite);
    }
    _rpgSetSprite(img, sprite);
    // Misma escala de píxel para los dos: la altura del enemigo es relativa a la del héroe (y crece si es jefe)
    const size = (RPG_MONSTER_SIZE[monster.type] || 1) * (monster.scale || 1);   // jefes más grandes; cada especie, su tamaño
    monActor.style.setProperty('--ratio', (size * sprite.h / heroSprite.h).toFixed(3));
    if (img) {
        img.alt = monster.name;
        // Con imagen propia, sin tinte: el arte ya trae su color
        img.style.filter = own ? 'none' : rpgMonsterTint(monster);
    }
}

/** Los efectos que lleva encima, en fila sobre su cabeza: icono y rondas que le quedan (∞ = todo el combate). */
function _rpgRenderEffects(actor, unit) {
    let row = actor.querySelector('.rpg-effects');
    if (!row) {
        row = document.createElement('div');
        row.className = 'rpg-effects';
        actor.prepend(row);
    }
    row.innerHTML = effectList(unit).map(e => `
        <span class="rpg-effect${e.bad ? ' is-bad' : ' is-good'}" data-effect="${esc(e.id)}" style="--fx:${e.color}"
            title="${esc(`${e.name}: ${e.desc}${e.turns == null ? ' (todo el combate)' : ` (${e.turns} ${e.turns === 1 ? 'ronda' : 'rondas'})`}`)}">
            <img src="${esc(ICON(e.icon))}" alt="${esc(e.name)}" draggable="false">
            ${e.turns == null ? '' : `<span class="rpg-effect-turns">${e.turns}</span>`}
        </span>`).join('');
}

function _rpgSetSprite(img, sprite) {
    if (!img || img.getAttribute('src') === sprite.src) return;
    img.src = sprite.src;
    img.width = sprite.w;
    img.height = sprite.h;
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
    if (ev.kind === 'stunned') return null;   // el turno perdido no se anuncia en pantalla: lo dice su icono (y el diario)
    if (ev.kind === 'effect-on') {
        const e = EFFECTS[ev.effect];
        if (!e) return null;
        // El aturdimiento no se anuncia con texto: solo su icono, que aparece sobre el personaje en el impacto
        if (e.skip) return { to: ev.target, text: '', cls: 'is-effect-on', effect: ev.effect };
        return { to: ev.target, text: e.name, cls: 'is-effect-on', icon: ICON(e.icon), color: e.color, effect: ev.effect };
    }
    if (ev.kind === 'effect' && ev.amount > 0) {
        const e = EFFECTS[ev.effect];
        return { to: ev.target, text: `${ev.heal ? '+' : '-'}${ev.amount}`, cls: `is-effect${ev.heal ? ' is-heal' : ''}`, icon: e && ICON(e.icon), color: e && e.color };
    }
    if (!(ev.amount > 0)) return null;
    if (ev.kind === 'heal') return { to: ev.target, text: `+${ev.amount}`, cls: 'is-heal' };
    const lunge = ['attack', 'crit', 'skill'].includes(ev.kind) && ev.actor !== ev.target;
    return { from: lunge ? (ev.target === 'hero' ? 'monster' : 'hero') : null, to: ev.target, kind: ev.kind,
        text: `-${ev.amount}${ev.kind === 'crit' ? '!' : ''}`,
        cls: `${ev.target === 'hero' ? 'is-taken' : 'is-dealt'}${ev.kind === 'crit' ? ' is-crit' : ''}` };
}

function _rpgStageFloat(stage, actor, text, cls, icon = null, color = null) {
    const s = stage.getBoundingClientRect();
    const a = actor.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `rpg-stage-float ${cls}`;
    el.textContent = text;
    el.style.marginLeft = `${Math.round((Math.random() * 2 - 1) * 18)}px`;
    if (color) el.style.color = color;
    if (icon) {
        const img = document.createElement('img');
        img.className = 'rpg-stage-float-icon';
        img.src = icon;
        img.alt = '';
        if (cls.includes('is-effect-on')) el.prepend(img); else el.appendChild(img);   // al ponerse: icono y luego su nombre
    }
    el.style.left = `${a.left - s.left + a.width / 2}px`;
    // Los números nacen a la altura del pecho y suben hacia la cabeza: no se salen del escenario ni tapan los iconos
    const top = a.top + a.height * 0.32;
    el.style.top = `${top - s.top}px`;
    stage.appendChild(el);
    // Tope: al subir (hasta 1,5 veces su alto) nunca se sale por arriba del escenario, ni en el móvil
    const minTop = el.offsetHeight * 1.6 + 8;
    if (top - s.top < minTop) el.style.top = `${minTop}px`;
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

    // Lo que pone un golpe (su icono sobre el personaje y su etiqueta junto a la vida) no se ve hasta el impacto: se
    // esconde ahora (en el mismo instante en que se dibujó, sin llegar a verse) y se revela con el destello del golpe
    const huds = { hero: document.getElementById('rpgCombatHero'), monster: document.getElementById('rpgCombatMonster') };
    const fxEls = (to, id) => [actors[to], huds[to]].filter(Boolean)
        .flatMap(root => [...root.querySelectorAll(`.rpg-effect[data-effect="${id}"], .rpg-fx-chip[data-effect="${id}"]`)]);
    const reveal = (to, id) => fxEls(to, id).forEach(el => { el.classList.remove('is-pending'); el.classList.add('is-pop'); });
    (events || []).filter(ev => ev.kind === 'effect-on').forEach(ev => fxEls(ev.target, ev.effect).forEach(el => el.classList.add('is-pending')));

    let t = 0;
    const lastImpact = {};   // cuándo llega el último golpe a cada uno (ahí se ponen los efectos que trae)
    (events || []).forEach(ev => {
        const step = _rpgFxStep(ev);
        if (!step || !actors[step.to]) return;
        const lunge = step.from && !still;
        // Un efecto que trae un golpe sale EN el impacto de ese golpe, no después
        const withHit = step.cls === 'is-effect-on' && lastImpact[step.to] != null;
        const at = withHit ? lastImpact[step.to] : t;
        if (!withHit && !/is-effect-on/.test(step.cls)) lastImpact[step.to] = t + (lunge ? RPG_LUNGE_MS * RPG_LUNGE_IMPACT : 0);
        setTimeout(() => {
            if (run !== _rpgFxRun) return;
            const target = actors[step.to];
            const hit = () => {
                if (run !== _rpgFxRun) return;
                if (step.effect) reveal(step.to, step.effect);
                if (step.text || step.icon) _rpgStageFloat(stage, target, step.text, step.cls, step.icon, step.color);
                // Parpadeo y temblor solo si es daño (ni curas, ni fallos, ni el aviso de un efecto nuevo)
                if (!/is-(miss|heal|effect-on)/.test(step.cls) && !step.text.startsWith('+') && !still) {
                    _rpgHitFeedback(target);
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
            // El héroe por capas hace su gesto (alza y baja la espada, o lanza la habilidad), con el golpe en el impacto
            if (step.from === 'hero' && _rpgHeroAnim && _rpgHeroAnim.set) {
                const anim = step.kind === 'skill' ? 'cast' : 'attack';
                const lead = RPG_LUNGE_MS * RPG_LUNGE_IMPACT - HeroAnimator.timing(anim).impact;
                setTimeout(() => { if (run === _rpgFxRun && _rpgHeroAnim) _rpgHeroAnim.play(anim); }, Math.max(0, lead));
            }
            attacker.classList.add('is-attacking');
            setTimeout(hit, RPG_LUNGE_MS * RPG_LUNGE_IMPACT);
            setTimeout(() => attacker.classList.remove('is-attacking'), RPG_LUNGE_MS);
        }, at);
        if (!withHit) t += (lunge ? RPG_LUNGE_MS : 260) + RPG_FX_GAP_MS;
    });
    // Por si se corta la secuencia: al final, nada se queda escondido
    setTimeout(() => { if (run === _rpgFxRun) document.querySelectorAll('.is-pending').forEach(el => el.classList.remove('is-pending')); }, t + 50);
    return t;   // cuánto dura la secuencia (para esperar a que acabe antes de lo siguiente)
}

/** Recibir un golpe: un parpadeo blanco rápido (dos destellos) y, justo después, un temblor corto. */
function _rpgHitFeedback(target) {
    // El destello, solo en el dibujo (no en sus iconos de efecto); el temblor, en todo el personaje
    const sprite = target.querySelector(':scope > img') || target;
    sprite.animate([
        { filter: 'none' },
        { filter: 'brightness(3.4) saturate(0)', offset: 0.2 },
        { filter: 'none', offset: 0.45 },
        { filter: 'brightness(3.4) saturate(0)', offset: 0.65 },
        { filter: 'none' }
    ], { duration: RPG_HIT_FLASH_MS, easing: 'linear' });
    target.animate([
        { transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(6px)' },
        { transform: 'translateX(-4px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }
    ], { duration: RPG_HIT_SHAKE_MS, delay: RPG_HIT_FLASH_MS * 0.7, easing: 'ease-out', composite: 'add' });
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

// Lo que soltó el enemigo: su icono en un marco del color de su rareza y su nombre
function _rpgLootLine(loot) {
    const rar = RARITY_BY_ID[loot.rarity] || RARITY_BY_ID.comun;
    return `<div class="rpg-result-loot${loot.taken ? '' : ' is-left'}" data-rarity="${esc(rar.id)}" style="--rarity:${esc(rar.color)}">
        <span class="rpg-drop-icon"><img src="${esc(ICON(loot.img))}" alt="" draggable="false"></span>
        <span class="rpg-drop-text"><small>${loot.taken ? 'Has conseguido' : loot.spare ? `No te cabe: la cambias por ${loot.spare} 🪙` : 'No te cabe: llevas el máximo'}</small>
            <b>${esc(loot.name)}</b><i>${esc(rar.name)}</i></span>
    </div>`;
}

/** Final del combate: un cartel sobre el escenario (el vencido ya se desvanece). info: { result, title, detail, button } */
const RESULT_IMG = { victory: 'victoria', defeat: 'derrota', fled: 'agilidad' };
export function showRpgCombatResult(info) {
    const el = document.getElementById('rpgCombatResult');
    if (!el || !info) return;
    el.className = `rpg-combat-result is-${esc(info.result)}`;
    el.innerHTML = `
        <div class="rpg-result-plate">
            ${RESULT_IMG[info.result] ? UI_IMG(RESULT_IMG[info.result], 'rpg-result-img') : ''}
            <div class="rpg-result-title">${esc(info.title)}</div>
            <div class="rpg-result-detail">${esc(info.detail || '')}</div>
            ${info.loot ? _rpgLootLine(info.loot) : ''}
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
            <span class="rpg-stat atk"><b>ATK</b> ${hero.atq}</span> <span class="rpg-stat ph"><b>PH</b> ${Engine.rpgHeroPh(hero)}</span>
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
                <span class="rpg-stat atk"><b>ATK</b> ${hero.atq}</span> <span class="rpg-stat ph"><b>PH</b> ${Engine.rpgHeroPh(hero)}</span>
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
        ? `<div class="rpg-end-achievements"><b>${UI_IMG('menu-logros')} Logros desbloqueados:</b>
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

/**
 * 🎒 Inventario de la aventura, como en DragonFable: la lista a la izquierda (cada fila con el icono de su tipo sobre el
 * color de su elemento y el nombre en el color de su rareza) y la ficha a la derecha, con dos pestañas: «Detalle» (la
 * pieza tal cual es) y «Vista previa» (tu héroe con ella).
 * opts: {
 *   gear: [{ id, name, slot, slotName, rarity, element, stat, upgrades, desc, from, effects, image, look, equipped }],
 *         (look: el aspecto del héroe con esa pieza puesta, para la vista previa)
 *   items: [{ id, name, img, count, desc, use?, rarity?, type? }]   (consumibles; `use` = texto del botón si se puede usar aquí)
 *   selected, gold, onEquip(id), onUse(id)
 * }
 */
// Rareza en tinta sobre pergamino (los colores de rarities.js son para fondo oscuro)
const INV_RARITY_INK = { comun: '#57504a', poco_comun: '#1f7a35', rara: '#1f55b8', epica: '#7a2fb8', legendaria: '#a17800' };

function _invChip(slot, element) {
    const el = ELEMENTS[element] || ELEMENTS.neutro;
    return `<span class="inv-chip" style="--el:${esc(el.color)}" title="${esc(el.name)}">
        <img src="${esc(ICON(SLOT_ICONS[slot] || 'ranura-arma'))}" alt="" draggable="false">
        ${el.icon ? `<img class="inv-chip-el" src="${esc(ICON(el.icon))}" alt="" draggable="false">` : ''}
    </span>`;
}

export function renderInventoryPanel(opts) {
    const el = document.getElementById('panelBody');
    if (!el) return;
    let selected = opts.selected;
    let tab = 'detail';
    const all = [...opts.gear.map(g => ({ ...g, kind: 'gear' })), ...opts.items.map(i => ({ ...i, kind: 'item' }))];
    const draw = () => {
        const it = all.find(i => i.id === selected) || all[0];
        const row = (i, n) => `
            <li><button type="button" class="inv-row${i.id === it.id ? ' is-selected' : ''}${i.equipped ? ' is-equipped' : ''}" data-inv-item="${esc(i.id)}">
                <span class="inv-num">${i.equipped ? '<span class="inv-check" title="Equipada">✔</span>' : n}</span>
                ${i.kind === 'gear' ? _invChip(i.slot, i.element) : `<span class="inv-chip is-item"><img src="${esc(ICON(i.img))}" alt="" draggable="false"></span>`}
                <span class="inv-name"${i.rarity ? ` style="color:${INV_RARITY_INK[i.rarity] || INV_RARITY_INK.comun}"` : ''}>${esc(i.name)}${i.upgrades ? ` +${i.upgrades}` : ''}</span>
                <span class="inv-val">${i.kind === 'gear' ? esc(i.stat) : `×${i.count}`}</span>
            </button></li>`;
        const gearRows = opts.gear.map((g, n) => row({ ...g, kind: 'gear' }, n + 1)).join('');
        const itemRows = opts.items.map((i, n) => row({ ...i, kind: 'item' }, n + 1)).join('');

        let detail;
        if (it.kind === 'gear') {
            const rar = RARITY_BY_ID[it.rarity] || RARITY_BY_ID.comun;
            const elem = ELEMENTS[it.element] || ELEMENTS.neutro;
            const picture = tab === 'preview' ? { src: '' } : (it.image || null);
            const armor = it.slot === 'armor';
            detail = `
                <h4 class="inv-item-name" style="color:${INV_RARITY_INK[it.rarity] || INV_RARITY_INK.comun}">${esc(it.name)}${it.upgrades ? ` +${it.upgrades}` : ''}</h4>
                <p class="inv-item-kind">${esc(it.slotName || 'Arma')} · ${esc(rar.name)} · ${esc(elem.name)}</p>
                <div class="inv-frame" data-rarity="${esc(it.rarity)}">
                ${picture ? `<img class="inv-preview${tab === 'detail' ? ` is-piece${armor ? ' is-armor' : ''}` : ' is-hero'}"${tab === 'preview' ? ' data-inv-look' : ` src="${esc(picture.src)}"`} alt="${esc(tab === 'preview' ? `Tu héroe con ${it.name}` : it.name)}" draggable="false">`
                    : `<div class="inv-preview is-empty">${_invChip(it.slot, it.element)}</div>`}
                </div>
                <p class="inv-item-desc">${esc(it.desc)}</p>
                <dl class="inv-stats"><dt>${armor ? 'Protección' : 'Ataque'}</dt><dd>${esc(it.stat)}${it.upgrades ? ` (+${it.upgrades} de mejora)` : ''}</dd>
                    ${it.effects ? `<dt>Efecto</dt><dd>${esc(it.effects)}</dd>` : ''}<dt>Origen</dt><dd>${esc(it.from || '')}</dd></dl>
                <button type="button" class="btn-forge inv-equip" data-inv-equip="${esc(it.id)}"${it.equipped ? ' disabled' : ''}>${it.equipped ? '✔ Equipada' : 'Equipar'}</button>`;
        } else {
            detail = `
                <h4 class="inv-item-name"${it.rarity ? ` style="color:${INV_RARITY_INK[it.rarity] || INV_RARITY_INK.comun}"` : ''}>${esc(it.name)}</h4>
                <p class="inv-item-kind">${esc(it.type || 'Objeto')}${it.rarity ? ` · ${esc((RARITY_BY_ID[it.rarity] || RARITY_BY_ID.comun).name)}` : ''} · llevas ${it.count}</p>
                <div class="inv-frame"${it.rarity ? ` data-rarity="${esc(it.rarity)}"` : ''}><img class="inv-preview is-item" src="${esc(ICON(it.img))}" alt="${esc(it.name)}" draggable="false"></div>
                <p class="inv-item-desc">${esc(it.desc)}</p>
                ${it.use ? `<button type="button" class="btn-forge inv-equip" data-inv-use="${esc(it.id)}"${it.count > 0 ? '' : ' disabled'}>${esc(it.use)}</button>` : ''}`;
        }
        el.innerHTML = `<div class="inv">
            <section class="inv-page inv-list" aria-label="Inventario">
                <h3 class="inv-title">Inventario</h3>
                <h4 class="inv-group">Equipo</h4>
                <ol class="inv-rows">${gearRows}</ol>
                ${itemRows ? `<h4 class="inv-group">Objetos</h4><ol class="inv-rows">${itemRows}</ol>` : ''}
                <p class="inv-gold">${UI_IMG('moneda')} ${opts.gold} de oro</p>
            </section>
            <section class="inv-page inv-detail" aria-label="Detalle del objeto">
                <div class="inv-tabs" role="tablist">
                    <button type="button" class="inv-tab${tab === 'detail' ? ' is-on' : ''}" data-inv-tab="detail">Detalle</button>
                    ${it.kind === 'gear' ? `<button type="button" class="inv-tab${tab === 'preview' ? ' is-on' : ''}" data-inv-tab="preview">Vista previa</button>` : ''}
                </div>
                ${detail}
            </section>
        </div>`;
        // Vista previa: el héroe con esa pieza puesta (se monta aparte y se pone al llegar)
        const lookImg = el.querySelector('[data-inv-look]');
        if (lookImg && it.look) prepareHero(it.look).then(set => { lookImg.src = set.frames[HERO_SPRITES.idle.anim][HERO_SPRITES.idle.frame]; lookImg.dataset.armor = set.armor; lookImg.dataset.weapon = it.look.weaponId || ''; });
        el.querySelectorAll('[data-inv-item]').forEach(b => b.addEventListener('click', () => { selected = b.dataset.invItem; draw(); }));
        el.querySelectorAll('[data-inv-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.invTab; draw(); }));
        const eq = el.querySelector('[data-inv-equip]');
        if (eq && !it.equipped) eq.addEventListener('click', () => opts.onEquip(it.id));
        const use = el.querySelector('[data-inv-use]');
        if (use && opts.onUse) use.addEventListener('click', () => opts.onUse(it.id));
    };
    draw();
}

/**
 * 📜 Diario de misiones: la principal arriba, las secundarias debajo. Las cumplidas, tachadas (como en Skyrim).
 * log: [{ quest, status: 'active' | 'done', steps: [{ text, done, progress }] }]
 */
export function renderQuestPanel(log) {
    const el = document.getElementById('panelBody');
    if (!el) return;
    const quest = ({ quest: q, status, steps }) => {
        const current = steps.find(s => !s.done);
        const lines = steps.filter(s => s.done || s === current).map(s => `
            <li class="quest-step${s.done ? ' is-done' : ''}">${esc(s.text)}${s.progress ? ` <span class="quest-progress">${s.progress.have}/${s.progress.need}</span>` : ''}</li>`).join('');
        return `<article class="quest is-${status}">
            <h4 class="quest-title">${esc(q.title)}</h4>
            <p class="quest-desc">${esc(q.desc)}</p>
            <ul class="quest-steps">${lines}</ul>
        </article>`;
    };
    const main = log.filter(x => x.quest.kind === 'main');
    const side = log.filter(x => x.quest.kind !== 'main').sort((a, b) => (a.status === 'done') - (b.status === 'done'));
    el.innerHTML = _panelHeader(UI_IMG('mapa'), 'Misiones', '')
        + `<div class="panel-section"><h4 class="panel-section-title">Misión principal</h4>${main.map(quest).join('') || '<p class="panel-field-hint">Ninguna por ahora.</p>'}</div>`
        + `<div class="panel-section"><h4 class="panel-section-title">Misiones secundarias</h4>${side.map(quest).join('') || '<p class="panel-field-hint">Habla con la gente de Zafias: los que tienen un encargo salen en azul en el mapa.</p>'}</div>`;
}

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
    el.innerHTML = _panelHeader(UI_IMG('menu-bestiario'), 'Bestiario',
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
    el.innerHTML = _panelHeader(UI_IMG('menu-coleccion'), 'Colección', 'Objetos vistos en cofres, hogueras y botín de sub-jefe. Los puntos son las rarezas en las que ya lo has visto.')
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
    el.innerHTML = _panelHeader(UI_IMG('menu-logros'), 'Logros', 'Solo información y orgullo: ningún logro te hace más fuerte.')
        + _progressBar(doneCount, Meta.ACHIEVEMENTS.length, 'logros')
        + `<div class="panel-list">${rows}</div>`;
}

/** La advertencia antes de borrar: qué se pierde, y dos salidas claras. */
function _renderWipeConfirm(handlers) {
    const el = document.getElementById('panelBody');
    if (!el) return;
    el.innerHTML = `<div class="wipe-confirm" role="alertdialog" aria-labelledby="wipeTitle" aria-describedby="wipeText">
            <div class="wipe-confirm-icon" aria-hidden="true">⚠️</div>
            <h3 class="wipe-confirm-title" id="wipeTitle">¿Borrar todo tu progreso?</h3>
            <p class="wipe-confirm-text" id="wipeText">Se pierden tu héroe y su nombre, el nivel, el oro, las pociones, La Forja, la aventura en Zafias,
                la ruta de la mazmorra, el bestiario, la colección y los logros. <b>No se puede deshacer.</b></p>
            <p class="wipe-confirm-text">Si quieres guardarlo, usa antes «Exportar tu progreso».</p>
            <div class="wipe-confirm-actions">
                <button type="button" id="btnWipeCancel" class="btn-secondary">Cancelar</button>
                <button type="button" id="btnWipeConfirm" class="btn-danger">BORRAR</button>
            </div>
        </div>`;
    document.getElementById('btnWipeCancel').addEventListener('click', () => renderOptionsPanel(handlers));
    document.getElementById('btnWipeConfirm').addEventListener('click', () => handlers.onWipe());
    document.getElementById('btnWipeCancel').focus();
}

/**
 * ⚙️ Opciones: semilla de la partida en curso, importar/exportar el progreso y quiénes somos.
 * handlers: { onExport, onImport(text) → {ok, error?}, seedCode }
 */
export function renderOptionsPanel(handlers = {}) {
    const el = document.getElementById('panelBody');
    if (!el) return;
    el.innerHTML = _panelHeader(UI_IMG('menu-opciones'), 'Opciones', '')
        + `<div class="panel-section">
            <h4 class="panel-section-title">Semilla de la ruta actual</h4>
            ${handlers.seedCode
                ? `<div class="panel-field-hint">Compártela para que alguien recorra el mismo mapa: <code>${esc(handlers.seedCode)}</code></div>`
                : `<div class="panel-field-hint">No hay ninguna ruta en marcha. La semilla se elige al pulsar «Entrar en la mazmorra».</div>`}
        </div>
        <div class="panel-section">
            <h4 class="panel-section-title">La introducción</h4>
            <p class="panel-field-hint" style="margin-bottom:8px;">El despertar en las ruinas, otra vez. Puedes cambiar el nombre de tu héroe.</p>
            <div class="panel-actions-row"><button type="button" id="btnPanelIntro" class="btn-secondary">🌅 Ver la introducción</button></div>
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
        <div class="panel-section panel-danger">
            <h4 class="panel-section-title">Borrar progreso</h4>
            <p class="panel-field-hint" style="margin-bottom:8px;">Empieza de cero, como la primera vez: con la introducción.</p>
            <div class="panel-actions-row"><button type="button" id="btnPanelWipe" class="btn-danger">🗑️ Borrar progreso</button></div>
        </div>
        <div class="panel-section panel-about">
            <h4 class="panel-section-title">Sobre Easy Hero</h4>
            <p><b>Easy Hero está en beta.</b> Un RPG de aventuras para jugar en el navegador, hecho para que cualquiera pueda
                perderse un rato en un mundo lleno de caminos, monstruos y gente con algo que contarte.</p>
            <p>Cada versión trae más: zonas nuevas, armas, enemigos y la historia de quién eres.</p>
            <p><b>Gratis, sin cuenta y sin anuncios.</b> Tu partida se guarda en tu navegador, y en ningún sitio más.</p>
        </div>`;
    const btnWipe = document.getElementById('btnPanelWipe');
    if (btnWipe && handlers.onWipe) btnWipe.addEventListener('click', () => _renderWipeConfirm(handlers));
    const btnIntro = document.getElementById('btnPanelIntro');
    if (btnIntro && handlers.onReplayIntro) btnIntro.addEventListener('click', handlers.onReplayIntro);
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

import { ZAFIAS, ZAFIAS_DIALOGUES } from './data/zones/zafias.js?v=1.5.1';
import { ART } from './data/art.js?v=1.5.1';
import { monsterArt } from './art.js?v=1.5.1';

// =============================================
// 🧭 Modo Aventura — visor de escenas, estilo mapa antiguo
// El mapa es un «mundo» que se desplaza y escala con transform. Los caminos son líneas a trazos entre paradas
// (puntos rojos numerados 1-1, 1-2…); el héroe solo anda por ellos, de parada en parada, y la cámara le sigue.
// Un enemigo sin vencer corta el paso: el héroe se para delante y pelea. Las paradas van en una capa de
// pantalla, a tamaño fijo con cualquier zoom; los trazos, en el mundo (escalan con él, como la tinta del mapa).
// =============================================
const HERO_MAP_H = 34;          // alto del héroe en píxeles del mapa (un árbol mide ~40)
const HERO_RATIO = 195 / 244;   // ancho/alto de img/sprites/hero_right.png
const WALK_SPEED = 95;          // píxeles de mapa por segundo
const CAMERA_EASE = 0.12;       // cuánto se acerca la cámara a su objetivo en cada fotograma
const ZOOM_MIN = 1.5;           // por debajo, el héroe se ve diminuto
const ZOOM_MAX = 2.4;           // por encima, el mapa (1434 px) se ve borroso
const FACE_GAP = 20;            // ante un enemigo, el héroe se para a esta distancia (no encima de él)
const STOP_ICONS = { npc: '💬', enemy: '⚔️', exit: '🚪', inn: '🛏️', shop: '🛒', cave: '🕳️' };
const SVG_NS = 'http://www.w3.org/2000/svg';

const zone = ZAFIAS;
const st = {
    scene: null, sceneId: null, at: null, hero: { x: 0, y: 0, facing: 1 }, path: null, onArrive: null,
    cam: { x: 0, y: 0, z: 2 }, dialogue: null, raf: 0, last: 0, fps: null,
    // Quien controla la aventura (main.js): salir, pelear, hablar, guardar la escena, qué se ve y qué está vencido
    hooks: { onExit: null, onEnemy: null, onTalk: null, onPlace: null, onScene: null, isShown: () => true, isCleared: () => false }
};
let els = null;

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Numeración de mundo: 1-1, 1-2… por orden de escenas y paradas (las salidas y los cruces no cuentan)
const STOP_LABELS = (() => {
    const labels = {};
    let n = 0;
    for (const sc of Object.values(zone.scenes)) {
        for (const p of sc.points) if (p.kind !== 'exit') labels[p.id] = `${zone.number || 1}-${++n}`;
    }
    return labels;
})();

// --- Grafo de la escena: paradas + cruces, unidos por caminos con recodos ---
function node(id) {
    const p = st.scene.points.find(q => q.id === id);
    if (p) return p;
    const f = st.scene.forks && st.scene.forks[id];
    return f ? { id, kind: 'fork', ...f } : null;
}
const shown = id => { const n = node(id); return !!n && (n.kind === 'fork' || st.hooks.isShown(n)); };
const visibleLinks = () => (st.scene.links || []).filter(([a, b]) => shown(a) && shown(b));

/** Camino más corto (en saltos) de una parada a otra: lista de puntos del mapa y de paradas cruzadas. */
function route(fromId, toId) {
    if (fromId === toId) return { points: [], stops: [toId] };
    const links = visibleLinks();
    const prev = { [fromId]: null };
    const queue = [fromId];
    while (queue.length) {
        const cur = queue.shift();
        if (cur === toId) break;
        for (const [a, b, via] of links) {
            const next = a === cur ? b : b === cur ? a : null;
            if (next && !(next in prev)) { prev[next] = { from: cur, a, via }; queue.push(next); }
        }
    }
    if (!(toId in prev)) return null;
    const hops = [];
    for (let id = toId; prev[id]; id = prev[id].from) hops.unshift({ id, ...prev[id] });
    const points = [];
    const stops = [];
    for (const h of hops) {
        const via = h.via || [];
        points.push(...(h.a === h.from ? via : via.slice().reverse()), { x: node(h.id).x, y: node(h.id).y, stop: h.id });
        stops.push(h.id);
    }
    return { points, stops };
}

function viewportSize() {
    const r = els.viewport.getBoundingClientRect();
    return { w: r.width, h: r.height };
}

// La escena llena el visor (como background-size: cover) y la cámara sigue al héroe dentro de su recuadro
function sceneZoom(scene) {
    const { w, h } = viewportSize();
    const cover = Math.max(w / scene.box.w, h / scene.box.h);
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cover));
}

/** Objetivo de la cámara: el héroe, pero sin salirse del recuadro de la escena ni del mapa. */
function cameraTarget() {
    const { w, h } = viewportSize();
    const z = sceneZoom(st.scene);
    const halfW = w / z / 2, halfH = h / z / 2;
    const b = st.scene.box;
    const clampAxis = (v, lo, hi, half, max) => {
        let a = lo + half, c = hi - half;
        if (a > c) a = c = (lo + hi) / 2;          // el recuadro cabe entero: centrado
        v = Math.min(c, Math.max(a, v));
        return Math.min(max - half, Math.max(half, v)); // y nunca fuera del mapa
    };
    return {
        x: clampAxis(st.hero.x, b.x, b.x + b.w, halfW, zone.width),
        y: clampAxis(st.hero.y - HERO_MAP_H / 2, b.y, b.y + b.h, halfH, zone.height),
        z
    };
}

function project(x, y) {
    const { w, h } = viewportSize();
    return { x: (x - st.cam.x) * st.cam.z + w / 2, y: (y - st.cam.y) * st.cam.z + h / 2 };
}

function applyTransforms() {
    const { w, h } = viewportSize();
    const { x, y, z } = st.cam;
    els.world.style.transform = `translate3d(${(w / 2 - x * z).toFixed(2)}px, ${(h / 2 - y * z).toFixed(2)}px, 0) scale(${z.toFixed(4)})`;
    els.hero.style.transform = `translate3d(${st.hero.x.toFixed(2)}px, ${st.hero.y.toFixed(2)}px, 0) translate(-50%, -100%) scaleX(${st.hero.facing})`;
    els.markers.querySelectorAll('.adv-stop').forEach(m => {
        const p = project(+m.dataset.x, +m.dataset.y);
        m.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    });
}

function tick(now) {
    const dt = Math.min(0.05, (now - (st.last || now)) / 1000);
    st.last = now;

    if (st.path) {
        const target = st.path[0];
        const dx = target.x - st.hero.x, dy = target.y - st.hero.y;
        const dist = Math.hypot(dx, dy);
        const step = WALK_SPEED * dt;
        if (Math.abs(dx) > 1) st.hero.facing = dx < 0 ? -1 : 1;
        if (dist <= step || reducedMotion()) {
            st.hero.x = target.x; st.hero.y = target.y;
            if (target.stop) st.at = target.stop;
            st.path.shift();
            if (!st.path.length) {
                st.path = null;
                els.hero.classList.remove('is-walking');
                const done = st.onArrive; st.onArrive = null;
                if (done) done();
            }
        } else {
            st.hero.x += dx / dist * step;
            st.hero.y += dy / dist * step;
        }
    }

    const t = cameraTarget();
    const k = reducedMotion() ? 1 : 1 - Math.pow(1 - CAMERA_EASE, dt * 60);
    st.cam.x += (t.x - st.cam.x) * k;
    st.cam.y += (t.y - st.cam.y) * k;
    st.cam.z += (t.z - st.cam.z) * k;
    applyTransforms();

    if (st.fps) {
        st.fps.frames++;
        if (now - st.fps.since >= 500) {
            els.fps.textContent = `${Math.round(st.fps.frames * 1000 / (now - st.fps.since))} fps`;
            st.fps.frames = 0; st.fps.since = now;
        }
    }
    st.raf = requestAnimationFrame(tick);
}

// Los enemigos se ven en la escena antes de pelear: su imagen va en el mundo, junto a su parada
const ENEMY_OFFSET = { x: 5, y: 11 };   // píxeles de mapa: hacia la derecha y hacia arriba desde su parada
// Sin arte propio, el goblin de siempre. Con arte (src/data/art.js, por el `sprite` de la parada o su nombre), el suyo.
const ENEMY_SPRITE = { src: 'img/sprites/goblin_left.png', w: 175, h: 217 };
const HERO_SPRITE_H = 244;   // misma escala de píxel que el héroe

function renderActors() {
    els.world.querySelectorAll('.adv-enemy').forEach(el => el.remove());
    st.scene.points.filter(p => p.kind === 'enemy' && st.hooks.isShown(p) && !st.hooks.isCleared(p)).forEach(p => {
        const sprite = monsterArt(ART, p.sprite || p.name) || ENEMY_SPRITE;
        const img = document.createElement('img');
        img.className = 'adv-enemy';
        img.src = sprite.src;
        img.alt = '';
        img.draggable = false;
        // Los jefes de misión se ven más grandes, como en el combate
        const h = HERO_MAP_H * (sprite.h / HERO_SPRITE_H) * ({ subboss: 1.25, boss: 1.5 }[p.enemy && p.enemy.type] || 1);
        img.style.height = `${h.toFixed(1)}px`;
        img.style.width = `${(h * sprite.w / sprite.h).toFixed(1)}px`;
        // Sus pies quedan por encima del punto (y de su latido): así la parada roja se ve siempre
        img.style.transform = `translate3d(${p.x + ENEMY_OFFSET.x}px, ${p.y - ENEMY_OFFSET.y}px, 0) translate(-50%, -100%)`;
        els.world.insertBefore(img, els.hero);
    });
}

// Los caminos, a trazos, como en los mapas antiguos: un halo claro debajo y la tinta encima
function renderPaths() {
    const d = visibleLinks().map(([a, b, via]) => {
        const pts = [node(a), ...(via || []), node(b)];
        return `M ${pts.map(p => `${p.x} ${p.y}`).join(' L ')}`;
    }).join(' ');
    els.paths.innerHTML = `<path class="adv-path-halo" d="${d}"/><path class="adv-path-ink" d="${d}"/>`;
}

function renderMarkers() {
    els.markers.innerHTML = st.scene.points.filter(p => st.hooks.isShown(p)).map(p => {
        const cleared = p.kind === 'enemy' && st.hooks.isCleared(p);
        const icon = p.kind === 'exit' ? STOP_ICONS.exit : cleared ? '✓' : STOP_ICONS[p.kind] || '';
        const text = p.kind === 'exit' ? esc(p.name) : STOP_LABELS[p.id] || '';
        const label = `<span class="adv-stop-icon">${icon}</span><span class="adv-stop-text">${text}</span>`;
        return `
        <button type="button" class="adv-stop is-${p.kind}${cleared ? ' is-cleared' : ''}" data-point="${esc(p.id)}" data-x="${p.x}" data-y="${p.y}" aria-label="${esc(`${STOP_LABELS[p.id] || ''} ${p.name}`)}">
            <span class="adv-stop-dot" aria-hidden="true"></span>
            <span class="adv-stop-label">${label}</span>
            <span class="adv-stop-name">${esc(p.name)}</span>
        </button>`;
    }).join('');
}

function renderScene() {
    renderPaths();
    renderActors();
    renderMarkers();
}

function showPlaque() {
    els.plaque.textContent = st.scene.name;
    els.plaque.classList.remove('is-in');
    void els.plaque.offsetWidth;   // reinicia la animación del cartel
    els.plaque.classList.add('is-in');
}

/** Entra en una escena y pone al héroe en una parada (por defecto, la de inicio de la escena). */
function enterScene(id, atStop) {
    st.scene = zone.scenes[id];
    st.sceneId = id;
    els.viewport.dataset.scene = id;
    st.at = atStop && node(atStop) ? atStop : st.scene.startAt;
    const n = node(st.at);
    st.hero.x = n.x; st.hero.y = n.y;
    st.path = null;
    if (st.hooks.onScene) st.hooks.onScene(id);
    renderScene();
    showPlaque();
}

// --- Diálogo: «Siguiente» hasta el final, y listo ---
function openDialogue(key, onDone = null) {
    const lines = ZAFIAS_DIALOGUES[key];
    if (!lines || !lines.length) { if (onDone) onDone(); return; }
    st.dialogue = { lines, i: 0, onDone };
    renderDialogue();
    els.dialogue.hidden = false;
    els.dialogueNext.focus({ preventScroll: true });
}

function renderDialogue() {
    const { lines, i } = st.dialogue;
    els.dialogueWho.textContent = lines[i].who;
    els.dialogueText.textContent = lines[i].text;
    els.dialogueNext.textContent = i < lines.length - 1 ? 'Siguiente' : 'Cerrar';
}

function advanceDialogue() {
    if (!st.dialogue) return;
    st.dialogue.i++;
    if (st.dialogue.i >= st.dialogue.lines.length) {
        const done = st.dialogue.onDone;
        closeDialogue();
        if (done) done();   // p. ej. el grito de guerra de un enemigo, y después el combate
        return;
    }
    renderDialogue();
}

function closeDialogue() {
    st.dialogue = null;
    els.dialogue.hidden = true;
}

/** Lo que pasa al llegar a una parada. */
function arriveAt(p) {
    if (p.kind === 'exit') { enterScene(p.to, p.arriveAt); return; }
    if (p.kind === 'enemy' && st.hooks.isCleared(p)) return;   // ya vencido: solo se pasa por aquí
    // Lugares de la aldea (posada, tienda, cueva) y vecinos: lo que pasa lo decide quien controla la aventura
    if (['inn', 'shop', 'cave'].includes(p.kind) && st.hooks.onPlace) {
        const t = st.hooks.onPlace(p);
        if (t) openDialogue(t.dialogue, t.onDone);
        return;
    }
    if (p.kind === 'npc' && st.hooks.onTalk) {
        const t = st.hooks.onTalk(p);
        if (t) openDialogue(t.dialogue, t.onDone);
        return;
    }
    const fight = p.kind === 'enemy' && st.hooks.onEnemy ? () => st.hooks.onEnemy(p) : null;
    if (p.dialogue) openDialogue(p.dialogue, fight);
    else if (fight) fight();
}

function onStopClick(id) {
    if (st.dialogue || st.path) return;
    const r = route(st.at, id);
    if (!r) return;
    let points = r.points;
    let target = node(id);
    // Un enemigo sin vencer corta el paso: el camino termina ante él (el primero que haya por delante)
    const blockIdx = points.length ? r.stops.findIndex(s => { const n = node(s); return n.kind === 'enemy' && !st.hooks.isCleared(n); }) : -1;
    if (blockIdx >= 0) {
        const blockId = r.stops[blockIdx];
        target = node(blockId);
        points = points.slice(0, points.findIndex(pt => pt.stop === blockId) + 1);
        // Se para a unos pasos, mirándole. Cuenta como si siguiera en la parada anterior: si huye, no se ha colado
        const last = points[points.length - 1];
        const prev = points[points.length - 2] || st.hero;
        const len = Math.hypot(last.x - prev.x, last.y - prev.y) || 1;
        const k = Math.min(1, FACE_GAP / len);
        const before = blockIdx > 0 ? r.stops[blockIdx - 1] : st.at;
        points[points.length - 1] = { x: last.x - (last.x - prev.x) * k, y: last.y - (last.y - prev.y) * k, stop: before };
    }
    const arrive = () => {
        if (target.kind === 'enemy') st.hero.facing = target.x < st.hero.x ? -1 : 1;
        arriveAt(target);
    };
    if (!points.length) { arrive(); return; }
    st.path = points;
    st.onArrive = arrive;
    els.hero.classList.add('is-walking');
}

function bind() {
    const root = document.getElementById('rpgAdventureView');
    if (!root) return false;
    els = {
        root,
        viewport: root.querySelector('.adv-viewport'),
        world: root.querySelector('.adv-world'),
        hero: root.querySelector('.adv-hero'),
        markers: root.querySelector('.adv-markers'),
        plaque: root.querySelector('.adv-plaque'),
        dialogue: root.querySelector('.adv-dialogue'),
        dialogueWho: root.querySelector('.adv-dialogue-who'),
        dialogueText: root.querySelector('.adv-dialogue-text'),
        dialogueNext: root.querySelector('.adv-dialogue-next'),
        fps: root.querySelector('.adv-fps')
    };
    els.world.querySelector('img').src = zone.image;
    els.world.style.width = `${zone.width}px`;
    els.world.style.height = `${zone.height}px`;
    // La capa de los caminos: un SVG del tamaño del mapa, debajo de los personajes
    els.paths = document.createElementNS(SVG_NS, 'svg');
    els.paths.setAttribute('class', 'adv-paths');
    els.paths.setAttribute('viewBox', `0 0 ${zone.width} ${zone.height}`);
    els.paths.setAttribute('aria-hidden', 'true');
    els.world.insertBefore(els.paths, els.hero);
    els.hero.style.height = `${HERO_MAP_H}px`;
    els.hero.style.width = `${(HERO_MAP_H * HERO_RATIO).toFixed(1)}px`;
    els.markers.addEventListener('click', e => {
        const b = e.target.closest('.adv-stop');
        if (b) onStopClick(b.dataset.point);
    });
    // Pulsar en cualquier parte del pergamino (o su botón, que burbujea hasta aquí) pasa a la siguiente línea
    els.dialogue.addEventListener('click', advanceDialogue);
    root.querySelector('.adv-back').addEventListener('click', () => { close(); if (st.hooks.onExit) st.hooks.onExit(); });
    document.addEventListener('keydown', e => {
        if (!st.raf || !st.dialogue) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advanceDialogue(); }
        if (e.key === 'Escape') closeDialogue();
    });
    return true;
}

/**
 * Abre el Modo Aventura. hooks: { onExit, onEnemy(point), onTalk(point) → { dialogue, onDone }, onPlace(point),
 * onScene(id), isShown(point), isCleared(point) }.
 * scene: la escena guardada (si no hay, la de inicio de la zona). Si ya estaba abierta, sigue donde estaba.
 */
export function open(hooks = {}, scene = null) {
    if (!els && !bind()) return;
    st.hooks = { ...st.hooks, ...hooks };
    closeDialogue();
    if (!st.scene) enterScene(zone.scenes[scene] ? scene : zone.startScene);
    else { renderScene(); showPlaque(); }
    const debug = /[?&]debug\b/.test(location.search);
    els.fps.hidden = !debug;
    st.fps = debug ? { frames: 0, since: performance.now() } : null;
    // Primer encuadre sin viaje de cámara
    requestAnimationFrame(() => {
        const t = cameraTarget();
        st.cam = { ...t };
        applyTransforms();
        if (!st.raf) { st.last = 0; st.raf = requestAnimationFrame(tick); }
    });
}

/** Vuelve a pintar caminos, enemigos y paradas (la historia ha cambiado qué se ve). */
export function refresh() {
    if (!els || !st.scene) return;
    renderScene();
}

/** Te lleva a una escena (p. ej. despertar en la posada tras caer). */
export function goTo(sceneId) {
    if (!els || !zone.scenes[sceneId]) return;
    enterScene(sceneId);
}

/** Lo que dice la barra de la aventura (vida, oro, pociones). */
export function setHud(text) {
    const el = document.querySelector('#rpgAdventureView .adv-hud');
    if (el) el.textContent = text;
}

export function close() {
    cancelAnimationFrame(st.raf);
    st.raf = 0;
    closeDialogue();
}

import { ZAFIAS, ZAFIAS_DIALOGUES } from './data/zones/zafias.js?v=1.4.2';

// =============================================
// 🧭 Modo Aventura — visor de escenas
// El mapa es un «mundo» que se desplaza y escala con transform; el héroe camina por él y la cámara le sigue
// dentro del recuadro de la escena. Los marcadores van en una capa de pantalla, a tamaño fijo con cualquier zoom.
// =============================================
const HERO_MAP_H = 34;          // alto del héroe en píxeles del mapa (un árbol mide ~40)
const HERO_RATIO = 195 / 244;   // ancho/alto de img/sprites/hero_right.png
const WALK_SPEED = 95;          // píxeles de mapa por segundo
const CAMERA_EASE = 0.12;       // cuánto se acerca la cámara a su objetivo en cada fotograma
const ZOOM_MIN = 1.5;           // por debajo, el héroe se ve diminuto
const ZOOM_MAX = 2.4;           // por encima, el mapa (1434 px) se ve borroso
const MARKER_ICONS = { npc: '💬', enemy: '⚔️', exit: '🚪' };

const zone = ZAFIAS;
const st = {
    scene: null, hero: { x: 0, y: 0, facing: 1 }, path: null, onArrive: null,
    cam: { x: 0, y: 0, z: 2 }, dialogue: null, raf: 0, last: 0, fps: null,
    // Quien controla la aventura (main.js): salir, pelear, guardar la escena y saber qué enemigos ya cayeron
    hooks: { onExit: null, onEnemy: null, onScene: null, isGone: () => false }
};
let els = null;

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
    els.markers.querySelectorAll('.adv-marker').forEach(m => {
        const p = project(+m.dataset.x, +m.dataset.y);
        m.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
    });
}

function tick(now) {
    const dt = Math.min(0.05, (now - (st.last || now)) / 1000);
    st.last = now;

    if (st.path) {
        const { x: tx, y: ty } = st.path[0];
        const dx = tx - st.hero.x, dy = ty - st.hero.y;
        const dist = Math.hypot(dx, dy);
        const step = WALK_SPEED * dt;
        if (Math.abs(dx) > 1) st.hero.facing = dx < 0 ? -1 : 1;
        if (dist <= step || reducedMotion()) {
            st.hero.x = tx; st.hero.y = ty;
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

/** Camina por los recodos `via` (si los hay) hasta (x, y). */
function walkTo(x, y, onArrive, via = []) {
    st.path = [...via, { x, y }];
    st.onArrive = onArrive || null;
    els.hero.classList.add('is-walking');
}

// Los enemigos se ven en la escena antes de pelear: su imagen va en el mundo, a la escala del héroe
const ENEMY_SPRITE = { src: 'img/sprites/goblin_left.png', ratio: 175 / 217, h: HERO_MAP_H * 217 / 244 };

function renderActors() {
    els.world.querySelectorAll('.adv-enemy').forEach(el => el.remove());
    st.scene.points.filter(p => p.kind === 'enemy' && !st.hooks.isGone(p.id)).forEach(p => {
        const img = document.createElement('img');
        img.className = 'adv-enemy';
        img.src = ENEMY_SPRITE.src;
        img.alt = '';
        img.draggable = false;
        img.style.height = `${ENEMY_SPRITE.h.toFixed(1)}px`;
        img.style.width = `${(ENEMY_SPRITE.h * ENEMY_SPRITE.ratio).toFixed(1)}px`;
        img.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -100%)`;
        els.world.insertBefore(img, els.hero);
    });
}

function renderMarkers() {
    els.markers.innerHTML = st.scene.points.filter(p => !(p.kind === 'enemy' && st.hooks.isGone(p.id))).map(p => `
        <button type="button" class="adv-marker is-${p.kind}" data-point="${esc(p.id)}" data-x="${p.x}" data-y="${p.y}" aria-label="${esc(p.name)}">
            <span class="adv-marker-icon" aria-hidden="true">${MARKER_ICONS[p.kind] || '❔'}</span>
            <span class="adv-marker-name">${esc(p.name)}</span>
        </button>`).join('');
}

function showPlaque() {
    els.plaque.textContent = st.scene.name;
    els.plaque.classList.remove('is-in');
    void els.plaque.offsetWidth;   // reinicia la animación del cartel
    els.plaque.classList.add('is-in');
}

function enterScene(id, at) {
    st.scene = zone.scenes[id];
    st.sceneId = id;
    els.viewport.dataset.scene = id;
    if (at) { st.hero.x = at.x; st.hero.y = at.y; }
    if (st.hooks.onScene) st.hooks.onScene(id);
    renderActors();
    renderMarkers();
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

function onPointClick(id) {
    if (st.dialogue) return;
    const p = st.scene.points.find(q => q.id === id);
    if (!p) return;
    // El héroe se para al lado del punto, no encima
    const side = p.x < st.hero.x ? 1 : -1;
    const stopX = p.kind === 'exit' ? p.x : p.x + side * (p.kind === 'enemy' ? 26 : 14);
    // Los recodos que ya quedan detrás del héroe (está más cerca del punto que ellos) se saltan
    const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const via = (p.via || []).slice();
    while (via.length && d(st.hero, p) <= d(via[0], p)) via.shift();
    walkTo(stopX, p.y + (p.kind === 'exit' ? 0 : 4), () => {
        if (p.kind === 'exit') {
            enterScene(p.to);
            walkTo(p.arrive.x, p.arrive.y);   // sigue andando mientras la cámara viaja a la escena nueva
        } else {
            st.hero.facing = p.x < st.hero.x ? -1 : 1;   // mira hacia quien le habla
            const fight = p.kind === 'enemy' && st.hooks.onEnemy ? () => st.hooks.onEnemy(p) : null;
            if (p.dialogue) openDialogue(p.dialogue, fight);
            else if (fight) fight();
        }
    }, via);
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
    els.hero.style.height = `${HERO_MAP_H}px`;
    els.hero.style.width = `${(HERO_MAP_H * HERO_RATIO).toFixed(1)}px`;
    els.markers.addEventListener('click', e => {
        const b = e.target.closest('.adv-marker');
        if (b) onPointClick(b.dataset.point);
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
 * Abre el Modo Aventura. hooks: { onExit, onEnemy(point), onScene(id), isGone(pointId) }.
 * scene: la escena guardada (si no hay, la de inicio de la zona). Si ya estaba abierta, sigue donde estaba.
 */
export function open(hooks = {}, scene = null) {
    if (!els && !bind()) return;
    st.hooks = { ...st.hooks, ...hooks };
    closeDialogue();
    if (!st.scene) {
        const id = zone.scenes[scene] ? scene : zone.startScene;
        enterScene(id, zone.scenes[id].start);
    } else {
        renderActors();
        renderMarkers();
        showPlaque();
    }
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

/** Te lleva a una escena (p. ej. despertar en la posada tras caer). */
export function goTo(sceneId) {
    if (!els || !zone.scenes[sceneId]) return;
    enterScene(sceneId, zone.scenes[sceneId].start);
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

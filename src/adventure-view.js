import { ZAFIAS, ZAFIAS_DIALOGUES } from './data/zones/zafias.js?v=1.11.0';
import { ART } from './data/art.js?v=1.11.0';
import { monsterArt } from './art.js?v=1.11.0';
import { creatureFor } from './data/creatures.js?v=1.11.0';
import { PORTRAITS, HERO_WHO } from './data/characters.js?v=1.11.0';

// =============================================
// 🧭 Modo Aventura — visor de escenas, estilo mapa antiguo
// El mapa es un «mundo» que se desplaza y escala con transform. Los caminos son líneas a trazos entre paradas
// (puntos rojos con su icono); el héroe solo anda por ellos, de parada en parada, y la cámara le sigue.
// Un enemigo sin vencer corta el paso: el héroe se para delante y pelea. Las paradas van en una capa de
// pantalla, a tamaño fijo con cualquier zoom; los trazos, en el mundo (escalan con él, como la tinta del mapa).
// =============================================
const HERO_MAP_H = 34;          // alto del héroe en píxeles del mapa (un árbol mide ~40)
const HERO_RATIO = 195 / 244;   // ancho/alto de img/sprites/hero_right.png
const WALK_SPEED = 95;          // píxeles de mapa por segundo
const CAMERA_EASE = 0.12;       // cuánto se acerca la cámara a su objetivo en cada fotograma
const ZOOM_MIN = 1.5;           // por debajo, el héroe se ve diminuto
const ZOOM_MAX = 2.4;           // el mapa se pinta a 1434 px lógicos; la imagen va a ×3 para que el zoom se vea nítido
const FACE_GAP = 20;            // ante un enemigo, el héroe se para a esta distancia (no encima de él)
const STOP_ICONS = { npc: '💬', enemy: '⚔️', exit: '🚪', inn: '🛏️', shop: '🛒', cave: '🕳️', poi: '🔍' };
// Las paradas que ya tienen arte propio (img/ui): el resto, su emoticono hasta que llegue el suyo
const STOP_IMAGES = { enemy: 'img/ui/ranura-arma.webp', shop: 'img/ui/bolsa-oro.webp', npc: 'img/ui/parada-hablar.webp',
    inn: 'img/ui/parada-posada.webp', poi: 'img/ui/parada-mirar.webp' };
const SVG_NS = 'http://www.w3.org/2000/svg';
const EXIT_EDGE = { x: 110, top: 70, bottom: 70 };   // margen (px de pantalla) de las salidas pegadas al borde

const zone = ZAFIAS;
const st = {
    scene: null, sceneId: null, at: null, hero: { x: 0, y: 0, facing: 1 }, path: null, onArrive: null,
    cam: { x: 0, y: 0, z: 2 }, dialogue: null, menu: null, raf: 0, last: 0, fps: null,
    // Quien controla la aventura (main.js): salir, pelear, hablar, guardar la escena, qué se ve y qué está vencido
    hooks: { onEnemy: null, onVisit: null, onScene: null, isShown: () => true, isCleared: () => false }
};
let els = null;

// El lienzo de la escena: su propio cuadro (`image`, `width`, `height` en la escena) o el mapa de la zona
const canvas = (sc = st.scene) => (sc && sc.image ? { image: sc.image, w: sc.width, h: sc.height } : { image: zone.image, w: zone.width, h: zone.height });

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
        x: clampAxis(st.hero.x, b.x, b.x + b.w, halfW, canvas().w),
        y: clampAxis(st.hero.y - HERO_MAP_H / 2, b.y, b.y + b.h, halfH, canvas().h),
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
        let p = project(+m.dataset.x, +m.dataset.y);
        // Una salida fuera de la pantalla se queda en el borde, con la flecha apuntando hacia donde está
        if (m.classList.contains('is-exit')) {
            const edge = { x: Math.min(w - EXIT_EDGE.x, Math.max(EXIT_EDGE.x, p.x)), y: Math.min(h - EXIT_EDGE.bottom, Math.max(EXIT_EDGE.top, p.y)) };
            const off = p.x < 0 || p.x > w || p.y < 0 || p.y > h;   // solo si de verdad no se ve
            m.classList.toggle('is-offscreen', off);
            const arrow = m.querySelector('.adv-exit-arrow');
            if (arrow) {
                const deg = off ? Math.atan2(p.y - edge.y, p.x - edge.x) * 180 / Math.PI : +arrow.dataset.deg;
                arrow.style.transform = `rotate(${deg.toFixed(0)}deg)`;
            }
            if (off) p = edge;
        }
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
    const k = reducedMotion() || st.jump ? 1 : 1 - Math.pow(1 - CAMERA_EASE, dt * 60);
    st.jump = false;
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
        const sprite = monsterArt(ART, p.sprite || (creatureFor(p) || {}).name || p.name) || ENEMY_SPRITE;
        const img = document.createElement('img');
        img.className = 'adv-enemy';
        img.src = sprite.src;
        img.alt = '';
        img.draggable = false;
        // Los jefes de misión se ven más grandes, como en el combate
        const h = HERO_MAP_H * (sprite.h / HERO_SPRITE_H) * ({ subboss: 1.25, boss: 1.5 }[(creatureFor(p) || p.enemy || {}).type] || 1)
            * ((creatureFor(p) || {}).scale || 1);   // cada especie con su tamaño (un lobo, a media altura del héroe)
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

/** Cartel de una salida: una flecha que apunta hacia donde lleva (hacia fuera de la escena) y la escena de destino. */
function exitLabel(p) {
    const b = st.scene.box;
    const deg = Math.atan2(p.y - (b.y + b.h / 2), p.x - (b.x + b.w / 2)) * 180 / Math.PI;
    const dest = zone.scenes[p.to];
    return `<img class="adv-stop-img adv-exit-door" src="img/ui/parada-salida.webp" alt="" draggable="false">`
        + `<span class="adv-exit-arrow" data-deg="${deg.toFixed(0)}" style="transform: rotate(${deg.toFixed(0)}deg)" aria-hidden="true">➜</span>`
        + `<span class="adv-stop-text">${esc(p.name)}${dest ? `<small>${esc(dest.name)}</small>` : ''}</span>`;
}

function renderMarkers() {
    els.markers.innerHTML = st.scene.points.filter(p => st.hooks.isShown(p)).map(p => {
        const cleared = p.kind === 'enemy' && st.hooks.isCleared(p);
        const seen = p.kind === 'poi' && !!(st.hooks.isSeen && st.hooks.isSeen(p));   // punto de interés ya mirado
        // NPC: azul si tiene misión (por dar o en marcha), gris si ya la cumpliste, amarillo si solo habla
        const mark = p.kind === 'npc' || (p.kind === 'inn' && p.talk) ? (st.hooks.npcMark ? st.hooks.npcMark(p) : 'talk') : null;
        const icon = p.kind === 'exit' ? STOP_ICONS.exit : cleared ? '✓' : STOP_ICONS[p.kind] || '';
        const img = !cleared && STOP_IMAGES[p.kind];
        const iconHtml = img ? `<img class="adv-stop-img" src="${img}" alt="" draggable="false">` : icon;
        const label = p.kind === 'exit' ? exitLabel(p) : `<span class="adv-stop-icon">${iconHtml}</span>`;
        return `
        <button type="button" class="adv-stop is-${p.kind}${mark ? ` is-${mark}` : ''}${cleared || seen || mark === 'done' ? ' is-cleared' : ''}" data-point="${esc(p.id)}" data-x="${p.x}" data-y="${p.y}" aria-label="${p.kind === 'enemy' ? 'Enemigo' : esc(p.name)}">
            <span class="adv-stop-dot" aria-hidden="true"></span>
            <span class="adv-stop-label">${label}</span>
            ${p.kind === 'enemy' ? '' : `<span class="adv-stop-name">${esc(p.name)}</span>`}
        </button>`;
    }).join('');
}

function renderScene() {
    renderPaths();
    renderActors();
    renderMarkers();
}


/** Entra en una escena y pone al héroe en una parada (por defecto, la de inicio de la escena). */
function enterScene(id, atStop) {
    const before = st.scene ? canvas().image : null;
    st.scene = zone.scenes[id];
    st.sceneId = id;
    els.viewport.dataset.scene = id;
    // Si la escena tiene otro cuadro, se cambia el lienzo (imagen, tamaño del mundo y de la capa de caminos)
    const cv = canvas();
    if (cv.image !== before) {
        const img = els.world.querySelector('img');
        if (img.getAttribute('src') !== cv.image) img.src = cv.image;
        els.world.style.width = `${cv.w}px`;
        els.world.style.height = `${cv.h}px`;
        els.paths.setAttribute('viewBox', `0 0 ${cv.w} ${cv.h}`);
        st.jump = true;   // otro lienzo: la cámara no viaja, aparece ya encuadrada
    }
    st.at = atStop && node(atStop) ? atStop : st.scene.startAt;
    const n = node(st.at);
    st.hero.x = n.x; st.hero.y = n.y;
    st.path = null;
    if (st.hooks.onScene) st.hooks.onScene(id);
    renderScene();
}

// Los cuadros de todas las escenas, cargados de antemano: al cambiar de escena no se ve el anterior ni un hueco
function preloadCanvases() {
    for (const src of new Set(Object.values(zone.scenes).map(sc => canvas(sc).image))) { const im = new Image(); im.src = src; _portraitCache.push(im); }
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
    const name = (st.hooks.heroName && st.hooks.heroName()) || 'Héroe';
    els.dialogueWho.textContent = lines[i].who.replace(/\{heroe\}/g, name);
    els.dialogueText.textContent = lines[i].text.replace(/\{heroe\}/g, name);
    els.dialogueNext.textContent = i < lines.length - 1 ? 'Siguiente' : 'Cerrar';
    els.dialogueWho.classList.toggle('is-hero', lines[i].who === HERO_WHO);   // la etiqueta del nombre, del lado de quien habla
    renderPortraits(lines, i);
}

// Novela visual: el retrato de cada lado es el de quien habla en esa conversación (el héroe, a la derecha; el otro, a la
// izquierda). Quien habla se ve entero; el que escucha queda en penumbra. Narración (sin retrato): los dos en penumbra
// PORTRAITS[who] es el id o { id, scale }: devuelve { src, w, h, scale } o null
const portraitOf = who => {
    const p = PORTRAITS[who];
    const id = p && (typeof p === 'string' ? p : p.id);
    const art = id && ART.portraits && ART.portraits[id];
    return art ? { ...art, scale: (p && p.scale) || 1 } : null;
};
function renderPortraits(lines, i) {
    const who = lines[i].who;
    const other = lines.map(l => l.who).find(w => w !== HERO_WHO && portraitOf(w));
    const heroSpeaks = lines.some(l => l.who === HERO_WHO);
    const show = (img, art, speaking) => {
        if (!img) return;
        img.hidden = !art;
        if (!art) return;
        // Cambio de cara: el retrato no se ve hasta que el nuevo está listo (si no, durante un instante seguiría el de
        // la conversación anterior: el goblin antes que Maela)
        if (img.getAttribute('src') !== art.src) {
            img.classList.add('is-loading');
            img.src = art.src;
            const ready = () => { if (img.getAttribute('src') === art.src) img.classList.remove('is-loading'); };
            (img.decode ? img.decode() : Promise.resolve()).then(ready, ready);
        }
        img.style.setProperty('--portrait-scale', art.scale);   // los grandes (Grask) se ven más grandes
        img.classList.toggle('is-big', art.scale > 1);   // y bajan detrás del cuadro: se te echan encima
        img.classList.toggle('is-speaking', speaking);
    };
    show(els.portraitLeft, other ? portraitOf(other) : null, who === other);
    show(els.portraitRight, heroSpeaks ? portraitOf(HERO_WHO) : null, who === HERO_WHO);
    els.dialogue.classList.toggle('has-left', !!other);
    els.dialogue.classList.toggle('has-right', heroSpeaks && !!portraitOf(HERO_WHO));
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

// --- Menú de una parada: qué quieres hacer aquí («Comprar · Mejorar · Salir», «Hablar con Evelyn · Descansar») ---
/**
 * Abre el menú de una parada. menu: { title, text?, options: [{ id, label, note?, disabled? }] }; onPick(id) recibe la
 * opción elegida (el menú ya está cerrado). Escape o la opción 'leave' lo cierran sin más.
 */
function openMenu(menu, onPick) {
    if (!els) return;
    st.menu = { onPick };
    els.menu.innerHTML = `
        <div class="adv-menu-box" role="dialog" aria-label="${esc(menu.title)}">
            <div class="adv-menu-title">${esc(menu.title)}</div>
            ${menu.text ? `<p class="adv-menu-text">${esc(menu.text)}</p>` : ''}
            <div class="adv-menu-options">${menu.options.map(o => `
                <button type="button" class="adv-menu-option" data-menu="${esc(o.id)}"${o.disabled ? ' disabled' : ''}>
                    <span>${esc(o.label)}</span>${o.note ? `<small>${o.coin ? '<img src="img/ui/moneda.webp" alt="" draggable="false">' : ''}${esc(o.note)}</small>` : ''}
                </button>`).join('')}</div>
        </div>`;
    els.menu.hidden = false;
    const first = els.menu.querySelector('.adv-menu-option:not([disabled])');
    if (first) first.focus({ preventScroll: true });
}

function closeMenu() {
    st.menu = null;
    if (els) { els.menu.hidden = true; els.menu.innerHTML = ''; }
}

function pickMenu(id) {
    if (!st.menu) return;
    const pick = st.menu.onPick;
    closeMenu();
    if (id !== 'leave' && pick) pick(id);
}

// Todos los retratos, cargados y decodificados de antemano: al hablar con alguien su cara sale al instante
const _portraitCache = [];
function preloadPortraits() {
    if (_portraitCache.length) return;
    for (const p of Object.values(ART.portraits || {})) {
        const im = new Image();
        im.src = p.src;
        if (im.decode) im.decode().catch(() => {});
        _portraitCache.push(im);
    }
}

/** Lo que pasa al llegar a una parada. */
function arriveAt(p) {
    if (p.kind === 'exit') { enterScene(p.to, p.arriveAt); return; }
    if (p.kind === 'enemy' && st.hooks.isCleared(p)) return;   // ya vencido: solo se pasa por aquí
    // Lugares de la aldea (posada, tienda) y vecinos: lo que pasa lo decide quien controla la aventura
    if (['inn', 'shop', 'npc', 'poi'].includes(p.kind) && st.hooks.onVisit) { st.hooks.onVisit(p); return; }
    const fight = p.kind === 'enemy' && st.hooks.onEnemy ? () => st.hooks.onEnemy(p) : null;
    if (p.dialogue) openDialogue(p.dialogue, fight);
    else if (fight) fight();
}

function onStopClick(id) {
    if (st.dialogue || st.menu || st.path) return;
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
        dialogue: root.querySelector('.adv-dialogue'),
        menu: root.querySelector('.adv-menu'),
        dialogueWho: root.querySelector('.adv-dialogue-who'),
        dialogueText: root.querySelector('.adv-dialogue-text'),
        dialogueNext: root.querySelector('.adv-dialogue-next'),
        portraitLeft: root.querySelector('.adv-portrait.is-left'),
        portraitRight: root.querySelector('.adv-portrait.is-right'),
        fps: root.querySelector('.adv-fps')
    };
    preloadPortraits();
    preloadCanvases();
    // La capa de los caminos: un SVG del tamaño del mapa, debajo de los personajes
    els.paths = document.createElementNS(SVG_NS, 'svg');
    els.paths.setAttribute('class', 'adv-paths');
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
    els.menu.addEventListener('click', e => {
        const b = e.target.closest('[data-menu]');
        if (b && !b.disabled) pickMenu(b.dataset.menu);
    });
    root.querySelector('.adv-inventory').addEventListener('click', () => {
        root.querySelector('.adv-inventory').classList.remove('is-new');
        if (st.hooks.onInventory) st.hooks.onInventory();
    });
    root.querySelector('.adv-equip').addEventListener('click', () => { if (st.hooks.onEquip) st.hooks.onEquip(); });
    root.querySelector('.adv-quests').addEventListener('click', () => {
        root.querySelector('.adv-quests').classList.remove('is-new');
        if (st.hooks.onQuests) st.hooks.onQuests();
    });
    document.addEventListener('keydown', e => {
        if (st.raf && st.menu && e.key === 'Escape') { closeMenu(); return; }
        if (!st.raf || !st.dialogue) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); advanceDialogue(); }
        if (e.key === 'Escape') closeDialogue();
    });
    return true;
}

/**
 * Abre el Modo Aventura. hooks: { onEnemy(point), onVisit(point) (vecinos, lugares y puntos de interés),
 * onScene(id), isShown(point), isCleared(point) }.
 * scene: la escena guardada (si no hay, la de inicio de la zona). Si ya estaba abierta, sigue donde estaba.
 */
export function open(hooks = {}, scene = null) {
    if (!els && !bind()) return;
    st.hooks = { ...st.hooks, ...hooks };
    closeDialogue();
    closeMenu();
    if (!st.scene) enterScene(zone.scenes[scene] ? scene : zone.startScene);
    else renderScene();
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
/** Aviso de misión (nueva o cumplida): un cartel unos segundos y el botón del diario iluminado hasta abrirlo. */
export function questNotice(text) {
    const root = document.getElementById('rpgAdventureView');
    if (!root) return;
    const btn = root.querySelector('.adv-quests');
    if (btn) btn.classList.add('is-new');
    const toast = root.querySelector('.adv-toast');
    if (!toast) return;
    toast.textContent = text;
    toast.hidden = false;
    toast.classList.remove('is-in'); void toast.offsetWidth; toast.classList.add('is-in');
    clearTimeout(questNotice.t);
    questNotice.t = setTimeout(() => { toast.hidden = true; }, 3500);
}

/** Objeto nuevo: un cartel y el botón del inventario iluminado hasta abrirlo. */
export function inventoryNotice(text) {
    questNotice(text);
    const root = document.getElementById('rpgAdventureView');
    if (!root) return;
    root.querySelector('.adv-quests').classList.remove('is-new');
    root.querySelector('.adv-inventory').classList.add('is-new');
}

/** El dibujo del héroe en el mapa (cambia con el arma). sprite: { src, w, h } o null para el de siempre. */
export function setHeroSprite(sprite) {
    if (!els && !bind()) return;
    const s = sprite || { src: 'img/sprites/hero_right.png', w: 195, h: 244 };
    if (els.hero.getAttribute('src') !== s.src) els.hero.src = s.src;
    // Misma altura de cuerpo; el ancho, el de su imagen (una espada larga la ensancha)
    els.hero.style.width = `${(HERO_MAP_H * s.w / s.h).toFixed(1)}px`;
}

/** Medidor con el arte de la interfaz (barra-vida / barra-mana sobre barra-vacia): `kind` = 'hp' | 'mp'. */
export function gaugeHtml(kind, now, max, label) {
    const pct = Math.max(0, Math.min(100, max > 0 ? (now / max) * 100 : 0));
    return `<div class="ui-gauge is-${kind}" data-hud="${kind}" role="img" aria-label="${label} ${now} de ${max}" style="--pct:${pct.toFixed(1)}%">
        <span class="ui-gauge-fill"></span><span class="ui-gauge-text">${now}/${max}</span></div>`;
}

/**
 * La barra de abajo: { name, hp, maxHp, mp, maxMp, gold, potions, manaPotions, quest, points }.
 * Cada dato lleva su data-hud (para leerlo sin depender del texto).
 */
/** Abre un diálogo de la zona solo para verlo (sin onDone: ni marcas ni recompensas). Devuelve si existe. */
export function previewDialogue(key) {
    if (!ZAFIAS_DIALOGUES[key]) return false;
    openDialogue(key);
    return true;
}

export function setHud(h) {
    const el = document.querySelector('#rpgAdventureView .adv-hud');
    if (el) {
        const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        el.innerHTML = `
            <span class="adv-bar-name" data-hud="name">${esc(h.name)}</span>
            <div class="adv-bar-gauges">${gaugeHtml('hp', h.hp, h.maxHp, 'Vida')}${gaugeHtml('mp', h.mp, h.maxMp, 'Maná')}${h.maxEnergy ? gaugeHtml('en', h.energy, h.maxEnergy, 'Energía') : ''}</div>
            <div class="adv-bar-purse">
                <span title="Oro"><img src="img/ui/moneda.webp" alt="Oro"><b data-hud="gold">${h.gold}</b></span>
                <span title="Pociones de vida"><img src="img/ui/pocion-vida.webp" alt="Pociones de vida"><b data-hud="potions">${h.potions}</b></span>
                <span title="Pociones de maná"><img src="img/ui/pocion-mana.webp" alt="Pociones de maná"><b data-hud="mana-potions">${h.manaPotions}</b></span>
            </div>`;
    }
    // Puntos de nivel sin repartir: el botón de Equipo avisa
    const eq = document.querySelector('#rpgAdventureView .adv-equip');
    if (eq) eq.classList.toggle('is-new', (h.points || 0) > 0);
    const q = document.querySelector('#rpgAdventureView .adv-objective');
    if (q) q.textContent = h.quest || '';
}

/** Abre un diálogo de la zona y, al terminar, llama a onDone (lo usa el controlador para encadenar: hablar y luego el menú). */
export function say(key, onDone = null) { openDialogue(key, onDone); }

/** El menú de una parada (ver openMenu). */
export function showMenu(menu, onPick) { openMenu(menu, onPick); }

export function close() {
    cancelAnimationFrame(st.raf);
    st.raf = 0;
    closeDialogue();
    closeMenu();
}

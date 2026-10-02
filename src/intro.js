// =============================================
// 🌅 La introducción (presentación): negro, el despertar en las ruinas, el nombre, la espada y el camino al pueblo.
// El guion vive en src/data/intro.js. Quien la abre decide qué pasa al terminar (main.js: entrar en la aventura).
// =============================================
import { INTRO_STEPS, DEFAULT_HERO_NAME, HERO_NAME_MAX } from './data/intro.js?v=1.8.0';

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Duración de los pasos que van solos (ms). Con «reducir movimiento», casi nada
const AUTO_MS = { wake: 2600, stand: 1100, leave: 1600 };

let el = null;
let state = null;

function bind() {
    const root = document.getElementById('introView');
    if (!root) return false;
    el = {
        root,
        hero: root.querySelector('.intro-hero'),
        thought: root.querySelector('.intro-thought'),
        box: root.querySelector('.intro-box'),
        who: root.querySelector('.intro-who'),
        text: root.querySelector('.intro-text'),
        form: root.querySelector('.intro-name'),
        input: root.querySelector('.intro-name input'),
        item: root.querySelector('.intro-item'),
        next: root.querySelector('.intro-next'),
        skip: root.querySelector('.intro-skip')
    };
    el.input.maxLength = HERO_NAME_MAX;
    root.addEventListener('click', e => {
        if (e.target.closest('.intro-skip')) { finish(); return; }
        if (e.target.closest('.intro-name')) return;   // escribir el nombre no avanza
        advance();
    });
    el.form.addEventListener('submit', e => { e.preventDefault(); rememberName(); });
    document.addEventListener('keydown', e => {
        if (!state || el.root.hidden) return;
        if (e.key === 'Escape') { finish(); return; }
        if ((e.key === 'Enter' || e.key === ' ') && document.activeElement !== el.input) { e.preventDefault(); advance(); }
    });
    return true;
}

const fill = text => text.replace(/\{heroe\}/g, state.name || DEFAULT_HERO_NAME);

function rememberName() {
    const name = el.input.value.trim().replace(/\s+/g, ' ').slice(0, HERO_NAME_MAX);
    state.name = name || DEFAULT_HERO_NAME;
    el.input.blur();
    advance(true);
}

/** Muestra el paso actual. Los que van solos programan el siguiente. */
function show() {
    const step = INTRO_STEPS[state.i];
    if (!step) { finish(); return; }
    const r = el.root;
    r.dataset.step = step.kind;
    el.thought.hidden = !['thought', 'title'].includes(step.kind);
    el.box.hidden = !['say', 'name', 'item'].includes(step.kind);
    el.form.hidden = step.kind !== 'name';
    el.item.hidden = step.kind !== 'item';
    el.next.hidden = step.kind === 'name';
    if (step.kind === 'thought' || step.kind === 'title') {
        el.thought.textContent = fill(step.text);
        el.thought.classList.toggle('is-title', step.kind === 'title');
        // Cada frase vuelve a aparecer (se reinicia su animación)
        el.thought.classList.remove('is-in'); void el.thought.offsetWidth; el.thought.classList.add('is-in');
    }
    if (step.kind === 'wake') r.classList.add('is-awake');
    if (step.kind === 'stand') r.classList.add('is-standing');
    if (step.kind === 'leave') r.classList.add('is-leaving');
    if (step.kind === 'title') r.classList.remove('is-awake');
    if (!el.box.hidden) {
        el.who.textContent = state.name || '¿…?';
        el.text.textContent = fill(step.text || '');
        if (step.item) el.item.innerHTML = `<span class="intro-item-icon" aria-hidden="true">${step.item.icon}</span>`
            + `<span class="intro-item-name">${step.item.name}</span><span class="intro-item-detail">${step.item.detail || ''}</span>`;
    }
    if (step.kind === 'name') {
        el.input.value = state.name && state.name !== DEFAULT_HERO_NAME ? state.name : '';
        setTimeout(() => el.input.focus(), 50);
    }
    clearTimeout(state.timer);
    if (AUTO_MS[step.kind]) state.timer = setTimeout(() => advance(true), reducedMotion() ? 60 : AUTO_MS[step.kind]);
}

/** Pasa al siguiente paso (los automáticos y el nombre solo avanzan solos, con `force`). */
function advance(force = false) {
    if (!state) return;
    const step = INTRO_STEPS[state.i];
    if (!force && (AUTO_MS[step.kind] || step.kind === 'name')) return;
    state.i++;
    show();
}

function finish() {
    if (!state) return;
    clearTimeout(state.timer);
    const { onDone, name } = state;
    state = null;
    el.root.hidden = true;
    el.root.className = 'intro';
    document.body.classList.remove('is-intro');
    if (onDone) onDone(name || DEFAULT_HERO_NAME);
}

/**
 * Reproduce la introducción. opts: { heroSrc (imagen del héroe), name (el que ya tuviera), onDone(nombre) }.
 * Saltarla (botón o Escape) termina al momento, conservando el nombre que hubiera.
 */
export function playIntro(opts = {}) {
    if (!el && !bind()) { if (opts.onDone) opts.onDone(opts.name || DEFAULT_HERO_NAME); return; }
    state = { i: 0, name: opts.name || '', onDone: opts.onDone, timer: 0 };
    if (opts.heroSrc) el.hero.src = opts.heroSrc;
    el.root.className = 'intro';
    el.root.hidden = false;
    document.body.classList.add('is-intro');
    show();
}

export const isPlaying = () => !!state;

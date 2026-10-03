import { HERO_SPRITES as S } from './data/hero-sprites.js?v=1.12.0';

// =============================================
// 🧍 El héroe por capas: su cuerpo (según la armadura que lleva) con la espada puesta en la mano.
// Los fotogramas los hace el Sprite Factory (tools/sprite-factory): img/hero/<armadura>/<anim>_<n>.webp, sin espada, y
// un manifiesto que dice dónde está la mano en cada uno. Aquí se monta cada fotograma en un lienzo (cuerpo + espada
// girada sobre la mano + el puño repintado encima de la empuñadura) y se entrega como una imagen normal: quien la
// pinta (el mapa, el combate, el inventario) sigue usando un <img> y solo tiene que cambiarle el src.
// =============================================
const REF = 240;   // altura del héroe de pie en los fotogramas montados (px)

// Todos los fotogramas montados miden lo mismo (BOX), con los pies siempre en el mismo punto (ax, ay): así cambiar de
// animación no mueve al héroe. La caja es la unión de lo que ocupan el cuerpo y la espada en todas las animaciones.
const BOX = (() => {
    let L = 0, R = 0, U = 0, D = 0;
    const len = REF * S.sword.length;
    for (const A of Object.values(S.anims)) {
        const k = REF / A.heroHeight;
        L = Math.max(L, A.cx * k); R = Math.max(R, (A.w - A.cx) * k); U = Math.max(U, A.baseline * k); D = Math.max(D, (A.h - A.baseline) * k);
        for (const f of A.frames) {
            const hx = (f.x - A.cx) * k, hy = (f.y - A.baseline) * k, r = f.angle * Math.PI / 180;
            // La punta, el pomo y el ancho de la cruz de la espada
            for (const t of [len * (1 - S.sword.grip), -len * S.sword.grip]) {
                const x = hx + Math.cos(r) * t, y = hy + Math.sin(r) * t, m = len * 0.16;
                L = Math.max(L, -(x - m)); R = Math.max(R, x + m); U = Math.max(U, -(y - m)); D = Math.max(D, y + m);
            }
        }
    }
    const pad = 2;
    return { w: Math.ceil(L + R) + pad * 2, h: Math.ceil(U + D) + pad * 2, ax: Math.ceil(L) + pad, ay: Math.ceil(U) + pad };
})();

/**
 * Lo que necesita saber quien pinta al héroe: el tamaño de la imagen, dónde quedan sus pies (fx, fy: de 0 a 1) y
 * cuántas veces su altura mide la imagen (zoom): la imagen lleva aire alrededor para que quepa la espada.
 */
export const HERO_FRAME = { w: BOX.w, h: BOX.h, fx: BOX.ax / BOX.w, fy: BOX.ay / BOX.h, zoom: BOX.h / REF, heroHeight: REF };

export const heroArmors = () => Object.keys(S.armors);
export const heroAnims = () => Object.keys(S.anims);
export const hasHeroLook = armor => !!S.armors[armor];

const _images = new Map();
function load(src) {
    if (!_images.has(src)) {
        _images.set(src, new Promise((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
            im.src = src;
        }));
    }
    return _images.get(src);
}

async function compose(body, sword, A, f) {
    const c = document.createElement('canvas');
    c.width = BOX.w; c.height = BOX.h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const k = REF / A.heroHeight, ox = BOX.ax - A.cx * k, oy = BOX.ay - A.baseline * k;
    const drawBody = () => ctx.drawImage(body, ox, oy, A.w * k, A.h * k);
    drawBody();
    if (sword && f) {
        const hx = ox + f.x * k, hy = oy + f.y * k, len = REF * S.sword.length, w = len * sword.naturalWidth / sword.naturalHeight;
        // La espada está dibujada con la empuñadura arriba y la hoja hacia abajo: se gira lo que falte hasta su ángulo
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate((f.angle - 90) * Math.PI / 180);
        ctx.drawImage(sword, -w / 2, -len * S.sword.grip, w, len);
        ctx.restore();
        // El puño, por encima de la empuñadura
        ctx.save();
        ctx.beginPath();
        ctx.arc(hx, hy, REF * S.sword.fist, 0, Math.PI * 2);
        ctx.clip();
        drawBody();
        ctx.restore();
    }
    return new Promise(resolve => c.toBlob(b => resolve(URL.createObjectURL(b)), 'image/png'));
}

const _sets = new Map();
/**
 * Monta todos los fotogramas de un aspecto: { armor: id de S.armors, weapon: src de la imagen de la espada | null }.
 * → { key, armor, weapon, frames: { walk: [url…], attack: […], … } }. Se guarda: pedir el mismo aspecto no lo rehace.
 */
export function prepareHero({ armor, weapon = null }) {
    const look = S.armors[armor] ? armor : Object.keys(S.armors)[0];
    const key = `${look}|${weapon || ''}`;
    if (!_sets.has(key)) {
        _sets.set(key, (async () => {
            const sword = weapon ? await load(weapon).catch(() => null) : null;
            const frames = {};
            for (const [name, A] of Object.entries(S.anims)) {
                frames[name] = await Promise.all(A.frames.map(async (f, i) => compose(await load(`${S.armors[look].dir}/${name}_${i + 1}.webp`), sword, A, f)));
            }
            return { key, armor: look, weapon, frames };
        })());
    }
    return _sets.get(key);
}

/**
 * Anima al héroe en un <img>: reposo, caminar y acciones (atacar, lanzar). El <img> lleva en data-* lo que enseña
 * (armadura, espada, animación y fotograma), para leerlo sin mirar píxeles.
 */
export class HeroAnimator {
    constructor(img) {
        this.img = img;
        this.set = null;
        this.mode = 'idle';
        this.timer = 0;
        this.token = 0;
    }

    /** Cambia de armadura o de espada. Devuelve una promesa que se cumple cuando el aspecto nuevo ya está a la vista. */
    async setLook(look) {
        const mine = ++this.token;
        const set = await prepareHero(look);
        if (mine !== this.token) return;      // llegó otro cambio mientras se montaba
        this.set = set;
        this.img.dataset.armor = set.armor;
        this.img.dataset.weapon = look.weaponId || '';
        this.img.width = BOX.w; this.img.height = BOX.h;
        if (this.mode === 'walk') this._loop('walk'); else this.idle();
    }

    _show(anim, i) {
        if (!this.set) return;
        this.img.src = this.set.frames[anim][i];
        this.img.dataset.anim = anim;
        this.img.dataset.frame = String(i + 1);
    }
    _stop() { clearTimeout(this.timer); this.timer = 0; }

    /** De pie (respira por CSS: la clase is-idle). */
    idle() {
        this._stop();
        this.mode = 'idle';
        this.img.classList.add('is-idle');
        this._show(S.idle.anim, S.idle.frame);
    }

    _loop(anim) {
        this._stop();
        const A = S.anims[anim];
        let n = 0;
        const step = () => { this._show(anim, A.order[n % A.order.length]); n++; this.timer = setTimeout(step, 1000 / A.fps); };
        step();
    }

    /** Camina (on) o se para. */
    walk(on) {
        if (on && this.mode === 'walk') return;
        if (!on) { if (this.mode === 'walk') this.idle(); return; }
        this.mode = 'walk';
        this.img.classList.remove('is-idle');
        this._loop('walk');
    }

    /** Lo que dura una acción (ms) y cuándo llega su momento fuerte (el golpe: el penúltimo fotograma). */
    static timing(anim, speed = 1) {
        const A = S.anims[anim];
        const hold = A.order.map((_, n) => (A.hold ? A.hold[n] : 1000 / A.fps) * speed);
        const impact = hold.slice(0, Math.max(0, hold.length - 2)).reduce((a, b) => a + b, 0);
        return { total: hold.reduce((a, b) => a + b, 0), impact, hold };
    }

    /** Hace una acción una vez (attack, cast) y vuelve al reposo. Devuelve lo que dura. */
    play(anim, speed = 1) {
        if (!S.anims[anim] || !this.set) return 0;
        this._stop();
        this.mode = anim;
        this.img.classList.remove('is-idle');
        const A = S.anims[anim], { hold, total } = HeroAnimator.timing(anim, speed);
        let n = 0;
        const step = () => {
            if (n >= A.order.length) { this.idle(); return; }
            this._show(anim, A.order[n]);
            this.timer = setTimeout(step, hold[n++]);
        };
        step();
        return total;
    }
}

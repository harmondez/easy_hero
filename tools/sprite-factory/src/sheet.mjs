// =============================================
// 🎞️ Sprite Factory · la hoja: de una cuadrícula de poses a fotogramas con la mano localizada
//
// Una hoja de animación trae N figuras del mismo personaje sobre blanco (o ya transparente). El personaje empuña un
// PALO MAGENTA en lugar de un arma: es un marcador que dice dónde está la mano y hacia dónde apunta el arma en cada
// fotograma. Aquí se separan las figuras, se lee el palo (posición y giro), se borra y se alinean los fotogramas.
// Todo es determinista: la misma hoja da siempre los mismos fotogramas.
// =============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { removeWhiteBackground } from '../../image-generator/src/remove-bg.mjs';

sharp.cache(false);
const here = path.dirname(fileURLToPath(import.meta.url));
const BG = JSON.parse(fs.readFileSync(path.join(here, '../../image-generator/config/factory.json'), 'utf8')).background_removal;
const SOLID = 40;   // alfa a partir del cual un píxel cuenta como figura

/** Carga una hoja y le quita el fondo blanco (si ya viene transparente, se deja como está). → { px, W, H } RGBA crudo */
export async function loadSheet(input) {
    const buf = Buffer.isBuffer(input) ? input : fs.readFileSync(input);
    const probe = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = probe.info;
    const corners = [0, W - 1, (H - 1) * W, H * W - 1].map(i => probe.data[i * 4 + 3]);
    if (corners.every(a => a < SOLID)) return { px: probe.data, W, H };
    // A veces la IA dibuja las rayas de la cuadrícula aunque se le pida que no: una fila o columna casi entera de
    // píxeles que no son blancos es una raya. Se borra (respetando el palo magenta, que puede cruzarla), porque si no
    // uniría dos figuras o el palo con la raya.
    const rgb = await sharp(buf).removeAlpha().raw().toBuffer();
    const ink = i => !(rgb[i * 3] > 235 && rgb[i * 3 + 1] > 235 && rgb[i * 3 + 2] > 235);
    const wipe = i => { if (!magenta(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2], 255)) rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = 255; };
    // Una raya es casi toda la fila (o columna) Y de un solo color: una columna que atraviesa dos figuras apiladas
    // también está llena de tinta, pero de muchos colores.
    const isLine = (len, at) => {
        let n = 0, sum = 0, sq = 0;
        for (let k = 0; k < len; k++) { const i = at(k); if (!ink(i)) continue; const v = (rgb[i * 3] + rgb[i * 3 + 1] + rgb[i * 3 + 2]) / 3; n++; sum += v; sq += v * v; }
        return n > len * 0.9 && Math.sqrt(Math.max(0, sq / n - (sum / n) ** 2)) < 28;
    };
    let lines = 0;
    for (let y = 0; y < H; y++) if (isLine(W, x => y * W + x)) { lines++; for (let x = 0; x < W; x++) wipe(y * W + x); }
    for (let x = 0; x < W; x++) if (isLine(H, y => y * W + x)) { lines++; for (let y = 0; y < H; y++) wipe(y * W + x); }
    const clean = lines ? await sharp(rgb, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer() : buf;
    const cut = await removeWhiteBackground(clean, BG);
    const { data } = await sharp(cut.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return { px: data, W, H };
}

/** Las `count` figuras de la hoja (manchas conexas más grandes), en orden de lectura de una cuadrícula de `rows` filas. */
export function findFigures({ px, W, H }, count, rows) {
    const label = new Int32Array(W * H).fill(-1);
    const blobs = [];
    for (let s = 0; s < W * H; s++) {
        if (px[s * 4 + 3] < SOLID || label[s] !== -1) continue;
        const id = blobs.length, stack = [s];
        const b = { id, n: 0, x0: W, y0: H, x1: 0, y1: 0 };
        label[s] = id;
        while (stack.length) {
            const i = stack.pop(), x = i % W, y = (i / W) | 0;
            b.n++; b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x); b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                const n = ny * W + nx;
                if (label[n] === -1 && px[n * 4 + 3] >= SOLID) { label[n] = id; stack.push(n); }
            }
        }
        blobs.push(b);
    }
    const figs = blobs.sort((a, b) => b.n - a.n).slice(0, count);
    // Una figura de verdad no es una mota: si la más pequeña es diminuta frente a la mayor, faltan figuras
    if (figs.length < count || figs[figs.length - 1].n < figs[0].n * 0.25) {
        throw new Error(`Se ven ${figs.filter(f => f.n >= figs[0].n * 0.25).length} figuras en la hoja y hacen falta ${count}.`);
    }
    const row = b => Math.min(rows - 1, Math.floor((b.y0 + b.y1) / 2 / (H / rows)));
    figs.sort((a, b) => row(a) - row(b) || (a.x0 + a.x1) - (b.x0 + b.x1));
    return { figs, label };
}

/** Deja solo la mancha conexa más grande de un RGBA (y las que sean al menos un 3 % de ella): borra las motas. */
function dropSpecks(buf, w, h) {
    const lab = new Int32Array(w * h).fill(-1), sizes = [];
    for (let s0 = 0; s0 < w * h; s0++) {
        if (buf[s0 * 4 + 3] <= SOLID || lab[s0] !== -1) continue;
        const id = sizes.length, stack = [s0];
        let n = 0;
        lab[s0] = id;
        while (stack.length) {
            const i = stack.pop(), x = i % w, y = (i / w) | 0;
            n++;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const q = ny * w + nx;
                if (lab[q] === -1 && buf[q * 4 + 3] > SOLID) { lab[q] = id; stack.push(q); }
            }
        }
        sizes.push(n);
    }
    const keep = Math.max(...sizes) * 0.03;
    for (let i = 0; i < w * h; i++) if (lab[i] !== -1 && sizes[lab[i]] < keep) buf.fill(0, i * 4, i * 4 + 4);
}

// Magenta del marcador: rojo y azul altos, verde bajo
function magenta(r, g, b, a) { return a > SOLID && r - g > 70 && b - g > 70 && Math.abs(r - b) < 110 && r > 140 && b > 140; }

/**
 * Lee una figura: su cuerpo (RGBA, con el palo ya borrado), la mano y el giro del arma.
 * marker: 'required' (falla si no hay palo) · 'optional' (sin palo, hand = null).
 * → { rgba, w, h, hand: {x,y}|null, angle, how, body: {x0,y0,x1,y1}, cxMass, cxTorso }  (coordenadas de la figura)
 */
export function readFigure({ px, W }, label, fig, { marker = 'required' } = {}) {
    const fw = fig.x1 - fig.x0 + 1, fh = fig.y1 - fig.y0 + 1;
    const rgba = Buffer.alloc(fw * fh * 4);
    const mag = new Uint8Array(fw * fh);
    const pts = [];
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
        const src = (fig.y0 + y) * W + fig.x0 + x;
        if (label[src] !== fig.id) continue;
        px.copy(rgba, (y * fw + x) * 4, src * 4, src * 4 + 4);
        if (magenta(px[src * 4], px[src * 4 + 1], px[src * 4 + 2], px[src * 4 + 3])) { mag[y * fw + x] = 1; pts.push([x, y]); }
    }
    let hand = null, angle = null, how = 'sin palo', filled = rgba;
    if (pts.length >= 40) {
        // Recta por componentes principales
        const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        let sxx = 0, sxy = 0, syy = 0;
        for (const [x, y] of pts) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); syy += (y - my) ** 2; }
        const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
        const ux = Math.cos(th), uy = Math.sin(th);
        const proj = pts.map(([x, y]) => (x - mx) * ux + (y - my) * uy);
        const t0 = Math.min(...proj), t1 = Math.max(...proj);
        const thick = Math.max(2, Math.round(pts.length / (t1 - t0 + 1)));
        // Ocupación a lo largo de la recta: el hueco más largo es lo que tapa el puño
        const occ = new Uint8Array(Math.ceil(t1 - t0) + 1);
        for (const t of proj) occ[Math.round(t - t0)] = 1;
        let gap = null;
        for (let i = 0, start = -1; i < occ.length; i++) {
            if (!occ[i]) { if (start < 0) start = i; continue; }
            if (start >= 0 && (!gap || i - start > gap.len)) gap = { a: start, len: i - start };
            start = -1;
        }
        const solid = (x, y) => { x = Math.round(x); y = Math.round(y); return x >= 0 && y >= 0 && x < fw && y < fh && rgba[(y * fw + x) * 4 + 3] > SOLID && !mag[y * fw + x]; };
        let handT;
        if (gap && gap.len >= 5) { handT = t0 + gap.a + gap.len / 2; how = 'hueco del puño'; }
        else {
            // Sin hueco: el puño está en el extremo que da contra el cuerpo (se cuenta cuánto cuerpo hay justo más allá)
            const beyond = (end, o) => { let n = 0; for (let d = 2; d <= 14; d += 2) for (let w = -6; w <= 6; w += 3) if (solid(mx + ux * (end + o * d) - uy * w, my + uy * (end + o * d) + ux * w)) n++; return n; };
            handT = beyond(t0, -1) >= beyond(t1, 1) ? t0 : t1;
            how = 'extremo junto al cuerpo';
        }
        const dir = (t1 - handT) >= (handT - t0) ? 1 : -1;      // la hoja apunta hacia el lado largo del palo
        hand = { x: mx + ux * handT, y: my + uy * handT };
        angle = Math.atan2(uy * dir, ux * dir) * 180 / Math.PI;
        // Borrar el palo y su borde suavizado (rosado)…
        const erase = new Uint8Array(fw * fh);
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
            if (!mag[y * fw + x]) continue;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= fw || ny >= fh) continue;
                const j = ny * fw + nx;
                if (mag[j] || (rgba[j * 4] - rgba[j * 4 + 1] > 35 && rgba[j * 4 + 2] - rgba[j * 4 + 1] > 35)) erase[j] = 1;
            }
        }
        // …y, pegado a su recta, su sombra (morado oscuro) y las motas de fondo blanco encerradas entre el puño y el palo
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
            const j = y * fw + x;
            if (erase[j] || rgba[j * 4 + 3] <= SOLID) continue;
            const t = (x - mx) * ux + (y - my) * uy, dist = Math.abs(-(x - mx) * uy + (y - my) * ux);
            if (t < t0 - 3 || t > t1 + 3 || dist > thick + 3) continue;
            const r = rgba[j * 4], g = rgba[j * 4 + 1], b = rgba[j * 4 + 2];
            if ((r - g > 22 && b - g > 22) || (r > 232 && g > 232 && b > 232)) erase[j] = 1;
        }
        // Donde el palo cruzaba por delante del cuerpo, se rellena con el color de al lado
        const reach = thick + 6, nx_ = -Math.sin(th), ny_ = Math.cos(th);
        filled = Buffer.from(rgba);
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
            const j = y * fw + x;
            if (!erase[j]) continue;
            const look = o => { for (let d = 1; d <= reach; d++) { const qx = Math.round(x + nx_ * d * o), qy = Math.round(y + ny_ * d * o); if (qx < 0 || qy < 0 || qx >= fw || qy >= fh) return null; const q = qy * fw + qx; if (!erase[q]) return rgba[q * 4 + 3] > SOLID ? { q, d } : null; } return null; };
            const a = look(1), b = look(-1);
            if (a && b) rgba.copy(filled, j * 4, (a.d <= b.d ? a.q : b.q) * 4, (a.d <= b.d ? a.q : b.q) * 4 + 4);
            else filled.fill(0, j * 4, j * 4 + 4);
        }
    } else if (marker === 'required') throw new Error(`no se ve el palo magenta (${pts.length} píxeles)`);
    // Al borrar el palo pueden quedar motas sueltas (un resto de la punta, lejos del cuerpo): se quita todo lo que no
    // esté unido al cuerpo, que es la mancha más grande. Si no, esas motas ensancharían el recuadro del héroe.
    if (hand) dropSpecks(filled, fw, fh);
    // El cuerpo que queda: recuadro, centro de masa y centro del torso (el 40 % de arriba)
    let x0 = fw, x1 = 0, y0 = fh, y1 = 0, sum = 0, n = 0;
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (filled[(y * fw + x) * 4 + 3] > SOLID) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); sum += x; n++; }
    let ts = 0, tn = 0;
    const top = y0 + (y1 - y0) * 0.4;
    for (let y = y0; y < top; y++) for (let x = 0; x < fw; x++) if (filled[(y * fw + x) * 4 + 3] > SOLID) { ts += x; tn++; }
    return { rgba: filled, w: fw, h: fh, hand, angle, how, body: { x0, y0, x1, y1 }, cxMass: sum / n, cxTorso: tn ? ts / tn : sum / n };
}

/** Lee una hoja entera: sus figuras en orden, ya leídas. opts: { frames, rows, marker } */
export async function readSheet(input, { frames, rows, marker = 'required' }) {
    const img = await loadSheet(input);
    const { figs, label } = findFigures(img, frames, rows);
    return figs.map((fig, k) => {
        try { return readFigure(img, label, fig, { marker }); }
        catch (e) { throw new Error(`Fotograma ${k + 1}: ${e.message}`); }
    });
}

// --- Tintes: otra armadura sin dibujar nada. Se tiñe el metal (píxeles grises: poca saturación); lo demás no se toca ---
// mul: cuánto se oscurece o aclara · tint: el tono (r, g, b) · contrast: cuánto se separan luces y sombras
export const TINTS = {
    negra:  { mul: 0.42, tint: [0.92, 0.96, 1.12], contrast: 1.25 },
    oro:    { mul: 1.02, tint: [1.28, 1.02, 0.42], contrast: 1.1 },
    bronce: { mul: 0.86, tint: [1.22, 0.86, 0.52], contrast: 1.1 },
    sangre: { mul: 0.7,  tint: [1.45, 0.42, 0.42], contrast: 1.2 },
    jade:   { mul: 0.82, tint: [0.55, 1.2, 0.8],   contrast: 1.15 }
};
/** Tiñe el metal de un fotograma RGBA (lo modifica). Metal = gris: saturación baja, ni contorno negro ni blanco puro. */
export function tintMetal(buf, t) {
    for (let i = 0; i < buf.length; i += 4) {
        if (buf[i + 3] < SOLID) continue;
        const r = buf[i], g = buf[i + 1], b = buf[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if ((max ? (max - min) / max : 0) > 0.2 || max < 58) continue;
        const v = ((r + g + b) / 3 / 255 - 0.5) * t.contrast + 0.5;
        for (let c = 0; c < 3; c++) buf[i + c] = Math.max(0, Math.min(255, Math.round(v * 255 * t.mul * t.tint[c])));
    }
    return buf;
}

/** Huella de color de un fotograma: qué parte de sus píxeles cae en cada uno de 12 tonos (solo los que tienen color). */
export function colorPrint(fig) {
    const h = new Float64Array(12);
    let n = 0;
    for (let i = 0; i < fig.rgba.length; i += 4) {
        if (fig.rgba[i + 3] < SOLID) continue;
        n++;
        const r = fig.rgba[i], g = fig.rgba[i + 1], b = fig.rgba[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
        if (max < 50 || d / max < 0.25) continue;      // gris, negro o blanco: no tiene tono
        const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
        h[Math.floor(hue * 2) % 12]++;
    }
    return h.map(v => v / (n || 1));
}
/** La huella de color de una hoja entera (la media de sus fotogramas). */
export function sheetPrint(figs) {
    const prints = figs.map(colorPrint);
    return Array.from({ length: 12 }, (_, k) => prints.reduce((s, p) => s + p[k], 0) / prints.length);
}
/** Cuánto se diferencian dos huellas de color (0 = iguales; > 0,2 suele ser otra ropa). */
export const printGap = (a, b) => a.reduce((s, v, k) => s + Math.abs(v - b[k]), 0);

/**
 * ¿Algún fotograma lleva un color que los demás no llevan? (una capa azul en una hoja de capa verde). Por fotograma,
 * cuánto más de un tono lleva que lo normal en los demás (la mediana): ~0 = todo igual; > 0,08 suele ser una prenda
 * de otro color.
 */
export function colorDrift(figs) {
    const prints = figs.map(colorPrint);
    return prints.map((p, i) => {
        const others = prints.filter((_, j) => j !== i);
        return Math.max(...p.map((v, k) => v - others.map(o => o[k]).sort((x, y) => x - y)[Math.floor(others.length / 2)]));
    });
}

/**
 * Coloca las figuras de una hoja BASE en un lienzo común: mismos pies y mismo centro (de masa o de torso).
 * align: 'masa' (un ataque, que se echa hacia delante) · 'torso' (caminar: la cabeza y el pecho no deben bailar).
 * standing: índice del fotograma en el que el héroe está de pie (su altura es la medida de todo). margin: aire de más
 * a los lados y arriba (parte de la altura), para que quepan capas más anchas al vestir la hoja.
 * → { w, h, cx, baseline, heroHeight, frames: [{ x, y, angle }], place: [{ left, top }] }  (cx, baseline: los pies)
 */
export function layoutBase(figs, { align = 'masa', standing = 0, margin = 0.1 } = {}) {
    const cx = f => (align === 'torso' ? f.cxTorso : f.cxMass);
    const heroHeight = figs[standing].body.y1 - figs[standing].body.y0;
    const pad = Math.round(heroHeight * margin);
    const left = Math.ceil(Math.max(...figs.map(f => cx(f) - f.body.x0))) + pad;
    const right = Math.ceil(Math.max(...figs.map(f => f.body.x1 - cx(f)))) + pad;
    const up = Math.max(...figs.map(f => f.body.y1 - f.body.y0)) + pad;
    const w = left + right, h = up + 4, baseline = h - 4;
    const place = figs.map(f => ({ left: Math.round(left - cx(f)), top: baseline - f.body.y1 }));
    const frames = figs.map((f, i) => (f.hand ? { x: Math.round(f.hand.x + place[i].left), y: Math.round(f.hand.y + place[i].top), angle: Math.round(f.angle * 10) / 10 } : null));
    return { w, h, cx: left, baseline, heroHeight, frames, place };
}

/**
 * Coloca las figuras de una hoja VESTIDA sobre el lienzo de su hoja base, para que compartan los puntos de la mano:
 * si trae palo, cada fotograma se pone con su mano donde la tiene la base; si no, por los pies y el centro como la base.
 * → { scale, place: [{ left, top }] }  (scale: cuánto hay que escalar la hoja vestida para igualar la altura del héroe)
 */
export function layoutOnBase(figs, base, { align = 'masa', standing = 0 } = {}) {
    const height = figs[standing].body.y1 - figs[standing].body.y0;
    const raw = base.heroHeight / height;
    const scale = Math.abs(raw - 1) > 0.02 ? raw : 1;      // un 2 % de diferencia no merece remuestrear
    const cx = f => (align === 'torso' ? f.cxTorso : f.cxMass);
    const own = layoutBase(figs, { align, standing, margin: 0 });
    const place = figs.map((f, i) => {
        if (f.hand && base.frames[i]) return { left: Math.round(base.frames[i].x - f.hand.x * scale), top: Math.round(base.frames[i].y - f.hand.y * scale) };
        // Sin palo: mismos pies; en horizontal, el centro donde lo tiene la base (su lienzo guarda el mismo margen)
        return { left: Math.round((base.w - own.w * scale) / 2 + own.place[i].left * scale), top: Math.round(base.baseline - f.body.y1 * scale) };
    });
    return { scale, place, cx };
}

/** Un fotograma en su lienzo (PNG transparente). fig: la figura; place: dónde va; scale: cuánto se escala. */
export async function renderFrame(fig, place, { w, h }, scale = 1) {
    const bw = fig.body.x1 - fig.body.x0 + 1, bh = fig.body.y1 - fig.body.y0 + 1;
    let img = sharp(fig.rgba, { raw: { width: fig.w, height: fig.h, channels: 4 } }).extract({ left: fig.body.x0, top: fig.body.y0, width: bw, height: bh });
    let left = place.left + Math.round(fig.body.x0 * scale), top = place.top + Math.round(fig.body.y0 * scale);
    let buf = await (scale === 1 ? img.png() : img.resize(Math.round(bw * scale), Math.round(bh * scale), { kernel: 'nearest' }).png()).toBuffer();
    // Lo que se salga del lienzo se recorta (no debería: el lienzo de la base lleva margen)
    const meta = await sharp(buf).metadata();
    const cl = Math.max(0, -left), ct = Math.max(0, -top), cr = Math.max(0, left + meta.width - w), cb = Math.max(0, top + meta.height - h);
    const clipped = cl + ct + cr + cb > 0;
    if (clipped) { buf = await sharp(buf).extract({ left: cl, top: ct, width: meta.width - cl - cr, height: meta.height - ct - cb }).png().toBuffer(); left += cl; top += ct; }
    const png = await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: buf, left, top }]).png().toBuffer();
    return { png, clipped };
}

// =============================================
// ✂️ Remove Background, en local y sin servicios externos (sharp, que ya usa el proyecto).
// Las reglas obligan a generar sobre blanco puro, así que basta con:
//   1. Rellenar desde los bordes todo lo «casi blanco» conectado con el exterior → fondo (alfa 0).
//      Los blancos INTERIORES del personaje (ojos, dientes, brillos) no se tocan: no están conectados al borde.
//   2. Suavizar el borde: los píxeles claros que tocan el fondo reciben alfa parcial y se les «quita el blanco»
//      (descontaminación de color), para que no quede halo blanco sobre fondos oscuros.
// Mantiene la resolución original.
// =============================================
import sharp from 'sharp';

sharp.cache(false);

export async function removeWhiteBackground(input, { white_threshold = 236, edge_contrast = 24, edge_band = 3, hole_min_ratio = 0.0004 } = {}) {
    let holes = 0;
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const px = new Uint8ClampedArray(data);
    const minc = i => Math.min(px[i], px[i + 1], px[i + 2]);


    // 1) Relleno desde los bordes (BFS sobre píxeles casi blancos)
    const bg = new Uint8Array(w * h);
    const queue = new Int32Array(w * h);
    let head = 0, tail = 0;
    const push = p => { if (!bg[p] && minc(p * 4) >= white_threshold) { bg[p] = 1; queue[tail++] = p; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    const flood = () => {
        while (head < tail) {
            const p = queue[head++];
            const x = p % w, y = (p / w) | 0;
            if (x > 0) push(p - 1);
            if (x < w - 1) push(p + 1);
            if (y > 0) push(p - w);
            if (y < h - 1) push(p + w);
        }
    };
    flood();

    // 1b) Huecos interiores: el blanco que queda encerrado entre brazos, piernas o arma tampoco es del personaje.
    //     Una zona casi blanca INTERIOR se trata como fondo si es grande (los ojos, dientes o brillos son pequeños).
    const minHole = Math.max(64, Math.round(w * h * hole_min_ratio));
    const seen = new Uint8Array(w * h);
    const comp = [];
    for (let s = 0; s < w * h; s++) {
        if (bg[s] || seen[s] || minc(s * 4) < white_threshold) continue;
        comp.length = 0;
        const stack = [s];
        seen[s] = 1;
        while (stack.length) {
            const p = stack.pop();
            comp.push(p);
            const x = p % w, y = (p / w) | 0;
            for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
                if (q >= 0 && !seen[q] && !bg[q] && minc(q * 4) >= white_threshold) { seen[q] = 1; stack.push(q); }
            }
        }
        if (comp.length >= minHole) for (const p of comp) { bg[p] = 1; holes++; }
    }

    // 2) Franja del borde: distancia (en píxeles, hasta edge_band) de cada píxel del sujeto al fondo.
    //    Ahí viven los píxeles de transición (mezcla de contorno y blanco) que, si no se tratan, dejan un halo claro.
    const dist = new Uint8Array(w * h);
    let frontier = [];
    for (let p = 0; p < w * h; p++) if (bg[p]) frontier.push(p);
    for (let d = 1; d <= edge_band && frontier.length; d++) {
        const next = [];
        for (const p of frontier) {
            const x = p % w, y = (p / w) | 0;
            for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
                if (q >= 0 && !bg[q] && !dist[q]) { dist[q] = d; next.push(q); }
            }
        }
        frontier = next;
    }

    // 3) Alfa: fondo transparente; en la franja, cuanto más claro el píxel más transparente, y se le quita el blanco
    //    de la mezcla (descontaminación). Dentro de la figura no se toca nada.
    //    El «color real» de un píxel del borde es el de su vecino más oscuro del sujeto (normalmente el contorno):
    //    con él se estima cuánto blanco lleva mezclado, y así no queda un halo gris.
    const orig = new Uint8ClampedArray(px);
    const mOrig = p => Math.min(orig[p * 4], orig[p * 4 + 1], orig[p * 4 + 2]);
    let removed = 0;
    for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        if (bg[p]) { px[i + 3] = 0; removed++; continue; }
        const m = mOrig(p);
        if (dist[p]) {
            const x = p % w, y = (p / w) | 0;
            let ref = m;
            for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const q = ny * w + nx;
                if (!bg[q]) ref = Math.min(ref, mOrig(q));
            }
            if (m - ref < edge_contrast) continue;   // casi igual que su contorno: es color propio, se respeta
            const a = Math.max(0, Math.min(1, (255 - m) / (255 - ref)));   // cuanto más blanco, más transparente
            if (a <= 0.02) { px[i + 3] = 0; removed++; continue; }
            for (let c = 0; c < 3; c++) px[i + c] = (px[i + c] - 255 * (1 - a)) / a;   // quitar la mezcla con el blanco
            px[i + 3] = Math.round(a * 255);
        }
    }
    const png = await sharp(Buffer.from(px.buffer), { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    return { png, width: w, height: h, removedRatio: removed / (w * h), interiorHolesPx: holes };
}

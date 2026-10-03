// =============================================
// 🛤️ Traza solos los caminos de una zona: los recodos de cada línea a trazos siguen la tierra pintada del mapa.
// 1. Máscara de camino a tamaño lógico. El color del camino se APRENDE de la propia zona: las paradas y los cruces
//    se ponen sobre el camino, así que su color abunda alrededor de ellos mucho más que en el resto del mapa. Vale
//    igual para tierra, nieve, piedra o arena. Se difumina: el centro del camino sale más barato que el borde.
// 2. Coste por píxel: camino ≈ 1, bosque ≈ 30, agua ≈ 130 (los puentes se cruzan, pero no se nada).
// 3. Entre las dos paradas de cada camino, la ruta más barata (A*), sin salir del encuadre de la escena.
// 4. Se suaviza, se endereza donde se puede ir recto («tirar de la cuerda») y se simplifica a unos pocos recodos
//    (Ramer-Douglas-Peucker). Se guarda en src/data/zones/zafias-paths.js.
// Solo se trazan los caminos SIN recodos escritos a mano en zafias.js: escribirlos a mano es la forma de corregir uno.
// Uso: node tools/trace-paths.mjs [--comparar] [--captura carpeta] [--mascara archivo.png] [--color tierra]
//      --comparar  traza también los escritos a mano y dice cuánto se separa cada uno (no guarda nada)
//      --captura   deja una imagen por escena con los caminos (cian = automático, magenta = a mano)
//      --mascara   guarda la máscara de camino aprendida (blanco = camino), para ver qué ha entendido
//      --color tierra  usa la regla fija de Zafias (marrón claro) en vez de aprender el color
// =============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { ZAFIAS } from '../src/data/zones/zafias.js';

sharp.cache(false);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const compare = args.includes('--comparar');
const shotDir = args.includes('--captura') ? path.resolve(args[args.indexOf('--captura') + 1]) : null;
const zone = ZAFIAS;
// Cada «lienzo» es una imagen con su tamaño lógico: el mapa de la zona, o el cuadro propio de una escena (`image`)
let W = zone.width, H = zone.height, cost = null, canvasImage = zone.image;
const EPSILON = 3.5;        // px lógicos que puede separarse la línea simplificada de la ruta encontrada
const PAD = 16;             // la ruta puede salirse un poco del encuadre, no más
const BLUR = 5;             // difuminado de la máscara: cuanto más, más se centra la ruta en caminos anchos
const SMOOTH = 6;           // media móvil (± puntos) que quita la escalera de la cuadrícula antes de simplificar
const SAMPLE = 5;           // radio (px lógicos) alrededor de cada parada y cruce del que se aprende el color del camino
const colorMode = args.includes('--color') ? args[args.indexOf('--color') + 1] : 'aprendido';
const maskOut = args.includes('--mascara') ? path.resolve(args[args.indexOf('--mascara') + 1]) : null;

// --- 1-2. Mapa de costes (de un lienzo: su imagen y las escenas que viven en ella) ---
async function loadCanvas(image, w, h, scenes) {
W = w; H = h; canvasImage = image;
const img = sharp(path.join(root, image)).resize(W, H, { fit: 'fill' }).removeAlpha();
const px = await img.raw().toBuffer();
const dirt = Buffer.alloc(W * H), water = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) water[i] = px[i * 3 + 2] > px[i * 3] + 25 && px[i * 3 + 2] > px[i * 3 + 1] + 5 ? 1 : 0;

if (colorMode === 'tierra') {
    // Regla fija para Zafias: tierra marrón clara
    for (let i = 0; i < W * H; i++) {
        const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2];
        dirt[i] = r > 140 && g > 105 && b < 130 && r - b > 50 && r >= g && g - b > 25 && r - g < 70 ? 255 : 0;
    }
} else {
    // Aprendido (sirve para cualquier mapa: nieve, piedra, arena…): las paradas y los cruces se ponen SOBRE el
    // camino, así que el color del camino es el que abunda alrededor de ellos mucho más que en el resto del mapa.
    // Histograma de colores (16 niveles por canal) cerca de los puntos frente al del mapa entero.
    const bin = i => ((px[i * 3] >> 4) << 8) | ((px[i * 3 + 1] >> 4) << 4) | (px[i * 3 + 2] >> 4);
    const near = new Float64Array(4096), all = new Float64Array(4096);
    for (let i = 0; i < W * H; i++) all[bin(i)]++;
    let nNear = 0;
    for (const sc of scenes) {
        for (const p of [...Object.values(sc.forks || {}), ...sc.points]) {
            for (let dy = -SAMPLE; dy <= SAMPLE; dy++) for (let dx = -SAMPLE; dx <= SAMPLE; dx++) {
                const x = Math.round(p.x) + dx, y = Math.round(p.y) + dy;
                if (x >= 0 && y >= 0 && x < W && y < H) { near[bin(y * W + x)]++; nNear++; }
            }
        }
    }
    const score = new Float32Array(4096);
    for (let k = 0; k < 4096; k++) {
        const ratio = (near[k] / nNear + 1e-5) / (all[k] / (W * H) + 1e-5);
        score[k] = Math.max(0, Math.min(1, (Math.log2(ratio) - 1) / 2));   // ×2 más frecuente → empieza; ×8 → camino seguro
    }
    for (let i = 0; i < W * H; i++) dirt[i] = Math.round(score[bin(i)] * 255);
}
if (maskOut) await sharp(dirt, { raw: { width: W, height: H, channels: 1 } }).png().toFile(image === zone.image ? maskOut : `${maskOut}.${path.basename(image, path.extname(image))}.png`);
const road = await sharp(dirt, { raw: { width: W, height: H, channels: 1 } }).blur(BLUR).raw().toBuffer();
cost = new Float32Array(W * H);
for (let i = 0; i < W * H; i++) {
    const off = 1 - road[i] / 255;                     // 0 en el centro del camino, 1 lejos de él
    cost[i] = 1 + 29 * off * off + (water[i] ? 100 : 0);
}
}

// --- 3. A* en 8 direcciones ---
function astar(from, to, box) {
    const x0 = Math.max(0, box.x - PAD), y0 = Math.max(0, box.y - PAD);
    const x1 = Math.min(W - 1, box.x + box.w + PAD), y1 = Math.min(H - 1, box.y + box.h + PAD);
    const clampX = x => Math.min(x1, Math.max(x0, Math.round(x))), clampY = y => Math.min(y1, Math.max(y0, Math.round(y)));
    const s = clampY(from.y) * W + clampX(from.x), t = clampY(to.y) * W + clampX(to.x);
    const tx = t % W, ty = (t / W) | 0;
    const g = new Float32Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1);
    const heap = [];        // montículo binario de [f, índice]
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const h = i => { const dx = Math.abs(i % W - tx), dy = Math.abs(((i / W) | 0) - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    g[s] = 0; push(h(s), s);
    const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (heap.length) {
        const [, i] = pop();
        if (i === t) break;
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy, len] of D) {
            const nx = x + dx, ny = y + dy;
            if (nx < x0 || nx > x1 || ny < y0 || ny > y1) continue;
            // fround: g es de 32 bits; sin redondear igual, el mismo valor «mejoraría» una y otra vez y no acabaría nunca
            const n = ny * W + nx, ng = Math.fround(g[i] + len * (cost[i] + cost[n]) / 2);
            if (ng < g[n]) { g[n] = ng; prev[n] = i; push(ng + h(n), n); }
        }
    }
    const out = [];
    for (let i = t; i !== -1; i = prev[i]) out.push({ x: i % W, y: (i / W) | 0 });
    return out.reverse();
}

// --- 4. Suavizado (media móvil, sin mover los extremos) y simplificación: Ramer-Douglas-Peucker ---
function smooth(pts, k) {
    return pts.map((p, i) => {
        if (i === 0 || i === pts.length - 1) return p;
        const r = Math.min(k, i, pts.length - 1 - i);
        let x = 0, y = 0;
        for (let j = i - r; j <= i + r; j++) { x += pts[j].x; y += pts[j].y; }
        return { x: x / (2 * r + 1), y: y / (2 * r + 1) };
    });
}
/** Tirar de la cuerda: desde cada punto, salta en recto al más lejano al que ir recto no cueste más que la ruta.
 *  Quita la escalera de la cuadrícula en terreno abierto (un claro, una plaza) sin despegarse de los caminos. */
function pull(pts) {
    const at = p => cost[Math.round(p.y) * W + Math.round(p.x)];
    const run = new Float64Array(pts.length);          // coste acumulado de la ruta
    for (let i = 1; i < pts.length; i++) run[i] = run[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) * (at(pts[i]) + at(pts[i - 1])) / 2;
    // Ir recto vale si no cuesta más en total y si en ningún punto pisa terreno peor que el peor de la ruta
    // (si no, en tramos cortos atajaría por los árboles)
    const ok = (i, j) => {
        const a = pts[i], b = pts[j];
        let worst = 0;
        for (let k = i; k <= j; k++) worst = Math.max(worst, at(pts[k]));
        const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
        let s = 0;
        for (let k = 0; k <= n; k++) {
            const c = at({ x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n });
            if (c > worst + 2) return false;
            s += c;
        }
        return s / (n + 1) * Math.hypot(b.x - a.x, b.y - a.y) <= (run[j] - run[i]) * 1.05;
    };
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1;) {
        let j = pts.length - 1;
        while (j > i + 1 && !ok(i, j)) j--;
        out.push(pts[j]); i = j;
    }
    return out;
}
function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let best = 0, idx = 0;
    for (let i = 1; i < pts.length - 1; i++) {
        const d = Math.abs((b.y - a.y) * pts[i].x - (b.x - a.x) * pts[i].y + b.x * a.y - b.y * a.x) / len;
        if (d > best) { best = d; idx = i; }
    }
    return best <= eps ? [a, b] : [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)];
}

/** Distancia media entre dos líneas (muestreando la primera cada 2 px). */
function gap(p, q) {
    const seg = (pt, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / L)); return Math.hypot(pt.x - a.x - t * dx, pt.y - a.y - t * dy); };
    const near = pt => Math.min(...q.slice(1).map((b, i) => seg(pt, q[i], b)));
    const samples = [];
    for (let i = 1; i < p.length; i++) { const n = Math.ceil(Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y) / 2); for (let k = 0; k < n; k++) samples.push({ x: p[i - 1].x + (p[i].x - p[i - 1].x) * k / n, y: p[i - 1].y + (p[i].y - p[i - 1].y) * k / n }); }
    return samples.reduce((s, pt) => s + near(pt), 0) / (samples.length || 1);
}

const result = Object.fromEntries(Object.keys(zone.scenes).map(sid => [sid, {}]));   // en el orden de la zona
const report = [];
const t0 = Date.now();
// Las escenas, agrupadas por lienzo: primero las del mapa de la zona y luego cada escena con cuadro propio
const own = Object.entries(zone.scenes).filter(([, sc]) => sc.image);
const shared = Object.entries(zone.scenes).filter(([, sc]) => !sc.image);
const canvases = [{ image: zone.image, w: zone.width, h: zone.height, scenes: shared }, ...own.map(([sid, sc]) => ({ image: sc.image, w: sc.width, h: sc.height, scenes: [[sid, sc]] }))];
for (const cv of canvases) {
if (!cv.scenes.length) continue;
await loadCanvas(cv.image, cv.w, cv.h, cv.scenes.map(([, sc]) => sc));
for (const [sid, sc] of cv.scenes) {
    const nodes = { ...(sc.forks || {}) };
    for (const p of sc.points) nodes[p.id] = p;
    let svg = '';
    for (const [a, b, via, auto] of sc.links || []) {
        const manual = via && auto !== 'auto';
        if (manual && !compare) {
            svg += `<polyline points="${[nodes[a], ...via, nodes[b]].map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#f0f" stroke-width="2"/>`;
            continue;
        }
        const raw = astar(nodes[a], nodes[b], sc.box);
        const pts = rdp(pull(smooth(raw, SMOOTH)), EPSILON);
        const bends = pts.slice(1, -1).map(p => ({ x: Math.round(p.x), y: Math.round(p.y) }));
        const line = [nodes[a], ...bends, nodes[b]];
        svg += `<polyline points="${line.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#0ff" stroke-width="2"/>`;
        if (manual) {
            const hand = [nodes[a], ...via, nodes[b]];
            svg += `<polyline points="${hand.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#f0f" stroke-width="2" stroke-dasharray="4 3"/>`;
            report.push(`${sid}: ${a} → ${b}: se separa ${((gap(line, hand) + gap(hand, line)) / 2).toFixed(1)} px de la línea a mano`);
        } else {
            result[sid][`${a}>${b}`] = bends;
            report.push(`${sid}: ${a} → ${b}: ${bends.length} recodos`);
        }
    }
    if (shotDir) {
        const b = sc.box, x = Math.max(0, b.x - 30), y = Math.max(0, b.y - 30), w = Math.min(W - x, b.w + 60), h = Math.min(H - y, b.h + 60);
        const over = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`;
        fs.mkdirSync(shotDir, { recursive: true });
        await sharp(await sharp(path.join(root, canvasImage)).resize(W, H).png().toBuffer())
            .composite([{ input: Buffer.from(over) }]).png().toBuffer()
            .then(buf => sharp(buf).extract({ left: x, top: y, width: w, height: h }).resize(w * 2).jpeg({ quality: 85 }).toFile(path.join(shotDir, `caminos_${sid}.jpg`)));
    }
}
}
console.log(report.join('\n'));
console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
if (!compare) {
    const file = path.join(root, 'src/data/zones/zafias-paths.js');
    const body = Object.entries(result).map(([sid, links]) => `    ${sid}: {\n${Object.entries(links)
        .map(([k, v]) => `        '${k}': [${v.map(p => `{ x: ${p.x}, y: ${p.y} }`).join(', ')}]`).join(',\n')}\n    }`).join(',\n');
    fs.writeFileSync(file, `// Generado por tools/trace-paths.mjs: los recodos de los caminos de Zafias que no se escriben a mano.\n`
        + `// No editar: para corregir un camino, escribe sus recodos en zafias.js (mandan sobre estos) o vuelve a trazar.\n`
        + `export const ZAFIAS_PATHS = {\n${body}\n};\n`);
    console.log(`→ ${path.relative(root, file)}`);
}

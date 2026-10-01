// =============================================
// 🧩 Recompone el mapa de una zona a partir de las piezas rehechas en alta resolución.
// Lee el índice que dejó tools/split-map.mjs (posición de cada trozo de la cuadrícula), escala cada pieza HD a su
// recuadro × ESCALA y funde las costuras en la franja de solape. Si falta una pieza, usa el original ampliado.
// Las coordenadas del juego no cambian: la imagen se estira al tamaño lógico de la zona (zafias.js width/height).
// Uso: node tools/assemble-map.mjs [carpeta-hd] [salida.webp] [escala]
//      (por defecto img/map-divided-upscaled → img/zones/zafias.webp, escala 3)
//      Las piezas HD se llaman como su trozo: cuadricula_f1_c2_hd.jpg (vale .png/.jpg/.webp, con o sin _hd).
//      Si una pieza viene REDIBUJADA (no se parece a su original), cede en las costuras: la vecina fiel manda en el
//      solape, para que no se vean dos dibujos superpuestos.
// =============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

sharp.cache(false);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hdDir = path.resolve(root, process.argv[2] || 'img/map-divided-upscaled');
const outFile = path.resolve(root, process.argv[3] || 'img/zones/zafias.webp');
const S = Number(process.argv[4] || 3);
const index = JSON.parse(fs.readFileSync(path.join(root, 'img/map-divided/indice.json'), 'utf8'));
const OVERLAP = 32;                       // el mismo solape con el que se cortó (split-map.mjs)

const W = Math.round(index.width * S), H = Math.round(index.height * S);
const acc = new Float32Array(W * H * 3);
const wsum = new Float32Array(W * H);
const feather = 2 * OVERLAP * S;           // la costura se funde a lo ancho de todo el solape
const REDRAWN_RMS = 35;                    // diferencia (0-255, a 64×64) a partir de la cual una pieza se da por redibujada

/** Cuánto se parece una pieza a su trozo original (raíz del error cuadrático medio a 64×64). */
async function likeness(file, g) {
    const small = img => img.resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer();
    const a = await small(sharp(file));
    const b = await small(sharp(path.join(root, index.source)).extract({ left: g.x, top: g.y, width: g.w, height: g.h }));
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s / a.length);
}

function findHd(base) {
    const files = fs.readdirSync(hdDir);
    return files.find(f => new RegExp(`^${base}(_hd)?\\.(png|jpe?g|webp)$`, 'i').test(f));
}

const report = [];
for (const g of index.grid) {
    const base = g.file.replace(/\.png$/, '');
    const x = Math.round(g.x * S), y = Math.round(g.y * S);
    const w = Math.min(W - x, Math.round(g.w * S)), h = Math.min(H - y, Math.round(g.h * S));
    const hd = findHd(base);
    const src = hd
        ? sharp(path.join(hdDir, hd))
        : sharp(path.join(root, index.source)).extract({ left: g.x, top: g.y, width: g.w, height: g.h });
    const px = await src.resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).removeAlpha().raw().toBuffer();
    const rms = hd ? await likeness(path.join(hdDir, hd), g) : 0;
    const redrawn = rms > REDRAWN_RMS;
    report.push(`${base}: ${hd || '(sin pieza HD: original ampliado)'}${hd ? ` · diferencia ${rms.toFixed(0)}` : ''}`
        + (redrawn ? ' · REDIBUJADA: cede en las costuras' : ''));
    // Peso: 1 en el centro, rampa hacia 0 en los bordes que tocan otra pieza (no en el borde del mapa)
    const left = g.x > 0, top = g.y > 0, right = g.x + g.w < index.width, bottom = g.y + g.h < index.height;
    for (let j = 0; j < h; j++) {
        const wy = Math.min(top ? (j + 0.5) / feather : 1, bottom ? (h - j - 0.5) / feather : 1, 1);
        for (let i = 0; i < w; i++) {
            const wx = Math.min(left ? (i + 0.5) / feather : 1, right ? (w - i - 0.5) / feather : 1, 1);
            let wt = Math.max(0, wx) * Math.max(0, wy);
            if (redrawn) wt = wt ** 4;      // en el solape pesa muy poco: manda la vecina fiel
            if (!wt) continue;
            const p = (y + j) * W + (x + i), s = (j * w + i) * 3;
            wsum[p] += wt;
            acc[p * 3] += px[s] * wt; acc[p * 3 + 1] += px[s + 1] * wt; acc[p * 3 + 2] += px[s + 2] * wt;
        }
    }
}

const out = Buffer.alloc(W * H * 3);
for (let p = 0; p < W * H; p++) {
    const k = wsum[p] || 1;
    out[p * 3] = acc[p * 3] / k; out[p * 3 + 1] = acc[p * 3 + 1] / k; out[p * 3 + 2] = acc[p * 3 + 2] / k;
}
await sharp(out, { raw: { width: W, height: H, channels: 3 } }).webp({ quality: 82, effort: 5 }).toFile(outFile);
console.log(report.join('\n'));
console.log(`→ ${path.relative(root, outFile)} ${W}×${H} (${(fs.statSync(outFile).size / 1048576).toFixed(1)} MB)`);

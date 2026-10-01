// =============================================
// 📐 Ayuda para trazar caminos de una zona: pinta sobre el mapa HD una cuadrícula con coordenadas lógicas
// (cada 25 px, rótulo cada 50), y encima las paradas, los cruces y los caminos de src/data/zones/zafias.js.
// Con --tierra, en vez del mapa muestra la tierra de camino resaltada en amarillo: así se ve por dónde ir.
// Uso: node tools/zone-overlay.mjs <salida.jpg|png> <x,y,ancho,alto> [zoom=2] [--tierra] [--limpio]
//      p. ej. node tools/zone-overlay.mjs bosque.jpg 400,250,520,500 2
// =============================================
import sharp from 'sharp';
import { ZAFIAS } from '../src/data/zones/zafias.js';

sharp.cache(false);
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const [out, region, zArg] = args.filter(a => !a.startsWith('--'));
if (!out || !region) { console.log('Uso: node tools/zone-overlay.mjs <salida> <x,y,ancho,alto> [zoom] [--tierra] [--limpio]'); process.exit(1); }
const zone = ZAFIAS;
const [x0, y0, w, h] = region.split(',').map(Number);
const Z = Number(zArg || 2);
const meta = await sharp(zone.image).metadata();
const K = meta.width / zone.width;                       // la imagen va a ×K del tamaño lógico
const W = Math.round(w * Z), H = Math.round(h * Z);
const X = x => ((x - x0) * Z).toFixed(1), Y = y => ((y - y0) * Z).toFixed(1);
const label = (x, y, text, color) => `<text x="${x}" y="${y}" fill="${color}" font-size="12" font-family="monospace" stroke="#000" stroke-width="3" paint-order="stroke">${text}</text>`;

let base = sharp(zone.image).extract({ left: Math.round(x0 * K), top: Math.round(y0 * K), width: Math.round(w * K), height: Math.round(h * K) }).resize(W, H, { fit: 'fill' });
if (flags.has('--tierra')) {
    const px = await base.removeAlpha().raw().toBuffer();
    for (let i = 0; i < px.length; i += 3) {
        const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
        const dirt = r > 140 && g > 105 && b < 130 && r - b > 50 && r >= g && g - b > 25 && r - g < 70;
        if (dirt) { px[i] = 255; px[i + 1] = 200; px[i + 2] = 60; }
        else { px[i] *= 0.35; px[i + 1] *= 0.35; px[i + 2] *= 0.35; }
    }
    base = sharp(px, { raw: { width: W, height: H, channels: 3 } });
}

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`;
for (let x = Math.ceil(x0 / 25) * 25; x < x0 + w; x += 25) {
    svg += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${H}" stroke="${x % 100 ? '#fff' : '#ff0'}" stroke-opacity="${x % 100 ? 0.25 : 0.6}"/>`;
    if (!(x % 50)) svg += label(+X(x) + 2, 12, x, '#ff0');
}
for (let y = Math.ceil(y0 / 25) * 25; y < y0 + h; y += 25) {
    svg += `<line x1="0" y1="${Y(y)}" x2="${W}" y2="${Y(y)}" stroke="${y % 100 ? '#fff' : '#ff0'}" stroke-opacity="${y % 100 ? 0.25 : 0.6}"/>`;
    if (!(y % 50)) svg += label(2, +Y(y) - 2, y, '#ff0');
}
if (!flags.has('--limpio')) {
    for (const sc of Object.values(zone.scenes)) {
        const nodes = { ...(sc.forks || {}) };
        for (const p of sc.points) nodes[p.id] = p;
        for (const [a, b, via = []] of sc.links || []) {
            svg += `<polyline points="${[nodes[a], ...via, nodes[b]].map(p => `${X(p.x)},${Y(p.y)}`).join(' ')}" fill="none" stroke="#f0f" stroke-width="3"/>`;
        }
        for (const [id, p] of Object.entries(nodes)) {
            svg += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="5" fill="#0ff" stroke="#000"/>` + label(+X(p.x) + 7, +Y(p.y) + 4, id, '#0ff');
        }
    }
}
svg += '</svg>';
await sharp(await base.png().toBuffer()).composite([{ input: Buffer.from(svg) }]).toFile(out);
console.log(`→ ${out} (${W}×${H})`);

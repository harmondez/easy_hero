// =============================================
// 🗺️ Parte el mapa de una zona en piezas para rehacerlas en alta resolución.
// Saca una pieza por escena (su encuadre + margen) y una cuadrícula del mapa entero, en PNG sin pérdida,
// con un índice de coordenadas para volver a encajarlas en el juego.
// Uso: node tools/split-map.mjs [origen.png] [carpeta-salida]
//      (por defecto img/world_map_nolines.png → img/map-divided/)
// =============================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { ZAFIAS } from '../src/data/zones/zafias.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.resolve(root, process.argv[2] || 'img/world_map_nolines.png');
const out = path.resolve(root, process.argv[3] || 'img/map-divided');
const MARGIN = 40;            // margen alrededor de cada escena (el zoom deja ver algo más que su recuadro)
const GRID = { cols: 4, rows: 3, overlap: 32 };

const browser = await chromium.launch();
const page = await browser.newPage();
const data = 'data:image/png;base64,' + fs.readFileSync(src).toString('base64');
const { width, height } = await page.evaluate(async d => {
    const img = new Image(); img.src = d; await img.decode();
    window.__map = img;
    return { width: img.width, height: img.height };
}, data);

async function crop(name, x, y, w, h) {
    x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
    w = Math.min(width - x, Math.round(w)); h = Math.min(height - y, Math.round(h));
    const url = await page.evaluate(({ x, y, w, h }) => {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(window.__map, x, y, w, h, 0, 0, w, h);
        return c.toDataURL('image/png');
    }, { x, y, w, h });
    fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
    return { file: `${name}.png`, x, y, w, h };
}

fs.mkdirSync(out, { recursive: true });
const index = { source: path.relative(root, src).replace(/\\/g, '/'), width, height, scenes: {}, grid: [] };

// 1) Una pieza por escena
for (const [id, sc] of Object.entries(ZAFIAS.scenes)) {
    const b = sc.box;
    index.scenes[id] = { name: sc.name, ...(await crop(`escena_${id}`, b.x - MARGIN, b.y - MARGIN, b.w + 2 * MARGIN, b.h + 2 * MARGIN)) };
}

// 2) Cuadrícula del mapa entero, con solape para que no se noten las costuras
const tw = width / GRID.cols, th = height / GRID.rows;
for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
        const name = `cuadricula_f${r + 1}_c${c + 1}`;
        index.grid.push(await crop(name, c * tw - GRID.overlap, r * th - GRID.overlap, tw + 2 * GRID.overlap, th + 2 * GRID.overlap));
    }
}
await browser.close();

fs.writeFileSync(path.join(out, 'indice.json'), JSON.stringify(index, null, 2));
console.log(`✅ ${Object.keys(index.scenes).length} escenas y ${index.grid.length} piezas de cuadrícula en ${path.relative(root, out)}`);

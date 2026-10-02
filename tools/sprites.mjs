// =============================================
// 🖼️ Taller de sprites — deja listos para el juego los PNG de img/entrantes/
// Uso: npm run sprites
//
// Convención de nombres (id en minúsculas, sin tildes, con guiones):
//   enemigo_<id>.png  mira a la izquierda → recorta al contorno, pies abajo, ≤ 256 px de alto → img/sprites/enemigo_<id>.webp
//   heroe_<id>.png    mira a la derecha   → igual que el enemigo                              → img/sprites/heroe_<id>.webp
//   arma_<id>.png     el héroe con esa arma equipada (img/weapons/<Nombre>.png) → igual       → img/sprites/arma_<id>.webp
//   fondo_<id>.png    fondo de combate    → sin recortar                                      → img/bg/<id>.webp
//   escena_<id>.png   mapa de una zona    → sin recortar                                      → img/zones/<id>.webp
// Cada imagen queda registrada (ruta, ancho, alto) en src/data/art.js, que el juego lee para saber qué arte hay.
// Los PNG originales NO se suben al repositorio: solo lo procesado y el manifiesto.
// =============================================
import fs from 'fs';
import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import sharp from 'sharp';

// Sin caché de archivos: en Windows la caché de sharp deja los archivos abiertos y bloqueados, y al volver a
// procesar una imagen con el mismo nombre se leía la versión vieja (o no se podía sobrescribir/borrar).
sharp.cache(false);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const MAX_SPRITE_H = 256;   // alto máximo de un enemigo o héroe (con el margen superior incluido)
export const SPRITE_MARGIN = 2;    // px de aire a izquierda, derecha y arriba; abajo no hay: los pies tocan el borde
const ALPHA_MIN = 8;               // por debajo de esta opacidad un píxel cuenta como vacío (motas sueltas)
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// tipo del archivo → dónde va, bajo qué clave del manifiesto y si se recorta
const KINDS = {
    enemigo: { dir: 'img/sprites', group: 'sprites', keep: true, crop: true },
    heroe:   { dir: 'img/sprites', group: 'sprites', keep: true, crop: true },
    arma:    { dir: 'img/sprites', group: 'sprites', keep: true, crop: true },   // el héroe con esa arma (mira a la derecha)
    fondo:   { dir: 'img/bg',      group: 'bg',      keep: false, crop: false },
    escena:  { dir: 'img/zones',   group: 'zones',   keep: false, crop: false }
};

/** Caja (left, top, width, height) de lo que no es transparente. null si la imagen está vacía. */
async function contentBox(file) {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            if (data[(y * info.width + x) * 4 + 3] >= ALPHA_MIN) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
            }
        }
    }
    return x1 < 0 ? null : { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

async function cropSprite(file) {
    const box = await contentBox(file);
    if (!box) throw new Error('la imagen está vacía (todo transparente)');
    let img = sharp(file).ensureAlpha().extract(box);
    const maxContent = MAX_SPRITE_H - SPRITE_MARGIN;
    if (box.height > maxContent) img = img.resize({ height: maxContent, kernel: 'lanczos3' });
    const trimmed = await img.png().toBuffer();   // fija el tamaño final antes de añadir el margen
    return sharp(trimmed).extend({
        top: SPRITE_MARGIN, left: SPRITE_MARGIN, right: SPRITE_MARGIN, bottom: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
    });
}

export async function readManifest(manifestFile) {
    const empty = { sprites: {}, bg: {}, zones: {} };
    if (!fs.existsSync(manifestFile)) return empty;
    const mod = await import(`${pathToFileURL(manifestFile).href}?t=${Date.now()}`);
    return { ...empty, ...mod.ART };
}

export function manifestText(art) {
    const sorted = Object.fromEntries(Object.entries(art).map(([g, items]) =>
        [g, Object.fromEntries(Object.entries(items).sort(([a], [b]) => a.localeCompare(b)))]));
    return `// =============================================
// 🖼️ Registro de imágenes del juego — LO ESCRIBE \`npm run sprites\` (tools/sprites.mjs); no se edita a mano.
//   sprites: enemigo_<id> y heroe_<id>, ya recortados (los pies tocan el borde inferior)
//   bg: fondos de combate · zones: mapas de zona (sin recortar) · icons: iconos y objetos (npm run icons)
//   portraits: retratos de los diálogos (npm run icons, de img/characters)
// Cada entrada: { src, w, h }. El combate usa estas imágenes si existen; si no, el goblin teñido de siempre.
// =============================================
export const ART = ${JSON.stringify(sorted, null, 4)};
`;
}

/**
 * Procesa todos los PNG de `inDir` y registra cada imagen en el manifiesto.
 * Mantiene lo que ya estaba registrado (la carpeta de entrada no se sube, así que no siempre tiene todo).
 * @returns {{done: string[], skipped: {file: string, why: string}[]}}
 */
export async function processSprites({ root = ROOT, inDir = path.join(root, 'img', 'entrantes'), manifestFile = path.join(root, 'src', 'data', 'art.js') } = {}) {
    const done = [];
    const skipped = [];
    if (!fs.existsSync(inDir)) return { done, skipped };
    const art = await readManifest(manifestFile);
    for (const file of fs.readdirSync(inDir).sort()) {
        if (!/\.png$/i.test(file)) continue;
        const m = /^([a-z]+)_(.+)\.png$/.exec(file);
        const kind = m && KINDS[m[1]];
        if (!kind) { skipped.push({ file, why: 'el nombre debe ser enemigo_/heroe_/arma_/fondo_/escena_<id>.png' }); continue; }
        if (!ID.test(m[2])) { skipped.push({ file, why: `el id «${m[2]}» debe ir en minúsculas, sin tildes ni espacios, con guiones` }); continue; }
        try {
            const outName = kind.keep ? `${m[1]}_${m[2]}.webp` : `${m[2]}.webp`;
            const outRel = `${kind.dir}/${outName}`;
            const outAbs = path.join(root, outRel);
            fs.mkdirSync(path.dirname(outAbs), { recursive: true });
            const src = path.join(inDir, file);
            const img = kind.crop ? await cropSprite(src) : sharp(src);
            const info = await img.webp(kind.crop ? { lossless: true, effort: 6 } : { quality: 85, effort: 6 }).toFile(outAbs);
            art[kind.group][kind.keep ? `${m[1]}_${m[2]}` : m[2]] = { src: outRel, w: info.width, h: info.height };
            done.push(outRel);
        } catch (e) {
            skipped.push({ file, why: e.message });
        }
    }
    fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
    fs.writeFileSync(manifestFile, manifestText(art), 'utf8');
    return { done, skipped };
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
    const { done, skipped } = await processSprites();
    if (!done.length && !skipped.length) console.log('📭 No hay PNG en img/entrantes/ (déjalos ahí con nombres como enemigo_lobo.png).');
    for (const f of done) console.log(`✅ ${f}`);
    for (const s of skipped) console.log(`⚠️ ${s.file}: ${s.why}`);
    console.log(`\n🖼️ ${done.length} imagen(es) lista(s) y registradas en src/data/art.js`);
    process.exitCode = skipped.length ? 1 : 0;
}

// =============================================
// 🖼️ Taller de sprites (tools/sprites.mjs) + consulta del manifiesto (src/art.js)
// Genera imágenes de prueba en una carpeta temporal: no toca img/ ni src/data/art.js del repositorio.
// =============================================
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import sharp from 'sharp';
import { processSprites, MAX_SPRITE_H, SPRITE_MARGIN } from '../tools/sprites.mjs';
import { artSlug, monsterArt, heroArt } from '../src/art.js';

let passed = 0;
let failed = 0;
function assert(label, cond) {
    if (cond) { passed++; console.log(`  ✅ ${label}`); }
    else { failed++; console.log(`  ❌ ${label}`); }
}

/** PNG transparente de W×H con un rectángulo rojo opaco en (x, y) de rw×rh. */
async function fakeSprite(file, W, H, x, y, rw, rh) {
    const rect = await sharp({ create: { width: rw, height: rh, channels: 4, background: { r: 200, g: 30, b: 30, alpha: 1 } } }).png().toBuffer();
    await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: rect, left: x, top: y }]).png().toFile(file);
}
/** Alfa de un WebP: { w, h, row(y) → alfa de cada píxel de esa fila, col(x) idem } */
async function alphaOf(file) {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const at = (x, y) => data[(y * info.width + x) * 4 + 3];
    return {
        w: info.width, h: info.height,
        row: y => Array.from({ length: info.width }, (_, x) => at(x, y)),
        col: x => Array.from({ length: info.height }, (_, y) => at(x, y))
    };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'taller-sprites-'));
const inDir = path.join(root, 'img', 'entrantes');
const manifestFile = path.join(root, 'src', 'data', 'art.js');
fs.mkdirSync(inDir, { recursive: true });

console.log('\n🖼️ Taller de sprites');
// Un enemigo alto (hay que reducirlo), uno pequeño (no hay que ampliarlo), un héroe, un fondo y una escena
await fakeSprite(path.join(inDir, 'enemigo_ogro-bruto.png'), 300, 600, 50, 100, 100, 400);
await fakeSprite(path.join(inDir, 'enemigo_rata.png'), 200, 200, 80, 60, 40, 30);
await fakeSprite(path.join(inDir, 'heroe_prueba.png'), 200, 300, 60, 40, 80, 200);
await sharp({ create: { width: 320, height: 180, channels: 3, background: { r: 20, g: 60, b: 20 } } }).png().toFile(path.join(inDir, 'fondo_cueva.png'));
await sharp({ create: { width: 400, height: 300, channels: 3, background: { r: 60, g: 40, b: 20 } } }).png().toFile(path.join(inDir, 'escena_aldea.png'));
// Cosas que el taller debe rechazar sin romperse
await fakeSprite(path.join(inDir, 'enemigo_Lobo Gris.png'), 50, 50, 10, 10, 20, 20);
await fakeSprite(path.join(inDir, 'monstruo_x.png'), 50, 50, 10, 10, 20, 20);
await sharp({ create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile(path.join(inDir, 'enemigo_vacio.png'));
fs.writeFileSync(path.join(inDir, 'notas.txt'), 'no soy una imagen');

const res = await processSprites({ root, inDir, manifestFile });
assert('Procesa las 5 imágenes buenas', res.done.length === 5);
assert('Rechaza lo que no cumple (nombre con espacios/mayúsculas, tipo desconocido, imagen vacía) y lo explica',
    res.skipped.length === 3 && res.skipped.every(s => s.why.length > 0) && !res.skipped.some(s => /notas/.test(s.file)));

const ogro = await alphaOf(path.join(root, 'img/sprites/enemigo_ogro-bruto.webp'));
assert(`Un enemigo alto se reduce a ${MAX_SPRITE_H} px de alto como máximo`, ogro.h === MAX_SPRITE_H);
assert('…sin deformarlo (proporción 100:400 más el margen)', Math.abs((ogro.w - 2 * SPRITE_MARGIN) / (ogro.h - SPRITE_MARGIN) - 0.25) < 0.01);
assert('Los pies tocan el borde inferior (la última fila es opaca donde hay cuerpo)', ogro.row(ogro.h - 1).filter(a => a > 200).length >= ogro.w - 2 * SPRITE_MARGIN - 1);
assert(`Deja ${SPRITE_MARGIN} px de aire arriba y a los lados`,
    ogro.row(0).every(a => a === 0) && ogro.row(SPRITE_MARGIN - 1).every(a => a === 0)
    && ogro.col(0).every(a => a === 0) && ogro.col(ogro.w - 1).every(a => a === 0) && ogro.row(SPRITE_MARGIN)[SPRITE_MARGIN + 5] > 200);

const rata = await alphaOf(path.join(root, 'img/sprites/enemigo_rata.webp'));
assert('Un enemigo pequeño se recorta al contorno y no se amplía (40×30 + margen)', rata.w === 40 + 2 * SPRITE_MARGIN && rata.h === 30 + SPRITE_MARGIN);
const heroe = await alphaOf(path.join(root, 'img/sprites/heroe_prueba.webp'));
assert('El héroe se trata igual: recortado y con los pies abajo', heroe.h === 200 + SPRITE_MARGIN && heroe.row(heroe.h - 1)[heroe.w >> 1] > 200);
assert('La salida es WebP de verdad', (await sharp(path.join(root, 'img/sprites/enemigo_rata.webp')).metadata()).format === 'webp');

const fondo = await sharp(path.join(root, 'img/bg/cueva.webp')).metadata();
const escena = await sharp(path.join(root, 'img/zones/aldea.webp')).metadata();
assert('Los fondos van a img/bg y las escenas a img/zones, WebP y sin recortar',
    fondo.format === 'webp' && fondo.width === 320 && fondo.height === 180 && escena.format === 'webp' && escena.width === 400 && escena.height === 300);

console.log('\n📒 Manifiesto');
const { ART } = await import(`${pathToFileURL(manifestFile).href}?t=1`);
assert('Cada imagen queda registrada con su ruta, ancho y alto',
    JSON.stringify(ART.sprites['enemigo_rata']) === JSON.stringify({ src: 'img/sprites/enemigo_rata.webp', w: rata.w, h: rata.h })
    && ART.sprites['heroe_prueba'].h === heroe.h && ART.bg.cueva.w === 320 && ART.zones.aldea.src === 'img/zones/aldea.webp');
assert('Lo rechazado no se registra', Object.keys(ART.sprites).length === 3);
// Segunda tanda con otra carpeta de entrada: lo anterior se conserva y no se duplica nada
const inDir2 = path.join(root, 'tanda2');
fs.mkdirSync(inDir2);
await fakeSprite(path.join(inDir2, 'enemigo_lobo.png'), 100, 100, 10, 10, 30, 60);
await fakeSprite(path.join(inDir2, 'enemigo_rata.png'), 100, 100, 10, 10, 20, 20);   // se vuelve a procesar: sustituye
await processSprites({ root, inDir: inDir2, manifestFile });
const { ART: art2 } = await import(`${pathToFileURL(manifestFile).href}?t=2`);
assert('Una segunda tanda añade sin perder lo ya registrado', !!art2.sprites['enemigo_lobo'] && !!art2.sprites['enemigo_ogro-bruto'] && !!art2.bg.cueva);
assert('Volver a procesar una imagen la sustituye (rata 20×20 + margen)', art2.sprites['enemigo_rata'].w === 20 + 2 * SPRITE_MARGIN && Object.keys(art2.sprites).length === 4);

console.log('\n🔎 Consulta desde el juego');
assert('artSlug: «Rata Gigante» → rata-gigante, «Cazador Sombrío» → cazador-sombrio', artSlug('Rata Gigante') === 'rata-gigante' && artSlug('Cazador Sombrío') === 'cazador-sombrio');
assert('monsterArt encuentra la imagen por nombre base y devuelve null si no hay', monsterArt(art2, 'Lobo') === art2.sprites['enemigo_lobo'] && monsterArt(art2, 'Slime') === null && monsterArt(art2, '') === null);
assert('heroArt devuelve el primer heroe_* (o null sin ninguno)', heroArt(art2) === art2.sprites['heroe_prueba'] && heroArt({ sprites: {}, bg: {}, zones: {} }) === null);
assert('Sin carpeta de entrada no hace nada ni falla', (await processSprites({ root, inDir: path.join(root, 'no-existe'), manifestFile })).done.length === 0);

fs.rmSync(root, { recursive: true, force: true });
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 RESULTS: ${passed} passed, ${failed} failed\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
process.exit(failed > 0 ? 1 : 0);

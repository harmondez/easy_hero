// =============================================
// 🎭 Retratos de la novela visual: img/characters/<id>-profile.png → img/portraits/<id>.webp
// Los recorta a su contorno, los deja a ≤ 640 px de alto y los registra en src/data/art.js → ART.portraits[id].
// Lo usan `npm run icons` (todos los de la carpeta), la fábrica de arte (tipo `portrait`) y `npm run vn -- nuevo`.
// Quién lleva cada retrato se decide en src/data/characters.js. Los PNG originales (img/characters/) no se suben.
// =============================================
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export const PORTRAIT_SRC = 'img/characters';
export const PORTRAIT_OUT = 'img/portraits';
const MAX_H = 640;

/** Id del retrato a partir del nombre del archivo: «tabernera-Maela-profile.png» → «tabernera-maela». */
export const portraitIdOf = file => file.replace(/-profile\.png$/i, '').toLowerCase();

/** Convierte un PNG en retrato del juego y lo apunta en `art.portraits`. Devuelve la entrada { src, w, h }. */
export async function processPortrait(root, pngFile, id, art) {
    fs.mkdirSync(path.join(root, PORTRAIT_OUT), { recursive: true });
    const outRel = `${PORTRAIT_OUT}/${id}.webp`;
    const trimmed = await sharp(pngFile).trim({ threshold: 1 }).toBuffer();
    const info = await sharp(trimmed).resize({ height: MAX_H, withoutEnlargement: true })
        .webp({ quality: 92, alphaQuality: 100, effort: 6 }).toFile(path.join(root, outRel));
    art.portraits = art.portraits || {};
    art.portraits[id] = { src: outRel, w: info.width, h: info.height };
    return art.portraits[id];
}

/** Todos los retratos de img/characters. Devuelve las líneas de lo hecho. */
export async function processAllPortraits(root, art) {
    const dir = path.join(root, PORTRAIT_SRC);
    const done = [];
    if (!fs.existsSync(dir)) return done;
    for (const file of fs.readdirSync(dir).filter(f => /-profile\.png$/i.test(f)).sort()) {
        const p = await processPortrait(root, path.join(dir, file), portraitIdOf(file), art);
        done.push(`${PORTRAIT_SRC}/${file} → ${p.src} (${p.w}×${p.h})`);
    }
    return done;
}

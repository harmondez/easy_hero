// =============================================
// 🎞️ Sprite Factory · vista previa: los fotogramas con una espada en la mano (hoja de contacto y GIF), para juzgar el
// movimiento como movimiento antes de darlo por bueno. Coloca la espada igual que el juego: girada sobre la mano y
// con el puño repintado encima de la empuñadura.
// =============================================
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import sharp from 'sharp';

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

/** Un fotograma (PNG) con la espada puesta. anim: { w, h, heroHeight, frames }; sword: { file, length, grip, fist } */
export async function withSword(framePng, anim, i, sword) {
    const fr = anim.frames[i];
    const pad = Math.round(anim.heroHeight * sword.length) + 8;
    const base = { create: { width: anim.w + pad * 2, height: anim.h + pad * 2, channels: 4, background: CLEAR } };
    if (!fr || !sword.file) return sharp(base).composite([{ input: framePng, left: pad, top: pad }]).png().toBuffer();
    const len = Math.round(anim.heroHeight * sword.length);
    const sw = await sharp(sword.file).resize({ height: len }).toBuffer({ resolveWithObject: true });
    // La espada está dibujada con la empuñadura arriba y la hoja hacia abajo (90°): se gira lo que falte
    const rot = fr.angle - 90, r = rot * Math.PI / 180;
    const turned = await sharp(sw.data).rotate(rot, { background: CLEAR }).toBuffer({ resolveWithObject: true });
    const gy = -sw.info.height / 2 + sw.info.height * sword.grip;      // el agarre, respecto al centro de la imagen
    const gx_ = turned.info.width / 2 - gy * Math.sin(r), gy_ = turned.info.height / 2 + gy * Math.cos(r);
    const R = Math.max(6, Math.round(anim.heroHeight * sword.fist));
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${anim.w}" height="${anim.h}"><circle cx="${fr.x}" cy="${fr.y}" r="${R}" fill="#fff"/></svg>`);
    const fist = await sharp(framePng).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    return sharp(base).composite([
        { input: framePng, left: pad, top: pad },
        { input: turned.data, left: Math.round(pad + fr.x - gx_), top: Math.round(pad + fr.y - gy_) },
        { input: fist, left: pad, top: pad }
    ]).png().toBuffer();
}

/** Hoja de contacto (JPG) y GIF de una animación. frames: PNG de cada fotograma; order: en qué orden se reproducen. */
export async function preview(outBase, frames, anim, sword, { order, fps = 6, bg = '#2a2018' } = {}) {
    const shots = [];
    for (let i = 0; i < frames.length; i++) shots.push(await withSword(frames[i], anim, i, sword));
    const meta = await sharp(shots[0]).metadata();
    const fw = meta.width, fh = meta.height;
    fs.mkdirSync(path.dirname(outBase), { recursive: true });
    await sharp({ create: { width: fw * shots.length, height: fh, channels: 3, background: bg } })
        .composite(shots.map((s, i) => ({ input: s, left: i * fw, top: 0 }))).jpeg({ quality: 88 }).toFile(`${outBase}.jpg`);
    const tmp = fs.mkdtempSync(path.join(path.dirname(outBase), 'gif-'));
    try {
        for (const [n, i] of (order || frames.map((_, k) => k)).entries()) {
            await sharp({ create: { width: fw, height: fh, channels: 3, background: bg } }).composite([{ input: shots[i] }]).png().toFile(path.join(tmp, `f${String(n).padStart(2, '0')}.png`));
        }
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(tmp, 'f%02d.png'), '-vf', 'split[a][b];[a]palettegen[p];[b][p]paletteuse', `${outBase}.gif`]);
        return { contact: `${outBase}.jpg`, gif: `${outBase}.gif` };
    } catch { return { contact: `${outBase}.jpg`, gif: null }; }      // sin ffmpeg, solo la hoja de contacto
    finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

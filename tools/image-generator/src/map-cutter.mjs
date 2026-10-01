// =============================================
// 🗺️ MAP CUTTER: recorta regiones LITERALES del mapa maestro (los mismos píxeles, sin escalar, sin retocar color,
// sin volver a generar nada) y escribe el manifiesto con la posición exacta de cada recorte.
// Las regiones salen del layout 3×3 con el que se pidió el mapa (cada punto de interés en su casilla), ampliadas con
// un margen para no partir el punto de interés por la mitad.
// =============================================
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

sharp.cache(false);

const CELLS = { NW: [0, 0], N: [1, 0], NE: [2, 0], W: [0, 1], C: [1, 1], E: [2, 1], SW: [0, 2], S: [1, 2], SE: [2, 2] };

/** Rectángulo de una casilla del layout, con margen (fracción de la casilla), dentro de la imagen. */
export function regionRect(cell, width, height, margin = 0.15) {
    const [cx, cy] = CELLS[cell] || CELLS.C;
    const cw = width / 3, ch = height / 3;
    const x = Math.max(0, Math.floor(cx * cw - cw * margin));
    const y = Math.max(0, Math.floor(cy * ch - ch * margin));
    const x2 = Math.min(width, Math.ceil((cx + 1) * cw + cw * margin));
    const y2 = Math.min(height, Math.ceil((cy + 1) * ch + ch * margin));
    return { x, y, width: x2 - x, height: y2 - y };
}

/**
 * Corta las regiones y escribe <dir>/regions/*.png y <dir>/manifest.json.
 * Devuelve el manifiesto. NO borra ni modifica el mapa maestro.
 */
export async function cutMap({ mapId, masterFile, dir, layout, margin = 0.15 }) {
    const meta = await sharp(masterFile).metadata();
    const regionsDir = path.join(dir, 'regions');
    fs.mkdirSync(regionsDir, { recursive: true });
    const regions = [];
    for (const r of layout) {
        const rect = regionRect(r.cell, meta.width, meta.height, margin);
        const file = path.join(regionsDir, `${r.id}.png`);
        await sharp(masterFile).extract({ left: rect.x, top: rect.y, width: rect.width, height: rect.height }).png().toFile(file);
        regions.push({ id: r.id, label: r.label, cell: r.cell, file: `regions/${r.id}.png`, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
    }
    const manifest = { map: mapId, source: path.basename(masterFile), width: meta.width, height: meta.height, regions };
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return manifest;
}

/** Comprueba píxel a píxel que cada recorte es idéntico a su zona del mapa maestro. */
export async function verifyCuts(dir, manifest) {
    const master = path.join(dir, manifest.source);
    const problems = [];
    for (const r of manifest.regions) {
        const a = await sharp(master).extract({ left: r.x, top: r.y, width: r.width, height: r.height }).ensureAlpha().raw().toBuffer();
        const b = await sharp(path.join(dir, r.file)).ensureAlpha().raw().toBuffer();
        if (a.length !== b.length || !a.equals(b)) problems.push(r.id);
    }
    return { ok: problems.length === 0, problems };
}

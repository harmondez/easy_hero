// =============================================
// ✅ Validación de lo generado: que sea una imagen de verdad y, si es un sprite recortado, que cumpla las reglas
// (fondo transparente, sujeto presente, sin restos de blanco pegados al borde, nada cortado por los lados).
// =============================================
import sharp from 'sharp';

sharp.cache(false);

/** Cualquier imagen: se puede decodificar y tiene un tamaño razonable. */
export async function validateImage(buffer, { minSide = 256 } = {}) {
    const errors = [];
    let meta = null;
    try { meta = await sharp(buffer).metadata(); } catch (e) { errors.push(`no es una imagen válida: ${e.message}`); }
    if (meta && Math.min(meta.width, meta.height) < minSide) errors.push(`demasiado pequeña (${meta.width}×${meta.height})`);
    return { ok: errors.length === 0, errors, warnings: [], stats: meta ? { width: meta.width, height: meta.height, format: meta.format } : {} };
}

/** Sprite con fondo quitado: PNG con canal alfa que cumple las reglas de sprite. */
export async function validateSprite(png, { min_subject_coverage = 0.03, max_white_remnant_ratio = 0.002, edge_margin_px = 2, white_threshold = 236 } = {}) {
    const base = await validateImage(png);
    if (!base.ok) return base;
    const errors = [], warnings = [];
    const meta = await sharp(png).metadata();
    if (meta.format !== 'png' || !meta.hasAlpha) errors.push('no es un PNG con canal alfa');
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    let opaque = 0, transparent = 0, whiteFringe = 0;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    const alpha = p => data[p * 4 + 3];
    for (let p = 0; p < w * h; p++) {
        const a = alpha(p);
        if (a === 0) { transparent++; continue; }
        opaque++;
        const x = p % w, y = (p / w) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        // Resto de fondo: un píxel casi blanco y casi opaco pegado a lo transparente
        const i = p * 4;
        const nearWhite = Math.min(data[i], data[i + 1], data[i + 2]) >= white_threshold && a > 200;
        const touchesClear = (x > 0 && alpha(p - 1) === 0) || (x < w - 1 && alpha(p + 1) === 0) || (y > 0 && alpha(p - w) === 0) || (y < h - 1 && alpha(p + w) === 0);
        if (nearWhite && touchesClear) whiteFringe++;
    }
    const coverage = opaque / (w * h);
    if (transparent === 0) errors.push('el fondo no se ha quitado (no hay píxeles transparentes)');
    if (coverage < min_subject_coverage) errors.push(`el sujeto ocupa muy poco (${(coverage * 100).toFixed(1)} %): ¿se ha borrado de más?`);
    const fringeRatio = opaque ? whiteFringe / opaque : 0;
    if (fringeRatio > max_white_remnant_ratio) errors.push(`quedan restos del fondo blanco en el borde (${(fringeRatio * 100).toFixed(2)} %)`);
    const touches = [x0 <= edge_margin_px && 'izquierda', x1 >= w - 1 - edge_margin_px && 'derecha', y0 <= edge_margin_px && 'arriba', y1 >= h - 1 - edge_margin_px && 'abajo'].filter(Boolean);
    if (touches.length) warnings.push(`el sujeto toca el borde (${touches.join(', ')}): puede estar cortado`);
    return {
        ok: errors.length === 0, errors, warnings,
        stats: { width: w, height: h, coverage: +coverage.toFixed(4), whiteFringeRatio: +fringeRatio.toFixed(5), bbox: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } }
    };
}

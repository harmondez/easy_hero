// =============================================
// 📒 Registro de la fábrica (taller/manifest.json) y metadatos de cada asset (<id>.meta.json):
// qué prompt, qué modelo, qué configuración, qué archivos y si ya entró al juego.
// =============================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/** «Orco Bruto» → «orco-bruto» (el mismo criterio que el taller de sprites). */
export function slug(name) {
    return String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Huella determinista de una generación: mismo prompt + modelo + configuración → misma huella. */
export function fingerprint(obj) {
    return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex').slice(0, 12);
}

export class FactoryManifest {
    constructor(file) {
        this.file = file;
        this.data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { version: 1, assets: {} };
    }
    get(key) { return this.data.assets[key] || null; }
    set(key, entry) {
        this.data.assets[key] = entry;
        fs.mkdirSync(path.dirname(this.file), { recursive: true });
        fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    }
}

export function writeMeta(file, meta) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(meta, null, 2));
}
